-- =============================================================================
--  Palmas.ps — صور الموقع الثابتة
--
--  صور العقارات والمشاريع تعيش في عمود photos داخل جدولها، ليقرأها التطبيق
--  أيضاً. أما صور الموقع نفسه (صورة "من نحن"، خريطة التواصل، لقطة التطبيق…)
--  فلا تخصّ سجلاً بعينه، فتُربط هنا باسم مكانها في الصفحة.
-- =============================================================================

create table if not exists public.site_images (
  slot        text        primary key,     -- اسم المكان: about-page-img …
  url         text        not null,
  updated_at  timestamptz not null default now()
);

alter table public.site_images enable row level security;

-- الجميع يقرأ (الصور تظهر لكل زائر)، والأدمن وحده يرفع أو يغيّر.
drop policy if exists site_images_read on public.site_images;
create policy site_images_read on public.site_images
  for select using (true);

drop policy if exists site_images_admin on public.site_images;
create policy site_images_admin on public.site_images
  for all using (public.is_admin()) with check (public.is_admin());

grant select                         on public.site_images to anon, authenticated;
grant insert, update, delete         on public.site_images to authenticated;
