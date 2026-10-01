// Converts the .drawio diagrams to SVG so they can be embedded in the Word
// document.
//
// Word cannot display a .drawio file -- it is an editable source format. Until
// now the chapters referred to the diagrams by file path, which meant anyone
// reading the document saw no diagrams at all.
//
// draw.io's own exporter is not installed on this machine, so this converts the
// geometry directly. Both formats are XML and the mapping is close: an mxCell
// vertex with an mxGeometry becomes a <rect>, <ellipse> or <polygon>, and an
// mxCell edge becomes a <path> between the two shapes it joins. Text stays real
// <text>, so it is selectable in Word and stays crisp at any zoom.
//
//   node docs/diagrams/export.js          # writes <name>.svg beside each source
//   node docs/diagrams/export.js --check  # geometry report, writes nothing

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DIR = __dirname;

// The paper is A4, 210mm x 297mm, with margins of 1.5" left and 1" elsewhere.
// A figure goes on a landscape page, so the frame it has to fit is the long
// edge less the left and right margins by the short edge less top, bottom and
// the caption line.
const PAGE_WIDTH_IN = 8.268 - 1.5 - 1;     // 5.77", portrait — too narrow for these
const LAND_W_IN = 11.693 - 1.5 - 1;        // 9.19"
const LAND_H_IN = 8.268 - 1 - 1 - 0.38;    // 5.89", after the caption

// The flowchart is about 1650px tall against roughly 850px wide. Scaled whole
// onto one page it lands near 4pt, which nobody can read; cut in two on A4 it
// still only reaches 6pt, because a landscape A4 page is shorter than Letter.
// Cut in three it matches the other diagrams. Both numbers sit in a gap where
// no shape and no decision branch is crossed: 688 falls between "Location
// available?" (ends 666) and "Read GPS and compute distances" (starts 710),
// and 1268 between "Display listings" (ends 1248) and "Opens a listing?"
// (starts 1288).
const SPLITS = {
  '06-system-flowchart.drawio': [688, 1268],
};

// --- parsing -----------------------------------------------------------------

function decode(s) {
  return String(s)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Numeric entities one rule rather than one rule each: the diagrams use
    // &#8212; and &#183; today and will use others tomorrow.
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&');
}

// A cell's value carries HTML. Turn it into lines, each keeping the size and
// colour its markup asks for.
//
// The diagrams lean on this: nearly every box is a bold heading over a smaller
// grey explanatory line. Rendering every line at the shape's own font size drew
// those grey lines a third too large, which is what pushed the admin panel's
// text outside its box.
function textLines(raw) {
  if (!raw) return { lines: [], bold: false };

  // One decode first to turn the escaped markup back into tags, then read it.
  const src = decode(raw).replace(/<br\s*\/?>/gi, '\u0001');
  const lines = [];
  let state = { size: null, colour: null, bold: false };
  const stack = [];
  let line = { text: '', size: null, colour: null, bold: false };
  let started = false;
  let anyBold = false;

  const flush = () => {
    const text = decode(line.text).trim();
    if (text) lines.push({ text, size: line.size, colour: line.colour, bold: line.bold });
    line = { text: '', size: state.size, colour: state.colour, bold: state.bold };
    started = false;
  };

  const re = /<\/?([a-z]+)([^>]*)>|\u0001|[^<\u0001]+/gi;
  let m;
  while ((m = re.exec(src)) !== null) {
    const tok = m[0];
    if (tok === '\u0001') { flush(); continue; }

    if (tok[0] !== '<') {
      if (!started) {
        line.size = state.size; line.colour = state.colour; line.bold = state.bold;
        started = true;
      }
      line.text += tok;
      continue;
    }

    if (tok[1] === '/') {
      const prev = stack.pop();
      if (prev) state = prev;
      continue;
    }

    stack.push(state);
    const name = m[1].toLowerCase();
    const attrs = m[2] || '';
    if (name === 'b' || name === 'strong') {
      state = { size: state.size, colour: state.colour, bold: true };
      anyBold = true;
    } else {
      const col = attrs.match(/color="([^"]+)"/i) || attrs.match(/color:\s*([#\w]+)/i);
      const sz = attrs.match(/font-size:\s*([\d.]+)px/i);
      const weight = /font-weight:\s*(bold|[6-9]00)/i.test(attrs);
      if (weight) anyBold = true;
      state = {
        size: sz ? Number(sz[1]) : state.size,
        colour: col ? col[1] : state.colour,
        bold: weight || state.bold,
      };
    }
  }
  flush();

  return { lines, bold: anyBold };
}

// Arial has no single character width, but for deciding where to break a line
// an average is close enough: the diagrams use short labels and each shape has
// padding either side. Slightly over-estimating is the safe direction -- it
// breaks a line early rather than letting text run past the border.
function textWidth(s, size, bold) {
  return s.length * size * (bold ? 0.58 : 0.53);
}

// draw.io wraps the label of any shape styled whiteSpace=wrap. Without this the
// long explanatory notes run straight off the right edge of their box.
function wrap(lines, maxWidth, size, bold) {
  if (!(maxWidth > 0)) return lines;
  const out = [];
  lines.forEach((line) => {
    if (textWidth(line, size, bold) <= maxWidth) { out.push(line); return; }
    let current = '';
    line.split(' ').forEach((word) => {
      const next = current ? current + ' ' + word : word;
      if (current && textWidth(next, size, bold) > maxWidth) {
        out.push(current);
        current = word;
      } else {
        current = next;
      }
    });
    if (current) out.push(current);
  });
  return out;
}

function styleMap(style) {
  const out = {};
  String(style || '').split(';').forEach((part) => {
    if (!part) return;
    const eq = part.indexOf('=');
    if (eq < 0) { out[part] = true; return; }
    out[part.slice(0, eq)] = part.slice(eq + 1);
  });
  return out;
}

function parse(file) {
  const xml = fs.readFileSync(file, 'utf8');

  const page = {
    w: Number((xml.match(/pageWidth="(\d+)"/) || [])[1] || 1100),
    h: Number((xml.match(/pageHeight="(\d+)"/) || [])[1] || 850),
  };

  const cells = [];
  // Each mxCell is either self-closing or wraps an mxGeometry.
  const re = /<mxCell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/mxCell>)/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const attrs = m[1];
    const inner = m[2] || '';
    const attr = (n) => {
      const a = attrs.match(new RegExp(n + '="([^"]*)"'));
      return a ? a[1] : null;
    };
    const geo = inner.match(/<mxGeometry\b([^>]*)/);
    const g = geo ? geo[1] : '';
    const num = (n, d) => {
      const a = g.match(new RegExp(n + '="(-?[\\d.]+)"'));
      return a ? Number(a[1]) : d;
    };

    // An edge can carry fixed endpoints instead of a source/target cell -- the
    // crow's foot legend is drawn that way -- and can carry waypoints it must be
    // routed through. Ignoring the waypoints sends relationship lines straight
    // across the middle of other tables.
    const pointAs = (name) => {
      const p = inner.match(new RegExp('<mxPoint([^>]*?)as="' + name + '"'));
      if (!p) return null;
      const px = p[1].match(/x="(-?[\d.]+)"/);
      const py = p[1].match(/y="(-?[\d.]+)"/);
      return { x: px ? Number(px[1]) : 0, y: py ? Number(py[1]) : 0 };
    };
    const arr = inner.match(/<Array[^>]*as="points"[^>]*>([\s\S]*?)<\/Array>/);
    const waypoints = [];
    if (arr) {
      const pr = /<mxPoint([^>]*)\/>/g;
      let pm;
      while ((pm = pr.exec(arr[1])) !== null) {
        const px = pm[1].match(/x="(-?[\d.]+)"/);
        const py = pm[1].match(/y="(-?[\d.]+)"/);
        waypoints.push({ x: px ? Number(px[1]) : 0, y: py ? Number(py[1]) : 0 });
      }
    }

    cells.push({
      sourcePoint: pointAs('sourcePoint'),
      targetPoint: pointAs('targetPoint'),
      waypoints,
      id: attr('id'),
      parent: attr('parent'),
      value: attr('value'),
      style: styleMap(attr('style')),
      vertex: attr('vertex') === '1',
      edge: attr('edge') === '1',
      source: attr('source'),
      target: attr('target'),
      x: num('x', 0), y: num('y', 0),
      w: num('width', 0), h: num('height', 0),
      hasGeo: Boolean(geo),
    });
  }

  // Each .drawio carries its own title block so the file makes sense when
  // opened on its own. The document supplies a numbered caption under every
  // figure, so keeping the block would print the title twice -- and disagree
  // with itself, since the flowchart is one file but two captioned figures.
  const drawn = cells.filter((c) => c.id !== 'title');

  // Resolve absolute positions: a child's geometry is relative to its parent.
  const byId = {};
  cells.forEach((c) => { byId[c.id] = c; });
  cells.forEach((c) => {
    let ax = c.x, ay = c.y, p = byId[c.parent];
    const guard = new Set();
    while (p && p.vertex && !guard.has(p.id)) {
      guard.add(p.id);
      ax += p.x; ay += p.y;
      p = byId[p.parent];
    }
    c.ax = ax; c.ay = ay;
  });

  return { page, cells: drawn, byId };
}

// --- rendering ---------------------------------------------------------------

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// The draw.io page is 1100x850 but the shapes rarely fill it. Exporting the
// whole page wastes width on empty margin, and since the diagram is scaled to
// fit the paper, wasted width comes straight out of the text size. Crop to what
// is actually drawn.
function contentBox(cells, edges) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const include = (x, y) => {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  };
  cells.forEach((c) => {
    if (c.vertex && c.hasGeo && c.w > 0 && c.h > 0) {
      include(c.ax, c.ay);
      include(c.ax + c.w, c.ay + c.h);

      // An actor's name is written under its stick figure and is far wider than
      // the figure. Measuring only the shapes crops those names off the edge.
      const vlp = c.style.verticalLabelPosition;
      if (vlp !== 'bottom' && vlp !== 'top') return;
      const t = textLines(c.value);
      if (!t.lines.length) return;
      const size = Number(c.style.fontSize || 12);
      const lw = t.lines.reduce(
        (m, l) => Math.max(m, textWidth(l.text, l.size || size, l.bold)), 0);
      const cx = c.ax + c.w / 2;
      const lh = t.lines.length * size * 1.28 + 8;
      include(cx - lw / 2, vlp === 'bottom' ? c.ay + c.h + lh : c.ay - lh);
      include(cx + lw / 2, vlp === 'bottom' ? c.ay + c.h + lh : c.ay - lh);
      return;
    }
    // An edge drawn between fixed points belongs to the picture too: the
    // crow's foot legend is nothing but such edges.
    if (!c.edge) return;
    [c.sourcePoint, c.targetPoint].concat(c.waypoints || []).forEach((p) => {
      if (p) include(p.x, p.y);
    });
  });

  // Routed edges and their labels can reach past every shape.
  (edges || []).forEach((e) => {
    e.route.forEach((p) => include(p.x, p.y));
    if (!e.label) return;
    include(e.label.x - e.label.w / 2, e.label.y - e.label.size);
    include(e.label.x + e.label.w / 2, e.label.y + e.label.size * 0.4);
  });
  if (minX === Infinity) return { x: 0, y: 0, w: 1100, h: 850 };
  const pad = 16;
  return {
    x: minX - pad,
    y: minY - pad,
    w: (maxX - minX) + pad * 2,
    h: (maxY - minY) + pad * 2,
  };
}

// Walk from a shape's centre towards a point and return where the line leaves
// the shape. Without this every arrow is drawn to the centre of its target, so
// it crosses the box and the arrowhead lands on top of the label.
function edgeAnchor(cell, towardX, towardY) {
  const cx = cell.ax + cell.w / 2;
  const cy = cell.ay + cell.h / 2;
  const dx = towardX - cx;
  const dy = towardY - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };

  const kind = shapeFor(cell);
  const rx = cell.w / 2;
  const ry = cell.h / 2;

  if (kind === 'ellipse' || kind === 'actor') {
    // Scale the direction until it sits on the ellipse.
    const t = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
    return { x: cx + dx * t, y: cy + dy * t };
  }

  if (kind === 'rhombus') {
    // |x|/rx + |y|/ry = 1
    const t = 1 / (Math.abs(dx) / rx + Math.abs(dy) / ry);
    return { x: cx + dx * t, y: cy + dy * t };
  }

  // Rectangles and everything box-like: the smaller of the two axis crossings.
  const tx = dx === 0 ? Infinity : rx / Math.abs(dx);
  const ty = dy === 0 ? Infinity : ry / Math.abs(dy);
  const t = Math.min(tx, ty);
  return { x: cx + dx * t, y: cy + dy * t };
}

// draw.io lets an edge name the exact point on a shape it leaves from or
// arrives at, as a fraction of the shape's box. When a style says so, that beats
// guessing from the direction -- it is why the ER relationships leave from the
// side of a table rather than the corner nearest the target.
function fixedPoint(cell, style, prefix) {
  const fx = style[prefix + 'X'];
  const fy = style[prefix + 'Y'];
  if (fx === undefined || fy === undefined) return null;
  return {
    x: cell.ax + Number(fx) * cell.w + Number(style[prefix + 'Dx'] || 0),
    y: cell.ay + Number(fy) * cell.h + Number(style[prefix + 'Dy'] || 0),
    // Leaving through a vertical side means travelling horizontally first.
    axis: Number(fx) === 0 || Number(fx) === 1 ? 'h' : 'v',
  };
}

// Insert the right-angle corners between two points. draw.io's orthogonal and
// entity-relation edge styles never draw a diagonal; drawing one makes an ER
// diagram look hand-sketched and makes a flowchart hard to follow.
function elbow(a, b, firstAxis, lastAxis) {
  if (a.x === b.x || a.y === b.y) return [];
  if (firstAxis === 'h' && lastAxis === 'h') {
    const mx = (a.x + b.x) / 2;
    return [{ x: mx, y: a.y }, { x: mx, y: b.y }];
  }
  if (firstAxis === 'v' && lastAxis === 'v') {
    const my = (a.y + b.y) / 2;
    return [{ x: a.x, y: my }, { x: b.x, y: my }];
  }
  if (firstAxis === 'h') return [{ x: b.x, y: a.y }];
  if (firstAxis === 'v') return [{ x: a.x, y: b.y }];
  if (lastAxis === 'h') return [{ x: a.x, y: b.y }];
  return [{ x: b.x, y: a.y }];
}

function orthogonalRoute(pts, exitAxis, entryAxis) {
  const out = [pts[0]];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = out[out.length - 1];
    const b = pts[i + 1];
    const first = i === 0 ? exitAxis : null;
    const last = i === pts.length - 2 ? entryAxis : null;
    elbow(a, b, first, last).forEach((p) => out.push(p));
    out.push(b);
  }
  return out;
}

function shapeFor(c) {
  const s = c.style;
  if (s.ellipse) return 'ellipse';
  if (s.rhombus) return 'rhombus';
  if (s.shape === 'parallelogram') return 'parallelogram';
  if (s.shape === 'cylinder3' || s.shape === 'cylinder') return 'cylinder';
  if (s.shape === 'tableRow' || s.shape === 'partialRectangle') return 'row';
  if (String(s.shape || '').indexOf('actor') >= 0 || s.shape === 'umlActor') return 'actor';
  if (s.text || (!s.fillColor && !s.strokeColor && !s.swimlane && !s.rounded)) return 'text';
  return 'rect';
}

// Reduce a model to the shapes whose middle falls inside a horizontal band, and
// the edges whose two ends are both in that band. An edge that leaves the band
// is the cut itself, and the caption in the document carries the reader across.
function selectBand(model, band) {
  if (!band) return model;
  const inBand = (c) => {
    const mid = c.ay + c.h / 2;
    return mid >= band.y0 && mid < band.y1;
  };
  const kept = model.cells.filter((c) => c.vertex && c.hasGeo && c.w > 0 && inBand(c));
  const keptIds = new Set(kept.map((c) => c.id));
  const edges = model.cells.filter(
    (c) => c.edge && keptIds.has(c.source) && keptIds.has(c.target)
  );
  return { page: model.page, cells: kept.concat(edges), byId: model.byId };
}

// Work out where an edge runs and where its label sits. Separated from drawing
// because the bounding box has to know about edges too: a label sitting past the
// leftmost shape was being cropped in half.
function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Solid shapes a label must not be written on top of. Outlined containers are
// excluded: the band frames in the architecture diagram enclose everything, so
// treating them as obstacles would leave nowhere to put a label.
function solidShapes(cells) {
  return cells
    .filter((c) => c.vertex && c.hasGeo && c.w > 0 && c.h > 0)
    .filter((c) => c.style.fillColor && c.style.fillColor !== 'none')
    .map((c) => ({ x: c.ax, y: c.ay, w: c.w, h: c.h }));
}

// `placed` accumulates the labels already positioned, so a label that steps
// aside to clear a box does not land on another label that did the same.
function computeEdge(c, byId, obstacles, placed) {
  const a = byId[c.source], b = byId[c.target];

  // Route: fixed start, any waypoints, fixed end. Where an end is attached to
  // a shape, pull it back to that shape's border, aiming at whatever point
  // comes next along the route rather than at the far end -- otherwise the
  // first segment leaves from the wrong side.
  let route = (c.waypoints || []).slice();
  let start = c.sourcePoint;
  let end = c.targetPoint;
  let exitAxis = null;
  let entryAxis = null;

  if (a) {
    const fixed = fixedPoint(a, c.style, 'exit');
    if (fixed) { start = fixed; exitAxis = fixed.axis; }
    else {
      const aim = route[0] || (b ? { x: b.ax + b.w / 2, y: b.ay + b.h / 2 } : end);
      if (!aim) return null;
      start = edgeAnchor(a, aim.x, aim.y);
    }
  }
  if (b) {
    const fixed = fixedPoint(b, c.style, 'entry');
    if (fixed) { end = fixed; entryAxis = fixed.axis; }
    else {
      const aim = route[route.length - 1] || (a ? { x: a.ax + a.w / 2, y: a.ay + a.h / 2 } : start);
      if (!aim) return null;
      end = edgeAnchor(b, aim.x, aim.y);
    }
  }
  if (!start || !end) return null;

  route = [start].concat(route, [end]);

  const style = c.style.edgeStyle;
  if (style === 'orthogonalEdgeStyle' || style === 'entityRelationEdgeStyle') {
    // entityRelationEdgeStyle always leaves and arrives horizontally.
    const isER = style === 'entityRelationEdgeStyle';
    route = orthogonalRoute(route, isER ? 'h' : exitAxis, isER ? 'h' : entryAxis);
  }

  let label = null;
  const t = textLines(c.value);
  if (t.lines.length) {
    // Sit the label on the longest straight run. Using the middle segment put
    // labels on top of boxes and, on a short first hop, off the edge of the page.
    let bestI = 0, bestLen = -1;
    for (let i = 0; i < route.length - 1; i += 1) {
      const len = Math.abs(route[i + 1].x - route[i].x) + Math.abs(route[i + 1].y - route[i].y);
      if (len > bestLen) { bestLen = len; bestI = i; }
    }
    const p = route[bestI], q = route[bestI + 1];
    const size = Number(c.style.fontSize || 10);
    const text = t.lines.map((l) => l.text).join(' ');
    const w = textWidth(text, size, false);
    const h = size * 1.25;
    const vertical = p.x === q.x;
    const baseY = (p.y + q.y) / 2 +
      (vertical ? size * 0.36 : (c.style.verticalAlign === 'bottom' ? -size * 0.5 : size * 0.36));

    // Where a flow runs from one box straight into the next, the middle of the
    // run is inside a box, and the label was being written over its contents.
    // Slide along the run, then step sideways, until the label sits on paper.
    const rectAt = (x, y) => ({ x: x - w / 2 - 2, y: y - size, w: w + 4, h: h });
    const clear = (x, y) => {
      const r = rectAt(x, y);
      return !(obstacles || []).some((s) => overlaps(r, s))
        && !(placed || []).some((s) => overlaps(r, s));
    };

    const mx = (p.x + q.x) / 2;
    const along = vertical ? 0 : (q.x - p.x);
    const candidates = [{ dx: 0, dy: 0 }];
    [0.3, -0.3, 0.42, -0.42].forEach((f) => candidates.push({ dx: along * f, dy: 0 }));

    // Small nudges only help when the label is clipping a corner. When it has
    // landed squarely inside a box, step right over that box instead.
    const blocker = (obstacles || []).find((s) => overlaps(rectAt(mx, baseY), s));
    if (blocker) {
      // Just above the box, then just below it, then a line clear of each.
      candidates.push({ dx: 0, dy: (blocker.y - size * 0.5) - baseY });
      candidates.push({ dx: 0, dy: (blocker.y + blocker.h + size) - baseY });
      candidates.push({ dx: 0, dy: (blocker.y - size * 0.5 - h) - baseY });
      candidates.push({ dx: 0, dy: (blocker.y + blocker.h + size + h) - baseY });
    }
    [1, -1, 2, -2, 3, -3].forEach((k) => candidates.push({ dx: 0, dy: k * (h + 3) }));

    let picked = candidates[0];
    for (let i = 0; i < candidates.length; i += 1) {
      if (clear(mx + candidates[i].dx, baseY + candidates[i].dy)) { picked = candidates[i]; break; }
    }
    if (placed) placed.push(rectAt(mx + picked.dx, baseY + picked.dy));

    label = {
      text,
      size,
      w,
      h,
      x: mx + picked.dx,
      y: baseY + picked.dy,
      colour: c.style.fontColor || '#55697A',
    };
  }

  return { cell: c, route, label };
}

function render(model) {
  const { cells, byId } = model;
  const parts = [];
  const obstacles = solidShapes(cells);
  const placedLabels = [];
  const edges = cells.filter((c) => c.edge)
    .map((c) => computeEdge(c, byId, obstacles, placedLabels))
    .filter(Boolean);
  const box = contentBox(cells, edges);
  const W = Math.round(box.w), H = Math.round(box.h);

  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" font-family="Arial, Helvetica, sans-serif">`);
  parts.push(`<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="#FFFFFF"/>`);
  // Word's SVG support does not include context-stroke, so a marker cannot
  // inherit its line's colour. Emit one marker per colour and shape actually
  // used and reference it by name.
  //
  // orient="auto-start-reverse" would let one marker serve both ends, but it is
  // SVG 2 and Word's renderer is not guaranteed to have it -- an unsupported
  // value falls back to a fixed angle, which would leave arrowheads pointing the
  // wrong way on the printed page. Emit an explicitly reversed copy instead.
  const markers = {};
  const markerFor = (type, colour, atStart) => {
    const id = type + (atStart ? '-s-' : '-e-') + colour.replace('#', '');
    if (!markers[id]) {
      // Drawn pointing along +x, then rotated for the start of a line.
      const body = type === 'ermany'
        // Crow's foot: three strokes fanning out at the entity end.
        ? `<path d="M12,2 L2,6 M12,10 L2,6 M12,6 L2,6" fill="none" stroke="${colour}" stroke-width="1.4"/>`
        : type === 'erone'
          // A single bar across the line: "exactly one".
          ? `<path d="M9,1 L9,11" fill="none" stroke="${colour}" stroke-width="1.4"/>`
          : `<path d="M1,1 L11,6 L1,11 z" fill="${colour}"/>`;
      const inner = atStart
        ? `<g transform="rotate(180 6 6)">${body}</g>`
        : body;
      const refX = atStart ? 1 : 11;
      markers[id] = `<marker id="${id}" viewBox="0 0 12 12" refX="${refX}" refY="6" markerWidth="8" markerHeight="8" orient="auto">${inner}</marker>`;
    }
    return id;
  };

  const defsAt = parts.length;
  parts.push(''); // filled in once every edge has claimed its markers

  // Edges first so shapes sit on top of them.
  edges.forEach((e) => {
    const c = e.cell;
    const route = e.route;
    const colour = c.style.strokeColor || '#55697A';
    const dashed = c.style.dashed === '1';
    const kindOf = (arrow) =>
      arrow === 'ERmany' ? 'ermany' : arrow === 'ERone' ? 'erone' : 'arrow';

    const endArrow = c.style.endArrow;
    const startArrow = c.style.startArrow;
    const endMark = endArrow === 'none' ? '' :
      ` marker-end="url(#${markerFor(kindOf(endArrow), colour, false)})"`;
    // Crow's foot notation puts a symbol at both ends -- "one" at the parent,
    // "many" at the child. Drawing only the end turns every relationship into
    // one-to-many regardless of what it is.
    const startMark = !startArrow || startArrow === 'none' ? '' :
      ` marker-start="url(#${markerFor(kindOf(startArrow), colour, true)})"`;

    parts.push(
      `<polyline points="${route.map((p) => p.x + ',' + p.y).join(' ')}" fill="none" stroke="${colour}" stroke-width="${c.style.strokeWidth || 1.4}"` +
      (dashed ? ' stroke-dasharray="6 4"' : '') +
      endMark + startMark + '/>'
    );

  });

  parts[defsAt] = '<defs>' + Object.keys(markers).map((k) => markers[k]).join('') + '</defs>';

  // Shapes.
  cells.filter((c) => c.vertex && c.hasGeo && c.w > 0).forEach((c) => {
    const s = c.style;
    const kind = shapeFor(c);
    const fill = s.fillColor && s.fillColor !== 'none' ? s.fillColor : 'none';
    const stroke = s.strokeColor && s.strokeColor !== 'none' ? s.strokeColor : 'none';
    const sw = s.strokeWidth || 1;
    const dash = s.dashed === '1' ? ' stroke-dasharray="6 4"' : '';
    const x = c.ax, y = c.ay, w = c.w;

    // A table's declared height is whatever the author last dragged it to;
    // draw.io then sizes it to its rows. Drawing the declared height leaves a
    // block of the dark header fill hanging below the last row.
    let h = c.h;
    const startSize = s.shape === 'table' || s.swimlane ? Number(s.startSize || 0) : 0;
    if (s.shape === 'table') {
      const rows = cells.filter((k) => k.parent === c.id && k.hasGeo);
      if (rows.length) {
        h = startSize + rows.reduce((sum, r) => sum + r.h, 0);
      }
    }

    if (kind === 'ellipse') {
      parts.push(`<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash}/>`);
    } else if (kind === 'rhombus') {
      parts.push(`<polygon points="${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash}/>`);
    } else if (kind === 'parallelogram') {
      const k = w * 0.16;
      parts.push(`<polygon points="${x + k},${y} ${x + w},${y} ${x + w - k},${y + h} ${x},${y + h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash}/>`);
    } else if (kind === 'cylinder') {
      parts.push(`<rect x="${x}" y="${y + 8}" width="${w}" height="${h - 16}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`);
      parts.push(`<ellipse cx="${x + w / 2}" cy="${y + 8}" rx="${w / 2}" ry="8" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`);
      parts.push(`<ellipse cx="${x + w / 2}" cy="${y + h - 8}" rx="${w / 2}" ry="8" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`);
    } else if (kind === 'actor') {
      const cx = x + w / 2;
      parts.push(`<circle cx="${cx}" cy="${y + h * 0.16}" r="${w * 0.17}" fill="none" stroke="${stroke === 'none' ? '#0D1B26' : stroke}" stroke-width="2"/>`);
      parts.push(`<path d="M${cx},${y + h * 0.3} L${cx},${y + h * 0.62} M${x + w * 0.2},${y + h * 0.42} L${x + w * 0.8},${y + h * 0.42} M${cx},${y + h * 0.62} L${x + w * 0.24},${y + h * 0.92} M${cx},${y + h * 0.62} L${x + w * 0.76},${y + h * 0.92}" fill="none" stroke="${stroke === 'none' ? '#0D1B26' : stroke}" stroke-width="2"/>`);
    } else if (kind !== 'text') {
      const r = s.rounded === '1' ? 8 : 0;
      parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash}/>`);
    }

    // Label.
    const t = textLines(c.value);
    if (!t.lines.length) return;
    const size = Number(s.fontSize || 12);
    const colour = s.fontColor || '#0D1B26';
    const alignLeft = s.align === 'left';
    const anchor = alignLeft ? 'start' : 'middle';
    const padLeft = Number(s.spacingLeft || 6);
    const tx = alignLeft ? x + padLeft : x + w / 2;
    // Boldness comes from the shape's own style or from this line's markup --
    // never from another line's. Falling back to "was anything in this shape
    // bold?" made the whole of a heading-plus-note box bold.
    const baseBold = s.fontStyle === '1';

    // Each source line keeps its own size, colour and weight, and wrapping is
    // measured against that size rather than the shape's.
    const lines = [];
    t.lines.forEach((ln) => {
      const lsize = ln.size || size;
      const lbold = ln.bold || baseBold;
      const pieces = s.whiteSpace === 'wrap'
        ? wrap([ln.text], w - padLeft - 6, lsize, lbold)
        : [ln.text];
      pieces.forEach((text) => {
        lines.push({ text, size: lsize, bold: lbold, colour: ln.colour || colour });
      });
    });
    if (!lines.length) return;

    const heights = lines.map((l) => l.size * 1.28);
    const total = heights.reduce((a, b) => a + b, 0);

    // The band containers are drawn first so the component boxes sit on top of
    // them. Their titles use verticalAlign=top for exactly that reason -- centred
    // they would end up behind a box and be unreadable. A table's title lives in
    // its header strip, which the rows would otherwise cover.
    const centred = (mid) => mid - total / 2 + heights[0] / 2 + lines[0].size * 0.34;
    let cursor;
    if (s.verticalLabelPosition === 'bottom') {
      cursor = y + h + lines[0].size + 4;  // an actor's name, written underneath
    } else if (s.verticalLabelPosition === 'top') {
      cursor = y - total + lines[0].size - 2;
    } else if (startSize > 0) {
      cursor = centred(y + startSize / 2);
    } else if (s.verticalAlign === 'top') {
      cursor = y + Number(s.spacingTop || 6) + lines[0].size;
    } else if (s.verticalAlign === 'bottom') {
      cursor = y + h - Number(s.spacingBottom || 6) - total + lines[0].size;
    } else {
      cursor = centred(y + h / 2);
    }

    lines.forEach((ln, i) => {
      parts.push(
        `<text x="${tx}" y="${cursor}" font-size="${ln.size}" fill="${ln.colour}" text-anchor="${anchor}"` +
        (ln.bold ? ' font-weight="bold"' : '') + `>${esc(ln.text)}</text>`
      );
      cursor += heights[i];
    });
  });

  // Edge labels go last. Drawn with the edges they were half hidden behind the
  // shapes the edges run to, which is how "account record" became "ount rec".
  edges.forEach((e) => {
    const l = e.label;
    if (!l) return;
    parts.push(`<rect x="${l.x - l.w / 2 - 2}" y="${l.y - l.size * 0.85}" width="${l.w + 4}" height="${l.h}" fill="#FFFFFF" opacity="0.92"/>`);
    parts.push(`<text x="${l.x}" y="${l.y}" font-size="${l.size}" fill="${l.colour}" text-anchor="middle">${esc(l.text)}</text>`);
  });

  parts.push('</svg>');
  return parts.join('\n');
}

// --- checks ------------------------------------------------------------------

// Does any label run wider than the shape holding it, and how small will the
// smallest text be once the diagram is scaled to fit the page?
function checkDiagram(name, model) {
  const { cells, byId } = model;
  const obstacles = solidShapes(cells);
  const placedLabels = [];
  const edges = cells.filter((c) => c.edge)
    .map((c) => computeEdge(c, byId, obstacles, placedLabels))
    .filter(Boolean);
  const box = contentBox(cells, edges);
  const problems = [];
  let smallestPx = Infinity;
  const tally = {}; // font size -> how many labels use it

  cells.filter((c) => c.vertex && c.hasGeo && c.w > 0).forEach((c) => {
    const t = textLines(c.value);
    if (!t.lines.length) return;
    t.lines.forEach((l) => {
      const px = l.size || Number(c.style.fontSize || 12);
      smallestPx = Math.min(smallestPx, px);
      tally[px] = (tally[px] || 0) + 1;
    });

    // A label placed below its shape (an actor's name) is meant to be wider
    // than the shape.
    if (c.style.verticalLabelPosition === 'bottom') return;

    // Wrapping text is allowed to be wider than the shape -- it wraps. What it
    // must not do is wrap to more lines than the shape is tall, which is how the
    // admin panel's caption ended up printed above its own box.
    if (c.style.whiteSpace === 'wrap') {
      const base = Number(c.style.fontSize || 12);
      const pad = Number(c.style.spacingLeft || 6) + 6;
      let tall = 0;
      t.lines.forEach((l) => {
        const size = l.size || base;
        tall += wrap([l.text], c.w - pad, size, l.bold).length * size * 1.28;
      });
      if (tall > c.h + 4) {
        problems.push('text "' + t.lines[0].text.slice(0, 28) + '" wraps to ~' +
          Math.round(tall) + 'px in a ' + Math.round(c.h) + 'px shape');
      }
      return;
    }

    const size = Number(c.style.fontSize || 12);
    const needed = t.lines.reduce(
      (m, l) => Math.max(m, textWidth(l.text, l.size || size, l.bold)), 0);
    if (needed > c.w + 8) {
      problems.push('text "' + t.lines[0].text.slice(0, 28) + '" needs ~' + Math.round(needed) + 'px in a ' + Math.round(c.w) + 'px shape');
    }
  });

  // How small does the smallest text end up at each page orientation? Word
  // scales the picture to the frame, so this is the number that decides whether
  // the diagram is actually readable on paper. 1px CSS = 0.75pt.
  // The smallest size on its own is misleading -- in the flowchart it belongs to
  // the legend swatches, not to the diagram body. Report the size most labels
  // actually use as well.
  const bodyPx = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0];

  const scaleFor = (availW, availH) =>
    Math.min(availW * 96 / box.w, availH * 96 / box.h);
  const fit = (availW, availH, px) => px * scaleFor(availW, availH) * 0.75;

  return {
    name,
    box,
    boxW: Math.round(box.w),
    boxH: Math.round(box.h),
    smallestPx,
    bodyPx: Number(bodyPx || 12),
    // The frames build-doc.js actually places the figure in. Measuring anything
    // else would report a size the reader never sees.
    portraitPt: fit(PAGE_WIDTH_IN, 297 / 25.4 - 2, smallestPx),
    landscapePt: fit(LAND_W_IN, LAND_H_IN, smallestPx),
    landscapeBodyPt: fit(LAND_W_IN, LAND_H_IN, Number(bodyPx || 12)),
    landscapeScale: scaleFor(LAND_W_IN, LAND_H_IN),
    problems,
  };
}

// --- run ---------------------------------------------------------------------

const checkOnly = process.argv.indexOf('--check') >= 0;
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.drawio')).sort();
const manifest = [];
let warnings = 0;

// Split a source into the bands it should be drawn in. Most have exactly one.
function bandsFor(file, model) {
  const cuts = SPLITS[file];
  if (!cuts) return [null];
  const edges = [-Infinity].concat(cuts, [Infinity]);
  const out = [];
  for (let i = 0; i < edges.length - 1; i += 1) {
    out.push({ y0: edges[i], y1: edges[i + 1] });
  }
  return out;
}

files.forEach((f) => {
  const model = parse(path.join(DIR, f));
  const bands = bandsFor(f, model);
  const base = f.replace('.drawio', '');

  bands.forEach((band, i) => {
    const part = selectBand(model, band);
    const suffix = bands.length > 1 ? '-' + 'abcdefg'[i] : '';
    const out = base + suffix + '.svg';
    const report = checkDiagram(out, part);

    if (!checkOnly) {
      fs.writeFileSync(path.join(DIR, out), render(part));
    }

    const tooSmall = report.landscapePt < 6;
    if (tooSmall) warnings += 1;
    report.problems.slice(0, 3).forEach((p) => { console.log('      ' + p); warnings += 1; });

    manifest.push({
      file: out,
      source: f,
      part: bands.length > 1 ? i + 1 : null,
      partsTotal: bands.length,
      widthPx: report.boxW,
      heightPx: report.boxH,
      smallestPt: Number(report.landscapePt.toFixed(1)),
      bodyPt: Number(report.landscapeBodyPt.toFixed(1)),
    });

    console.log(
      out.replace('.svg', '').padEnd(34) +
      (report.boxW + 'x' + report.boxH).padEnd(11) +
      ' landscape: body ' + report.landscapeBodyPt.toFixed(1) + 'pt' +
      ', smallest ' + report.landscapePt.toFixed(1) + 'pt' +
      (tooSmall ? '  << STILL TOO SMALL' : '')
    );
  });
});

// Word shows the SVG, but only from Word 2016 onwards, and it wants a raster
// fallback stored beside it for anything older. Render that fallback at 3x so it
// is still sharp when printed rather than blocky.
function rasterize() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  const browser = candidates.find((p) => fs.existsSync(p));
  if (!browser) {
    console.log('no Chrome or Edge found — skipping the PNG fallbacks');
    return 0;
  }

  let made = 0;
  manifest.forEach((f) => {
    const svg = path.join(DIR, f.file);
    const png = svg.replace(/\.svg$/, '.png');
    try {
      execFileSync(browser, [
        '--headless', '--disable-gpu', '--hide-scrollbars',
        '--force-device-scale-factor=3',
        '--screenshot=' + png,
        '--window-size=' + f.widthPx + ',' + f.heightPx,
        'file:///' + svg.replace(/\\/g, '/'),
      ], { stdio: 'ignore' });
      if (fs.existsSync(png)) made += 1;
    } catch (err) {
      console.log('could not rasterize ' + f.file + ': ' + err.message);
    }
  });
  return made;
}

if (!checkOnly) {
  const rasterized = rasterize();
  manifest.forEach((f) => {
    const png = path.join(DIR, f.file.replace(/\.svg$/, '.png'));
    f.png = fs.existsSync(png) ? path.basename(png) : null;
  });
  fs.writeFileSync(
    path.join(DIR, 'figures.json'),
    JSON.stringify(manifest, null, 2) + '\n'
  );
  console.log('rasterized ' + rasterized + ' PNG fallbacks at 3x');
}

console.log('');
console.log(checkOnly
  ? 'checked only, nothing written'
  : 'wrote ' + manifest.length + ' .svg files and figures.json');
if (warnings > 0) {
  console.log(warnings + ' warning(s) — a diagram may need splitting');
}
