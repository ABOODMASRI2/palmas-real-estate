/**
 * Google sign-in credentials.
 *
 * Google needs one OAuth client per platform. They are free and take a few minutes to
 * create — see the README section "تسجيل الدخول عبر Google". Until they are filled in,
 * the Google button stays hidden rather than showing a control that fails when tapped.
 *
 * These are public client identifiers, not secrets: they ship inside the app either way.
 */
export const GOOGLE = {
  // Google Cloud → Credentials → OAuth client ID → "iOS"
  iosClientId: '',
  // Google Cloud → Credentials → OAuth client ID → "Android"
  androidClientId: '',
  // Google Cloud → Credentials → OAuth client ID → "Web application"
  // (Expo Go routes through the web client, so fill this one in to test before building)
  webClientId: '',
};

/** true once at least one client is configured for the platform in use */
export function googleReady(platform) {
  if (platform === 'ios') return !!(GOOGLE.iosClientId || GOOGLE.webClientId);
  if (platform === 'android') return !!(GOOGLE.androidClientId || GOOGLE.webClientId);
  return !!GOOGLE.webClientId;
}
