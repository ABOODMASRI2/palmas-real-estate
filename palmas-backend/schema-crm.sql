-- =============================================================================
--  Palmas.ps — المرحلة الثانية: العملاء (CRM)
--  شغّله في Supabase → SQL Editor بعد schema.sql
--
--  الفكرة: كل نموذج يملأه زبون — حجز معاينة، رسالة تواصل، طلب عرض عقار —
--  يصبح صفاً هنا فيراه الأدمن في لوحة التحكم مهما كان الجهاز الذي أرسل منه.
-- =============================================================================

-- ------------------------------------------------------------ حجز معاينة
create table if not exists public.bookings (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users (id) on delete set null,
  property_id text        references public.properties (id) on delete set null,
  prop_name   text        not null default '',
  name        text        not null,
  phone       text        not null,
  visit_date  text        not null default '',
  visit_time  text        not null default '',
  status      text        not null default 'pending'
                          check (status in ('pending', 'confirmed', 'done', 'cancelled')),
  source      text        not null default 'web',
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------- رسائل نموذج التواصل
create table if not exists public.messages (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users (id) on delete set null,
  name        text        not null,
  phone       text        not null,
  body        text        not null default '',
  lang        text        not null default 'ar',
  handled     boolean     not null default false,
  source      text        not null default 'web',
  created_at  timestamptz not null default now()
);

-- --------------------------------------------------------- طلبات عرض العقار
create table if not exists public.listings (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users (id) on delete set null,
  name        text        not null,
  phone       text        not null,
  city        text        not null default '',
  deal        text        not null default 'sale',
  prop_type   text        not null default 'apartment',
  price       text        not null default '',
  currency    text        not null default 'usd',
  notes       text        not null default '',
  handled     boolean     not null default false,
  source      text        not null default 'web',
  created_at  timestamptz not null default now()
);

create index if not exists bookings_created_idx on public.bookings (created_at desc);
create index if not exists messages_created_idx on public.messages (created_at desc);
create index if not exists listings_created_idx on public.listings (created_at desc);

-- ====================================================== صلاحيات الوصول (RLS)
-- القاعدة هنا مختلفة عمداً عن العقارات:
--   الإرسال مفتوح للجميع — الزائر بلا حساب يجب أن يستطيع طلب معاينة.
--   القراءة مقفلة — الأدمن فقط، أو صاحب الطلب إن كان مسجّلاً.
-- هذا يمنع أي زائر من قراءة أرقام هواتف بقية العملاء.

alter table public.bookings enable row level security;
alter table public.messages enable row level security;
alter table public.listings enable row level security;

-- ---- حجوزات
drop policy if exists bookings_insert_any on public.bookings;
create policy bookings_insert_any on public.bookings
  for insert with check (true);

drop policy if exists bookings_read on public.bookings;
create policy bookings_read on public.bookings
  for select using (public.is_admin() or auth.uid() = user_id);

drop policy if exists bookings_admin_write on public.bookings;
create policy bookings_admin_write on public.bookings
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists bookings_admin_delete on public.bookings;
create policy bookings_admin_delete on public.bookings
  for delete using (public.is_admin());

-- ---- رسائل
drop policy if exists messages_insert_any on public.messages;
create policy messages_insert_any on public.messages
  for insert with check (true);

drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages
  for select using (public.is_admin() or auth.uid() = user_id);

drop policy if exists messages_admin_write on public.messages;
create policy messages_admin_write on public.messages
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- طلبات عرض عقار
drop policy if exists listings_insert_any on public.listings;
create policy listings_insert_any on public.listings
  for insert with check (true);

drop policy if exists listings_read on public.listings;
create policy listings_read on public.listings
  for select using (public.is_admin() or auth.uid() = user_id);

drop policy if exists listings_admin_write on public.listings;
create policy listings_admin_write on public.listings
  for all using (public.is_admin()) with check (public.is_admin());


-- ================================================== كشف الجداول لواجهة الـ API
grant insert on public.bookings to anon, authenticated;
grant insert on public.messages to anon, authenticated;
grant insert on public.listings to anon, authenticated;

grant select, update, delete on public.bookings to authenticated;
grant select, update, delete on public.messages to authenticated;
grant select, update, delete on public.listings to authenticated;
