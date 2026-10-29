-- =============================================================================
--  Palmas.ps — المرحلة الأولى: الحسابات والعقارات
--  شغّل هذا الملف مرة واحدة في Supabase → SQL Editor → New query
-- =============================================================================

-- ---------------------------------------------------------------- 1) الحسابات
-- Supabase ينشئ auth.users تلقائياً ويدير كلمات المرور و Apple و Google.
-- هذا الجدول يحمل البيانات التي تخصّنا: الاسم والهاتف ودور المستخدم.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text        not null default '',
  phone       text        not null default '',
  role        text        not null default 'customer'
                          check (role in ('customer', 'agent', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'بيانات المستخدم الظاهرة — مرتبطة بحساب Supabase';

-- ينشئ صف الملف الشخصي لحظة إنشاء الحساب، مهما كانت طريقة التسجيل
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), ''),
    coalesce(new.raw_user_meta_data ->> 'phone', new.phone, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- --------------------------------------------------------------- 2) العقارات
-- الأسماء والنصوص ثنائية اللغة تُخزَّن كـ jsonb بالشكل {"ar": "...", "en": "..."}
-- تماماً كما هي في palmas-core.js، حتى لا يتغيّر شكل البيانات في الواجهات.
create table if not exists public.properties (
  id          text        primary key,
  name        jsonb       not null,
  loc         jsonb       not null,
  country     text        not null,
  city_key    text        not null,
  type        text        not null,
  offer       text        not null,
  price       numeric     not null default 0,
  currency    text        not null default 'usd',
  rooms       int         not null default 0,
  baths       int         not null default 0,
  area        numeric     not null default 0,
  lat         double precision,
  lng         double precision,
  ownership   text        not null default 'tabu',
  zone        text        not null default '',
  floor       int,
  year        int,
  parking     boolean     not null default false,
  exc         boolean     not null default false,
  descr       jsonb       not null default '{"ar":"","en":""}'::jsonb,
  features    jsonb       not null default '{"ar":[],"en":[]}'::jsonb,
  photos      text[]      not null default '{}',
  published   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- الفهارس تخدم الفلاتر التي تستعملها الواجهة فعلاً
create index if not exists properties_country_idx  on public.properties (country);
create index if not exists properties_city_idx     on public.properties (city_key);
create index if not exists properties_offer_idx    on public.properties (offer);
create index if not exists properties_type_idx     on public.properties (type);
create index if not exists properties_published_idx on public.properties (published);


-- --------------------------------------------------------------- 3) المفضلة
create table if not exists public.favorites (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  property_id text        not null references public.properties (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, property_id)
);

create index if not exists favorites_user_idx on public.favorites (user_id);


-- ------------------------------------------------------- updated_at تلقائياً
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists properties_touch on public.properties;
create trigger properties_touch before update on public.properties
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();


-- ====================================================== صلاحيات الوصول (RLS)
-- بدون هذه السياسات يكون الجدول مفتوحاً للجميع. القاعدة العامة:
-- الزائر يقرأ العقارات فقط، والمستخدم يتحكّم ببياناته هو، والأدمن يدير كل شيء.

alter table public.profiles   enable row level security;
alter table public.properties enable row level security;
alter table public.favorites  enable row level security;

-- من هو الأدمن؟ دالة واحدة تُستعمل في كل السياسات
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---- الملفات الشخصية
drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---- العقارات: الجميع يقرأ المنشور، والأدمن وحده يكتب
drop policy if exists properties_read_all on public.properties;
create policy properties_read_all on public.properties
  for select using (published = true or public.is_admin());

drop policy if exists properties_admin_write on public.properties;
create policy properties_admin_write on public.properties
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- المفضلة: كل مستخدم يرى ويعدّل مفضلته فقط
drop policy if exists favorites_own on public.favorites;
create policy favorites_own on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ================================================== كشف الجداول لواجهة الـ API
-- إذا كان خيار "Automatically expose new tables" مطفأً في إعدادات المشروع، فلن
-- تصل هذه الجداول إلى الـ API إلا بمنح صريح. هذه الأوامر تجعل الملف يعمل في
-- الحالتين — وهي آمنة لأن RLS أعلاه هو من يقرّر فعلياً من يرى ماذا.
grant usage on schema public to anon, authenticated;

grant select                         on public.properties to anon, authenticated;
grant insert, update, delete         on public.properties to authenticated;
grant select, update                 on public.profiles   to authenticated;
grant select, insert, delete         on public.favorites  to authenticated;
