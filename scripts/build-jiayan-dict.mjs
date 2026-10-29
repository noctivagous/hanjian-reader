// Build-time: Jiayan classical lexicon (MIT) -> public/dict/jiayan.json.
// Usage: node scripts/build-jiayan-dict.mjs [path/to/dict.txt]
// Default source is the upstream dict.txt from jiaeyan/Jiayan.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, 'public', 'dict', 'jiayan.json');
const UPSTREAM =
  'https://raw.githubusercontent.com/jiaeyan/Jiayan/master/jiayan/data/dict.txt';

const src = process.argv[2];
let raw;
if (src) {
  raw = readFileSync(src, 'utf8');
} else {
  const res = await fetch(UPSTREAM);
  if (!res.ok) {
    console.error(`error: fetch ${UPSTREAM} failed HTTP ${res.status}`);
    process.exit(1);
  }
  raw = await res.text();
}

const words = Object.create(null);
let n = 0;
for (const line of raw.split('\n')) {
  const t = line.trim();
  if (!t) continue;
  const i = t.lastIndexOf(',');
  if (i < 0) continue;
  const word = t.slice(0, i);
  const freq = Number(t.slice(i + 1));
  if (!word || !Number.isFinite(freq)) continue;
  words[word] = freq;
  n += 1;
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(
  outPath,
  JSON.stringify({
    meta: {
      source: 'Jiayan (jiaeyan/Jiayan) jiayan/data/dict.txt',
      url: 'https://github.com/jiaeyan/Jiayan',
      license: 'MIT',
      licenseUrl: 'https://github.com/jiaeyan/Jiayan/blob/master/LICENSE',
      attribution: 'Classical Chinese lexicon from Jiayan by Jiajie Yan.',
      entries: n,
    },
    words,
  }),
);
console.log(`${n} entries -> ${outPath}`);
