/**
 * Palmas — جسر الموقع مع السيرفر.
 *
 * يُحمَّل بعد palmas-core.js مباشرة. الصفحات كلها تنتظر ظهور window.Palmas في حلقة
 * تفقّد، فنستغلّ ذلك: نُخفي الكائن مؤقّتاً، نجلب البيانات من السيرفر، ثم نعيده
 * وقد استُبدلت مصادر بياناته. النتيجة أن أي صفحة تبدأ ومعها بيانات السيرفر
 * جاهزة — بدون تعديل سطر واحد في أي صفحة.
 *
 * التقسيم نفسه المتَّبع في التطبيق:
 *   palmas-core.js  ->  المنطق (فلترة · ترتيب · عملات · تسميات)
 *   هذا الملف       ->  البيانات (عقارات · حسابات · مفضلة)
 *
 * إن تعذّر الوصول للسيرفر يعود الموقع لبيانات النواة المحلية بدل أن يفرغ.
 */
(function () {
  'use strict';

  /* support.js يعيد حقن سكربتات <helmet>، فقد يُنفَّذ هذا الملف أكثر من مرة.
     التركيب مرتين يعني تغليف الدوال مرتين وعميلَين للسيرفر — نمنعه هنا. */
  if (window.__palmasBackendLoaded) return;
  window.__palmasBackendLoaded = true;

  /* نسخة محلية أولاً: شبكة CDN قد تُحجب بإضافات المتصفّح أو تتعذّر بلا إنترنت،
     وهذا الملف جزء من الموقع فلا يعتمد على طرف خارجي. */
  var SDK_LOCAL = 'supabase.js';
  var SDK_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';

  var core = null;
  var cache = {
    props: null, projects: null, rates: null,
    staff: null,        // نافذة agents — عامة، بلا رواتب
    staffFull: null,    // جدول staff كاملاً — للأدمن وحده
    session: null, favs: []
  };
  var listeners = [];
  var sb = null;
  var chatQueue = {};
  /* طلبات Supabase تُرجع الخطأ داخل النتيجة بدل أن ترفض الوعد — فيضيع بصمت */
  function okOrThrow(r) { if (r && r.error) throw r.error; return r; }           // { chatId: وعد آخر رسالة } — يحفظ ترتيب رسائل الشات

  /* نحتفظ بالكتابة الأصلية قبل أي اعتراض: نستعملها لزرع بيانات السيرفر في تخزين
     المتصفّح دون أن يُعاد إرسالها إلى السيرفر من جديد. */
  var nativeSet = window.localStorage.setItem.bind(window.localStorage);

  /* الصفحات لا ترى النواة قبل وصول بيانات السيرفر — انظر ownPalmas.
     والمؤقّت شبكة أمان: لو تعذّر السيرفر لا يبقى الموقع محجوباً إلى الأبد. */
  var revealed = false;
  var revealTimer = null;
  var REVEAL_MS = 2500;

  /**
   * تُطلق مستمعي تغيّر الحساب. الصفحات تربط setState بهذا الحدث، فاستدعاؤه بعد
   * وصول بيانات السيرفر يجعلها تعيد الرسم وتلتقط الكتالوج الجديد.
   */
  function fireAuth() {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](); } catch (e) {}
    }
  }

  /* صف قاعدة البيانات -> الشكل الذي تعرفه الصفحات */
  function toProperty(r) {
    return {
      id: r.id, name: r.name, loc: r.loc,
      country: r.country, cityKey: r.city_key,
      type: r.type, offer: r.offer,
      price: Number(r.price) || 0, currency: r.currency || 'usd',
      rooms: r.rooms || 0, baths: r.baths || 0, area: Number(r.area) || 0,
      lat: r.lat, lng: r.lng,
      ownership: r.ownership || 'tabu', zone: r.zone || '',
      floor: r.floor, year: r.year,
      parking: !!r.parking, exc: !!r.exc,
      desc: r.descr || { ar: '', en: '' },
      features: r.features || { ar: [], en: [] },
      photos: r.photos || [],
      slot: 'pp-' + r.id            // نفس الاسم الذي تولّده النواة، فتُعثر الصور
    };
  }

  /* صف مشروع -> الشكل الذي تعرفه الصفحات */
  function toProject(r) {
    return {
      id: r.id, name: r.name, loc: r.loc,
      country: r.country, cityKey: r.city_key,
      kind: r.kind, state: r.state,
      progress: Number(r.progress) || 0,
      price: Number(r.price) || 0, currency: r.currency || 'usd',
      desc: r.descr || { ar: '', en: '' },
      stats: r.stats || [],
      lat: r.lat, lng: r.lng,
      photos: r.photos || [],
      slot: 'prj-' + r.id
    };
  }

  /* الشكل الذي تعرفه الصفحات -> صف مشروع */
  function projToRow(p) {
    var r = {};
    if (p.id !== undefined) r.id = p.id;
    if (p.name !== undefined) r.name = p.name;
    if (p.loc !== undefined) r.loc = p.loc;
    if (p.country !== undefined) r.country = p.country || 'ps';
    if (p.cityKey !== undefined) r.city_key = p.cityKey || '';
    if (p.kind !== undefined) r.kind = p.kind || 'residential';
    if (p.state !== undefined) r.state = p.state || 'ongoing';
    if (p.progress !== undefined) r.progress = Number(p.progress) || 0;
    if (p.price !== undefined) r.price = Number(p.price) || 0;
    if (p.currency !== undefined) r.currency = p.currency || 'usd';
    if (p.desc !== undefined) r.descr = p.desc;
    if (p.stats !== undefined) r.stats = p.stats;
    if (p.lat !== undefined) r.lat = p.lat === '' ? null : p.lat;
    if (p.lng !== undefined) r.lng = p.lng === '' ? null : p.lng;
    if (p.photos !== undefined) r.photos = p.photos;
    if (p.published !== undefined) r.published = !!p.published;
    return r;
  }

  /* الشكل الذي تعرفه الصفحات -> صف قاعدة البيانات */
  function toRow(p) {
    var r = {};
    if (p.id !== undefined) r.id = p.id;
    if (p.name !== undefined) r.name = p.name;
    if (p.loc !== undefined) r.loc = p.loc;
    if (p.country !== undefined) r.country = p.country;
    if (p.cityKey !== undefined) r.city_key = p.cityKey;
    if (p.type !== undefined) r.type = p.type;
    if (p.offer !== undefined) r.offer = p.offer;
    if (p.price !== undefined) r.price = Number(p.price) || 0;
    if (p.currency !== undefined) r.currency = p.currency || 'usd';
    if (p.rooms !== undefined) r.rooms = Number(p.rooms) || 0;
    if (p.baths !== undefined) r.baths = Number(p.baths) || 0;
    if (p.area !== undefined) r.area = Number(p.area) || 0;
    if (p.lat !== undefined) r.lat = p.lat === '' ? null : p.lat;
    if (p.lng !== undefined) r.lng = p.lng === '' ? null : p.lng;
    if (p.ownership !== undefined) r.ownership = p.ownership || 'tabu';
    if (p.zone !== undefined) r.zone = p.zone || '';
    if (p.floor !== undefined) r.floor = p.floor === '' ? null : p.floor;
    if (p.year !== undefined) r.year = p.year === '' ? null : p.year;
    if (p.parking !== undefined) r.parking = !!p.parking;
    if (p.exc !== undefined) r.exc = !!p.exc;
    if (p.desc !== undefined) r.descr = p.desc;
    if (p.features !== undefined) r.features = p.features;
    if (p.photos !== undefined) r.photos = p.photos;
    if (p.published !== undefined) r.published = !!p.published;
    return r;
  }

  function ownerFromRow(r) {
    return {
      id: r.id, kind: r.kind, name: r.name, company: r.company, phone: r.phone, phone2: r.phone2,
      email: r.email, idNumber: r.id_number, city: r.city, notes: r.notes,
      listingId: r.listing_id, createdAt: r.created_at
    };
  }

  function ownerToRow(o) {
    return {
      kind: o.kind === 'company' ? 'company' : 'person', name: o.name || '', company: o.company || '',
      phone: o.phone || '', phone2: o.phone2 || '', email: o.email || '', id_number: o.idNumber || '',
      city: o.city || '', notes: o.notes || '', listing_id: o.listingId || null
    };
  }

  function numOrNull(v) { return v === '' || v === null || v === undefined ? null : Number(v); }

  function contractFromRow(r) {
    return {
      id: r.id, ownerId: r.owner_id, propId: r.property_id, deal: r.deal, exclusive: !!r.exclusive,
      askingPrice: Number(r.asking_price) || 0, minPrice: r.min_price == null ? null : Number(r.min_price),
      currency: r.currency, commissionType: r.commission_type, commissionValue: Number(r.commission_value) || 0,
      startDate: r.start_date || '', endDate: r.end_date || '', status: r.status,
      closedPrice: r.closed_price == null ? null : Number(r.closed_price), closedOn: r.closed_on || null,
      notes: r.notes || '', createdAt: r.created_at
    };
  }

  function contractToRow(c) {
    return {
      owner_id: c.ownerId, property_id: c.propId || null, deal: c.deal === 'rent' ? 'rent' : 'sale',
      exclusive: !!c.exclusive, asking_price: Number(c.askingPrice) || 0, min_price: numOrNull(c.minPrice),
      currency: c.currency || 'usd', commission_type: c.commissionType === 'fixed' ? 'fixed' : 'percent',
      commission_value: Number(c.commissionValue) || 0, start_date: c.startDate || undefined,
      end_date: c.endDate || null, status: c.status || 'active',
      closed_price: numOrNull(c.closedPrice), closed_on: c.closedOn || null, notes: c.notes || ''
    };
  }

  function profileFrom(user, row) {
    if (!user) return null;
    return {
      loggedIn: true,
      id: user.id,
      email: user.email || '',
      name: (row && row.name) || '',
      phone: (row && row.phone) || user.phone || '',
      role: (row && row.role) || 'customer'
    };
  }

  function loadScript(src, cb) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = function () {
      /* نجاح التحميل لا يعني أن الرمز العام ظهر: قد يكون المحتوى غير متوقّع */
      console.log('[Palmas] تحمّل ' + src + ' — window.supabase: ' + (window.supabase ? 'موجود' : 'مفقود'));
      cb(null);
    };
    s.onerror = function () {
      console.log('[Palmas] فشل تحميل ' + src + ' (حجب أو مسار خاطئ)');
      cb(new Error('sdk'));
    };
    document.head.appendChild(s);
  }

  /* ------------------------------------------------------------- التركيب */

  function install() {
    /* التركيب مرتين على نفس الكائن يعني تغليف الدوال فوق بعضها */
    if (!core || core.__palmasPatched) return;
    core.__palmasPatched = true;

    /* --- الكتالوج: مزامن للصفحات، مخدوم من ذاكرة محدَّثة من السيرفر --- */
    var localAll = core.allProperties;
    core.allProperties = function () {
      return cache.props && cache.props.length ? cache.props.slice() : localAll.call(core);
    };

    /* لا يكفي استبدال allProperties: دوال النواة الداخلية (filteredBy و propBy
       وقوائم الإدارة وقيم الصفقات) تنادي نسختها الخاصة من الكتالوج، فتبقى على
       البذرة المحلية مهما استبدلنا الواجهة — ولذلك كان أي عقار يُضاف لا يظهر
       في صفحة العقارات. هذا الخطّاف يحوّل مصدرها كلّها دفعة واحدة. */
    if (core.setCatalog) core.setCatalog(core.allProperties);

    var localBy = core.propBy;
    core.propBy = function (id) {
      if (cache.props) {
        for (var i = 0; i < cache.props.length; i++) {
          if (cache.props[i].id === id) return cache.props[i];
        }
      }
      return localBy ? localBy.call(core, id) : null;
    };

    /* --- المشاريع: نفس مبدأ الكتالوج، مزامنة للصفحات ومحدَّثة من السيرفر --- */
    var localProjects = core.allProjects;
    core.allProjects = function () {
      return cache.projects && cache.projects.length
        ? cache.projects.slice()
        : localProjects.call(core);
    };

    if (core.setProjectCatalog) core.setProjectCatalog(core.allProjects);

    var localProjBy = core.projectBy;
    core.projectBy = function (id) {
      if (cache.projects) {
        for (var i = 0; i < cache.projects.length; i++) {
          if (cache.projects[i].id === id) return cache.projects[i];
        }
      }
      return localProjBy ? localProjBy.call(core, id) : null;
    };

    var JA = core.ProjectsAdmin;
    if (JA) {
      JA.list = core.allProjects;

      JA.add = function (proj) {
        var row = projToRow(proj);
        if (!row.id) row.id = 'pj' + Date.now().toString(36);
        return sb.from('projects').insert(row).select().single().then(function (res) {
          if (res.error) throw res.error;
          var added = toProject(res.data);
          cache.projects = [added].concat(cache.projects || []);
          fireAuth();
          return added;
        });
      };

      JA.update = function (id, patch) {
        var row = projToRow(patch);
        delete row.id;
        return sb.from('projects').update(row).eq('id', id).select().single().then(function (res) {
          if (res.error) throw res.error;
          var updated = toProject(res.data);
          cache.projects = (cache.projects || []).map(function (x) { return x.id === id ? updated : x; });
          fireAuth();
          return updated;
        });
      };

      JA.remove = function (id) {
        return sb.from('projects').delete().eq('id', id).then(function (res) {
          if (res.error) throw res.error;
          cache.projects = (cache.projects || []).filter(function (x) { return x.id !== id; });
          fireAuth();
          return true;
        });
      };

      JA.isCustom = function () { return true; };
      JA.restore = function () { return Promise.resolve(true); };
    }

    /* --- الموظفون ---
       مصدران متمايزان عن قصد: الزوّار يقرأون نافذة agents (اسم ومسمّى وهاتف
       فقط)، والسجل الكامل بالرواتب لا يُجلب إلا لحساب أدمن وتحجبه RLS عن
       غيره. فلا يمرّ الراتب في متصفّح زائر أصلاً. */
    var localStaff = core.allStaff;
    core.allStaff = function () {
      return cache.staffFull && cache.staffFull.length
        ? cache.staffFull.slice()
        : localStaff.call(core);
    };

    var SA = core.StaffAdmin;
    if (SA) {
      SA.list = core.allStaff;
      SA.agents = function () {
        if (cache.staff && cache.staff.length) return cache.staff.slice();
        return core.allStaff().filter(function (s) { return s.agent; });
      };

      SA.add = function (data) {
        var row = {
          id: data.id || ('st' + Date.now()),
          name: data.name,
          role: data.role || { ar: '', en: '' },
          phone: data.phone || '',
          salary: Number(data.salary) || 0,
          status: data.status || 'full',
          agent: data.agent === true,
          color: data.color || '#f68743'
        };
        return sb.from('staff').insert(row).select().single().then(function (res) {
          if (res.error) throw res.error;
          cache.staffFull = (cache.staffFull || []).concat([res.data]);
          if (res.data.agent) cache.staff = (cache.staff || []).concat([res.data]);
          fireAuth();
          return res.data;
        });
      };

      SA.remove = function (id) {
        var drop = function (list) {
          return (list || []).filter(function (x) { return x.id !== id; });
        };
        return sb.from('staff').delete().eq('id', id).then(function (res) {
          if (res.error) throw res.error;
          cache.staffFull = drop(cache.staffFull);
          cache.staff = cache.staff ? drop(cache.staff) : cache.staff;
          fireAuth();
          return true;
        });
      };
    }

    /* --- أسعار الصرف ---
       rates() تُستدعى في كل عملية تنسيق سعر، فيجب أن تبقى مزامنة: نخدمها من
       ذاكرة يملؤها السيرفر، ونكتب التعديل عليه في الخلفية. */
    var localRates = core.Currency.rates;
    core.Currency.rates = function () {
      if (cache.rates) {
        /* ندمج فوق المحلي حتى لا تختفي عملة أضيفت للنواة ولم تُزرع بعد */
        var out = localRates.call(core);
        for (var k in cache.rates) if (cache.rates.hasOwnProperty(k)) out[k] = cache.rates[k];
        return out;
      }
      return localRates.call(core);
    };

    var localSetRate = core.Currency.setRate;
    core.Currency.setRate = function (code, rate) {
      var out = localSetRate.call(core, code, rate);   // تحديث فوري للواجهة
      if (cache.rates) cache.rates[code] = Number(rate);
      sb.from('currency_rates')
        .upsert({ code: code, rate: Number(rate), updated_at: new Date().toISOString() })
        .then(function (res) {
          if (res.error) console.log('[Palmas] تعذّر حفظ سعر الصرف:', res.error.message);
        });
      return out;
    };

    /* --- الحسابات --- */
    var API = core.API;

    API.session = function () { return cache.session; };
    API.favorites = function () { return cache.favs.slice(); };

    API.onAuthChange = function (fn) {
      listeners.push(fn);
      return function () {
        var i = listeners.indexOf(fn);
        if (i !== -1) listeners.splice(i, 1);
      };
    };

    API.signIn = function (payload) {
      var creds = payload.method === 'phone'
        ? { phone: payload.identifier, password: payload.password }
        : { email: payload.identifier, password: payload.password };
      return sb.auth.signInWithPassword(creds).then(function (res) {
        /* صفحة الدخول تبتلع الخطأ وتعرض رسالة عامة، فنطبع السبب الحقيقي هنا */
        if (res.error) {
          console.log('[Palmas] رفض الدخول: ' + res.error.message + ' (' + (res.error.status || '?') + ')');
          throw res.error;
        }
        return syncSession().then(function () { return cache.session; });
      });
    };

    API.signUp = function (payload) {
      var creds = payload.method === 'phone'
        ? { phone: payload.identifier, password: payload.password,
            options: { data: { name: payload.name || '', phone: payload.identifier } } }
        : { email: payload.identifier, password: payload.password,
            options: { data: { name: payload.name || '', phone: payload.phone || '' } } };
      return sb.auth.signUp(creds).then(function (res) {
        if (res.error) {
          console.log('[Palmas] رفض التسجيل: ' + res.error.message + ' (' + (res.error.status || '?') + ')');
          throw res.error;
        }
        return syncSession().then(function () { return cache.session; });
      });
    };

    API.signOut = function () {
      return sb.auth.signOut().then(function () {
        return syncSession();
      });
    };

    API.findAccount = function (payload) {
      return sb.auth.resetPasswordForEmail(payload.identifier).then(function (res) {
        if (res.error) throw res.error;
        return true;
      });
    };

    API.resetPassword = function (payload) {
      return sb.auth.updateUser({ password: payload.newPassword }).then(function (res) {
        if (res.error) throw res.error;
        return true;
      });
    };

    API.changePassword = function (payload) {
      return sb.auth.updateUser({ password: payload.newPassword }).then(function (res) {
        if (res.error) throw res.error;
        return true;
      });
    };

    API.updateProfile = function (patch) {
      return sb.auth.getUser().then(function (u) {
        if (!u.data || !u.data.user) throw new Error('not signed in');
        var uid = u.data.user.id;
        var chain = Promise.resolve();
        if (patch.email && patch.email !== u.data.user.email) {
          chain = sb.auth.updateUser({ email: patch.email });
        }
        return chain
          .then(function () {
            return sb.from('profiles')
              .update({ name: patch.name || '', phone: patch.phone || '' })
              .eq('id', uid);
          })
          .then(syncSession)
          .then(function () { return cache.session; });
      });
    };

    /* --- العملاء ---
       الصفحات تكتب هذه مباشرة في localStorage. نعترض الكتابة ونحوّلها للسيرفر
       ليصل الطلب إلى لوحة التحكم مهما كان الجهاز الذي أرسل منه. */
    core.Leads = {
      book: function (rec) {
        return uid().then(function (u) {
          return sb.from('bookings').insert({
            user_id: u, property_id: rec.pid || null, prop_name: rec.pname || '',
            name: rec.name || '', phone: rec.phone || '',
            visit_date: rec.date || '', visit_time: rec.time || '', source: 'web'
          });
        }).then(okOrThrow);
      },
      message: function (rec) {
        return uid().then(function (u) {
          return sb.from('messages').insert({
            user_id: u, name: rec.name || '', phone: rec.phone || '',
            body: rec.msg || '', lang: rec.lang || 'ar', source: 'web'
          });
        }).then(okOrThrow);
      },
      listing: function (rec) {
        return uid().then(function (u) {
          return sb.from('listings').insert({
            user_id: u, name: rec.name || '', phone: rec.phone || '', city: rec.city || '',
            deal: rec.deal || 'sale', prop_type: rec.propType || 'apartment',
            price: String(rec.price || ''), currency: rec.currency || 'usd',
            notes: rec.notes || '', source: 'web'
          });
        }).then(okOrThrow);
      },
      /* الشات: إضافة فقط. المعرّف مبنيّ على الوقت وقابل للتخمين، فلو سُمح
         بالتعديل لأمكن الكتابة فوق محادثة زائر آخر.

         طلبات Supabase ليست وعوداً كاملة (لا .catch)، فنغلّفها. والرسائل تُرسل
         بالدور خلف إنشاء المحادثة: لو سبقتها رسالةٌ لرفضها قيد المفتاح، ولو
         أُرسلت معاً لاختلّ ترتيبها في لوحة التحكم. */
      chatStart: function (rec) {
        var p = Promise.resolve(sb.from('chats').insert({
          id: rec.id, name: rec.name || '', phone: rec.phone || '', lang: rec.lang || 'ar'
        })).then(function (r) {
          /* 23505 = المحادثة موجودة أصلاً (زائر عاد لنفس المحادثة) — ليس خطأ */
          if (r.error && r.error.code !== '23505') throw r.error;
          return true;
        });
        chatQueue[rec.id] = p.catch(function () {});
        return p;
      },
      chatSay: function (chatId, role, body) {
        var p = (chatQueue[chatId] || Promise.resolve()).then(function () {
          return sb.from('chat_messages').insert({
            chat_id: chatId, role: role === 'bot' ? 'bot' : 'user', body: body || ''
          });
        }).then(function (r) { if (r.error) throw r.error; return true; });
        chatQueue[chatId] = p.catch(function () {});
        return p;
      },

      all: function () {
        return Promise.all([
          sb.from('bookings').select('*').order('created_at', { ascending: false }),
          sb.from('messages').select('*').order('created_at', { ascending: false }),
          sb.from('listings').select('*').order('created_at', { ascending: false }),
          sb.from('chats').select('*').order('created_at', { ascending: false }),
          sb.from('chat_messages').select('*').order('id')
        ]).then(function (r) {
          /* بنفس شكل الرسائل الذي تكتبه أداة الشات ويقرأه CRM:
             { role: 'user' | 'ai', text, ts } */
          var byChat = {};
          (r[4].data || []).forEach(function (m) {
            (byChat[m.chat_id] = byChat[m.chat_id] || []).push({
              role: m.role === 'bot' ? 'ai' : 'user',
              text: m.body,
              ts: new Date(m.created_at).getTime()
            });
          });
          var chats = (r[3].data || []).map(function (c) {
            return {
              id: c.id, name: c.name, phone: c.phone, lang: c.lang,
              createdAt: new Date(c.created_at).getTime(),
              messages: byChat[c.id] || []
            };
          });
          return {
            bookings: r[0].data || [], messages: r[1].data || [],
            listings: r[2].data || [], chats: chats
          };
        });
      }
    };

    interceptLocalWrites();

    /* --- إدارة العقارات: تكتب على السيرفر بدل تخزين المتصفّح ---
       لوحة التحكم تنادي PropsAdmin، فنستبدل دواله. القراءة تبقى فورية من الذاكرة
       حتى لا تتغيّر أي صفحة، والكتابة تذهب للسيرفر ثم تُحدَّث الذاكرة. */
    var PA = core.PropsAdmin;
    if (PA) {
      PA.add = function (prop) {
        var row = toRow(prop);
        if (!row.id) row.id = 'p' + Date.now().toString(36);
        return sb.from('properties').insert(row).select().single().then(function (res) {
          if (res.error) throw res.error;
          var added = toProperty(res.data);
          cache.props = [added].concat(cache.props || []);
          fireAuth();
          return added;
        });
      };

      PA.update = function (id, patch) {
        var row = toRow(patch);
        delete row.id;
        return sb.from('properties').update(row).eq('id', id).select().single().then(function (res) {
          if (res.error) throw res.error;
          var updated = toProperty(res.data);
          cache.props = (cache.props || []).map(function (x) { return x.id === id ? updated : x; });
          fireAuth();
          return updated;
        });
      };

      PA.remove = function (id) {
        return sb.from('properties').delete().eq('id', id).then(function (res) {
          if (res.error) throw res.error;
          cache.props = (cache.props || []).filter(function (x) { return x.id !== id; });
          fireAuth();
          return true;
        });
      };

      PA.isCustom = function () { return true; };   // كل العقارات صارت قابلة للتعديل
      PA.restore = function () { return Promise.resolve(true); };
    }

    /* --- محتوى الموقع: صف واحد في site_settings، يُقرأ عند الإقلاع --- */
    if (core.Site) {
      if (cache.site) core.Site.set(cache.site);
      core.Site.save = function (v) {
        var clean = core.Site.set(v);
        return sb.from('site_settings').upsert({ key: 'site', value: clean }).then(function (r) {
          if (r.error) throw r.error;
          cache.site = clean;
          fireAuth();
          return clean;
        });
      };
    }

    /* --- المالكون وعقود الوساطة: نفس واجهة النواة، مصدرها قاعدة البيانات --- */
    if (core.Owners) {
      core.Owners.list = function () {
        return sb.from('owners').select('*').order('created_at', { ascending: false }).then(function (r) {
          if (r.error) throw r.error;
          return (r.data || []).map(ownerFromRow);
        });
      };
      core.Owners.save = function (o) {
        var row = ownerToRow(o);
        var q = o.id ? sb.from('owners').update(row).eq('id', o.id) : sb.from('owners').insert(row);
        return q.select().single().then(function (r) {
          if (r.error) throw r.error;
          return ownerFromRow(r.data);
        });
      };
      core.Owners.remove = function (id) {
        return sb.from('owners').delete().eq('id', id).then(function (r) {
          if (r.error) throw r.error;
          return true;
        });
      };
    }
    if (core.Contracts) {
      core.Contracts.list = function () {
        return sb.from('contracts').select('*').order('created_at', { ascending: false }).then(function (r) {
          if (r.error) throw r.error;
          return (r.data || []).map(contractFromRow);
        });
      };
      core.Contracts.save = function (c) {
        var row = contractToRow(c);
        var q = c.id ? sb.from('contracts').update(row).eq('id', c.id) : sb.from('contracts').insert(row);
        return q.select().single().then(function (r) {
          if (r.error) throw r.error;
          return contractFromRow(r.data);
        });
      };
      core.Contracts.remove = function (id) {
        return sb.from('contracts').delete().eq('id', id).then(function (r) {
          if (r.error) throw r.error;
          return true;
        });
      };
    }

    /* --- الصور --- */
    core.Photos = {
      bucket: 'property-photos',
      upload: function (propertyId, file) {
        var ext = (file.name || 'jpg').split('.').pop().toLowerCase();
        var path = propertyId + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
        return sb.storage.from('property-photos')
          .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false })
          .then(function (res) {
            if (res.error) throw res.error;
            return sb.storage.from('property-photos').getPublicUrl(path).data.publicUrl;
          });
      },
      attach: function (propertyId, url) {
        return sb.from('properties').select('photos').eq('id', propertyId).single()
          .then(function (res) {
            if (res.error) throw res.error;
            var next = (res.data.photos || []).concat([url]);
            return sb.from('properties').update({ photos: next }).eq('id', propertyId).then(function () {
              cache.props = (cache.props || []).map(function (x) {
                if (x.id === propertyId) x.photos = next;
                return x;
              });
              fireAuth();
              return next;
            });
          });
      },
      remove: function (propertyId, url) {
        return sb.from('properties').select('photos').eq('id', propertyId).single()
          .then(function (res) {
            if (res.error) throw res.error;
            var next = (res.data.photos || []).filter(function (u) { return u !== url; });
            return sb.from('properties').update({ photos: next }).eq('id', propertyId).then(function () {
              var at = url.indexOf('/property-photos/');
              if (at !== -1) sb.storage.from('property-photos').remove([url.slice(at + 17)]);
              cache.props = (cache.props || []).map(function (x) {
                if (x.id === propertyId) x.photos = next;
                return x;
              });
              fireAuth();
              return next;
            });
          });
      },

      /** يكتب قائمة الصور كاملة — الأولى هي الغلاف */
      setPhotos: function (kind, id, photos) {
        var table = kind === 'proj' ? 'projects' : 'properties';
        return sb.from(table).update({ photos: photos }).eq('id', id).then(function (res) {
          if (res.error) throw res.error;
          var bucket = kind === 'proj' ? cache.projects : cache.props;
          if (bucket) {
            for (var i = 0; i < bucket.length; i++) {
              if (bucket[i].id === id) { bucket[i] = Object.assign({}, bucket[i], { photos: photos }); break; }
            }
          }
          fireAuth();
          return photos;
        });
      },

      /* صور الموقع الثابتة: لا تخصّ عقاراً، فمكانها جدول site_images */
      siteImages: function () {
        return sb.from('site_images').select('slot, url').then(function (res) {
          if (res.error) throw res.error;
          var map = {};
          (res.data || []).forEach(function (r) { map[r.slot] = r.url; });
          return map;
        });
      },

      setSiteImage: function (slot, url) {
        return sb.from('site_images')
          .upsert({ slot: slot, url: url, updated_at: new Date().toISOString() })
          .then(function (res) {
            if (res.error) throw res.error;
            return url;
          });
      }
    };

    /* --- الإحصاءات ---
       تُجمَّع على السيرفر: صف واحد يعود بدل آلاف صفوف الزيارات. وكل دالة
       تتحقّق من الأدمن بنفسها، فلا شيء يعود لغيره. */
    core.Stats = {
      overview: function () {
        return sb.rpc('stats_overview').then(function (r) {
          if (r.error) throw r.error;
          return r.data;
        });
      },
      visitsByMonth: function () {
        return sb.rpc('stats_visits_months').then(function (r) {
          if (r.error) throw r.error;
          return r.data || [];
        });
      },
      sources: function () {
        return sb.rpc('stats_sources').then(function (r) {
          if (r.error) throw r.error;
          return r.data || [];
        });
      },
      topProperties: function (n) {
        return sb.rpc('stats_top_properties', { limit_n: n || 5 }).then(function (r) {
          if (r.error) throw r.error;
          return r.data || [];
        });
      },
      accounts: function () {
        return sb.rpc('admin_accounts').then(function (r) {
          if (r.error) throw r.error;
          return r.data || [];
        });
      }
    };

    /* --- المفضلة --- */
    API.toggleFavorite = function (id) {
      return sb.auth.getUser().then(function (u) {
        if (!u.data || !u.data.user) throw new Error('not signed in');
        var uid = u.data.user.id;
        var had = cache.favs.indexOf(id) !== -1;
        var op = had
          ? sb.from('favorites').delete().eq('user_id', uid).eq('property_id', id)
          : sb.from('favorites').insert({ user_id: uid, property_id: id });
        return op.then(function (res) {
          if (res.error) throw res.error;
          return loadFavs().then(function () {
            return { added: !had, list: cache.favs.slice() };
          });
        });
      });
    };
  }

  /* --------------------------------------------------------------- الجلب */

  function uid() {
    return sb.auth.getUser().then(function (u) {
      return (u.data && u.data.user) ? u.data.user.id : null;
    }).catch(function () { return null; });
  }

  /**
   * صفحات النماذج تكتب طلباتها مباشرة في localStorage. بدل تعديل كل صفحة،
   * نعترض setItem على المفاتيح الثلاثة ونرسل الصف الجديد للسيرفر — فيصل الطلب
   * إلى لوحة التحكم مهما كان جهاز الزائر.
   */
  function interceptLocalWrites() {
    var MAP = {
      palmas_bookings: 'book',
      palmas_crm_messages: 'message',
      palmas_listings: 'listing'
    };
    try {
      window.localStorage.setItem = function (key, value) {
        var out = nativeSet(key, value);

        /* الدفاتر المالية: نرسل الفرق عن آخر حالة معروفة */
        if (ERP_KEYS.indexOf(key) !== -1) {
          try { syncErp(key, JSON.parse(value)); } catch (e) {}
          return out;
        }

        /* تغيير حالة حجز من لوحة CRM: صف موجود على السيرفر يُحدَّث، لا يُنشأ
           من جديد. الاعتراض أدناه للطلبات الجديدة وحدها. */
        if (key === 'palmas_bookings') {
          try { syncBookingStatuses(JSON.parse(value)); } catch (e) {}
        }

        var kind = MAP[key];
        if (!kind) return out;
        try {
          var arr = JSON.parse(value);
          if (!Array.isArray(arr) || !arr.length) return out;
          var rec = arr[arr.length - 1];               // الصف المضاف للتوّ
          if (rec && !rec.__sent) {
            rec.__sent = true;
            core.Leads[kind](rec).catch(function (e) {
              console.log('[Palmas] تعذّر إرسال الطلب للسيرفر:', e && e.message);
            });
          }
        } catch (e) {}
        return out;
      };
    } catch (e) { /* المتصفّح منع الاستبدال — تبقى الطلبات محلية */ }
  }

  /* ------------------------------------------------- الدفاتر المالية (ERP)
     صفحة ERP تقرأ دفاترها من تخزين المتصفّح وتكتب فيه. بدل تعديل الصفحة نجعل
     التخزين مجرّد مرآة للسيرفر: نزرع فيه ما على السيرفر عند الإقلاع، ونرسل
     إليه كل تغيير يُكتب. فتصير الفواتير والمصاريف واحدة على كل جهاز. */

  var ERP_KEYS = ['palmas_erp_invadd', 'palmas_erp_paid', 'palmas_erp_exp', 'palmas_erp_dismissed'];
  var erpSnap = {};                                  // آخر حالة معروفة، لحساب الفرق

  /**
   * لوحتا CRM و ERP تقرآن العملاء من تخزين المتصفّح وتُعيدان التحميل عند حدث
   * storage. فنجعل التخزين مرآة للسيرفر هنا أيضاً: الحجوزات والرسائل والطلبات
   * والمحادثات والحسابات تصل للوحة مهما كان الجهاز الذي أرسلها.
   */
  function loadLeads() {
    if (!cache.session || cache.session.role !== 'admin') return Promise.resolve();
    return core.Leads.all().then(function (d) {
      /* __sent يمنع اعتراضَ الكتابة من إعادة إرسال هذه الصفوف كطلبات جديدة:
         هي أصلاً قادمة من السيرفر، وأي حفظ لاحق (تغيير حالة حجز مثلاً) كان
         سيُنشئ نسخة ثانية منها. */
      seedLocal('palmas_bookings', d.bookings.map(function (b) {
        return { id: b.id, status: b.status || 'pending', pid: b.property_id || '', pname: b.prop_name || '',
                 date: b.visit_date || '', dow: '', dateNum: b.visit_date || '', time: b.visit_time || '',
                 name: b.name || '', phone: b.phone || '', ts: new Date(b.created_at).getTime(),
                 src: b.source || 'web', __sent: true };
      }));
      seedLocal('palmas_crm_messages', d.messages.map(function (m) {
        return { id: m.id, name: m.name || '', phone: m.phone || '', msg: m.body || '',
                 lang: m.lang || 'ar', ts: new Date(m.created_at).getTime(), src: m.source || 'web',
                 __sent: true };
      }));
      seedLocal('palmas_listings', d.listings.map(function (l) {
        return { id: l.id, name: l.name || '', phone: l.phone || '', city: l.city || '',
                 deal: l.deal || 'sale', propType: l.prop_type || 'apartment',
                 price: l.price || '', currency: l.currency || 'usd', notes: l.notes || '',
                 date: (l.created_at || '').slice(0, 10), ts: new Date(l.created_at).getTime(),
                 src: l.source || 'web', __sent: true };
      }));
      seedLocal('palmas_crm_chats', d.chats);
      /* الحالة المعروفة الآن هي حالة السيرفر — فأي تغيير لاحق يُرسَل وحده */
      d.bookings.forEach(function (b) { bookingStatus[b.id] = b.status || 'pending'; });
      ['palmas_bookings', 'palmas_crm_messages', 'palmas_listings', 'palmas_crm_chats'].forEach(announce);
    }).then(function () {
      /* الحسابات: مصدرها auth.users عبر دالة محميّة، لا تخزين متصفّح */
      return sb.rpc('admin_accounts').then(function (r) {
        if (r.error) return;
        seedLocal('palmas_users', (r.data || []).map(function (u) {
          return { name: u.name, email: u.email, phone: u.phone, joined: u.joined, reg: true };
        }));
        announce('palmas_users');
      });
    }).catch(function (e) {
      console.log('[Palmas] تعذّر جلب العملاء:', e && e.message);
    });
  }

  function seedLocal(key, value) {
    try { nativeSet(key, JSON.stringify(value)); } catch (e) {}
    erpSnap[key] = value;
  }

  /**
   * الصفحات تعيد التحميل عند حدث storage (المصمَّم أصلاً للتبويبات الأخرى).
   * إطلاقه يدوياً هو ما يجعلها تلتقط بيانات السيرفر دون تعديل أي صفحة.
   */
  function announce(key) {
    try {
      window.dispatchEvent(new StorageEvent('storage', {
        key: key, newValue: window.localStorage.getItem(key)
      }));
    } catch (e) {
      try {                                          // متصفّحات لا تسمح ببناء الحدث
        var ev = document.createEvent('Event');
        ev.initEvent('storage', false, false);
        ev.key = key;
        window.dispatchEvent(ev);
      } catch (e2) {}
    }
  }

  /** يجلب الدفاتر — ينجح للأدمن وحده، ويُتجاهل بهدوء لغيره */
  function loadErp() {
    if (!cache.session || cache.session.role !== 'admin') return Promise.resolve();
    return Promise.all([
      sb.from('invoices').select('*').order('created_at', { ascending: true }),
      sb.from('invoice_payments').select('*'),
      sb.from('expenses').select('*').order('spent_on', { ascending: false }),
      sb.from('erp_dismissed').select('lead_key'),
      sb.from('staff').select('*').order('id')       // بالرواتب — للأدمن وحده
    ]).then(function (r) {
      if (r[0].error) throw r[0].error;

      if (!r[4].error && r[4].data && r[4].data.length) cache.staffFull = r[4].data;

      seedLocal('palmas_erp_invadd', (r[0].data || []).map(function (x) {
        return { no: x.no, client: x.client, item: x.item, amount: Number(x.amount) || 0,
                 due: x.due || '', propId: x.property_id || '', dealType: x.deal_type || 'sale' };
      }));

      var paid = {};
      (r[1].data || []).forEach(function (x) { paid[x.no] = x.paid_on; });
      seedLocal('palmas_erp_paid', paid);

      seedLocal('palmas_erp_exp', (r[2].data || []).map(function (x) {
        return { id: x.id, desc: x.descr, cat: x.cat, amount: Number(x.amount) || 0, date: x.spent_on };
      }));

      seedLocal('palmas_erp_dismissed', (r[3].data || []).map(function (x) { return x.lead_key; }));

      ERP_KEYS.forEach(announce);
      fireAuth();                                    // السجل الكامل للموظفين وصل
    }).catch(function (e) {
      console.log('[Palmas] تعذّر جلب الدفاتر المالية:', e && e.message);
    });
  }

  /** يقارن ما كُتب بآخر حالة معروفة ويرسل الفرق وحده */
  function syncErp(key, value) {
    var before = erpSnap[key];
    erpSnap[key] = value;
    if (before === undefined) return;                // لم تُزرع بعد: لا فرق يُحتسب

    var fail = function (e) {
      console.log('[Palmas] تعذّر حفظ الدفتر على السيرفر:', e && e.message);
    };

    if (key === 'palmas_erp_invadd') {
      var had = {};
      before.forEach(function (x) { had[x.no] = true; });
      value.filter(function (x) { return !had[x.no]; }).forEach(function (x) {
        sb.from('invoices').insert({
          no: x.no, client: x.client || '', item: x.item || '',
          amount: Number(x.amount) || 0, due: x.due || '',
          property_id: x.propId || null, deal_type: x.dealType || 'sale'
        }).then(function (r) { if (r.error) fail(r.error); });
      });
      var kept = {};
      value.forEach(function (x) { kept[x.no] = true; });
      before.filter(function (x) { return !kept[x.no]; }).forEach(function (x) {
        sb.from('invoices').delete().eq('no', x.no).then(function (r) { if (r.error) fail(r.error); });
      });
      return;
    }

    if (key === 'palmas_erp_paid') {
      Object.keys(value).forEach(function (no) {
        if (before[no] === value[no]) return;
        sb.from('invoice_payments').upsert({ no: no, paid_on: value[no] })
          .then(function (r) { if (r.error) fail(r.error); });
      });
      return;
    }

    if (key === 'palmas_erp_exp') {
      var hadX = {};
      before.forEach(function (x) { hadX[x.id] = true; });
      value.filter(function (x) { return !hadX[x.id]; }).forEach(function (x) {
        sb.from('expenses').insert({
          id: x.id, descr: x.desc || '', cat: x.cat || 'other',
          amount: Number(x.amount) || 0, spent_on: x.date
        }).then(function (r) { if (r.error) fail(r.error); });
      });
      var keptX = {};
      value.forEach(function (x) { keptX[x.id] = true; });
      before.filter(function (x) { return !keptX[x.id]; }).forEach(function (x) {
        sb.from('expenses').delete().eq('id', x.id).then(function (r) { if (r.error) fail(r.error); });
      });
      return;
    }

    if (key === 'palmas_erp_dismissed') {
      value.filter(function (k) { return before.indexOf(k) === -1; }).forEach(function (k) {
        sb.from('erp_dismissed').upsert({ lead_key: k })
          .then(function (r) { if (r.error) fail(r.error); });
      });
    }
  }

  /* ------------------------------------------------------------- الزيارات
     لوحة التحكم كانت تعرض أرقام زيارات مكتوبة يدوياً. هذا يسجّلها فعلاً.

     ما يُسجَّل: الصفحة · تصنيف المصدر · معرّف العقار إن كانت صفحة عقار.
     ما لا يُسجَّل: هوية الزائر ولا أي شيء يتتبّعه — السؤال "كم زيارة" لا "من زار".
     ومرة واحدة لكل صفحة في الجلسة، فإعادة التحميل لا تضخّم الرقم. */

  function sourceOf() {
    var ref = '';
    try { ref = document.referrer || ''; } catch (e) {}
    if (!ref) return 'direct';
    var host = '';
    try { host = new URL(ref).hostname.replace(/^www\./, ''); } catch (e) { return 'referral'; }
    try {
      if (host === new URL(document.baseURI).hostname.replace(/^www\./, '')) return 'direct';
    } catch (e) {}
    if (/(^|\.)(google|bing|yahoo|duckduckgo|yandex)\./.test(host)) return 'google';
    if (/(^|\.)(facebook|instagram|fb|twitter|x|tiktok|linkedin|snapchat|whatsapp|t)\.(com|me|co)$/.test(host)) return 'social';
    return 'referral';
  }

  function trackVisit() {
    var path = '';
    try { path = decodeURIComponent(location.pathname.split('/').pop() || ''); } catch (e) {}

    var once = 'palmas_seen_' + path;
    try {
      if (sessionStorage.getItem(once)) return;        // نفس الصفحة في نفس الجلسة
      sessionStorage.setItem(once, '1');
    } catch (e) { /* الجلسة محجوبة — نسجّل ونمضي */ }

    /* الصفحتان تستعملان ?id= نفسها، فالمسار وحده يفصل بين عقار ومشروع.
       وصفحة العقار تعرض s1 حين لا يُمرَّر معرّف، فنسجّل ما عُرض فعلاً. */
    var id = null;
    try { id = new URLSearchParams(location.search).get('id'); } catch (e) {}
    var isProp = /PropertyDetails/i.test(path);
    var isProj = /ProjectDetails/i.test(path);

    sb.from('page_views').insert({
      path: path,
      source: sourceOf(),
      property_id: isProp ? (id || 's1') : null,
      project_id: isProj ? id : null
    }).then(function (res) {
      if (res.error) console.log('[Palmas] تعذّر تسجيل الزيارة:', res.error.message);
    });
  }

  /** يرسل ما تغيّرت حالته فقط — لا كل الحجوزات في كل حفظ */
  var bookingStatus = {};
  function syncBookingStatuses(list) {
    if (!Array.isArray(list)) return;
    list.forEach(function (b) {
      if (!b || !b.id || !b.__sent) return;           // الجديد يمرّ عبر Leads.book
      if (bookingStatus[b.id] === b.status) return;
      var known = bookingStatus[b.id] !== undefined;
      bookingStatus[b.id] = b.status;
      if (!known) return;                             // أول مرة نراه: تسجيل لا تغيير
      sb.from('bookings').update({ status: b.status }).eq('id', b.id).then(function (r) {
        if (r.error) console.log('[Palmas] تعذّر تحديث حالة الحجز:', r.error.message);
      });
    });
  }

  function loadFavs() {
    return sb.auth.getUser().then(function (u) {
      if (!u.data || !u.data.user) { cache.favs = []; return; }
      return sb.from('favorites').select('property_id').eq('user_id', u.data.user.id)
        .then(function (res) {
          cache.favs = (res.data || []).map(function (r) { return r.property_id; });
        });
    });
  }

  function syncSession() {
    return sb.auth.getUser().then(function (u) {
      var user = u.data && u.data.user;
      if (!user) { cache.session = null; cache.favs = []; fireAuth(); return; }
      return sb.from('profiles').select('name, phone, role').eq('id', user.id).maybeSingle()
        .then(function (res) {
          cache.session = profileFrom(user, res.data);
          return loadFavs();
        })
        .then(fireAuth);
    });
  }

  /**
   * الجسر يملك window.Palmas منذ لحظة تحميله، لسببين:
   *
   *  1) الحجب — كل صفحة تنتظر ظهور window.Palmas في حلقة تفقّد ثم ترسم مرة
   *     واحدة. لو رأت النواة قبل وصول بيانات السيرفر، رسمت من البذرة المحلية
   *     ولم تُعِد الرسم أبداً — فيختفي عنها أي عقار أضيف حديثاً. فنُخفيها
   *     لحظات حتى تصل البيانات، فيكون أول رسم صحيحاً.
   *
   *  2) support.js قد يعيد تقييم palmas-core.js، وكل تقييم يُنشئ كائناً جديداً
   *     يمحو ما ركّبناه — فالواضع يُعيد التركيب على النسخة الجديدة.
   */
  function ownPalmas() {
    try {
      if (window.Palmas) core = window.Palmas;        // النواة سبقتنا
      Object.defineProperty(window, 'Palmas', {
        configurable: true,
        get: function () { return revealed ? core : undefined; },
        set: function (next) {
          core = next;
          if (next && next.API && sb) install();
        }
      });
    } catch (e) {
      revealed = true;                                // المتصفّح رفض: لا نحجب
    }
  }

  /** يكشف النواة للصفحات. يُستدعى عند وصول البيانات أو عند تعذّرها. */
  function reveal() {
    if (revealed) return;
    revealed = true;
    if (revealTimer) { clearTimeout(revealTimer); revealTimer = null; }
    console.log('[Palmas] النواة جاهزة للصفحات — '
      + ((cache.props && cache.props.length) || 0) + ' عقار');
  }

  function boot(cfg) {
    sb = window.supabase.createClient(cfg.url, cfg.key);

    install();

    return Promise.all([
      sb.from('properties').select('*').eq('published', true).order('created_at', { ascending: false }),
      sb.from('projects').select('*').eq('published', true).order('created_at', { ascending: false }),
      sb.from('agents').select('*').order('id'),
      sb.from('currency_rates').select('code, rate'),
      sb.from('site_settings').select('value').eq('key', 'site').maybeSingle()
    ])
      .then(function (r) {
        if (r[0].error) throw r[0].error;
        if (!r[4].error && r[4].data && core.Site) cache.site = core.Site.set(r[4].data.value);
        cache.props = (r[0].data || []).map(toProperty);

        /* الجداول اللاحقة اختيارية: إن لم تُنشأ بعد يبقى الموقع على بيانات
           النواة المحلية لها بدل أن تفرغ الصفحات. */
        if (!r[1].error) cache.projects = (r[1].data || []).map(toProject);
        if (!r[2].error) cache.staff = (r[2].data || []).map(function (a) {
          return { id: a.id, name: a.name, role: a.role, phone: a.phone, color: a.color, agent: true };
        });
        if (!r[3].error && r[3].data && r[3].data.length) {
          var rates = {};
          r[3].data.forEach(function (x) { rates[x.code] = Number(x.rate); });
          cache.rates = rates;
        }
        return syncSession();
      })
      .then(function () {
        console.log('[Palmas] متصل بالسيرفر — ' + cache.props.length + ' عقار و'
          + ((cache.projects && cache.projects.length) || 0) + ' مشروع من قاعدة البيانات');
        reveal();                                     // البيانات جاهزة: تبدأ الصفحات
        fireAuth();                                   // ولمن كان قد رسم قبلها
        sb.auth.onAuthStateChange(function () {
          syncSession().then(loadErp).then(loadLeads);
        });
        trackVisit();
        return loadErp().then(loadLeads);
      })
      .catch(function (e) {
        console.log('[Palmas] تعذّر الوصول للسيرفر — بيانات محلية:', e && e.message);
        reveal();                                     // لا يبقى الموقع محجوباً
      });
  }

  /**
   * support.js يحقن سكربتات <helmet> ديناميكياً، وهذه تُنفَّذ بترتيب غير مضمون —
   * فقد يسبق هذا الملفُ النواةَ وإعداداتِها. لذلك ننتظر ظهورهما بدل الافتراض.
   */
  function whenReady(cb) {
    var tries = 0;
    (function poll() {
      var cfg = window.PALMAS_BACKEND;
      /* نتفقّد core لا window.Palmas: الأخير محجوب عن الصفحات حتى الكشف */
      if (core && cfg && cfg.url && cfg.key) { cb(core, cfg); return; }
      if (++tries > 200) {                            // ~10 ثوانٍ ثم نتركه محلياً
        console.log('[Palmas] النواة أو الإعدادات لم تجهز — بيانات محلية');
        reveal();
        return;
      }
      setTimeout(poll, 50);
    })();
  }

  /* نملك window.Palmas قبل أي شيء آخر: قبل أن تراه أي صفحة، وقبل أن تُسنده
     النواة إن كانت ستُقيَّم بعدنا. */
  ownPalmas();

  /* شبكة أمان مطلقة: مهما تعثّر ما بعدها — إعدادات مفقودة، مكتبة محجوبة،
     سيرفر ساقط — يظهر الموقع ببياناته المحلية بدل أن يبقى فارغاً. */
  revealTimer = setTimeout(function () {
    console.log('[Palmas] السيرفر تأخّر — عرض البيانات المحلية');
    reveal();
  }, REVEAL_MS);

  whenReady(function (P, cfg) {
    core = P;
    if (window.supabase) { boot(cfg); return; }        // حُمّلت مسبقاً في الصفحة

    /* مسار مطلق: support.js يُقيّم هذا الملف ديناميكياً، فلا نعتمد على مسار نسبي */
    var localUrl = SDK_LOCAL;
    try { localUrl = new URL(SDK_LOCAL, document.baseURI).href; } catch (e) {}

    loadScript(localUrl, function (err) {
      if (!err && window.supabase) { boot(cfg); return; }
      loadScript(SDK_CDN, function (err2) {            // النسخة المحلية غير متاحة
        if (err2 || !window.supabase) {
          console.log('[Palmas] تعذّر تحميل مكتبة السيرفر — بيانات محلية');
          reveal();
          return;
        }
        boot(cfg);
      });
    });
  });
})();
