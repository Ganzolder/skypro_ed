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

const spriteLink = '<link rel="stylesheet" href="/sprite-overrides.css?v=up-anchor-v7">';
if (!html.includes(spriteLink)) {
  html = html.replace('</head>', `  ${spriteLink}\n</head>`);
}

const buildingLink = '<link rel="stylesheet" href="/map-buildings.css?v=map-art-v1">';
if (!html.includes(buildingLink)) {
  html = html.replace('</head>', `  ${buildingLink}\n</head>`);
}

const spriteDirectionScript = '<script src="/sprite-directions.js" defer></script>';
if (!html.includes(spriteDirectionScript)) {
  html = html.replace('</body>', `  ${spriteDirectionScript}\n</body>`);
}

const buildingChunksDir = path.join(process.cwd(), 'src', 'map-buildings-atlas');
const buildingChunks = fs.readdirSync(buildingChunksDir)
  .filter((name) => /^part-\d+\.b64$/.test(name))
  .sort();
if (!buildingChunks.length) throw new Error('Map building atlas chunks are missing');

const buildingEncoded = buildingChunks
  .map((name) => fs.readFileSync(path.join(buildingChunksDir, name), 'utf8').trim())
  .join('');
const buildingAtlas = Buffer.from(buildingEncoded, 'base64');
const buildingAtlasHash = crypto.createHash('sha256').update(buildingAtlas).digest('hex');
if (buildingAtlasHash !== 'dfaeac0794adb0d81f9f153140528240c9b2024d65617431346a2e43f8d2e985') {
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
fs.writeFileSync(path.join('dist', 'assets', 'map-buildings-v1.png'), buildingAtlas);

console.log(
  `Built M23 v22 web: ${Buffer.byteLength(html)} bytes from ${chunks.length} chunks + directional soldier assets + supplied camp buildings`,
);
