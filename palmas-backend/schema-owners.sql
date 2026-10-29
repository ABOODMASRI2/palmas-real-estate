-- =============================================================================
--  Palmas.ps — المالكون وعقود الوساطة
--  شغّله في Supabase → SQL Editor بعد schema.sql و schema-crm.sql
--
--  الطرف الثالث في الوساطة: صاحب العقار. كل عقار معروض يقف وراءه مالك (شخص
--  أو شركة) وعقد يحدّد نوع الصفقة والعمولة ومدّة التفويض. بيانات المالكين
--  خاصة بالمكتب: لا يراها الزوّار ولا المستخدمون، الأدمن وحده.
-- =============================================================================

-- ---------------------------------------------------------------- المالكون
create table if not exists public.owners (
  id          uuid        primary key default gen_random_uuid(),
  kind        text        not null default 'person'
                          check (kind in ('person', 'company')),
  name        text        not null,
  company     text        not null default '',
  phone       text        not null default '',
  phone2      text        not null default '',
  email       text        not null default '',
  id_number   text        not null default '',   -- هوية شخصية أو رقم تسجيل شركة
  city        text        not null default '',
  notes       text        not null default '',
  listing_id  uuid        references public.listings (id) on delete set null,  -- الطلب الذي جاء منه
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------ عقود الوساطة (التفويض)
create table if not exists public.contracts (
  id               uuid        primary key default gen_random_uuid(),
  owner_id         uuid        not null references public.owners (id) on delete cascade,
  property_id      text        references public.properties (id) on delete set null,
  deal             text        not null default 'sale'
                               check (deal in ('sale', 'rent')),
  exclusive        boolean     not null default false,
  asking_price     numeric     not null default 0,
  min_price        numeric,                       -- أقل سعر يقبله المالك — لا يُعرض لأحد
  currency         text        not null default 'usd',
  commission_type  text        not null default 'percent'
                               check (commission_type in ('percent', 'fixed')),
  commission_value numeric     not null default 2 check (commission_value >= 0),
  start_date       date        not null default current_date,
  end_date         date,
  status           text        not null default 'active'
                               check (status in ('active', 'sold', 'rented', 'expired', 'cancelled')),
  closed_price     numeric,                       -- السعر الفعلي عند الإغلاق
  closed_on        date,
  notes            text        not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists owners_created_idx     on public.owners (created_at desc);
create index if not exists contracts_owner_idx    on public.contracts (owner_id);
create index if not exists contracts_property_idx on public.contracts (property_id);
create index if not exists contracts_status_idx   on public.contracts (status);

drop trigger if exists owners_touch on public.owners;
create trigger owners_touch before update on public.owners
  for each row execute function public.touch_updated_at();

drop trigger if exists contracts_touch on public.contracts;
create trigger contracts_touch before update on public.contracts
  for each row execute function public.touch_updated_at();


-- ====================================================== صلاحيات الوصول (RLS)
-- أرقام المالكين وأسعارهم الدنيا ونسب العمولة أسرار تجارية: الأدمن وحده.
alter table public.owners    enable row level security;
alter table public.contracts enable row level security;

drop policy if exists owners_admin on public.owners;
create policy owners_admin on public.owners
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists contracts_admin on public.contracts;
create policy contracts_admin on public.contracts
  for all using (public.is_admin()) with check (public.is_admin());


-- ================================================== كشف الجداول لواجهة الـ API
grant select, insert, update, delete on public.owners    to authenticated;
grant select, insert, update, delete on public.contracts to authenticated;
