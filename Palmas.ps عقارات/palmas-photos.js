/**
 * Palmas — صور حقيقية داخل <image-slot>.
 *
 * المكوّن الأصلي (image-slot.js) أداة تصميم: يخزّن الصورة كـ data-URL في ملف
 * .image-slots.state.json عبر window.omelette.writeFile، ويصير للقراءة فقط
 * خارج بيئة التصميم. يعني على الموقع المنشور: ما في صور، ولا طريقة لإضافتها.
 *
 * هذا الملف يعالج الأمرين بلا تعديل أي صفحة ولا تعديل المكوّن نفسه:
 *
 *   العرض  — يقرأ رابط الصورة من السيرفر ويضعه في خاصية src التي يدعمها
 *            المكوّن أصلاً، فتظهر الصورة لكل زائر.
 *   الرفع  — للأدمن فقط: يلتقط السحب أو النقر في طور الالتقاط قبل معالِج
 *            المكوّن، فيرفع الملف إلى مخزن Supabase ويحفظ رابطه.
 *
 * أين يُحفظ الرابط:
 *   صور العقارات والمشاريع -> عمود photos في جدولها، ليراها التطبيق أيضاً.
 *   صور الموقع الثابتة     -> جدول site_images.
 */
(function () {
  'use strict';

  if (window.__palmasPhotosLoaded) return;
  window.__palmasPhotosLoaded = true;

  var MAX_MB = 5;
  var TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

  var siteImages = null;          // { slot: url } — يُملأ مرة واحدة
  var pending = {};               // صور رُفعت لعقار لم يُحفظ بعد
  var watching = false;

  function core() { return window.Palmas; }

  /* ---------------------------------------------------------- التعرّف على المكان
     كل صفحة تسمّي أماكن صورها بطريقتها: pp- في القوائم، hp- و hp-x- في
     الرئيسية، pmx- في نسخة الجوال، prj- في المشاريع… ولو اكتفينا بمطابقة
     البادئات لضاع كل نمط لم نعدّه — وهذا ما جعل صور الرئيسية لا تظهر.

     فبدل التخمين من الاسم وحده، نجرّب: هل ما تبقّى بعد نزع البادئة معرّفُ
     عقار أو مشروع حقيقي؟ إن كان فهي صورته، وإلا فهي صورة موقع ثابتة. */

  var RECORD_PREFIX = /^(?:pp|prj|wish|hp-x|hp|pmx-sim|pmx|pdx|x)-/;

  /** هل هذا المعرّف لعقار أو مشروع قائم؟ */
  function recordKind(id) {
    var P = core();
    if (!P) return null;
    if (P.propBy && P.propBy(id)) return 'prop';
    if (P.projectBy && P.projectBy(id)) return 'proj';
    return null;
  }

  function slotMeta(id) {
    var m;

    /* نماذج الإدارة وصفحات التفاصيل: البادئة صريحة وتعمل حتى قبل حفظ السجل،
       فالصور تُرفع للعقار الجديد قبل أن يوجد. */
    if ((m = /^pd-(.+)-(main|\d+)$/.exec(id)))
      return { kind: 'prop', id: m[1], i: m[2] === 'main' ? 0 : +m[2] };
    if ((m = /^prjd-(.+)-(main|\d+)$/.exec(id)))
      return { kind: 'proj', id: m[1], i: m[2] === 'main' ? 0 : +m[2] };

    /* بادئة معروفة يليها معرّف سجل */
    var stripped = id.replace(RECORD_PREFIX, '');
    if (stripped !== id) {
      var k = recordKind(stripped);
      if (k) return { kind: k, id: stripped, i: 0 };
    }

    /* أو المعرّف نفسه بلا بادئة */
    var k2 = recordKind(id);
    if (k2) return { kind: k2, id: id, i: 0 };

    return { kind: 'site', id: id, i: 0 };        // صورة موقع ثابتة
  }

  function isAdmin() {
    var P = core();
    if (!P || !P.API || !P.Photos) return false;
    var s = P.API.session();
    return !!(s && s.role === 'admin');
  }

  /* ------------------------------------------------------------------- العرض */

  function urlFor(meta) {
    var P = core();
    if (!P) return '';
    if (meta.kind === 'site') return (siteImages && siteImages[meta.id]) || '';

    var rec = meta.kind === 'proj'
      ? (P.projectBy && P.projectBy(meta.id))
      : (P.propBy && P.propBy(meta.id));
    if (!rec) {
      /* عقار قيد الإضافة: الصورة مرفوعة وما انحفظ بعد */
      return pending[meta.kind + ':' + meta.id + ':' + meta.i] || '';
    }
    var photos = rec.photos || [];
    return photos[meta.i] || '';
  }

  /* مكان بلا صورة: الزائر كان يرى مربّع أداة التصميم الرمادي ("صورة فيلا…")،
     فنعطيه بدلاً منه لوحة بهوية الموقع. الأدمن يبقى يرى المربّع الفارغ لأنه
     هو نفسه زر الرفع — يعرف منه أين ينقص صورة. */
  var FALLBACK = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#f4ece4"/><stop offset="1" stop-color="#e6dbd0"/></linearGradient>' +
        '<pattern id="p" width="28" height="28" patternUnits="userSpaceOnUse">' +
          '<circle cx="2" cy="2" r="1.4" fill="#d9c6b4" fill-opacity=".55"/></pattern></defs>' +
      '<rect width="800" height="600" fill="url(#g)"/><rect width="800" height="600" fill="url(#p)"/>' +
      '<g transform="translate(400 282)" fill="none" stroke="#f68743" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" stroke-opacity=".7">' +
        '<path d="M-62 2 L0 -50 L62 2"/><path d="M-46 -10 V52 H46 V-10"/><path d="M-12 52 V18 H12 V52"/></g>' +
      '<text x="400" y="390" text-anchor="middle" font-family="Cairo,Segoe UI,Arial,sans-serif" font-size="30" font-weight="800" fill="#b89f8a" letter-spacing="2">PALMAS.ps</text>' +
    '</svg>');

  /** يضع الرابط في src، والمكوّن يعرضه كما يعرض أي صورة مؤلِّف */
  function paint(el) {
    if (!el.id) return;
    var url = urlFor(slotMeta(el.id)) || (isAdmin() ? '' : FALLBACK);
    if (url) {
      if (el.getAttribute('src') !== url) el.setAttribute('src', url);
    } else if (el.hasAttribute('src')) {
      el.removeAttribute('src');
    }
  }

  function paintAll() {
    var list = document.querySelectorAll('image-slot');
    for (var i = 0; i < list.length; i++) paint(list[i]);
  }

  /* ------------------------------------------------------------------- الرفع */

  function toast(msg) {
    var P = core();
    if (P && P.toast) { P.toast(msg); return; }
    console.log('[Palmas] ' + msg);
  }

  function ar() {
    return (document.documentElement.lang || 'ar') !== 'en';
  }

  function saveUrl(meta, url) {
    var P = core();

    if (meta.kind === 'site') {
      return P.Photos.setSiteImage(meta.id, url).then(function () {
        siteImages = siteImages || {};
        siteImages[meta.id] = url;
      });
    }

    var rec = meta.kind === 'proj' ? P.projectBy(meta.id) : P.propBy(meta.id);
    if (!rec) {
      /* لم يُحفظ السجل بعد — نحتفظ بالرابط ريثما يُحفظ */
      pending[meta.kind + ':' + meta.id + ':' + meta.i] = url;
      return Promise.resolve();
    }

    var photos = (rec.photos || []).slice();
    while (photos.length < meta.i) photos.push('');
    photos[meta.i] = url;

    return P.Photos.setPhotos(meta.kind, meta.id, photos);
  }

  function upload(el, file) {
    if (TYPES.indexOf(file.type) === -1) {
      toast(ar() ? 'اختر صورة JPG أو PNG أو WebP' : 'Choose a JPG, PNG or WebP image');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast(ar() ? ('الصورة أكبر من ' + MAX_MB + ' ميغابايت') : ('Image is larger than ' + MAX_MB + 'MB'));
      return;
    }

    var meta = slotMeta(el.id);
    el.setAttribute('data-palmas-busy', '');
    toast(ar() ? 'جاري رفع الصورة…' : 'Uploading…');

    core().Photos.upload(meta.kind + '-' + meta.id, file)
      .then(function (url) {
        return saveUrl(meta, url).then(function () {
          el.setAttribute('src', url);
          toast(ar() ? 'تم رفع الصورة' : 'Photo uploaded');
        });
      })
      .catch(function (e) {
        console.log('[Palmas] فشل رفع الصورة:', e && e.message);
        toast(ar() ? 'تعذّر رفع الصورة' : 'Upload failed');
      })
      .then(function () { el.removeAttribute('data-palmas-busy'); });
  }

  function pickFile(el) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = TYPES.join(',');
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      if (f) upload(el, f);
      input.remove();
    });
    input.click();
  }

  /* المعالِجات في طور الالتقاط على المستند: تسبق معالِجات المكوّن (المسجَّلة
     على العنصر نفسه وداخل جذره المظلَّل)، فيمنع stopPropagation المسار القديم
     الذي كان يكتب data-URL في ملف جانبي. */
  function armUploads() {
    if (watching) return;
    watching = true;

    var slotUnder = function (e) {
      var path = e.composedPath ? e.composedPath() : [];
      for (var i = 0; i < path.length; i++) {
        var n = path[i];
        if (n && n.tagName === 'IMAGE-SLOT') return n;
      }
      return null;
    };

    ['dragenter', 'dragover'].forEach(function (type) {
      document.addEventListener(type, function (e) {
        if (!isAdmin() || !slotUnder(e)) return;
        e.preventDefault();                       // بدونها لا يُطلق حدث drop
      }, true);
    });

    document.addEventListener('drop', function (e) {
      var el = slotUnder(e);
      if (!el || !isAdmin()) return;
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f) return;
      e.preventDefault();
      e.stopPropagation();
      upload(el, f);
    }, true);

    document.addEventListener('click', function (e) {
      var el = slotUnder(e);
      if (!el || !isAdmin()) return;
      if (el.hasAttribute('data-palmas-busy')) return;
      e.preventDefault();
      e.stopPropagation();
      pickFile(el);
    }, true);
  }

  /* ------------------------------------------------------------ الربط بالصفحة */

  /** تجمع صور عقار قيد الإضافة لتُحفظ معه — تستدعيها لوحة التحكم عند الحفظ */
  function collect(prefix) {
    var out = [];
    Object.keys(pending).forEach(function (k) {
      var parts = k.split(':');
      if (parts[0] + '-' + parts[1] === prefix) out[+parts[2]] = pending[k];
    });
    for (var i = 0; i < out.length; i++) if (!out[i]) out[i] = '';
    return out.filter(function (u, i) { return u || i === 0; });
  }

  function clearPending(prefix) {
    Object.keys(pending).forEach(function (k) {
      var parts = k.split(':');
      if (parts[0] + '-' + parts[1] === prefix) delete pending[k];
    });
  }

  window.PalmasPhotos = { collect: collect, clearPending: clearPending, repaint: paintAll };

  /* الصفحات تُعاد رسمها كثيراً (تغيّر لغة، فلترة، وصول بيانات السيرفر)، فكل
     <image-slot> جديد يحتاج رابطه. مراقب واحد أرخص من إعادة رسم دورية. */
  function observe() {
    var mo = new MutationObserver(function () { paintAll(); });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  function start(P) {
    /* صور الموقع الثابتة: طلب واحد يخدم كل الصفحة */
    if (P.Photos && P.Photos.siteImages) {
      P.Photos.siteImages().then(function (map) {
        siteImages = map;
        paintAll();
      }).catch(function () { siteImages = {}; });
    } else {
      siteImages = {};
    }

    paintAll();
    observe();
    armUploads();
    if (P.API && P.API.onAuthChange) P.API.onAuthChange(paintAll);
  }

  /* ننتظر النواة والجسر معاً: بلا Photos لا رفع، وبلا النواة لا نعرف العقارات */
  var tries = 0;
  (function poll() {
    var P = window.Palmas;
    if (P && P.propBy) { start(P); return; }
    if (++tries > 200) return;                    // ~10 ثوانٍ ثم نتركها
    setTimeout(poll, 50);
  })();
})();
