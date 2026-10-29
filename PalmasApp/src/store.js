/**
 * The single place the UI talks to. Everything user-facing (catalog, session, favourites,
 * currency, requests) is delegated to the shared core so the app and the website behave
 * identically and — once the real backend lands — both swap in one file.
 */
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { I18nManager } from 'react-native';
import { hydrateCore, core } from './core';
import { initBackend, backend, pingBackend, isLive } from './backend';
import { t as strings, WHATSAPP } from './i18n';

const PREFS_KEY = 'palmas_app_prefs';
const Ctx = createContext(null);

export function AppProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [lang, setLangState] = useState('ar');
  const [theme, setThemeState] = useState('light');
  const [currency, setCurrencyState] = useState('auto'); // 'auto' = each property's own currency
  const [session, setSession] = useState(null);
  const [favs, setFavs] = useState([]);
  const [tick, setTick] = useState(0); // bumped when the catalog changes
  const [remoteProps, setRemoteProps] = useState(null); // null = لسه ما وصلت
  const [remoteProjects, setRemoteProjects] = useState(null);
  const [remoteAgents, setRemoteAgents] = useState(null);
  const [online, setOnline] = useState(false);

  /* الحساب والمفضلة: من السيرفر إن كان متاحاً، وإلا من النواة المحلية */
  const refreshAuth = useCallback(async () => {
    const api = backend();
    if (api && isLive()) {
      try {
        const s = await api.auth.session();
        setSession(s);
        setFavs(s ? await api.favorites.list() : []);
        return;
      } catch (e) { /* يسقط للمحلي */ }
    }
    const P = core();
    if (!P) return;
    const s = P.API.session();
    setSession(s && s.loggedIn ? s : null);
    setFavs(P.API.favorites());
  }, []);

  useEffect(() => {
    let off;
    (async () => {
      const P = await hydrateCore();
      try {
        const raw = P && global.localStorage.getItem(PREFS_KEY);
        if (raw) {
          const p = JSON.parse(raw);
          if (p.lang) setLangState(p.lang);
          if (p.theme) setThemeState(p.theme);
          if (p.currency) setCurrencyState(p.currency);
        }
      } catch (e) {}

      /* يوصل بالسيرفر، ويتحقّق فعلاً أنه يردّ قبل الاعتماد عليه */
      const api = initBackend();
      if (api && (await pingBackend())) {
        setOnline(true);
        try {
          const rows = await api.properties.all();
          setRemoteProps(rows);
          console.log(`[Palmas] متصل بالسيرفر — ${rows.length} عقار من قاعدة البيانات`);
        } catch (e) {
          console.log('[Palmas] السيرفر ردّ لكن تعذّر جلب العقارات:', e.message);
        }

        /* الجداول اللاحقة اختيارية: إن لم تُنشأ بعد يبقى التطبيق على بذرة
           النواة لها بدل أن تفرغ الشاشات. */
        api.projects.all()
          .then(setRemoteProjects)
          .catch((e) => console.log('[Palmas] المشاريع محلية:', e.message));

        api.staff.agents()
          .then(setRemoteAgents)
          .catch((e) => console.log('[Palmas] المستشارون محليون:', e.message));

        /* أسعار الصرف تُقرأ مزامنةً في كل تنسيق سعر، فنزرعها في النواة */
        api.rates.all()
          .then((table) => {
            if (!P || !table) return;
            Object.keys(table).forEach((code) => P.Currency.setRate(code, table[code]));
            setTick((n) => n + 1);
          })
          .catch((e) => console.log('[Palmas] أسعار الصرف محلية:', e.message));

        off = api.auth.onChange(refreshAuth);
      } else if (P) {
        console.log('[Palmas] بدون سيرفر — بيانات محلية');
        off = P.API.onAuthChange(refreshAuth);
      }

      await refreshAuth();
      setReady(true);
    })();
    return () => { if (off) off(); };
  }, [refreshAuth]);

  const persist = useCallback((patch) => {
    try {
      const cur = { lang, theme, currency, ...patch };
      global.localStorage.setItem(PREFS_KEY, JSON.stringify(cur));
    } catch (e) {}
  }, [lang, theme, currency]);

  const setLang = useCallback((v) => {
    setLangState(v); persist({ lang: v });
    try { I18nManager.allowRTL(true); } catch (e) {}
  }, [persist]);
  const setTheme = useCallback((v) => { setThemeState(v); persist({ theme: v }); }, [persist]);
  const setCurrency = useCallback((v) => { setCurrencyState(v); persist({ currency: v }); }, [persist]);

  /* ---------- catalog ----------
     من السيرفر عند توفّره، ومن بذرة النواة عند تعذّره — بنفس شكل الكائنات
     في الحالتين، فالفلترة والترتيب والشاشات لا تعرف الفرق. */
  const properties = useMemo(() => {
    if (remoteProps && remoteProps.length) return remoteProps;
    const P = core(); if (!P) return [];
    return P.allProperties();
  }, [ready, tick, remoteProps]);

  const projects = useMemo(() => {
    if (remoteProjects && remoteProjects.length) return remoteProjects;
    const P = core(); if (!P) return [];
    return P.allProjects();
  }, [ready, tick, remoteProjects]);

  /* ---------- money ---------- */
  const money = useCallback((amount, fromCur) => {
    const P = core(); if (!P) return String(amount);
    const src = (fromCur || 'usd').toLowerCase();
    const target = currency === 'auto' ? src : currency;
    const val = P.Currency.convert(Number(amount) || 0, src, target);
    return P.Currency.format(Math.round(val), target, lang);
  }, [currency, lang]);

  const priceOf = useCallback((p) => {
    const s = money(p.price, p.currency);
    return p.offer === 'rent' ? `${s}/${strings(lang).monthShort}` : s;
  }, [money, lang]);

  const usdOf = useCallback((p) => {
    const P = core(); if (!P) return Number(p.price) || 0;
    return P.Currency.toUsd(p.price, p.currency || 'usd');
  }, []);

  /* ---------- favourites ---------- */
  const isFav = useCallback((id) => favs.includes(id), [favs]);
  const toggleFav = useCallback(async (id) => {
    if (!session) return { ok: false, needsAuth: true };
    const api = backend();
    try {
      if (api && isLive()) {
        const res = await api.favorites.toggle(id);
        setFavs(res.list);
        return { ok: true, added: res.added };
      }
      const P = core(); if (!P) return { ok: false, needsAuth: true };
      const res = await P.API.toggleFavorite(id);
      setFavs(res.list);
      return { ok: true, added: res.added };
    } catch (e) {
      return { ok: false, needsAuth: true };
    }
  }, [session]);

  /* ---------- auth ---------- */
  const signIn = useCallback(async (payload) => {
    const api = backend();
    if (api && isLive()) {
      const s = await api.auth.signIn(payload);
      await refreshAuth();
      return s;
    }
    const P = core(); if (!P) throw new Error('core');
    const s = await P.API.signIn({ remember: true, ...payload });
    await refreshAuth();
    return s;
  }, [refreshAuth]);

  const signUp = useCallback(async (payload) => {
    const api = backend();
    if (api && isLive()) {
      const s = await api.auth.signUp(payload);
      await refreshAuth();
      return s;
    }
    const P = core(); if (!P) throw new Error('core');
    const s = await P.API.signUp({ ...payload });
    await refreshAuth();
    return s;
  }, [refreshAuth]);

  const signOut = useCallback(async () => {
    const api = backend();
    if (api && isLive()) { await api.auth.signOut(); await refreshAuth(); return; }
    const P = core(); if (!P) return;
    await P.API.signOut();
    await refreshAuth();
  }, [refreshAuth]);

  /* ---------- requests → the same CRM stores the website writes ---------- */
  /* العملاء: إلى السيرفر ليراهم الأدمن مهما كان جهاز المُرسِل، ومحلياً عند تعذّره */
  const submitBooking = useCallback(({ propId, propName, date, time, name, phone }) => {
    const api = backend();
    if (api && isLive()) {
      api.leads.book({ propId, propName, name, phone, date, time })
        .catch((e) => console.log('[Palmas] تعذّر إرسال الحجز:', e.message));
      return;
    }
    const P = core(); if (!P) return;
    const g = (k, d) => { try { return JSON.parse(global.localStorage.getItem(k) || d); } catch (e) { return JSON.parse(d); } };
    const all = g('palmas_bookings', '[]');
    all.push({
      id: 'bk' + Date.now(), status: 'pending', pid: propId || '', pname: propName || '',
      date: date || '', dow: '', dateNum: date || '', time: time || '',
      name: name || '', phone: phone || '', by: (session && session.email) || 'guest',
      created: Date.now(), ts: Date.now(), src: 'app',
    });
    global.localStorage.setItem('palmas_bookings', JSON.stringify(all));
    setTick((n) => n + 1);
  }, [session]);

  const submitMessage = useCallback(({ name, phone, msg }) => {
    const api = backend();
    if (api && isLive()) {
      api.leads.message({ name, phone, body: msg, lang })
        .catch((e) => console.log('[Palmas] تعذّر إرسال الرسالة:', e.message));
      return;
    }
    const g = (k, d) => { try { return JSON.parse(global.localStorage.getItem(k) || d); } catch (e) { return JSON.parse(d); } };
    const all = g('palmas_crm_messages', '[]');
    all.push({ id: 'm' + Date.now(), name: name || '', phone: phone || '', msg: msg || '', lang, ts: Date.now(), src: 'app' });
    global.localStorage.setItem('palmas_crm_messages', JSON.stringify(all));
    setTick((n) => n + 1);
  }, [lang]);

  /* An owner asking to sell or rent through Palmas. Same record shape and same store
     the website's header form writes, so both arrive in the CRM as "listing" leads. */
  const submitListing = useCallback(({ name, phone, city, deal, propType, price, currency, notes }) => {
    const api = backend();
    if (api && isLive()) {
      api.leads.listing({ name, phone, city, deal, propType, price, currency, notes })
        .catch((e) => console.log('[Palmas] تعذّر إرسال الطلب:', e.message));
      return;
    }
    const g = (k, d) => { try { return JSON.parse(global.localStorage.getItem(k) || d); } catch (e) { return JSON.parse(d); } };
    const all = g('palmas_listings', '[]');
    all.push({
      id: 'lst' + Date.now(),
      name: name || '', phone: phone || '', city: city || '',
      deal: deal || 'sale', propType: propType || 'apartment',
      price: price || '', currency: currency || 'usd', notes: notes || '',
      date: new Date().toISOString().slice(0, 10), ts: Date.now(), src: 'app',
    });
    global.localStorage.setItem('palmas_listings', JSON.stringify(all));
    setTick((n) => n + 1);
  }, []);

  /* profile + password, the same service the website's Account page calls */
  const updateProfile = useCallback(async (patch) => {
    const api = backend();
    if (api && isLive()) { const s = await api.auth.updateProfile(patch); await refreshAuth(); return s; }
    const P = core(); if (!P) throw new Error('core');
    const s = await P.API.updateProfile(patch);
    await refreshAuth();
    return s;
  }, [refreshAuth]);

  const changePassword = useCallback(async (payload) => {
    const api = backend();
    if (api && isLive()) return api.auth.changePassword({ newPassword: payload.newPassword });
    const P = core(); if (!P) throw new Error('core');
    return P.API.changePassword(payload);
  }, []);

  /* ---------- helpers shared with the site ---------- */
  const L = useCallback((obj) => (obj ? (obj[lang] != null ? obj[lang] : obj.ar) : ''), [lang]);

  const labels = useMemo(() => {
    const P = core();
    return P ? P.LABELS[lang] : null;
  }, [lang, ready]);

  /* same deterministic advisor the website's property page picks — so a given
     property shows the same person in both places */
  const advisorFor = useCallback((propId) => {
    let list = remoteAgents;
    if (!list || !list.length) {
      const P = core(); if (!P) return null;
      list = P.StaffAdmin.agents();
    }
    if (!list.length) return null;
    let h = 0;
    for (const ch of String(propId)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return list[h % list.length];
  }, [remoteAgents]);

  const value = useMemo(() => ({
    ready, lang, setLang, theme, setTheme, currency, setCurrency,
    session, favs, isFav, toggleFav, signIn, signUp, signOut,
    properties, projects, money, priceOf, usdOf, L, labels, advisorFor,
    submitBooking, submitMessage, submitListing, updateProfile, changePassword,
    whatsapp: WHATSAPP,
    online,
    t: strings(lang), core,
    refreshCatalog: () => setTick((n) => n + 1),
  }), [ready, lang, setLang, theme, setTheme, currency, setCurrency, session, favs, isFav, toggleFav,
      signIn, signUp, signOut, properties, projects, money, priceOf, usdOf, L, labels, advisorFor,
      submitBooking, submitMessage, submitListing, updateProfile, changePassword, online]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside <AppProvider>');
  return v;
}
