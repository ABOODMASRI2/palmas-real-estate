import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../store';
import { useDir } from '../dir';
import { palette, BRAND, CATEGORY, RADIUS, TYPE, SPACE, shadow } from '../theme';
import FilterSheet from '../components/FilterSheet';

/**
 * Web build only. `react-native-maps` is native-only, so on web we keep every other
 * behaviour of the map screen — same filter set, same results, same colour coding —
 * and present them as a location list instead of a canvas. Metro picks this file
 * automatically for web; MapScreen.js stays untouched for Android and iOS.
 */
export default function MapScreenWeb({ navigation }) {
  const { theme, t, L, priceOf, core, ready, labels, properties } = useApp();
  const { rtl, row, align } = useDir();
  const p = palette(theme);
  const insets = useSafeAreaInsets();
  const P = core();

  const [filters, setFilters] = useState(null);
  const [sheet, setSheet] = useState(false);

  useEffect(() => { if (P) setFilters(P.defaultFilters()); }, [P, ready]);

  const results = useMemo(() => (P && filters ? P.filteredBy(filters, properties) : []), [P, filters, properties]);
  const hasFilters = P && filters ? P.hasFilters(filters, '') : false;
  const legend = ['apartment', 'villa', 'land', 'office'];

  if (!P || !filters) return <View style={{ flex: 1, backgroundColor: p.page }} />;

  return (
    <View style={{ flex: 1, backgroundColor: p.page, paddingTop: insets.top + 10 }}>
      <View style={[styles.head, { flexDirection: row }]}>
        <Text style={[styles.title, { color: p.head, textAlign: align }]}>{t.navMap}</Text>
        <Pressable onPress={() => setSheet(true)} style={[styles.hBtn, { backgroundColor: p.elev, borderColor: p.hair }]}>
          <Ionicons name="options-outline" size={19} color={p.head} />
          {hasFilters ? <View style={[styles.dot, { backgroundColor: BRAND.main, borderColor: p.elev }]} /> : null}
        </Pressable>
      </View>

      <View style={[styles.note, { flexDirection: row, backgroundColor: p.inset, borderColor: p.hair }]}>
        <Ionicons name="information-circle-outline" size={16} color={p.muted} />
        <Text style={[TYPE.meta, { color: p.muted, flex: 1, fontWeight: '600', lineHeight: 19, textAlign: align }]}>
          {rtl
            ? 'الخريطة التفاعلية متاحة على تطبيق الأندرويد والآيفون. هون بتشوف نفس النتائج كقائمة.'
            : 'The interactive map runs on the Android and iOS apps. Here you get the same results as a list.'}
        </Text>
      </View>

      <View style={[styles.legend, { flexDirection: row }]}>
        {legend.map((k) => (
          <View key={k} style={[styles.legendChip, { flexDirection: row, backgroundColor: p.elev, borderColor: p.hair }]}>
            <View style={[styles.legendDot, { backgroundColor: CATEGORY[k] || CATEGORY.fallback }]} />
            <Text style={[TYPE.caption, { color: p.head, fontSize: 10.5, lineHeight: 17 }]}>{labels ? labels.type[k] : k}</Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACE.md, gap: 10, paddingBottom: 28 }}>
        {results.map((x) => (
          <Pressable
            key={x.id}
            onPress={() => navigation.navigate('Property', { id: x.id })}
            style={[styles.card, { flexDirection: row, backgroundColor: p.elev, borderColor: p.hair }, shadow(p, 1)]}
          >
            <View style={[styles.pin, { backgroundColor: P.markerColor(x) }]} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text numberOfLines={1} style={[TYPE.title, { color: p.head, textAlign: align }]}>{L(x.name)}</Text>
              <Text numberOfLines={1} style={[TYPE.meta, { color: p.muted, fontWeight: '600', textAlign: align }]}>{L(x.loc)}</Text>
            </View>
            <Text style={[TYPE.price, { color: BRAND.deep, fontSize: 14 }]}>{priceOf(x)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <FilterSheet
        visible={sheet}
        filters={filters}
        onApply={(f) => { setFilters(f); setSheet(false); }}
        onClose={() => setSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', paddingHorizontal: SPACE.gutter, marginBottom: 10 },
  title: { fontSize: 24, lineHeight: 37, fontWeight: '900', letterSpacing: -0.4, flex: 1 },
  hBtn: { width: 46, height: 46, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: -3, insetInlineEnd: -3, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  note: { alignItems: 'center', gap: 8, marginHorizontal: SPACE.md, padding: 11, borderRadius: RADIUS.md, borderWidth: 1 },
  legend: { gap: 6, flexWrap: 'wrap', paddingHorizontal: SPACE.md, marginTop: SPACE.md },
  legendChip: { alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 30, justifyContent: 'center', borderRadius: RADIUS.pill, borderWidth: 1 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  card: { alignItems: 'center', gap: 11, padding: 12, borderRadius: RADIUS.lg, borderWidth: 1 },
  pin: { width: 16, height: 16, borderRadius: 8, borderWidth: 2.5, borderColor: '#fff' },
});
