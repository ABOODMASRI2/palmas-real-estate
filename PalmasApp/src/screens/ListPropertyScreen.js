import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../store';
import { useDir } from '../dir';
import { palette, BRAND, RADIUS, TYPE, SPACE } from '../theme';

/**
 * "List your property with us" — the website's header form, as a screen.
 * Writes the same record to `palmas_listings`, which Palmas.CRM reads as the "listing"
 * lead source, so an owner who asks through the app lands in the same pipeline.
 */
export default function ListPropertyScreen({ navigation }) {
  const { theme, t, labels, session, core, submitListing } = useApp();
  const { rtl, row, align, back } = useDir();
  const p = palette(theme);
  const insets = useSafeAreaInsets();
  const P = core();

  const [name, setName] = useState(session?.name || '');
  const [phone, setPhone] = useState(session?.phone || '');
  const [city, setCity] = useState('');
  const [deal, setDeal] = useState('sale');
  const [propType, setPropType] = useState('apartment');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('usd');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);

  const types = useMemo(
    () => (P && labels ? P.TYPES.filter((k) => k !== 'all').map((k) => ({ k, l: labels.type[k] })) : []),
    [P, labels]
  );
  const currencies = useMemo(
    () => (P ? P.Currency.list().map((c) => ({ k: c.id, l: rtl ? c.shortAr : c.shortEn })) : []),
    [P, rtl]
  );

  const send = () => {
    if (!name.trim() || !phone.trim()) { setErr(t.fillFields); return; }
    setErr('');
    submitListing({
      name: name.trim(), phone: phone.trim(), city: city.trim(),
      deal, propType, price: price.trim(), currency, notes: notes.trim(),
    });
    setSent(true);
  };

  if (!P || !labels) return <View style={{ flex: 1, backgroundColor: p.page }} />;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: p.page }}>
      <View style={[styles.header, { flexDirection: row, paddingTop: insets.top + SPACE.xs }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back} hitSlop={10}>
          <Ionicons name={back} size={24} color={p.head} />
        </Pressable>
        <Text style={[TYPE.h3, { color: p.head, flex: 1, textAlign: align }]}>{t.listTitle}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: SPACE.gutter, paddingBottom: insets.bottom + SPACE.xxl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {sent ? (
          <View style={[styles.card, { backgroundColor: p.card, borderColor: p.hair, alignItems: 'center' }]}>
            <View style={[styles.okCircle, { backgroundColor: 'rgba(31,157,92,0.14)' }]}>
              <Ionicons name="checkmark" size={32} color={BRAND.ok} />
            </View>
            <Text style={[TYPE.h2, { color: p.head, marginTop: SPACE.md, textAlign: 'center' }]}>{t.listSentTitle}</Text>
            <Text style={[TYPE.body, { color: p.muted, marginTop: 6, textAlign: 'center' }]}>{t.listSentBody}</Text>
            <Pressable onPress={() => navigation.goBack()} style={[styles.cta, { backgroundColor: BRAND.main, marginTop: SPACE.lg, paddingHorizontal: SPACE.xl }]}>
              <Text style={[TYPE.h3, { color: '#fff', fontSize: 15 }]}>{t.navHome}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={[TYPE.body, { color: p.muted, marginBottom: SPACE.lg, textAlign: align }]}>{t.listBody}</Text>

            <View style={[styles.card, { backgroundColor: p.card, borderColor: p.hair }]}>
              <Field p={p} align={align} label={t.fullName} value={name} onChangeText={setName} />
              <Field p={p} align={align} label={t.phone} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <Field p={p} align={align} label={t.listCity} value={city} onChangeText={setCity} />

              <Text style={[TYPE.meta, { color: p.muted, marginBottom: 6, textAlign: align }]}>{t.listDeal}</Text>
              <View style={[styles.pillRow, { flexDirection: row }]}>
                {[{ k: 'sale', l: t.listSell }, { k: 'rent', l: t.listRent }].map((d) => (
                  <Pill key={d.k} p={p} on={deal === d.k} label={d.l} onPress={() => setDeal(d.k)} grow />
                ))}
              </View>

              <Text style={[TYPE.meta, { color: p.muted, marginBottom: 6, textAlign: align }]}>{t.propType}</Text>
              <View style={[styles.pillWrap, { flexDirection: row }]}>
                {types.map((ty) => (
                  <Pill key={ty.k} p={p} on={propType === ty.k} label={ty.l} onPress={() => setPropType(ty.k)} />
                ))}
              </View>

              <Text style={[TYPE.meta, { color: p.muted, marginBottom: 6, marginTop: SPACE.md, textAlign: align }]}>{t.listPrice}</Text>
              <View style={[styles.priceRow, { flexDirection: row }]}>
                <TextInput
                  value={price}
                  onChangeText={(v) => setPrice(v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholderTextColor={p.muted}
                  style={[styles.input, { flex: 1, borderColor: p.field, backgroundColor: p.page, color: p.head, textAlign: align }]}
                />
                <View style={[styles.pillWrap, { flexDirection: row, flex: 1 }]}>
                  {currencies.map((c) => (
                    <Pill key={c.k} p={p} on={currency === c.k} label={c.l} onPress={() => setCurrency(c.k)} />
                  ))}
                </View>
              </View>

              <Text style={[TYPE.meta, { color: p.muted, marginBottom: 6, marginTop: SPACE.md, textAlign: align }]}>{t.listNotes}</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                placeholderTextColor={p.muted}
                style={[styles.input, {
                  minHeight: 96, paddingTop: SPACE.md, borderColor: p.field,
                  backgroundColor: p.page, color: p.head, textAlign: align, textAlignVertical: 'top',
                }]}
              />

              {err ? <Text style={[TYPE.meta, { color: BRAND.danger, marginTop: SPACE.sm, textAlign: align }]}>{err}</Text> : null}

              <Pressable onPress={send} style={[styles.cta, { backgroundColor: BRAND.main, marginTop: SPACE.md }]}>
                <Text style={[TYPE.h3, { color: '#fff', fontSize: 15 }]}>{t.listSend}</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const Pill = ({ p, on, label, onPress, grow }) => (
  <Pressable
    onPress={onPress}
    style={[
      styles.pill,
      grow && { flex: 1 },
      { backgroundColor: on ? BRAND.main : p.page, borderColor: on ? BRAND.main : p.field },
    ]}
  >
    <Text numberOfLines={1} style={[TYPE.meta, { color: on ? '#fff' : p.ink }]}>{label}</Text>
  </Pressable>
);

const Field = ({ p, label, align, ...rest }) => (
  <View style={{ marginBottom: SPACE.md }}>
    <Text style={[TYPE.meta, { color: p.muted, marginBottom: 6, textAlign: align }]}>{label}</Text>
    <TextInput
      {...rest}
      placeholderTextColor={p.muted}
      style={[styles.input, { borderColor: p.field, backgroundColor: p.page, color: p.head, textAlign: align }]}
    />
  </View>
);

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingHorizontal: SPACE.sm, paddingBottom: SPACE.xs, gap: SPACE.xs },
  back: { width: 48, height: 48, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACE.gutter },
  input: { minHeight: 52, borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: SPACE.md, fontSize: 15 },
  pillRow: { gap: SPACE.sm, marginBottom: SPACE.md },
  pillWrap: { flexWrap: 'wrap', gap: SPACE.xs, marginBottom: SPACE.xs },
  pill: { paddingHorizontal: SPACE.md, height: 44, borderRadius: RADIUS.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  priceRow: { gap: SPACE.sm, alignItems: 'flex-start' },
  cta: { height: 52, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  okCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
});
