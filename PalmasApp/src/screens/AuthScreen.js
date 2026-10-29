import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Image, Platform,
  KeyboardAvoidingView, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../store';
import { useDir } from '../dir';
import { GOOGLE, googleReady } from '../authConfig';
import { palette, BRAND, RADIUS, TYPE, SPACE } from '../theme';

WebBrowser.maybeCompleteAuthSession();

/**
 * The website's account flow, screen-shaped for a phone: sign in / sign up, and the
 * forgot-password → 6-digit code → signed-in path. All of it runs through the shared
 * account service, so one account works on the site and on the phone.
 *
 * Apple sign-in is added here only — it is an App Store expectation on iOS, and has no
 * equivalent on the website. It never renders on Android.
 *
 * Touch targets are >= 48dp throughout (Material) which also clears Apple's 44pt floor.
 */

const TAP = 48;          // minimum comfortable touch target
const FIELD = 54;        // text input height
const OTP_LEN = 6;
const RESEND_SECONDS = 45;

export default function AuthScreen({ navigation }) {
  const { theme, t, signIn, signUp, core } = useApp();
  const { rtl, row, align, back } = useDir();
  const p = palette(theme);
  const insets = useSafeAreaInsets();
  const P = core();

  const [mode, setMode] = useState('login');   // login | signup | forgot | otp
  const [method, setMethod] = useState('email');
  const [name, setName] = useState('');
  const [ident, setIdent] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [otp, setOtp] = useState(Array(OTP_LEN).fill(''));
  const [otpFor, setOtpFor] = useState('');
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const otpRefs = useRef([...Array(OTP_LEN)].map(() => React.createRef()));

  const [appleReady, setAppleReady] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync().then(setAppleReady).catch(() => setAppleReady(false));
  }, []);

  /* Google lives in its own component below: useAuthRequest throws when no client ID is
     configured, and a hook cannot be skipped with a condition — so the component simply
     is not mounted until src/authConfig.js is filled in. */
  const hasGoogle = googleReady(Platform.OS);

  /* One account per person, whichever door they came through: try to sign in with the
     provider-derived password, and create the account the first time. */
  const adoptSocialAccount = async (identifier, password, full) => {
    try {
      await signIn({ identifier, password, method: 'email' });
    } catch (e) {
      await signUp({ identifier, password, method: 'email', name: full || identifier.split('@')[0] });
    }
    navigation.goBack();
  };

  /* resend countdown, only while the code screen is open */
  useEffect(() => {
    if (mode !== 'otp' || seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [mode, seconds]);

  const isSignup = mode === 'signup';
  const isLogin = mode === 'login';
  const isForgot = mode === 'forgot';
  const isOtp = mode === 'otp';

  const go = (m) => { setMode(m); setErr(''); };

  const submit = async () => {
    setErr('');
    if (!ident.trim() || !pass.trim() || (isSignup && !name.trim())) {
      setErr(t.fillFields);
      return;
    }
    setBusy(true);
    try {
      const payload = {
        identifier: method === 'email' ? ident.trim().toLowerCase() : ident.trim(),
        password: pass,
        method,
        name: name.trim(),
      };
      if (isSignup) await signUp(payload); else await signIn(payload);
      navigation.goBack();
    } catch (e) {
      setErr(t.badCreds);
    } finally {
      setBusy(false);
    }
  };

  const startForgot = async () => {
    setErr('');
    if (!ident.trim()) { setErr(t.fillFields); return; }
    setBusy(true);
    try {
      const id = method === 'email' ? ident.trim().toLowerCase() : ident.trim();
      await P.API.findAccount({ identifier: id, method });
      setOtpFor(id);
      setOtp(Array(OTP_LEN).fill(''));
      setSeconds(RESEND_SECONDS);
      setMode('otp');
    } catch (e) {
      setErr(t.noAccount);
    } finally {
      setBusy(false);
    }
  };

  const onOtpChange = (i, v) => {
    const digit = v.replace(/[^0-9]/g, '').slice(-1);
    const next = otp.slice();
    next[i] = digit;
    setOtp(next);
    setErr('');
    if (digit && i < OTP_LEN - 1) otpRefs.current[i + 1].current?.focus();
  };

  const onOtpKey = (i, e) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1].current?.focus();
  };

  const verifyOtp = async () => {
    if (otp.join('').length < OTP_LEN) { setErr(t.otpWrong); return; }
    setBusy(true);
    try {
      await P.API.signInAfterOtp(otpFor);
      navigation.goBack();
    } catch (e) {
      setErr(t.otpWrong);
    } finally {
      setBusy(false);
    }
  };

  /* iOS only. Apple may withhold the email on repeat sign-ins, so the stable user
     identifier is what we key the account on. */
  const appleSignIn = async () => {
    setErr('');
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const identifier = (cred.email || `${cred.user}@appleid.apple.com`).toLowerCase();
      const full = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(' ');
      await adoptSocialAccount(identifier, `apple:${cred.user}`, full);
    } catch (e) {
      if (e && e.code === 'ERR_REQUEST_CANCELED') return;   // the user backed out
      setErr(t.appleFailed);
    }
  };

  const title = isForgot ? t.forgotTitle : isOtp ? t.otpTitle : isSignup ? t.signup : t.login;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: p.page }}>
      {/* A real header row, below the status bar and on the reading side — not an
          absolutely positioned button floating over the clock. */}
      <View style={[styles.header, { flexDirection: row, paddingTop: insets.top + SPACE.xs }]}>
        <Pressable
          onPress={() => (isOtp ? go('forgot') : isForgot ? go('login') : navigation.goBack())}
          style={({ pressed }) => [styles.back, { backgroundColor: pressed ? p.inset : 'transparent' }]}
          hitSlop={10}
        >
          <Ionicons name={back} size={24} color={p.head} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => navigation.goBack()} style={styles.skip} hitSlop={10}>
          <Text style={[TYPE.meta, { color: p.muted }]}>{t.continueGuest}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + SPACE.xxl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', marginTop: SPACE.sm, marginBottom: SPACE.xl }}>
          <Image
            source={theme === 'dark' ? require('../../assets/logo-light.png') : require('../../assets/logo-dark.png')}
            style={{ width: 168, height: 42, resizeMode: 'contain' }}
          />
        </View>

        <View style={{ paddingHorizontal: SPACE.xl }}>
          <Text style={[TYPE.h1, { color: p.head, textAlign: 'center' }]}>{title}</Text>

          {/* ---------- sign in / sign up ---------- */}
          {(isLogin || isSignup) ? (
            <>
              <View style={[styles.tabs, { flexDirection: row, backgroundColor: p.inset }]}>
                {[{ k: 'login', l: t.login }, { k: 'signup', l: t.signup }].map((m) => {
                  const on = mode === m.k;
                  return (
                    <Pressable key={m.k} onPress={() => go(m.k)} style={[styles.tab, on && { backgroundColor: BRAND.main }]}>
                      <Text style={[TYPE.label, { color: on ? '#fff' : p.ink }]}>{m.l}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={[styles.methods, { flexDirection: row }]}>
                {[{ k: 'email', l: t.email, i: 'mail-outline' }, { k: 'phone', l: t.phone, i: 'call-outline' }].map((m) => {
                  const on = method === m.k;
                  return (
                    <Pressable
                      key={m.k}
                      onPress={() => { setMethod(m.k); setErr(''); }}
                      style={[styles.method, { flexDirection: row, borderColor: on ? BRAND.main : p.field, backgroundColor: on ? 'rgba(246,135,67,0.10)' : p.card }]}
                    >
                      <Ionicons name={m.i} size={16} color={on ? BRAND.main : p.muted} />
                      <Text style={[TYPE.meta, { color: on ? BRAND.deep : p.ink }]}>{m.l}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {isSignup ? (
                <Field p={p} row={row} align={align} icon="person-outline" value={name} onChangeText={setName}
                  placeholder={t.fullName} autoCapitalize="words" />
              ) : null}

              <Field
                p={p} row={row} align={align}
                icon={method === 'email' ? 'mail-outline' : 'call-outline'}
                value={ident} onChangeText={setIdent}
                placeholder={method === 'email' ? t.email : t.phone}
                keyboardType={method === 'email' ? 'email-address' : 'phone-pad'}
                autoCapitalize="none"
              />

              <Field
                p={p} row={row} align={align} icon="lock-closed-outline"
                value={pass} onChangeText={setPass} placeholder={t.password}
                secureTextEntry={!showPass}
                trailing={
                  <Pressable onPress={() => setShowPass((s) => !s)} hitSlop={10}>
                    <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={19} color={p.muted} />
                  </Pressable>
                }
              />

              {isLogin ? (
                <Pressable onPress={() => go('forgot')} style={[styles.forgot, { alignSelf: rtl ? 'flex-end' : 'flex-start' }]} hitSlop={8}>
                  <Text style={[TYPE.meta, { color: BRAND.main }]}>{t.forgotQ}</Text>
                </Pressable>
              ) : null}

              <Err p={p} align={align} text={err} />

              <Cta onPress={submit} busy={busy} label={isSignup ? t.signup : t.login} />

              {(appleReady || hasGoogle) ? (
                <>
                  <View style={[styles.divider, { flexDirection: row }]}>
                    <View style={[styles.line, { backgroundColor: p.hair }]} />
                    <Text style={[TYPE.meta, { color: p.muted }]}>{t.orDivider}</Text>
                    <View style={[styles.line, { backgroundColor: p.hair }]} />
                  </View>

                  {hasGoogle ? (
                    <GoogleButton
                      p={p} row={row} label={t.googleSignIn}
                      onFail={() => setErr(t.googleFailed)}
                      onAccount={adoptSocialAccount}
                      clearErr={() => setErr('')}
                    />
                  ) : null}

                  {appleReady ? (
                    <AppleAuthentication.AppleAuthenticationButton
                      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                      buttonStyle={
                        theme === 'dark'
                          ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                          : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                      }
                      cornerRadius={RADIUS.md}
                      style={{ height: FIELD, width: '100%', marginTop: hasGoogle ? SPACE.sm : 0 }}
                      onPress={appleSignIn}
                    />
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}

          {/* ---------- forgot ---------- */}
          {isForgot ? (
            <>
              <Text style={[TYPE.body, { color: p.muted, textAlign: 'center', marginTop: SPACE.sm, marginBottom: SPACE.lg }]}>
                {t.forgotBody}
              </Text>
              <Field
                p={p} row={row} align={align}
                icon={method === 'email' ? 'mail-outline' : 'call-outline'}
                value={ident} onChangeText={setIdent}
                placeholder={method === 'email' ? t.email : t.phone}
                keyboardType={method === 'email' ? 'email-address' : 'phone-pad'}
                autoCapitalize="none"
              />
              <Err p={p} align={align} text={err} />
              <Cta onPress={startForgot} busy={busy} label={t.sendCode} />
              <Pressable onPress={() => go('login')} style={styles.ghost} hitSlop={8}>
                <Text style={[TYPE.meta, { color: p.muted }]}>{t.backToLogin}</Text>
              </Pressable>
            </>
          ) : null}

          {/* ---------- code ---------- */}
          {isOtp ? (
            <>
              <Text style={[TYPE.body, { color: p.muted, textAlign: 'center', marginTop: SPACE.sm }]}>
                {t.otpBody}
              </Text>
              <Text style={[TYPE.title, { color: p.head, textAlign: 'center', marginBottom: SPACE.lg }]}>{otpFor}</Text>

              {/* boxes stay left-to-right: a numeric code reads the same in both languages */}
              <View style={styles.otpRow}>
                {otp.map((v, i) => (
                  <TextInput
                    key={i}
                    ref={otpRefs.current[i]}
                    value={v}
                    onChangeText={(x) => onOtpChange(i, x)}
                    onKeyPress={(e) => onOtpKey(i, e)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    style={[styles.otpBox, {
                      backgroundColor: p.card,
                      borderColor: v ? BRAND.main : p.field,
                      color: p.head,
                    }]}
                  />
                ))}
              </View>

              <Err p={p} align="center" text={err} />
              <Cta onPress={verifyOtp} busy={busy} label={t.verify} />

              <Pressable
                onPress={() => { if (seconds <= 0) { setSeconds(RESEND_SECONDS); setOtp(Array(OTP_LEN).fill('')); } }}
                disabled={seconds > 0}
                style={styles.ghost}
                hitSlop={8}
              >
                <Text style={[TYPE.meta, { color: seconds > 0 ? p.muted : BRAND.main }]}>
                  {seconds > 0 ? t.resendIn(seconds) : t.resend}
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ---------- pieces ---------- */

/**
 * Mounted only when a Google client ID exists — `useAuthRequest` throws without one,
 * and hooks cannot be called conditionally, so the guard has to be the mount itself.
 */
function GoogleButton({ p, row, label, onAccount, onFail, clearErr }) {
  const [request, response, prompt] = Google.useAuthRequest({
    iosClientId: GOOGLE.iosClientId || undefined,
    androidClientId: GOOGLE.androidClientId || undefined,
    webClientId: GOOGLE.webClientId || undefined,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'dismiss' || response.type === 'cancel') return;   // user backed out
    if (response.type !== 'success') { onFail(); return; }
    (async () => {
      try {
        const token = response.authentication?.accessToken;
        const r = await fetch('https://www.googleapis.com/userinfo/v2/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const me = await r.json();
        if (!me.email) { onFail(); return; }
        await onAccount(me.email.toLowerCase(), `google:${me.id}`, me.name || '');
      } catch (e) {
        onFail();
      }
    })();
  }, [response]);

  return (
    <Pressable
      onPress={() => { clearErr(); prompt(); }}
      disabled={!request}
      style={({ pressed }) => [
        styles.social,
        { flexDirection: row, backgroundColor: pressed ? p.inset : p.card, borderColor: p.field },
      ]}
    >
      <Ionicons name="logo-google" size={19} color="#4285F4" />
      <Text style={[TYPE.h3, { color: p.head, fontSize: 15 }]}>{label}</Text>
    </Pressable>
  );
}

const Field = ({ p, icon, row, align, trailing, ...rest }) => (
  <View style={[styles.field, { flexDirection: row, backgroundColor: p.card, borderColor: p.field }]}>
    <Ionicons name={icon} size={19} color={p.muted} />
    <TextInput
      {...rest}
      placeholderTextColor={p.muted}
      style={{ flex: 1, color: p.head, fontSize: 15, paddingVertical: 0, textAlign: align }}
    />
    {trailing}
  </View>
);

const Cta = ({ onPress, busy, label }) => (
  <Pressable onPress={onPress} disabled={busy} style={[styles.cta, { backgroundColor: BRAND.main, opacity: busy ? 0.65 : 1 }]}>
    {busy ? <ActivityIndicator color="#fff" /> : <Text style={[TYPE.h3, { color: '#fff', fontSize: 15.5 }]}>{label}</Text>}
  </Pressable>
);

const Err = ({ p, text, align }) =>
  text ? <Text style={[TYPE.meta, { color: BRAND.danger, marginTop: SPACE.sm, textAlign: align }]}>{text}</Text> : null;

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingHorizontal: SPACE.sm, paddingBottom: SPACE.xs },
  back: { width: TAP, height: TAP, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  skip: { height: TAP, paddingHorizontal: SPACE.md, justifyContent: 'center' },

  social: { height: FIELD, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: SPACE.sm },

  tabs: { borderRadius: RADIUS.md, padding: 4, marginTop: SPACE.lg, marginBottom: SPACE.md },
  tab: { flex: 1, height: TAP - 8, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },

  methods: { gap: SPACE.sm, marginBottom: SPACE.md },
  method: { flex: 1, height: TAP - 4, borderRadius: RADIUS.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: SPACE.xs },

  field: { alignItems: 'center', gap: SPACE.sm, height: FIELD, borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: SPACE.gutter, marginBottom: SPACE.md - 2 },

  forgot: { paddingVertical: SPACE.xs, minHeight: TAP - 16, justifyContent: 'center' },

  cta: { height: FIELD, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginTop: SPACE.md },
  ghost: { minHeight: TAP, alignItems: 'center', justifyContent: 'center', marginTop: SPACE.sm },

  divider: { alignItems: 'center', gap: SPACE.md, marginVertical: SPACE.lg },
  line: { flex: 1, height: 1 },

  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: SPACE.sm },
  otpBox: { width: 48, height: 58, borderRadius: RADIUS.md, borderWidth: 1.5, textAlign: 'center', fontSize: 22, fontWeight: '800' },
});
