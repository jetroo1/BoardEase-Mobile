// BoardEase UI Builder -- a Figma plugin that rebuilds the app's 16 screens
// as editable Figma frames with a clickable prototype wired between them.
//
// Every colour, size, gap and radius below is copied from src/theme.ts. If the
// app's theme changes, change it here too -- this file is a mirror, not a
// second source of truth.
//
// HOW TO RUN IT
//   1. Figma desktop app > Plugins > Development > New plugin... > "Import
//      plugin from manifest" > pick docs/figma/manifest.json
//   2. Plugins > Development > BoardEase UI Builder
//   3. The 16 frames appear on the canvas, already linked.
//
// Fonts are resolved against whatever Figma actually has installed, because
// Figma names weights differently from CSS -- Inter's semibold is "Semi Bold"
// with a space. If Plus Jakarta Sans is missing the plugin falls back to Inter
// and says so, rather than failing or quietly using the wrong typeface.

// ---------------------------------------------------------------------------
// Tokens (mirrored from src/theme.ts)
// ---------------------------------------------------------------------------

// Both palettes, exactly as src/theme.ts defines them. The app ships light and
// dark, so the prototype does too -- a Figma file that only shows one of them
// is not the system.
var LIGHT = {
  canvas: '#F6F9FA',
  canvasAlt: '#EDF2F4',
  surface: '#FFFFFF',
  surfaceAlt: '#F4F8F9',
  line: '#E6EDEF',
  lineStrong: '#D3DEE1',
  ink: '#101A1D',
  inkSoft: '#4B5C61',
  inkFaint: '#83959B',
  onBrand: '#FFFFFF',
  brand: '#0E7490',
  brandDeep: '#0A5568',
  brandSoft: '#DFF0F5',
  success: '#1F7A4D',
  successSoft: '#DCF0E5',
  warning: '#9A6614',
  warningSoft: '#F8EEDA',
  danger: '#B03A2B',
  dangerSoft: '#FAE4E0',
  star: '#C08A14',
  // Not in theme.ts: the tone used for photo and map placeholders. It has to
  // sit clearly apart from both canvas and surface or the image areas vanish.
  photoFill: '#B4C4C9',
  photoBand: '#CDD9DD',
};

var DARK = {
  canvas: '#0D1214',
  canvasAlt: '#141C1F',
  surface: '#161F22',
  surfaceAlt: '#1D282C',
  line: '#243135',
  lineStrong: '#344449',
  ink: '#ECF2F3',
  inkSoft: '#A6B8BD',
  inkFaint: '#78898E',
  onBrand: '#052027',
  brand: '#52B6CC',
  brandDeep: '#84D0DF',
  brandSoft: '#0E333D',
  success: '#56C089',
  successSoft: '#13301F',
  warning: '#DCA63E',
  warningSoft: '#31250E',
  danger: '#E38271',
  dangerSoft: '#3A1C18',
  star: '#DEAE49',
  photoFill: '#2C3C41',
  photoBand: '#3B4E54',
};

// The live palette. Every builder reads C, so switching theme is one call.
var C = {};
function applyTheme(dark) {
  var src = dark ? DARK : LIGHT;
  Object.keys(src).forEach(function (k) { C[k] = src[k]; });
}
applyTheme(false);

var SP = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 };
var R = { sm: 12, md: 16, lg: 22, xl: 30, pill: 999 };

// The nine type roles. Same names as theme.ts so the two can be compared.
var TYPE = {
  display: { family: 'Plus Jakarta Sans', style: 'Bold', size: 32, line: 38 },
  title: { family: 'Plus Jakarta Sans', style: 'Bold', size: 24, line: 30 },
  heading: { family: 'Plus Jakarta Sans', style: 'SemiBold', size: 19, line: 25 },
  body: { family: 'Inter', style: 'Regular', size: 15, line: 22 },
  bodyStrong: { family: 'Inter', style: 'SemiBold', size: 15, line: 22 },
  caption: { family: 'Inter', style: 'Regular', size: 13, line: 18 },
  captionStrong: { family: 'Inter', style: 'Medium', size: 13, line: 18 },
  micro: { family: 'Inter', style: 'SemiBold', size: 11, line: 14 },
  metric: { family: 'Plus Jakarta Sans', style: 'Bold', size: 26, line: 31 },
};

var W = 390; // iPhone 14 logical width
var H = 844;
var GUTTER = SP.md;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex) {
  var clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16) / 255,
    g: parseInt(clean.slice(2, 4), 16) / 255,
    b: parseInt(clean.slice(4, 6), 16) / 255,
  };
}

function solid(hex) {
  return [{ type: 'SOLID', color: hexToRgb(hex) }];
}

// A plain container. Auto-layout by default, because a Figma file people have
// to edit is far more useful when the boxes reflow instead of being pinned.
function box(opts) {
  var f = figma.createFrame();
  f.name = opts.name || 'Box';
  f.layoutMode = opts.horizontal ? 'HORIZONTAL' : 'VERTICAL';
  f.primaryAxisSizingMode = opts.grow ? 'FIXED' : 'AUTO';
  f.counterAxisSizingMode = opts.width ? 'FIXED' : 'AUTO';
  if (opts.width) f.resize(opts.width, f.height);
  f.itemSpacing = opts.gap == null ? SP.xs : opts.gap;
  f.paddingLeft = f.paddingRight = opts.padX == null ? 0 : opts.padX;
  f.paddingTop = f.paddingBottom = opts.padY == null ? 0 : opts.padY;
  f.cornerRadius = opts.radius || 0;
  f.fills = opts.fill ? solid(opts.fill) : [];
  f.counterAxisAlignItems = opts.align || 'MIN';
  f.primaryAxisAlignItems = opts.justify || 'MIN';
  if (opts.border) {
    f.strokes = solid(opts.border);
    f.strokeWeight = opts.borderWidth || 1;
  }
  if (opts.shadow) {
    f.effects = [
      {
        type: 'DROP_SHADOW',
        color: { r: 0.06, g: 0.13, b: 0.15, a: 0.1 },
        offset: { x: 0, y: 4 },
        radius: 12,
        spread: 0,
        visible: true,
        blendMode: 'NORMAL',
      },
    ];
  }
  return f;
}

function label(content, role, color, opts) {
  var spec = TYPE[role] || TYPE.body;
  var node = figma.createText();
  node.fontName = { family: spec.family, style: spec.style };
  node.characters = content;
  node.fontSize = spec.size;
  node.lineHeight = { value: spec.line, unit: 'PIXELS' };
  node.fills = solid(color || C.ink);
  node.name = content.length > 28 ? content.slice(0, 28) + '…' : content;
  if (opts && opts.width) {
    node.textAutoResize = 'HEIGHT';
    node.resize(opts.width, node.height);
  }
  if (opts && opts.uppercase) {
    node.textCase = 'UPPER';
    node.letterSpacing = { value: 4, unit: 'PERCENT' };
  }
  return node;
}

// A filled rectangle, used for photo placeholders and icon stand-ins. Real
// icons are not drawn: Figma users swap these for their own icon set, and a
// hand-drawn vector approximation would be worse than an honest placeholder.
function chip(w, h, fill, radius) {
  var r = figma.createRectangle();
  r.resize(w, h);
  r.fills = solid(fill);
  r.cornerRadius = radius == null ? R.sm : radius;
  r.name = 'Shape';
  return r;
}

// A stand-in for a photograph or the map canvas.
//
// This is NOT chip() with a light fill. The first version used canvasAlt
// (#EDF2F4) on a canvas of #F6F9FA -- a two-point difference -- so every photo
// area and the whole map rendered as invisible blank space. Details, Map and
// Route Guide each had a 300-400px dead zone that looked like a bug.
//
// A mid-tone, plus a lighter band across the middle, reads unmistakably as
// "an image goes here" at any zoom.
// Rotates through the four embedded photographs so a screen showing several
// listings does not repeat the same picture.
var PHOTO_SEQ = 0;

function photo(w, h, radius, labelText) {
  var wrap = box({ name: labelText ? 'Photo / ' + labelText : 'Photo', radius: radius == null ? R.md : radius, fill: C.photoFill, align: 'CENTER', justify: 'CENTER', gap: 0 });
  wrap.resize(w, h);
  wrap.primaryAxisSizingMode = 'FIXED';
  wrap.counterAxisSizingMode = 'FIXED';

  var fill = imageFill(PHOTO_SEQ);
  PHOTO_SEQ += 1;
  if (fill) {
    wrap.fills = fill;
  } else {
    // createImage failed -- keep the flat block so the area is still visible.
    wrap.appendChild(chip(Math.min(w * 0.55, 120), Math.max(2, h * 0.16), C.photoBand, R.sm));
  }
  return wrap;
}


// ---------------------------------------------------------------------------
// Embedded assets
// ---------------------------------------------------------------------------
//
// A Figma plugin is one file and cannot require() anything at runtime, so the
// real icons and photographs are inlined here.
//
// ICONS are Ionicons 7.4.0 SVG source -- the same icon set the app uses, so the
// Figma file shows the same glyphs rather than grey placeholder squares.
// figma.createNodeFromSvg turns each one into an editable vector group.
//
// PHOTOS are the four room photographs the seed data points at, as base64 JPEG.
// They are the same images a user sees in the running app.

var ICONS = {"add-circle-outline":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path d=\"M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192 192-86 192-192z\" fill=\"none\" stroke=\"currentColor\" stroke-miterlimit=\"10\" stroke-width=\"32\"/><path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\" d=\"M256 176v160M336 256H176\"/></svg>","arrow-forward":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"48\" d=\"M268 112l144 144-144 144M392 256H100\"/></svg>","bed-outline":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path d=\"M384 240H96V136a40.12 40.12 0 0140-40h240a40.12 40.12 0 0140 40v104zM48 416V304a64.19 64.19 0 0164-64h288a64.19 64.19 0 0164 64v112\" fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\"/><path d=\"M48 416v-8a24.07 24.07 0 0124-24h368a24.07 24.07 0 0124 24v8M112 240v-16a32.09 32.09 0 0132-32h80a32.09 32.09 0 0132 32v16M256 240v-16a32.09 32.09 0 0132-32h80a32.09 32.09 0 0132 32v16\" fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\"/></svg>","checkmark":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\" d=\"M416 128L192 384l-96-96\"/></svg>","chevron-back":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"48\" d=\"M328 112L184 256l144 144\"/></svg>","chevron-forward":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"48\" d=\"M184 112l144 144-144 144\"/></svg>","close":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path d=\"M289.94 256l95-95A24 24 0 00351 127l-95 95-95-95a24 24 0 00-34 34l95 95-95 95a24 24 0 1034 34l95-95 95 95a24 24 0 0034-34z\"/></svg>","git-compare-outline":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\" d=\"M304 160l-64-64 64-64M207 352l64 64-64 64\"/><circle cx=\"112\" cy=\"96\" r=\"48\" fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\"/><circle cx=\"400\" cy=\"416\" r=\"48\" fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\"/><path d=\"M256 96h84a60 60 0 0160 60v212M255 416h-84a60 60 0 01-60-60V144\" fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\"/></svg>","heart-outline":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path d=\"M352.92 80C288 80 256 144 256 144s-32-64-96.92-64c-52.76 0-94.54 44.14-95.08 96.81-1.1 109.33 86.73 187.08 183 252.42a16 16 0 0018 0c96.26-65.34 184.09-143.09 183-252.42-.54-52.67-42.32-96.81-95.08-96.81z\" fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\"/></svg>","heart":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path d=\"M256 448a32 32 0 01-18-5.57c-78.59-53.35-112.62-89.93-131.39-112.8-40-48.75-59.15-98.8-58.61-153C48.63 114.52 98.46 64 159.08 64c44.08 0 74.61 24.83 92.39 45.51a6 6 0 009.06 0C278.31 88.81 308.84 64 352.92 64c60.62 0 110.45 50.52 111.08 112.64.54 54.21-18.63 104.26-58.61 153-18.77 22.87-52.8 59.45-131.39 112.8a32 32 0 01-18 5.56z\"/></svg>","home-outline":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path d=\"M80 212v236a16 16 0 0016 16h96V328a24 24 0 0124-24h80a24 24 0 0124 24v136h96a16 16 0 0016-16V212\" fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\"/><path d=\"M480 256L266.89 52c-5-5.28-16.69-5.34-21.78 0L32 256M400 179V64h-48v69\" fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\"/></svg>","home":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path d=\"M261.56 101.28a8 8 0 00-11.06 0L66.4 277.15a8 8 0 00-2.47 5.79L63.9 448a32 32 0 0032 32H192a16 16 0 0016-16V328a8 8 0 018-8h80a8 8 0 018 8v136a16 16 0 0016 16h96.06a32 32 0 0032-32V282.94a8 8 0 00-2.47-5.79z\"/><path d=\"M490.91 244.15l-74.8-71.56V64a16 16 0 00-16-16h-48a16 16 0 00-16 16v32l-57.92-55.38C272.77 35.14 264.71 32 256 32c-8.68 0-16.72 3.14-22.14 8.63l-212.7 203.5c-6.22 6-7 15.87-1.34 22.37A16 16 0 0043 267.56L250.5 69.28a8 8 0 0111.06 0l207.52 198.28a16 16 0 0022.59-.44c6.14-6.36 5.63-16.86-.76-22.97z\"/></svg>","locate":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"48\" d=\"M256 96V56M256 456v-40M256 112a144 144 0 10144 144 144 144 0 00-144-144zM416 256h40M56 256h40\"/></svg>","location-outline":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path d=\"M256 48c-79.5 0-144 61.39-144 137 0 87 96 224.87 131.25 272.49a15.77 15.77 0 0025.5 0C304 409.89 400 272.07 400 185c0-75.61-64.5-137-144-137z\" fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\"/><circle cx=\"256\" cy=\"192\" r=\"48\" fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\"/></svg>","map-outline":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path d=\"M313.27 124.64L198.73 51.36a32 32 0 00-29.28.35L56.51 127.49A16 16 0 0048 141.63v295.8a16 16 0 0023.49 14.14l97.82-63.79a32 32 0 0129.5-.24l111.86 73a32 32 0 0029.27-.11l115.43-75.94a16 16 0 008.63-14.2V74.57a16 16 0 00-23.49-14.14l-98 63.86a32 32 0 01-29.24.35zM328 128v336M184 48v336\" fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\"/></svg>","map":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path d=\"M48.17 113.34A32 32 0 0032 141.24V438a32 32 0 0047 28.37c.43-.23.85-.47 1.26-.74l84.14-55.05a8 8 0 003.63-6.72V46.45a8 8 0 00-12.51-6.63zM212.36 39.31A8 8 0 00200 46v357.56a8 8 0 003.63 6.72l96 62.42A8 8 0 00312 466V108.67a8 8 0 00-3.64-6.73zM464.53 46.47a31.64 31.64 0 00-31.5-.88 12.07 12.07 0 00-1.25.74l-84.15 55a8 8 0 00-3.63 6.72v357.46a8 8 0 0012.52 6.63l107.07-73.46a32 32 0 0016.41-28v-296a32.76 32.76 0 00-15.47-28.21z\"/></svg>","moon":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path d=\"M264 480A232 232 0 0132 248c0-94 54-178.28 137.61-214.67a16 16 0 0121.06 21.06C181.07 76.43 176 104.66 176 136c0 110.28 89.72 200 200 200 31.34 0 59.57-5.07 81.61-14.67a16 16 0 0121.06 21.06C442.28 426 358 480 264 480z\"/></svg>","notifications-outline":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path d=\"M427.68 351.43C402 320 383.87 304 383.87 217.35 383.87 138 343.35 109.73 310 96c-4.43-1.82-8.6-6-9.95-10.55C294.2 65.54 277.8 48 256 48s-38.21 17.55-44 37.47c-1.35 4.6-5.52 8.71-9.95 10.53-33.39 13.75-73.87 41.92-73.87 121.35C128.13 304 110 320 84.32 351.43 73.68 364.45 83 384 101.61 384h308.88c18.51 0 27.77-19.61 17.19-32.57zM320 384v16a64 64 0 01-128 0v-16\" fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\"/></svg>","options-outline":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\" d=\"M368 128h80M64 128h240M368 384h80M64 384h240M208 256h240M64 256h80\"/><circle cx=\"336\" cy=\"128\" r=\"32\" fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\"/><circle cx=\"176\" cy=\"256\" r=\"32\" fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\"/><circle cx=\"336\" cy=\"384\" r=\"32\" fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\"/></svg>","person-outline":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path d=\"M344 144c-3.92 52.87-44 96-88 96s-84.15-43.12-88-96c-4-55 35-96 88-96s92 42 88 96z\" fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\"/><path d=\"M256 304c-87 0-175.3 48-191.64 138.6C62.39 453.52 68.57 464 80 464h352c11.44 0 17.62-10.48 15.65-21.4C431.3 352 343 304 256 304z\" fill=\"none\" stroke=\"currentColor\" stroke-miterlimit=\"10\" stroke-width=\"32\"/></svg>","person":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path d=\"M332.64 64.58C313.18 43.57 286 32 256 32c-30.16 0-57.43 11.5-76.8 32.38-19.58 21.11-29.12 49.8-26.88 80.78C156.76 206.28 203.27 256 256 256s99.16-49.71 103.67-110.82c2.27-30.7-7.33-59.33-27.03-80.6zM432 480H80a31 31 0 01-24.2-11.13c-6.5-7.77-9.12-18.38-7.18-29.11C57.06 392.94 83.4 353.61 124.8 326c36.78-24.51 83.37-38 131.2-38s94.42 13.5 131.2 38c41.4 27.6 67.74 66.93 76.18 113.75 1.94 10.73-.68 21.34-7.18 29.11A31 31 0 01432 480z\"/></svg>","search-outline":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path d=\"M221.09 64a157.09 157.09 0 10157.09 157.09A157.1 157.1 0 00221.09 64z\" fill=\"none\" stroke=\"currentColor\" stroke-miterlimit=\"10\" stroke-width=\"32\"/><path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-miterlimit=\"10\" stroke-width=\"32\" d=\"M338.29 338.29L448 448\"/></svg>","search":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path d=\"M456.69 421.39L362.6 327.3a173.81 173.81 0 0034.84-104.58C397.44 126.38 319.06 48 222.72 48S48 126.38 48 222.72s78.38 174.72 174.72 174.72A173.81 173.81 0 00327.3 362.6l94.09 94.09a25 25 0 0035.3-35.3zM97.92 222.72a124.8 124.8 0 11124.8 124.8 124.95 124.95 0 01-124.8-124.8z\"/></svg>","shield-checkmark-outline":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\" d=\"M336 176L225.2 304 176 255.8\"/><path d=\"M463.1 112.37C373.68 96.33 336.71 84.45 256 48c-80.71 36.45-117.68 48.33-207.1 64.37C32.7 369.13 240.58 457.79 256 464c15.42-6.21 223.3-94.87 207.1-351.63z\" fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\"/></svg>","sparkles":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path d=\"M208 512a24.84 24.84 0 01-23.34-16l-39.84-103.6a16.06 16.06 0 00-9.19-9.19L32 343.34a25 25 0 010-46.68l103.6-39.84a16.06 16.06 0 009.19-9.19L184.66 144a25 25 0 0146.68 0l39.84 103.6a16.06 16.06 0 009.19 9.19l103 39.63a25.49 25.49 0 0116.63 24.1 24.82 24.82 0 01-16 22.82l-103.6 39.84a16.06 16.06 0 00-9.19 9.19L231.34 496A24.84 24.84 0 01208 512zm66.85-254.84zM88 176a14.67 14.67 0 01-13.69-9.4l-16.86-43.84a7.28 7.28 0 00-4.21-4.21L9.4 101.69a14.67 14.67 0 010-27.38l43.84-16.86a7.31 7.31 0 004.21-4.21L74.16 9.79A15 15 0 0186.23.11a14.67 14.67 0 0115.46 9.29l16.86 43.84a7.31 7.31 0 004.21 4.21l43.84 16.86a14.67 14.67 0 010 27.38l-43.84 16.86a7.28 7.28 0 00-4.21 4.21l-16.86 43.84A14.67 14.67 0 0188 176zM400 256a16 16 0 01-14.93-10.26l-22.84-59.37a8 8 0 00-4.6-4.6l-59.37-22.84a16 16 0 010-29.86l59.37-22.84a8 8 0 004.6-4.6l22.67-58.95a16.45 16.45 0 0113.17-10.57 16 16 0 0116.86 10.15l22.84 59.37a8 8 0 004.6 4.6l59.37 22.84a16 16 0 010 29.86l-59.37 22.84a8 8 0 00-4.6 4.6l-22.84 59.37A16 16 0 01400 256z\"/></svg>","star":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path d=\"M394 480a16 16 0 01-9.39-3L256 383.76 127.39 477a16 16 0 01-24.55-18.08L153 310.35 23 221.2a16 16 0 019-29.2h160.38l48.4-148.95a16 16 0 0130.44 0l48.4 149H480a16 16 0 019.05 29.2L359 310.35l50.13 148.53A16 16 0 01394 480z\"/></svg>","sunny":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path d=\"M256 118a22 22 0 01-22-22V48a22 22 0 0144 0v48a22 22 0 01-22 22zM256 486a22 22 0 01-22-22v-48a22 22 0 0144 0v48a22 22 0 01-22 22zM369.14 164.86a22 22 0 01-15.56-37.55l33.94-33.94a22 22 0 0131.11 31.11l-33.94 33.94a21.93 21.93 0 01-15.55 6.44zM108.92 425.08a22 22 0 01-15.55-37.56l33.94-33.94a22 22 0 1131.11 31.11l-33.94 33.94a21.94 21.94 0 01-15.56 6.45zM464 278h-48a22 22 0 010-44h48a22 22 0 010 44zM96 278H48a22 22 0 010-44h48a22 22 0 010 44zM403.08 425.08a21.94 21.94 0 01-15.56-6.45l-33.94-33.94a22 22 0 0131.11-31.11l33.94 33.94a22 22 0 01-15.55 37.56zM142.86 164.86a21.89 21.89 0 01-15.55-6.44l-33.94-33.94a22 22 0 0131.11-31.11l33.94 33.94a22 22 0 01-15.56 37.55zM256 358a102 102 0 11102-102 102.12 102.12 0 01-102 102z\"/></svg>","trash-outline":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path d=\"M112 112l20 320c.95 18.49 14.4 32 32 32h184c17.67 0 30.87-13.51 32-32l20-320\" fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\"/><path stroke=\"currentColor\" stroke-linecap=\"round\" stroke-miterlimit=\"10\" stroke-width=\"32\" d=\"M80 112h352\"/><path d=\"M192 112V72h0a23.93 23.93 0 0124-24h80a23.93 23.93 0 0124 24h0v40M256 176v224M184 176l8 224M328 176l-8 224\" fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\"/></svg>","walk-outline":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path d=\"M314.21 482.32l-56.77-114.74-44.89-57.39a72.82 72.82 0 01-10.13-37.05V144h15.67a40.22 40.22 0 0140.23 40.22v183.36M127.9 293.05v-74.52S165.16 144 202.42 144M370.1 274.42L304 231M170.53 478.36L224 400\" fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\"/><circle cx=\"258.32\" cy=\"69.48\" r=\"37.26\" fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\"/></svg>"};

var PHOTOS_B64 = ["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"];

// The plugin sandbox has no atob, and figma.base64Decode only exists on newer
// builds, so decode by hand when it is missing.
var B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function base64ToBytes(b64) {
  if (typeof figma !== 'undefined' && figma.base64Decode) {
    return figma.base64Decode(b64);
  }
  var clean = b64.replace(/=+$/, '');
  var out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  var bits = 0, acc = 0, o = 0;
  for (var i = 0; i < clean.length; i += 1) {
    acc = (acc << 6) | B64_CHARS.indexOf(clean.charAt(i));
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (acc >> bits) & 0xff;
    }
  }
  return out;
}

// Each photo is uploaded to the Figma document once and reused, rather than
// creating a fresh image per card.
var IMAGE_CACHE = {};
function imageFill(index) {
  var key = 'p' + (index % PHOTOS_B64.length);
  if (!IMAGE_CACHE[key]) {
    try {
      IMAGE_CACHE[key] = figma.createImage(base64ToBytes(PHOTOS_B64[index % PHOTOS_B64.length])).hash;
    } catch (e) {
      return null; // fall back to the flat placeholder
    }
  }
  return [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: IMAGE_CACHE[key] }];
}

// A real Ionicon, recoloured to match the palette. Falls back to a rounded
// square if a name is ever requested that was not embedded, so a typo degrades
// to the old placeholder rather than throwing.
function icon(name, size, color) {
  var svg = ICONS[name];
  if (!svg || typeof figma.createNodeFromSvg !== 'function') {
    return chip(size, size, color, size / 4);
  }
  var node = figma.createNodeFromSvg(svg);
  node.name = 'Icon / ' + name;
  node.resize(size, size);
  node.fills = [];
  (function recolour(n) {
    if (n.type !== 'FRAME' && n.fills !== undefined && n.fills !== figma.mixed) {
      n.fills = solid(color);
    }
    if (n.strokes !== undefined && n.strokes.length > 0) {
      n.strokes = solid(color);
    }
    if (n.children) { n.children.forEach(recolour); }
  })(node);
  return node;
}

// A circular icon button, as IconButton renders it in the app.
function roundIcon(name, colour, bg, size) {
  var b = box({
    name: 'IconButton / ' + name,
    radius: R.pill,
    fill: bg || C.surfaceAlt,
    align: 'CENTER',
    justify: 'CENTER',
    gap: 0,
  });
  var d = size || 40;
  b.resize(d, d);
  b.primaryAxisSizingMode = 'FIXED';
  b.counterAxisSizingMode = 'FIXED';
  b.appendChild(icon(name, Math.round(d * 0.45), colour || C.inkSoft));
  return b;
}

function pill(textValue, fg, bg, glyph) {
  var p = box({ name: 'Pill / ' + textValue, horizontal: true, padX: SP.xs, padY: SP.xxs, radius: R.pill, fill: bg, align: 'CENTER', gap: SP.xxs });
  if (glyph) { p.appendChild(icon(glyph, 11, fg)); }
  p.appendChild(label(textValue, 'micro', fg));
  return p;
}

// `textValue` doubles as the node name, so the prototype wiring at the bottom
// of this file can find a specific button by the words on it.
function button(textValue, variant) {
  var bg = variant === 'secondary' ? C.surface : variant === 'ghost' ? null : C.brand;
  var fg = variant === 'primary' || variant == null ? C.onBrand : C.brand;
  var b = box({
    name: 'Button / ' + textValue,
    horizontal: true,
    padX: SP.md,
    padY: SP.sm,
    radius: R.md,
    fill: bg,
    align: 'CENTER',
    justify: 'CENTER',
    grow: true,
    border: variant === 'secondary' ? C.lineStrong : null,
  });
  b.layoutAlign = 'STRETCH';
  b.primaryAxisAlignItems = 'CENTER';
  b.appendChild(label(textValue, 'bodyStrong', fg));
  return b;
}

function card(name) {
  return box({
    name: name || 'Card',
    padX: SP.md,
    padY: SP.md,
    radius: R.lg,
    fill: C.surface,
    gap: SP.xs,
    shadow: true,
  });
}

// ---------------------------------------------------------------------------
// Shared chrome
// ---------------------------------------------------------------------------

function statusBar() {
  var bar = box({ name: 'Status bar', horizontal: true, padX: GUTTER, padY: SP.xs, grow: true, align: 'CENTER', justify: 'SPACE_BETWEEN' });
  bar.layoutAlign = 'STRETCH';
  bar.appendChild(label('9:41', 'captionStrong', C.ink));
  bar.appendChild(label('▮▮▮', 'caption', C.inkFaint));
  return bar;
}

function header(titleText, eyebrow, withBack) {
  var h = box({ name: 'Header', padX: GUTTER, padY: SP.xs, gap: SP.xxs });
  h.layoutAlign = 'STRETCH';
  var row = box({ name: 'Row', horizontal: true, gap: SP.xs, align: 'CENTER' });
  row.layoutAlign = 'STRETCH';
  if (withBack) row.appendChild(roundIcon('chevron-back', C.inkSoft));
  var stack = box({ name: 'Titles', gap: 2 });
  stack.layoutGrow = 1;
  if (eyebrow) stack.appendChild(label(eyebrow, 'micro', C.brand, { uppercase: true }));
  stack.appendChild(label(titleText, 'title', C.ink));
  row.appendChild(stack);
  row.appendChild(roundIcon('moon', C.inkSoft)); // theme toggle
  h.appendChild(row);
  return h;
}

// The floating pill tab bar, with Map raised in the centre.
function tabBar(activeIndex) {
  var wrap = box({ name: 'Tab bar', padX: GUTTER, padY: SP.sm, grow: true, fill: C.canvas });
  wrap.layoutAlign = 'STRETCH';

  var bar = box({
    name: 'Bar',
    horizontal: true,
    padX: SP.xs,
    padY: SP.xs,
    radius: R.pill,
    fill: C.surface,
    align: 'CENTER',
    justify: 'SPACE_BETWEEN',
    grow: true,
    shadow: true,
  });
  bar.layoutAlign = 'STRETCH';

  var names = ['Home', 'Search', 'Map', 'Saved', 'Profile'];
  var glyphs = [
    ['home', 'home-outline'],
    ['search', 'search-outline'],
    ['map', 'map-outline'],
    ['heart', 'heart-outline'],
    ['person', 'person-outline'],
  ];
  for (var i = 0; i < names.length; i += 1) {
    var isCentre = i === 2;
    var isActive = i === activeIndex;
    var slot = box({ name: 'Tab / ' + names[i], align: 'CENTER', justify: 'CENTER', gap: 0 });
    slot.layoutGrow = 1;

    var size = isCentre ? 54 : 44;
    var filled = isCentre || isActive;
    // The circle is the container; the icon sits inside it, as in MainTabs.
    var circle = box({
      name: 'Circle',
      radius: R.pill,
      fill: filled ? C.brand : C.canvas,
      align: 'CENTER',
      justify: 'CENTER',
      gap: 0,
    });
    circle.resize(size, size);
    circle.primaryAxisSizingMode = 'FIXED';
    circle.counterAxisSizingMode = 'FIXED';
    circle.appendChild(icon(glyphs[i][filled ? 0 : 1], isCentre ? 24 : 21, filled ? C.onBrand : C.inkFaint));
    slot.appendChild(circle);
    bar.appendChild(slot);
  }

  wrap.appendChild(bar);
  return wrap;
}

// A listing card, the most repeated object in the app.
function propertyCard(name, price, address, facts, showMatch) {
  var c = box({ name: 'PropertyCard / ' + name, padX: SP.xs, padY: SP.xs, radius: R.lg, fill: C.surface, gap: 0, shadow: true });
  c.layoutAlign = 'STRETCH';

  var photoBlock = photo(W - GUTTER * 2 - SP.xs * 2, 168, R.md, name);
  // Save and compare float on the image, as PropertyCard renders them.
  var overlay = box({ name: 'Overlay', horizontal: true, gap: SP.xxs, padX: SP.xs, padY: SP.xs, justify: 'MAX' });
  overlay.layoutAlign = 'STRETCH';
  overlay.appendChild(roundIcon('heart-outline', C.surface, '#00000070', 30));
  overlay.appendChild(roundIcon('add-circle-outline', C.surface, '#00000070', 30));
  photoBlock.layoutMode = 'VERTICAL';
  photoBlock.counterAxisAlignItems = 'MIN';
  photoBlock.appendChild(overlay);
  c.appendChild(photoBlock);

  var bodyBox = box({ name: 'Body', padX: SP.sm, padY: SP.sm, gap: SP.xs });
  bodyBox.layoutAlign = 'STRETCH';

  var topRow = box({ name: 'Title row', horizontal: true, gap: SP.xs });
  topRow.layoutAlign = 'STRETCH';
  var left = box({ name: 'Left', gap: 2 });
  left.layoutGrow = 1;
  left.appendChild(label(name, 'bodyStrong', C.ink));
  left.appendChild(label(address, 'caption', C.inkFaint));
  topRow.appendChild(left);
  var right = box({ name: 'Price', align: 'MAX', gap: 0 });
  right.appendChild(label(price, 'bodyStrong', C.brand));
  right.appendChild(label('per month', 'micro', C.inkFaint));
  topRow.appendChild(right);
  bodyBox.appendChild(topRow);

  var factRow = box({ name: 'Facts', horizontal: true, gap: SP.xxs });
  for (var i = 0; i < facts.length; i += 1) {
    factRow.appendChild(pill(facts[i], C.inkSoft, C.canvasAlt));
  }
  bodyBox.appendChild(factRow);

  if (showMatch) {
    bodyBox.appendChild(pill('92% match', C.success, C.successSoft));
  }

  c.appendChild(bodyBox);
  return c;
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

function screen(name) {
  var f = figma.createFrame();
  f.name = name;
  f.resize(W, H);
  f.layoutMode = 'VERTICAL';
  f.primaryAxisSizingMode = 'FIXED';
  f.counterAxisSizingMode = 'FIXED';
  f.itemSpacing = SP.sm;
  f.fills = solid(C.canvas);
  f.clipsContent = true;
  f.appendChild(statusBar());
  return f;
}

function spacer(h) {
  var s = figma.createFrame();
  s.name = 'Spacer';
  s.resize(W, h);
  s.fills = [];
  return s;
}

function section(parent, nodes) {
  var wrap = box({ name: 'Section', padX: GUTTER, gap: SP.sm });
  wrap.layoutAlign = 'STRETCH';
  for (var i = 0; i < nodes.length; i += 1) {
    // Every child fills the gutter width. Without this each card, button and
    // input hugged its own text and the whole screen collapsed into a column
    // of narrow slivers down the left edge.
    nodes[i].layoutAlign = 'STRETCH';
    if (nodes[i].type === 'TEXT') {
      nodes[i].textAutoResize = 'HEIGHT';
    }
    wrap.appendChild(nodes[i]);
  }
  parent.appendChild(wrap);
  return wrap;
}

// Every string below is the text the app actually renders. They were read out
// of src/screens/*.tsx rather than invented, so the prototype and the build
// say the same words -- a mock that paraphrases its own app is worse than no
// mock, because the panel spots the difference.
var BUILDERS = {
  Landing: function () {
    var f = screen('01 Landing');

    var topRow = box({ name: 'Top row', horizontal: true, padX: GUTTER, padY: SP.xs, grow: true, align: 'CENTER', justify: 'SPACE_BETWEEN' });
    topRow.layoutAlign = 'STRETCH';
    topRow.appendChild(label('Tagum City', 'captionStrong', C.brand));
    topRow.appendChild(chip(40, 40, C.surfaceAlt, R.pill));
    f.appendChild(topRow);

    // The real screen uses an ImageBackground with a dark scrim over it.
    var hero = box({ name: 'Hero photo', grow: true, fill: C.ink, padX: GUTTER, padY: GUTTER, gap: SP.xxs, justify: 'MAX' });
    hero.layoutAlign = 'STRETCH';
    hero.resize(W, 240);
    hero.primaryAxisSizingMode = 'FIXED';
    hero.appendChild(label('BoardEase', 'display', C.onBrand));
    hero.appendChild(label('Boarding houses in Tagum City', 'body', C.onBrand));
    f.appendChild(hero);

    section(f, [
      label('Find a place that fits your budget.', 'heading', C.ink, { width: W - GUTTER * 2 }),
      button('Get started', 'primary'),
      button('Log in', 'secondary'),
      label('Booking and payments are arranged directly with the owner.', 'caption', C.inkSoft, { width: W - GUTTER * 2 }),
    ]);
    return f;
  },

  Login: function () {
    var f = screen('02 Login');
    f.appendChild(header('', null, true));
    section(f, [
      label('Welcome back', 'display', C.ink),
      label('Log in to find your next boarding house.', 'body', C.inkSoft, { width: W - GUTTER * 2 }),
      field('Email', 'you@example.com'),
      field('Password', 'Your password'),
      button('Log in', 'primary'),
      label('New here?', 'caption', C.inkSoft),
      label('Create an account', 'captionStrong', C.brand),
    ]);
    return f;
  },

  Register: function () {
    var f = screen('03 Register');
    f.appendChild(header('', null, true));
    section(f, [
      label('Create account', 'display', C.ink),
      label('Join BoardEase to start browsing boarding houses near you.', 'body', C.inkSoft, { width: W - GUTTER * 2 }),
      field('Email', 'you@example.com'),
      field('Password', 'At least 6 characters'),
      label('Use at least 6 characters.', 'caption', C.inkFaint),
      field('Confirm password', 'Type it again'),
      button('Create account', 'primary'),
      label('Already have an account?', 'caption', C.inkSoft),
      label('Log in', 'captionStrong', C.brand),
    ]);
    return f;
  },

  Home: function () {
    var f = screen('04 Home');
    f.appendChild(header('Find your next room', 'Good to see you, Jetroy'));

    var searchCard = card('Search entry');
    searchCard.layoutMode = 'HORIZONTAL';
    searchCard.counterAxisAlignItems = 'CENTER';
    searchCard.itemSpacing = SP.sm;
    searchCard.layoutAlign = 'STRETCH';
    searchCard.appendChild(roundIcon('search', C.brand, C.brandSoft, 40));
    var st = box({ name: 'Text', gap: 1 });
    st.layoutGrow = 1;
    st.appendChild(label('Browse boarding houses', 'bodyStrong', C.ink));
    st.appendChild(label('Tagum City', 'caption', C.inkFaint));
    searchCard.appendChild(st);
    searchCard.appendChild(icon('chevron-forward', 18, C.inkFaint));

    var tiles = box({ name: 'Tiles', horizontal: true, gap: SP.sm });
    tiles.layoutAlign = 'STRETCH';
    var t1 = card('Saved');
    t1.layoutGrow = 1;
    t1.appendChild(icon('heart-outline', 19, C.brand));
    t1.appendChild(label('Saved', 'captionStrong', C.ink));
    t1.appendChild(label('Your shortlist', 'micro', C.inkFaint));
    var t2 = card('Alerts');
    t2.layoutGrow = 1;
    t2.appendChild(icon('notifications-outline', 19, C.brand));
    t2.appendChild(label('Alerts', 'captionStrong', C.ink));
    t2.appendChild(label('New matches', 'micro', C.inkFaint));
    tiles.appendChild(t1);
    tiles.appendChild(t2);

    // The empty state a fresh account actually sees.
    var empty = box({ name: 'Nothing viewed yet', padX: SP.md, padY: SP.md, radius: R.lg, fill: C.canvas, border: C.line, align: 'CENTER', gap: SP.xxs });
    empty.layoutAlign = 'STRETCH';
    empty.appendChild(icon('compass-outline', 24, C.inkFaint));
    empty.appendChild(label('Nothing viewed yet', 'captionStrong', C.ink));
    empty.appendChild(label('Recently viewed boarding houses', 'caption', C.inkFaint, { width: 240 }));

    section(f, [searchCard, tiles, empty]);
    f.appendChild(spacer(200));
    f.appendChild(tabBar(0));
    return f;
  },

  Search: function () {
    var f = screen('05 Search');

    var head = box({ name: 'Header', padX: GUTTER, padY: SP.xs, gap: SP.xxs });
    head.layoutAlign = 'STRETCH';
    var hr = box({ name: 'Row', horizontal: true, gap: SP.xs, align: 'CENTER' });
    hr.layoutAlign = 'STRETCH';
    var hs = box({ name: 'Titles', gap: 2 });
    hs.layoutGrow = 1;
    hs.appendChild(label('Near your location', 'micro', C.brand, { uppercase: true }));
    hs.appendChild(label('Search', 'title', C.ink));
    hr.appendChild(hs);
    hr.appendChild(pill('Map', C.brand, C.brandSoft));
    hr.appendChild(chip(40, 40, C.surfaceAlt, R.pill));
    head.appendChild(hr);
    f.appendChild(head);

    var controls = box({ name: 'Controls', horizontal: true, gap: SP.xs });
    controls.layoutAlign = 'STRETCH';
    var seg = box({ name: 'Sort', horizontal: true, padX: SP.xxs, padY: SP.xxs, radius: R.pill, fill: C.canvasAlt, gap: SP.xxs });
    seg.layoutGrow = 1;
    seg.appendChild(pill('Recommended', C.brand, C.surface));
    seg.appendChild(pill('Nearest', C.inkFaint, C.canvasAlt));
    controls.appendChild(seg);
    controls.appendChild(pill('Filter', C.inkSoft, C.canvasAlt));

    // The banner shown when location permission is off -- which is the state
    // the app is usually demoed in.
    var banner = box({ name: 'GPS banner', horizontal: true, padX: SP.sm, padY: SP.xs, radius: R.md, fill: C.warningSoft, gap: SP.xs, align: 'CENTER' });
    banner.layoutAlign = 'STRETCH';
    var bt = label('Browsing without distance', 'caption', C.warning);
    banner.appendChild(bt);
    var bspacer = box({ name: 'Gap' });
    bspacer.layoutGrow = 1;
    banner.appendChild(bspacer);
    banner.appendChild(label('Settings', 'captionStrong', C.brand));

    section(f, [
      controls,
      banner,
      propertyCard("Student's Nest", '₱2,100', 'Visayan Village, Tagum City', ['Shared', 'WiFi', 'Study Area'], false),
      propertyCard('Greenview Dormitory', '₱1,800', 'Magugpo East, Tagum City', ['Shared', 'WiFi', 'Kitchen'], false),
    ]);
    f.appendChild(tabBar(1));
    return f;
  },

  Filter: function () {
    var f = screen('06 Filter');

    var bar = box({ name: 'Sheet header', horizontal: true, padX: GUTTER, padY: SP.xs, gap: SP.xs, align: 'CENTER' });
    bar.layoutAlign = 'STRETCH';
    bar.appendChild(chip(40, 40, C.surfaceAlt, R.pill));
    var bt2 = label('Filters', 'heading', C.ink);
    bar.appendChild(bt2);
    var bg2 = box({ name: 'Gap' });
    bg2.layoutGrow = 1;
    bar.appendChild(bg2);
    bar.appendChild(label('Reset', 'captionStrong', C.brand));
    f.appendChild(bar);

    var presets = box({ name: 'Presets', horizontal: true, gap: SP.xs });
    presets.appendChild(pill('Under ₱1,500', C.inkSoft, C.surface));
    presets.appendChild(pill('Under ₱2,500', C.onBrand, C.brand));
    presets.appendChild(pill('Under ₱3,500', C.inkSoft, C.surface));

    var types = box({ name: 'Room types', horizontal: true, gap: SP.xs });
    types.appendChild(pill('Single', C.inkSoft, C.surface));
    types.appendChild(pill('Shared', C.onBrand, C.brand));
    types.appendChild(pill('Studio', C.inkSoft, C.surface));

    var am = box({ name: 'Amenities', horizontal: true, gap: SP.xs });
    var list = ['WiFi', 'CR', 'Parking', 'Aircon'];
    for (var i = 0; i < list.length; i += 1) am.appendChild(pill(list[i], C.inkSoft, C.surface));

    var alertsCard = card('Alerts');
    alertsCard.layoutMode = 'HORIZONTAL';
    alertsCard.counterAxisAlignItems = 'CENTER';
    alertsCard.itemSpacing = SP.sm;
    alertsCard.layoutAlign = 'STRETCH';
    alertsCard.appendChild(chip(38, 38, C.brandSoft, R.pill));
    var ac = box({ name: 'Text', gap: 1 });
    ac.layoutGrow = 1;
    ac.appendChild(label('Alert me about new matches', 'captionStrong', C.ink));
    ac.appendChild(label('Saves these filters and tells you when a new listing fits.', 'caption', C.inkFaint, { width: 210 }));
    alertsCard.appendChild(ac);
    alertsCard.appendChild(chip(44, 26, C.brand, R.pill));

    section(f, [
      label('Budget', 'heading', C.ink),
      field('Maximum monthly rent', 'Any price'),
      presets,
      label('Room type', 'heading', C.ink),
      types,
      label('Amenities', 'heading', C.ink),
      am,
      alertsCard,
    ]);

    var actions = box({ name: 'Action bar', horizontal: true, padX: GUTTER, padY: SP.sm, gap: SP.sm, fill: C.surface, grow: true });
    actions.layoutAlign = 'STRETCH';
    actions.appendChild(button('Reset', 'secondary'));
    var apply = button('Apply 2 filters', 'primary');
    apply.layoutGrow = 1;
    actions.appendChild(apply);
    f.appendChild(actions);
    return f;
  },

  Details: function () {
    var f = screen('07 Details');
    f.appendChild(photo(W, 300, 0, "listing hero"));

    var actions = box({ name: 'Actions', horizontal: true, gap: SP.xs });
    actions.layoutAlign = 'STRETCH';
    var b1 = button('Get directions', 'primary');
    b1.layoutGrow = 1;
    actions.appendChild(b1);
    actions.appendChild(button('Compare', 'secondary'));

    var about = card('About');
    about.layoutAlign = 'STRETCH';
    about.appendChild(label('About this place', 'captionStrong', C.inkSoft));
    about.appendChild(label('Quiet study-friendly boarding house for students.', 'body', C.inkSoft, { width: W - GUTTER * 2 - SP.md * 2 }));

    var amen = box({ name: 'Amenities', horizontal: true, gap: SP.xs });
    var aList = ['Shared', 'WiFi', 'Study Area'];
    for (var i = 0; i < aList.length; i += 1) amen.appendChild(pill(aList[i], C.brand, C.brandSoft));

    var priceRow = box({ name: 'Title row', horizontal: true, gap: SP.sm, align: 'MIN' });
    priceRow.layoutAlign = 'STRETCH';
    var pl = box({ name: 'Left', gap: SP.xxs });
    pl.layoutGrow = 1;
    pl.appendChild(label("Student's Nest", 'title', C.ink));
    pl.appendChild(label('Visayan Village, Tagum City', 'caption', C.inkFaint));
    priceRow.appendChild(pl);
    var pr = box({ name: 'Price', align: 'MAX', gap: 0 });
    pr.appendChild(label('₱2,100', 'metric', C.brand));
    pr.appendChild(label('per month', 'micro', C.inkFaint));
    priceRow.appendChild(pr);

    section(f, [
      priceRow,
      label('★ 4.6  (12)', 'caption', C.inkSoft),
      actions,
      about,
      label('What it offers', 'heading', C.ink),
      amen,
      reviewsHeading(),
      reviewRow('Maria', 'Quiet at night and the WiFi actually works.'),
      reviewRow('Paolo', 'Close to campus. Landlady is strict about visitors.'),
    ]);
    return f;
  },

  Map: function () {
    var f = screen('08 Map');

    var search = box({ name: 'Map search', horizontal: true, padX: GUTTER, padY: SP.xs, gap: SP.xs, grow: true, align: 'CENTER' });
    search.layoutAlign = 'STRETCH';
    var sBox = box({ name: 'Field', horizontal: true, padX: SP.sm, padY: SP.sm, radius: R.pill, fill: C.surface, gap: SP.xs, align: 'CENTER', shadow: true });
    sBox.layoutGrow = 1;
    sBox.appendChild(icon('search', 17, C.inkFaint));
    sBox.appendChild(label('Search this map', 'body', C.inkFaint));
    search.appendChild(sBox);
    search.appendChild(roundIcon('locate', C.ink, C.surface, 44));
    f.appendChild(search);

    var count = box({ name: 'Count', padX: GUTTER });
    count.layoutAlign = 'STRETCH';
    count.appendChild(pill('4 listings on the map', C.inkSoft, C.surface));
    f.appendChild(count);

    // Stand-in for the Leaflet canvas, with the price markers on it.
    var mapArea = box({ name: 'Map canvas', grow: true, fill: C.photoFill, padX: SP.xl, padY: SP.xl, gap: SP.lg });
    mapArea.layoutAlign = 'STRETCH';
    mapArea.resize(W, 330);
    mapArea.primaryAxisSizingMode = 'FIXED';
    mapArea.appendChild(pill('₱2,100', C.onBrand, C.brand));
    mapArea.appendChild(pill('₱1,800', C.ink, C.surface));
    mapArea.appendChild(pill('₱3,200', C.ink, C.surface));
    f.appendChild(mapArea);

    // The swipeable carousel card.
    var cardWrap = box({ name: 'Carousel', padX: GUTTER });
    cardWrap.layoutAlign = 'STRETCH';
    var c = box({ name: "PropertyCard / Student's Nest", horizontal: true, padX: SP.xs, padY: SP.xs, radius: R.lg, fill: C.surface, gap: SP.sm, shadow: true, border: C.brand, borderWidth: 2 });
    c.layoutAlign = 'STRETCH';
    c.appendChild(photo(92, 92, R.md, "thumb"));
    var cv = box({ name: 'Text', gap: 3 });
    cv.layoutGrow = 1;
    cv.appendChild(label("Student's Nest", 'captionStrong', C.ink));
    cv.appendChild(label('Visayan Village, Tagum City', 'micro', C.inkFaint));
    cv.appendChild(label('Distance unavailable · Shared', 'micro', C.inkFaint));
    var priceRow = box({ name: 'Price row', horizontal: true, gap: SP.xs, align: 'CENTER' });
    priceRow.layoutAlign = 'STRETCH';
    priceRow.appendChild(label('₱2,100 /mo', 'bodyStrong', C.brand));
    var pgap = box({ name: 'Gap' });
    pgap.layoutGrow = 1;
    priceRow.appendChild(pgap);
    priceRow.appendChild(label('Details', 'micro', C.brand));
    cv.appendChild(priceRow);
    c.appendChild(cv);
    cardWrap.appendChild(c);
    f.appendChild(cardWrap);

    f.appendChild(tabBar(2));
    return f;
  },

  Navigation: function () {
    var f = screen('09 Route Guide');
    var banner = box({ name: 'Banner', horizontal: true, padX: GUTTER, padY: SP.sm, fill: C.brand, gap: SP.xs, align: 'CENTER', grow: true });
    banner.layoutAlign = 'STRETCH';
    banner.appendChild(label('450 m to go', 'captionStrong', C.onBrand));
    var bgap = box({ name: 'Gap' });
    bgap.layoutGrow = 1;
    banner.appendChild(bgap);
    banner.appendChild(pill('LIVE', C.onBrand, C.brandDeep));
    f.appendChild(banner);

    f.appendChild(photo(W, 400, 0, "route map"));

    var steps = box({ name: 'Steps', padX: GUTTER, padY: SP.md, gap: SP.sm, fill: C.surface, radius: R.lg, grow: true });
    steps.layoutAlign = 'STRETCH';
    steps.appendChild(label("Directions to Student's Nest", 'captionStrong', C.ink));
    var lines = ['Head north on Visayan Street', 'Turn right onto Gazmen Road', 'Your destination is on the left'];
    for (var i = 0; i < lines.length; i += 1) {
      var row = box({ name: 'Step', horizontal: true, gap: SP.sm, align: 'MIN' });
      row.layoutAlign = 'STRETCH';
      row.appendChild(roundIcon('walk-outline', C.onBrand, C.brand, 22));
      var sv = box({ name: 'Text', gap: 1 });
      sv.layoutGrow = 1;
      sv.appendChild(label(lines[i], 'caption', C.ink, { width: 260 }));
      sv.appendChild(label('120 m', 'micro', C.inkFaint));
      row.appendChild(sv);
      steps.appendChild(row);
    }
    f.appendChild(steps);
    return f;
  },

  Compare: function () {
    var f = screen('10 Compare');
    var sub = box({ name: 'Subtitle', padX: GUTTER, padY: SP.xs });
    sub.layoutAlign = 'STRETCH';
    sub.appendChild(label('2 listings side by side', 'caption', C.inkFaint));
    f.appendChild(sub);

    var table = box({ name: 'Table', horizontal: true, gap: 0 });
    table.layoutAlign = 'STRETCH';

    var rowLabels = ['', 'Price', 'Room type', 'Distance', 'Rating', 'WiFi', 'Study Area'];
    var labels = box({ name: 'Labels', gap: 0, fill: C.canvasAlt, width: 104 });
    for (var i = 0; i < rowLabels.length; i += 1) {
      var cell = box({ name: 'Cell', padX: SP.sm, padY: SP.sm, width: 104 });
      cell.resize(104, i === 0 ? 100 : 52);
      cell.primaryAxisSizingMode = 'FIXED';
      cell.appendChild(label(rowLabels[i] || ' ', 'captionStrong', C.ink));
      labels.appendChild(cell);
    }
    table.appendChild(labels);

    var cols = [
      { name: "Student's Nest", values: ['₱2,100', 'Shared', 'Unknown', '4.6 (12)', 'Yes', 'Yes'] },
      { name: 'Greenview Dormitory', values: ['₱1,800', 'Shared', 'Unknown', '4.2 (7)', 'Yes', 'No'] },
    ];
    for (var c2 = 0; c2 < cols.length; c2 += 1) {
      var col = box({ name: 'Column', gap: 0, width: 150 });
      var headCell = box({ name: 'Header cell', padX: SP.xs, padY: SP.xs, width: 150, gap: SP.xxs, fill: C.surfaceAlt });
      headCell.resize(150, 100);
      headCell.primaryAxisSizingMode = 'FIXED';
      headCell.appendChild(photo(134, 44, R.sm, "thumb"));
      headCell.appendChild(label(cols[c2].name, 'captionStrong', C.ink, { width: 130 }));
      var hActions = box({ name: 'Actions', horizontal: true, gap: SP.xs });
      hActions.appendChild(label('Remove', 'micro', C.danger));
      hActions.appendChild(label('View', 'micro', C.brand));
      headCell.appendChild(hActions);
      col.appendChild(headCell);

      for (var v = 0; v < cols[c2].values.length; v += 1) {
        var cc = box({ name: 'Cell', padX: SP.sm, padY: SP.sm, width: 150 });
        cc.resize(150, 52);
        cc.primaryAxisSizingMode = 'FIXED';
        cc.appendChild(label(cols[c2].values[v], v === 0 ? 'bodyStrong' : 'caption', v === 0 ? C.brand : C.inkSoft));
        col.appendChild(cc);
      }
      table.appendChild(col);
    }
    f.appendChild(table);

    // The app puts "Clear comparison" under the table, and each column header
    // carries Remove and View.
    var clear = box({ name: 'Clear comparison', padX: GUTTER, padY: SP.md, align: 'CENTER', justify: 'CENTER', grow: true });
    clear.layoutAlign = 'STRETCH';
    clear.appendChild(label('Clear comparison', 'captionStrong', C.danger));
    f.appendChild(clear);
    return f;
  },

  Reviews: function () {
    var f = screen('11 Reviews');

    var summary = card('Summary');
    summary.layoutMode = 'HORIZONTAL';
    summary.counterAxisAlignItems = 'CENTER';
    summary.itemSpacing = SP.md;
    summary.layoutAlign = 'STRETCH';
    var sl = box({ name: 'Score', align: 'CENTER', gap: SP.xxs });
    sl.appendChild(label('4.6', 'display', C.ink));
    sl.appendChild(label('★★★★★', 'caption', C.star));
    summary.appendChild(sl);
    var sv2 = box({ name: 'Meta', gap: 2 });
    sv2.layoutGrow = 1;
    sv2.appendChild(label("Student's Nest", 'captionStrong', C.ink));
    sv2.appendChild(label('12 reviews from tenants', 'caption', C.inkFaint));
    summary.appendChild(sv2);

    var form = card('Write a review');
    form.layoutAlign = 'STRETCH';
    form.appendChild(label('Write a review', 'heading', C.ink));
    form.appendChild(label('Your rating', 'captionStrong', C.inkSoft));
    form.appendChild(label('★★★★★', 'title', C.star));
    form.appendChild(field('Your review', 'What was it like to live here?'));
    form.appendChild(button('Submit review', 'primary'));

    var review = card('Review');
    review.layoutAlign = 'STRETCH';
    var rh = box({ name: 'Row', horizontal: true, gap: SP.xs, align: 'CENTER' });
    rh.layoutAlign = 'STRETCH';
    rh.appendChild(roundIcon('person', C.brand, C.brandSoft, 32));
    var rv = box({ name: 'Who', gap: 1 });
    rv.layoutGrow = 1;
    rv.appendChild(label('Maria', 'captionStrong', C.ink));
    rv.appendChild(label('3 days ago', 'micro', C.inkFaint));
    rh.appendChild(rv);
    rh.appendChild(label('★★★★★', 'caption', C.star));
    review.appendChild(rh);
    review.appendChild(label('Quiet at night and the WiFi actually works. Landlady is strict about visitors.', 'caption', C.inkSoft, { width: W - GUTTER * 2 - SP.md * 2 }));

    section(f, [summary, form, label('What tenants say', 'heading', C.ink), review]);
    return f;
  },

  Favorites: function () {
    var f = screen('12 Saved');
    f.appendChild(header('Saved listings', 'Your shortlist'));
    section(f, [
      propertyCard("Student's Nest", '₱2,100', 'Visayan Village, Tagum City', ['Shared', 'WiFi'], false),
      propertyCard('CityStay Rooms', '₱3,200', 'Magugpo Poblacion, Tagum City', ['Single', 'Own CR'], false),
    ]);
    f.appendChild(spacer(SP.xs));
    f.appendChild(tabBar(3));
    return f;
  },

  Notifications: function () {
    var f = screen('13 Alerts');

    var status = box({ name: 'Status', horizontal: true, padX: GUTTER, padY: SP.xs, gap: SP.xs, align: 'CENTER' });
    status.layoutAlign = 'STRETCH';
    status.appendChild(icon('checkmark-circle', 15, C.success));
    var sgap = label('Alerts are on for your saved filters', 'caption', C.inkSoft);
    status.appendChild(sgap);
    var sg = box({ name: 'Gap' });
    sg.layoutGrow = 1;
    status.appendChild(sg);
    status.appendChild(label('Edit', 'captionStrong', C.brand));
    status.appendChild(label('Clear', 'captionStrong', C.danger));
    f.appendChild(status);

    var alertCard = box({ name: 'Alert', horizontal: true, padX: SP.md, padY: SP.md, radius: R.lg, fill: C.brandSoft, gap: SP.sm, shadow: true });
    alertCard.layoutAlign = 'STRETCH';
    alertCard.appendChild(roundIcon('home', C.onBrand, C.brand, 36));
    var av = box({ name: 'Text', gap: 2 });
    av.layoutGrow = 1;
    av.appendChild(label('CityStay Rooms', 'captionStrong', C.ink));
    av.appendChild(label('New listing matches your saved filters', 'caption', C.inkSoft, { width: 220 }));
    av.appendChild(label('2 hours ago', 'micro', C.inkFaint));
    alertCard.appendChild(av);

    function alertRow(titleText, bodyText, when, unread) {
      var a = box({ name: unread ? 'Alert' : 'Alert read', horizontal: true, padX: SP.md, padY: SP.md, radius: R.lg, fill: unread ? C.brandSoft : C.surface, gap: SP.sm, shadow: true });
      a.layoutAlign = 'STRETCH';
      a.appendChild(roundIcon('home', unread ? C.onBrand : C.inkSoft, unread ? C.brand : C.canvasAlt, 36));
      var v = box({ name: 'Text', gap: 2 });
      v.layoutGrow = 1;
      v.appendChild(label(titleText, 'captionStrong', C.ink));
      v.appendChild(label(bodyText, 'caption', C.inkSoft, { width: 210 }));
      v.appendChild(label(when, 'micro', C.inkFaint));
      a.appendChild(v);
      return a;
    }

    section(f, [
      alertCard,
      alertRow('Sunrise Boarding House', 'New listing matches your saved filters', '1 day ago', false),
      alertRow('Greenview Dormitory', 'New listing matches your saved filters', '3 days ago', false),
    ]);
    return f;
  },

  Profile: function () {
    var f = screen('14 Profile');
    f.appendChild(header('Profile'));

    var account = card('Account');
    account.layoutAlign = 'STRETCH';
    var ar = box({ name: 'Row', horizontal: true, gap: SP.sm, align: 'CENTER' });
    ar.layoutAlign = 'STRETCH';
    ar.appendChild(roundIcon('person', C.brand, C.brandSoft, 52));
    var pv = box({ name: 'Meta', gap: SP.xxs });
    pv.layoutGrow = 1;
    pv.appendChild(label('j.martin.147292.tc@umindanao...', 'bodyStrong', C.ink));
    pv.appendChild(pill('Tenant', C.inkSoft, C.canvasAlt));
    ar.appendChild(pv);
    account.appendChild(ar);
    account.appendChild(settingsRow('Change password', 'Sends a reset link to your email'));

    var appearance = box({ name: 'Appearance', horizontal: true, padX: SP.xxs, padY: SP.xxs, radius: R.md, fill: C.canvasAlt, gap: SP.xxs });
    appearance.layoutAlign = 'STRETCH';
    appearance.appendChild(pill('System', C.brand, C.surface));
    appearance.appendChild(pill('Light', C.inkSoft, C.canvasAlt));
    appearance.appendChild(pill('Dark', C.inkSoft, C.canvasAlt));

    var permissions = card('Permissions');
    permissions.layoutAlign = 'STRETCH';
    permissions.appendChild(settingsRow('Match alerts', 'On — new listings matching your filters'));
    permissions.appendChild(settingsRow('Location access', 'Denied — distances unavailable'));

    var data = card('Data');
    data.layoutAlign = 'STRETCH';
    data.appendChild(settingsRow('Clear comparison list', 'Nothing selected'));
    data.appendChild(settingsRow('Clear offline data', 'Removes cached favourites from this phone'));

    // The app only renders this block for role === 'admin'. The prototype
    // shows it so the panel can reach the moderation screens; a tenant
    // account would not see it.
    var admin = card('Administration');
    admin.layoutAlign = 'STRETCH';
    admin.appendChild(settingsRow('Admin panel', 'Approve or reject submitted listings'));
    admin.appendChild(settingsRow('Add a listing', 'Publish a new boarding house'));

    section(f, [
      account,
      label('Appearance', 'heading', C.ink),
      appearance,
      label('Alerts & permissions', 'heading', C.ink),
      permissions,
      label('Data', 'heading', C.ink),
      data,
      label('Administration', 'heading', C.ink),
      admin,
      button('Log out', 'secondary'),
    ]);
    f.appendChild(spacer(40));
    f.appendChild(tabBar(4));
    return f;
  },

  Admin: function () {
    var f = screen('15 Admin panel');

    var tabs = box({ name: 'Tabs', horizontal: true, padX: SP.xxs, padY: SP.xxs, radius: R.pill, fill: C.canvasAlt, gap: SP.xxs });
    tabs.layoutAlign = 'STRETCH';
    tabs.appendChild(pill('Pending  3', C.brand, C.surface));
    tabs.appendChild(pill('Reviews  12', C.inkFaint, C.canvasAlt));

    var pending = card('Pending listing');
    pending.layoutAlign = 'STRETCH';
    var pr2 = box({ name: 'Row', horizontal: true, gap: SP.sm });
    pr2.layoutAlign = 'STRETCH';
    pr2.appendChild(photo(60, 60, R.sm, "thumb"));
    var pv2 = box({ name: 'Text', gap: 2 });
    pv2.layoutGrow = 1;
    pv2.appendChild(label('Sunrise Boarding House', 'captionStrong', C.ink));
    pv2.appendChild(label('Visayan Village, Tagum City', 'caption', C.inkFaint));
    pv2.appendChild(label('₱2,500', 'captionStrong', C.brand));
    pr2.appendChild(pv2);
    pending.appendChild(pr2);

    var actionRow = box({ name: 'Actions', horizontal: true, gap: SP.xs });
    actionRow.layoutAlign = 'STRETCH';
    var ap = button('Approve', 'primary');
    ap.layoutGrow = 1;
    var rj = button('Reject', 'secondary');
    rj.layoutGrow = 1;
    actionRow.appendChild(ap);
    actionRow.appendChild(rj);
    pending.appendChild(actionRow);

    function queueRow(titleText, addressText, priceText) {
      var q = card('Pending / ' + titleText);
      q.layoutAlign = 'STRETCH';
      var qr = box({ name: 'Row', horizontal: true, gap: SP.sm });
      qr.layoutAlign = 'STRETCH';
      qr.appendChild(photo(60, 60, R.sm, 'thumb'));
      var qv = box({ name: 'Text', gap: 2 });
      qv.layoutGrow = 1;
      qv.appendChild(label(titleText, 'captionStrong', C.ink));
      qv.appendChild(label(addressText, 'caption', C.inkFaint));
      qv.appendChild(label(priceText, 'captionStrong', C.brand));
      qr.appendChild(qv);
      q.appendChild(qr);
      return q;
    }

    section(f, [
      tabs,
      button('Add a new listing', 'primary'),
      pending,
      queueRow('Greenview Dormitory', 'Magugpo East, Tagum City', '₱1,800'),
      queueRow('CityStay Rooms', 'Magugpo Poblacion, Tagum City', '₱3,200'),
    ]);
    return f;
  },

  AddListing: function () {
    var f = screen('16 Add listing');
    section(f, [
      label('The basics', 'heading', C.ink),
      field('Name', 'e.g. Sunrise Boarding House'),
      field('Address', 'e.g. Visayan Village, Tagum City'),
      field('Monthly rent', '2500'),
      label('Room type', 'heading', C.ink),
    ]);

    var types = box({ name: 'Room types', horizontal: true, gap: SP.xs, padX: GUTTER });
    types.layoutAlign = 'STRETCH';
    types.appendChild(pill('Single', C.onBrand, C.brand));
    types.appendChild(pill('Shared', C.inkSoft, C.surface));
    types.appendChild(pill('Studio', C.inkSoft, C.surface));
    f.appendChild(types);

    section(f, [
      label('Location on the map', 'heading', C.ink),
      button('Use my current location', 'secondary'),
      label('Photo', 'heading', C.ink),
      button('Publish listing', 'primary'),
    ]);
    return f;
  },
};

// The Reviews heading on Details carries a "See all" link on the right.
function reviewsHeading() {
  var row = box({ name: 'Reviews', horizontal: true, gap: SP.sm, align: 'CENTER' });
  row.layoutAlign = 'STRETCH';
  row.appendChild(label('Reviews', 'heading', C.ink));
  var g = box({ name: 'Gap' });
  g.layoutGrow = 1;
  row.appendChild(g);
  row.appendChild(label('See all 12', 'captionStrong', C.brand));
  return row;
}

// One review card, as Details and Reviews both render them.
function reviewRow(who, body) {
  var c = card('Review / ' + who);
  c.layoutAlign = 'STRETCH';
  var head = box({ name: 'Row', horizontal: true, gap: SP.xs, align: 'CENTER' });
  head.layoutAlign = 'STRETCH';
  head.appendChild(roundIcon('person', C.brand, C.brandSoft, 28));
  var v = box({ name: 'Who', gap: 1 });
  v.layoutGrow = 1;
  v.appendChild(label(who, 'captionStrong', C.ink));
  head.appendChild(v);
  head.appendChild(label('★★★★★', 'caption', C.star));
  c.appendChild(head);
  c.appendChild(label(body, 'caption', C.inkSoft, { width: W - GUTTER * 2 - SP.md * 2 }));
  return c;
}

// One settings row, matching the Row component in ProfileScreen.
function settingsRow(titleText, subtitleText) {
  var row = box({ name: 'Row / ' + titleText, horizontal: true, gap: SP.sm, align: 'CENTER' });
  row.layoutAlign = 'STRETCH';
  row.appendChild(roundIcon('options-outline', C.inkSoft, C.canvasAlt, 36));
  var v = box({ name: 'Text', gap: 1 });
  v.layoutGrow = 1;
  v.appendChild(label(titleText, 'captionStrong', C.ink));
  v.appendChild(label(subtitleText, 'caption', C.inkFaint, { width: 200 }));
  row.appendChild(v);
  row.appendChild(icon('chevron-forward', 16, C.inkFaint));
  return row;
}

// A labelled input, matching src/components/ui/Input.tsx.
function field(labelText, placeholder) {
  var wrap = box({ name: 'Input / ' + labelText, gap: SP.xxs });
  wrap.layoutAlign = 'STRETCH';
  wrap.appendChild(label(labelText, 'captionStrong', C.inkSoft));
  var inputBox = box({
    name: 'Box',
    horizontal: true,
    padX: SP.sm,
    padY: SP.sm,
    radius: R.sm,
    fill: C.surface,
    border: C.lineStrong,
    align: 'CENTER',
    grow: true,
  });
  inputBox.layoutAlign = 'STRETCH';
  inputBox.appendChild(label(placeholder, 'body', C.inkFaint));
  wrap.appendChild(inputBox);
  return wrap;
}

// ---------------------------------------------------------------------------
// Prototype wiring -- which screen each screen can reach
// ---------------------------------------------------------------------------

// Taken from the actual navigate() calls in src/screens/*.tsx, not from
// memory. Each entry is [fromScreen, nodeNameInThatScreen, toScreen]; a null
// node name links the whole frame, which is the fallback for screens where the
// trigger is something this mock does not draw.
//
// Verified against the app on 23 September 2026:
//   Landing       -> Login, Register
//   Login         -> Register        (+ Home, via AuthContext on success)
//   Register      -> Login           (+ Home, via AuthContext on success)
//   Home          -> Search, Favorites, Notifications, Details, Admin
//   Search        -> Filter, Details, Map   (+ Compare, via CompareBar)
//   Filter        -> back to Search
//   Details       -> Navigation, Reviews    (+ Compare, via CompareBar)
//   Map           -> Details
//   Compare       -> Details
//   Favorites     -> Details, Search        (+ Compare, via CompareBar)
//   Notifications -> Details, Filter
//   Profile       -> Admin, AddListing, Search
//   Admin         -> AddListing
var FLOWS = [
  // Auth. Login and Register do not call navigate('Home') -- AuthContext
  // swaps the navigator once Firebase signs in -- but that IS what the user
  // experiences, so the prototype models it.
  ['Landing', 'Button / Get started', 'Register'],
  ['Landing', 'Button / Log in', 'Login'],
  ['Login', 'Button / Log in', 'Home'],
  ['Login', 'Create an account', 'Register'],
  ['Register', 'Button / Create account', 'Home'],
  ['Register', 'Log in', 'Login'],

  // Home
  ['Home', 'Search entry', 'Search'],
  ['Home', 'Saved', 'Favorites'],
  ['Home', 'Alerts', 'Notifications'],

  // Search
  ['Search', 'Pill / Filter', 'Filter'],
  ['Search', 'Pill / Map', 'Map'],
  ['Search', 'Settings', 'Profile'],
  ["Search", "PropertyCard / Student's Nest", 'Details'],
  ['Search', 'PropertyCard / Greenview Dormitory', 'Details'],

  // Filter returns to the list it was opened from.
  ['Filter', 'Button / Apply 2 filters', 'Search'],
  ['Filter', 'Button / Reset', 'Search'],

  // Details
  ['Details', 'Button / Get directions', 'Navigation'],
  ['Details', 'Button / Compare', 'Compare'],
  ['Details', 'Reviews', 'Reviews'],

  // Map, Compare, Saved, Alerts
  ['Map', "PropertyCard / Student's Nest", 'Details'],
  ['Compare', 'Column', 'Details'],
  ['Favorites', "PropertyCard / Student's Nest", 'Details'],
  ['Notifications', 'Alert', 'Details'],

  // Profile / admin
  ['Profile', 'Row / Admin panel', 'Admin'],
  ['Profile', 'Row / Add a listing', 'AddListing'],
  ['Profile', 'Button / Log out', 'Landing'],
  ['Admin', 'Button / Add a new listing', 'AddListing'],
  ['AddListing', 'Button / Publish listing', 'Admin'],
];

// The bottom tab bar reaches five screens from any tabbed screen. Wiring this
// by hand for every combination would be 25 near-identical lines, so it is
// generated instead.
var TABBED = ['Home', 'Search', 'Map', 'Favorites', 'Profile'];
var TAB_SLOTS = ['Tab / Home', 'Tab / Search', 'Tab / Map', 'Tab / Saved', 'Tab / Profile'];

async function wire(fromNode, toNode) {
  var reaction = {
    trigger: { type: 'ON_CLICK' },
    action: {
      type: 'NODE',
      destinationId: toNode.id,
      navigation: 'NAVIGATE',
      transition: {
        type: 'SMART_ANIMATE',
        easing: { type: 'EASE_OUT' },
        duration: 0.3,
      },
      preserveScrollPosition: false,
    },
  };

  // Figma moved reactions behind an async setter. Try the modern API first and
  // fall back, so the plugin works on older desktop builds too.
  if (typeof fromNode.setReactionsAsync === 'function') {
    await fromNode.setReactionsAsync([reaction]);
  } else {
    fromNode.reactions = [reaction];
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Every font used must be loaded before any text node is created, or
  // createText throws.
  // Figma's own names for weights do not match the names used in CSS or in
  // React Native. Inter's semibold is "Semi Bold" WITH A SPACE in Figma, so
  // asking for "SemiBold" throws -- and the old error message then blamed the
  // network, which sent people looking in entirely the wrong place.
  //
  // Rather than guess, ask Figma what it actually has and match against that.
  var index = {};
  try {
    var availableFonts = await figma.listAvailableFontsAsync();
    for (var a = 0; a < availableFonts.length; a += 1) {
      var fam = availableFonts[a].fontName.family;
      if (!index[fam]) index[fam] = [];
      index[fam].push(availableFonts[a].fontName.style);
    }
  } catch (e) {
    figma.closePlugin('Could not read the font list from Figma. Try restarting the app.');
    return;
  }

  // Styles that mean the same weight, in the order we would rather have them.
  var STYLE_ALIASES = {
    Bold: ['Bold', 'SemiBold', 'Semi Bold', 'ExtraBold', 'Extra Bold', 'Medium', 'Regular'],
    SemiBold: ['SemiBold', 'Semi Bold', 'Demi Bold', 'DemiBold', 'Bold', 'Medium', 'Regular'],
    Medium: ['Medium', 'Regular', 'SemiBold', 'Semi Bold', 'Book'],
    Regular: ['Regular', 'Book', 'Normal', 'Medium'],
  };

  // Families to fall back to, in order, if the one we want is not installed.
  var FAMILY_FALLBACKS = ['Inter', 'Roboto', 'Helvetica Neue', 'Arial', 'Sans Serif'];

  function resolveFont(family, style) {
    var candidateFamilies = [family].concat(FAMILY_FALLBACKS);
    var candidateStyles = STYLE_ALIASES[style] || [style, 'Regular'];

    for (var fi = 0; fi < candidateFamilies.length; fi += 1) {
      var f = candidateFamilies[fi];
      if (!index[f]) continue;
      for (var si = 0; si < candidateStyles.length; si += 1) {
        if (index[f].indexOf(candidateStyles[si]) >= 0) {
          return { family: f, style: candidateStyles[si] };
        }
      }
      // Family exists but none of the preferred weights do -- take its first.
      if (index[f].length > 0) {
        return { family: f, style: index[f][0] };
      }
    }
    return null;
  }

  // Rewrite each type role to a font that genuinely exists, then load it.
  var substituted = [];
  var roles = Object.keys(TYPE);
  var toLoad = [];

  for (var r = 0; r < roles.length; r += 1) {
    var spec = TYPE[roles[r]];
    var resolved = resolveFont(spec.family, spec.style);
    if (!resolved) {
      figma.closePlugin('No usable font found at all. This should not happen — report it.');
      return;
    }
    if (resolved.family !== spec.family) {
      substituted.push(spec.family + ' → ' + resolved.family);
    }
    spec.family = resolved.family;
    spec.style = resolved.style;

    var alreadyQueued = false;
    for (var q = 0; q < toLoad.length; q += 1) {
      if (toLoad[q].family === resolved.family && toLoad[q].style === resolved.style) {
        alreadyQueued = true;
        break;
      }
    }
    if (!alreadyQueued) toLoad.push(resolved);
  }

  try {
    for (var i = 0; i < toLoad.length; i += 1) {
      await figma.loadFontAsync(toLoad[i]);
    }
  } catch (e) {
    figma.closePlugin(
      'Figma listed ' + toLoad[0].family + ' but then refused to load it. ' +
        'Check your internet connection and run this again.'
    );
    return;
  }

  // Remember any substitution so it can be reported at the end rather than
  // silently producing a file in the wrong typeface.
  var fontNote = '';
  if (substituted.length > 0) {
    var unique = [];
    for (var u = 0; u < substituted.length; u += 1) {
      if (unique.indexOf(substituted[u]) < 0) unique.push(substituted[u]);
    }
    fontNote =
      ' NOTE: ' + unique.join(', ') +
      ' — install the real font in Figma and run this again to match the app exactly.';
  }

  var order = [
    'Landing', 'Login', 'Register', 'Home', 'Search', 'Filter',
    'Details', 'Map', 'Navigation', 'Compare', 'Reviews', 'Favorites',
    'Notifications', 'Profile', 'Admin', 'AddListing',
  ];

  var page = figma.currentPage;
  var ROW_H = H + 80;

  // Build the same sixteen screens twice, once per theme. Laid out 6 across so
  // the whole app fits on one screenful when zoomed to fit, with the dark set
  // below the light one rather than interleaved -- they are two versions of
  // one app, not thirty-two unrelated frames.
  function buildSet(dark, yOffset, suffix) {
    applyTheme(dark);
    var built = {};
    for (var n = 0; n < order.length; n += 1) {
      var key = order[n];
      var node = BUILDERS[key]();
      node.name = node.name + suffix;
      node.x = (n % 6) * (W + 60);
      node.y = yOffset + Math.floor(n / 6) * ROW_H;
      page.appendChild(node);
      built[key] = node;
    }
    return built;
  }

  var made = buildSet(false, 0, '');
  var madeDark = buildSet(true, 3 * ROW_H + 120, '  ·  dark');

  // Named-element links. Attaching the reaction to a specific child rather
  // than to the whole frame is what lets one screen have several destinations
  // -- a frame can only carry one click reaction.
  //
  // Run once per theme, and only within a set: a tap in the light prototype
  // must never jump you into the dark one.
  var wired = 0;
  var missed = [];

  async function wireSet(map) {
    for (var k = 0; k < FLOWS.length; k += 1) {
      var fromScreen = map[FLOWS[k][0]];
      var nodeName = FLOWS[k][1];
      var toScreen = map[FLOWS[k][2]];
      if (!fromScreen || !toScreen) continue;

      /* eslint-disable no-loop-func */
      var wantedName = nodeName;
      var trigger = wantedName
        ? fromScreen.findOne(function (candidate) {
            return candidate.name === wantedName;
          })
        : fromScreen;
      /* eslint-enable no-loop-func */

      if (trigger) {
        await wire(trigger, toScreen);
        wired += 1;
      } else {
        // Say which link could not be made rather than silently producing a
        // prototype with dead spots in it.
        missed.push(FLOWS[k][0] + ' → ' + toScreen.name + ' (no "' + wantedName + '")');
      }
    }

    // Tab bar: every tabbed screen reaches all five tabs.
    for (var a = 0; a < TABBED.length; a += 1) {
      var host = map[TABBED[a]];
      if (!host) continue;
      for (var b = 0; b < TAB_SLOTS.length; b += 1) {
        if (a === b) continue; // the tab you are already on
        var destination = map[TABBED[b]];
        if (!destination) continue;
        /* eslint-disable no-loop-func */
        var slotName = TAB_SLOTS[b];
        var slot = host.findOne(function (candidate) {
          return candidate.name === slotName;
        });
        /* eslint-enable no-loop-func */
        if (slot) {
          await wire(slot, destination);
          wired += 1;
        }
      }
    }
  }

  await wireSet(made);
  await wireSet(madeDark);

  // Landing is where a prototype run should begin.
  if (made.Landing) made.Landing.name = '01 Landing  ▶ START';
  if (madeDark.Landing) madeDark.Landing.name = '01 Landing  ·  dark  ▶ START';

  figma.viewport.scrollAndZoomIntoView(
    Object.keys(made).map(function (k2) { return made[k2]; })
      .concat(Object.keys(madeDark).map(function (k3) { return madeDark[k3]; }))
  );

  var summary = 'BoardEase: 32 frames (16 light + 16 dark), ' + wired + ' links. Press ▶ to run it.' + fontNote;
  if (missed.length > 0) {
    summary += ' Could not link: ' + missed.join('; ');
  }
  figma.closePlugin(summary);
}

main();
