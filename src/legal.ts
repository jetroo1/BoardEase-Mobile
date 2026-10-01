// The Terms of Use and the Privacy Notice, kept here as data rather than as
// markup inside a screen.
//
// Two reasons they live in one file:
//
//   1. Consent has to be provable. The Data Privacy Act of 2012 (Republic Act
//      No. 10173) treats consent as valid only when it is freely given,
//      specific and informed, and section 3(b) requires it to be evidenced.
//      "The user ticked a box" is not evidence unless you can also say which
//      wording they were shown. LEGAL_VERSION is recorded against the account
//      at sign-up for exactly that reason, so a later change to this file
//      cannot quietly rewrite what somebody agreed to.
//
//   2. The same words then appear in the consent line, on the document screen
//      and in the project documentation, instead of drifting apart in three
//      places.
//
// Change the wording, change the version. An account carrying an older version
// consented to older terms, which is the fact worth keeping.

export const LEGAL_VERSION = '2026-09-27';

export interface LegalDocument {
  key: LegalKey;
  title: string;
  // Shown under the title: what this document is for, in one line.
  summary: string;
  sections: { heading: string; body: string }[];
}

export type LegalKey = 'terms' | 'privacy';

export const TERMS: LegalDocument = {
  key: 'terms',
  title: 'Terms of Use',
  summary: 'What BoardEase does, what it does not do, and what is expected of you.',
  sections: [
    {
      heading: 'What this application is',
      body:
        'BoardEase is a directory and a route guide for boarding houses around '
        + 'Tagum City. It helps you see what is listed, compare listings, and walk '
        + 'to one. It is not an agent, a broker or a booking service.',
    },
    {
      heading: 'No booking, no payment',
      body:
        'Nothing you do in BoardEase reserves a room or commits you to anything. '
        + 'There is no payment of any kind inside the application, and no money '
        + 'passes through it. Once you have chosen somewhere, you arrange it with '
        + 'the owner directly.',
    },
    {
      heading: 'Listing information',
      body:
        'Prices, availability, photographs and amenities are supplied by whoever '
        + 'created the listing. They can be wrong and they can go out of date. '
        + 'Always confirm with the owner before you rely on anything you read '
        + 'here, and visit a place before committing to it.',
    },
    {
      heading: 'Your account',
      body:
        'Keep your password to yourself and do not let anybody else use your '
        + 'account. Tell us if you think someone else has got into it. You are '
        + 'responsible for what is done through your account.',
    },
    {
      heading: 'Reviews and conduct',
      body:
        'Write reviews only about places you have actually stayed in or visited, '
        + 'and keep them factual. Do not post anything false, abusive, or which '
        + 'discloses another person’s private information. Reviews that break '
        + 'this may be removed and the account behind them suspended.',
    },
    {
      heading: 'Navigation and your safety',
      body:
        'Walking routes are generated from public map data and may be incomplete, '
        + 'out of date, or unsuitable at night or in bad weather. They are a '
        + 'suggestion, not an instruction. Watch the road, not the phone, and use '
        + 'your own judgement about where it is safe to walk.',
    },
    {
      heading: 'Availability',
      body:
        'The application depends on services outside it — sign-in, the database, '
        + 'the map tiles and the routing service. Any of them can be unavailable, '
        + 'and parts of the application will not work when they are. Saved '
        + 'listings remain readable without a connection.',
    },
    {
      heading: 'Ending your use',
      body:
        'You may stop using BoardEase and ask for your account to be deleted at '
        + 'any time. Accounts used to break these terms may be suspended.',
    },
  ],
};

export const PRIVACY: LegalDocument = {
  key: 'privacy',
  title: 'Privacy Notice',
  summary:
    'How BoardEase collects and handles your personal information, under the '
    + 'Data Privacy Act of 2012 (Republic Act No. 10173).',
  sections: [
    {
      heading: 'What we collect',
      body:
        'Your email address and password, so you can sign in. Anything you '
        + 'create in the application: your shortlist, your filters, your reviews '
        + 'and ratings, and — if you add a listing — its details and '
        + 'photographs. Your approximate location while a screen is using it.',
    },
    {
      heading: 'Your location',
      body:
        'Location is read only while you are on a screen that needs it — the '
        + 'map, the route guide, the comparison, or pinning a listing on the map. '
        + 'It is used on your phone at that moment to measure distances and draw '
        + 'a route. Your location is never written to your account and no history '
        + 'of where you have been is kept. You are asked before it is read the '
        + 'first time, and you can refuse or withdraw it in your phone’s '
        + 'settings; the rest of the application still works without it.',
    },
    {
      heading: 'Why we hold it',
      body:
        'To let you sign in and keep your own shortlist across devices, to show '
        + 'listings and reviews to other users, to measure how far a listing is '
        + 'from you, and to keep the service working and free of abuse.',
    },
    {
      heading: 'What is visible to other people',
      body:
        'Reviews and ratings you publish, and listings you create, are visible to '
        + 'other users of the application. Your shortlist, your filters and your '
        + 'location are not. Your email address is not shown on a review.',
    },
    {
      heading: 'Where it is stored',
      body:
        'Accounts and data are held in Google Firebase (Authentication, Cloud '
        + 'Firestore and Cloud Storage), which stores them on servers outside the '
        + 'Philippines. Connections to it are encrypted. Passwords are held by '
        + 'Firebase Authentication in hashed form and are not readable by us.',
    },
    {
      heading: 'How long it is kept',
      body:
        'For as long as your account exists. When an account is deleted, its '
        + 'profile, shortlist and filters are deleted with it. Reviews may be kept '
        + 'without anything identifying you attached to them.',
    },
    {
      heading: 'Your rights',
      body:
        'Under the Data Privacy Act you may ask to see the personal information '
        + 'held about you, have it corrected, object to how it is used, have it '
        + 'erased or blocked, receive a copy of it, be told if it has been '
        + 'compromised, and claim damages for a violation of your rights. You may '
        + 'also complain to the National Privacy Commission.',
    },
    {
      heading: 'Withdrawing consent',
      body:
        'You may withdraw your consent at any time by asking for your account to '
        + 'be deleted. Withdrawing does not undo anything lawfully done while the '
        + 'consent was in force.',
    },
    {
      heading: 'Children',
      body:
        'BoardEase is intended for students and adults looking for accommodation. '
        + 'If you are under 18, a parent or guardian should agree to this notice '
        + 'on your behalf.',
    },
  ],
};

export const LEGAL_DOCUMENTS: Record<LegalKey, LegalDocument> = {
  terms: TERMS,
  privacy: PRIVACY,
};
