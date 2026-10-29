-- =============================================================================
--  Palmas.ps — المرحلة الخامسة: إحصاءات حقيقية
--
--  لوحة التحكم كانت تعرض أرقاماً مكتوبة يدوياً (٣٤٠٠ زيارة، $412K مبيعات،
--  مصادر زيارات، عقارات أكثر مشاهدة). هذا الملف يستبدلها بمصدر حقيقي.
--
--  ما يُسجَّل: الصفحة · اليوم · تصنيف المصدر · معرّف العقار إن وُجد.
--  ما لا يُسجَّل: عنوان IP · هوية الزائر · أي معرّف يتتبّع شخصاً بعينه.
--  فالجدول يجيب عن "كم زيارة" لا عن "من زار".
-- =============================================================================

create table if not exists public.page_views (
  id          bigserial   primary key,
  path        text        not null default '',
  source      text        not null default 'direct'
                          check (source in ('google', 'social', 'referral', 'direct')),
  property_id text,                                   -- بلا مفتاح خارجي: الإحصاء يبقى
  project_id  text,                                   -- حتى لو حُذف العقار لاحقاً
  day         date        not null default current_date,
  created_at  timestamptz not null default now()
);

create index if not exists page_views_day_idx  on public.page_views (day);
create index if not exists page_views_prop_idx on public.page_views (property_id) where property_id is not null;

alter table public.page_views enable row level security;

-- الزائر يُسجّل زيارته ولا يقرأ شيئاً — لا زياراته ولا زيارات غيره.
drop policy if exists views_insert_any on public.page_views;
create policy views_insert_any on public.page_views
  for insert to anon, authenticated with check (true);

drop policy if exists views_admin_read on public.page_views;
create policy views_admin_read on public.page_views
  for select using (public.is_admin());

grant insert on public.page_views to anon, authenticated;
grant select on public.page_views to authenticated;
grant usage, select on sequence public.page_views_id_seq to anon, authenticated;


-- ============================================================ دوال الإحصاء
-- تُجمَّع على السيرفر لا في المتصفّح: صف واحد يعود بدل آلاف الصفوف، ولا
-- تخرج بيانات الزيارات الخام من قاعدة البيانات أصلاً.
-- كل دالة تتحقّق من الأدمن بنفسها، فالتنفيذ بصلاحيات المالك آمن هنا.

-- ---- بطاقات الأرقام الأربع
create or replace function public.stats_overview()
returns json
language sql
security definer
set search_path = public
as $$
  select case when not public.is_admin() then null else json_build_object(
    'properties',    (select count(*) from public.properties),
    'published',     (select count(*) from public.properties where published),
    'projects',      (select count(*) from public.projects),
    'accounts',      (select count(*) from public.profiles),
    'accountsMonth', (select count(*) from public.profiles
                       where created_at >= date_trunc('month', current_date)),
    'visitsMonth',   (select count(*) from public.page_views
                       where day >= date_trunc('month', current_date)),
    'visitsPrev',    (select count(*) from public.page_views
                       where day >= date_trunc('month', current_date) - interval '1 month'
                         and day <  date_trunc('month', current_date)),
    'leads',         (select (select count(*) from public.bookings)
                           + (select count(*) from public.messages)
                           + (select count(*) from public.listings)),
    'salesYear',     (select coalesce(sum(i.amount), 0) from public.invoices i
                       join public.invoice_payments p on p.no = i.no
                       where extract(year from p.paid_on) = extract(year from current_date)),
    'dealsYear',     (select count(*) from public.invoices i
                       join public.invoice_payments p on p.no = i.no
                       where extract(year from p.paid_on) = extract(year from current_date))
  ) end;
$$;

-- ---- الزيارات شهراً بشهر (آخر ٨ أشهر، بما فيها الأشهر الصفرية)
create or replace function public.stats_visits_months()
returns table (month date, visits bigint)
language sql
security definer
set search_path = public
as $$
  select m::date,
         (select count(*) from public.page_views v
           where v.day >= m and v.day < m + interval '1 month')
  from generate_series(
    date_trunc('month', current_date) - interval '7 months',
    date_trunc('month', current_date),
    interval '1 month'
  ) as m
  where public.is_admin();
$$;

-- ---- مصادر الزيارات
create or replace function public.stats_sources()
returns table (source text, visits bigint)
language sql
security definer
set search_path = public
as $$
  select v.source, count(*)
  from public.page_views v
  where public.is_admin()
    and v.day >= date_trunc('month', current_date) - interval '2 months'
  group by v.source
  order by count(*) desc;
$$;

-- ---- العقارات الأكثر مشاهدة
create or replace function public.stats_top_properties(limit_n int default 5)
returns table (property_id text, views bigint)
language sql
security definer
set search_path = public
as $$
  select v.property_id, count(*)
  from public.page_views v
  where public.is_admin()
    and v.property_id is not null
    and v.day >= date_trunc('month', current_date) - interval '2 months'
  group by v.property_id
  order by count(*) desc
  limit limit_n;
$$;

-- ---- قائمة الحسابات للوحة التحكم
-- البريد يعيش في auth.users وهو محجوب عن الـ API. هذه الدالة هي المنفذ الوحيد
-- إليه، وتتحقّق من الأدمن قبل أن تعيد صفاً واحداً. ولا وجود لكلمة المرور هنا
-- ولا في أي مكان يمكن قراءته: Supabase يخزّنها مُعمّاة ولا تُسترجع أبداً.
create or replace function public.admin_accounts()
returns table (id uuid, name text, email text, phone text, role text, joined date)
language sql
security definer
set search_path = public
as $$
  select p.id, p.name, u.email::text, p.phone, p.role, p.created_at::date
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_admin()
  order by p.created_at desc;
$$;

revoke all on function public.stats_overview()          from public;
revoke all on function public.stats_visits_months()     from public;
revoke all on function public.stats_sources()           from public;
revoke all on function public.stats_top_properties(int) from public;
revoke all on function public.admin_accounts()          from public;

grant execute on function public.stats_overview()          to authenticated;
grant execute on function public.stats_visits_months()     to authenticated;
grant execute on function public.stats_sources()           to authenticated;
grant execute on function public.stats_top_properties(int) to authenticated;
grant execute on function public.admin_accounts()          to authenticated;
