import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, FlatList,
  TextInput, Animated, Linking, Dimensions, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../store';
import { palette, BRAND, CATEGORY, RADIUS, SPACE, shadow } from '../theme';
import PropertyCard from '../components/PropertyCard';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = Math.min(268, SCREEN_W * 0.72);

/**
 * The website's home page, rebuilt for the phone: hero + search, stats, exclusive,
 * featured, projects, services, why-us, testimonials and the WhatsApp CTA — the same
 * sections in the same order, with the same copy (see i18n `home`).
 *
 * Direction is derived from `lang` rather than I18nManager so Arabic reads right-to-left
 * immediately, with no app restart when the language is toggled.
 */
export default function HomeScreen({ navigation }) {
  const { theme, lang, t, L, properties, projects, whatsapp } = useApp();
  const p = palette(theme);
  const rtl = lang === 'ar';
  const H = t.home;

  const [q, setQ] = useState('');
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 620, useNativeDriver: true }).start();
  }, []);

  const exclusive = useMemo(() => properties.filter((x) => x.exc).slice(0, 8), [properties]);
  const featured = useMemo(() => properties.filter((x) => !x.exc).slice(0, 8), [properties]);
  /* the showcase leads with exclusives and tops up from the rest so it is never thin */
  const spotlight = useMemo(
    () => (exclusive.length >= 4 ? exclusive : exclusive.concat(featured)).slice(0, 5),
    [exclusive, featured]
  );
  const row = rtl ? 'row-reverse' : 'row';
  const align = rtl ? 'right' : 'left';
  const submitSearch = () => navigation.navigate('Explore', { presetQuery: q.trim() });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: p.page }}
      contentContainerStyle={{ paddingBottom: 30 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Language, theme and the wishlist all live on the Account tab, so the home screen
          opens straight into the showcase — edge to edge, under the status bar. */}

      {/* ---------- spotlight: "عقار اليوم" ---------- */}
      <Animated.View style={{ opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
        <Spotlight items={spotlight} rtl={rtl} navigation={navigation} lang={lang} />

        {/* search sits directly under the spotlight, lifted over its lower edge */}
        <View style={{ paddingHorizontal: SPACE.gutter, marginTop: -26, marginBottom: 4 }}>
          <View style={[styles.searchWrap, { flexDirection: row, backgroundColor: p.card, borderColor: p.hair }, shadow(p, 3)]}>
            <Ionicons name="search" size={19} color={p.muted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              onSubmitEditing={submitSearch}
              returnKeyType="search"
              placeholder={H.searchPh}
              placeholderTextColor={p.muted}
              style={{ flex: 1, color: p.head, fontSize: 14, paddingVertical: 0, textAlign: align }}
            />
            <Pressable onPress={submitSearch} style={[styles.searchBtn, { backgroundColor: BRAND.main }]}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13.5 }}>{H.searchBtn}</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>

      {/* ---------- exclusive ---------- */}
      <Section p={p} rtl={rtl} kicker={H.exclKicker} title={H.exclTitle} action={t.seeAll} onAction={() => navigation.navigate('Explore')}>
        <Carousel
          data={exclusive}
          rtl={rtl}
          navigation={navigation}
        />
      </Section>

      {/* ---------- featured ---------- */}
      <Section p={p} rtl={rtl} kicker={H.featKicker} title={H.featTitle} action={t.seeAll} onAction={() => navigation.navigate('Explore')}>
        <Carousel
          data={featured}
          rtl={rtl}
          navigation={navigation}
        />
      </Section>

      {/* ---------- projects ---------- */}
      <Section p={p} rtl={rtl} kicker={H.projKicker} title={H.projTitle} action={t.seeAll} onAction={() => navigation.navigate('Projects')}>
        <View style={{ paddingHorizontal: SPACE.gutter, gap: SPACE.gridGutter }}>
          {projects.slice(0, 3).map((pj) => {
            const done = pj.state === 'done';
            const pct = pj.progress || 0;
            return (
              <Pressable
                key={pj.id}
                onPress={() => navigation.navigate('Project', { id: pj.id })}
                style={({ pressed }) => [styles.proj, { flexDirection: row, backgroundColor: p.card, borderColor: p.hair, opacity: pressed ? 0.92 : 1 }, shadow(p, 1)]}
              >
                <View style={[styles.projIcon, { backgroundColor: done ? 'rgba(31,157,92,0.12)' : 'rgba(246,135,67,0.12)' }]}>
                  <Ionicons name="business-outline" size={21} color={done ? BRAND.ok : BRAND.main} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: row, alignItems: 'center', gap: 8 }}>
                    <Text numberOfLines={1} style={{ color: p.head, fontWeight: '800', fontSize: 14.5, flexShrink: 1, textAlign: align }}>{L(pj.name)}</Text>
                    <View style={[styles.badge, { backgroundColor: done ? BRAND.ok : BRAND.main }]}>
                      <Text style={{ color: '#fff', fontSize: 9.5, fontWeight: '800' }}>{pct}%</Text>
                    </View>
                  </View>
                  <Text numberOfLines={1} style={{ color: p.muted, fontSize: 11.5, marginTop: 2, textAlign: align }}>{L(pj.loc)}</Text>
                  <View style={[styles.progressBar, { flexDirection: row, backgroundColor: p.inset }]}>
                    <View style={{ width: `${pct}%`, height: '100%', borderRadius: 4, backgroundColor: done ? BRAND.ok : BRAND.main }} />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Section>

      {/* ---------- services ---------- */}
      <Section p={p} rtl={rtl} kicker={H.servKicker} title={H.servTitle}>
        <View style={[styles.grid, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
          {H.services.map((s) => (
            <View key={s.name} style={[styles.servCard, { backgroundColor: p.card, borderColor: p.hair }, shadow(p, 1)]}>
              <View style={[styles.servIcon, { backgroundColor: 'rgba(246,135,67,0.12)' }]}>
                <Ionicons name={s.icon} size={20} color={BRAND.main} />
              </View>
              <Text style={{ color: p.head, fontWeight: '800', fontSize: 13.5, marginTop: 10, textAlign: align }}>{s.name}</Text>
              <Text style={{ color: p.muted, fontSize: 11.5, lineHeight: 18, marginTop: 5, textAlign: align }}>{s.desc}</Text>
            </View>
          ))}
        </View>
      </Section>

      {/* ---------- why us ---------- */}
      <Section p={p} rtl={rtl} kicker={H.whyKicker} title={H.whyTitle}>
        <View style={{ paddingHorizontal: SPACE.gutter, gap: SPACE.sm }}>
          {H.values.map((v) => (
            <View key={v.t} style={[styles.value, { flexDirection: row, backgroundColor: p.card, borderColor: p.hair }]}>
              <Ionicons name={v.icon} size={19} color={BRAND.main} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: p.head, fontWeight: '800', fontSize: 13.5, textAlign: align }}>{v.t}</Text>
                <Text style={{ color: p.muted, fontSize: 11.5, marginTop: 2, textAlign: align }}>{v.d}</Text>
              </View>
            </View>
          ))}
        </View>
      </Section>

      {/* ---------- testimonials ---------- */}
      <Section p={p} rtl={rtl} kicker={H.testKicker} title={H.testTitle}>
        <FlatList
          horizontal
          inverted={rtl}
          data={H.testimonials}
          keyExtractor={(i) => i.name}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SPACE.gutter, gap: SPACE.gridGutter }}
          renderItem={({ item }) => (
            <View style={[styles.testi, { backgroundColor: p.card, borderColor: p.hair, width: CARD_W }, shadow(p, 1)]}>
              <Ionicons name="chatbox-ellipses" size={18} color={BRAND.main} style={{ alignSelf: rtl ? 'flex-end' : 'flex-start' }} />
              <Text style={{ color: p.ink, fontSize: 12.5, lineHeight: 21, marginTop: 8, textAlign: align }}>“{item.quote}”</Text>
              <View style={[styles.testiFoot, { flexDirection: row, borderTopColor: p.hair }]}>
                <View style={[styles.testiAv, { backgroundColor: BRAND.main }]}>
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>{item.initial}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: p.head, fontWeight: '800', fontSize: 12.5, textAlign: align }}>{item.name}</Text>
                  <Text style={{ color: p.muted, fontSize: 10.5, marginTop: 1, textAlign: align }}>{item.role}</Text>
                </View>
              </View>
            </View>
          )}
        />
      </Section>

      {/* ---------- CTA ---------- */}
      <View style={[styles.cta, { backgroundColor: theme === 'dark' ? '#1c1408' : '#2b1a0d' }]}>
        <View style={[styles.orb, { top: -50, insetInlineStart: -40, width: 170, height: 170, opacity: 0.5 }]} />
        <Text style={styles.ctaKicker}>{H.ctaKicker}</Text>
        <Text style={[styles.ctaTitle, { textAlign: align }]}>{H.ctaTitle}</Text>
        <Text style={[styles.ctaBody, { textAlign: align }]}>{H.ctaBody}</Text>
        <Pressable
          onPress={() => navigation.navigate('Contact')}
          style={[styles.ctaBtn, { flexDirection: row, backgroundColor: BRAND.main }]}
        >
          <Ionicons name="chatbubbles-outline" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{t.contactUs}</Text>
        </Pressable>
        <Pressable
          onPress={() => Linking.openURL(`https://wa.me/${whatsapp}`)}
          style={[styles.ctaGhostBtn, { flexDirection: row, borderColor: 'rgba(255,255,255,0.28)' }]}
        >
          <Ionicons name="logo-whatsapp" size={17} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13.5 }}>{H.ctaBtn}</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('ListProperty')} style={styles.ctaGhost}>
          <Text style={{ color: 'rgba(255,255,255,0.72)', fontWeight: '700', fontSize: 12.5 }}>{t.listTitle}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

/* ---------- pieces ---------- */

/**
 * "عقار اليوم" — a full-bleed property showcase that auto-advances every 5s and can
 * also be swiped. Until real photos exist, the photo band is a brand-tinted gradient
 * keyed to the property category, so it reads as deliberate rather than as a missing
 * image; swap the inner <View> for an <Image> once uploads land.
 */
function Spotlight({ items, rtl, navigation, lang }) {
  const { theme, L, priceOf, isFav, toggleFav, labels } = useApp();
  const p = palette(theme);
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const [idx, setIdx] = useState(0);
  const align = rtl ? 'right' : 'left';
  const row = rtl ? 'row-reverse' : 'row';

  const onViewRef = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length) setIdx(viewableItems[0].index || 0);
  });
  const viewCfg = useRef({ itemVisiblePercentThreshold: 60 });

  /* gentle auto-play; it stops as soon as the list is empty or has a single slide */
  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(() => {
      setIdx((cur) => {
        const next = (cur + 1) % items.length;
        try { listRef.current?.scrollToIndex({ index: next, animated: true }); } catch (e) {}
        return next;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [items.length]);

  if (!items.length) return <View style={{ height: 12 }} />;

  return (
    <View>
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(i) => i.id}
        horizontal
        pagingEnabled
        inverted={rtl}
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewRef.current}
        viewabilityConfig={viewCfg.current}
        getItemLayout={(d, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
        style={{ height: 400 + insets.top }}
        renderItem={({ item }) => {
          const tint = CATEGORY[item.type] || CATEGORY.fallback;
          const saved = isFav(item.id);
          const offerLabel = labels
            ? (item.type === 'land' ? labels.offer.landOffer : labels.offer[item.offer])
            : item.offer;
          return (
            <Pressable
              onPress={() => navigation.navigate('Property', { id: item.id })}
              style={{ width: SCREEN_W, height: 400 + insets.top }}
            >
              {/* صورة الغلاف من السيرفر، والتدرّج اللوني بديلها حين لا توجد صورة */}
              <View style={{ flex: 1, backgroundColor: p.placeholder }}>
                {item.photos && item.photos[0] ? (
                  <Image source={{ uri: item.photos[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <>
                    <LinearGradient
                      colors={[tint, 'rgba(0,0,0,0)']}
                      start={{ x: 0.1, y: 0 }}
                      end={{ x: 0.9, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.spotWatermark}>
                      <Ionicons name="home" size={120} color="rgba(255,255,255,0.16)" />
                    </View>
                  </>
                )}
              </View>

              {/* readability scrim */}
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.86)']}
                locations={[0.32, 0.62, 1]}
                style={StyleSheet.absoluteFill}
              />

              <View style={styles.spotBody}>
                <View style={[styles.spotBadges, { flexDirection: row }]}>
                  {item.exc ? (
                    <View style={[styles.spotBadge, { backgroundColor: BRAND.main }]}>
                      <Text style={styles.spotBadgeTxt}>{rtl ? 'حصري' : 'Exclusive'}</Text>
                    </View>
                  ) : null}
                  <View style={[styles.spotBadge, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
                    <Text style={styles.spotBadgeTxt}>{offerLabel}</Text>
                  </View>
                </View>

                {/* name and the save button share a row, so the heart sits at the far
                    edge directly opposite the title rather than floating up top */}
                <View style={[styles.spotNameRow, { flexDirection: row }]}>
                  <Text numberOfLines={1} style={[styles.spotName, { textAlign: align, flex: 1 }]}>{L(item.name)}</Text>
                  <Pressable
                    onPress={async (e) => { e?.stopPropagation?.(); const r = await toggleFav(item.id); if (!r.ok) navigation.navigate('Auth'); }}
                    hitSlop={12}
                    style={styles.spotHeart}
                  >
                    <Ionicons name={saved ? 'heart' : 'heart-outline'} size={20} color={saved ? BRAND.main : '#fff'} />
                  </Pressable>
                </View>

                <View style={[styles.spotLocRow, { flexDirection: row }]}>
                  <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.8)" />
                  <Text numberOfLines={1} style={styles.spotLoc}>{L(item.loc)}</Text>
                </View>

                <View style={[styles.spotFoot, { flexDirection: row }]}>
                  <Text style={styles.spotPrice}>{priceOf(item)}</Text>
                  <View style={[styles.spotSpecs, { flexDirection: row }]}>
                    {item.rooms ? <SpotSpec row={row} icon="bed-outline" v={item.rooms} /> : null}
                    {item.baths ? <SpotSpec row={row} icon="water-outline" v={item.baths} /> : null}
                    <SpotSpec row={row} icon="resize-outline" v={`${item.area}${rtl ? ' م²' : ' m²'}`} />
                  </View>
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      {/* dots — laid out in reading order */}
      <View style={[styles.dots, { flexDirection: row }]}>
        {items.map((it, i) => (
          <View
            key={it.id}
            style={[styles.dot, i === idx ? { width: 20, backgroundColor: '#fff' } : { backgroundColor: 'rgba(255,255,255,0.45)' }]}
          />
        ))}
      </View>
    </View>
  );
}

function SpotSpec({ icon, v, row }) {
  return (
    <View style={{ flexDirection: row, alignItems: 'center', gap: 4 }}>
      <Ionicons name={icon} size={13} color="rgba(255,255,255,0.85)" />
      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{v}</Text>
    </View>
  );
}

function Carousel({ data, rtl, navigation }) {
  return (
    <FlatList
      horizontal
      inverted={rtl}
      data={data}
      keyExtractor={(i) => i.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: SPACE.gutter, gap: SPACE.gridGutter }}
      renderItem={({ item }) => (
        <View style={{ width: CARD_W }}>
          <PropertyCard
            item={item}
            layout="grid"
            onPress={() => navigation.navigate('Property', { id: item.id })}
            onNeedsAuth={() => navigation.navigate('Auth')}
          />
        </View>
      )}
    />
  );
}

function Section({ p, rtl, kicker, title, action, onAction, children }) {
  const row = rtl ? 'row-reverse' : 'row';
  const align = rtl ? 'right' : 'left';
  return (
    <View style={{ marginTop: SPACE.xxl - 6 }}>
      <View style={[styles.secHead, { flexDirection: row }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.secKicker, { textAlign: align }]}>{kicker}</Text>
          <Text style={[styles.secTitle, { color: p.head, textAlign: align }]}>{title}</Text>
        </View>
        {action ? (
          <Pressable onPress={onAction} hitSlop={8}>
            <Text style={{ color: BRAND.main, fontWeight: '800', fontSize: 12.5 }}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  spotWatermark: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  spotHeart: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', alignItems: 'center', justifyContent: 'center' },
  spotNameRow: { alignItems: 'center', gap: 12 },
  spotBody: { position: 'absolute', left: 0, right: 0, bottom: 44, paddingHorizontal: SPACE.xl },
  spotBadges: { gap: 7, marginBottom: 10 },
  spotBadge: { paddingHorizontal: 11, paddingVertical: 4.5, borderRadius: RADIUS.pill },
  spotBadgeTxt: { color: '#fff', fontSize: 10.5, lineHeight: 17, fontWeight: '800' },
  spotName: { color: '#fff', fontSize: 25, lineHeight: 39, fontWeight: '900', letterSpacing: -0.4 },
  spotLocRow: { alignItems: 'center', gap: 5, marginTop: 5 },
  spotLoc: { color: 'rgba(255,255,255,0.8)', fontSize: 12.5, lineHeight: 20, fontWeight: '600', flexShrink: 1 },
  spotFoot: { alignItems: 'center', justifyContent: 'space-between', marginTop: SPACE.md },
  spotPrice: { color: '#fff', fontSize: 24, lineHeight: 37, fontWeight: '900' },
  spotSpecs: { alignItems: 'center', gap: 13 },
  dots: { position: 'absolute', bottom: 20, left: 0, right: 0, justifyContent: 'center', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },

  orb: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(246,135,67,0.22)' },
  searchWrap: { alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.xl, height: 56, borderRadius: RADIUS.lg, borderWidth: 1, paddingInlineStart: SPACE.gutter, paddingInlineEnd: SPACE.xs },
  searchBtn: { height: 44, paddingHorizontal: SPACE.xl, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  secHead: { alignItems: 'flex-end', gap: SPACE.sm, paddingHorizontal: SPACE.gutter, marginBottom: SPACE.md },
  secKicker: { color: BRAND.main, fontSize: 11.5, lineHeight: 18, fontWeight: '800', letterSpacing: 0.6, marginBottom: 3 },
  secTitle: { fontSize: 19, lineHeight: 29, fontWeight: '900', letterSpacing: -0.3 },

  proj: { alignItems: 'center', gap: 12, borderRadius: RADIUS.lg, borderWidth: 1, padding: 13 },
  projIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: RADIUS.pill },
  /* row/row-reverse is set inline so the fill grows from the reading side */
  progressBar: { height: 6, borderRadius: 4, marginTop: 9, overflow: 'hidden' },

  /* flexDirection is set inline so the grid fills from the reading side */
  grid: { flexWrap: 'wrap', paddingHorizontal: SPACE.gutter, gap: SPACE.gridGutter },
  servCard: { width: '47.6%', flexGrow: 1, borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACE.md },
  servIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  value: { alignItems: 'center', gap: SPACE.md, borderRadius: RADIUS.md, borderWidth: 1, paddingVertical: SPACE.md, paddingHorizontal: SPACE.md },

  testi: { borderRadius: RADIUS.lg, borderWidth: 1, padding: 15 },
  testiFoot: { alignItems: 'center', gap: 10, marginTop: 13, paddingTop: 12, borderTopWidth: 1 },
  testiAv: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },

  cta: { marginTop: SPACE.xxl, marginHorizontal: SPACE.gutter, borderRadius: RADIUS.xl, padding: SPACE.xl, overflow: 'hidden' },
  ctaKicker: { color: BRAND.hover, fontSize: 11.5, lineHeight: 18, fontWeight: '800', letterSpacing: 0.6 },
  ctaTitle: { color: '#fff', fontSize: 21, fontWeight: '900', marginTop: 7, lineHeight: 30 },
  ctaBody: { color: 'rgba(255,255,255,0.7)', fontSize: 12.5, lineHeight: 21, marginTop: 8 },
  ctaBtn: { alignItems: 'center', justifyContent: 'center', gap: SPACE.sm, height: 52, borderRadius: RADIUS.md, marginTop: SPACE.lg },
  ctaGhostBtn: { alignItems: 'center', justifyContent: 'center', gap: SPACE.sm, height: 48, borderRadius: RADIUS.md, borderWidth: 1, marginTop: SPACE.sm },
  ctaGhost: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: SPACE.sm },
});
