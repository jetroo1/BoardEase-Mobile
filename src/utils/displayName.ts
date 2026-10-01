// What to call somebody whose name we never asked for.
//
// Accounts here are an email address and a password; there is no profile name
// field. So a review has to be signed with something, and the something used
// to be the whole email address.
//
// That was wrong twice over. Reviews are readable by every signed-in user, so
// the address was published to all of them -- the details screen printed it
// under the review in full. And it contradicted our own Privacy Notice, which
// tells people their email address is not shown on a review.
//
// The local part is kept instead: enough for two reviews by the same person to
// read as the same person, without handing out an address anyone can write to.
//
// Applied in two places on purpose:
//
//   - when a review is written, so the address never enters the database at
//     all -- masking only on screen leaves the real thing sitting in a
//     collection anyone signed in can read;
//   - when a review is displayed, because reviews written before this change
//     still hold a full address and must not show one now.

export function displayName(raw: string): string {
  const trimmed = (raw ?? '').trim();
  if (trimmed === '') {
    return 'Anonymous';
  }
  const local = trimmed.split('@')[0] || trimmed;
  return local.charAt(0).toUpperCase() + local.slice(1);
}
