/**
 * Palmas shared core — React Native bridge.
 *
 * palmas-core.js is the exact same file the website loads (catalog, filters, currency,
 * favourites, auth, bookings, CRM engine). It is written against `window` + `localStorage`,
 * so instead of rewriting a single line of that logic we give it the two globals it expects,
 * backed by AsyncStorage.
 *
 * localStorage is synchronous and AsyncStorage is not, so we keep a synchronous in-memory
 * mirror that is hydrated once at launch (`hydrateCore`) and written through on every set.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const mem = {};

const localStorageShim = {
  getItem(k) {
    return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null;
  },
  setItem(k, v) {
    mem[k] = String(v);
    AsyncStorage.setItem(k, String(v)).catch(() => {});
  },
  removeItem(k) {
    delete mem[k];
    AsyncStorage.removeItem(k).catch(() => {});
  },
  clear() {
    Object.keys(mem).forEach((k) => delete mem[k]);
    AsyncStorage.clear().catch(() => {});
  },
};

/* the website uses sessionStorage for "remember me = off" sessions; on a phone the app is
   never a throwaway tab, so a session always persists — an in-memory shim is enough. */
const sessionMem = {};
const sessionStorageShim = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(sessionMem, k) ? sessionMem[k] : null),
  setItem: (k, v) => { sessionMem[k] = String(v); },
  removeItem: (k) => { delete sessionMem[k]; },
};

let hydrated = false;

/** Load everything AsyncStorage already holds into the synchronous mirror, then boot the core. */
export async function hydrateCore() {
  if (hydrated) return global.Palmas;
  try {
    const keys = await AsyncStorage.getAllKeys();
    const palmasKeys = keys.filter((k) => k.startsWith('palmas_'));
    if (palmasKeys.length) {
      const pairs = await AsyncStorage.multiGet(palmasKeys);
      pairs.forEach(([k, v]) => { if (v != null) mem[k] = v; });
    }
  } catch (e) {
    // a cold/failed store just means we start from the seed catalog — not fatal
  }

  global.localStorage = localStorageShim;
  global.sessionStorage = sessionStorageShim;
  if (!global.window) global.window = global;
  if (!global.document) {
    global.document = { addEventListener() {}, documentElement: { setAttribute() {}, lang: '', dir: '' } };
  }

  require('./palmas-core.js'); // attaches window.Palmas

  hydrated = true;
  return global.Palmas;
}

/** The live core. Only valid after hydrateCore() has resolved. */
export function core() {
  return global.Palmas;
}

export default { hydrateCore, core };
