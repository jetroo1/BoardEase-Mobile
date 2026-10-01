// Checks that the written chapters, the .drawio diagrams and the source code
// all describe the same system.
//
// This exists because they drifted. Chapter 2 described an `alertsEnabled`
// field that the code used and the entity relationship diagram did not show.
// Nothing compared the two, so nobody noticed. Two documents describing one
// system will always drift unless something checks them.
//
//   node docs/report/check-consistency.js

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let failures = 0;
function check(label, ok, detail) {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + label + (detail ? '  — ' + detail : ''));
  if (!ok) failures += 1;
}

// --- 1. ERD fields vs the TypeScript interfaces -----------------------------

const erd = read('docs/diagrams/05-entity-relationship-diagram.drawio');
const types = read('src/types.ts');
const alerts = read('src/utils/matchAlerts.ts');

function erdFields(entity) {
  const re = new RegExp('id="' + entity + '-r[0-9a-z]+-f" value="([a-zA-Z]+)"', 'g');
  const out = [];
  let m;
  while ((m = re.exec(erd)) !== null) out.push(m[1]);
  return out;
}

function interfaceFields(name) {
  const block = types.split('export interface ' + name)[1];
  if (!block) return [];
  const body = block.split('}')[0];
  return (body.match(/^\s{2}([a-zA-Z]+)[?]?:/gm) || []).map((s) => s.trim().replace(/[?:]/g, ''));
}

console.log('\nEntity Relationship Diagram vs src/types.ts');

const propsErd = erdFields('props');
const propsCode = interfaceFields('Property');
const missingProps = propsCode.filter((f) => propsErd.indexOf(f) < 0);
check('properties: every code field is in the diagram', missingProps.length === 0, missingProps.join(', '));

const revsErd = erdFields('revs');
const revsCode = interfaceFields('Review');
const missingRevs = revsCode.filter((f) => revsErd.indexOf(f) < 0);
check('reviews: every code field is in the diagram', missingRevs.length === 0, missingRevs.join(', '));

const favsErd = erdFields('favs');
const favsCode = interfaceFields('Favorite');
const missingFavs = favsCode.filter((f) => favsErd.indexOf(f) < 0);
check('favorites: every code field is in the diagram', missingFavs.length === 0, missingFavs.join(', '));

// users has no interface in types.ts; its fields come from matchAlerts + Auth.
const usersErd = erdFields('users');
const usersExpected = ['uid', 'email', 'role', 'savedFilters', 'alertsEnabled', 'lastAlertCheck', 'createdAt'];
const missingUsers = usersExpected.filter((f) => usersErd.indexOf(f) < 0);
check('users: alertsEnabled and the rest are in the diagram', missingUsers.length === 0, missingUsers.join(', '));
check('users: alertsEnabled really exists in the code', alerts.indexOf('alertsEnabled') >= 0);

// --- 2. Chapter 2 vs the ERD ------------------------------------------------

console.log('\nChapter 2 vs the diagrams');

const ch2 = read('docs/report/chapter-2.md');
const ch2Missing = usersErd.filter((f) => ch2.indexOf('`' + f + '`') < 0);
check('every ERD users field is described in Chapter 2', ch2Missing.length === 0, ch2Missing.join(', '));

// --- 3. Chapter 2 vs the architecture diagram -------------------------------

const arch = read('docs/diagrams/01-system-architecture.drawio');
const archTerms = ['Leaflet', 'Firestore', 'OSRM', 'OpenStreetMap', 'AsyncStorage', 'expo-location'];
const archMissingFromCh2 = archTerms.filter((t) => arch.indexOf(t) >= 0 && ch2.indexOf(t) < 0);
check('every component in the architecture diagram is named in Chapter 2',
  archMissingFromCh2.length === 0, archMissingFromCh2.join(', '));

// --- 4. Claims that must match the code -------------------------------------

console.log('\nChapters vs the code');

const routing = read('src/utils/routing.ts');
check('Chapter 2 quotes the OSRM endpoint the code actually calls',
  routing.indexOf('router.project-osrm.org') >= 0 && ch2.indexOf('router.project-osrm.org') >= 0);

// Strip line comments first: LeafletMap deliberately *mentions* CARTO in a
// warning explaining why it must not be used. Checking the raw text flagged
// that comment as if the code still called CARTO.
const leaflet = read('src/components/LeafletMap.tsx')
  .split('\n')
  .filter((l) => l.trim().indexOf('//') !== 0)
  .join('\n');
check('Chapter 2 is right that tiles come from OpenStreetMap, not CARTO',
  leaflet.indexOf('tile.openstreetmap.org') >= 0 && leaflet.indexOf('basemaps.cartocdn.com') < 0);

const pkg = JSON.parse(read('package.json'));
check('Chapter 2 states the React Native version in package.json',
  ch2.indexOf(pkg.dependencies['react-native']) >= 0,
  'package.json says ' + pkg.dependencies['react-native']);

const ch3 = read('docs/report/chapter-3.md');
check('Chapter 3 is right that there are no automated tests',
  !fs.existsSync(path.join(ROOT, '__tests__')) && ch3.indexOf('no automated test suite') >= 0);

check('Chapter 3 is right that expo-notifications is installed but unused',
  Boolean(pkg.dependencies['expo-notifications']) &&
  !read('src/utils/matchAlerts.ts').includes("from 'expo-notifications'"));

// --- 5. The figures the chapters embed ---------------------------------------

// The chapters referred to the diagrams by file path for a while, which meant
// the document had no diagrams in it at all and nothing said so. Every figure a
// chapter embeds must exist as an exported image, and every exported image must
// be embedded somewhere.

console.log('\nFigures');

const chapterText = ['chapter-1.md', 'chapter-2.md', 'chapter-3.md']
  .map((f) => read('docs/report/' + f)).join('\n');

const embedded = [];
const imgRe = /!\[([^\]]*)\]\(([^)]+)\)/g;
let im;
while ((im = imgRe.exec(chapterText)) !== null) {
  embedded.push({ caption: im[1], src: im[2] });
}

check('the chapters embed at least one figure', embedded.length > 0);

const missingFiles = embedded
  .map((e) => path.join(ROOT, 'docs', 'report', e.src))
  .filter((p) => !fs.existsSync(p))
  .map((p) => path.basename(p));
check('every embedded figure has been exported', missingFiles.length === 0,
  missingFiles.length ? missingFiles.join(', ') + ' — run: node docs/diagrams/export.js' : '');

const exported = fs.readdirSync(path.join(ROOT, 'docs', 'diagrams'))
  .filter((f) => f.endsWith('.svg'));
const used = embedded.map((e) => path.basename(e.src));
const unused = exported.filter((f) => used.indexOf(f) < 0);
check('every exported figure is used by a chapter', unused.length === 0, unused.join(', '));

// A figure is only useful if the prose points at it.
const uncited = embedded.filter((e) => {
  const n = (e.caption.match(/Figure\s+(\d+)/) || [])[1];
  if (!n) return true;
  return !new RegExp('Figure ' + n + '\\b(?!\\.)').test(
    chapterText.replace(/!\[[^\]]*\]\([^)]+\)/g, ''));
}).map((e) => e.caption);
check('every figure is referred to in the text', uncited.length === 0, uncited.join('; '));

// Each diagram source should have produced an image.
const sources = fs.readdirSync(path.join(ROOT, 'docs', 'diagrams'))
  .filter((f) => f.endsWith('.drawio'));
const unexported = sources.filter((s) => {
  const stem = s.replace('.drawio', '');
  return !exported.some((e) => e === stem + '.svg' || e.indexOf(stem + '-') === 0);
});
check('every .drawio has been exported', unexported.length === 0, unexported.join(', '));

console.log('\n' + '='.repeat(62));
if (failures === 0) {
  console.log('PASS — chapters, diagrams and code agree');
} else {
  console.log('FAIL — ' + failures + ' inconsistency(ies)');
  process.exitCode = 1;
}
