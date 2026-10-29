import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Linking, Share, Image } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../store';
import { useDir } from '../dir';
import { palette, BRAND, RADIUS, TYPE, SPACE, shadow } from '../theme';

/**
 * A project's own page, matching the website's ProjectDetails: hero with status, the
 * progress bar, the stats strip, the description, starting price with WhatsApp and
 * contact, and the location map. Data comes from Palmas.allProjects() so the app and
 * the site always describe a project the same way.
 */
export default function ProjectScreen({ route, navigation }) {
  const { theme, lang, t, L, projects, money, whatsapp } = useApp();
  const { rtl, row, align, back } = useDir();
  const p = palette(theme);
  const insets = useSafeAreaInsets();

  const item = useMemo(
    () => projects.find((x) => x.id === route.params?.id) || null,
    [projects, route.params?.id]
  );

  if (!item) {
    return (
      <View style={[styles.missing, { backgroundColor: p.page, paddingTop: insets.top + 60 }]}>
        <View style={[styles.missingIcon, { backgroundColor: 'rgba(246,135,67,0.12)' }]}>
          <Ionicons name="business-outline" size={34} color={BRAND.main} />
        </View>
        <Text style={[TYPE.h2, { color: p.head, marginTop: SPACE.lg, textAlign: 'center' }]}>{t.prjNotFound}</Text>
        <Text style={[TYPE.body, { color: p.muted, marginTop: SPACE.sm, textAlign: 'center' }]}>{t.prjNotFoundBody}</Text>
        <Pressable onPress={() => navigation.goBack()} style={[styles.cta, { backgroundColor: BRAND.main }]}>
          <Text style={[TYPE.title, { color: '#fff' }]}>{t.prjBack}</Text>
        </Pressable>
      </View>
    );
  }

  const done = item.state === 'done';
  const cover = (item.photos && item.photos[0]) || null;
  const pct = item.progress || 0;
  const accent = done ? BRAND.ok : BRAND.main;
  const kindLabel = { residential: t.prjResidential, commercial: t.prjCommercial, mixed: t.prjMixed }[item.kind] || item.kind;

  const wa = () =>
    Linking.openURL(
      `https://wa.me/${whatsapp}?text=${encodeURIComponent(
        `${rtl ? 'مرحباً، أستفسر عن مشروع: ' : 'Hello, I am asking about the project: '}${L(item.name)}`
      )}`
    );

  const share = () =>
    Share.share({
      message: `${L(item.name)} — ${L(item.loc)}\n${t.prjPriceFrom} ${money(item.price, item.currency)}\nPalmas.ps`,
    }).catch(() => {});

  return (
    <View style={{ flex: 1, backgroundColor: p.page }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* ---- hero ---- */}
        <View style={[styles.hero, { backgroundColor: p.placeholder, paddingTop: insets.top }]}>
          {cover ? (
            <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <>
              <LinearGradient
                colors={[accent, 'rgba(0,0,0,0)']}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.95, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="business" size={88} color="rgba(255,255,255,0.38)" />
            </>
          )}

          <Pressable onPress={() => navigation.goBack()} style={[styles.round, { top: insets.top + 8, insetInlineStart: SPACE.md, backgroundColor: p.elev }]}>
            <Ionicons name={back} size={22} color={p.head} />
          </Pressable>
          <Pressable onPress={share} style={[styles.round, { top: insets.top + 8, insetInlineEnd: SPACE.md, backgroundColor: p.elev }]}>
            <Ionicons name="share-social-outline" size={20} color={p.head} />
          </Pressable>
        </View>

        {/* ---- title ---- */}
        <View style={{ padding: SPACE.gutter, gap: 6 }}>
          <View style={{ flexDirection: row, gap: SPACE.xs }}>
            <Badge color={accent} text={done ? t.prjDone : t.prjOngoing} />
            <Badge color={p.inset} textColor={p.head} text={kindLabel} />
          </View>
          <Text style={[TYPE.h1, { color: p.head, fontSize: 22, lineHeight: 34, marginTop: 4, textAlign: align }]}>{L(item.name)}</Text>
          <View style={{ flexDirection: row, alignItems: 'center', gap: 5 }}>
            <Ionicons name="location-outline" size={15} color={BRAND.main} />
            <Text style={[TYPE.body, { color: p.muted, flexShrink: 1, textAlign: align }]}>{L(item.loc)}</Text>
          </View>
        </View>

        {/* ---- progress ---- */}
        <View style={[styles.card, { backgroundColor: p.card, borderColor: p.hair }]}>
          <View style={{ flexDirection: row, alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[TYPE.label, { color: p.muted, fontWeight: '700' }]}>{t.prjProgress}</Text>
            <Text style={[TYPE.h3, { color: accent }]}>{pct}%</Text>
          </View>
          <View style={[styles.bar, { flexDirection: row, backgroundColor: p.inset }]}>
            <View style={{ width: `${pct}%`, height: '100%', borderRadius: 5, backgroundColor: accent }} />
          </View>
        </View>

        {/* ---- stats ---- */}
        {item.stats && item.stats.length ? (
          <View style={[styles.card, { flexDirection: row, backgroundColor: p.card, borderColor: p.hair, paddingVertical: SPACE.gutter }]}>
            {item.stats.map((s, i) => (
              <View
                key={`${s.num}-${i}`}
                style={[styles.stat, i < item.stats.length - 1 && { borderInlineEndWidth: 1, borderInlineEndColor: p.hair }]}
              >
                <Text style={[TYPE.h2, { color: BRAND.main }]}>{s.num}</Text>
                <Text style={[TYPE.caption, { color: p.muted, fontWeight: '600', marginTop: 3, textAlign: 'center' }]}>{L(s.label)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* ---- about ---- */}
        {L(item.desc) ? (
          <Block p={p} align={align} title={t.prjAbout}>
            <Text style={[TYPE.body, { color: p.ink, fontSize: 14, lineHeight: 25, textAlign: align }]}>{L(item.desc)}</Text>
          </Block>
        ) : null}

        {/* ---- map ---- */}
        {item.lat != null && item.lng != null ? (
          <Block p={p} align={align} title={t.prjLocation}>
            <View style={{ height: 180, borderRadius: RADIUS.md, overflow: 'hidden' }}>
              <MapView
                style={{ flex: 1 }}
                provider={PROVIDER_GOOGLE}
                pointerEvents="none"
                initialRegion={{ latitude: item.lat, longitude: item.lng, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
              >
                <Marker coordinate={{ latitude: item.lat, longitude: item.lng }} tracksViewChanges={false}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 3, borderColor: '#fff', backgroundColor: accent }} />
                </Marker>
              </MapView>
            </View>
          </Block>
        ) : null}
      </ScrollView>

      {/* ---- price + actions ---- */}
      <View style={[styles.bar2, { flexDirection: row, backgroundColor: p.card, borderTopColor: p.hair, paddingBottom: insets.bottom + SPACE.sm }]}>
        <View style={{ flex: 1 }}>
          <Text style={[TYPE.caption, { color: p.muted, fontWeight: '600', textAlign: align }]}>{t.prjPriceFrom}</Text>
          <Text style={[TYPE.h2, { color: BRAND.deep, textAlign: align }]}>{money(item.price, item.currency)}</Text>
        </View>
        <Pressable onPress={wa} style={[styles.waBtn, { borderColor: p.hair }]}>
          <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
        </Pressable>
        <Pressable onPress={wa} style={[styles.mainBtn, { backgroundColor: BRAND.main }]}>
          <Text style={[TYPE.h3, { color: '#fff', fontSize: 15 }]}>{t.prjInquire}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ---------- pieces ---------- */

const Badge = ({ color, text, textColor = '#fff' }) => (
  <View style={{ backgroundColor: color, paddingHorizontal: 11, height: 26, justifyContent: 'center', borderRadius: RADIUS.pill }}>
    <Text style={[TYPE.kicker, { color: textColor, letterSpacing: 0 }]}>{text}</Text>
  </View>
);

const Block = ({ p, title, align, children }) => (
  <View style={{ marginHorizontal: SPACE.gutter, marginTop: SPACE.md, backgroundColor: p.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: p.hair, padding: SPACE.gutter }}>
    <Text style={[TYPE.h3, { color: p.head, fontSize: 16, marginBottom: SPACE.sm, textAlign: align }]}>{title}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  hero: { height: 260, alignItems: 'center', justifyContent: 'center' },
  round: { position: 'absolute', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  card: { marginHorizontal: SPACE.gutter, marginTop: SPACE.md, borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACE.gutter },
  bar: { height: 10, borderRadius: 5, marginTop: SPACE.sm, overflow: 'hidden' },
  stat: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },

  bar2: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', gap: SPACE.sm, paddingHorizontal: SPACE.gutter, paddingTop: SPACE.sm, borderTopWidth: 1 },
  waBtn: { width: 50, height: 50, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  mainBtn: { height: 50, paddingHorizontal: SPACE.xl, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },

  missing: { flex: 1, alignItems: 'center', paddingHorizontal: SPACE.xxl },
  missingIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  cta: { marginTop: SPACE.xl, height: 50, paddingHorizontal: SPACE.xl, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
});
