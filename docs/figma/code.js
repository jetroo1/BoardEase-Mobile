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
function photo(w, h, radius, labelText) {
  var wrap = box({ name: labelText ? 'Photo / ' + labelText : 'Photo', radius: radius == null ? R.md : radius, fill: C.photoFill, align: 'CENTER', justify: 'CENTER', gap: 0 });
  wrap.resize(w, h);
  wrap.primaryAxisSizingMode = 'FIXED';
  wrap.counterAxisSizingMode = 'FIXED';
  wrap.appendChild(chip(Math.min(w * 0.55, 120), Math.max(2, h * 0.16), C.photoBand, R.sm));
  return wrap;
}

function pill(textValue, fg, bg) {
  var p = box({ name: 'Pill / ' + textValue, horizontal: true, padX: SP.xs, padY: SP.xxs, radius: R.pill, fill: bg, align: 'CENTER', gap: SP.xxs });
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
  if (withBack) row.appendChild(chip(40, 40, C.surfaceAlt, R.pill));
  var stack = box({ name: 'Titles', gap: 2 });
  stack.layoutGrow = 1;
  if (eyebrow) stack.appendChild(label(eyebrow, 'micro', C.brand, { uppercase: true }));
  stack.appendChild(label(titleText, 'title', C.ink));
  row.appendChild(stack);
  row.appendChild(chip(40, 40, C.surfaceAlt, R.pill)); // theme toggle
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
  for (var i = 0; i < names.length; i += 1) {
    var isCentre = i === 2;
    var isActive = i === activeIndex;
    var slot = box({ name: 'Tab / ' + names[i], align: 'CENTER', justify: 'CENTER', gap: 0 });
    slot.layoutGrow = 1;
    var size = isCentre ? 54 : 44;
    var fill = isCentre || isActive ? C.brand : C.canvas;
    slot.appendChild(chip(size, size, fill, R.pill));
    slot.name = 'Tab / ' + names[i];
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
    searchCard.appendChild(chip(40, 40, C.brandSoft, R.pill));
    var st = box({ name: 'Text', gap: 1 });
    st.layoutGrow = 1;
    st.appendChild(label('Browse boarding houses', 'bodyStrong', C.ink));
    st.appendChild(label('Tagum City', 'caption', C.inkFaint));
    searchCard.appendChild(st);
    searchCard.appendChild(chip(18, 18, C.canvasAlt, R.sm));

    var tiles = box({ name: 'Tiles', horizontal: true, gap: SP.sm });
    tiles.layoutAlign = 'STRETCH';
    var t1 = card('Saved');
    t1.layoutGrow = 1;
    t1.appendChild(chip(19, 19, C.brandSoft, R.sm));
    t1.appendChild(label('Saved', 'captionStrong', C.ink));
    t1.appendChild(label('Your shortlist', 'micro', C.inkFaint));
    var t2 = card('Alerts');
    t2.layoutGrow = 1;
    t2.appendChild(chip(19, 19, C.brandSoft, R.sm));
    t2.appendChild(label('Alerts', 'captionStrong', C.ink));
    t2.appendChild(label('New matches', 'micro', C.inkFaint));
    tiles.appendChild(t1);
    tiles.appendChild(t2);

    // The empty state a fresh account actually sees.
    var empty = box({ name: 'Nothing viewed yet', padX: SP.md, padY: SP.md, radius: R.lg, fill: C.canvas, border: C.line, align: 'CENTER', gap: SP.xxs });
    empty.layoutAlign = 'STRETCH';
    empty.appendChild(chip(24, 24, C.canvasAlt, R.pill));
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
    sBox.appendChild(chip(17, 17, C.canvasAlt, R.pill));
    sBox.appendChild(label('Search this map', 'body', C.inkFaint));
    search.appendChild(sBox);
    search.appendChild(chip(44, 44, C.surface, R.pill));
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
      row.appendChild(chip(22, 22, C.brand, R.pill));
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
    rh.appendChild(chip(32, 32, C.brandSoft, R.pill));
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
    status.appendChild(chip(15, 15, C.success, R.pill));
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
    alertCard.appendChild(chip(36, 36, C.brand, R.pill));
    var av = box({ name: 'Text', gap: 2 });
    av.layoutGrow = 1;
    av.appendChild(label('CityStay Rooms', 'captionStrong', C.ink));
    av.appendChild(label('New listing matches your saved filters', 'caption', C.inkSoft, { width: 220 }));
    av.appendChild(label('2 hours ago', 'micro', C.inkFaint));
    alertCard.appendChild(av);

    function alertRow(titleText, bodyText, when, unread) {
      var a = box({ name: unread ? 'Alert' : 'Alert read', horizontal: true, padX: SP.md, padY: SP.md, radius: R.lg, fill: unread ? C.brandSoft : C.surface, gap: SP.sm, shadow: true });
      a.layoutAlign = 'STRETCH';
      a.appendChild(chip(36, 36, unread ? C.brand : C.canvasAlt, R.pill));
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
    ar.appendChild(chip(52, 52, C.brandSoft, R.pill));
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
  head.appendChild(chip(28, 28, C.brandSoft, R.pill));
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
  row.appendChild(chip(36, 36, C.canvasAlt, R.sm));
  var v = box({ name: 'Text', gap: 1 });
  v.layoutGrow = 1;
  v.appendChild(label(titleText, 'captionStrong', C.ink));
  v.appendChild(label(subtitleText, 'caption', C.inkFaint, { width: 200 }));
  row.appendChild(v);
  row.appendChild(chip(16, 16, C.canvasAlt, R.sm));
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
