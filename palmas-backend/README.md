# Palmas.ps — الباك اند (Supabase)

مصدر بيانات واحد للموقع والتطبيق: **Postgres + Auth + Storage** على Supabase.
كل الحماية مفروضة على مستوى قاعدة البيانات بسياسات **RLS** — مش بالواجهة.

---

## التشغيل على مشروع Supabase جديد

1. أنشئ مشروع على [supabase.com](https://supabase.com).
2. من **SQL Editor** شغّل الملفات بهالترتيب:

| # | الملف | شو فيه |
|---|---|---|
| 1 | [`schema.sql`](schema.sql) | الحسابات (`profiles` + دور الأدمن)، العقارات، المفضلة، الدالة `is_admin()` |
| 2 | [`schema-crm.sql`](schema-crm.sql) | طلبات الزبائن: حجز معاينة، رسائل التواصل، طلبات عرض عقار |
| 3 | [`schema-rest.sql`](schema-rest.sql) | المشاريع، الموظفون، أسعار الصرف، الفواتير (ERP) |
| 4 | [`schema-storage.sql`](schema-storage.sql) | مخزن صور العقارات `property-photos` |
| 5 | [`schema-images.sql`](schema-images.sql) | صور الموقع الثابتة (من نحن، التواصل…) |
| 6 | [`schema-stats.sql`](schema-stats.sql) | إحصاءات الزيارات الحقيقية للوحة التحكم |
| 7 | [`schema-owners.sql`](schema-owners.sql) | المالكون وعقود الوساطة والعمولات — للأدمن وحده |
| 8 | [`schema-content.sql`](schema-content.sql) | محتوى الموقع القابل للتعديل (أرقام، آراء، روابط التواصل) |
| 9 | [`schema-chat.sql`](schema-chat.sql) | محادثات الشات الحيّ من الموقع إلى CRM |

3. انسخ **Project URL** و **publishable key** إلى [`config.js`](config.js) (التطبيق)
   و `Palmas.ps عقارات/palmas-config.js` (الموقع).
4. سجّل حساب من الموقع، وبعدين اعمله أدمن:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

> الـ publishable key **مش سر** — مصمّم يكون بالواجهة، والحماية من RLS.
> **لا تحطّ `service_role` أو secret key بالكود أبداً** — هاد بيتخطّى كل الصلاحيات.

---

## الصلاحيات (RLS)

| | الزائر | المستخدم | الأدمن |
|---|---|---|---|
| قراءة العقارات والمشاريع والمحتوى | ✅ | ✅ | ✅ |
| إرسال طلب معاينة / رسالة / محادثة | ✅ | ✅ | ✅ |
| المفضلة | — | ✅ تبعته بس | ✅ تبعته بس |
| إضافة/تعديل/حذف عقار أو مشروع أو صورة | ❌ | ❌ | ✅ |
| قراءة طلبات الزبائن والمحادثات (CRM) | ❌ | ❌ | ✅ |
| المالكون والعقود والفواتير (ERP) | ❌ | ❌ | ✅ |

المحادثات والطلبات **إضافة فقط** للزائر: بيكتب، بس ما بيقدر يقرأ أو يعدّل شي — حتى طلباته.

---

## [`palmas-api.js`](palmas-api.js)

طبقة الوصول اللي بيستعملها التطبيق. بتحوّل صفوف قاعدة البيانات لنفس شكل الكائنات
اللي بتتوقّعها النواة المشتركة `palmas-core.js`، فالشاشات ما بتعرف إنه في سيرفر.
الموقع بيعمل نفس الشي عبر `Palmas.ps عقارات/palmas-backend.js`.
