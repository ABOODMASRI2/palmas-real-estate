import React, { useMemo, useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../store';
import { palette, BRAND, RADIUS, SPACE } from '../theme';

/**
 * The website's filter sheet, screen-shaped for mobile.
 * Field order and the conditional-visibility rules are the ones in the shared core
 * (Palmas.showBeds / showOwn / showZone) — never re-implemented here.
 */
export default function FilterSheet({ visible, filters, onApply, onClose, resultCount }) {
  const { theme, lang, t, labels, core, currency, properties } = useApp();
  const p = palette(theme);
  const P = core();
  const [f, setF] = useState(filters);
  const [open, setOpen] = useState('');
  const rtl = lang === 'ar';
  const row = rtl ? 'row-reverse' : 'row';
  const align = rtl ? 'right' : 'left';

  React.useEffect(() => { if (visible) setF(filters); }, [visible, filters]);

  const set = (patch) => setF((cur) => ({ ...cur, ...patch }));

  const countries = useMemo(() => (P ? [{ k: 'all' }].concat(P.COUNTRIES) : []), [P]);
  const cities = useMemo(() => (P ? [{ k: 'all' }].concat(P.citiesOf(f.country)) : []), [P, f.country]);

  if (!P) return null;

  const showBeds = P.showBeds(f);
  const showOwn = P.showOwn(f);
  const showZone = P.showZone(f);
  const L = labels;

  const opt = (k, label) => ({ k, label });
  const label = (dict, k) => (k === 'all' ? t.all : dict[k] || k);

  const rows = [
    { id: 'country', title: t.country, value: f.country === 'all' ? t.all : (P.countryBy(f.country) || {})[lang],
      options: countries.map((c) => opt(c.k, c.k === 'all' ? t.all : c[lang])),
      pick: (k) => set({ country: k, city: 'all' }) },
  ];

  /* the city list only means something once a country narrows it down */
  if (P.showCity(f)) {
    rows.push({ id: 'city', title: t.city, value: f.city === 'all' ? t.all : (P.cityBy(f.city) || {})[lang],
      options: cities.map((c) => opt(c.k, c.k === 'all' ? t.all : c[lang])),
      pick: (k) => set({ city: k }) });
  }

  rows.push(
    { id: 'offer', title: t.offerType, value: label(L.offer, f.offer),
      options: P.OFFERS.map((k) => opt(k, label(L.offer, k))),
      pick: (k) => set({ offer: k }) },
    { id: 'type', title: t.propType, value: label(L.type, f.type),
      options: P.TYPES.map((k) => opt(k, label(L.type, k))),
      pick: (k) => set({ type: k }) },
  );

  if (showBeds) {
    rows.push({ id: 'beds', title: t.bedrooms, value: f.beds ? `${f.beds}+` : t.any,
      options: P.BEDS.map((n) => opt(n, n ? `${n}+` : t.any)), pick: (n) => set({ beds: n }) });
    rows.push({ id: 'baths', title: t.bathrooms, value: f.baths ? `${f.baths}+` : t.any,
      options: P.BEDS.map((n) => opt(n, n ? `${n}+` : t.any)), pick: (n) => set({ baths: n }) });
  }
  if (showOwn) {
    rows.push({ id: 'own', title: t.ownership, value: label(L.own, f.own),
      options: P.OWNS.map((k) => opt(k, label(L.own, k))), pick: (k) => set({ own: k }) });
  }
  if (showZone) {
    rows.push({ id: 'zone', title: t.zoning, value: label(L.zone, f.zone),
      options: P.ZONES.map((k) => opt(k, label(L.zone, k))), pick: (k) => set({ zone: k }) });
  }

  const areaSteps = [0, 100, 150, 250, 400];

  /* The customer types prices in whatever currency they picked; "auto" has no single
     currency to type in, so it falls back to the platform's base (USD). Filters are
     always stored in USD — conversion happens here, at the edge. */
  const typeCur = currency && currency !== 'auto' ? currency : 'usd';
  const curInfo = P.Currency.meta(typeCur) || {};
  const curName = rtl ? curInfo.ar : curInfo.en;
  const toView = (usd) => Math.round(P.Currency.fromUsd(usd, typeCur));
  const toUsd = (v) => P.Currency.toUsd(Number(v) || 0, typeCur);
  const money = (usd) => P.Currency.format(toView(usd), typeCur, lang);

  /* reads back what was typed: a range, one open end, or "all" */
  const hasMin = f.minPrice > 0;
  const hasMax = isFinite(f.maxPrice);
  const priceLabel = hasMin && hasMax
    ? `${money(f.minPrice)} — ${money(f.maxPrice)}`
    : hasMin ? `${rtl ? 'من ' : 'from '}${money(f.minPrice)}`
    : hasMax ? `${rtl ? 'حتى ' : 'up to '}${money(f.maxPrice)}`
    : t.all;

  /* نفس السبب: بدون تمرير القائمة يعدّ من البذرة المحلية لا من السيرفر */
  const matches = P.filteredBy(f, properties).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: p.page }]}>
        <View style={[styles.grab, { backgroundColor: p.field }]} />
        <View style={[styles.head, { flexDirection: row }]}>
          <Text style={[styles.title, { color: p.head }]}>{t.filters}</Text>
          <Pressable onPress={() => setF(P.defaultFilters())}>
            <Text style={{ color: BRAND.main, fontWeight: '800', fontSize: 13 }}>{t.reset}</Text>
          </Pressable>
        </View>

        <ScrollView style={{ maxHeight: '68%' }} showsVerticalScrollIndicator={false}>
          {rows.map((r) => (
            <View key={r.id} style={{ marginBottom: 14 }}>
              <Text style={[styles.label, { color: p.head, textAlign: align }]}>{r.title}</Text>
              <Pressable
                onPress={() => setOpen(open === r.id ? '' : r.id)}
                style={[styles.field, { flexDirection: row, backgroundColor: p.card, borderColor: p.field }]}
              >
                <Text style={{ color: p.head, fontWeight: '700', fontSize: 14 }}>{r.value}</Text>
                <Ionicons name={open === r.id ? 'chevron-up' : 'chevron-down'} size={16} color={p.muted} />
              </Pressable>
              {open === r.id ? (
                <View style={[styles.options, { backgroundColor: p.card, borderColor: p.field }]}>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 198 }}>
                    {r.options.map((o) => {
                      const active = String(f[r.id]) === String(o.k);
                      return (
                        <Pressable
                          key={String(o.k)}
                          onPress={() => { r.pick(o.k); setOpen(''); }}
                          style={[styles.option, { flexDirection: row, borderBottomColor: p.hair, backgroundColor: active ? p.inset : 'transparent' }]}
                        >
                          <Text style={{ flex: 1, textAlign: align, color: active ? BRAND.main : p.ink, fontWeight: active ? '800' : '600', fontSize: 13.5 }}>{o.label}</Text>
                          {active ? <Ionicons name="checkmark" size={15} color={BRAND.main} /> : null}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          ))}

          {/* Typed in the customer's own currency, stored in USD. Empty boxes mean no
              bound at all — an empty ceiling is Infinity, not a hidden cap. */}
          <View style={[styles.rowBetween, { flexDirection: row }]}>
            <Text style={[styles.label, { color: p.head, textAlign: align, marginBottom: 0 }]}>
              {t.priceRange} ({curName})
            </Text>
            <Text style={{ color: BRAND.main, fontSize: 12.5, fontWeight: '800' }}>{priceLabel}</Text>
          </View>
          <View style={[styles.priceRow, { flexDirection: row }]}>
            <TextInput
              value={hasMin ? String(toView(f.minPrice)) : ''}
              onChangeText={(v) => {
                const digits = v.replace(/[^0-9]/g, '');
                set({ minPrice: digits === '' ? 0 : toUsd(digits) });
              }}
              keyboardType="number-pad"
              placeholder={t.priceFrom}
              placeholderTextColor={p.muted}
              style={[styles.priceInput, { backgroundColor: p.card, borderColor: p.field, color: p.head, textAlign: align }]}
            />
            <Text style={{ color: p.muted, fontWeight: '800' }}>—</Text>
            <TextInput
              value={hasMax ? String(toView(f.maxPrice)) : ''}
              onChangeText={(v) => {
                const digits = v.replace(/[^0-9]/g, '');
                set({ maxPrice: digits === '' ? Infinity : toUsd(digits) });
              }}
              keyboardType="number-pad"
              placeholder={t.priceTo}
              placeholderTextColor={p.muted}
              style={[styles.priceInput, { backgroundColor: p.card, borderColor: p.field, color: p.head, textAlign: align }]}
            />
          </View>
          <Text style={{ color: p.muted, fontSize: 11.5, marginTop: 7, textAlign: align }}>{t.priceHint}</Text>

          <Text style={[styles.label, { color: p.head, textAlign: align, marginTop: 16 }]}>{t.minArea}</Text>
          <View style={[styles.quick, { flexDirection: row }]}>
            {areaSteps.map((v) => {
              const on = f.minArea === v;
              return (
                <Pressable
                  key={v}
                  onPress={() => set({ minArea: v })}
                  style={[styles.qChip, { backgroundColor: on ? BRAND.main : p.card, borderColor: on ? BRAND.main : p.field }]}
                >
                  <Text style={{ color: on ? '#fff' : p.ink, fontSize: 12.5, fontWeight: '800' }}>
                    {v === 0 ? t.all : `${v}+ ${L.sqm}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <Pressable onPress={() => onApply(f)} style={[styles.apply, { backgroundColor: BRAND.main }]}>
          <Text style={styles.applyTxt}>{t.apply(matches)}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(6,6,10,0.5)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '86%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: SPACE.gutter, paddingTop: SPACE.sm, paddingBottom: SPACE.xl + 4 },
  grab: { width: 42, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 12 },
  head: { alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 20, lineHeight: 31, fontWeight: '900', letterSpacing: -0.3 },
  label: { fontSize: 13, lineHeight: 20, fontWeight: '800', marginBottom: 6 },
  field: { height: 52, borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'space-between' },
  options: { marginTop: 8, borderRadius: RADIUS.md, borderWidth: 1, overflow: 'hidden' },
  rowBetween: { alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  priceRow: { alignItems: 'center', gap: 10 },
  priceInput: { flex: 1, height: 50, borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: 14, fontSize: 14.5, fontWeight: '700' },
  quick: { flexWrap: 'wrap', gap: 7 },
  qChip: { paddingHorizontal: SPACE.md, height: 44, borderRadius: RADIUS.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  option: { paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 1, alignItems: 'center', justifyContent: 'space-between' },
  apply: { height: 54, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  applyTxt: { color: '#fff', fontWeight: '800', fontSize: 15.5 },
});
