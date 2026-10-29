/**
 * One visual identity with the website.
 * Every value here is copied from the site's CSS custom properties so a colour never drifts
 * between web and app. If a brand colour changes, it changes here and in palmas-core's CSS twin.
 */
export const BRAND = {
  main: '#f68743',
  hover: '#ffab7a',
  deep: '#d1662a',
  on: '#ffffff',
  ok: '#1f9d5c',
  danger: '#e0245e',
};

/* category colours — identical to Palmas.markerColor() on the web map */
export const CATEGORY = {
  apartment: '#7fd3ff',
  villa: '#f68743',
  land: '#c8a2ff',
  commercial: '#ffd166',
  residential: '#ffd166',
  mixed: '#a8e6a1',
  fallback: '#dddddd',
};

const light = {
  mode: 'light',
  page: '#edeef0',
  head: '#141414',
  ink: '#4b4b4d',
  muted: 'rgba(20,20,22,0.5)',
  card: '#ffffff',
  elev: '#ffffff',
  inset: '#f2f3f5',
  hair: 'rgba(20,20,22,0.08)',
  field: 'rgba(20,20,22,0.14)',
  accentInk: '#b53a0f',
  shadow: 'rgba(20,20,35,0.10)',
  placeholder: '#e7e8ea',
};

const dark = {
  mode: 'dark',
  page: '#0d0d0f',
  head: '#f7f7f5',
  ink: '#d4d4d6',
  muted: 'rgba(247,247,245,0.55)',
  card: 'rgba(255,255,255,0.05)',
  elev: '#1b1b20',
  inset: 'rgba(255,255,255,0.045)',
  hair: 'rgba(255,255,255,0.10)',
  field: 'rgba(255,255,255,0.16)',
  accentInk: '#ffcdb0',
  shadow: 'rgba(0,0,0,0.55)',
  placeholder: '#1a1a1d',
};

export function palette(mode) {
  return mode === 'dark' ? dark : light;
}

/* the site is set in Cairo; on device we use the platform's Arabic-capable system face
   unless the Cairo font files are bundled (see README → "Fonts"). */
export const FONT = {
  regular: undefined,
  weightRegular: '400',
  weightMedium: '600',
  weightBold: '700',
  weightHeavy: '800',
  weightBlack: '900',
};

export const RADIUS = { sm: 10, md: 14, lg: 18, xl: 22, pill: 999 };
/**
 * `gutter` is the one distance from the screen edge to content — every heading, row,
 * card and bar uses it, which is what makes separate screens feel like one app.
 * Card grids use `gridGutter`; cards carry a 5px margin of their own, so 11 + 5 lands
 * on the same 16px line as everything else.
 */
export const SPACE = { xs: 6, sm: 10, md: 14, lg: 18, xl: 24, xxl: 32, gutter: 16, gridGutter: 11 };

/**
 * Arabic glyphs are taller than Latin ones and get clipped when a Text is left to its
 * default line box. Every size in the app goes through this scale so that never happens
 * and so headings, body and captions stay proportional to each other — the same
 * hierarchy the website uses.
 */
export const lh = (size) => Math.round(size * 1.55);

export const TYPE = {
  display: { fontSize: 25, lineHeight: lh(25), fontWeight: '900', letterSpacing: -0.4 },
  h1: { fontSize: 24, lineHeight: lh(24), fontWeight: '900', letterSpacing: -0.4 },
  h2: { fontSize: 19, lineHeight: lh(19), fontWeight: '900', letterSpacing: -0.3 },
  h3: { fontSize: 16, lineHeight: lh(16), fontWeight: '800' },
  title: { fontSize: 14.5, lineHeight: lh(14.5), fontWeight: '800' },
  body: { fontSize: 13.5, lineHeight: lh(13.5) + 4, fontWeight: '600' },
  label: { fontSize: 13, lineHeight: lh(13), fontWeight: '800' },
  meta: { fontSize: 12, lineHeight: lh(12), fontWeight: '700' },
  caption: { fontSize: 11, lineHeight: lh(11), fontWeight: '700' },
  price: { fontSize: 15, lineHeight: lh(15), fontWeight: '900' },
  kicker: { fontSize: 11.5, lineHeight: lh(11.5), fontWeight: '800', letterSpacing: 0.6 },
};

export function shadow(p, level = 1) {
  const map = {
    1: { elevation: 2, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
    2: { elevation: 5, shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
    3: { elevation: 10, shadowOpacity: 0.16, shadowRadius: 28, shadowOffset: { width: 0, height: 14 } },
  };
  return { shadowColor: p.mode === 'dark' ? '#000' : '#141428', ...map[level] };
}
