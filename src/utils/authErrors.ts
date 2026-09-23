// Turns Firebase Auth error codes into something a person can act on.
//
// The old screens put error.message straight into an Alert, which meant users
// saw things like:
//
//   Firebase: Error (auth/invalid-credential).
//
// That tells someone nothing about what to do next, which is the only job an
// error message has. Each message below names the problem and the fix.

export function describeAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  switch (code) {
    case 'auth/invalid-email':
      return 'That email address is not formatted correctly.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      // Deliberately does not say which of the two was wrong: telling an
      // attacker that an email exists but the password failed hands them half
      // the answer.
      return 'Email or password is incorrect. Check them and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact the administrator.';
    case 'auth/email-already-in-use':
      return 'An account already exists with that email. Try logging in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a minute before trying again.';
    case 'auth/network-request-failed':
      return 'Could not reach the server. Check your internet connection.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

// Shared between Login and Register so the rules cannot drift apart.
export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return 'Enter your email address.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'Enter a valid email address, like you@example.com.';
  }
  return null;
}

// Firebase itself rejects anything under 6 characters, so the form says so up
// front rather than letting the user find out after a round trip.
export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Enter a password.';
  }
  if (password.length < 6) {
    return 'Use at least 6 characters.';
  }
  return null;
}
