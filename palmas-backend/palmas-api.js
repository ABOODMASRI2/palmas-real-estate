/**
 * Palmas — طبقة الوصول للبيانات (المرحلة الأولى: الحسابات والعقارات)
 *
 * هذا هو الملف الوحيد الذي يعرف أن هناك سيرفر. الموقع والتطبيق يستدعيان نفس الدوال
 * بنفس الأسماء التي كانت في palmas-core.js، فلا تتغيّر أي شاشة.
 *
 * الصفوف القادمة من قاعدة البيانات تُحوَّل هنا إلى نفس شكل الكائن الذي تتوقّعه
 * الواجهات (name/loc/desc ثنائية اللغة، cityKey بدل city_key…) حتى تبقى الفلترة
 * والترتيب والعملات تعمل حرفياً كما هي.
 *
 * الاستعمال:
 *   const api = createPalmasApi({ url, anonKey, storage });
 */

/* ------------------------------------------------------------------ mapping */

/** صف قاعدة البيانات -> الشكل الذي تعرفه الواجهات */
function rowToProperty(r) {
  return {
    id: r.id,
    name: r.name,
    loc: r.loc,
    country: r.country,
    cityKey: r.city_key,
    type: r.type,
    offer: r.offer,
    price: Number(r.price) || 0,
    currency: r.currency || 'usd',
    rooms: r.rooms || 0,
    baths: r.baths || 0,
    area: Number(r.area) || 0,
    lat: r.lat,
    lng: r.lng,
    ownership: r.ownership || 'tabu',
    zone: r.zone || '',
    floor: r.floor,
    year: r.year,
    parking: !!r.parking,
    exc: !!r.exc,
    desc: r.descr || { ar: '', en: '' },
    features: r.features || { ar: [], en: [] },
    photos: r.photos || [],
    slot: 'pp-' + r.id,        // نفس الاسم الذي تولّده النواة، فالصور تُعثر عليها
  };
}

/** صف مشروع -> الشكل الذي تعرفه الواجهات */
function rowToProject(r) {
  return {
    id: r.id,
    name: r.name,
    loc: r.loc,
    country: r.country,
    cityKey: r.city_key,
    kind: r.kind,
    state: r.state,
    progress: Number(r.progress) || 0,
    price: Number(r.price) || 0,
    currency: r.currency || 'usd',
    desc: r.descr || { ar: '', en: '' },
    stats: r.stats || [],
    lat: r.lat,
    lng: r.lng,
    photos: r.photos || [],
    slot: 'prj-' + r.id,
  };
}

/** الشكل الذي تعرفه الواجهات -> صف مشروع */
function projectToRow(p) {
  return {
    id: p.id,
    name: p.name,
    loc: p.loc,
    country: p.country || 'ps',
    city_key: p.cityKey || '',
    kind: p.kind || 'residential',
    state: p.state || 'ongoing',
    progress: Number(p.progress) || 0,
    price: Number(p.price) || 0,
    currency: p.currency || 'usd',
    descr: p.desc || { ar: '', en: '' },
    stats: p.stats || [],
    lat: p.lat ?? null,
    lng: p.lng ?? null,
    photos: p.photos || [],
  };
}

/** الشكل الذي تعرفه الواجهات -> صف قاعدة البيانات */
function propertyToRow(p) {
  return {
    id: p.id,
    name: p.name,
    loc: p.loc,
    country: p.country,
    city_key: p.cityKey,
    type: p.type,
    offer: p.offer,
    price: Number(p.price) || 0,
    currency: p.currency || 'usd',
    rooms: p.rooms || 0,
    baths: p.baths || 0,
    area: Number(p.area) || 0,
    lat: p.lat ?? null,
    lng: p.lng ?? null,
    ownership: p.ownership || 'tabu',
    zone: p.zone || '',
    floor: p.floor ?? null,
    year: p.year ?? null,
    parking: !!p.parking,
    exc: !!p.exc,
    descr: p.desc || { ar: '', en: '' },
    features: p.features || { ar: [], en: [] },
    photos: p.photos || [],
  };
}

/* --------------------------------------------------------------- the client */

export function createPalmasApi({ client }) {
  if (!client) throw new Error('createPalmasApi: a Supabase client is required');

  /* ---------------------------------------------------------- الحسابات */

  async function profileOf(user) {
    if (!user) return null;
    const { data } = await client
      .from('profiles')
      .select('name, phone, role')
      .eq('id', user.id)
      .maybeSingle();
    return {
      loggedIn: true,
      id: user.id,
      email: user.email || '',
      name: (data && data.name) || '',
      phone: (data && data.phone) || user.phone || '',
      role: (data && data.role) || 'customer',
    };
  }

  const auth = {
    /** الجلسة الحالية، أو null */
    async session() {
      const { data } = await client.auth.getUser();
      return profileOf(data && data.user);
    },

    /** يستدعي fn عند كل تغيّر بالحساب، ويرجّع دالة لإلغاء الاشتراك */
    onChange(fn) {
      const { data } = client.auth.onAuthStateChange(async () => {
        fn(await auth.session());
      });
      return () => data.subscription.unsubscribe();
    },

    async signUp({ identifier, password, name, phone, method }) {
      const payload = method === 'phone'
        ? { phone: identifier, password, options: { data: { name, phone: identifier } } }
        : { email: identifier, password, options: { data: { name, phone: phone || '' } } };
      const { data, error } = await client.auth.signUp(payload);
      if (error) throw error;
      return profileOf(data.user);
    },

    async signIn({ identifier, password, method }) {
      const payload = method === 'phone'
        ? { phone: identifier, password }
        : { email: identifier, password };
      const { data, error } = await client.auth.signInWithPassword(payload);
      if (error) throw error;
      return profileOf(data.user);
    },

    async signOut() {
      await client.auth.signOut();
      return null;
    },

    /** يرسل رابط/رمز الاستعادة — Supabase يتكفّل بالبريد */
    async requestReset(identifier) {
      const { error } = await client.auth.resetPasswordForEmail(identifier);
      if (error) throw error;
      return true;
    },

    /** يستعمل بعد أن يفتح المستخدم رابط الاستعادة */
    async setPassword(newPassword) {
      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return true;
    },

    async changePassword({ newPassword }) {
      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return true;
    },

    async updateProfile({ name, phone, email }) {
      const { data: u } = await client.auth.getUser();
      if (!u || !u.user) throw new Error('not signed in');
      if (email && email !== u.user.email) {
        const { error } = await client.auth.updateUser({ email });
        if (error) throw error;
      }
      const { error } = await client
        .from('profiles')
        .update({ name: name || '', phone: phone || '' })
        .eq('id', u.user.id);
      if (error) throw error;
      return auth.session();
    },
  };

  /* ---------------------------------------------------------- العقارات */

  const properties = {
    /** كل العقارات المنشورة */
    async all() {
      const { data, error } = await client
        .from('properties')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(rowToProperty);
    },

    async byId(id) {
      const { data, error } = await client.from('properties').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data ? rowToProperty(data) : null;
    },

    /* --- إدارة (تنجح فقط لحساب أدمن، تفرضه سياسات RLS) --- */
    async add(prop) {
      const { data, error } = await client.from('properties').insert(propertyToRow(prop)).select().single();
      if (error) throw error;
      return rowToProperty(data);
    },

    async update(id, patch) {
      const row = propertyToRow({ ...patch, id });
      delete row.id;
      const { data, error } = await client.from('properties').update(row).eq('id', id).select().single();
      if (error) throw error;
      return rowToProperty(data);
    },

    async remove(id) {
      const { error } = await client.from('properties').delete().eq('id', id);
      if (error) throw error;
      return true;
    },

    /** إخفاء العقار عن الزوّار دون حذفه */
    async setPublished(id, published) {
      const { error } = await client.from('properties').update({ published: !!published }).eq('id', id);
      if (error) throw error;
      return true;
    },

    /** كل العقارات بما فيها المخفيّة — للأدمن فقط (RLS يفرض ذلك) */
    async allForAdmin() {
      const { data, error } = await client
        .from('properties').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(rowToProperty);
    },
  };

  /* --------------------------------------------------------- المشاريع */

  const projects = {
    async all() {
      const { data, error } = await client
        .from('projects').select('*').eq('published', true).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(rowToProject);
    },

    async byId(id) {
      const { data, error } = await client.from('projects').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data ? rowToProject(data) : null;
    },

    async add(proj) {
      const { data, error } = await client.from('projects').insert(projectToRow(proj)).select().single();
      if (error) throw error;
      return rowToProject(data);
    },

    async update(id, patch) {
      const row = projectToRow({ ...patch, id });
      delete row.id;
      const { data, error } = await client.from('projects').update(row).eq('id', id).select().single();
      if (error) throw error;
      return rowToProject(data);
    },

    async remove(id) {
      const { error } = await client.from('projects').delete().eq('id', id);
      if (error) throw error;
      return true;
    },
  };

  /* --------------------------------------------------------- الموظفون */

  const staff = {
    /**
     * المستشارون المعروضون للزوّار — يقرأ من نافذة agents، فلا يصل الراتب
     * إلى المتصفّح أصلاً.
     */
    async agents() {
      const { data, error } = await client.from('agents').select('*').order('id');
      if (error) throw error;
      return data || [];
    },

    /** السجلّ الكامل بالرواتب — الأدمن وحده، تفرضه سياسات RLS */
    async all() {
      const { data, error } = await client.from('staff').select('*').order('id');
      if (error) throw error;
      return data || [];
    },

    async add(member) {
      const { data, error } = await client.from('staff').insert({
        id: member.id,
        name: member.name,
        role: member.role || { ar: '', en: '' },
        phone: member.phone || '',
        salary: Number(member.salary) || 0,
        status: member.status || 'full',
        agent: member.agent !== false,
        color: member.color || '#f68743',
      }).select().single();
      if (error) throw error;
      return data;
    },

    async remove(id) {
      const { error } = await client.from('staff').delete().eq('id', id);
      if (error) throw error;
      return true;
    },
  };

  /* ----------------------------------------------------- أسعار الصرف */

  const rates = {
    /** { usd: 1, ils: 3.65, … } بنفس شكل جدول الأسعار في النواة */
    async all() {
      const { data, error } = await client.from('currency_rates').select('code, rate');
      if (error) throw error;
      const out = {};
      (data || []).forEach((r) => { out[r.code] = Number(r.rate); });
      return out;
    },

    /** تحديث سعر عملة — الأدمن فقط */
    async set(code, rate) {
      const { error } = await client
        .from('currency_rates')
        .upsert({ code, rate: Number(rate), updated_at: new Date().toISOString() });
      if (error) throw error;
      return true;
    },
  };

  /* ------------------------------------------------- الدفاتر المالية (ERP)
     الأسماء والحقول هي نفسها التي تكتبها صفحة ERP في تخزين المتصفّح اليوم،
     فتنتقل الدفاتر إلى السيرفر دون تغيير شكل أي سجل. */

  const erp = {
    /** الفواتير المضافة يدوياً */
    async invoices() {
      const { data, error } = await client
        .from('invoices').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map((r) => ({
        no: r.no, client: r.client, item: r.item,
        amount: Number(r.amount) || 0, due: r.due || '',
        propId: r.property_id || '', dealType: r.deal_type || 'sale',
      }));
    },

    async addInvoice(inv) {
      const { error } = await client.from('invoices').insert({
        no: inv.no,
        client: inv.client || '',
        item: inv.item || '',
        amount: Number(inv.amount) || 0,
        due: inv.due || '',
        property_id: inv.propId || null,
        deal_type: inv.dealType || 'sale',
      });
      if (error) throw error;
      return true;
    },

    async removeInvoice(no) {
      const { error } = await client.from('invoices').delete().eq('no', no);
      if (error) throw error;
      return true;
    },

    /** { 'INV-2001': '2026-09-06', … } — نفس شكل خريطة السداد في الصفحة */
    async payments() {
      const { data, error } = await client.from('invoice_payments').select('*');
      if (error) throw error;
      const out = {};
      (data || []).forEach((r) => { out[r.no] = r.paid_on; });
      return out;
    },

    async markPaid(no, day) {
      const { error } = await client.from('invoice_payments')
        .upsert({ no, paid_on: day || new Date().toISOString().slice(0, 10) });
      if (error) throw error;
      return true;
    },

    async expenses() {
      const { data, error } = await client
        .from('expenses').select('*').order('spent_on', { ascending: false });
      if (error) throw error;
      return (data || []).map((r) => ({
        id: r.id, desc: r.descr, cat: r.cat,
        amount: Number(r.amount) || 0, date: r.spent_on,
      }));
    },

    async addExpense(x) {
      const { error } = await client.from('expenses').insert({
        id: x.id, descr: x.desc || '', cat: x.cat || 'other',
        amount: Number(x.amount) || 0,
        spent_on: x.date || new Date().toISOString().slice(0, 10),
      });
      if (error) throw error;
      return true;
    },

    async removeExpense(id) {
      const { error } = await client.from('expenses').delete().eq('id', id);
      if (error) throw error;
      return true;
    },

    /** مفاتيح العملاء الذين أُخفيت فواتيرهم الآلية */
    async dismissed() {
      const { data, error } = await client.from('erp_dismissed').select('lead_key');
      if (error) throw error;
      return (data || []).map((r) => r.lead_key);
    },

    async dismiss(leadKey) {
      const { error } = await client.from('erp_dismissed').upsert({ lead_key: leadKey });
      if (error) throw error;
      return true;
    },
  };

  /* -------------------------------------------------------------- الصور */

  const BUCKET = 'property-photos';

  const photos = {
    /**
     * يرفع صورة ويعيد رابطها العام.
     * file: ملف من input (الموقع) أو { uri, name, type } (التطبيق).
     */
    async upload(propertyId, file) {
      const ext = (file.name || file.uri || 'jpg').split('.').pop().split('?')[0].toLowerCase();
      const path = `${propertyId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      let body = file;
      if (file.uri && !file.size) {
        // React Native: الملف يصل كمسار محلي، فنقرأه كـ blob
        const res = await fetch(file.uri);
        body = await res.blob();
      }

      const { error } = await client.storage.from(BUCKET).upload(path, body, {
        contentType: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        upsert: false,
      });
      if (error) throw error;

      const { data } = client.storage.from(BUCKET).getPublicUrl(path);
      return data.publicUrl;
    },

    /** يضيف الرابط إلى قائمة صور العقار */
    async attach(propertyId, url) {
      const { data: row, error: e1 } = await client
        .from('properties').select('photos').eq('id', propertyId).single();
      if (e1) throw e1;
      const next = (row.photos || []).concat([url]);
      const { error } = await client.from('properties').update({ photos: next }).eq('id', propertyId);
      if (error) throw error;
      return next;
    },

    /** يحذف الرابط من العقار ويزيل الملف من المخزن */
    async remove(propertyId, url) {
      const { data: row, error: e1 } = await client
        .from('properties').select('photos').eq('id', propertyId).single();
      if (e1) throw e1;
      const next = (row.photos || []).filter((u) => u !== url);
      const { error } = await client.from('properties').update({ photos: next }).eq('id', propertyId);
      if (error) throw error;

      const marker = `/${BUCKET}/`;
      const at = url.indexOf(marker);
      if (at !== -1) {
        await client.storage.from(BUCKET).remove([url.slice(at + marker.length)]).catch(() => {});
      }
      return next;
    },

    /** يعيد ترتيب الصور — الأولى هي صورة الغلاف */
    async reorder(propertyId, urls) {
      const { error } = await client.from('properties').update({ photos: urls }).eq('id', propertyId);
      if (error) throw error;
      return urls;
    },
  };

  /* ---------------------------------------------------------- المفضلة */

  const favorites = {
    async list() {
      const { data: u } = await client.auth.getUser();
      if (!u || !u.user) return [];
      const { data, error } = await client.from('favorites').select('property_id').eq('user_id', u.user.id);
      if (error) throw error;
      return (data || []).map((r) => r.property_id);
    },

    /** يضيف أو يزيل، ويرجّع { added, list } كما كانت الواجهات تتوقّع */
    async toggle(propertyId) {
      const { data: u } = await client.auth.getUser();
      if (!u || !u.user) throw new Error('not signed in');
      const uid = u.user.id;

      const { data: existing } = await client
        .from('favorites')
        .select('property_id')
        .eq('user_id', uid)
        .eq('property_id', propertyId)
        .maybeSingle();

      if (existing) {
        const { error } = await client.from('favorites').delete().eq('user_id', uid).eq('property_id', propertyId);
        if (error) throw error;
      } else {
        const { error } = await client.from('favorites').insert({ user_id: uid, property_id: propertyId });
        if (error) throw error;
      }
      return { added: !existing, list: await favorites.list() };
    },
  };

  /* ------------------------------------------------------------ العملاء */

  /** يربط الطلب بصاحبه إن كان مسجّلاً — وإلا يُقبل بلا حساب */
  async function currentUserId() {
    try {
      const { data } = await client.auth.getUser();
      return data && data.user ? data.user.id : null;
    } catch (e) { return null; }
  }

  const leads = {
    /** حجز معاينة */
    async book({ propId, propName, name, phone, date, time }) {
      const { error } = await client.from('bookings').insert({
        user_id: await currentUserId(),
        property_id: propId || null,
        prop_name: propName || '',
        name: name || '', phone: phone || '',
        visit_date: date || '', visit_time: time || '',
        source: 'app',
      });
      if (error) throw error;
      return true;
    },

    /** رسالة من نموذج التواصل */
    async message({ name, phone, body, lang }) {
      const { error } = await client.from('messages').insert({
        user_id: await currentUserId(),
        name: name || '', phone: phone || '',
        body: body || '', lang: lang || 'ar',
        source: 'app',
      });
      if (error) throw error;
      return true;
    },

    /** طلب عرض عقار من مالك */
    async listing({ name, phone, city, deal, propType, price, currency, notes }) {
      const { error } = await client.from('listings').insert({
        user_id: await currentUserId(),
        name: name || '', phone: phone || '', city: city || '',
        deal: deal || 'sale', prop_type: propType || 'apartment',
        price: String(price || ''), currency: currency || 'usd',
        notes: notes || '',
        source: 'app',
      });
      if (error) throw error;
      return true;
    },

    /* --- للأدمن: القراءة تُرفض لغير الأدمن بحكم سياسات RLS --- */
    async all() {
      const [b, m, l] = await Promise.all([
        client.from('bookings').select('*').order('created_at', { ascending: false }),
        client.from('messages').select('*').order('created_at', { ascending: false }),
        client.from('listings').select('*').order('created_at', { ascending: false }),
      ]);
      return {
        bookings: b.data || [],
        messages: m.data || [],
        listings: l.data || [],
      };
    },
  };

  return {
    auth, properties, projects, staff, rates, erp, favorites, leads, photos,
    raw: client,
    rowToProperty, propertyToRow, rowToProject, projectToRow,
  };
}

export default createPalmasApi;
