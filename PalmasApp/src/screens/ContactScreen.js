import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  Linking, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../store';
import { useDir } from '../dir';
import { palette, BRAND, RADIUS, TYPE, SPACE } from '../theme';

/**
 * The website's contact page. The form writes to the same `palmas_crm_messages` store
 * the site writes to, so a message sent from the phone becomes a CRM lead exactly like
 * one sent from the browser — previously these were lost.
 */
export default function ContactScreen({ navigation }) {
  const { theme, t, session, submitMessage, whatsapp } = useApp();
  const { rtl, row, align, back } = useDir();
  const p = palette(theme);
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(session?.name || '');
  const [phone, setPhone] = useState(session?.phone || '');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);

  const send = () => {
    if (!name.trim() || !phone.trim()) { setErr(t.fillFields); return; }
    setErr('');
    submitMessage({ name: name.trim(), phone: phone.trim(), msg: msg.trim() });
    setSent(true);
  };

  const reset = () => { setMsg(''); setSent(false); };

  const rows = [
    { icon: 'call-outline', label: t.ourPhone, value: `+${whatsapp}`, go: () => Linking.openURL(`tel:+${whatsapp}`) },
    { icon: 'mail-outline', label: t.ourEmail, value: 'info@palmas.ps', go: () => Linking.openURL('mailto:info@palmas.ps') },
    { icon: 'location-outline', label: t.ourAddress, value: t.addressValue },
  ];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: p.page }}>
      <View style={[styles.header, { flexDirection: row, paddingTop: insets.top + SPACE.xs }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back} hitSlop={10}>
          <Ionicons name={back} size={24} color={p.head} />
        </Pressable>
        <Text style={[TYPE.h3, { color: p.head, flex: 1, textAlign: align }]}>{t.contactUs}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: SPACE.gutter, paddingBottom: insets.bottom + SPACE.xxl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[TYPE.h1, { color: p.head, textAlign: align }]}>{t.contactTitle}</Text>
        <Text style={[TYPE.body, { color: p.muted, marginTop: SPACE.sm, marginBottom: SPACE.lg, textAlign: align }]}>
          {t.contactBody}
        </Text>

        {sent ? (
          <View style={[styles.card, { backgroundColor: p.card, borderColor: p.hair, alignItems: 'center' }]}>
            <View style={[styles.okCircle, { backgroundColor: 'rgba(31,157,92,0.14)' }]}>
              <Ionicons name="checkmark" size={32} color={BRAND.ok} />
            </View>
            <Text style={[TYPE.h2, { color: p.head, marginTop: SPACE.md, textAlign: 'center' }]}>{t.sentTitle}</Text>
            <Text style={[TYPE.body, { color: p.muted, marginTop: 6, textAlign: 'center' }]}>{t.sentBody}</Text>
            <Pressable onPress={reset} style={[styles.ghost, { borderColor: p.field }]}>
              <Text style={[TYPE.title, { color: p.head }]}>{t.sendAnother}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: p.card, borderColor: p.hair }]}>
            <Field p={p} align={align} label={t.fullName} value={name} onChangeText={setName} />
            <Field p={p} align={align} label={t.phone} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Field
              p={p} align={align} label={t.fMsg} value={msg} onChangeText={setMsg}
              multiline numberOfLines={4} height={110}
            />
            {err ? <Text style={[TYPE.meta, { color: BRAND.danger, marginBottom: SPACE.sm, textAlign: align }]}>{err}</Text> : null}
            <Pressable onPress={send} style={[styles.cta, { backgroundColor: BRAND.main }]}>
              <Text style={[TYPE.h3, { color: '#fff', fontSize: 15 }]}>{t.fSend}</Text>
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL(`https://wa.me/${whatsapp}`)}
              style={[styles.wa, { flexDirection: row, borderColor: p.field }]}
            >
              <Ionicons name="logo-whatsapp" size={19} color="#25D366" />
              <Text style={[TYPE.title, { color: p.head }]}>{t.whatsapp}</Text>
            </Pressable>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: p.card, borderColor: p.hair, marginTop: SPACE.md, paddingVertical: SPACE.xs }]}>
          {rows.map((r, i) => (
            <Pressable
              key={r.label}
              onPress={r.go}
              disabled={!r.go}
              style={[styles.row, { flexDirection: row, borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderBottomColor: p.hair }]}
            >
              <Ionicons name={r.icon} size={19} color={BRAND.main} />
              <View style={{ flex: 1 }}>
                <Text style={[TYPE.caption, { color: p.muted, fontWeight: '600', textAlign: align }]}>{r.label}</Text>
                <Text style={[TYPE.title, { color: p.head, marginTop: 1, textAlign: align }]}>{r.value}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const Field = ({ p, label, align, height, ...rest }) => (
  <View style={{ marginBottom: SPACE.md }}>
    <Text style={[TYPE.meta, { color: p.muted, marginBottom: 6, textAlign: align }]}>{label}</Text>
    <TextInput
      {...rest}
      placeholderTextColor={p.muted}
      style={{
        minHeight: height || 52,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: p.field,
        backgroundColor: p.page,
        paddingHorizontal: SPACE.md,
        paddingTop: height ? SPACE.md : 0,
        color: p.head,
        fontSize: 15,
        textAlign: align,
        textAlignVertical: height ? 'top' : 'center',
      }}
    />
  </View>
);

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingHorizontal: SPACE.sm, paddingBottom: SPACE.xs, gap: SPACE.xs },
  back: { width: 48, height: 48, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACE.gutter },
  cta: { height: 52, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  wa: { height: 52, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: SPACE.sm, marginTop: SPACE.sm },
  ghost: { height: 48, paddingHorizontal: SPACE.xl, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: SPACE.lg },
  okCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  row: { alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.md, minHeight: 60 },
});
