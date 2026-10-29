import React, { useState } from 'react';
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
 * The website's Account page: edit name / email / phone, and change the password.
 * Both go through the shared account service, so a change made on the phone is the
 * same change the website sees.
 */
export default function AccountSettingsScreen({ navigation }) {
  const { theme, t, session, updateProfile, changePassword } = useApp();
  const { row, align, back } = useDir();
  const p = palette(theme);
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(session?.name || '');
  const [email, setEmail] = useState(session?.email || '');
  const [phone, setPhone] = useState(session?.phone || '');
  const [pErr, setPErr] = useState('');
  const [pOk, setPOk] = useState('');
  const [busyP, setBusyP] = useState(false);

  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [wErr, setWErr] = useState('');
  const [wOk, setWOk] = useState('');
  const [busyW, setBusyW] = useState(false);

  const saveProfile = async () => {
    setPErr(''); setPOk('');
    if (!name.trim() || (!email.trim() && !phone.trim())) { setPErr(t.fillFields); return; }
    setBusyP(true);
    try {
      await updateProfile({ name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() });
      setPOk(t.accSaved);
    } catch (e) {
      setPErr(t.badCreds);
    } finally {
      setBusyP(false);
    }
  };

  const savePassword = async () => {
    setWErr(''); setWOk('');
    if (!cur.trim() || !next.trim()) { setWErr(t.fillFields); return; }
    if (next.trim().length < 6) { setWErr(t.accPassShort); return; }
    setBusyW(true);
    try {
      await changePassword({ currentPassword: cur, newPassword: next });
      setWOk(t.accPassChanged);
      setCur(''); setNext('');
    } catch (e) {
      setWErr(t.accPassWrong);
    } finally {
      setBusyW(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: p.page }}>
      <View style={[styles.header, { flexDirection: row, paddingTop: insets.top + SPACE.xs }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back} hitSlop={10}>
          <Ionicons name={back} size={24} color={p.head} />
        </Pressable>
        <Text style={[TYPE.h3, { color: p.head, flex: 1, textAlign: align }]}>{t.accSettings}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: SPACE.gutter, paddingBottom: insets.bottom + SPACE.xxl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ---- profile ---- */}
        <Text style={[TYPE.meta, { color: p.muted, marginBottom: SPACE.sm, textAlign: align }]}>{t.accProfile}</Text>
        <View style={[styles.card, { backgroundColor: p.card, borderColor: p.hair }]}>
          <Field p={p} align={align} label={t.fullName} value={name} onChangeText={setName} autoCapitalize="words" />
          <Field p={p} align={align} label={t.email} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Field p={p} align={align} label={t.phone} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Note align={align} err={pErr} ok={pOk} />
          <Pressable onPress={saveProfile} disabled={busyP} style={[styles.cta, { backgroundColor: BRAND.main, opacity: busyP ? 0.65 : 1 }]}>
            <Text style={[TYPE.h3, { color: '#fff', fontSize: 15 }]}>{t.accSave}</Text>
          </Pressable>
        </View>

        {/* ---- password ---- */}
        <Text style={[TYPE.meta, { color: p.muted, marginTop: SPACE.lg, marginBottom: SPACE.sm, textAlign: align }]}>{t.accPassword}</Text>
        <View style={[styles.card, { backgroundColor: p.card, borderColor: p.hair }]}>
          <Field p={p} align={align} label={t.accCurrentPass} value={cur} onChangeText={setCur} secureTextEntry />
          <Field p={p} align={align} label={t.accNewPass} value={next} onChangeText={setNext} secureTextEntry />
          <Note align={align} err={wErr} ok={wOk} />
          <Pressable onPress={savePassword} disabled={busyW} style={[styles.cta, { backgroundColor: BRAND.main, opacity: busyW ? 0.65 : 1 }]}>
            <Text style={[TYPE.h3, { color: '#fff', fontSize: 15 }]}>{t.accPassword}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const Note = ({ err, ok, align }) =>
  err || ok ? (
    <Text style={[TYPE.meta, { color: err ? BRAND.danger : BRAND.ok, marginBottom: SPACE.sm, textAlign: align }]}>
      {err || ok}
    </Text>
  ) : null;

const Field = ({ p, label, align, ...rest }) => (
  <View style={{ marginBottom: SPACE.md }}>
    <Text style={[TYPE.meta, { color: p.muted, marginBottom: 6, textAlign: align }]}>{label}</Text>
    <TextInput
      {...rest}
      placeholderTextColor={p.muted}
      style={{
        height: 52, borderRadius: RADIUS.md, borderWidth: 1, borderColor: p.field,
        backgroundColor: p.page, paddingHorizontal: SPACE.md, color: p.head, fontSize: 15, textAlign: align,
      }}
    />
  </View>
);

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingHorizontal: SPACE.sm, paddingBottom: SPACE.xs, gap: SPACE.xs },
  back: { width: 48, height: 48, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACE.gutter },
  cta: { height: 52, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
});
