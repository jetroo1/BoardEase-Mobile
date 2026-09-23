// Runs docs/figma/code.js against a stub of the Figma plugin API, so we can
// prove every prototype link resolves to a real node before anyone opens Figma.
const fs = require('fs');
const path = require('path');

let idSeq = 0;

function makeNode(type) {
  const node = {
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
    characters: '',
    appendChild(child) {
      this.children.push(child);
      child.parent = this;
    },
    resize(w, h) {
      this.width = w;
      this.height = h;
    },
    findOne(predicate) {
      const walk = (n) => {
        for (const c of n.children) {
          if (predicate(c)) return c;
          const found = walk(c);
          if (found) return found;
        }
        return null;
      };
      return walk(this);
    },
    setReactionsAsync(r) {
      this.reactions = r;
      return Promise.resolve();
    },
  };
  return node;
}

const created = [];
let closeMessage = null;

global.figma = {
  createFrame: () => { const n = makeNode('FRAME'); created.push(n); return n; },
  createText: () => { const n = makeNode('TEXT'); created.push(n); return n; },
  createRectangle: () => { const n = makeNode('RECTANGLE'); created.push(n); return n; },
  loadFontAsync: () => Promise.resolve(),
  currentPage: makeNode('PAGE'),
  viewport: { scrollAndZoomIntoView: () => {} },
  closePlugin: (msg) => { closeMessage = msg; },
};

const code = fs.readFileSync(path.join('docs', 'figma', 'code.js'), 'utf8');
eval(code); // eslint-disable-line no-eval

setTimeout(() => {
  const frames = global.figma.currentPage.children;
  console.log('frames created: ' + frames.length);
  frames.forEach((f) => console.log('   ' + f.name));

  let links = 0;
  const countReactions = (n) => {
    if (n.reactions && n.reactions.length) links += n.reactions.length;
    n.children.forEach(countReactions);
  };
  frames.forEach(countReactions);

  console.log('\nprototype links wired: ' + links);
  console.log('\nplugin said: ' + closeMessage);

  if (closeMessage && closeMessage.indexOf('Could not link') >= 0) {
    console.log('\nFAILED — some links did not resolve');
    process.exit(1);
  }
  if (frames.length !== 16) {
    console.log('\nFAILED — expected 16 frames');
    process.exit(1);
  }
  console.log('\nPASS');
}, 500);
