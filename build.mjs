import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const chunksDir = path.join(process.cwd(), 'src', 'legacy-v22');
const chunks = fs.readdirSync(chunksDir)
  .filter((name) => /^part-\d+\.b64$/.test(name))
  .sort();

if (!chunks.length) throw new Error('M23 v22 chunks are missing');

const encoded = chunks
  .map((name) => fs.readFileSync(path.join(chunksDir, name), 'utf8').trim())
  .join('');
const compressed = Buffer.from(encoded, 'base64');
let html = zlib.brotliDecompressSync(compressed).toString('utf8');

// The legacy v22 morgue is available from the start but had no model on the camp map.
// Add only its map model; this does not add/change any upgrade, menu item or game-state flag.
if (!html.includes('campBuilding("morgue"')) {
  const towerHook = /state\.commanders\.length\s*>\s*1\s*\?\s*campBuilding\(\s*"tower"\s*,\s*""\s*,\s*`Вышка · \$\{state\.commanders\.length\} ком\.`\s*,\s*8\s*,\s*67\s*,\s*16\s*,\s*state\.commanders\.length\s*\)\s*:\s*""\s*,/;
  if (!towerHook.test(html)) throw new Error('Camp tower render hook is missing');
  html = html.replace(
    towerHook,
    (match) => `${match}\n        campBuilding("morgue", "", "Морг", 28, 82, 21, 1),`,
  );
}

// The supplied camp background has fixed, illustrated construction pads. Keep a
// single layout table for both completed buildings and their construction plots
// so an upgrade replaces its plot in exactly the same place. Coordinates are
// percentages of #campStage; non-HQ sprites use a bottom-centre ground anchor in
// map-buildings.css.
const campBuildingHook = '  function campBuilding(type, name, caption, x, y, z, level) {\n';
if (!html.includes(campBuildingHook)) throw new Error('Camp building helper is missing');
html = html.replace(
  campBuildingHook,
  `  const CAMP_MAP_LAYOUT = Object.freeze({
    hq: { x: 49.5, y: 24, z: 9 },
    "tent:К-1": { x: 19.5, y: 52, z: 12 },
    "tent:К-2": { x: 25.5, y: 70.5, z: 16 },
    "tent:К-3": { x: 72, y: 36, z: 9 },
    hospital: { x: 77, y: 54, z: 14 },
    warehouse: { x: 42.5, y: 83, z: 22 },
    pit: { x: 44, y: 47, z: 11 },
    checkpoint: { x: 91, y: 55, z: 14 },
    signal: { x: 68, y: 81, z: 21 },
    evac: { x: 56, y: 65, z: 16 },
    guard: { x: 31, y: 34, z: 8 },
    tower: { x: 11.5, y: 68, z: 17 },
    morgue: { x: 86, y: 73, z: 20 },
  });

  const CAMP_CONSTRUCTION_LAYOUT = Object.freeze({
    "Госпиталь": CAMP_MAP_LAYOUT.hospital,
    "Склад": CAMP_MAP_LAYOUT.warehouse,
    "Яма": CAMP_MAP_LAYOUT.pit,
    "Узел связи": CAMP_MAP_LAYOUT.signal,
    "Эвакогруппа": CAMP_MAP_LAYOUT.evac,
    "Охрана": CAMP_MAP_LAYOUT.guard,
  });

${campBuildingHook}    const slotKey = type === "tent" ? \`tent:\${name}\` : type;
    const slot = CAMP_MAP_LAYOUT[slotKey];
    if (slot) {
      x = slot.x;
      y = slot.y;
      z = slot.z;
    }
`,
);

const constructionPlotHook = '  function constructionPlot(label, x, y) {\n';
if (!html.includes(constructionPlotHook)) throw new Error('Camp construction plot helper is missing');
html = html.replace(
  constructionPlotHook,
  `${constructionPlotHook}    const slot = CAMP_CONSTRUCTION_LAYOUT[label];
    if (slot) {
      x = slot.x;
      y = slot.y;
    }
`,
);

const spriteLink = '<link rel="stylesheet" href="/sprite-overrides.css?v=up-anchor-v7">';
if (!html.includes(spriteLink)) {
  html = html.replace('</head>', `  ${spriteLink}\n</head>`);
}

const buildingLink = '<link rel="stylesheet" href="/map-buildings.css?v=hq-tent-v1">';
if (!html.includes(buildingLink)) {
  html = html.replace('</head>', `  ${buildingLink}\n</head>`);
}

const spriteDirectionScript = '<script src="/sprite-directions.js" defer></script>';
if (!html.includes(spriteDirectionScript)) {
  html = html.replace('</body>', `  ${spriteDirectionScript}\n</body>`);
}

const buildingChunksDir = path.join(process.cwd(), 'src', 'map-buildings-atlas-v2');
const buildingChunks = fs.readdirSync(buildingChunksDir)
  .filter((name) => /^part-\d+\.b64$/.test(name))
  .sort();
if (!buildingChunks.length) throw new Error('Map building atlas chunks are missing');

const buildingEncoded = buildingChunks
  .map((name) => fs.readFileSync(path.join(buildingChunksDir, name), 'utf8').trim())
  .join('');
const buildingAtlas = Buffer.from(buildingEncoded, 'base64');
const buildingAtlasHash = crypto.createHash('sha256').update(buildingAtlas).digest('hex');
if (buildingAtlasHash !== 'd6ed34e86793705386cb557ccfac08fb0ebd8fbd06dad26ff6ed87f7caac793b') {
  throw new Error(`Map building atlas checksum mismatch: ${buildingAtlasHash}`);
}

fs.rmSync('dist', { recursive: true, force: true });
fs.mkdirSync(path.join('dist', 'assets'), { recursive: true });
fs.writeFileSync(path.join('dist', 'index.html'), html);
fs.copyFileSync('manifest.webmanifest', path.join('dist', 'manifest.webmanifest'));
fs.copyFileSync('sprite-overrides.css', path.join('dist', 'sprite-overrides.css'));
fs.copyFileSync('sprite-directions.js', path.join('dist', 'sprite-directions.js'));
fs.copyFileSync('map-buildings.css', path.join('dist', 'map-buildings.css'));
fs.copyFileSync(path.join('assets', 'soldier-card-v7.png'), path.join('dist', 'assets', 'soldier-card-v7.png'));
fs.copyFileSync(path.join('assets', 'soldier-32x48.png'), path.join('dist', 'assets', 'soldier-32x48.png'));
fs.copyFileSync(path.join('assets', 'soldier-walk-4dir-6f-32x48-v7.png'), path.join('dist', 'assets', 'soldier-walk-4dir-6f-32x48-v7.png'));
fs.copyFileSync(path.join('assets', 'camp-map-background.webp'), path.join('dist', 'assets', 'camp-map-background-v2.webp'));
const hqChunksDir = path.join(process.cwd(), 'src', 'hq-tent-v1');
const hqChunks = fs.readdirSync(hqChunksDir)
  .filter((name) => /^part-\d+\.b64$/.test(name))
  .sort();
if (!hqChunks.length) throw new Error('HQ tent sprite chunks are missing');
const hqEncoded = hqChunks
  .map((name) => fs.readFileSync(path.join(hqChunksDir, name), 'utf8').trim())
  .join('');
const hqTent = Buffer.from(hqEncoded, 'base64');
const hqTentHash = crypto.createHash('sha256').update(hqTent).digest('hex');
if (hqTentHash !== '8d43531dffbcdf314ee97d2a8aeec0a003afa3e04b646720fc1131af1320c143') {
  throw new Error(`HQ tent sprite checksum mismatch: ${hqTentHash}`);
}
fs.writeFileSync(path.join('dist', 'assets', 'hq-tent.png'), hqTent);
fs.writeFileSync(path.join('dist', 'assets', 'map-buildings-v2.png'), buildingAtlas);

console.log(
  `Built M23 v22 web: ${Buffer.byteLength(html)} bytes from ${chunks.length} chunks + directional soldier assets + supplied camp map and buildings`,
);
