-- =============================================================================
--  Palmas.ps — المرحلة الرابعة: ما تبقّى
--  المشاريع · الموظفون · أسعار الصرف · الفواتير
--  شغّله في Supabase → SQL Editor بعد schema.sql
-- =============================================================================

-- ------------------------------------------------------------- المشاريع
create table if not exists public.projects (
  id          text        primary key,
  name        jsonb       not null,
  loc         jsonb       not null,
  country     text        not null default 'ps',
  city_key    text        not null default '',
  kind        text        not null default 'residential',
  state       text        not null default 'ongoing'
                          check (state in ('ongoing', 'done')),
  progress    int         not null default 0 check (progress between 0 and 100),
  price       numeric     not null default 0,
  currency    text        not null default 'usd',
  descr       jsonb       not null default '{"ar":"","en":""}'::jsonb,
  stats       jsonb       not null default '[]'::jsonb,
  lat         double precision,
  lng         double precision,
  photos      text[]      not null default '{}',
  published   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);


-- ------------------------------------------------------------- الموظفون
-- الراتب بيانات رواتب: يبقى داخل الجدول المحمي، ولا يخرج أبداً إلى الزوار.
create table if not exists public.staff (
  id          text        primary key,
  name        jsonb       not null,
  role        jsonb       not null default '{"ar":"","en":""}'::jsonb,
  phone       text        not null default '',
  salary      numeric     not null default 0,
  status      text        not null default 'full'
                          check (status in ('full', 'part')),
  agent       boolean     not null default true,
  color       text        not null default '#f68743',
  created_at  timestamptz not null default now()
);


-- -------------------------------------------------------- أسعار الصرف
-- صف واحد لكل عملة: كم وحدة منها يساوي دولاراً واحداً
create table if not exists public.currency_rates (
  code        text        primary key,
  rate        numeric     not null check (rate > 0),
  updated_at  timestamptz not null default now()
);

insert into public.currency_rates (code, rate) values
  ('usd', 1), ('ils', 3.65), ('jod', 0.709), ('aed', 3.67)
on conflict (code) do nothing;


-- ------------------------------------------------------- الفواتير (ERP)
-- الأعمدة مطابقة لما تكتبه صفحة ERP اليوم، فلا تحتاج الصفحة أي تعديل.
create table if not exists public.invoices (
  no          text        primary key,          -- INV-2001…
  client      text        not null default '',
  item        text        not null default '',
  amount      numeric     not null default 0,
  due         text        not null default '',
  property_id text        references public.properties (id) on delete set null,
  deal_type   text        not null default 'sale'
                          check (deal_type in ('sale', 'rent')),
  created_at  timestamptz not null default now()
);

-- السداد بجدول منفصل لأن جزءاً من الفواتير يُولَّد آلياً من العملاء المحتملين
-- ولا يملك صفاً في invoices — لكنه يُسدَّد مثله تماماً.
create table if not exists public.invoice_payments (
  no       text  primary key,
  paid_on  date  not null default current_date
);

-- ------------------------------------------------------------- المصاريف
create table if not exists public.expenses (
  id          text        primary key,
  descr       text        not null default '',
  cat         text        not null default 'other',
  amount      numeric     not null default 0,
  spent_on    date        not null default current_date,
  created_at  timestamptz not null default now()
);

-- العملاء المحتملون الذين أُخفيت فواتيرهم الآلية
create table if not exists public.erp_dismissed (
  lead_key    text        primary key,
  created_at  timestamptz not null default now()
);

create index if not exists projects_published_idx on public.projects (published);
create index if not exists expenses_date_idx      on public.expenses (spent_on desc);

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();


-- ====================================================== صلاحيات الوصول (RLS)
alter table public.projects         enable row level security;
alter table public.staff            enable row level security;
alter table public.currency_rates   enable row level security;
alter table public.invoices         enable row level security;
alter table public.invoice_payments enable row level security;
alter table public.expenses         enable row level security;
alter table public.erp_dismissed    enable row level security;

-- المشاريع: الجميع يقرأ المنشور، الأدمن يكتب
drop policy if exists projects_read on public.projects;
create policy projects_read on public.projects
  for select using (published = true or public.is_admin());

drop policy if exists projects_admin on public.projects;
create policy projects_admin on public.projects
  for all using (public.is_admin()) with check (public.is_admin());

-- الموظفون: الجدول نفسه للأدمن وحده لأنه يحوي الرواتب.
drop policy if exists staff_admin on public.staff;
create policy staff_admin on public.staff
  for all using (public.is_admin()) with check (public.is_admin());

-- وصفحة العقار تحتاج المستشار فقط، فتقرأه من هذه النافذة: الاسم والمسمّى
-- والهاتف واللون — بلا راتب ولا حالة توظيف.
--
-- النافذة تعمل بصلاحيات مالكها لا بصلاحيات القارئ (وهو الوضع الافتراضي)، وهذا
-- مقصود: هي البوابة الوحيدة التي يرى منها الزائر الموظفين، وتكشف الأعمدة
-- المذكورة أدناه فقط. لذلك قد ينبّه فاحص Supabase إلى "security definer view"
-- وهو تنبيه متوقّع هنا لا خطأ.
create or replace view public.agents as
  select id, name, role, phone, color
  from public.staff
  where agent = true;

-- أسعار الصرف: الجميع يقرأ (الأسعار تُعرض لكل زائر)، الأدمن يعدّل
drop policy if exists rates_read on public.currency_rates;
create policy rates_read on public.currency_rates
  for select using (true);

drop policy if exists rates_admin on public.currency_rates;
create policy rates_admin on public.currency_rates
  for all using (public.is_admin()) with check (public.is_admin());

-- الدفاتر المالية: الأدمن وحده، بلا أي قراءة عامة
drop policy if exists invoices_admin on public.invoices;
create policy invoices_admin on public.invoices
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists payments_admin on public.invoice_payments;
create policy payments_admin on public.invoice_payments
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists expenses_admin on public.expenses;
create policy expenses_admin on public.expenses
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists dismissed_admin on public.erp_dismissed;
create policy dismissed_admin on public.erp_dismissed
  for all using (public.is_admin()) with check (public.is_admin());


-- ================================================== كشف الجداول لواجهة الـ API
grant select on public.projects       to anon, authenticated;
grant select on public.agents         to anon, authenticated;
grant select on public.currency_rates to anon, authenticated;

grant insert, update, delete         on public.projects         to authenticated;
grant select, insert, update, delete on public.staff            to authenticated;
grant insert, update, delete         on public.currency_rates   to authenticated;
grant select, insert, update, delete on public.invoices         to authenticated;
grant select, insert, update, delete on public.invoice_payments to authenticated;
grant select, insert, update, delete on public.expenses         to authenticated;
grant select, insert, delete         on public.erp_dismissed    to authenticated;
