// The Google OAuth client the app signs in against.
//
// This is the **Web** client ID from Firebase's Google provider
// (Authentication → Sign-in method → Google → Web SDK configuration), not the
// Android one. The distinction matters and the error when it is wrong does
// not explain itself: Google returns DEVELOPER_ERROR, which sounds like a code
// fault. The Android client is matched by the app's signing fingerprint
// instead, which is why Android also needs its SHA-1 registered in Firebase.
//
// Not a secret. It is embedded in every app that uses Google sign-in and is
// visible to anybody who unpacks one. The Web client **secret** is a different
// value, it is genuinely secret, and it must never appear in this repository
// -- Firebase keeps it on its side and the app never needs it.
export const GOOGLE_WEB_CLIENT_ID =
  '1060973925533-icsjifob2th75clk8vakvpqjf4drtdq8.apps.googleusercontent.com';
