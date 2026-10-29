/* Palmas shared core — data, filter logic, auth + favourites services.
   Front-end only today; every read/write goes through PalmasAPI so a real
   backend is a one-file swap (set Palmas.API.baseUrl and flip USE_REMOTE). */
(function (w) {
  'use strict';

  var USE_REMOTE = false;          // flip when the backend is live
  var BASE_URL = '/api';           // backend root

  /* ---------------------------------------------------------------- limits */
  var LIMITS = {
    PRICE_MIN: 20000, PRICE_MAX: 2000000, PRICE_STEP: 20000,
    AREA_MIN: 0, AREA_MAX: 800, AREA_STEP: 25
  };

  /* --------------------------------------------------------------- options */
  var COUNTRIES = [
    { k: 'ps', ar: 'فلسطين', en: 'Palestine', center: [31.95, 35.22], zoom: 9 },
    { k: 'ae', ar: 'الإمارات', en: 'UAE', center: [24.9, 54.6], zoom: 8 },
    { k: 'jo', ar: 'الأردن', en: 'Jordan', center: [31.95, 35.93], zoom: 8 }
  ];

  var CITIES = [
    { k: 'ramallah', c: 'ps', ar: 'رام الله', en: 'Ramallah', center: [31.9038, 35.2034] },
    { k: 'albireh', c: 'ps', ar: 'البيرة', en: 'Al-Bireh', center: [31.90, 35.221] },
    { k: 'nablus', c: 'ps', ar: 'نابلس', en: 'Nablus', center: [32.2211, 35.2544] },
    { k: 'beitunia', c: 'ps', ar: 'بيتونيا', en: 'Beitunia', center: [31.889, 35.172] },
    { k: 'birzeit', c: 'ps', ar: 'بيرزيت', en: 'Birzeit', center: [31.9714, 35.1897] },
    { k: 'rawabi', c: 'ps', ar: 'روابي', en: 'Rawabi', center: [32.0264, 35.1856] },
    { k: 'dubai', c: 'ae', ar: 'دبي', en: 'Dubai', center: [25.2048, 55.2708] },
    { k: 'abudhabi', c: 'ae', ar: 'أبو ظبي', en: 'Abu Dhabi', center: [24.4539, 54.3773] },
    { k: 'sharjah', c: 'ae', ar: 'الشارقة', en: 'Sharjah', center: [25.3463, 55.4209] },
    { k: 'amman', c: 'jo', ar: 'عمّان', en: 'Amman', center: [31.9539, 35.9106] },
    { k: 'irbid', c: 'jo', ar: 'إربد', en: 'Irbid', center: [32.5556, 35.85] },
    { k: 'zarqa', c: 'jo', ar: 'الزرقاء', en: 'Zarqa', center: [32.0728, 36.088] }
  ];

  var TYPES = ['all', 'apartment', 'villa', 'house', 'studio', 'office', 'shop', 'warehouse', 'building', 'farm', 'land'];
  var OFFERS = ['all', 'sale', 'rent', 'residential', 'landOffer'];
  var OWNS = ['all', 'tabu', 'milk', 'waqf', 'shared'];
  var ZONES = ['all', 'zone_a', 'zone_b', 'zone_c', 'zone_d', 'zone_e'];
  var BEDS = [0, 1, 2, 3, 4];
  var SORTS = ['newest', 'priceAsc', 'priceDesc', 'areaDesc'];

  var L = {
    ar: {
      all: 'الكل',
      type: { apartment: 'شقة', villa: 'فيلا', house: 'بيت', studio: 'استوديو', office: 'مكتب', shop: 'محل', warehouse: 'مستودع', building: 'عمارة', farm: 'مزرعة', land: 'أرض' },
      offer: { sale: 'للبيع', rent: 'للإيجار', residential: 'سكنات', landOffer: 'أراضي' },
      own: { tabu: 'طابو', milk: 'ملك', waqf: 'وقف', shared: 'مشترك' },
      zone: { zone_a: 'سكن أ', zone_b: 'سكن ب', zone_c: 'سكن ج', zone_d: 'سكن د', zone_e: 'سكن هـ' },
      sort: { newest: 'الأحدث', priceAsc: 'السعر: الأقل أولاً', priceDesc: 'السعر: الأعلى أولاً', areaDesc: 'المساحة: الأكبر أولاً' },
      fields: { country: 'الدولة', city: 'المدينة', offer: 'نوع العرض', type: 'نوع العقار', beds: 'غرف النوم', baths: 'الحمامات', own: 'نوع الملكية', zone: 'التصنيف السكني', maxPrice: 'أعلى سعر', minArea: 'الحد الأدنى للمساحة' },
      filters: 'الفلاتر', reset: 'إعادة تعيين', show: 'عرض', results: 'عقار', clear: 'مسح الفلاتر',
      noResults: 'لا نتائج', noResultsSub: 'جرّب تعديل الفلاتر أو كلمات البحث للعثور على العقار المناسب.',
      rooms: 'غرف', bath: 'حمام', sqm: 'م²'
    },
    en: {
      all: 'All',
      type: { apartment: 'Apartment', villa: 'Villa', house: 'House', studio: 'Studio', office: 'Office', shop: 'Shop', warehouse: 'Warehouse', building: 'Building', farm: 'Farm', land: 'Land' },
      offer: { sale: 'For sale', rent: 'For rent', residential: 'Residential', landOffer: 'Land' },
      own: { tabu: 'Tabu', milk: 'Freehold', waqf: 'Waqf', shared: 'Shared' },
      zone: { zone_a: 'Zone A', zone_b: 'Zone B', zone_c: 'Zone C', zone_d: 'Zone D', zone_e: 'Zone E' },
      sort: { newest: 'Newest', priceAsc: 'Price: low first', priceDesc: 'Price: high first', areaDesc: 'Area: largest first' },
      fields: { country: 'Country', city: 'City', offer: 'Offer type', type: 'Property type', beds: 'Bedrooms', baths: 'Bathrooms', own: 'Ownership', zone: 'Zoning', maxPrice: 'Max price', minArea: 'Min area' },
      filters: 'Filters', reset: 'Reset', show: 'Show', results: 'properties', clear: 'Clear filters',
      noResults: 'No results', noResultsSub: 'Try adjusting the filters or your search to find the right property.',
      rooms: 'bd', bath: 'ba', sqm: 'm²'
    }
  };

  /* ------------------------------------------------------------------ data
     لا كتالوج مكتوب داخل الكود: العقارات تأتي من قاعدة البيانات وحدها، فلا
     تظهر عقارات وهمية لو تعذّر السيرفر. (البذرة التجريبية القديمة محفوظة في
     نسخة palmas-backup-* إن احتجتها.) */
  var PROPERTIES = [];

  var MARKER_COLORS = { apartment: '#7fd3ff', villa: '#f68743', land: '#c8a2ff', commercial: '#ffd166', residential: '#ffd166', mixed: '#a8e6a1' };
  function markerColor(prop) {
    if (prop.offer === 'residential') return MARKER_COLORS.residential;
    if (MARKER_COLORS[prop.type]) return MARKER_COLORS[prop.type];
    if (prop.type === 'office' || prop.type === 'shop' || prop.type === 'warehouse') return MARKER_COLORS.commercial;
    return '#ddd';
  }

  /* ------------------------------------------------------- admin CRUD overlay
     properties are never mutated in place — admin add/edit/delete write to these
     localStorage-backed overlays and get merged over the base PROPERTIES at read time,
     so the site (PropertyList/Map/PropertyDetails/Home), CRM and Admin all see one catalog. */
  var ADMIN_ADDED_KEY = 'palmas_admin_props';
  var ADMIN_REMOVED_KEY = 'palmas_admin_removed';
  var ADMIN_EDITED_KEY = 'palmas_admin_edited';

  function allProperties() {
    var removed = local(ADMIN_REMOVED_KEY, []);
    var edited = local(ADMIN_EDITED_KEY, {});
    var added = local(ADMIN_ADDED_KEY, []);
    var base = PROPERTIES
      .filter(function (x) { return removed.indexOf(x.id) === -1; })
      .map(function (x) { return edited[x.id] ? Object.assign({}, x, edited[x.id]) : x; });
    var addedFull = added.map(function (x) {
      return Object.assign({ ownership: 'tabu', zone: '', floor: null, year: null, parking: null, currency: 'usd', desc: { ar: '', en: '' }, features: { ar: [], en: [] }, exc: false, slot: 'pp-' + x.id, custom: true }, x);
    });
    return base.concat(addedFull);
  }

  /* الكتالوج الحيّ.
     الافتراضي هو البذرة المحلية، ويستبدله جسر السيرفر بـ setCatalog. كل ما
     يقرأ العقارات داخلياً (الفلترة، propBy، قوائم الإدارة، قيم الصفقات) يمرّ
     من هنا — فلا يبقى موضعٌ يقرأ البذرة وحده ويعرض بيانات قديمة. */
  var catalog = allProperties;
  var catalogProjects = null;                    // يُضبط بعد تعريف allProjects
  function setCatalog(fn) { catalog = (typeof fn === 'function') ? fn : allProperties; }
  function setProjectCatalog(fn) { catalogProjects = (typeof fn === 'function') ? fn : allProjects; }
  function projects() { return (catalogProjects || allProjects)(); }

  var PropsAdmin = {
    list: function () { return catalog(); },
    isCustom: function (id) { return local(ADMIN_ADDED_KEY, []).some(function (x) { return x.id === id; }); },
    add: function (data) {
      var id = data.id || ('a' + Date.now());
      var rec = Object.assign({ ownership: 'tabu', zone: '', floor: null, year: null, parking: null, currency: 'usd', desc: { ar: '', en: '' }, features: { ar: [], en: [] }, exc: false, createdAt: Date.now() }, data, { id: id, slot: 'pp-' + id, custom: true });
      var added = local(ADMIN_ADDED_KEY, []);
      added.push(rec); save(ADMIN_ADDED_KEY, added);
      return rec;
    },
    update: function (id, patch) {
      var added = local(ADMIN_ADDED_KEY, []);
      var idx = -1;
      for (var i = 0; i < added.length; i++) if (added[i].id === id) { idx = i; break; }
      if (idx !== -1) { added[idx] = Object.assign({}, added[idx], patch); save(ADMIN_ADDED_KEY, added); return added[idx]; }
      var edited = local(ADMIN_EDITED_KEY, {});
      edited[id] = Object.assign({}, edited[id] || {}, patch);
      save(ADMIN_EDITED_KEY, edited);
      return propBy(id);
    },
    remove: function (id) {
      var added = local(ADMIN_ADDED_KEY, []);
      if (added.some(function (x) { return x.id === id; })) {
        save(ADMIN_ADDED_KEY, added.filter(function (x) { return x.id !== id; }));
        return;
      }
      var removed = local(ADMIN_REMOVED_KEY, []);
      if (removed.indexOf(id) === -1) { removed.push(id); save(ADMIN_REMOVED_KEY, removed); }
    },
    restore: function (id) {
      var removed = local(ADMIN_REMOVED_KEY, []);
      save(ADMIN_REMOVED_KEY, removed.filter(function (x) { return x !== id; }));
    }
  };

  /* -------------------------------------------------------------- projects
     development projects (multi-unit residential/commercial complexes) — a distinct
     entity from individual PROPERTIES, but the same admin-overlay CRUD pattern so the
     public Projects.dc.html page, ProjectDetails.dc.html and the admin dashboard always
     see one shared catalog (never mutated in place, same as PROPERTIES/PropsAdmin above). */
  var PROJECTS = [];

  var PROJ_ADDED_KEY = 'palmas_admin_projects';
  var PROJ_REMOVED_KEY = 'palmas_admin_projects_removed';
  var PROJ_EDITED_KEY = 'palmas_admin_projects_edited';

  function allProjects() {
    var removed = local(PROJ_REMOVED_KEY, []);
    var edited = local(PROJ_EDITED_KEY, {});
    var added = local(PROJ_ADDED_KEY, []);
    var base = PROJECTS
      .filter(function (x) { return removed.indexOf(x.id) === -1; })
      .map(function (x) { return edited[x.id] ? Object.assign({}, x, edited[x.id]) : x; });
    var addedFull = added.map(function (x) {
      return Object.assign({ currency: 'usd', desc: { ar: '', en: '' }, stats: [], lat: null, lng: null, slot: 'prj-' + x.id, custom: true }, x);
    });
    return base.concat(addedFull);
  }
  function projectBy(id) { return projects().filter(function (x) { return x.id === id; })[0] || null; }

  var ProjectsAdmin = {
    list: function () { return projects(); },
    isCustom: function (id) { return local(PROJ_ADDED_KEY, []).some(function (x) { return x.id === id; }); },
    add: function (data) {
      var id = data.id || ('pr' + Date.now());
      var rec = Object.assign({ currency: 'usd', desc: { ar: '', en: '' }, stats: [], lat: null, lng: null, createdAt: Date.now() }, data, { id: id, slot: 'prj-' + id, custom: true });
      var added = local(PROJ_ADDED_KEY, []);
      added.push(rec); save(PROJ_ADDED_KEY, added);
      return rec;
    },
    update: function (id, patch) {
      var added = local(PROJ_ADDED_KEY, []);
      var idx = -1;
      for (var i = 0; i < added.length; i++) if (added[i].id === id) { idx = i; break; }
      if (idx !== -1) { added[idx] = Object.assign({}, added[idx], patch); save(PROJ_ADDED_KEY, added); return added[idx]; }
      var edited = local(PROJ_EDITED_KEY, {});
      edited[id] = Object.assign({}, edited[id] || {}, patch);
      save(PROJ_EDITED_KEY, edited);
      return projectBy(id);
    },
    remove: function (id) {
      var added = local(PROJ_ADDED_KEY, []);
      if (added.some(function (x) { return x.id === id; })) {
        save(PROJ_ADDED_KEY, added.filter(function (x) { return x.id !== id; }));
        return;
      }
      var removed = local(PROJ_REMOVED_KEY, []);
      if (removed.indexOf(id) === -1) { removed.push(id); save(PROJ_REMOVED_KEY, removed); }
    },
    restore: function (id) {
      var removed = local(PROJ_REMOVED_KEY, []);
      save(PROJ_REMOVED_KEY, removed.filter(function (x) { return x !== id; }));
    }
  };

  /* -------------------------------------------------------------- staff
     one employee directory shared by ERP (HR/payroll) and CRM (agent picker) —
     CRM agents are just the staff marked agent:true, not a separate hardcoded list. */
  var STAFF_KEY = 'palmas_staff';
  var STAFF_REMOVED_KEY = 'palmas_staff_removed';
  var SEED_STAFF = [];
  function allStaff() {
    var removed = local(STAFF_REMOVED_KEY, []);
    var added = local(STAFF_KEY, []);
    var base = SEED_STAFF.filter(function (s) { return removed.indexOf(s.id) === -1; });
    var addedFull = added.map(function (x) { return Object.assign({ agent: false, color: '#f68743', status: 'full' }, x, { custom: true }); });
    return base.concat(addedFull);
  }
  var StaffAdmin = {
    list: allStaff,
    agents: function () { return allStaff().filter(function (s) { return s.agent; }); },
    add: function (data) {
      var id = data.id || ('st' + Date.now());
      var rec = Object.assign({ agent: false, color: '#f68743', status: 'full' }, data, { id: id, custom: true });
      var arr = local(STAFF_KEY, []);
      arr.push(rec); save(STAFF_KEY, arr);
      return rec;
    },
    remove: function (id) {
      var arr = local(STAFF_KEY, []);
      if (arr.some(function (x) { return x.id === id; })) {
        save(STAFF_KEY, arr.filter(function (x) { return x.id !== id; }));
        return;
      }
      var removed = local(STAFF_REMOVED_KEY, []);
      if (removed.indexOf(id) === -1) { removed.push(id); save(STAFF_REMOVED_KEY, removed); }
    }
  };

  /* -------------------------------------------------------------- المقارنة
     العقارات التي اختارها الزائر ليقارنها جنباً إلى جنب — بلا حساب، على جهازه.
     كل تغيير يطلق حدث palmas:compare فيتحدّث الشريط العائم وأزرار البطاقات. */
  var COMPARE_KEY = 'palmas_compare';
  var COMPARE_MAX = 4;
  function cmpEmit(list) {
    try { w.dispatchEvent(new CustomEvent('palmas:compare', { detail: list.slice() })); } catch (e) {}
  }
  var Compare = {
    MAX: COMPARE_MAX,
    list: function () { var l = local(COMPARE_KEY, []); return Array.isArray(l) ? l : []; },
    has: function (id) { return Compare.list().indexOf(id) !== -1; },
    add: function (id) {
      var l = Compare.list();
      if (l.indexOf(id) !== -1) return { ok: true, added: false, list: l };
      if (l.length >= COMPARE_MAX) return { ok: false, full: true, list: l };
      l.push(id); save(COMPARE_KEY, l); cmpEmit(l);
      return { ok: true, added: true, list: l };
    },
    remove: function (id) {
      var l = Compare.list().filter(function (x) { return x !== id; });
      save(COMPARE_KEY, l); cmpEmit(l);
      return l;
    },
    toggle: function (id) {
      return Compare.has(id) ? { ok: true, added: false, list: Compare.remove(id) } : Compare.add(id);
    },
    /** نفس toggle مع رسالة قصيرة تختفي وحدها — بدل شريط ثابت يغطّي الصفحة */
    toggleAndNotify: function (id, lang) {
      var en = lang === 'en';
      var r = Compare.toggle(id);
      var n = r.list.length;
      if (r.full) toast(en ? 'You can compare up to ' + COMPARE_MAX + ' properties' : 'يمكنك مقارنة ' + COMPARE_MAX + ' عقارات كحد أقصى');
      else if (r.added) toast(en ? 'Added to comparison (' + n + ' of ' + COMPARE_MAX + ')' + (n > 1 ? ' — compare them from the Properties page' : '')
                                 : 'أُضيف للمقارنة (' + n + ' من ' + COMPARE_MAX + ')' + (n > 1 ? ' — قارنها من صفحة العقارات' : ''));
      else toast(en ? 'Removed from comparison' : 'أُزيل من المقارنة');
      return r;
    },
    clear: function () { save(COMPARE_KEY, []); cmpEmit([]); },
    /** لرابط مقارنة مُشارَك: يستبدل القائمة بالمعرّفات الواردة */
    set: function (ids) {
      var l = (ids || []).filter(function (x, i, a) { return x && a.indexOf(x) === i; }).slice(0, COMPARE_MAX);
      save(COMPARE_KEY, l); cmpEmit(l);
      return l;
    },

    /**
     * أفضل قيمة في كل بند، لتُبرز في جدول المقارنة. يُرجع { بند: [معرّفات] }.
     * السعر وسعر المتر يُقارنان بالدولار، وفقط إن كانت كل العقارات من نفس نوع
     * العرض — إيجار شهري مقابل سعر بيع لا يُقارن. البند المتساوي عند الجميع
     * لا يُبرز أحداً.
     */
    best: function (props) {
      var out = {};
      if (!props || props.length < 2) return out;
      var sameOffer = props.every(function (x) { return x.offer === props[0].offer; });
      function pick(key, val, better) {
        var vals = props.map(function (x) { var v = val(x); return (v == null || isNaN(v) || v <= 0) ? null : v; });
        var real = vals.filter(function (v) { return v != null; });
        if (real.length < 2) return;
        var target = better === 'min' ? Math.min.apply(null, real) : Math.max.apply(null, real);
        if (real.every(function (v) { return v === target; })) return;
        out[key] = props.filter(function (x, i) { return vals[i] === target; }).map(function (x) { return x.id; });
      }
      if (sameOffer) {
        pick('price', function (x) { return priceUsd(x); }, 'min');
        pick('ppsqm', function (x) { return x.area > 0 ? priceUsd(x) / x.area : null; }, 'min');
      }
      pick('area', function (x) { return x.area; }, 'max');
      pick('rooms', function (x) { return x.rooms; }, 'max');
      pick('baths', function (x) { return x.baths; }, 'max');
      pick('year', function (x) { return x.year; }, 'max');
      return out;
    }
  };

  /* --------------------------------------------------------- محتوى الموقع
     ما يعدّله الأدمن ويعرضه الموقع: أرقام إضافية، آراء العملاء، روابط
     التواصل والمتاجر. get() متزامن للصفحات؛ الجسر يزرع فيه نسخة السيرفر. */
  var SITE_KEY = 'palmas_site';
  var SITE_SOCIALS = ['facebook', 'instagram', 'tiktok', 'youtube', 'x', 'linkedin'];
  function siteMerge(v) {
    v = v || {};
    var social = {};
    SITE_SOCIALS.forEach(function (k) { social[k] = ((v.social || {})[k] || '').trim(); });
    return {
      stats: { clients: String((v.stats || {}).clients || '').trim(), years: String((v.stats || {}).years || '').trim() },
      testimonials: (Array.isArray(v.testimonials) ? v.testimonials : []).filter(function (x) { return x && x.name && x.quote; }),
      social: social,
      apps: { ios: ((v.apps || {}).ios || '').trim(), android: ((v.apps || {}).android || '').trim() }
    };
  }
  var siteCache = null;
  var Site = {
    SOCIALS: SITE_SOCIALS,
    get: function () { if (!siteCache) siteCache = siteMerge(local(SITE_KEY, null)); return siteCache; },
    set: function (v) { siteCache = siteMerge(v); return siteCache; },
    save: function (v) { siteCache = siteMerge(v); save(SITE_KEY, siteCache); return Promise.resolve(siteCache); }
  };

  /* ------------------------------------------------ المالكون وعقود الوساطة
     صاحب العقار: شخص أو شركة، وعقد يربطه بعقار معروض (نوع الصفقة، العمولة،
     مدّة التفويض). هذه النسخة المحلية؛ جسر السيرفر يستبدل Owners و Contracts
     بنسخة قاعدة البيانات بنفس الأسماء. الواجهة async دائماً لهذا السبب. */
  var OWNERS_KEY = 'palmas_owners';
  var CONTRACTS_KEY = 'palmas_contracts';
  var CONTRACT_STATUSES = ['active', 'sold', 'rented', 'expired', 'cancelled'];
  function newId(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function today() { return new Date().toISOString().slice(0, 10); }

  var OWNER_BLANK = { kind: 'person', name: '', company: '', phone: '', phone2: '', email: '',
    idNumber: '', city: '', notes: '', listingId: null };
  var CONTRACT_BLANK = { ownerId: '', propId: null, deal: 'sale', exclusive: false,
    askingPrice: 0, minPrice: null, currency: 'usd', commissionType: 'percent', commissionValue: 2,
    startDate: '', endDate: '', status: 'active', closedPrice: null, closedOn: null, notes: '' };

  var Owners = {
    list: function () { return Promise.resolve(local(OWNERS_KEY, [])); },
    save: function (o) {
      var arr = local(OWNERS_KEY, []);
      var rec;
      if (o.id && arr.some(function (x) { return x.id === o.id; })) {
        arr = arr.map(function (x) { return x.id === o.id ? (rec = Object.assign({}, x, o)) : x; });
      } else {
        rec = Object.assign({}, OWNER_BLANK, o, { id: newId('ow'), createdAt: new Date().toISOString() });
        arr.unshift(rec);
      }
      save(OWNERS_KEY, arr);
      return Promise.resolve(rec);
    },
    remove: function (id) {
      save(OWNERS_KEY, local(OWNERS_KEY, []).filter(function (x) { return x.id !== id; }));
      save(CONTRACTS_KEY, local(CONTRACTS_KEY, []).filter(function (c) { return c.ownerId !== id; }));
      return Promise.resolve(true);
    }
  };

  var Contracts = {
    list: function () { return Promise.resolve(local(CONTRACTS_KEY, [])); },
    save: function (c) {
      var arr = local(CONTRACTS_KEY, []);
      var rec;
      if (c.id && arr.some(function (x) { return x.id === c.id; })) {
        arr = arr.map(function (x) { return x.id === c.id ? (rec = Object.assign({}, x, c)) : x; });
      } else {
        rec = Object.assign({}, CONTRACT_BLANK, { startDate: today() }, c,
          { id: newId('ct'), createdAt: new Date().toISOString() });
        arr.unshift(rec);
      }
      save(CONTRACTS_KEY, arr);
      return Promise.resolve(rec);
    },
    remove: function (id) {
      save(CONTRACTS_KEY, local(CONTRACTS_KEY, []).filter(function (x) { return x.id !== id; }));
      return Promise.resolve(true);
    },

    STATUSES: CONTRACT_STATUSES,

    /** العمولة المستحقة: من سعر الإغلاق إن وُجد، وإلا تقديرية من السعر المطلوب */
    commission: function (c) {
      if (c.commissionType === 'fixed') return Number(c.commissionValue) || 0;
      var base = Number(c.closedPrice) || Number(c.askingPrice) || 0;
      return Math.round(base * (Number(c.commissionValue) || 0)) / 100;
    },

    /** حالة العرض: النشط الذي انتهت مدّته يظهر "منتهي"، وما بقي له أسبوعان "ينتهي قريباً" */
    effectiveStatus: function (c) {
      if (c.status !== 'active' || !c.endDate) return c.status;
      var days = Math.floor((new Date(c.endDate) - new Date(today())) / 86400000);
      if (days < 0) return 'expired';
      if (days <= 14) return 'expiring';
      return 'active';
    }
  };

  /* -------------------------------------------------------------- CRM leads
     one lead-normalization engine shared by CRM.dc.html (kanban/contacts/inbox/tasks) and
     ERP.dc.html (finance-facing deals view) — both call buildLeads() and read/write the
     same palmas_crm_leads overlay via mutate(), so a stage/value change in either place
     is the exact same lead everywhere, not two parallel pipelines. */
  var CRM_LEADS_KEY = 'palmas_crm_leads';
  /* لا عملاء مُفترَضين: كان هنا خمسة عملاء بمراحل صفقات وقيم مكتوبة يدوياً
     ($450K مغلقة، $380K قيد التفاوض…) تظهر في CRM وكأنها حقيقية. العملاء
     الآن يأتون من قاعدة البيانات وحدها — حسابات وحجوزات ورسائل وطلبات. */
  var CRM_SEED_USERS = [];
  var CRM_SEED_OVERLAY = {};
  function crmStages(lang) {
    var ar = lang !== 'en';
    return [
      { id: 'new', color: '#4aa8d8', label: ar ? 'جديد' : 'New' },
      { id: 'contacted', color: '#f68743', label: ar ? 'تم التواصل' : 'Contacted' },
      { id: 'interested', color: '#a06fe0', label: ar ? 'مهتم' : 'Interested' },
      { id: 'visit', color: '#e0a800', label: ar ? 'زيارة مجدولة' : 'Visit scheduled' },
      { id: 'negotiation', color: '#e06f9c', label: ar ? 'قيد التفاوض' : 'Negotiating' },
      { id: 'won', color: '#1f9d5c', label: ar ? 'مغلق — ناجح' : 'Won' },
      { id: 'lost', color: '#e0245e', label: ar ? 'مغلق — خاسر' : 'Lost' }
    ];
  }
  function crmSourceMeta(lang, src) {
    var ar = lang !== 'en';
    var m = {
      user: { label: ar ? 'حساب مسجّل' : 'Registered', color: '#4aa8d8', glyph: '👤' },
      booking: { label: ar ? 'حجز معاينة' : 'Booking', color: '#e0a800', glyph: '📅' },
      message: { label: ar ? 'نموذج تواصل' : 'Contact form', color: '#a06fe0', glyph: '✉' },
      chat: { label: ar ? 'شات حيّ' : 'Live chat', color: '#1f9d5c', glyph: '💬' },
      wishlist: { label: ar ? 'قائمة رغبات' : 'Wishlist', color: '#e0245e', glyph: '♥' },
      projfav: { label: ar ? 'مهتم بمشروع' : 'Interested in a project', color: '#a97fe0', glyph: '🏗' },
      listing: { label: ar ? 'طلب عرض عقار' : 'Listing request', color: '#0ea5a5', glyph: '🏠' },
      manual: { label: ar ? 'إدخال يدوي' : 'Manual', color: '#f68743', glyph: '✎' }
    };
    return m[src] || m.manual;
  }
  /* CRM/ERP keep one ledger in USD (that's what every $-formatted KPI, pipeline
     total and 2.5% commission assumes) — so a lead's deal value is always seeded
     from the property's USD-equivalent price, never its raw native-currency number. */
  function crmPriceOf(name) {
    if (!name) return 0;
    var p = catalog().filter(function (x) { return x.name.ar === name || x.name.en === name; })[0];
    return p ? priceUsd(p) : 0;
  }
  function crmBuildBase(lang, data) {
    var ar = lang !== 'en';
    var leads = [], seen = {};
    function push(l) { if (seen[l.key]) return; seen[l.key] = 1; leads.push(l); }
    var users = data.users || [], bookings = data.bookings || [], messages = data.messages || [],
      chats = data.chats || [], manual = data.manual || [], listings = data.listings || [],
      favMap = data.favMap || {}, projFavMap = data.projFavMap || {}, session = data.session;
    CRM_SEED_USERS.concat(users.map(function (u) { return Object.assign({}, u, { reg: true }); })).forEach(function (u) {
      if (!u || !u.email) return;
      var ts = u.joined ? new Date(u.joined).getTime() : Date.now();
      push({ key: 'u:' + u.email, name: u.name || u.email.split('@')[0], phone: u.phone || '', email: u.email, source: 'user', createdAt: ts,
        baseEvents: [{ type: 'source', text: (ar ? 'أنشأ حساباً على الموقع' : 'Created an account'), ts: ts }] });
    });
    bookings.forEach(function (b, i) {
      var ts = b.ts || Date.now() - i * 3600000;
      var when = (b.dow || '') + ' ' + (b.dateNum || b.date || '') + ' — ' + (b.time || '');
      push({ key: 'b:' + (b.phone || i) + ':' + (b.pid || i), name: b.name || (ar ? 'زبون' : 'Client'), phone: b.phone || '', email: '', source: 'booking', createdAt: ts,
        propId: b.pid || '', propName: b.pname || b.pid, propPrice: crmPriceOf(b.pname), bookingStatus: b.status || 'pending',
        baseEvents: [{ type: 'source', text: (ar ? 'حجز معاينة: ' : 'Booked a viewing: ') + (b.pname || '') + ' · ' + when, ts: ts }] });
    });
    messages.forEach(function (m, i) {
      var ts = m.ts || Date.now() - i * 3600000;
      push({ key: 'm:' + (m.id || i), name: m.name || (ar ? 'زائر' : 'Visitor'), phone: m.phone || '', email: '', source: 'message', createdAt: ts,
        baseEvents: [{ type: 'source', text: (ar ? 'أرسل عبر نموذج تواصل: ' : 'Sent via contact form: ') + (m.msg || '').slice(0, 90), ts: ts }] });
    });
    chats.forEach(function (c, i) {
      var ts = c.createdAt || Date.now() - i * 3600000;
      var first = (c.messages || [])[0];
      push({ key: 'c:' + (c.id || i), name: c.name || (ar ? 'زائر الشات' : 'Chat visitor'), phone: c.phone || '', email: '', source: 'chat', createdAt: ts, chatId: c.id,
        baseEvents: [{ type: 'source', text: (ar ? 'بدأ محادثة حيّة' : 'Started a live chat') + (first ? (': ' + first.text.slice(0, 80)) : ''), ts: ts }] });
    });
    /* "list your property with us" (SiteHeader's header form) — an owner wanting to sell/rent
       THROUGH Palmas, not a buyer's interest in an existing listing. Kept as its own source
       ('listing') so it's never confused with a buyer lead; the expected price seeds the deal
       value the same way a booking/wishlist lead's propPrice does. */
    listings.forEach(function (x, i) {
      var ts = x.ts || (x.date ? new Date(x.date).getTime() : Date.now() - i * 3600000);
      var priceNum = parseFloat(String(x.price || '').replace(/[^0-9.]/g, '')) || 0;
      var priceUsdVal = priceNum ? toUsd(priceNum, x.currency || 'usd') : 0;
      var dealLabel = x.deal === 'rent' ? (ar ? 'للإيجار' : 'for rent') : (ar ? 'للبيع' : 'for sale');
      var typeLabel = (L[lang] && L[lang].type[x.propType]) || x.propType || '';
      push({ key: 'l:' + (x.id || (x.phone || i) + ':' + i), name: x.name || (ar ? 'مالك عقار' : 'Property owner'), phone: x.phone || '', email: '', source: 'listing', createdAt: ts,
        propPrice: priceUsdVal, listCity: x.city || '', listDeal: x.deal || 'sale', listType: typeLabel, listNotes: x.notes || '',
        baseEvents: [{ type: 'source', text: (ar ? 'طلب عرض عقاره (' : 'Asked to list their property (') + typeLabel + ' ' + dealLabel + ') ' + (ar ? 'عبر بالماس — ' : 'through Palmas — ') + (x.city || '') + (x.notes ? (' · ' + x.notes.slice(0, 80)) : ''), ts: ts }] });
    });
    manual.forEach(function (x, i) {
      var ts = x.ts || Date.now() - i * 3600000;
      push({ key: 'x:' + (x.id || i), name: x.name || (ar ? 'عميل' : 'Lead'), phone: x.phone || '', email: x.email || '', source: 'manual', createdAt: ts,
        propId: x.propId || '', propName: x.propId ? ((propBy(x.propId) || {}).name || {})[lang] : '',
        baseEvents: [{ type: 'source', text: (x.note ? x.note : (ar ? 'أُضيف يدوياً' : 'Added manually')), ts: ts }] });
    });
    /* one wishlist lead per real user with saved properties (palmas_favs is already keyed per user —
       this reads everyone's favourites, not just whoever is currently browsing) */
    var allUsersForMatch = CRM_SEED_USERS.concat(users);
    Object.keys(favMap).forEach(function (userKey) {
      if (userKey === 'guest') return;
      var ids = favMap[userKey] || [];
      if (!ids.length) return;
      var match = allUsersForMatch.filter(function (u) { return u && (u.email === userKey || u.phone === userKey || u.name === userKey); })[0];
      var nm = (match && match.name) || (session && session.email === userKey ? session.name : null) || (ar ? 'زائر مهتم' : 'Interested visitor');
      var em = (match && match.email) || (userKey.indexOf('@') !== -1 ? userKey : '');
      var ph = (match && match.phone) || (userKey.indexOf('@') === -1 ? userKey : '');
      var firstProp = propBy(ids[0]);
      var evs = ids.map(function (pid) { var pr = propBy(pid); return { type: 'source', text: (ar ? 'أضاف للمفضلة: ' : 'Wishlisted: ') + (pr ? pr.name[lang] : pid), ts: Date.now() }; });
      push({ key: 'w:' + userKey, name: nm, phone: ph, email: em, source: 'wishlist', createdAt: Date.now(),
        propId: ids[0], propName: firstProp ? firstProp.name[lang] : '', propPrice: firstProp ? priceUsd(firstProp) : 0, baseEvents: evs });
    });
    /* same idea, but for saved development projects (Projects.dc.html/ProjectDetails.dc.html) —
       a distinct source ('projfav') so it's not confused with individual-property interest,
       reusing the propId/propName/propPrice fields since propBy() safely returns null for a
       project id (so ERP's per-property revenue rollup correctly ignores these, as intended). */
    Object.keys(projFavMap).forEach(function (userKey) {
      if (userKey === 'guest') return;
      var pids = projFavMap[userKey] || [];
      if (!pids.length) return;
      var match = allUsersForMatch.filter(function (u) { return u && (u.email === userKey || u.phone === userKey || u.name === userKey); })[0];
      var nm = (match && match.name) || (session && session.email === userKey ? session.name : null) || (ar ? 'زائر مهتم' : 'Interested visitor');
      var em = (match && match.email) || (userKey.indexOf('@') !== -1 ? userKey : '');
      var ph = (match && match.phone) || (userKey.indexOf('@') === -1 ? userKey : '');
      var firstProj = projectBy(pids[0]);
      var evs2 = pids.map(function (pjid) { var pj = projectBy(pjid); return { type: 'source', text: (ar ? 'أضاف مشروعاً للمفضلة: ' : 'Wishlisted a project: ') + (pj ? pj.name[lang] : pjid), ts: Date.now() }; });
      push({ key: 'pw:' + userKey, name: nm, phone: ph, email: em, source: 'projfav', createdAt: Date.now(),
        propId: pids[0], propName: firstProj ? firstProj.name[lang] : '', propPrice: firstProj ? toUsd(firstProj.price, firstProj.currency || 'usd') : 0, baseEvents: evs2 });
    });
    return leads;
  }
  function crmBuildLeads(lang, data) {
    var overlay = data.overlay || {};
    return crmBuildBase(lang, data).map(function (l) {
      var raw = overlay[l.key] || {};
      var sd = CRM_SEED_OVERLAY[l.key] || {};
      var stage = raw.stage || sd.stage || 'new';
      var agent = raw.agent != null ? raw.agent : (sd.agent != null ? sd.agent : '');
      var value = raw.value != null ? raw.value : (sd.value != null ? sd.value : (l.propPrice || 0));
      return Object.assign({}, l, { stage: stage, agent: agent, value: +value || 0, notes: raw.notes || [], log: raw.log || [], tasks: raw.tasks || [], hidden: !!raw.hidden });
    }).filter(function (l) { return !l.hidden; });
  }
  function crmTimeAgo(ts, lang) {
    if (!ts) return '';
    var ar = lang !== 'en';
    var s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 60) return ar ? 'الآن' : 'now';
    var m = Math.floor(s / 60); if (m < 60) return ar ? ('قبل ' + m + ' د') : (m + 'm');
    var h = Math.floor(m / 60); if (h < 24) return ar ? ('قبل ' + h + ' س') : (h + 'h');
    var d = Math.floor(h / 24); if (d < 30) return ar ? ('قبل ' + d + ' ي') : (d + 'd');
    return new Date(ts).toISOString().slice(0, 10);
  }
  function crmInitial(n) { return (String(n || '?').trim().charAt(0)) || '?'; }
  function crmAvatarColor(i) { return ['#f68743', '#4aa8d8', '#a06fe0', '#e0a800', '#1f9d5c', '#e06f9c'][((i % 6) + 6) % 6]; }
  function crmMutate(key, fn) {
    var ov = local(CRM_LEADS_KEY, {});
    ov = Object.assign({}, ov);
    ov[key] = fn(Object.assign({}, ov[key] || {}));
    save(CRM_LEADS_KEY, ov);
    return ov;
  }
  var CRM = {
    stages: crmStages, sourceMeta: crmSourceMeta, seedUsers: function () { return CRM_SEED_USERS.slice(); },
    buildLeads: crmBuildLeads, timeAgo: crmTimeAgo, initial: crmInitial, avatarColor: crmAvatarColor,
    mutate: crmMutate, overlay: function () { return local(CRM_LEADS_KEY, {}); }
  };

  /* ---------------------------------------------------------- filter logic */
  function defaultFilters() {
    return { country: 'all', city: 'all', offer: 'all', type: 'all', own: 'all', zone: 'all',
      // price bounds are open: the customer types them, and no ceiling means Infinity
      beds: 0, baths: 0, minPrice: 0, maxPrice: Infinity, minArea: 0 };
  }

  function filteredBy(f, list) {
    var src = list || catalog();
    return src.filter(function (x) {
      if (f.type !== 'all' && x.type !== f.type) return false;

      if (f.offer === 'landOffer') { if (x.type !== 'land') return false; }
      else if (f.offer !== 'all' && x.offer !== f.offer) return false;

      if (f.own !== 'all' && (x.ownership || 'tabu') !== f.own) return false;
      if (f.zone !== 'all' && (x.zone || '') !== f.zone) return false;

      if (f.country !== 'all' && x.country !== f.country) return false;
      if (f.city !== 'all' && x.cityKey !== f.city) return false;

      if (f.beds > 0 && (x.rooms || 0) < f.beds) return false;
      if (f.baths > 0 && (x.baths || 0) < f.baths) return false;

      // min/max price filters are USD-denominated (the slider), so non-USD listings
      // are converted before comparing — a 100,000 JOD property is not the same as $100,000
      // Both price bounds apply to sale + residential only. A monthly rent lives on a
      // different scale than a sale price, so comparing "from 200,000" against a
      // $650/month flat would silently wipe out every rental.
      var xPriceUsd = priceUsd(x);
      var pricedBySale = (x.offer === 'sale' || x.offer === 'residential');
      if (pricedBySale) {
        if (f.minPrice > 0 && xPriceUsd < f.minPrice) return false;
        if (xPriceUsd > f.maxPrice) return false;
      }

      if (f.minArea > 0 && x.area < f.minArea) return false;
      return true;
    });
  }

  function searchIn(list, q, lang) {
    var s = (q || '').trim().toLowerCase();
    if (!s) return list;
    return list.filter(function (x) {
      return (x.name[lang] + ' ' + x.loc[lang]).toLowerCase().indexOf(s) !== -1;
    });
  }

  function sortList(list, key) {
    var out = list.slice();
    // compare on the USD-normalised price so mixed-currency listings sort correctly
    if (key === 'priceAsc') out.sort(function (a, b) { return priceUsd(a) - priceUsd(b); });
    else if (key === 'priceDesc') out.sort(function (a, b) { return priceUsd(b) - priceUsd(a); });
    else if (key === 'areaDesc') out.sort(function (a, b) { return b.area - a.area; });
    return out;
  }

  function hasFilters(f, q) {
    return f.type !== 'all' || f.offer !== 'all' || f.own !== 'all' || f.zone !== 'all' ||
      f.beds > 0 || f.baths > 0 || f.minPrice > 0 || isFinite(f.maxPrice) ||
      f.country !== 'all' || f.city !== 'all' || f.minArea > 0 || !!(q || '').trim();
  }

  /* field visibility — verbatim from the app */
  // picking a city only makes sense once a country narrows the list down
  function showCity(f) { return f.country !== 'all'; }
  function showBeds(f) { return ['apartment', 'villa', 'house', 'studio'].indexOf(f.type) !== -1 && f.offer !== 'landOffer'; }
  function showOwn(f) { return f.offer !== 'rent' && f.offer !== 'residential'; }
  function showZone(f) { return f.country === 'ps' && (f.type === 'land' || f.offer === 'landOffer'); }

  /* --------------------------------------------------------------- format */
  /* -------------------------------------------------------------- currency
     every property carries its own currency (usd/ils/jod). Exchange rates
     are "units of that currency per 1 USD" — editable by the admin (Admin.dc.html
     "Currencies" panel) and persisted as an overlay on top of sane defaults, so
     everything (filters, sorting, CRM deal values, ERP KPIs) can convert to a
     common ledger currency (USD) while every price still *displays* in its own
     native currency. */
  var CUR_RATES_KEY = 'palmas_currency_rates';
  var CUR_DEFAULT_RATES = { usd: 1, ils: 3.65, jod: 0.709, aed: 3.67 }; // units of currency per 1 USD
  var CURRENCIES = [
    { id: 'usd', symbol: '$', pos: 'prefix', ar: 'دولار أمريكي', en: 'US Dollar', shortAr: 'دولار', shortEn: 'USD' },
    { id: 'ils', symbol: '₪', pos: 'suffix', ar: 'شيكل إسرائيلي', en: 'Israeli Shekel', shortAr: 'شيكل', shortEn: 'ILS' },
    { id: 'jod', symbol: 'د.أ', pos: 'suffix', ar: 'دينار أردني', en: 'Jordanian Dinar', shortAr: 'دينار', shortEn: 'JOD' },
    { id: 'aed', symbol: 'د.إ', pos: 'suffix', ar: 'درهم إماراتي', en: 'UAE Dirham', shortAr: 'درهم', shortEn: 'AED' }
  ];
  function curMeta(id) { var c = CURRENCIES.filter(function (x) { return x.id === id; })[0]; return c || CURRENCIES[0]; }
  function curRates() {
    var stored = local(CUR_RATES_KEY, {});
    var out = {};
    CURRENCIES.forEach(function (c) { out[c.id] = (stored[c.id] > 0) ? stored[c.id] : CUR_DEFAULT_RATES[c.id]; });
    return out;
  }
  function curSetRate(id, val) {
    var rates = curRates();
    var n = +val;
    rates[id] = (n > 0) ? n : (CUR_DEFAULT_RATES[id] || 1);
    save(CUR_RATES_KEY, rates);
    return rates;
  }
  function curResetRates() { try { localStorage.removeItem(CUR_RATES_KEY); } catch (e) {} return curRates(); }
  function toUsd(amount, cur) { var r = curRates()[cur] || 1; return (Number(amount) || 0) / r; }
  function fromUsd(amountUsd, cur) { var r = curRates()[cur] || 1; return (Number(amountUsd) || 0) * r; }
  function convertCur(amount, fromCur, toCur) {
    if ((fromCur || 'usd') === (toCur || 'usd')) return Number(amount) || 0;
    return fromUsd(toUsd(amount, fromCur || 'usd'), toCur || 'usd');
  }
  /* every property/amount is priced in its own currency (defaults to USD) —
     the "per month" suffix on rentals is localised the same as before. */
  function money(n, offer, lang, currency) {
    var meta = curMeta(currency || 'usd');
    var num = Number(n || 0).toLocaleString('en-US');
    var s = meta.pos === 'suffix' ? num + ' ' + meta.symbol : meta.symbol + num;
    if (offer !== 'rent') return s;
    return lang === 'en' ? s + '/mo' : s + ' /شهر';
  }
  function price(prop, lang) { return money(prop.price, prop.offer, lang, prop.currency); }
  /* plain amount formatter (no rent "/mo" suffix) — for ERP amounts, exchange-rate
     previews, or any figure that isn't a property's own listing price. */
  function curFormat(amount, currency, lang) { return money(amount, null, lang, currency); }
  /* USD-normalised price — used internally for filtering/sorting/comparing
     properties that are not all priced in the same currency. */
  function priceUsd(prop) { return toUsd(prop.price, prop.currency || 'usd'); }

  /* ---------------------------------------------------- visitor display currency
     a customer-facing preference only (like palmas_lang/palmas_theme) — does NOT
     touch a property's real listing currency, which stays the source of truth for
     the admin catalog, CRM deal values and the ERP USD ledger. Until the visitor
     picks one, every price still shows in that property's own native currency
     (no guessing/geo-detection); once picked, every price on the site converts
     to it and the choice is remembered for next time. */
  var VIEW_CUR_KEY = 'palmas_view_currency';
  function viewCurrency() {
    var v = null;
    try { v = localStorage.getItem(VIEW_CUR_KEY); } catch (e) {}
    return (v && CURRENCIES.some(function (c) { return c.id === v; })) ? v : null;
  }
  function setViewCurrency(id) {
    try {
      if (!id || id === 'auto') localStorage.removeItem(VIEW_CUR_KEY);
      else localStorage.setItem(VIEW_CUR_KEY, id);
    } catch (e) {}
  }
  /* what a customer should actually see: the visitor's chosen currency if they set
     one, converted from the property's real price — otherwise the native price. */
  function displayPrice(prop, lang) {
    var pref = viewCurrency();
    if (!pref || pref === (prop.currency || 'usd')) return price(prop, lang);
    var converted = convertCur(prop.price, prop.currency || 'usd', pref);
    return money(converted, prop.offer, lang, pref);
  }

  function citiesOf(countryKey) {
    return countryKey && countryKey !== 'all' ? CITIES.filter(function (c) { return c.c === countryKey; }) : CITIES.slice();
  }
  function cityBy(k) { return CITIES.filter(function (c) { return c.k === k; })[0] || null; }
  function countryBy(k) { return COUNTRIES.filter(function (c) { return c.k === k; })[0] || null; }
  function propBy(id) { return catalog().filter(function (x) { return x.id === id; })[0] || null; }

  /* ------------------------------------------------------------- services */
  function jsonFetch(path, opts) {
    return fetch(BASE_URL + path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts || {}))
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
  function local(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
  function delay(val, ms) { return new Promise(function (r) { setTimeout(function () { r(val); }, ms || 220); }); }

  var SESSION_KEY = 'palmas_session';
  var FAV_KEY = 'palmas_favs';
  var PROJ_FAV_KEY = 'palmas_wishlist_projects';   // per-user, same shape/pattern as FAV_KEY but for development projects
  var USERS_KEY = 'palmas_users';           // real, persisted account directory (name/email/phone/password)
  /* لا حساب أدمن مكتوب في الكود: هذا الملف يصل متصفّح كل زائر، فأي بريد وكلمة
     سر هنا مكشوفة للجميع. الأدمن يدخل عبر السيرفر (Supabase + سياسات RLS)
     وحده. في الوضع المحلي بلا سيرفر لا يوجد أدمن إلا من ضبطه على جهازه. */
  var ADMIN_CRED_KEY = 'palmas_admin_cred';
  var listeners = [];
  function emit() { listeners.forEach(function (fn) { try { fn(API.session()); } catch (e) {} }); }
  function adminCreds() {
    var o = local(ADMIN_CRED_KEY, {});
    return { email: o.email || null, password: o.password || null };
  }
  /* looks a user up by email OR phone — whichever the identifier matches */
  function findUserRecord(identifier) {
    if (!identifier) return null;
    var users = local(USERS_KEY, []);
    return users.filter(function (u) { return (u.email && u.email === identifier) || (u.phone && u.phone === identifier); })[0] || null;
  }
  function upsertUserRecord(rec) {
    var users = local(USERS_KEY, []);
    var idx = -1;
    for (var i = 0; i < users.length; i++) {
      if ((rec.email && users[i].email === rec.email) || (rec.phone && users[i].phone === rec.phone)) { idx = i; break; }
    }
    if (idx !== -1) users[idx] = Object.assign({}, users[idx], rec); else users.push(rec);
    save(USERS_KEY, users);
    return idx !== -1 ? users[idx] : rec;
  }
  /* like upsertUserRecord, but finds the row by its CURRENT identity before applying the patch —
     needed for profile edits, where the patch itself may be changing the very email/phone that
     upsertUserRecord would otherwise have matched on (which would silently orphan the old row). */
  function updateUserRecordByIdentity(oldIdentifier, patch) {
    var users = local(USERS_KEY, []);
    var idx = -1;
    for (var i = 0; i < users.length; i++) {
      if ((users[i].email && users[i].email === oldIdentifier) || (users[i].phone && users[i].phone === oldIdentifier)) { idx = i; break; }
    }
    var rec;
    if (idx !== -1) { rec = Object.assign({}, users[idx], patch); users[idx] = rec; }
    else { rec = Object.assign({ name: '', email: '', phone: '', password: '', joined: new Date().toISOString().slice(0, 10) }, patch); users.push(rec); }
    save(USERS_KEY, users);
    return rec;
  }

  var API = {
    baseUrl: BASE_URL,
    useRemote: USE_REMOTE,

    /* --- properties --- */
    listProperties: function (params) {
      if (this.useRemote) return jsonFetch('/properties?' + new URLSearchParams(params || {}));
      return delay(catalog(), 0);
    },
    getProperty: function (id) {
      if (this.useRemote) return jsonFetch('/properties/' + encodeURIComponent(id));
      return delay(propBy(id), 0);
    },

    /* --- auth --- */
    /* "remember me" checked (or signup, which has no such control) -> localStorage, persists across browser restarts.
       unchecked at login -> sessionStorage only, cleared when the tab closes. */
    session: function () {
      var s = local(SESSION_KEY, null);
      if (s) return s;
      try { var raw = sessionStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
    },
    isAuthed: function () { var s = this.session(); return !!(s && s.loggedIn); },
    onAuthChange: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; },

    signIn: function (payload) {   // { identifier, password, method, remember }
      if (this.useRemote) return jsonFetch('/auth/login', { method: 'POST', body: JSON.stringify(payload) }).then(function (r) { return this._store(r, payload.remember); }.bind(this));
      var id = (payload.identifier || '').trim();
      var isMail = id.indexOf('@') > -1;
      var ac = adminCreds();
      if (isMail && id === ac.email) {
        if (payload.password !== ac.password) return Promise.reject(new Error('BAD_PASSWORD'));
        return delay(this._store({ user: { name: 'Palmas Admin', email: ac.email, phone: '', role: 'admin' } }, payload.remember));
      }
      var rec = findUserRecord(id);
      if (rec) {
        // a real, previously-registered account — the password now actually has to match
        if (payload.password !== rec.password) return Promise.reject(new Error('BAD_PASSWORD'));
        return delay(this._store({ user: { name: rec.name, email: rec.email || '', phone: rec.phone || '', role: 'user' } }, payload.remember));
      }
      // no account on file yet: keep the prototype's lenient "signing in also registers you" behaviour,
      // but now it's a real, persisted record from this point on (so "change password" later means something).
      var name = payload.name || (isMail ? id.split('@')[0] : id);
      var nrec = upsertUserRecord({ name: name, email: isMail ? id : '', phone: isMail ? '' : id, password: payload.password || '', joined: new Date().toISOString().slice(0, 10) });
      return delay(this._store({ user: { name: nrec.name, email: nrec.email || '', phone: nrec.phone || '', role: 'user' } }, payload.remember));
    },
    signUp: function (payload) {   // { name, identifier, password, method } — signup has no "remember me" control, so it always persists
      if (this.useRemote) return jsonFetch('/auth/register', { method: 'POST', body: JSON.stringify(payload) }).then(function (r) { return this._store(r, true); }.bind(this));
      var id = (payload.identifier || '').trim();
      var isMail = id.indexOf('@') > -1;
      var rec = upsertUserRecord({ name: payload.name || (isMail ? id.split('@')[0] : id), email: isMail ? id : '', phone: isMail ? '' : id, password: payload.password || '', joined: new Date().toISOString().slice(0, 10) });
      return delay(this._store({ user: { name: rec.name, email: rec.email || '', phone: rec.phone || '', role: 'user' } }, true));
    },
    signOut: function () {
      try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
      try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
      emit();
      return Promise.resolve(true);
    },
    findAccount: function (payload) {   // forgot step 1 — now checks the real directory instead of always succeeding
      if (this.useRemote) return jsonFetch('/auth/forgot', { method: 'POST', body: JSON.stringify(payload) });
      var id = (payload.identifier || '').trim();
      var ac = adminCreds();
      if (id && (id === ac.email || findUserRecord(id))) return delay({ ok: true, masked: id });
      return Promise.reject(new Error('NOT_FOUND'));
    },
    requestOtp: function (payload) {
      if (this.useRemote) return jsonFetch('/auth/otp/request', { method: 'POST', body: JSON.stringify(payload) });
      return delay({ ok: true, ttl: 45 });
    },
    verifyOtp: function (payload) {     // { identifier, code }
      if (this.useRemote) return jsonFetch('/auth/otp/verify', { method: 'POST', body: JSON.stringify(payload) });
      return delay({ ok: (payload.code || '').length === 6 });
    },
    resetPassword: function (payload) {   // now actually persists the new password
      if (this.useRemote) return jsonFetch('/auth/reset', { method: 'POST', body: JSON.stringify(payload) });
      var id = (payload.identifier || '').trim();
      var ac = adminCreds();
      if (id === ac.email) { save(ADMIN_CRED_KEY, { email: ac.email, password: payload.password }); return delay({ ok: true }); }
      var rec = findUserRecord(id);
      if (!rec) return Promise.reject(new Error('NOT_FOUND'));
      upsertUserRecord(Object.assign({}, rec, { password: payload.password }));
      return delay({ ok: true });
    },
    /* establishes a real session right after a successful OTP verification, with no password
       check — the OTP itself is what proved this identifier belongs to the visitor. Used by the
       forgot-password flow to sign the visitor in and hand them off to the account settings page,
       where they set their new password the same way they normally would. */
    signInAfterOtp: function (identifier) {
      if (this.useRemote) return jsonFetch('/auth/otp/session', { method: 'POST', body: JSON.stringify({ identifier: identifier }) }).then(function (r) { return this._store(r, true); }.bind(this));
      var id = (identifier || '').trim();
      var isMail = id.indexOf('@') > -1;
      var ac = adminCreds();
      if (isMail && id === ac.email) return delay(this._store({ user: { name: 'Palmas Admin', email: ac.email, phone: '', role: 'admin' } }, true));
      var rec = findUserRecord(id);
      if (!rec) return Promise.reject(new Error('NOT_FOUND'));
      return delay(this._store({ user: { name: rec.name, email: rec.email || '', phone: rec.phone || '', role: 'user' } }, true));
    },

    /* --- account settings (logged-in self-service) --- */
    /* patch: { name?, email?, phone? } — keeps the session, the user directory record, this
       visitor's favourites list and their past bookings all pointing at the same identity even
       if they change the email/phone that identity is keyed by. */
    updateProfile: function (patch) {
      var s = this.session();
      if (!s || !s.loggedIn) return Promise.reject(new Error('AUTH_REQUIRED'));
      var oldKey = this._favKey(s);
      var isAdmin = s.role === 'admin';
      var nextUser = Object.assign({}, s.user, patch);
      if (isAdmin) {
        var ac = adminCreds();
        save(ADMIN_CRED_KEY, { email: patch.email || ac.email, password: ac.password });
        nextUser.email = patch.email || ac.email; nextUser.phone = '';
      } else {
        var oldIdentity = (s.user && (s.user.email || s.user.phone)) || '';
        updateUserRecordByIdentity(oldIdentity, patch);
      }
      var news = this._store({ user: nextUser, token: s.token }, s.remember);
      var newKey = this._favKey(news);
      if (newKey !== oldKey) {
        // migrate this visitor's favourites + past booking history to the new identity key
        var favs = local(FAV_KEY, {});
        if (favs[oldKey] && !favs[newKey]) { favs[newKey] = favs[oldKey]; delete favs[oldKey]; save(FAV_KEY, favs); }
        var bookings = local('palmas_bookings', []);
        var touched = false;
        bookings.forEach(function (b) { if (b.by === oldKey) { b.by = newKey; touched = true; } });
        if (touched) save('palmas_bookings', bookings);
      }
      return delay(news);
    },
    /* verifies the current password before writing the new one everywhere it's stored */
    changePassword: function (payload) {   // { currentPassword, newPassword }
      var s = this.session();
      if (!s || !s.loggedIn) return Promise.reject(new Error('AUTH_REQUIRED'));
      if (s.role === 'admin') {
        var ac = adminCreds();
        if (payload.currentPassword !== ac.password) return Promise.reject(new Error('BAD_PASSWORD'));
        save(ADMIN_CRED_KEY, { email: ac.email, password: payload.newPassword });
        return delay({ ok: true });
      }
      var rec = findUserRecord(s.user && (s.user.email || s.user.phone));
      if (!rec) return Promise.reject(new Error('NOT_FOUND'));
      if (payload.currentPassword !== rec.password) return Promise.reject(new Error('BAD_PASSWORD'));
      upsertUserRecord(Object.assign({}, rec, { password: payload.newPassword }));
      return delay({ ok: true });
    },
    _store: function (res, remember) {
      var u = res.user || {};
      /* flat fields kept alongside `user` so older screens reading s.email/s.name keep working */
      var s = { loggedIn: true, user: u, name: u.name || '', email: u.email || '', phone: u.phone || '',
        role: u.role || 'user', token: res.token || null, at: Date.now(), remember: !!remember };
      if (remember) {
        save(SESSION_KEY, s);
        try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
      } else {
        try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) {}
        try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
      }
      emit(); return s;
    },

    /* --- favourites --- */
    favorites: function () {
      var s = this.session();
      if (!s || !s.loggedIn) return [];
      var all = local(FAV_KEY, {});
      return all[this._favKey(s)] || [];
    },
    /* every user's saved list, keyed the same way favorites() keys the current user —
       used by the CRM engine to build one "wishlist" lead per user, not just the current visitor */
    allFavorites: function () { return local(FAV_KEY, {}); },
    isFavorite: function (id) { return this.favorites().indexOf(id) !== -1; },
    toggleFavorite: function (id) {
      var s = this.session();
      if (!s || !s.loggedIn) return Promise.reject(new Error('AUTH_REQUIRED'));
      var all = local(FAV_KEY, {}), key = this._favKey(s), list = all[key] || [];
      var idx = list.indexOf(id), added = idx === -1;
      if (added) list.push(id); else list.splice(idx, 1);
      all[key] = list; save(FAV_KEY, all);
      if (this.useRemote) jsonFetch('/favorites/' + encodeURIComponent(id), { method: added ? 'PUT' : 'DELETE' }).catch(function () {});
      return Promise.resolve({ added: added, list: list.slice() });
    },
    /* --- project favourites (development projects — a separate list from property favourites) --- */
    projectFavorites: function () {
      var s = this.session();
      if (!s || !s.loggedIn) return [];
      var all = local(PROJ_FAV_KEY, {});
      return all[this._favKey(s)] || [];
    },
    allProjectFavorites: function () { return local(PROJ_FAV_KEY, {}); },
    isProjectFavorite: function (id) { return this.projectFavorites().indexOf(id) !== -1; },
    toggleProjectFavorite: function (id) {
      var s = this.session();
      if (!s || !s.loggedIn) return Promise.reject(new Error('AUTH_REQUIRED'));
      var all = local(PROJ_FAV_KEY, {}), key = this._favKey(s), list = all[key] || [];
      var idx = list.indexOf(id), added = idx === -1;
      if (added) list.push(id); else list.splice(idx, 1);
      all[key] = list; save(PROJ_FAV_KEY, all);
      return Promise.resolve({ added: added, list: list.slice() });
    },
    _favKey: function (s) { return (s.user && (s.user.email || s.user.phone || s.user.name)) || 'guest'; }
  };

  /* ------------------------------------------------------------------ toast */
  function toast(msg) {
    var el = document.createElement('div');
    el.textContent = msg;
    el.setAttribute('style', 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(10px);z-index:9999;' +
      'background:#141414;color:#fff;font-family:Cairo,sans-serif;font-weight:700;font-size:14px;padding:12px 22px;' +
      'border-radius:14px;box-shadow:0 14px 40px rgba(0,0,0,.3);opacity:0;transition:opacity .25s ease,transform .25s ease;pointer-events:none');
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.style.opacity = '1'; el.style.transform = 'translateX(-50%) translateY(0)'; });
    setTimeout(function () {
      el.style.opacity = '0'; el.style.transform = 'translateX(-50%) translateY(10px)';
      setTimeout(function () { el.remove(); }, 300);
    }, 2100);
  }

  w.Palmas = {
    LIMITS: LIMITS, COUNTRIES: COUNTRIES, CITIES: CITIES,
    TYPES: TYPES, OFFERS: OFFERS, OWNS: OWNS, ZONES: ZONES, BEDS: BEDS, SORTS: SORTS,
    LABELS: L, PROPERTIES: PROPERTIES, /* base seed only — use allProperties()/API.listProperties() for the live catalog (incl. admin add/edit/delete) */
    allProperties: allProperties, PropsAdmin: PropsAdmin, allStaff: allStaff, StaffAdmin: StaffAdmin, CRM: CRM,
    allProjects: allProjects, ProjectsAdmin: ProjectsAdmin, projectBy: projectBy,
    Owners: Owners, Contracts: Contracts, Site: Site, Compare: Compare,
    /* يستبدلهما جسر السيرفر ببيانات قاعدة البيانات — انظر تعليق catalog أعلاه */
    setCatalog: setCatalog, setProjectCatalog: setProjectCatalog,
    defaultFilters: defaultFilters, filteredBy: filteredBy, searchIn: searchIn, sortList: sortList,
    hasFilters: hasFilters, showCity: showCity, showBeds: showBeds, showOwn: showOwn, showZone: showZone,
    citiesOf: citiesOf, cityBy: cityBy, countryBy: countryBy, propBy: propBy,
    price: price, money: money, priceUsd: priceUsd, displayPrice: displayPrice, markerColor: markerColor,
    CURRENCIES: CURRENCIES,
    Currency: { list: function () { return CURRENCIES.slice(); }, meta: curMeta, rates: curRates, setRate: curSetRate, resetRates: curResetRates,
      toUsd: toUsd, fromUsd: fromUsd, convert: convertCur, format: curFormat,
      viewCurrency: viewCurrency, setViewCurrency: setViewCurrency },
    API: API, toast: toast
  };
})(window);
