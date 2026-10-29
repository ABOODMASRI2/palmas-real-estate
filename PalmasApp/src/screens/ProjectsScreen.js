import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../store';
import { useDir } from '../dir';
import { palette, BRAND, RADIUS, TYPE, SPACE, shadow } from '../theme';

/** Every project, the website's Projects page. Cards open the same detail screen. */
export default function ProjectsScreen({ navigation }) {
  const { theme, t, L, projects, money } = useApp();
  const { row, align, back } = useDir();
  const p = palette(theme);
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: p.page }}>
      <View style={[styles.header, { flexDirection: row, paddingTop: insets.top + SPACE.xs }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back} hitSlop={10}>
          <Ionicons name={back} size={24} color={p.head} />
        </Pressable>
        <Text style={[TYPE.h3, { color: p.head, flex: 1, textAlign: align }]}>{t.allProjects}</Text>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: SPACE.gutter, gap: SPACE.md, paddingBottom: insets.bottom + SPACE.xl }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const done = item.state === 'done';
          const accent = done ? BRAND.ok : BRAND.main;
          const pct = item.progress || 0;
          return (
            <Pressable
              onPress={() => navigation.navigate('Project', { id: item.id })}
              style={({ pressed }) => [styles.card, { backgroundColor: p.card, borderColor: p.hair, opacity: pressed ? 0.93 : 1 }, shadow(p, 1)]}
            >
              <View style={styles.band}>
                {item.photos && item.photos[0] ? (
                  <Image source={{ uri: item.photos[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <>
                    <LinearGradient
                      colors={[accent, 'rgba(0,0,0,0)']}
                      start={{ x: 0.1, y: 0 }}
                      end={{ x: 0.95, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Ionicons name="business" size={52} color="rgba(255,255,255,0.4)" />
                  </>
                )}
                <View style={[styles.badge, { backgroundColor: accent }]}>
                  <Text style={styles.badgeTxt}>{done ? t.prjDone : `${pct}%`}</Text>
                </View>
              </View>

              <View style={{ padding: SPACE.md }}>
                <Text numberOfLines={1} style={[TYPE.h3, { color: p.head, textAlign: align }]}>{L(item.name)}</Text>
                <View style={{ flexDirection: row, alignItems: 'center', gap: 4, marginTop: 3 }}>
                  <Ionicons name="location-outline" size={13} color={p.muted} />
                  <Text numberOfLines={1} style={[TYPE.meta, { color: p.muted, fontWeight: '600', flexShrink: 1 }]}>{L(item.loc)}</Text>
                </View>

                <View style={[styles.bar, { flexDirection: row, backgroundColor: p.inset }]}>
                  <View style={{ width: `${pct}%`, height: '100%', borderRadius: 4, backgroundColor: accent }} />
                </View>

                <View style={{ flexDirection: row, alignItems: 'center', justifyContent: 'space-between', marginTop: SPACE.sm }}>
                  <Text style={[TYPE.caption, { color: p.muted, fontWeight: '600' }]}>{t.prjPriceFrom}</Text>
                  <Text style={[TYPE.price, { color: BRAND.deep }]}>{money(item.price, item.currency)}</Text>
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingHorizontal: SPACE.sm, paddingBottom: SPACE.xs, gap: SPACE.xs },
  back: { width: 48, height: 48, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
  band: { height: 130, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: SPACE.sm, insetInlineStart: SPACE.sm, paddingHorizontal: SPACE.sm, height: 24, justifyContent: 'center', borderRadius: RADIUS.pill },
  badgeTxt: { color: '#fff', fontSize: 11, lineHeight: 17, fontWeight: '800' },
  bar: { height: 6, borderRadius: 4, marginTop: SPACE.sm, overflow: 'hidden' },
});
