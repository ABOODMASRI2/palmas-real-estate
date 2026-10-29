import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../store';
import { palette, BRAND, RADIUS, TYPE, SPACE } from '../theme';
import PropertyCard from '../components/PropertyCard';
import FilterSheet from '../components/FilterSheet';

/* the two control heights this screen is built on */
const CONTROL = 40;
const INPUT = 50;

/**
 * The website's property list, screen-for-screen: kicker + category heading, the offer
 * tabs, search with a filter button, removable chips for every active filter, the result
 * count with sort and grid/list toggles, and the same empty state.
 *
 * Every decision (what matches, how it sorts, which filter fields apply) comes from
 * palmas-core, so the app and the site can never disagree about results.
 */
export default function ExploreScreen({ navigation, route }) {
  const { theme, lang, t, labels, core, ready, currency, properties } = useApp();
  const p = palette(theme);
  const insets = useSafeAreaInsets();
  const P = core();
  const rtl = lang === 'ar';
  const row = rtl ? 'row-reverse' : 'row';
  const align = rtl ? 'right' : 'left';

  const [filters, setFilters] = useState(null);
  const [q, setQ] = useState('');
  const [sheet, setSheet] = useState(false);
  const [sort, setSort] = useState('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [grid, setGrid] = useState(true);

  /* presets arrive from the home screen's search box and shortcut chips */
  useEffect(() => {
    if (!P) return;
    const base = P.defaultFilters();
    const pr = route?.params || {};
    if (pr.presetType) base.type = pr.presetType;
    /* a preset city carries its country with it, otherwise the city field would be
       hidden (country = all) while still silently filtering the results */
    if (pr.presetCity) {
      const c = P.cityBy(pr.presetCity);
      if (c) { base.city = pr.presetCity; base.country = c.c; }
    }
    if (pr.presetOffer) base.offer = pr.presetOffer;
    setFilters(base);
    if (pr.presetQuery) setQ(pr.presetQuery);
  }, [P, ready, route?.params]);

  /* تُمرَّر قائمة العقارات صراحةً: بدونها ترجع النواة إلى بذرتها المحلية
     وتتجاهل ما جاء من السيرفر. */
  const results = useMemo(() => {
    if (!P || !filters) return [];
    return P.sortList(P.searchIn(P.filteredBy(filters, properties), q, lang), sort);
  }, [P, filters, q, lang, sort, properties]);

  const setF = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const hasFilters = P && filters ? P.hasFilters(filters, q) : false;

  /* ---- offer tabs, same order and labels as the site ---- */
  const tabs = useMemo(() => {
    if (!P || !labels || !filters) return [];
    return P.OFFERS.map((k) => ({
      k,
      label: k === 'all' ? labels.all : labels.offer[k],
      active: filters.offer === k,
    }));
  }, [P, labels, filters]);

  const catName = !filters || filters.offer === 'all' ? t.catAll : (labels ? labels.offer[filters.offer] : '');

  /* ---- one removable chip per active filter ---- */
  const chips = useMemo(() => {
    if (!P || !labels || !filters) return [];
    const f = filters;
    const out = [];
    const add = (cond, label, undo) => { if (cond && label) out.push({ label, undo }); };
    add(f.country !== 'all', (P.countryBy(f.country) || {})[lang], () => setF({ country: 'all', city: 'all' }));
    add(f.city !== 'all', (P.cityBy(f.city) || {})[lang], () => setF({ city: 'all' }));
    add(f.offer !== 'all', labels.offer[f.offer], () => setF({ offer: 'all' }));
    add(f.type !== 'all', labels.type[f.type], () => setF({ type: 'all' }));
    add(f.own !== 'all', labels.own[f.own], () => setF({ own: 'all' }));
    add(f.zone !== 'all', labels.zone[f.zone], () => setF({ zone: 'all' }));
    add(f.beds > 0, `${f.beds}+ ${labels.rooms}`, () => setF({ beds: 0 }));
    add(f.baths > 0, `${f.baths}+ ${labels.bath}`, () => setF({ baths: 0 }));
    /* chips read in the customer's currency, the same one the filter sheet types in */
    const tc = currency && currency !== 'auto' ? currency : 'usd';
    const asCur = (usd) => P.Currency.format(Math.round(P.Currency.fromUsd(usd, tc)), tc, lang);
    add(f.minPrice > 0, `≥ ${asCur(f.minPrice)}`, () => setF({ minPrice: 0 }));
    add(isFinite(f.maxPrice), `≤ ${asCur(f.maxPrice)}`, () => setF({ maxPrice: Infinity }));
    add(f.minArea > 0, `${f.minArea} ${labels.sqm}+`, () => setF({ minArea: 0 }));
    if (q.trim()) out.push({ label: `“${q.trim()}”`, undo: () => setQ('') });
    return out;
  }, [P, labels, filters, lang, q, currency]);

  const sorts = useMemo(
    () => (P && labels ? P.SORTS.map((k) => ({ k, l: labels.sort[k] })) : []),
    [P, labels]
  );

  const clearAll = () => { setFilters(P.defaultFilters()); setQ(''); };

  if (!P || !filters || !labels) return <View style={{ flex: 1, backgroundColor: p.page }} />;

  /* The whole filter block rides inside the list header, so it scrolls away with the
     results instead of sitting frozen above them. Passing it as an element (not a
     component function) keeps the search field from remounting and losing focus. */
  const header = (
    /* escape the grid's 11px gutter so the header keeps the page's own 16px edge */
    <View style={{ marginHorizontal: -SPACE.gridGutter }}>
      {/* ---- heading ---- */}
      <View style={{ paddingHorizontal: SPACE.gutter, marginBottom: SPACE.sm }}>
        <Text style={[styles.kicker, { textAlign: align }]}>{t.navExplore}</Text>
        <Text numberOfLines={1} style={[styles.title, { color: p.head, textAlign: align }]}>{catName}</Text>
      </View>

      {/* ---- offer tabs ----
           `inverted` (not row-reverse) does RTL order here: row-reverse on a horizontal
           content container breaks width measurement and squashes the labels. */}
      <FlatList
        data={tabs}
        keyExtractor={(tb) => tb.k}
        horizontal
        inverted={rtl}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        renderItem={({ item: tb }) => (
          <Pressable
            onPress={() => setF({ offer: tb.k })}
            style={[
              styles.tab,
              tb.active
                ? { backgroundColor: BRAND.main, borderColor: BRAND.main }
                : { backgroundColor: p.card, borderColor: p.hair },
            ]}
          >
            {/* Arabic glyphs get clipped without an explicit lineHeight */}
            <Text numberOfLines={1} style={{ color: tb.active ? '#fff' : p.ink, fontWeight: '800', fontSize: 12.5, lineHeight: 20 }}>{tb.label}</Text>
          </Pressable>
        )}
      />

      {/* ---- search + filters ---- */}
      <View style={[styles.topRow, { flexDirection: row }]}>
        <View style={[styles.search, { flexDirection: row, backgroundColor: p.card, borderColor: p.hair }]}>
          <Ionicons name="search" size={17} color={p.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t.searchPh}
            placeholderTextColor={p.muted}
            style={{ flex: 1, color: p.head, fontSize: 14, paddingVertical: 0, textAlign: align }}
          />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={p.muted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable onPress={() => setSheet(true)} style={[styles.iconBtn, { backgroundColor: p.card, borderColor: p.hair }]}>
          <Ionicons name="options-outline" size={20} color={p.head} />
          {hasFilters ? <View style={[styles.dot, { backgroundColor: BRAND.main, borderColor: p.page }]} /> : null}
        </Pressable>
      </View>

      {/* ---- active filter chips ---- */}
      {chips.length ? (
        <FlatList
          data={chips.concat([{ label: labels.clear, undo: clearAll, isClear: true }])}
          keyExtractor={(ch, i) => `${ch.label}-${i}`}
          horizontal
          inverted={rtl}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          renderItem={({ item: ch }) => (
            <Pressable
              onPress={ch.undo}
              style={[
                styles.chip,
                { flexDirection: row },
                ch.isClear
                  ? { backgroundColor: 'rgba(246,135,67,0.12)', borderColor: 'rgba(246,135,67,0.35)' }
                  : { backgroundColor: p.card, borderColor: p.hair },
              ]}
            >
              <Text numberOfLines={1} style={{ color: ch.isClear ? BRAND.deep : p.ink, fontSize: 12, lineHeight: 19, fontWeight: ch.isClear ? '800' : '700' }}>
                {ch.label}
              </Text>
              {ch.isClear ? null : <Ionicons name="close" size={13} color={p.muted} />}
            </Pressable>
          )}
        />
      ) : null}

      {/* ---- count + sort + view ---- */}
      <View style={[styles.metaRow, { flexDirection: row }]}>
        <Text style={[TYPE.title, { color: p.head, fontSize: 14, flex: 1, textAlign: align }]}>
          {results.length} {labels.results}
        </Text>
        <View style={{ flexDirection: row, gap: 8 }}>
          <Pressable onPress={() => setSortOpen(!sortOpen)} style={[styles.smallBtn, { flexDirection: row, backgroundColor: p.card, borderColor: p.hair }]}>
            <Ionicons name="swap-vertical-outline" size={14} color={p.head} />
            <Text style={{ color: p.head, fontSize: 12, fontWeight: '700' }}>{labels.sort[sort]}</Text>
          </Pressable>
          <Pressable onPress={() => setGrid(!grid)} style={[styles.smallBtn, { backgroundColor: p.card, borderColor: p.hair }]}>
            <Ionicons name={grid ? 'list-outline' : 'grid-outline'} size={15} color={p.head} />
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: p.page, paddingTop: insets.top + SPACE.sm }}>
      {/* ---- results ---- */}
      <FlatList
        key={grid ? 'g' : 'l'}
        data={results}
        keyExtractor={(i) => i.id}
        numColumns={grid ? 2 : 1}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingHorizontal: SPACE.gridGutter, paddingBottom: SPACE.xl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <PropertyCard
            item={item}
            layout={grid ? 'grid' : 'list'}
            onPress={() => navigation.navigate('Property', { id: item.id })}
            onNeedsAuth={() => navigation.navigate('Auth')}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyCircle, { backgroundColor: 'rgba(246,135,67,0.12)' }]}>
              <Ionicons name="home-outline" size={34} color={BRAND.main} />
            </View>
            <Text style={{ color: p.head, fontWeight: '900', fontSize: 18, marginTop: 14 }}>{labels.noResults}</Text>
            <Text style={{ color: p.muted, fontSize: 13.5, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>{labels.noResultsSub}</Text>
            <Pressable onPress={clearAll} style={[styles.clear, { backgroundColor: BRAND.main }]}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13.5 }}>{labels.clear}</Text>
            </Pressable>
          </View>
        }
      />

      <FilterSheet
        visible={sheet}
        filters={filters}
        onApply={(f) => { setFilters(f); setSheet(false); }}
        onClose={() => setSheet(false)}
      />

      {/* Sort is a sheet, not a menu pinned to a coordinate — the button it belongs to
          now scrolls with the list, so there is nothing fixed to anchor a menu to. */}
      <Modal visible={sortOpen} transparent animationType="slide" onRequestClose={() => setSortOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSortOpen(false)} />
        <View style={[styles.sortSheet, { backgroundColor: p.page, paddingBottom: insets.bottom + SPACE.lg }]}>
          <View style={[styles.grab, { backgroundColor: p.field }]} />
          <Text style={[TYPE.h2, { color: p.head, textAlign: align, marginBottom: SPACE.md }]}>{t.sortBy}</Text>
          {sorts.map((s) => {
            const on = sort === s.k;
            return (
              <Pressable
                key={s.k}
                onPress={() => { setSort(s.k); setSortOpen(false); }}
                style={[styles.sortItem, { flexDirection: row, borderBottomColor: p.hair, backgroundColor: on ? p.inset : 'transparent' }]}
              >
                <Text style={{ flex: 1, textAlign: align, color: on ? BRAND.main : p.ink, fontWeight: on ? '800' : '600', fontSize: 14, lineHeight: 22 }}>
                  {s.l}
                </Text>
                {on ? <Ionicons name="checkmark" size={17} color={BRAND.main} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { color: BRAND.main, fontSize: 11, lineHeight: 17, fontWeight: '800', letterSpacing: 0.6, marginBottom: 1 },
  title: { fontSize: 20, lineHeight: 31, fontWeight: '900', letterSpacing: -0.4 },

  /* Two control heights only: CONTROL for every pill and button, INPUT for the search
     field. Three different heights stacked is what made this screen look unaligned. */
  /* tuned so all five offer tabs fit on a phone without the last one being clipped */
  tabs: { paddingHorizontal: SPACE.gutter, gap: SPACE.xs, paddingTop: 2, paddingBottom: SPACE.md, alignItems: 'center' },
  tab: { paddingHorizontal: SPACE.md - 2, height: CONTROL, justifyContent: 'center', borderRadius: RADIUS.pill, borderWidth: 1 },

  topRow: { alignItems: 'center', gap: SPACE.sm, paddingHorizontal: SPACE.gutter },
  search: { flex: 1, alignItems: 'center', gap: SPACE.sm, height: INPUT, borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: SPACE.md },
  iconBtn: { width: INPUT, height: INPUT, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: -3, insetInlineEnd: -3, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },

  chips: { paddingHorizontal: SPACE.gutter, gap: SPACE.xs, paddingTop: SPACE.md },
  chip: { alignItems: 'center', gap: SPACE.xs, paddingHorizontal: SPACE.md, height: CONTROL, borderRadius: RADIUS.pill, borderWidth: 1 },

  metaRow: { alignItems: 'center', paddingHorizontal: SPACE.gutter, paddingVertical: SPACE.md },
  smallBtn: { alignItems: 'center', gap: SPACE.xs, paddingHorizontal: SPACE.md, height: CONTROL, minWidth: CONTROL, borderRadius: RADIUS.sm, borderWidth: 1, justifyContent: 'center' },

  backdrop: { flex: 1, backgroundColor: 'rgba(6,6,10,0.5)' },
  sortSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: SPACE.gutter, paddingTop: SPACE.sm },
  grab: { width: 42, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: SPACE.md },
  sortItem: { alignItems: 'center', gap: SPACE.sm, paddingHorizontal: SPACE.xs, minHeight: 52, borderBottomWidth: 1 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE.xxl, paddingTop: 60 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  clear: { marginTop: SPACE.xl, height: 48, paddingHorizontal: SPACE.xl, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
});
