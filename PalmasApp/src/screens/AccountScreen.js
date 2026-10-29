import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../store';
import { useDir } from '../dir';
import { palette, BRAND, RADIUS, TYPE, SPACE } from '../theme';

export default function AccountScreen({ navigation }) {
  const {
    theme, setTheme, lang, setLang, currency, setCurrency,
    session, signOut, t, core, whatsapp,
  } = useApp();
  const { rtl, row, align, fwd } = useDir();
  const p = palette(theme);
  const insets = useSafeAreaInsets();
  const P = core();

  const currencies = P
    ? [{ id: 'auto', short: lang === 'ar' ? 'تلقائي' : 'Auto' }].concat(
        P.Currency.list().map((c) => ({ id: c.id, short: lang === 'ar' ? c.shortAr : c.shortEn }))
      )
    : [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: p.page }} contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 30 }}>
      <Text style={[styles.title, { color: p.head, textAlign: align }]}>{t.account}</Text>

      <View style={[styles.card, { backgroundColor: p.card, borderColor: p.hair }]}>
        {session ? (
          <View style={{ flexDirection: row, alignItems: 'center', gap: 12 }}>
            <View style={[styles.avatar, { backgroundColor: BRAND.main }]}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 19, lineHeight: 29 }}>
                {(session.name || session.email || '?').trim().charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[TYPE.h3, { color: p.head, textAlign: align }]}>{session.name}</Text>
              <Text style={[TYPE.meta, { color: p.muted, fontSize: 12.5, marginTop: 2, textAlign: align }]}>{session.email || session.phone}</Text>
            </View>
          </View>
        ) : (
          <>
            <Text style={[TYPE.h3, { color: p.head, textAlign: align }]}>{t.guestTitle}</Text>
            <Text style={[TYPE.body, { color: p.muted, marginTop: 6, textAlign: align }]}>{t.guestBody}</Text>
            <Pressable onPress={() => navigation.navigate('Auth')} style={[styles.cta, { backgroundColor: BRAND.main }]}>
              <Text style={[TYPE.title, { color: '#fff' }]}>{t.login}</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* the home screen no longer carries a wishlist button — this is the way in,
          and it only means anything once there is an account to save against */}
      {session ? (
        <Group p={p} align={align} title={rtl ? 'عقاراتي' : 'My properties'}>
          <Link p={p} row={row} align={align} fwd={fwd} icon="heart-outline" label={t.savedTitle} onPress={() => navigation.navigate('Saved')} />
          <Link p={p} row={row} align={align} fwd={fwd} icon="person-circle-outline" label={t.accSettings} onPress={() => navigation.navigate('AccountSettings')} />
        </Group>
      ) : null}

      {/* every remaining website page the app now covers */}
      <Group p={p} align={align} title={rtl ? 'بالماس' : 'Palmas'}>
        <Link p={p} row={row} align={align} fwd={fwd} icon="business-outline" label={t.allProjects} onPress={() => navigation.navigate('Projects')} />
        <Link p={p} row={row} align={align} fwd={fwd} icon="pricetags-outline" label={t.listTitle} onPress={() => navigation.navigate('ListProperty')} />
        <Link p={p} row={row} align={align} fwd={fwd} icon="chatbubbles-outline" label={t.contactUs} onPress={() => navigation.navigate('Contact')} />
      </Group>

      <Group p={p} align={align} title={t.settings}>
        <Row p={p} row={row} align={align} icon="language-outline" label={t.language}>
          <Segmented
            p={p}
            row={row}
            options={[{ k: 'ar', l: 'العربية' }, { k: 'en', l: 'English' }]}
            value={lang}
            onChange={setLang}
          />
        </Row>
        <Row p={p} row={row} align={align} icon="contrast-outline" label={t.theme}>
          <Segmented
            p={p}
            row={row}
            options={[{ k: 'light', l: t.themeLight }, { k: 'dark', l: t.themeDark }]}
            value={theme}
            onChange={setTheme}
          />
        </Row>
        <Row p={p} row={row} align={align} icon="cash-outline" label={t.currency} stack>
          <View style={{ flexDirection: row, flexWrap: 'wrap', gap: 7, marginTop: 8 }}>
            {currencies.map((c) => {
              const on = currency === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCurrency(c.id)}
                  style={[styles.chip, { backgroundColor: on ? BRAND.main : p.inset, borderColor: on ? BRAND.main : p.hair }]}
                >
                  <Text style={[TYPE.meta, { color: on ? '#fff' : p.head, fontWeight: '800', fontSize: 12.5 }]}>{c.short}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[TYPE.caption, { color: p.muted, fontSize: 11.5, marginTop: 8, fontWeight: '600', textAlign: align }]}>
            {currency === 'auto' ? t.currencyAuto : ''}
          </Text>
        </Row>
      </Group>

      <Group p={p} align={align} title={t.contactUs}>
        <Link p={p} row={row} align={align} fwd={fwd} icon="logo-whatsapp" label={t.whatsapp} onPress={() => Linking.openURL(`https://wa.me/${whatsapp}`)} />
        <Link p={p} row={row} align={align} fwd={fwd} icon="call-outline" label={rtl ? 'اتصل بنا' : 'Call us'} onPress={() => Linking.openURL(`tel:+${whatsapp}`)} />
        <Link p={p} row={row} align={align} fwd={fwd} icon="mail-outline" label="info@palmas.ps" onPress={() => Linking.openURL('mailto:info@palmas.ps')} />
      </Group>

      {session ? (
        <Pressable
          onPress={() => {
            Alert.alert('', t.logout, [
              { text: rtl ? 'إلغاء' : 'Cancel', style: 'cancel' },
              { text: t.logout, style: 'destructive', onPress: () => signOut() },
            ]);
          }}
          style={[styles.logout, { borderColor: p.hair }]}
        >
          <Text style={[TYPE.title, { color: BRAND.danger, fontSize: 14 }]}>{t.logout}</Text>
        </Pressable>
      ) : null}

      <Text style={[TYPE.caption, { color: p.muted, textAlign: 'center', marginTop: SPACE.lg, fontWeight: '600' }]}>Palmas.ps · v1.0.0</Text>
    </ScrollView>
  );
}

const Group = ({ p, title, align, children }) => (
  <View style={{ marginTop: SPACE.lg }}>
    <Text style={[TYPE.meta, { color: p.muted, paddingHorizontal: SPACE.gutter, marginBottom: 8, textAlign: align }]}>{title}</Text>
    <View style={[styles.card, { backgroundColor: p.card, borderColor: p.hair, paddingVertical: 4 }]}>{children}</View>
  </View>
);

/* The label side takes the slack so the control always sits flush against the far edge.
   An auto margin can't do that here: it follows the writing direction, not row-reverse. */
const Row = ({ p, icon, label, children, stack, row, align }) => (
  <View style={[styles.row, { flexDirection: row }, stack && { flexDirection: 'column', alignItems: 'stretch' }]}>
    <View style={{ flexDirection: row, alignItems: 'center', gap: 10, flex: stack ? undefined : 1 }}>
      <Ionicons name={icon} size={18} color={BRAND.main} />
      <Text style={[TYPE.title, { color: p.head, fontWeight: '700', fontSize: 14, textAlign: align }]}>{label}</Text>
    </View>
    <View>{children}</View>
  </View>
);

const Link = ({ p, icon, label, onPress, row, align, fwd }) => (
  <Pressable onPress={onPress} style={[styles.row, { flexDirection: row }]}>
    <Ionicons name={icon} size={18} color={BRAND.main} />
    <Text style={[TYPE.title, { color: p.head, fontWeight: '700', fontSize: 14, marginInlineStart: 10, flex: 1, textAlign: align }]}>{label}</Text>
    <Ionicons name={fwd} size={16} color={p.muted} />
  </Pressable>
);

const Segmented = ({ p, options, value, onChange, row }) => (
  <View style={{ flexDirection: row, backgroundColor: p.inset, borderRadius: RADIUS.sm, padding: 3 }}>
    {options.map((o) => {
      const on = value === o.k;
      return (
        <Pressable
          key={o.k}
          onPress={() => onChange(o.k)}
          style={{ paddingHorizontal: 13, height: 32, justifyContent: 'center', borderRadius: 8, backgroundColor: on ? BRAND.main : 'transparent' }}
        >
          <Text style={[TYPE.meta, { color: on ? '#fff' : p.ink, fontWeight: '800' }]}>{o.l}</Text>
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  title: { fontSize: 24, lineHeight: 37, fontWeight: '900', letterSpacing: -0.4, paddingHorizontal: SPACE.gutter, marginBottom: SPACE.md },
  card: { marginHorizontal: SPACE.gutter, borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACE.lg },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  cta: { marginTop: SPACE.md, height: 48, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  row: { alignItems: 'center', paddingVertical: 13, paddingHorizontal: 4 },
  chip: { paddingHorizontal: SPACE.md, height: 44, borderRadius: RADIUS.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  logout: { marginHorizontal: SPACE.gutter, marginTop: SPACE.lg, height: 50, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
