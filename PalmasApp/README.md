# Palmas.ps — تطبيق الهاتف (Android + iOS)

تطبيق أصلي (Native) مبني بـ **React Native + Expo**، يشارك الموقع **نفس النواة** `palmas-core.js`
حرفياً — نفس العقارات، نفس الفلاتر، نفس العملات، نفس الحسابات، نفس الـ CRM.

> **لماذا React Native وليس Flutter؟**
> نواة المشروع `palmas-core.js` مكتوبة بـ JavaScript خالص بدون أي اعتماد على المتصفح.
> React Native يشغّلها **كما هي، نسخة واحدة** بين الموقع والتطبيق وبعدين الباك اند (Node).
> Flutter كان بيفرض إعادة كتابة كل المنطق بـ Dart ونسختين لازم تتزامنوا يدوياً — مصدر أخطاء دائم.

---

## 1) التشغيل محلياً

المشروع على **Expo SDK 57** (React Native 0.86 · React 19) — لازم يضلّ على أحدث SDK
لأن **Expo Go بيدعم أحدث إصدار بس**، وآبل بترفض النشر بـ SDK قديم.

```powershell
cd PalmasApp
npm install
npx expo start
```

### على الآيفون
1. نزّل **Expo Go** من الآبستور
2. تأكد إن الآيفون والكمبيوتر على **نفس شبكة الواي فاي**
3. افتح **كاميرا** الآيفون وصوّب على الـ QR الظاهر بالترمنال → بينفتح بـ Expo Go
4. أو افتح Expo Go → *Enter URL manually* → `exp://<IP-الكمبيوتر>:8081`

**إذا ما زبط:** غالباً جدار حماية ويندوز بيحجب المنفذ 8081. الحل:

```powershell
New-NetFirewallRule -DisplayName "Expo Metro 8081" -Direction Inbound -LocalPort 8081 -Protocol TCP -Action Allow
```

أو استعمل نفق بدل الشبكة المحلية (بيشتغل حتى لو الشبكات مختلفة):

```powershell
npm install -g @expo/ngrok
npx expo start --tunnel
```

### على المحاكيات
- **Android**: اضغط `a` — يتطلب Android Studio + AVD
- **iOS**: اضغط `i` — يتطلب Mac + Xcode

> الخريطة على iOS بتشتغل مباشرة بخرائط Apple.
> على Android بتحتاج مفتاح Google Maps — شوف القسم (4).

---

## 2) البنية

```
PalmasApp/
├─ App.js                    شاشة الجذر: Splash + التنقل (تبويبات + ستاك)
├─ index.js                  نقطة الدخول
├─ app.json                  هوية التطبيق: الاسم، الأيقونة، الـ bundle id، الصلاحيات
├─ eas.json                  إعدادات البناء السحابي (APK / AAB / IPA)
├─ assets/                   اللوجو والأيقونات (نفس ملفات الموقع)
└─ src/
   ├─ core/
   │  ├─ palmas-core.js      ★ نسخة طبق الأصل من نواة الموقع — لا تُعدَّل هنا
   │  └─ index.js            جسر AsyncStorage → localStorage عشان النواة تشتغل بدون تعديل
   ├─ theme.js               الألوان والمسافات (مأخوذة من متغيّرات CSS بالموقع)
   ├─ i18n.js                نصوص عربي/إنجليزي — نفس صياغة الموقع
   ├─ store.js               AppProvider/useApp: كل ما تحتاجه الشاشات
   ├─ components/            PropertyCard · FilterSheet
   └─ screens/               Splash · Home · Explore · Map · Property · Saved · Account · Auth
```

### قاعدة ذهبية
`src/core/palmas-core.js` **نسخة**، مش أصل. أي تعديل على المنطق بيصير بملف الموقع
`Palmas.ps عقارات/palmas-core.js` وبعدين ينسخ لهون:

```powershell
Copy-Item "Palmas.ps عقارات\palmas-core.js" "PalmasApp\src\core\palmas-core.js" -Force
```

البيانات نفسها (العقارات، الحسابات، الطلبات) بتيجي من Supabase عبر
[`palmas-backend/palmas-api.js`](../palmas-backend/palmas-api.js) — نفس قاعدة بيانات الموقع.

---

## 3) البناء للنشر (Android + iOS)

البناء بيصير على سيرفرات Expo (EAS) — **مش لازم Mac للـ iOS**، بس لازم حساب Apple Developer للنشر.

```powershell
npm install -g eas-cli
eas login
eas build:configure

# Android — ملف AAB للنشر على Google Play
npm run build:android

# iOS — ملف IPA للنشر على App Store
npm run build:ios

# الاثنين مع بعض
npm run build:all
```

نسخة تجريبية سريعة (APK يتثبّت مباشرة على أي جوال Android):

```powershell
eas build --platform android --profile preview
```

### الرفع للمتاجر

```powershell
eas submit --platform android
eas submit --platform ios
```

المتطلبات:
| المنصّة | المطلوب |
|---|---|
| Google Play | حساب Google Play Developer (25$ مرة واحدة) |
| App Store | حساب Apple Developer (99$ سنوياً) |

---

## 4) مفتاح خرائط Google — مطلوب لأندرويد

**الوضع الحالي:** شاشة الخريطة على **أندرويد فاضية** (بتظهر خلفية بيج وشعار Google بس).
واجهة الشاشة كلها شغالة — الفلاتر، دليل الألوان، بطاقة العقار — بس **بلاطات الخريطة مش بتنزّل**
لأن Google بيرفض الطلب بدون مفتاح صالح.

> **على iOS ما في هالمشكلة إطلاقاً** — بيستعمل خرائط Apple وما بدّو أي مفتاح.
> يعني آيفونك الخريطة عنده شغالة عادي.

### كيف تجيب المفتاح (مجاني · دقيقتين)

1. افتح [Google Cloud Console](https://console.cloud.google.com/) وسجّل دخول
2. أنشئ مشروع جديد (أو اختر واحد موجود)
3. **APIs & Services → Library** → دوّر على **Maps SDK for Android** → **Enable**
4. **APIs & Services → Credentials** → **Create credentials → API key** → انسخ المفتاح

### وين تحطّه

ضيف هالكتلة جوّا `"android"` بملف `app.json`:

```json
"android": {
  "package": "ps.palmas.app",
  "config": {
    "googleMaps": { "apiKey": "المفتاح-اللي-نسخته-هون" }
  }
}
```

بعدها أعد تشغيل السيرفر بـ `npx expo start --clear`.

> ملاحظة: لا تحطّ قيمة وهمية مكان المفتاح — المفتاح الغلط بيتصرّف زي المفقود تماماً.

---

## 4b) تسجيل الدخول عبر Google

الزر **مخفي** لحد ما تعبّي معرّفات OAuth بملف [`src/authConfig.js`](src/authConfig.js) —
عمداً، عشان ما يكون في زر بيفشل لما الزبون يضغطه.

1. [Google Cloud Console](https://console.cloud.google.com/) → نفس المشروع تبع الخرائط
2. **APIs & Services → OAuth consent screen** → اختر **External** → عبّي اسم التطبيق والإيميل
3. **Credentials → Create credentials → OAuth client ID** — أنشئ **ثلاثة**:

| النوع | الإعداد المطلوب |
|---|---|
| **Web application** | مطلوب لتجربة الأمر بـ Expo Go |
| **Android** | Package: `ps.palmas.app` + بصمة SHA-1 (بتيجي من `eas credentials`) |
| **iOS** | Bundle ID: `ps.palmas.app` |

4. حطّهم بـ `src/authConfig.js`:

```js
export const GOOGLE = {
  iosClientId: '....apps.googleusercontent.com',
  androidClientId: '....apps.googleusercontent.com',
  webClientId: '....apps.googleusercontent.com',
};
```

> **تسجيل الدخول عبر Apple** شغّال بدون أي إعداد على أجهزة iOS الحقيقية —
> ما بيظهر على أندرويد ولا على المحاكي (قيد من آبل).
> وهو **بالتطبيق بس** مش بالموقع، لأنه متطلّب من آبل لتطبيقات iOS.

## 5) الخطوط

الموقع مكتوب بخط **Cairo**. حالياً التطبيق بيستعمل خط النظام (يدعم العربية على الجهازين).

`expo-font` **مثبّت أصلاً** (مطلوب من `@expo/vector-icons` — بدونه التطبيق بينهار بالنسخة
النهائية خارج Expo Go). لتطابق كامل مع خط الموقع:

1. ضع ملفات `Cairo-Regular.ttf` … `Cairo-Black.ttf` بمجلّد `assets/fonts/`
2. حمّلها بـ `useFonts` داخل `App.js`
3. فعّل `FONT.regular = 'Cairo'` بملف `src/theme.js` (المكان مجهّز مسبقاً)

---

## 6) ما الذي يتطابق مع الموقع

| الميزة | التطبيق | الموقع |
|---|---|---|
| كتالوج العقارات | `Palmas.allProperties()` | نفسه |
| المشاريع | `Palmas.allProjects()` | نفسه |
| الفلترة والترتيب | `Palmas.filteredBy/sortList` | نفسه |
| العملات + سعر الصرف | `Palmas.Currency` | نفسه |
| "تلقائي أو اختر عملتك" | إعدادات الحساب | الهيدر |
| الحسابات وكلمة المرور | `Palmas.API.signIn/signUp` | نفسه |
| المفضلة | `palmas_favs` لكل مستخدم | نفسه |
| الحجوزات والرسائل | `palmas_bookings` / `palmas_crm_messages` | نفسه |
| المستشار العقاري لكل عقار | نفس دالة التوزيع (hash) | نفسه |
| الألوان والهوية | `src/theme.js` | متغيّرات CSS |
| شاشة الافتتاح | نفس اللوجو والحركة والتوقيت | `Splash.dc.html` |

---

