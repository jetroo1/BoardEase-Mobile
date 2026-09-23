// Renders what the Figma plugin will produce to a PNG, so it can be LOOKED AT
// before anyone opens Figma.
//
// The first two versions of this plugin shipped broken because the only checks
// were "do the links resolve" and "is the geometry plausible". Both passed
// while the canvas came out sparse and wrong. A picture is the only check that
// actually answers "does this look like the app".
//
// No dependencies: layout is computed here, and the PNG is encoded with
// node:zlib. Text is drawn as a bar at its real size and colour rather than as
// glyphs -- enough to judge density, hierarchy and alignment, which is what
// goes wrong.
//
//   node docs/figma/render.js            # writes preview.png
//   node docs/figma/render.js out.png

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SCREEN_W = 390;
const SCREEN_H = 844;
const SCALE = 0.5; // half size keeps the contact sheet manageable
const COLS = 6;
const PAD = 24;

// --- Figma API stub ---------------------------------------------------------

function makeNode(type) {
  return {
    type, name: type, children: [], reactions: [],
    fills: [], strokes: [], effects: [],
    width: 0, height: 0, x: 0, y: 0,
    characters: '', fontSize: 15, lineHeight: { value: 20, unit: 'PIXELS' },
    layoutMode: 'NONE', layoutAlign: 'INHERIT', layoutGrow: 0,
    itemSpacing: 0, cornerRadius: 0,
    paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0,
    primaryAxisSizingMode: 'AUTO', counterAxisSizingMode: 'AUTO',
    textAutoResize: 'WIDTH_AND_HEIGHT',
    appendChild(c) { this.children.push(c); c.parent = this; },
    resize(w, h) { this.width = w; this.height = h; this.explicitW = w; this.explicitH = h; },
    findOne(p) {
      const walk = (n) => {
        for (const c of n.children) { if (p(c)) return c; const f = walk(c); if (f) return f; }
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

const CHAR_W = 0.52;

function textW(n) { return Math.max(6, n.characters.length * n.fontSize * CHAR_W); }
function lineH(n) { return n.lineHeight && n.lineHeight.value ? n.lineHeight.value : n.fontSize * 1.4; }
function textH(n, w) {
  const per = Math.max(1, Math.floor(w / (n.fontSize * CHAR_W)));
  return lineH(n) * Math.max(1, Math.ceil(n.characters.length / per));
}

function intrinsic(n) {
  if (n.type === 'TEXT') { n.width = n.explicitW || textW(n); n.height = textH(n, n.width); return; }
  if (n.type === 'RECTANGLE') return;
  n.children.forEach(intrinsic);
  if (n.layoutMode === 'NONE') { n.width = n.explicitW || n.width; n.height = n.explicitH || n.height; return; }

  const vert = n.layoutMode === 'VERTICAL';
  const padX = n.paddingLeft + n.paddingRight;
  const padY = n.paddingTop + n.paddingBottom;
  const gaps = Math.max(0, n.children.length - 1) * n.itemSpacing;
  const sumW = n.children.reduce((t, c) => t + c.width, 0) + (vert ? 0 : gaps);
  const sumH = n.children.reduce((t, c) => t + c.height, 0) + (vert ? gaps : 0);
  const maxW = n.children.reduce((m, c) => Math.max(m, c.width), 0);
  const maxH = n.children.reduce((m, c) => Math.max(m, c.height), 0);

  const counterFixed = vert ? n.counterAxisSizingMode === 'FIXED' : n.primaryAxisSizingMode === 'FIXED';
  const primaryFixed = vert ? n.primaryAxisSizingMode === 'FIXED' : n.counterAxisSizingMode === 'FIXED';
  n.width = counterFixed && n.explicitW ? n.explicitW : (vert ? maxW + padX : sumW + padX);
  n.height = primaryFixed && n.explicitH ? n.explicitH : (vert ? sumH + padY : maxH + padY);
}

function reflow(n) {
  if (n.layoutMode === 'NONE' || n.children.length === 0) return;
  const vert = n.layoutMode === 'VERTICAL';
  const innerW = n.width - n.paddingLeft - n.paddingRight;
  const innerH = n.height - n.paddingTop - n.paddingBottom;

  n.children.forEach((c) => {
    if (c.layoutAlign === 'STRETCH') {
      if (vert) { c.width = innerW; if (c.type === 'TEXT') c.height = textH(c, c.width); }
      else { c.height = innerH; }
    }
  });

  const growers = n.children.filter((c) => c.layoutGrow === 1);
  if (growers.length) {
    const gaps = Math.max(0, n.children.length - 1) * n.itemSpacing;
    const used = n.children.reduce((t, c) => t + (c.layoutGrow === 1 ? 0 : (vert ? c.height : c.width)), 0);
    const free = Math.max(0, (vert ? innerH : innerW) - used - gaps);
    growers.forEach((c) => {
      if (vert) c.height = free / growers.length;
      else { c.width = free / growers.length; if (c.type === 'TEXT') c.height = textH(c, c.width); }
    });
  }

  n.children.forEach(reflow);

  if (vert && n.primaryAxisSizingMode !== 'FIXED') {
    const gaps = Math.max(0, n.children.length - 1) * n.itemSpacing;
    n.height = n.children.reduce((t, c) => t + c.height, 0) + gaps + n.paddingTop + n.paddingBottom;
  }
}

function place(n, ox, oy) {
  n.x = ox; n.y = oy;
  if (n.layoutMode === 'NONE') return;
  const vert = n.layoutMode === 'VERTICAL';
  let cur = vert ? n.paddingTop : n.paddingLeft;
  n.children.forEach((c) => {
    const cx = vert ? n.paddingLeft : cur;
    const cy = vert ? cur : n.paddingTop;
    place(c, n.x + cx, n.y + cy);
    cur += (vert ? c.height : c.width) + n.itemSpacing;
  });
}

// --- raster -----------------------------------------------------------------

function Canvas(w, h) {
  const buf = Buffer.alloc(w * h * 4, 0);
  for (let i = 0; i < w * h; i += 1) { buf[i * 4 + 3] = 255; buf[i * 4] = 233; buf[i * 4 + 1] = 236; buf[i * 4 + 2] = 239; }
  return {
    w, h, buf,
    fill(x0, y0, ww, hh, rgb, alpha) {
      const a = alpha == null ? 1 : alpha;
      const xs = Math.max(0, Math.round(x0)), ys = Math.max(0, Math.round(y0));
      const xe = Math.min(w, Math.round(x0 + ww)), ye = Math.min(h, Math.round(y0 + hh));
      for (let y = ys; y < ye; y += 1) {
        for (let x = xs; x < xe; x += 1) {
          const i = (y * w + x) * 4;
          buf[i] = Math.round(buf[i] * (1 - a) + rgb[0] * a);
          buf[i + 1] = Math.round(buf[i + 1] * (1 - a) + rgb[1] * a);
          buf[i + 2] = Math.round(buf[i + 2] * (1 - a) + rgb[2] * a);
        }
      }
    },
  };
}

function rgbOf(fills) {
  if (!fills || !fills.length || fills[0].type !== 'SOLID') return null;
  const c = fills[0].color;
  return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)];
}

function paint(canvas, n, offX, offY) {
  const x = (n.x + offX) * SCALE;
  const y = (n.y + offY) * SCALE;
  const w = n.width * SCALE;
  const h = n.height * SCALE;

  if (n.type === 'TEXT') {
    const rgb = rgbOf(n.fills) || [0, 0, 0];
    // One bar per wrapped line, at the real size and colour.
    const per = Math.max(1, Math.floor(n.width / (n.fontSize * CHAR_W)));
    const lines = Math.max(1, Math.ceil(n.characters.length / per));
    for (let l = 0; l < lines; l += 1) {
      const chars = l === lines - 1 ? (n.characters.length - per * l) : per;
      const barW = Math.min(n.width, chars * n.fontSize * CHAR_W) * SCALE;
      canvas.fill(x, y + (l * lineH(n) + n.fontSize * 0.22) * SCALE, barW, n.fontSize * 0.68 * SCALE, rgb, 0.82);
    }
    return;
  }

  const rgb = rgbOf(n.fills);
  if (rgb) canvas.fill(x, y, w, h, rgb, 1);
  const stroke = rgbOf(n.strokes);
  if (stroke) {
    canvas.fill(x, y, w, 1, stroke, 1);
    canvas.fill(x, y + h - 1, w, 1, stroke, 1);
    canvas.fill(x, y, 1, h, stroke, 1);
    canvas.fill(x + w - 1, y, 1, h, stroke, 1);
  }
  n.children.forEach((c) => paint(canvas, c, offX, offY));
}

// --- PNG --------------------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function writePng(canvas, file) {
  const raw = Buffer.alloc((canvas.w * 4 + 1) * canvas.h);
  for (let y = 0; y < canvas.h; y += 1) {
    raw[y * (canvas.w * 4 + 1)] = 0;
    canvas.buf.copy(raw, y * (canvas.w * 4 + 1) + 1, y * canvas.w * 4, (y + 1) * canvas.w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(canvas.w, 0);
  ihdr.writeUInt32BE(canvas.h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]));
}

// --- run --------------------------------------------------------------------

setTimeout(() => {
  const frames = global.figma.currentPage.children;
  frames.forEach((f) => { intrinsic(f); reflow(f); place(f, 0, 0); });

  const rows = Math.ceil(frames.length / COLS);
  const cw = Math.round((SCREEN_W * SCALE) + PAD);
  const ch = Math.round((SCREEN_H * SCALE) + PAD);
  const canvas = Canvas(COLS * cw + PAD, rows * ch + PAD);

  frames.forEach((f, i) => {
    const ox = PAD + (i % COLS) * cw;
    const oy = PAD + Math.floor(i / COLS) * ch;
    // White page behind each screen so empty frames are obvious.
    canvas.fill(ox, oy, SCREEN_W * SCALE, SCREEN_H * SCALE, [255, 255, 255], 1);
    paint(canvas, f, ox / SCALE - f.x, oy / SCALE - f.y);
  });

  const out = process.argv[2] || path.join(__dirname, 'preview.png');
  writePng(canvas, out);
  console.log('wrote ' + out + '  (' + canvas.w + ' x ' + canvas.h + ')');
  frames.forEach((f) => console.log('  ' + f.name.padEnd(24) + Math.round(f.width) + ' x ' + Math.round(f.height)));
}, 500);
