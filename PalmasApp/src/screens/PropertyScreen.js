import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Linking, TextInput, Modal, Alert, Image, FlatList } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../store';
import { useDir } from '../dir';
import { palette, BRAND, CATEGORY, RADIUS, TYPE, SPACE } from '../theme';

const SLOTS = ['09:00', '11:00', '13:00', '15:00', '17:00'];

export default function PropertyScreen({ route, navigation }) {
  const {
    theme, lang, t, L, properties, priceOf, money, isFav, toggleFav,
    labels, advisorFor, session, submitBooking, whatsapp,
  } = useApp();
  const { rtl, row, align, back } = useDir();
  const p = palette(theme);
  const insets = useSafeAreaInsets();

  const item = useMemo(() => properties.find((x) => x.id === route.params.id), [properties, route.params.id]);
  /* معرض الصور كما في الموقع: صورة رئيسية وشريط مصغّرات يبدّلها */
  const photos = useMemo(() => (item && item.photos ? item.photos.filter(Boolean) : []), [item]);
  const [shotAt, setShotAt] = useState(0);
  const shot = photos[shotAt] || photos[0] || null;
  const [book, setBook] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState(session?.name || '');
  const [phone, setPhone] = useState(session?.phone || '');

  /* payment calculator — works in the property's own currency, like the website */
  const [down, setDown] = useState(20);
  const [years, setYears] = useState(15);
  const rate = 6.5;

  if (!item) return <View style={{ flex: 1, backgroundColor: p.page }} />;

  const saved = isFav(item.id);
  const advisor = advisorFor(item.id);
  const cc = item.currency || 'usd';
  const downAmt = item.price * down / 100;
  const loan = item.price - downAmt;
  const n = years * 12;
  const r = rate / 100 / 12;
  const monthly = r === 0 ? loan / n : (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

  const wa = (text) => Linking.openURL(`https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`);

  const confirm = () => {
    if (!date || !time || !name.trim() || !phone.trim()) {
      Alert.alert('', t.fillFields);
      return;
    }
    submitBooking({ propId: item.id, propName: item.name.ar, date, time, name: name.trim(), phone: phone.trim() });
    setBook(false);
    setDate(''); setTime('');
    Alert.alert('', lang === 'ar' ? 'تم تأكيد موعدك — سيتواصل معك المستشار قريباً.' : 'Your viewing is booked — our advisor will be in touch.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: p.page }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* الصورة الرئيسية من السيرفر؛ وبلا صور يبقى التدرّج اللوني الذي
            تستعمله البطاقات والصفحة الرئيسية، فتبدو الشاشة مقصودة لا معطوبة */}
        <View style={[styles.hero, { backgroundColor: p.placeholder, paddingTop: insets.top }]}>
          {shot ? (
            <Image source={{ uri: shot }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <>
              <LinearGradient
                colors={[CATEGORY[item.type] || CATEGORY.fallback, 'rgba(0,0,0,0)']}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.95, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="home" size={92} color="rgba(255,255,255,0.38)" />
            </>
          )}
          <Pressable onPress={() => navigation.goBack()} style={[styles.round, { top: insets.top + 8, insetInlineStart: 14, backgroundColor: p.elev }]}>
            <Ionicons name={back} size={20} color={p.head} />
          </Pressable>
          <Pressable
            onPress={async () => { const res = await toggleFav(item.id); if (!res.ok) navigation.navigate('Auth'); }}
            style={[styles.round, { top: insets.top + 8, insetInlineEnd: 14, backgroundColor: p.elev }]}
          >
            <Ionicons name={saved ? 'heart' : 'heart-outline'} size={19} color={saved ? BRAND.main : p.head} />
          </Pressable>
        </View>

        {photos.length > 1 ? (
          <FlatList
            horizontal
            inverted={rtl}
            data={photos}
            keyExtractor={(u, i) => u + i}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: SPACE.gutter, paddingTop: SPACE.gutter, gap: 8 }}
            renderItem={({ item: uri, index }) => (
              <Pressable onPress={() => setShotAt(index)}>
                <Image
                  source={{ uri }}
                  style={[
                    styles.thumb,
                    { borderColor: index === shotAt ? BRAND.main : p.hair, opacity: index === shotAt ? 1 : 0.72 },
                  ]}
                />
              </Pressable>
            )}
          />
        ) : null}

        <View style={{ padding: SPACE.gutter, gap: 6 }}>
          <View style={{ flexDirection: row, gap: 6 }}>
            <Tag color={BRAND.main} text={labels ? (item.type === 'land' ? labels.offer.landOffer : labels.offer[item.offer]) : item.offer} />
            <Tag color={p.inset} textColor={p.head} text={labels ? labels.type[item.type] : item.type} />
          </View>
          <Text style={[TYPE.h1, { color: p.head, fontSize: 22, lineHeight: 34, marginTop: 4, textAlign: align }]}>{L(item.name)}</Text>
          <View style={{ flexDirection: row, alignItems: 'center', gap: 5 }}>
            <Ionicons name="location-outline" size={15} color={BRAND.main} />
            <Text style={[TYPE.body, { color: p.muted, flexShrink: 1, textAlign: align }]}>{L(item.loc)}</Text>
          </View>
          <Text style={[TYPE.h1, { color: BRAND.deep, fontSize: 24, lineHeight: 37, marginTop: 4, textAlign: align }]}>{priceOf(item)}</Text>
        </View>

        <View style={[styles.specs, { flexDirection: row, backgroundColor: p.card, borderColor: p.hair }]}>
          {item.rooms ? <Spec p={p} icon="bed-outline" v={item.rooms} l={t.beds} /> : null}
          {item.baths ? <Spec p={p} icon="water-outline" v={item.baths} l={t.baths} /> : null}
          <Spec p={p} icon="resize-outline" v={item.area} l={lang === 'ar' ? 'م²' : 'm²'} />
          {item.floor != null ? <Spec p={p} icon="layers-outline" v={item.floor} l={lang === 'ar' ? 'طابق' : 'Floor'} /> : null}
        </View>

        {L(item.desc) ? (
          <Block p={p} align={align} title={t.overview}>
            <Text style={[TYPE.body, { color: p.ink, fontSize: 14, lineHeight: 25, textAlign: align }]}>{L(item.desc)}</Text>
          </Block>
        ) : null}

        {item.features && (item.features[lang] || item.features.ar || []).length ? (
          <Block p={p} align={align} title={t.features}>
            <View style={{ gap: 8 }}>
              {(item.features[lang] || item.features.ar).map((f, i) => (
                <View key={i} style={{ flexDirection: row, alignItems: 'center', gap: 8 }}>
                  <Ionicons name="checkmark-circle" size={16} color={BRAND.main} />
                  <Text style={[TYPE.body, { color: p.ink, flex: 1, textAlign: align }]}>{f}</Text>
                </View>
              ))}
            </View>
          </Block>
        ) : null}

        {item.offer !== 'rent' ? (
          <Block p={p} align={align} title={t.calcTitle}>
            <Row p={p} row={row} k={t.downPay} v={`${down}%  ·  ${money(downAmt, cc)}`} />
            <Stepper p={p} row={row} value={down} setValue={setDown} step={5} min={0} max={70} suffix="%" />
            <Row p={p} row={row} k={t.years} v={`${years} ${rtl ? 'سنة' : 'yrs'}`} />
            <Stepper p={p} row={row} value={years} setValue={setYears} step={1} min={1} max={30} suffix={rtl ? 'سنة' : 'y'} />
            <View style={[styles.monthly, { backgroundColor: 'rgba(246,135,67,0.12)', borderColor: 'rgba(246,135,67,0.3)' }]}>
              <Text style={[TYPE.meta, { color: p.accentInk, textAlign: 'center' }]}>{t.monthlyPay}</Text>
              <Text style={[TYPE.display, { color: BRAND.main, marginTop: 3, textAlign: 'center' }]}>{money(monthly, cc)}</Text>
            </View>
            <Row p={p} row={row} k={t.loanAmt} v={money(loan, cc)} />
            <Row p={p} row={row} k={t.totalInterest} v={money(monthly * n - loan, cc)} />
            <Text style={[TYPE.caption, { color: p.muted, fontSize: 11.5, lineHeight: 19, marginTop: 8, fontWeight: '600', textAlign: align }]}>{t.calcNote}</Text>
          </Block>
        ) : null}

        {advisor ? (
          <Block p={p} align={align} title={t.advisor}>
            <View style={{ flexDirection: row, alignItems: 'center', gap: 12 }}>
              <View style={[styles.avatar, { backgroundColor: advisor.color || BRAND.main }]}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 17, lineHeight: 26 }}>{L(advisor.name).trim().charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[TYPE.h3, { color: p.head, fontSize: 15, textAlign: align }]}>{L(advisor.name)}</Text>
                <Text style={[TYPE.meta, { color: p.muted, fontSize: 12.5, marginTop: 2, textAlign: align }]}>{L(advisor.role)}</Text>
              </View>
              <Pressable onPress={() => Linking.openURL(`tel:${advisor.phone}`)} style={[styles.round, { position: 'relative', backgroundColor: p.inset }]}>
                <Ionicons name="call-outline" size={18} color={p.head} />
              </Pressable>
            </View>
          </Block>
        ) : null}

        {item.lat != null && item.lng != null ? (
          <Block p={p} align={align} title={t.location}>
            <View style={{ height: 180, borderRadius: RADIUS.md, overflow: 'hidden' }}>
              <MapView
                style={{ flex: 1 }}
                provider={PROVIDER_GOOGLE}
                pointerEvents="none"
                initialRegion={{ latitude: item.lat, longitude: item.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
              >
                <Marker coordinate={{ latitude: item.lat, longitude: item.lng }} tracksViewChanges={false}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 3, borderColor: '#fff', backgroundColor: BRAND.main }} />
                </Marker>
              </MapView>
            </View>
          </Block>
        ) : null}
      </ScrollView>

      <View style={[styles.bar, { flexDirection: row, backgroundColor: p.card, borderTopColor: p.hair, paddingBottom: insets.bottom + 10 }]}>
        <Pressable
          onPress={() => wa(`${rtl ? 'مرحباً، أستفسر عن: ' : 'Hello, I am asking about: '}${L(item.name)}`)}
          style={[styles.waBtn, { borderColor: p.hair }]}
        >
          <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
        </Pressable>
        <Pressable onPress={() => setBook(true)} style={[styles.mainBtn, { backgroundColor: BRAND.main }]}>
          <Text style={[TYPE.h3, { color: '#fff', fontSize: 15 }]}>{t.bookViewing}</Text>
        </Pressable>
      </View>

      <Modal visible={book} transparent animationType="slide" onRequestClose={() => setBook(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(6,6,10,0.5)' }} onPress={() => setBook(false)} />
        <View style={[styles.sheet, { backgroundColor: p.page, paddingBottom: insets.bottom + 20 }]}>
          <View style={[styles.grab, { backgroundColor: p.field }]} />
          <Text style={[TYPE.h2, { color: p.head, marginBottom: 14, textAlign: align }]}>{t.bookViewing}</Text>

          <Field p={p} align={align} label={rtl ? 'التاريخ (YYYY-MM-DD)' : 'Date (YYYY-MM-DD)'} value={date} onChangeText={setDate} placeholder="2026-09-15" />
          <Text style={[styles.lbl, { color: p.head, textAlign: align }]}>{rtl ? 'الوقت' : 'Time'}</Text>
          <View style={{ flexDirection: row, flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {SLOTS.map((s) => {
              const on = time === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => setTime(on ? '' : s)}
                  style={[styles.slot, { backgroundColor: on ? BRAND.main : p.card, borderColor: on ? BRAND.main : p.field }]}
                >
                  <Text style={[TYPE.label, { color: on ? '#fff' : p.head }]}>{s}</Text>
                </Pressable>
              );
            })}
          </View>
          <Field p={p} align={align} label={t.fullName} value={name} onChangeText={setName} />
          <Field p={p} align={align} label={t.phone} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

          <Pressable onPress={confirm} style={[styles.mainBtn, { backgroundColor: BRAND.main, marginTop: 6 }]}>
            <Text style={[TYPE.h3, { color: '#fff', fontSize: 15 }]}>{rtl ? 'تأكيد الحجز' : 'Confirm booking'}</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const Tag = ({ color, text, textColor = '#121212' }) => (
  <View style={{ backgroundColor: color, paddingHorizontal: 11, height: 26, justifyContent: 'center', borderRadius: RADIUS.pill }}>
    <Text style={[TYPE.kicker, { color: textColor, letterSpacing: 0 }]}>{text}</Text>
  </View>
);

const Spec = ({ p, icon, v, l }) => (
  <View style={{ alignItems: 'center', gap: 3, flex: 1 }}>
    <Ionicons name={icon} size={18} color={BRAND.main} />
    <Text style={[TYPE.title, { color: p.head, fontSize: 14 }]}>{v}</Text>
    <Text style={[TYPE.caption, { color: p.muted, fontWeight: '600' }]}>{l}</Text>
  </View>
);

const Block = ({ p, title, align, children }) => (
  <View style={{ marginHorizontal: SPACE.gutter, marginTop: SPACE.md, backgroundColor: p.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: p.hair, padding: SPACE.gutter }}>
    <Text style={[TYPE.h3, { color: p.head, fontSize: 16, marginBottom: 10, textAlign: align }]}>{title}</Text>
    {children}
  </View>
);

const Row = ({ p, k, v, row }) => (
  <View style={{ flexDirection: row, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, gap: 12 }}>
    <Text style={[TYPE.label, { color: p.muted, fontWeight: '600' }]}>{k}</Text>
    <Text style={[TYPE.title, { color: p.head, fontSize: 13.5, flexShrink: 1 }]}>{v}</Text>
  </View>
);

const Stepper = ({ p, value, setValue, step, min, max, suffix, row }) => (
  <View style={{ flexDirection: row, alignItems: 'center', gap: 10, marginBottom: 8 }}>
    <Pressable onPress={() => setValue(Math.max(min, value - step))} style={stepStyle(p)}>
      <Ionicons name="remove" size={16} color={p.head} />
    </Pressable>
    <Text style={[TYPE.price, { color: BRAND.main, minWidth: 62, textAlign: 'center' }]}>{value}{suffix}</Text>
    <Pressable onPress={() => setValue(Math.min(max, value + step))} style={stepStyle(p)}>
      <Ionicons name="add" size={16} color={p.head} />
    </Pressable>
  </View>
);
const stepStyle = (p) => ({ width: 34, height: 34, borderRadius: 10, backgroundColor: p.inset, alignItems: 'center', justifyContent: 'center' });

const Field = ({ p, label, align, ...rest }) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={[styles.lbl, { color: p.head, textAlign: align }]}>{label}</Text>
    <TextInput
      {...rest}
      placeholderTextColor={p.muted}
      style={{ height: 50, borderRadius: RADIUS.md, borderWidth: 1, borderColor: p.field, backgroundColor: p.card, paddingHorizontal: 14, color: p.head, fontSize: 14, textAlign: align }}
    />
  </View>
);

const styles = StyleSheet.create({
  hero: { height: 280, alignItems: 'center', justifyContent: 'center' },
  round: { position: 'absolute', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  thumb: { width: 76, height: 60, borderRadius: RADIUS.sm, borderWidth: 2 },
  specs: { marginHorizontal: SPACE.gutter, paddingVertical: SPACE.md, borderRadius: RADIUS.lg, borderWidth: 1 },
  monthly: { borderRadius: RADIUS.md, borderWidth: 1, padding: 14, alignItems: 'center', marginVertical: 10 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', gap: 10, paddingHorizontal: SPACE.gutter, paddingTop: 10, borderTopWidth: 1 },
  waBtn: { width: 50, height: 50, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  mainBtn: { flex: 1, height: 50, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACE.gutter, maxHeight: '88%' },
  grab: { width: 42, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 14 },
  lbl: { fontSize: 12.5, lineHeight: 20, fontWeight: '800', marginBottom: 6 },
  slot: { paddingHorizontal: SPACE.gutter, height: 44, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
