/**
 * الاتصال بالسيرفر — نسخة التطبيق.
 *
 * التقسيم هنا مقصود:
 *   palmas-core.js  ->  المنطق (فلترة · ترتيب · عملات · تسميات · مدن)
 *   هذا الملف       ->  البيانات (عقارات · حسابات · مفضلة)
 *
 * المنطق يبقى محلياً لأنه حساب صرف لا يحتاج سيرفر، والبيانات وحدها هي التي
 * تنتقل — وهذا ما يجعل الحساب الواحد يعمل على الموقع والتطبيق معاً.
 *
 * إذا لم تكن الإعدادات جاهزة أو تعذّر الوصول للسيرفر، يرجع التطبيق تلقائياً
 * إلى بيانات النواة المحلية بدل أن يظهر فارغاً.
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY, backendReady } from '../../../palmas-backend/config';
import { createPalmasApi } from '../../../palmas-backend/palmas-api';

let api = null;
let live = false;

export function initBackend() {
  if (api || !backendReady()) return api;
  const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      storage: AsyncStorage,       // تبقى الجلسة بعد إغلاق التطبيق
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,   // لا ينطبق على الهاتف
    },
  });
  api = createPalmasApi({ client });
  return api;
}

export function backend() {
  return api;
}

/** هل السيرفر يردّ فعلاً؟ يُستدعى مرة عند الإقلاع */
export async function pingBackend() {
  if (!api) return false;
  try {
    await api.properties.all();
    live = true;
  } catch (e) {
    live = false;
  }
  return live;
}

export function isLive() {
  return live;
}

export default { initBackend, backend, pingBackend, isLive };
