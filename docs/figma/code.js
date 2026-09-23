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
  var p = box({ name: 'Pill', horizontal: true, padX: SP.xs, padY: SP.xxs, radius: R.pill, fill: bg, align: 'CENTER', gap: SP.xxs });
  p.appendChild(label(textValue, 'micro', fg));
  return p;
}

function button(textValue, variant) {
  var bg = variant === 'secondary' ? C.surface : variant === 'ghost' ? null : C.brand;
  var fg = variant === 'primary' || variant == null ? C.onBrand : C.brand;
  var b = box({
    name: 'Button / ' + (variant || 'primary'),
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

var BUILDERS = {
  Landing: function () {
    var f = screen('01 Landing');
    f.appendChild(chip(W, 300, C.brand, 0));
    section(f, [
      label('BoardEase', 'display', C.ink),
      label('Find your perfect boarding house in Tagum', 'title', C.ink, { width: W - GUTTER * 2 }),
      label('Discover, compare, and get directions to safe, affordable boarding houses near your school.', 'body', C.inkSoft, { width: W - GUTTER * 2 }),
      button('Get started', 'primary'),
      button('I already have an account', 'ghost'),
    ]);
    return f;
  },

  Login: function () {
    var f = screen('02 Login');
    f.appendChild(header('Welcome back', null, true));
    section(f, [
      label('Log in to find your next boarding house.', 'body', C.inkSoft),
      field('Email', 'you@example.com'),
      field('Password', 'Your password'),
      button('Log in', 'primary'),
      label('New here? Create an account', 'caption', C.brand),
    ]);
    return f;
  },

  Register: function () {
    var f = screen('03 Register');
    f.appendChild(header('Create account', null, true));
    section(f, [
      label('Join BoardEase to start browsing.', 'body', C.inkSoft),
      field('Email', 'you@example.com'),
      field('Password', 'At least 6 characters'),
      field('Confirm password', 'Type it again'),
      button('Create account', 'primary'),
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

    var tiles = box({ name: 'Tiles', horizontal: true, gap: SP.sm });
    tiles.layoutAlign = 'STRETCH';
    var t1 = card('Saved');
    t1.layoutGrow = 1;
    t1.appendChild(label('Saved', 'captionStrong', C.ink));
    t1.appendChild(label('Your shortlist', 'micro', C.inkFaint));
    var t2 = card('Alerts');
    t2.layoutGrow = 1;
    t2.appendChild(label('Alerts', 'captionStrong', C.ink));
    t2.appendChild(label('New matches', 'micro', C.inkFaint));
    tiles.appendChild(t1);
    tiles.appendChild(t2);

    section(f, [searchCard, tiles, label('Recently viewed', 'heading', C.ink)]);
    f.appendChild(spacer(120));
    f.appendChild(tabBar(0));
    return f;
  },

  Search: function () {
    var f = screen('05 Search');
    f.appendChild(header('Search', 'Boarding houses'));
    var controls = box({ name: 'Controls', horizontal: true, gap: SP.xs });
    controls.layoutAlign = 'STRETCH';
    var seg = box({ name: 'Sort', horizontal: true, padX: SP.xxs, padY: SP.xxs, radius: R.pill, fill: C.canvasAlt, gap: SP.xxs });
    seg.layoutGrow = 1;
    seg.appendChild(pill('Recommended', C.brand, C.surface));
    seg.appendChild(pill('Nearest', C.inkFaint, C.canvasAlt));
    controls.appendChild(seg);
    controls.appendChild(pill('Filter', C.inkSoft, C.canvasAlt));

    section(f, [
      controls,
      propertyCard("Student's Nest", '₱2,100', 'Visayan Village, Tagum City', ['Shared', 'WiFi', 'Study Area'], true),
      propertyCard('Greenview Dormitory', '₱1,800', 'Magugpo East, Tagum City', ['Shared', 'WiFi', 'Kitchen'], false),
    ]);
    f.appendChild(tabBar(1));
    return f;
  },

  Filter: function () {
    var f = screen('06 Filter');
    f.appendChild(header('Filters', null, true));
    var chips = box({ name: 'Room types', horizontal: true, gap: SP.xs });
    chips.appendChild(pill('Single', C.onBrand, C.brand));
    chips.appendChild(pill('Shared', C.inkSoft, C.surface));
    chips.appendChild(pill('Studio', C.inkSoft, C.surface));

    var am = box({ name: 'Amenities', horizontal: true, gap: SP.xs });
    var list = ['WiFi', 'CR', 'Parking', 'Aircon'];
    for (var i = 0; i < list.length; i += 1) am.appendChild(pill(list[i], C.inkSoft, C.surface));

    section(f, [
      label('Budget', 'heading', C.ink),
      field('Maximum monthly rent', 'Any price'),
      label('Room type', 'heading', C.ink),
      chips,
      label('Amenities', 'heading', C.ink),
      am,
      button('Apply 2 filters', 'primary'),
    ]);
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

    var amen = box({ name: 'Amenities', horizontal: true, gap: SP.xs });
    var aList = ['Shared', 'WiFi', 'Study Area'];
    for (var i = 0; i < aList.length; i += 1) amen.appendChild(pill(aList[i], C.brand, C.brandSoft));

    section(f, [
      label("Student's Nest", 'title', C.ink),
      label('Visayan Village, Tagum City', 'caption', C.inkFaint),
      label('₱2,100', 'metric', C.brand),
      actions,
      label('What it offers', 'heading', C.ink),
      amen,
      label('Reviews', 'heading', C.ink),
    ]);
    return f;
  },

  Map: function () {
    var f = screen('08 Map');
    f.appendChild(chip(W, 560, C.canvasAlt, 0));
    section(f, [
      pill('₱2,100', C.onBrand, C.brand),
      propertyCard("Student's Nest", '₱2,100', 'Visayan Village, Tagum City', ['Shared', '450 m'], false),
    ]);
    f.appendChild(tabBar(2));
    return f;
  },

  Navigation: function () {
    var f = screen('09 Route Guide');
    var banner = box({ name: 'Banner', horizontal: true, padX: GUTTER, padY: SP.sm, fill: C.brand, gap: SP.xs, align: 'CENTER', grow: true });
    banner.layoutAlign = 'STRETCH';
    banner.appendChild(label('450 m to go', 'captionStrong', C.onBrand));
    banner.appendChild(pill('LIVE', C.onBrand, C.brandDeep));
    f.appendChild(banner);
    f.appendChild(chip(W, 420, C.canvasAlt, 0));
    section(f, [
      label("Directions to Student's Nest", 'captionStrong', C.ink),
      label('1.  Head north on Visayan Street', 'caption', C.ink),
      label('2.  Turn right onto Gazmen Road', 'caption', C.ink),
      label('3.  Your destination is on the left', 'caption', C.ink),
    ]);
    return f;
  },

  Compare: function () {
    var f = screen('10 Compare');
    f.appendChild(header('Compare', null, true));
    var table = box({ name: 'Table', horizontal: true, gap: 0 });
    table.layoutAlign = 'STRETCH';
    var labels = box({ name: 'Labels', gap: 0, fill: C.canvasAlt, width: 104 });
    var rows = ['', 'Price', 'Room type', 'Distance', 'Rating', 'WiFi'];
    for (var i = 0; i < rows.length; i += 1) {
      var cell = box({ name: 'Cell', padX: SP.sm, padY: SP.sm, width: 104 });
      cell.appendChild(label(rows[i] || ' ', 'captionStrong', C.ink));
      labels.appendChild(cell);
    }
    table.appendChild(labels);

    var colValues = [
      ["Student's Nest", '₱2,100', 'Shared', '450 m', '4.6', 'Yes'],
      ['Greenview', '₱1,800', 'Shared', '820 m', '4.2', 'Yes'],
    ];
    for (var c = 0; c < colValues.length; c += 1) {
      var col = box({ name: 'Column', gap: 0, width: 150 });
      for (var r2 = 0; r2 < colValues[c].length; r2 += 1) {
        var cc = box({ name: 'Cell', padX: SP.sm, padY: SP.sm, width: 150 });
        cc.appendChild(label(colValues[c][r2], r2 === 0 ? 'captionStrong' : 'caption', r2 === 1 ? C.brand : C.inkSoft));
        col.appendChild(cc);
      }
      table.appendChild(col);
    }
    f.appendChild(table);
    return f;
  },

  Reviews: function () {
    var f = screen('11 Reviews');
    f.appendChild(header('Reviews', null, true));
    var summary = card('Summary');
    summary.layoutMode = 'HORIZONTAL';
    summary.counterAxisAlignItems = 'CENTER';
    summary.itemSpacing = SP.md;
    summary.layoutAlign = 'STRETCH';
    summary.appendChild(label('4.6', 'display', C.ink));
    var sv = box({ name: 'Meta', gap: 2 });
    sv.layoutGrow = 1;
    sv.appendChild(label("Student's Nest", 'captionStrong', C.ink));
    sv.appendChild(label('12 reviews from tenants', 'caption', C.inkFaint));
    summary.appendChild(sv);

    var review = card('Review');
    review.layoutAlign = 'STRETCH';
    review.appendChild(label('Maria', 'captionStrong', C.ink));
    review.appendChild(label('Quiet at night and the WiFi actually works. Landlady is strict about visitors.', 'caption', C.inkSoft, { width: W - GUTTER * 2 - SP.md * 2 }));

    section(f, [summary, label('What tenants say', 'heading', C.ink), review]);
    return f;
  },

  Favorites: function () {
    var f = screen('12 Saved');
    f.appendChild(header('Saved', 'Your shortlist'));
    section(f, [
      propertyCard("Student's Nest", '₱2,100', 'Visayan Village, Tagum City', ['Shared', 'WiFi'], false),
    ]);
    f.appendChild(spacer(120));
    f.appendChild(tabBar(3));
    return f;
  },

  Notifications: function () {
    var f = screen('13 Alerts');
    f.appendChild(header('Alerts', null, true));
    var alertCard = card('Alert');
    alertCard.layoutMode = 'HORIZONTAL';
    alertCard.itemSpacing = SP.sm;
    alertCard.layoutAlign = 'STRETCH';
    alertCard.fills = solid(C.brandSoft);
    alertCard.appendChild(chip(36, 36, C.brand, R.pill));
    var av = box({ name: 'Text', gap: 2 });
    av.layoutGrow = 1;
    av.appendChild(label('CityStay Rooms', 'captionStrong', C.ink));
    av.appendChild(label('New listing matches your saved filters', 'caption', C.inkSoft));
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
    account.layoutMode = 'HORIZONTAL';
    account.counterAxisAlignItems = 'CENTER';
    account.itemSpacing = SP.sm;
    account.appendChild(chip(52, 52, C.brandSoft, R.pill));
    var pv = box({ name: 'Meta', gap: SP.xxs });
    pv.layoutGrow = 1;
    pv.appendChild(label('j.martin@umindanao.edu.ph', 'bodyStrong', C.ink));
    pv.appendChild(pill('Tenant', C.inkSoft, C.canvasAlt));
    account.appendChild(pv);

    var appearance = box({ name: 'Appearance', horizontal: true, padX: SP.xxs, padY: SP.xxs, radius: R.md, fill: C.canvasAlt, gap: SP.xxs });
    appearance.layoutAlign = 'STRETCH';
    appearance.appendChild(pill('System', C.brand, C.surface));
    appearance.appendChild(pill('Light', C.inkSoft, C.canvasAlt));
    appearance.appendChild(pill('Dark', C.inkSoft, C.canvasAlt));

    section(f, [
      account,
      label('Appearance', 'heading', C.ink),
      appearance,
      label('Alerts & permissions', 'heading', C.ink),
      label('Data', 'heading', C.ink),
      button('Log out', 'secondary'),
    ]);
    f.appendChild(spacer(80));
    f.appendChild(tabBar(4));
    return f;
  },

  Admin: function () {
    var f = screen('15 Admin panel');
    f.appendChild(header('Admin panel', null, true));
    var tabs = box({ name: 'Tabs', horizontal: true, padX: SP.xxs, padY: SP.xxs, radius: R.pill, fill: C.canvasAlt, gap: SP.xxs });
    tabs.layoutAlign = 'STRETCH';
    tabs.appendChild(pill('Pending  3', C.brand, C.surface));
    tabs.appendChild(pill('Reviews  12', C.inkFaint, C.canvasAlt));

    var pending = card('Pending listing');
    pending.layoutAlign = 'STRETCH';
    pending.appendChild(label('Sunrise Boarding House', 'captionStrong', C.ink));
    pending.appendChild(label('Visayan Village, Tagum City', 'caption', C.inkFaint));
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
    f.appendChild(header('Add listing', null, true));
    section(f, [
      label('The basics', 'heading', C.ink),
      field('Name', 'e.g. Sunrise Boarding House'),
      field('Address', 'e.g. Visayan Village, Tagum City'),
      field('Monthly rent', '2500'),
      label('Location on the map', 'heading', C.ink),
      button('Use my current location', 'secondary'),
      button('Publish listing', 'primary'),
    ]);
    return f;
  },
};

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

var FLOWS = [
  ['Landing', 'Register'],
  ['Landing', 'Login'],
  ['Login', 'Home'],
  ['Register', 'Home'],
  ['Home', 'Search'],
  ['Home', 'Favorites'],
  ['Home', 'Notifications'],
  ['Search', 'Filter'],
  ['Search', 'Details'],
  ['Search', 'Map'],
  ['Filter', 'Search'],
  ['Details', 'Navigation'],
  ['Details', 'Reviews'],
  ['Details', 'Compare'],
  ['Map', 'Details'],
  ['Favorites', 'Details'],
  ['Notifications', 'Details'],
  ['Profile', 'Admin'],
  ['Admin', 'AddListing'],
];

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

  for (var k = 0; k < FLOWS.length; k += 1) {
    var from = made[FLOWS[k][0]];
    var to = made[FLOWS[k][1]];
    if (from && to) {
      await wire(from, to);
    }
  }

  // Landing is where a prototype run should begin.
  if (made.Landing) {
    made.Landing.name = '01 Landing  ▶ START';
  }

  figma.viewport.scrollAndZoomIntoView(Object.keys(made).map(function (k2) { return made[k2]; }));
  figma.closePlugin('BoardEase: 16 screens created and linked. Press ▶ to run the prototype.');
}

main();
