/**
 * إعدادات الاتصال بـ Supabase — املأ القيمتين أدناه من لوحة تحكّم مشروعك.
 *
 * وين تلاقيهم:
 *   URL  : Project Settings → General (أو Data API) → Project URL
 *   KEY  : Project Settings → API Keys → publishable   (أو anon public)
 *
 * هاتان القيمتان ليستا سراً — تُشحن داخل التطبيق والموقع بطبيعتها، والحماية
 * الفعلية تأتي من سياسات RLS في schema.sql.
 *
 * لا تضع هنا مفتاح service_role أبداً: هو يتخطّى كل الصلاحيات.
 */
export const SUPABASE_URL = 'https://hnfowyrddkhjbhelujwh.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_E0pImzEBWzRb4CVGZYC5rA_IW7_Ju5h';

/** true عندما تكون الإعدادات جاهزة — تستعملها الواجهات لتقرّر: سيرفر أم بيانات محلية */
export function backendReady() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}
