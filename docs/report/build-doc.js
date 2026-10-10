// Builds the combined BoardEase technical documentation as a Word file.
//
// It converts the three Markdown chapters rather than restating them in
// docx-js calls. That keeps one source of truth: edit the .md and rebuild, and
// the Word file cannot drift from it.
//
// Formatting follows BoardEase_TitleProposal.docx exactly: Arial 12, 1.5 line
// spacing, US Letter, margins left 1.5" and right/top/bottom 1", page number
// bottom-right, and the UM Tagum seal on the title page.
//
//   node build-doc.js <output.docx>

const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  ImageRun, Footer, PageNumber, PageBreak, PageOrientation,
} = require('docx');

const REPO = 'C:/BoardEase_Mobile';
const FONT = 'Arial';

// Courier New rather than Consolas for the monospaced runs: Consolas is a
// Windows font that Google Docs does not have, so every file name and field
// name would be silently substituted there.
const MONO = 'Courier New';

const SIZE = 24;          // 12pt

// A4, in twips. 210mm x 297mm.
const PAGE_W = 11906;
const PAGE_H = 16838;
const MARGIN = { top: 1440, right: 1440, bottom: 1440, left: 2160, footer: 708 };

// What is left for text on a portrait page: 8.27" less the 1.5" and 1" margins.
const CONTENT_W = PAGE_W - MARGIN.left - MARGIN.right;
const INK = '000000';
const GREY = 'EDF2F4';
const LINE = 'BFCBD0';
const LOGO = fs.readFileSync(path.join(__dirname, 'assets', 'image1.jpg'));

// --- inline formatting -------------------------------------------------------

// Turns **bold**, `code` and plain text into runs. Written by hand because a
// full Markdown parser is far more than these chapters need.
function runs(text, base) {
  const b = base || {};
  const out = [];
  // Split on the inline markers, keeping the delimiters. Bold has to be tried
  // before italic or "**x**" is read as an empty italic wrapping "*x*".
  // Italic was missing entirely, so every *emphasised* phrase reached the page
  // with its asterisks still printed around it.
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  parts.forEach((part) => {
    if (!part) return;
    if (part.startsWith('**') && part.endsWith('**')) {
      // The collection headings are written as **`users/{uid}`** -- bold around
      // inline code. Emitting the inner text as-is printed the backticks, so
      // recurse and let the code span be recognised inside the bold.
      const inner = part.slice(2, -2);
      if (inner.indexOf('`') >= 0) {
        runs(inner, { size: b.size, bold: true, color: b.color }).forEach((r) => out.push(r));
      } else {
        out.push(new TextRun({
          text: inner, font: FONT, size: b.size || SIZE, bold: true, color: b.color,
        }));
      }
    } else if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
      out.push(new TextRun({
        text: part.slice(1, -1), font: FONT, size: b.size || SIZE,
        bold: b.bold, italics: true,
      }));
    } else if (part.startsWith('`') && part.endsWith('`')) {
      // Inline code: A monospaced face so file names and identifiers stand apart. It
      // keeps the weight of whatever encloses it, so a bold heading stays bold.
      out.push(new TextRun({
        text: part.slice(1, -1), font: MONO,
        size: (b.size || SIZE) - 2, bold: b.bold,
      }));
    } else {
      out.push(new TextRun({
        text: part, font: FONT, size: b.size || SIZE,
        bold: b.bold, italics: b.italics, color: b.color,
      }));
    }
  });
  return out.length ? out : [new TextRun({ text: '', font: FONT, size: SIZE })];
}

function para(text, opts) {
  const o = opts || {};
  return new Paragraph({
    children: runs(text, o),
    alignment: o.align,
    spacing: { after: o.after == null ? 140 : o.after, line: 360, lineRule: 'auto' },
  });
}

function heading(text, level) {
  const size = level === 1 ? 30 : level === 2 ? 26 : 24;
  return new Paragraph({
    heading: level === 1 ? HeadingLevel.HEADING_1
      : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
    // Word's built-in Heading styles are blue. The run colour is set here so it
    // overrides the style: an academic paper is set in black throughout.
    children: runs(text, { size, bold: true, color: INK }),
    spacing: { before: level === 1 ? 360 : 260, after: 150, line: 360, lineRule: 'auto' },
    // Never leave a heading stranded at the foot of a page with the table or
    // paragraph it introduces overleaf.
    keepNext: true,
    keepLines: true,
  });
}

function bullet(text, level) {
  const depth = level || 0;
  return new Paragraph({
    children: runs(text),
    bullet: { level: depth },
    // Without an explicit hanging indent the second and later lines of a bullet
    // wrapped back to the left margin, so a three-line point read as a bullet
    // followed by two stray paragraphs.
    indent: { left: 720 + depth * 360, hanging: 360 },
    spacing: { after: 80, line: 360, lineRule: 'auto' },
  });
}

function numbered(text) {
  // Rendered as an indented paragraph rather than a numbering definition: the
  // source already carries its own numbers, and a numbering config would
  // duplicate them.
  return new Paragraph({
    children: runs(text),
    // Hanging, so a numbered step that runs to two lines keeps the second line
    // under its text rather than back at the margin.
    indent: { left: 720, hanging: 360 },
    spacing: { after: 80, line: 360, lineRule: 'auto' },
  });
}

function codeBlock(lines) {
  // Monospaced, single-spaced, on a tinted background so the Gantt chart and
  // the endpoint keep their alignment.
  return lines.map((l, i) => new Paragraph({
    // 8.5pt. The Gantt chart is 78 monospaced characters wide, which at 9pt
    // overruns A4's 5.77" of text and drops "Sep 25" onto a line of its own.
    children: [new TextRun({ text: l || ' ', font: MONO, size: 17 })],
    shading: { type: ShadingType.CLEAR, fill: 'F4F7F8', color: 'auto' },
    spacing: { after: i === lines.length - 1 ? 140 : 0, line: 240, lineRule: 'auto' },
  }));
}

function quote(text) {
  return new Paragraph({
    children: runs(text, { italics: true }),
    indent: { left: 360 },
    spacing: { after: 140, line: 360, lineRule: 'auto' },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: '0E7490', space: 8 } },
  });
}

// --- tables ------------------------------------------------------------------

function splitRow(line) {
  return line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((s) => s.trim());
}

function buildTable(rows) {
  const header = splitRow(rows[0]);
  const bodyRows = rows.slice(2).map(splitRow); // row 1 is the --- separator
  const cols = header.length;

  // Give the first column less room when it is a short identifier column
  // (ID, #), which is how most of these tables are shaped.
  const widths = [];
  const narrowFirst = /^(ID|#|Priority)$/i.test(header[0]);
  if (narrowFirst && cols > 1) {
    widths.push(Math.round(CONTENT_W * 0.11));
    const rest = Math.round((CONTENT_W - widths[0]) / (cols - 1));
    for (let i = 1; i < cols; i += 1) widths.push(rest);
  } else {
    const each = Math.round(CONTENT_W / cols);
    for (let i = 0; i < cols; i += 1) widths.push(each);
  }
  // Absorb rounding into the last column so the widths sum exactly.
  widths[cols - 1] += CONTENT_W - widths.reduce((a, b) => a + b, 0);

  const borders = {
    top: { style: BorderStyle.SINGLE, size: 1, color: LINE },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: LINE },
    left: { style: BorderStyle.SINGLE, size: 1, color: LINE },
    right: { style: BorderStyle.SINGLE, size: 1, color: LINE },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: LINE },
    insideVertical: { style: BorderStyle.SINGLE, size: 1, color: LINE },
  };

  function makeCell(text, i, isHeader) {
    return new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      shading: isHeader ? { type: ShadingType.CLEAR, fill: GREY, color: 'auto' } : undefined,
      margins: { top: 70, bottom: 70, left: 110, right: 110 },
      children: [new Paragraph({
        children: runs(text, { size: 20, bold: isHeader }),
        spacing: { after: 0, line: 300, lineRule: 'auto' },
      })],
    });
  }

  return new Table({
    columnWidths: widths,
    width: { size: CONTENT_W, type: WidthType.DXA },
    borders,
    rows: [new TableRow({
      tableHeader: true,
      children: header.map((h, i) => makeCell(h, i, true)),
    })].concat(bodyRows.map((r) => new TableRow({
      // Move a whole row to the next page rather than tearing one cell's text
      // across the break, which left orphaned half-sentences under the repeated
      // header with no visible row they belonged to.
      cantSplit: true,
      children: r.map((c, i) => makeCell(c, i, false)),
    }))),
  });
}

// --- markdown → docx ---------------------------------------------------------

// Does this line begin a new block, or is it the continuation of the one
// before? The chapters are hard-wrapped at about 78 columns, so most bullets,
// numbered steps and paragraphs span several source lines.
function startsBlock(line) {
  const t = line.trim();
  if (!t) return true;
  return /^#{1,4}\s/.test(t)       // heading
    || /^>/.test(t)                 // blockquote
    || /^\|/.test(t)                // table
    || /^```/.test(t)               // fence
    || /^!\[/.test(t)               // figure
    || /^-\s+/.test(t)              // bullet
    // At most two digits: a wrapped line beginning "2026. Dates are taken..."
    // is a year, not the start of a numbered list, and treating it as one broke
    // the paragraph in two.
    || /^\d{1,2}\.\s+/.test(t)
    || /^---\s*$/.test(t);          // rule
}

// Collect the wrapped remainder of a block that began on line i.
function wrapped(lines, i) {
  const extra = [];
  while (i < lines.length && !startsBlock(lines[i])) {
    extra.push(lines[i].trim());
    i += 1;
  }
  return { extra, next: i };
}

function convert(md) {
  const out = [];
  const lines = md.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // horizontal rule — used as a section divider; skip it
    if (/^---\s*$/.test(line)) { i += 1; continue; }

    // A figure. Not a paragraph: every diagram is wider than it is tall, and on
    // a portrait page it would shrink to about 4pt text. Emit a marker instead
    // and let the build put each one on its own landscape page.
    const fig = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (fig) {
      out.push({ figure: { caption: fig[1], src: fig[2] } });
      i += 1;
      continue;
    }

    // fenced code block
    if (/^```/.test(line)) {
      const block = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) { block.push(lines[i]); i += 1; }
      i += 1;
      codeBlock(block).forEach((p) => out.push(p));
      continue;
    }

    // table
    if (/^\|/.test(line) && i + 1 < lines.length && /^\|[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i += 1; }
      out.push(buildTable(rows));
      out.push(new Paragraph({ children: [], spacing: { after: 140 } }));
      continue;
    }

    // headings
    let m = line.match(/^(#{1,4})\s+(.*)$/);
    if (m) {
      const depth = m[1].length;
      const text = m[2].trim();
      // "# CHAPTER n" starts a new page and is centred.
      if (depth === 1) {
        // Always break. Each chapter is converted into its own array, so a
        // test for "not the first element" was never true and no chapter ever
        // started on a new page. The title page gets its break from Chapter 1.
        out.push(new Paragraph({ children: [new PageBreak()] }));
        out.push(new Paragraph({
          children: runs(text, { size: 34, bold: true, color: INK }),
          alignment: AlignmentType.CENTER,
          spacing: { after: 280, line: 360, lineRule: 'auto' },
        }));
      } else {
        out.push(heading(text, depth - 1));
      }
      i += 1;
      continue;
    }

    // blockquote
    if (/^>\s?/.test(line)) {
      const block = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        block.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      out.push(quote(block.join(' ').trim()));
      continue;
    }

    // bullet — the item plus however many lines it wraps onto
    m = line.match(/^(\s*)-\s+(.*)$/);
    if (m) {
      const rest = wrapped(lines, i + 1);
      out.push(bullet([m[2].trim()].concat(rest.extra).join(' '), m[1].length >= 2 ? 1 : 0));
      i = rest.next;
      continue;
    }

    // numbered
    m = line.match(/^(\s*)(\d{1,2})\.\s+(.*)$/);
    if (m) {
      const rest = wrapped(lines, i + 1);
      out.push(numbered(m[2] + '.  ' + [m[3].trim()].concat(rest.extra).join(' ')));
      i = rest.next;
      continue;
    }

    // blank
    if (!line.trim()) { i += 1; continue; }

    // paragraph — join wrapped lines until a blank or a new block starts
    const rest = wrapped(lines, i + 1);
    out.push(para([line.trim()].concat(rest.extra).join(' ')));
    i = rest.next;
  }

  return out;
}

// --- title page --------------------------------------------------------------

function centre(text, opts) {
  const o = opts || {};
  return new Paragraph({
    children: runs(text, { bold: o.bold }),
    alignment: AlignmentType.CENTER,
    spacing: { after: o.after == null ? 0 : o.after, line: 360, lineRule: 'auto' },
  });
}

const title = [
  centre('UNIVERSITY OF MINDANAO TAGUM BRANCH', { bold: true }),
  centre('BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY', { bold: true }),
  centre('Department of Computer Education'),
  centre('Visayan Village, Tagum City, Philippines', { after: 120 }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [new ImageRun({
      type: 'jpg', data: LOGO,
      transformation: { width: 3.15 * 96, height: 3.15 * 96 },
    })],
  }),
  centre('\u201CBoardEase: A Mobile Application Guide for Finding, Comparing, and Navigating to Boarding Houses\u201D', { bold: true, after: 160 }),
  centre('TECHNICAL DOCUMENTATION FOR CCE106/L', { bold: true, after: 200 }),
  centre('SUBMITTED TO:', { bold: true }),
  centre('PRINCESS ANNE DADUL', { after: 200 }),
  centre('SUBMITTED BY:', { bold: true }),
  centre('MARTIN, JETROY S.'),
  centre('LULU, JOHN REX P.'),
  centre('GALAGAR, AILYN MAY V.'),
  centre('LISBO, VINCE JOSUA C.', { after: 200 }),
  // October, matching the Release Date in Chapter 1. The cover said September
  // while Chapter 1 said October, which is the first thing a reader checks.
  centre('OCTOBER 2026', { bold: true }),
];

// --- build -------------------------------------------------------------------

// Which chapters go in. Chapter 3 covers testing, deployment and acceptance,
// so while the system is still being built there is a reason to hand in only
// the first two:
//   node docs/report/build-doc.js out.docx --chapters 1,2
const only = (process.argv.find((a) => a.startsWith('--chapters')) || '')
  .split('=')[1] || (process.argv[process.argv.indexOf('--chapters') + 1] || '');
const wanted = /^[\d,\s]+$/.test(only) && only.trim()
  ? only.split(',').map((n) => n.trim())
  : ['1', '2', '3'];

const chapters = wanted.map((n) => 'chapter-' + n + '.md');
let body = title.slice();

chapters.forEach((file) => {
  let md = fs.readFileSync(path.join(REPO, 'docs', 'report', file), 'utf8');
  // Chapter 1 carries its own cover block; the combined document has one.
  md = md.replace(/^# CHAPTER 1[\s\S]*?^---\s*$/m, '# CHAPTER 1');
  body = body.concat(convert(md));
});

// --- figures -----------------------------------------------------------------

// The margins are fixed by the department: 1.5" left, 1" elsewhere. On a
// portrait A4 page that leaves 5.77" of width, and a diagram scaled into that
// puts its text under 5pt. Turned sideways the same sheet gives 9.19" x 6.27",
// which is what keeps the labels legible. Page numbering carries on across the
// change because docx continues it unless a section restarts it.
const PORTRAIT = {
  size: { width: PAGE_W, height: PAGE_H },
  margin: MARGIN,
};
// Give the PORTRAIT measurements here even though the page is landscape: docx
// swaps them itself when the orientation is set. Passing them already swapped
// makes it swap them back, and the file then claims to be landscape while
// carrying a portrait width -- which silently cropped the right-hand side off
// every diagram, because each one is drawn to fill the usable width.
const LANDSCAPE = {
  size: { width: PAGE_W, height: PAGE_H, orientation: PageOrientation.LANDSCAPE },
  margin: MARGIN,
};

// A4 on its side is 11.69" x 8.27". Take the margins off both.
const LAND_W_IN = (PAGE_H - MARGIN.left - MARGIN.right) / 1440;   // 9.19"
// The caption below the figure takes one 12pt line at 1.5 spacing plus its
// lead-in, about 0.38". Every tenth of an inch given away here comes straight
// off the size of the labels inside the diagram.
const LAND_H_IN = (PAGE_W - MARGIN.top - MARGIN.bottom) / 1440 - 0.38;  // 5.89"

function figureParagraphs(fig) {
  const svgPath = path.join(__dirname, fig.src);
  const pngPath = svgPath.replace(/\.svg$/, '.png');
  if (!fs.existsSync(svgPath)) {
    throw new Error('missing figure ' + svgPath + ' — run: node docs/diagrams/export.js');
  }

  // The SVG is read only for its dimensions. The picture itself goes in as PNG:
  // Google Docs has no SVG support, and a docx carrying an SVG with a PNG
  // fallback is not reliably resolved there. The PNG is rendered at 3x, so at
  // this placed size it still lands above 300 dpi and prints sharply.
  if (!fs.existsSync(pngPath)) {
    throw new Error('missing raster for ' + fig.src + ' — run: node docs/diagrams/export.js');
  }

  const head = fs.readFileSync(svgPath).toString('utf8', 0, 400);
  const w = Number((head.match(/width="(\d+)"/) || [])[1]);
  const h = Number((head.match(/height="(\d+)"/) || [])[1]);

  // Fit inside the frame without distorting it.
  const scale = Math.min(LAND_W_IN * 96 / w, LAND_H_IN * 96 / h);

  const image = new ImageRun({
    type: 'png',
    data: fs.readFileSync(pngPath),
    transformation: { width: w * scale, height: h * scale },
  });

  return [
    new Paragraph({ children: [image], alignment: AlignmentType.CENTER }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, line: 360, lineRule: 'auto' },
      children: runs('**' + fig.caption.replace(/^(Figure \S+?)\.\s*/, '$1.** ') , {}),
    }),
  ];
}

// Split the flat list into sections: text stays portrait, each figure gets a
// landscape page of its own.
function sectionsFrom(children) {
  const sections = [];
  let run = [];

  const flushText = () => {
    if (!run.length) return;
    sections.push({ properties: { page: PORTRAIT }, children: run });
    run = [];
  };

  children.forEach((child) => {
    if (child && child.figure) {
      flushText();
      sections.push({
        properties: { page: LANDSCAPE },
        children: figureParagraphs(child.figure),
      });
      return;
    }
    run.push(child);
  });
  flushText();

  // The title page belongs to the first section and must not carry a number.
  sections[0].properties.titlePage = true;
  sections.forEach((s, i) => {
    s.footers = {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: SIZE })],
        })],
      }),
    };
    if (i === 0) s.footers.first = new Footer({ children: [new Paragraph({ children: [] })] });
  });

  return sections;
}

const doc = new Document({
  creator: 'BoardEase Development Team',
  title: 'BoardEase — Technical Documentation',
  description: 'CCE106/L technical documentation, Chapters 1 to 3',
  styles: { default: { document: { run: { font: FONT, size: SIZE, color: INK } } } },
  sections: sectionsFrom(body),
});

Packer.toBuffer(doc).then((buf) => {
  const out = process.argv[2] || 'BoardEase-Documentation.docx';
  fs.writeFileSync(out, buf);
  console.log('wrote ' + out + '  (' + Math.round(buf.length / 1024) + ' KB)');
});
