// Turning a Firestore failure into something that points at the real cause.
//
// Every write in the app used to report the same sentence -- "Check your
// internet connection and try again" -- whatever had actually gone wrong. That
// is a guess dressed up as a diagnosis, and it sent us looking at WiFi for a
// bug that was in the security rules: tapping the heart on a listing failed
// with permission-denied, and the app said the connection was down.
//
// Firestore already says which of these it is. This repeats what it said.

export function describeFirestoreError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';

  switch (code) {
    case 'permission-denied':
      return 'You do not have permission to do that. If you just verified your '
        + 'email, log out and back in.';
    case 'unauthenticated':
      return 'You are signed out. Log in and try again.';
    case 'unavailable':
    case 'deadline-exceeded':
      return 'Could not reach the server. Check your internet connection and try again.';
    case 'not-found':
      return 'That item no longer exists. Pull down to refresh.';
    case 'already-exists':
      return 'That has already been saved.';
    case 'resource-exhausted':
      return 'The service is busy right now. Try again in a moment.';
    case 'failed-precondition':
      return 'That could not be completed. Try refreshing the screen first.';
    default:
      // Unmapped codes carry their own name rather than disappearing into a
      // generic sentence, so the next unfamiliar failure is searchable.
      return code
        ? `Something went wrong (${code}). Please try again.`
        : 'Something went wrong. Please try again.';
  }
}
