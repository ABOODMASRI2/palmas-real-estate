-- =============================================================================
--  Palmas.ps — المرحلة الثالثة: مخزن صور العقارات
--  شغّله في Supabase → SQL Editor بعد schema.sql
--
--  الصور لا تُخزَّن في الجداول بل في Storage، ويحتفظ العقار بروابطها في
--  عمود photos. القاعدة: الجميع يشاهد، والأدمن وحده يرفع أو يحذف.
-- =============================================================================

-- إنشاء المخزن (public = الصور تُقرأ برابط مباشر بلا تسجيل دخول)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-photos',
  'property-photos',
  true,
  5242880,                                    -- 5 ميغابايت للصورة الواحدة
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif'];


-- ------------------------------------------------------------- الصلاحيات
-- القراءة مفتوحة: الزائر يجب أن يرى صور العقارات دون حساب.
drop policy if exists photos_public_read on storage.objects;
create policy photos_public_read on storage.objects
  for select using (bucket_id = 'property-photos');

-- الرفع والتعديل والحذف: الأدمن فقط.
drop policy if exists photos_admin_insert on storage.objects;
create policy photos_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'property-photos' and public.is_admin());

drop policy if exists photos_admin_update on storage.objects;
create policy photos_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'property-photos' and public.is_admin());

drop policy if exists photos_admin_delete on storage.objects;
create policy photos_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'property-photos' and public.is_admin());
