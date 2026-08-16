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
const html = zlib.brotliDecompressSync(compressed);

fs.rmSync('dist', { recursive: true, force: true });
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync(path.join('dist', 'index.html'), html);
fs.copyFileSync('manifest.webmanifest', path.join('dist', 'manifest.webmanifest'));
console.log(`Built M23 v22 web: ${html.length} bytes from ${chunks.length} chunks`);
