import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const chunksDir = path.join(process.cwd(), 'src', 'legacy-v22');
const chunks = fs.readdirSync(chunksDir)
  .filter((name) => /^part-\d+\.b64$/.test(name))
  .sort();

if (!chunks.length) throw new Error('M23 v22 chunks are missing');

const encoded = chunks.map((name) => fs.readFileSync(path.join(chunksDir, name), 'utf8').trim()).join('');
const compressed = Buffer.from(encoded, 'base64');
let html = zlib.brotliDecompressSync(compressed).toString('utf8');

const spriteLink = '<link rel="stylesheet" href="/sprite-overrides.css">';
if (!html.includes(spriteLink)) {
  html = html.replace('</head>', `  ${spriteLink}\n</head>`);
}

const spriteDirectionScript = '<script src="/sprite-directions.js" defer></script>';
if (!html.includes(spriteDirectionScript)) {
  html = html.replace('</body>', `  ${spriteDirectionScript}\n</body>`);
}

fs.rmSync('dist', { recursive: true, force: true });
fs.mkdirSync(path.join('dist', 'assets'), { recursive: true });
fs.writeFileSync(path.join('dist', 'index.html'), html);
fs.copyFileSync('manifest.webmanifest', path.join('dist', 'manifest.webmanifest'));
fs.copyFileSync('sprite-overrides.css', path.join('dist', 'sprite-overrides.css'));
fs.copyFileSync('sprite-directions.js', path.join('dist', 'sprite-directions.js'));
fs.copyFileSync(path.join('assets', 'soldier-card.png'), path.join('dist', 'assets', 'soldier-card.png'));
fs.copyFileSync(path.join('assets', 'soldier-32x48.png'), path.join('dist', 'assets', 'soldier-32x48.png'));
fs.copyFileSync(path.join('assets', 'soldier-walk-4dir-32x48-v2.png'), path.join('dist', 'assets', 'soldier-walk-4dir-32x48-v2.png'));
console.log(`Built M23 v22 web: ${Buffer.byteLength(html)} bytes from ${chunks.length} chunks + directional soldier assets`);
