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
// Figma must be able to download Plus Jakarta Sans and Inter (both are free
// Google fonts). If it cannot, the plugin says so instead of failing silently.

// ---------------------------------------------------------------------------
// Tokens (mirrored from src/theme.ts)
// ---------------------------------------------------------------------------

var C = {
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
};

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

  var photo = chip(W - GUTTER * 2 - SP.xs * 2, 168, C.canvasAlt, R.md);
  c.appendChild(photo);

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
  for (var i = 0; i < nodes.length; i += 1) wrap.appendChild(nodes[i]);
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
      field('Confirm password', 'Type it again'),
      button('Create account', 'primary'),
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
    empty.appendChild(label('Listings you open will show up here, and stay readable offline.', 'caption', C.inkFaint, { width: 240 }));

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
    hs.appendChild(label('Boarding houses', 'micro', C.brand, { uppercase: true }));
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
    f.appendChild(chip(W, 300, C.canvasAlt, 0));

    var actions = box({ name: 'Actions', horizontal: true, gap: SP.xs });
    actions.layoutAlign = 'STRETCH';
    var b1 = button('Get directions', 'primary');
    b1.layoutGrow = 1;
    actions.appendChild(b1);
    actions.appendChild(button('Compare', 'secondary'));

    var about = card('About');
    about.layoutAlign = 'STRETCH';
    about.appendChild(label('ABOUT THIS PLACE', 'micro', C.inkSoft));
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
      label('Reviews', 'heading', C.ink),
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
    var mapArea = box({ name: 'Map canvas', grow: true, fill: C.canvasAlt, padX: SP.xl, padY: SP.xl, gap: SP.lg });
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
    c.appendChild(chip(92, 92, C.canvasAlt, R.md));
    var cv = box({ name: 'Text', gap: 3 });
    cv.layoutGrow = 1;
    cv.appendChild(label("Student's Nest", 'captionStrong', C.ink));
    cv.appendChild(label('Visayan Village, Tagum City', 'micro', C.inkFaint));
    cv.appendChild(label('Distance unavailable · Shared', 'micro', C.inkFaint));
    cv.appendChild(label('₱2,100 /mo', 'bodyStrong', C.brand));
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

    f.appendChild(chip(W, 400, C.canvasAlt, 0));

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
      headCell.appendChild(chip(134, 44, C.canvasAlt, R.sm));
      headCell.appendChild(label(cols[c2].name, 'captionStrong', C.ink, { width: 130 }));
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
    ]);
    f.appendChild(spacer(200));
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

    section(f, [alertCard]);
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
    pr2.appendChild(chip(60, 60, C.canvasAlt, R.sm));
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

    section(f, [tabs, button('Add a new listing', 'primary'), pending]);
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
  var fonts = [
    { family: 'Plus Jakarta Sans', style: 'Bold' },
    { family: 'Plus Jakarta Sans', style: 'SemiBold' },
    { family: 'Inter', style: 'Regular' },
    { family: 'Inter', style: 'Medium' },
    { family: 'Inter', style: 'SemiBold' },
  ];

  try {
    for (var i = 0; i < fonts.length; i += 1) {
      await figma.loadFontAsync(fonts[i]);
    }
  } catch (e) {
    figma.closePlugin(
      'Could not load Plus Jakarta Sans or Inter. Both are free Google fonts — ' +
        'open Figma in the desktop app with an internet connection and run this again.'
    );
    return;
  }

  var order = [
    'Landing', 'Login', 'Register', 'Home', 'Search', 'Filter',
    'Details', 'Map', 'Navigation', 'Compare', 'Reviews', 'Favorites',
    'Notifications', 'Profile', 'Admin', 'AddListing',
  ];

  var made = {};
  var page = figma.currentPage;

  // Laid out 6 across, so the whole app fits on one screenful when zoomed to
  // fit rather than running off in a single long row.
  for (var n = 0; n < order.length; n += 1) {
    var key = order[n];
    var node = BUILDERS[key]();
    node.x = (n % 6) * (W + 60);
    node.y = Math.floor(n / 6) * (H + 80);
    page.appendChild(node);
    made[key] = node;
  }

  // Named-element links. Attaching the reaction to a specific child rather
  // than to the whole frame is what lets one screen have several destinations
  // -- a frame can only carry one click reaction.
  var wired = 0;
  var missed = [];
  for (var k = 0; k < FLOWS.length; k += 1) {
    var fromScreen = made[FLOWS[k][0]];
    var nodeName = FLOWS[k][1];
    var toScreen = made[FLOWS[k][2]];
    if (!fromScreen || !toScreen) continue;

    var trigger = nodeName
      ? fromScreen.findOne(function (candidate) {
          return candidate.name === nodeName;
        })
      : fromScreen;

    if (trigger) {
      await wire(trigger, toScreen);
      wired += 1;
    } else {
      // Say which link could not be made rather than silently producing a
      // prototype with dead spots in it.
      missed.push(FLOWS[k][0] + ' → ' + toScreen.name + ' (no "' + nodeName + '")');
    }
  }

  // Tab bar: every tabbed screen reaches all five tabs.
  for (var a = 0; a < TABBED.length; a += 1) {
    var host = made[TABBED[a]];
    if (!host) continue;
    for (var b = 0; b < TAB_SLOTS.length; b += 1) {
      if (a === b) continue; // the tab you are already on
      var destination = made[TABBED[b]];
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

  // Landing is where a prototype run should begin.
  if (made.Landing) {
    made.Landing.name = '01 Landing  ▶ START';
  }

  figma.viewport.scrollAndZoomIntoView(Object.keys(made).map(function (k2) { return made[k2]; }));

  var summary = 'BoardEase: 16 screens, ' + wired + ' links. Press ▶ to run it.';
  if (missed.length > 0) {
    summary += ' Could not link: ' + missed.join('; ');
  }
  figma.closePlugin(summary);
}

main();
