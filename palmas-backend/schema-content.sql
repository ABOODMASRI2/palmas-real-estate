-- =============================================================================
--  Palmas.ps — محتوى الموقع القابل للتعديل من لوحة الإدارة
--  شغّله في Supabase → SQL Editor بعد schema.sql
--
--  أرقام الصفحة الرئيسية، آراء العملاء، روابط التواصل الاجتماعي، وروابط
--  المتاجر. كانت مكتوبة داخل الصفحات يدوياً؛ الآن يعدّلها الأدمن ويقرأها الجميع.
-- =============================================================================

create table if not exists public.site_settings (
  key         text        primary key,
  value       jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

drop trigger if exists site_settings_touch on public.site_settings;
create trigger site_settings_touch before update on public.site_settings
  for each row execute function public.touch_updated_at();

alter table public.site_settings enable row level security;

-- يُعرض لكل زائر، فالقراءة عامة
drop policy if exists site_settings_read on public.site_settings;
create policy site_settings_read on public.site_settings
  for select using (true);

drop policy if exists site_settings_admin on public.site_settings;
create policy site_settings_admin on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());

grant select                 on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;
