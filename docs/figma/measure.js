// Computes the geometry the Figma plugin will produce, without opening Figma.
//
// This exists because the first version of the plugin looked fine in code and
// came out collapsed on the canvas -- every card shrunk to the width of its own
// text. Link-checking (verify.js) could not catch that, because the links were
// all correct; the boxes were just the wrong size.
//
// It implements the subset of Figma auto-layout the plugin actually uses:
// vertical and horizontal stacks, padding, item spacing, layoutAlign STRETCH
// and layoutGrow. Text width is estimated from the character count, which is
// rough but good enough to tell 340px from 80px.
//
//   node docs/figma/measure.js          # summary + any failures
//   node docs/figma/measure.js --tree   # full geometry of every screen

const fs = require('fs');
const path = require('path');

let idSeq = 0;
const SCREEN_W = 390;
const SCREEN_H = 844;

function makeNode(type) {
  return {
    id: 'n' + (idSeq += 1),
    type,
    name: type,
    children: [],
    reactions: [],
    fills: [],
    strokes: [],
    effects: [],
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    characters: '',
    fontSize: 15,
    lineHeight: { value: 20, unit: 'PIXELS' },
    layoutMode: 'NONE',
    layoutAlign: 'INHERIT',
    layoutGrow: 0,
    itemSpacing: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'AUTO',
    textAutoResize: 'WIDTH_AND_HEIGHT',
    appendChild(child) { this.children.push(child); child.parent = this; },
    resize(w, h) { this.width = w; this.height = h; this.explicitW = w; this.explicitH = h; },
    findOne(pred) {
      const walk = (n) => {
        for (const c of n.children) {
          if (pred(c)) return c;
          const f = walk(c);
          if (f) return f;
        }
        return null;
      };
      return walk(this);
    },
    setReactionsAsync(r) { this.reactions = r; return Promise.resolve(); },
  };
}

global.figma = {
  createFrame: () => makeNode('FRAME'),
  createText: () => makeNode('TEXT'),
  createRectangle: () => makeNode('RECTANGLE'),
  listAvailableFontsAsync: () => Promise.resolve([
    { fontName: { family: 'Inter', style: 'Regular' } },
    { fontName: { family: 'Inter', style: 'Medium' } },
    { fontName: { family: 'Inter', style: 'Semi Bold' } },
    { fontName: { family: 'Inter', style: 'Bold' } },
    { fontName: { family: 'Plus Jakarta Sans', style: 'SemiBold' } },
    { fontName: { family: 'Plus Jakarta Sans', style: 'Bold' } },
  ]),
  loadFontAsync: () => Promise.resolve(),
  currentPage: makeNode('PAGE'),
  viewport: { scrollAndZoomIntoView: () => {} },
  closePlugin: () => {},
};

eval(fs.readFileSync(path.join(__dirname, 'code.js'), 'utf8')); // eslint-disable-line no-eval

// --- layout -----------------------------------------------------------------

// Rough advance width per character at a given size. Inter averages close to
// 0.52em across mixed-case text; good enough to distinguish a collapsed box
// from a stretched one.
function textWidth(node) {
  return Math.max(8, node.characters.length * node.fontSize * 0.52);
}

function textHeight(node, width) {
  const per = node.lineHeight && node.lineHeight.value ? node.lineHeight.value : node.fontSize * 1.4;
  const perLine = Math.max(1, Math.floor(width / (node.fontSize * 0.52)));
  const lines = Math.max(1, Math.ceil(node.characters.length / perLine));
  return per * lines;
}

// Pass 1: intrinsic size (how big a node wants to be), bottom-up.
function intrinsic(node) {
  if (node.type === 'TEXT') {
    node.width = node.explicitW || textWidth(node);
    node.height = textHeight(node, node.width);
    return;
  }
  if (node.type === 'RECTANGLE') return; // already resized explicitly

  node.children.forEach(intrinsic);

  if (node.layoutMode === 'NONE') {
    node.width = node.explicitW || node.width;
    node.height = node.explicitH || node.height;
    return;
  }

  const vertical = node.layoutMode === 'VERTICAL';
  const padX = node.paddingLeft + node.paddingRight;
  const padY = node.paddingTop + node.paddingBottom;
  const gaps = Math.max(0, node.children.length - 1) * node.itemSpacing;

  const sumW = node.children.reduce((t, c) => t + c.width, 0) + (vertical ? 0 : gaps);
  const sumH = node.children.reduce((t, c) => t + c.height, 0) + (vertical ? gaps : 0);
  const maxW = node.children.reduce((m, c) => Math.max(m, c.width), 0);
  const maxH = node.children.reduce((m, c) => Math.max(m, c.height), 0);

  const wantW = vertical ? maxW + padX : sumW + padX;
  const wantH = vertical ? sumH + padY : maxH + padY;

  const counterFixed = vertical
    ? node.counterAxisSizingMode === 'FIXED'
    : node.primaryAxisSizingMode === 'FIXED';
  const primaryFixed = vertical
    ? node.primaryAxisSizingMode === 'FIXED'
    : node.counterAxisSizingMode === 'FIXED';

  node.width = counterFixed && node.explicitW ? node.explicitW : wantW;
  node.height = primaryFixed && node.explicitH ? node.explicitH : wantH;
}

// Pass 2: give stretched children the parent's width, then place everything.
function place(node, originX, originY) {
  node.x = originX;
  node.y = originY;
  if (node.layoutMode === 'NONE' || node.children.length === 0) return;

  const vertical = node.layoutMode === 'VERTICAL';
  const innerW = node.width - node.paddingLeft - node.paddingRight;
  const innerH = node.height - node.paddingTop - node.paddingBottom;

  // STRETCH fills the counter axis.
  node.children.forEach((c) => {
    if (c.layoutAlign === 'STRETCH') {
      if (vertical) {
        c.width = innerW;
        if (c.type === 'TEXT') c.height = textHeight(c, c.width);
      } else {
        c.height = innerH;
      }
      if (c.layoutMode !== 'NONE') { intrinsicWithWidth(c); }
    }
  });

  // GROW shares the leftover primary-axis space.
  const growers = node.children.filter((c) => c.layoutGrow === 1);
  if (growers.length > 0) {
    const gaps = Math.max(0, node.children.length - 1) * node.itemSpacing;
    const used = node.children.reduce((t, c) => t + (c.layoutGrow === 1 ? 0 : (vertical ? c.height : c.width)), 0);
    const free = Math.max(0, (vertical ? innerH : innerW) - used - gaps);
    const each = free / growers.length;
    growers.forEach((c) => {
      if (vertical) { c.height = each; } else {
        c.width = each;
        if (c.type === 'TEXT') c.height = textHeight(c, c.width);
        if (c.layoutMode !== 'NONE') intrinsicWithWidth(c);
      }
    });
  }

  let cursor = vertical ? node.paddingTop : node.paddingLeft;
  node.children.forEach((c) => {
    const cx = vertical ? node.paddingLeft : cursor;
    const cy = vertical ? cursor : node.paddingTop;
    place(c, node.x + cx, node.y + cy);
    cursor += (vertical ? c.height : c.width) + node.itemSpacing;
  });
}

// Recompute a subtree's height after its width was forced by STRETCH/GROW.
function intrinsicWithWidth(node) {
  const w = node.width;
  node.children.forEach((c) => {
    if (c.layoutAlign === 'STRETCH' && node.layoutMode === 'VERTICAL') {
      c.width = w - node.paddingLeft - node.paddingRight;
      if (c.type === 'TEXT') c.height = textHeight(c, c.width);
      if (c.layoutMode !== 'NONE') intrinsicWithWidth(c);
    }
  });
  if (node.layoutMode === 'VERTICAL' && node.primaryAxisSizingMode !== 'FIXED') {
    const gaps = Math.max(0, node.children.length - 1) * node.itemSpacing;
    node.height = node.children.reduce((t, c) => t + c.height, 0) + gaps + node.paddingTop + node.paddingBottom;
  }
  node.width = w;
}

// --- run --------------------------------------------------------------------

setTimeout(() => {
  const frames = global.figma.currentPage.children;
  frames.forEach((f) => { intrinsic(f); place(f, 0, 0); });

  const showTree = process.argv.indexOf('--tree') >= 0;
  const problems = [];

  frames.forEach((f) => {
    // How much of the frame's height is actually used by content?
    let lowest = 0;
    const walk = (n) => {
      lowest = Math.max(lowest, n.y + n.height);
      n.children.forEach(walk);
    };
    walk(f);
    const fill = Math.round((lowest / SCREEN_H) * 100);

    // Widest full-width element -- a card or button should reach ~358px
    // (390 minus two 16px gutters).
    let widest = 0;
    const walkW = (n) => {
      if (/^(Card|PropertyCard|Button|Input|Section|Row \/|Alert|Search entry|Saved|Alerts|Summary|Pending|Table)/.test(n.name)) {
        widest = Math.max(widest, n.width);
      }
      n.children.forEach(walkW);
    };
    walkW(f);

    if (showTree) {
      console.log('\n=== ' + f.name + ' ===');
      const dump = (n, d) => {
        if (d > 3) return;
        console.log('  '.repeat(d) + n.name.slice(0, 30).padEnd(32) +
          Math.round(n.width) + ' x ' + Math.round(n.height) +
          '  @ ' + Math.round(n.x) + ',' + Math.round(n.y));
        n.children.forEach((c) => dump(c, d + 1));
      };
      dump(f, 0);
    }

    const row = f.name.padEnd(22) + 'content fills ' + String(fill).padStart(3) +
      '%   widest block ' + String(Math.round(widest)).padStart(3) + 'px';
    console.log(row);

    if (widest > 0 && widest < 300) {
      problems.push(f.name + ': widest block is only ' + Math.round(widest) + 'px (expected ~358)');
    }
    if (fill < 35) {
      problems.push(f.name + ': content fills only ' + fill + '% of the frame');
    }
  });

  console.log('\n' + '='.repeat(60));
  if (problems.length === 0) {
    console.log('PASS — every screen is filled and full-width blocks reach the gutters');
  } else {
    console.log('FAIL — ' + problems.length + ' problem(s):');
    problems.forEach((p) => console.log('  • ' + p));
    process.exitCode = 1;
  }
}, 500);
