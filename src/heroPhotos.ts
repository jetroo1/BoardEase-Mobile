// The photographs that cycle behind the landing page.
//
// Real boarding houses, so the first thing somebody sees is the thing the
// application is about rather than a stock room that could be anywhere.
//
// Why a list in a file rather than a query:
//
// The landing page is what you see before you have an account, and the
// security rules let only signed-in users read the properties collection.
// Loading the hero from Firestore would therefore show nothing to exactly the
// people this screen exists for. Relaxing the rules to make listings public
// would be a real change to who can read the database, for the sake of a
// background image -- not a trade worth making.
//
// So the URLs live here. Adding a boarding house to the slideshow means
// adding its photo's Cloudinary link to this array. They are already public
// URLs: the same ones the listings themselves serve.
//
// Keep them landscape and bright at the top. The hero draws a dark gradient
// over the lower half for the title to sit on, so detail down there is lost.

export const HERO_PHOTOS: string[] = [
  'https://res.cloudinary.com/bo25vkvx/image/upload/v1790881640/ym6m7qhu2cetwe7xr1ta.png',
  'https://res.cloudinary.com/bo25vkvx/image/upload/v1790847163/FRONT_PAGE_BH.png',
];

// How long each photograph is held before the next fades in.
//
// Four seconds is long enough to look at and short enough that a second one
// arrives while somebody is still reading the title. Much faster reads as a
// flicker behind the text.
export const HERO_INTERVAL_MS = 4000;

// The cross-fade itself. Slow enough to be a dissolve rather than a cut.
export const HERO_FADE_MS = 900;
