import React, { useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../store';
import { useDir } from '../dir';
import { palette, BRAND, RADIUS, TYPE, SPACE } from '../theme';
import PropertyCard from '../components/PropertyCard';

/** Three states, exactly like the website's wishlist page: guest, empty, and list. */
export default function SavedScreen({ navigation }) {
  const { theme, t, properties, favs, session } = useApp();
  const { align } = useDir();
  const p = palette(theme);
  const insets = useSafeAreaInsets();

  const items = useMemo(() => properties.filter((x) => favs.includes(x.id)), [properties, favs]);

  return (
    <View style={{ flex: 1, backgroundColor: p.page, paddingTop: insets.top + 10 }}>
      <Text style={[styles.title, { color: p.head, textAlign: align }]}>{t.savedTitle}</Text>

      {!session ? (
        <Empty
          p={p}
          icon="lock-closed-outline"
          title={t.guestTitle}
          body={t.guestBody}
          cta={t.login}
          onPress={() => navigation.navigate('Auth')}
        />
      ) : items.length === 0 ? (
        <Empty
          p={p}
          icon="heart-outline"
          title={t.savedEmptyTitle}
          body={t.savedEmptyBody}
          cta={t.browseNow}
          onPress={() => navigation.navigate('Explore')}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 11, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <PropertyCard
              item={item}
              onPress={() => navigation.navigate('Property', { id: item.id })}
              onNeedsAuth={() => navigation.navigate('Auth')}
            />
          )}
        />
      )}
    </View>
  );
}

function Empty({ p, icon, title, body, cta, onPress }) {
  return (
    <View style={styles.empty}>
      <View style={[styles.circle, { backgroundColor: 'rgba(246,135,67,0.14)' }]}>
        <Ionicons name={icon} size={34} color={BRAND.main} />
      </View>
      <Text style={[TYPE.h2, { color: p.head, fontSize: 18, marginTop: SPACE.lg, textAlign: 'center' }]}>{title}</Text>
      <Text style={[TYPE.body, { color: p.muted, textAlign: 'center', marginTop: 8 }]}>{body}</Text>
      <Pressable onPress={onPress} style={[styles.cta, { backgroundColor: BRAND.main }]}>
        <Text style={[TYPE.title, { color: '#fff' }]}>{cta}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, lineHeight: 37, fontWeight: '900', letterSpacing: -0.4, paddingHorizontal: SPACE.gutter, marginBottom: SPACE.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE.xxl, paddingBottom: 70 },
  circle: { width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center' },
  cta: { marginTop: SPACE.xl, height: 48, paddingHorizontal: SPACE.xxl, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
});
