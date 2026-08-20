import fs from 'node:fs';
import path from 'node:path';

const assets = [
  'card-impact-user-6f-v1.png',
  'hit-soft-v1.wav',
];

fs.mkdirSync(path.join('dist', 'assets'), { recursive: true });
for (const name of assets) {
  fs.copyFileSync(path.join('assets', name), path.join('dist', 'assets', name));
}

console.log(`Copied ${assets.length} soldier hit assets`);
