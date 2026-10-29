import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, Easing, StyleSheet, Dimensions } from 'react-native';
import { BRAND } from '../theme';
import { t as strings } from '../i18n';

/**
 * The same opening the website shows: cream gradient ground, two pulsing brand glows,
 * the dark-text logo, a hairline rule, the tagline, and a sliding loading bar —
 * visible 2.3s, then a half-second fade-and-scale away.
 */
export default function SplashScreen({ lang = 'ar', onDone }) {
  const t = strings(lang);
  const { width } = Dimensions.get('window');

  const logo = useRef(new Animated.Value(0)).current;
  const rule = useRef(new Animated.Value(0)).current;
  const tag = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logo, { toValue: 1, duration: 1000, easing: Easing.bezier(0.25, 0.8, 0.35, 1), useNativeDriver: true }),
      Animated.timing(rule, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(tag, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1750, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1750, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(bar, { toValue: 1, duration: 1150, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
    ).start();

    const hold = setTimeout(() => {
      Animated.timing(out, { toValue: 1, duration: 520, useNativeDriver: true }).start(() => onDone?.());
    }, 2300);
    return () => clearTimeout(hold);
  }, []);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.wrap,
        { opacity: out.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [{ scale: out.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] }) }] },
      ]}
    >
      <Animated.View
        style={[styles.glow, { top: -width * 0.18, insetInlineStart: -width * 0.22, width: width * 0.78, height: width * 0.78,
          opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.34, 0.6] }),
          transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] }]}
      />
      <Animated.View
        style={[styles.glow2, { bottom: -width * 0.22, insetInlineEnd: -width * 0.24, width: width * 0.74, height: width * 0.74,
          opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.42] }),
          transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1.08, 1] }) }] }]}
      />

      <Animated.View
        style={{
          alignItems: 'center',
          opacity: logo,
          transform: [
            { translateY: logo.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
            { scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
          ],
        }}
      >
        <Image source={require('../../assets/logo-dark.png')} style={{ width: 212, height: 54, resizeMode: 'contain' }} />
      </Animated.View>

      <Animated.View style={[styles.rule, { transform: [{ scaleX: rule }] }]} />

      <Animated.Text
        style={[styles.tag, { opacity: tag, transform: [{ translateY: tag.interpolate({ inputRange: [0, 1], outputRange: [9, 0] }) }] }]}
      >
        {t.splashTag}
      </Animated.Text>

      <View style={styles.barTrack}>
        <Animated.View
          style={[styles.barFill, { transform: [{ translateX: bar.interpolate({ inputRange: [0, 1], outputRange: [-40, 96] }) }] }]}
        />
      </View>

      <Text style={styles.foot}>{t.splashFoot}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#fdf6ef', alignItems: 'center', justifyContent: 'center', zIndex: 3000 },
  glow: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(230,126,34,0.30)' },
  glow2: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(230,126,34,0.18)' },
  rule: { width: 118, height: 1.5, marginTop: 22, backgroundColor: BRAND.main },
  tag: { marginTop: 16, color: '#6d5844', fontSize: 13.5, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' },
  barTrack: { width: 96, height: 2.5, marginTop: 30, borderRadius: 2, backgroundColor: 'rgba(120,80,40,0.14)', overflow: 'hidden' },
  barFill: { width: '42%', height: '100%', borderRadius: 2, backgroundColor: BRAND.main },
  foot: { position: 'absolute', bottom: 38, color: 'rgba(90,66,42,0.42)', fontSize: 10.5, fontWeight: '700', letterSpacing: 1.6 },
});
