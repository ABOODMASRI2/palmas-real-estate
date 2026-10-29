import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../store';
import { useDir } from '../dir';
import { palette, BRAND, CATEGORY, RADIUS, TYPE, SPACE, shadow } from '../theme';
import FilterSheet from '../components/FilterSheet';

/** The map keeps its own filter set, exactly like the website's map page:
 *  filtering here never changes what Explore shows, and vice versa. */
export default function MapScreen({ navigation }) {
  const { theme, lang, t, L, priceOf, core, ready, labels, properties } = useApp();
  const { row, align, fwd } = useDir();
  const p = palette(theme);
  const insets = useSafeAreaInsets();
  const P = core();
  const mapRef = useRef(null);

  const [filters, setFilters] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [selId, setSelId] = useState('');

  useEffect(() => { if (P) setFilters(P.defaultFilters()); }, [P, ready]);

  /* القائمة تُمرَّر صراحةً وإلا رجعت النواة إلى بذرتها المحلية */
  const results = useMemo(() => (P && filters ? P.filteredBy(filters, properties) : []), [P, filters, properties]);
  const selected = useMemo(
    () => results.find((x) => x.id === selId) || results[0] || null,
    [results, selId]
  );

  /* follow the filters the way the website's map does: country → country view, city → city view */
  useEffect(() => {
    if (!mapRef.current || !P || !filters) return;
    if (filters.city !== 'all') {
      const c = P.cityBy(filters.city);
      if (c) mapRef.current.animateToRegion({ latitude: c.center[0], longitude: c.center[1], latitudeDelta: 0.12, longitudeDelta: 0.12 }, 600);
    } else if (filters.country !== 'all') {
      const c = P.countryBy(filters.country);
      if (c) mapRef.current.animateToRegion({ latitude: c.center[0], longitude: c.center[1], latitudeDelta: 2.2, longitudeDelta: 2.2 }, 700);
    }
  }, [filters, P]);

  const hasFilters = P && filters ? P.hasFilters(filters, '') : false;
  const legend = ['apartment', 'villa', 'land', 'office'];

  if (!P || !filters) return <View style={{ flex: 1, backgroundColor: p.page }} />;

  return (
    <View style={{ flex: 1, backgroundColor: p.page }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{ latitude: 31.95, longitude: 35.22, latitudeDelta: 1.6, longitudeDelta: 1.6 }}
        showsPointsOfInterest={false}
      >
        {results.map((x) =>
          x.lat != null && x.lng != null ? (
            <Marker
              key={x.id}
              coordinate={{ latitude: x.lat, longitude: x.lng }}
              onPress={() => setSelId(x.id)}
              tracksViewChanges={false}
            >
              <View style={[styles.pin, { backgroundColor: P.markerColor(x) }]} />
            </Marker>
          ) : null
        )}
      </MapView>

      <View style={[styles.header, { flexDirection: row, top: insets.top + 8 }]}>
        <Text style={[styles.title, { color: p.head, backgroundColor: p.elev, borderColor: p.hair, textAlign: align }]}>{t.navMap}</Text>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => setSheet(true)} style={[styles.hBtn, { backgroundColor: p.elev, borderColor: p.hair }]}>
          <Ionicons name="options-outline" size={19} color={p.head} />
          {hasFilters ? <View style={[styles.dot, { backgroundColor: BRAND.main, borderColor: p.elev }]} /> : null}
        </Pressable>
      </View>

      <View style={[styles.legend, { flexDirection: row, top: insets.top + 62 }]}>
        {legend.map((k) => (
          <View key={k} style={[styles.legendChip, { flexDirection: row, backgroundColor: p.elev, borderColor: p.hair }]}>
            <View style={[styles.legendDot, { backgroundColor: CATEGORY[k] || CATEGORY.fallback }]} />
            <Text style={[TYPE.caption, { color: p.head, fontSize: 10.5, lineHeight: 17 }]}>{labels ? labels.type[k] : k}</Text>
          </View>
        ))}
      </View>

      {selected ? (
        <Pressable
          onPress={() => navigation.navigate('Property', { id: selected.id })}
          style={[styles.card, { flexDirection: row, backgroundColor: p.elev, borderColor: p.hair, bottom: 18 }, shadow(p, 3)]}
        >
          <View style={[styles.thumb, { backgroundColor: P.markerColor(selected) }]}>
            <Ionicons name="home" size={26} color="rgba(255,255,255,0.55)" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text numberOfLines={1} style={[TYPE.h3, { color: p.head, fontSize: 15, textAlign: align }]}>{L(selected.name)}</Text>
            <Text numberOfLines={1} style={[TYPE.meta, { color: p.muted, fontWeight: '600', textAlign: align }]}>{L(selected.loc)}</Text>
            <Text numberOfLines={1} style={[TYPE.price, { color: BRAND.deep, textAlign: align }]}>{priceOf(selected)}</Text>
          </View>
          <View style={[styles.cta, { backgroundColor: BRAND.main }]}>
            <Ionicons name={fwd} size={20} color="#fff" />
          </View>
        </Pressable>
      ) : null}

      <FilterSheet
        visible={sheet}
        filters={filters}
        onApply={(f) => { setFilters(f); setSheet(false); setSelId(''); }}
        onClose={() => setSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pin: { width: 18, height: 18, borderRadius: 9, borderWidth: 2.5, borderColor: '#fff' },
  header: { position: 'absolute', left: SPACE.md, right: SPACE.md, alignItems: 'center', gap: 10 },
  title: { fontSize: 15, lineHeight: 24, fontWeight: '800', paddingHorizontal: 14, paddingVertical: 9, borderRadius: RADIUS.md, borderWidth: 1, overflow: 'hidden' },
  hBtn: { width: 46, height: 46, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: -3, insetInlineEnd: -3, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  legend: { position: 'absolute', left: SPACE.md, right: SPACE.md, gap: 6, flexWrap: 'wrap' },
  legendChip: { alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 30, justifyContent: 'center', borderRadius: RADIUS.pill, borderWidth: 1 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  card: { position: 'absolute', left: SPACE.md, right: SPACE.md, alignItems: 'center', gap: SPACE.gridGutter, padding: SPACE.gridGutter, borderRadius: RADIUS.lg, borderWidth: 1 },
  thumb: { width: 66, height: 66, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  cta: { width: 44, height: 66, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
});
