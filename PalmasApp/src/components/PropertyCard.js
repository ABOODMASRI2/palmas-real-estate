import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../store';
import { palette, BRAND, CATEGORY, RADIUS, SPACE, shadow } from '../theme';

/** Same card anatomy as the website's listing card: photo band, category chip, saved heart,
 *  name, location, price, and the beds/baths/area strip. */
export default function PropertyCard({ item, onPress, onNeedsAuth, layout = 'grid' }) {
  const { theme, lang, L, priceOf, isFav, toggleFav, labels } = useApp();
  const p = palette(theme);
  const saved = isFav(item.id);
  const grid = layout === 'grid';
  /* direction follows the chosen language, not the device locale */
  const rtl = lang === 'ar';
  const row = rtl ? 'row-reverse' : 'row';
  const align = rtl ? 'right' : 'left';

  const catColor = CATEGORY[item.type] || CATEGORY.fallback;
  /* نفس صورة الغلاف التي يعرضها الموقع: أول عنصر في photos */
  const cover = (item.photos && item.photos[0]) || null;
  const typeLabel = labels ? labels.type[item.type] || item.type : item.type;
  const offerLabel = labels
    ? (item.type === 'land' ? labels.offer.landOffer : labels.offer[item.offer])
    : item.offer;

  const heart = async (e) => {
    e?.stopPropagation?.();
    const res = await toggleFav(item.id);
    if (!res.ok && res.needsAuth) onNeedsAuth?.();
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: p.card, borderColor: p.hair, opacity: pressed ? 0.92 : 1 },
        shadow(p, 1),
        grid ? styles.gridCard : styles.listCard,
      ]}
    >
      {/* Photo band. Shows the property's cover photo when it has one; a property
          without photos keeps the category-tinted gradient — the same treatment the
          home showcase uses — so it reads as designed rather than broken. */}
      <View style={[styles.photo, { backgroundColor: p.placeholder, height: grid ? 132 : 168 }]}>
        {cover ? (
          <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <>
            <LinearGradient
              colors={[catColor, 'rgba(0,0,0,0)']}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.95, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name="home" size={grid ? 42 : 54} color="rgba(255,255,255,0.42)" />
          </>
        )}

        <View style={[styles.badge, { backgroundColor: 'rgba(0,0,0,0.42)' }]}>
          <Text style={styles.badgeTxt} numberOfLines={1}>{offerLabel}</Text>
        </View>
        {item.exc ? (
          <View style={[styles.badge, styles.badgeEx, { backgroundColor: BRAND.main }]}>
            <Text style={styles.badgeTxt}>{rtl ? 'حصري' : 'Exclusive'}</Text>
          </View>
        ) : null}
        <Pressable onPress={heart} hitSlop={10} style={[styles.heart, { backgroundColor: 'rgba(0,0,0,0.32)' }]}>
          <Ionicons name={saved ? 'heart' : 'heart-outline'} size={18} color={saved ? BRAND.main : '#fff'} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text numberOfLines={1} style={[styles.name, { color: p.head, textAlign: align }]}>{L(item.name)}</Text>
        <Text numberOfLines={1} style={[styles.loc, { color: p.muted, textAlign: align }]}>{L(item.loc)}</Text>
        <Text numberOfLines={1} style={[styles.price, { color: BRAND.deep, textAlign: align }]}>{priceOf(item)}</Text>

        <View style={[styles.specs, { flexDirection: row, borderTopColor: p.hair }]}>
          {item.rooms ? <Spec p={p} row={row} icon="bed-outline" v={item.rooms} /> : null}
          {item.baths ? <Spec p={p} row={row} icon="water-outline" v={item.baths} /> : null}
          <Spec p={p} row={row} icon="resize-outline" v={`${item.area}${rtl ? ' م²' : ' m²'}`} />
          <View style={{ flex: 1 }} />
          <Text numberOfLines={1} style={[styles.type, { color: p.muted }]}>{typeLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function Spec({ p, icon, v, row }) {
  return (
    <View style={[styles.spec, { flexDirection: row }]}>
      <Ionicons name={icon} size={13} color={p.muted} />
      <Text style={[styles.specTxt, { color: p.ink }]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
  gridCard: { flex: 1, margin: 5 },
  listCard: { marginHorizontal: 5, marginVertical: 5 },
  photo: { alignItems: 'center', justifyContent: 'center' },
  /* labels, not controls — named badge so the touch-target check knows the difference */
  badge: { position: 'absolute', top: SPACE.sm, insetInlineStart: SPACE.sm, paddingHorizontal: SPACE.sm, height: 22, justifyContent: 'center', borderRadius: RADIUS.pill, maxWidth: '64%' },
  badgeEx: { top: 38 },
  badgeTxt: { color: '#fff', fontSize: 10.5, lineHeight: 17, fontWeight: '800' },
  /* visually 34 to suit the card; hitSlop below lifts the real target past 44 */
  heart: { position: 'absolute', top: 8, insetInlineEnd: 8, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  body: { padding: SPACE.md - 2, gap: 2 },
  name: { fontSize: 14.5, lineHeight: 23, fontWeight: '800' },
  loc: { fontSize: 11.5, lineHeight: 18, fontWeight: '600' },
  price: { fontSize: 15, lineHeight: 24, fontWeight: '900', marginTop: 3 },
  specs: { alignItems: 'center', gap: 10, borderTopWidth: 1, marginTop: 8, paddingTop: 8 },
  spec: { alignItems: 'center', gap: 3 },
  specTxt: { fontSize: 11, lineHeight: 17, fontWeight: '700' },
  type: { fontSize: 10.5, lineHeight: 17, fontWeight: '700' },
});
