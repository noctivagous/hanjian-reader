// Build-time: consolidate stroke-order data into ONE file.
//
// Per-character JSON (public/hanzi-data/<char>.json, 800+ files) is replaced
// by a single lazily-fetched DB, public/stroke-data.json — the same shape as
// the existing public/dict/cedict.json precedent. The reader loads it once
// (module-level cache in src/components/StrokeOrder.tsx) and falls back to
// the hanzi-writer-data CDN per character for anything the DB lacks.
//
// Usage:
//   node scripts/build-stroke-db.mjs            # build from local files + CDN
//   node scripts/build-stroke-db.mjs --dry-run  # report coverage, write nothing
//   node scripts/build-stroke-db.mjs --missing   # print uncovered chars only
//
// Character set: the generated local Tao book module (gitignored) including
// titles, falling back to private/tao-te-ching.zh.txt on a clean clone.
// Local per-character files win; anything else is fetched from the CDN once
// at build time so the app serves fully offline.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const legacyDir = join(root, 'public', 'hanzi-data');
const generatedPath = join(root, 'src', 'data', 'tao-te-ching.generated.ts');
const zhTxtPath = join(root, 'private', 'tao-te-ching.zh.txt');
const outPath = join(root, 'public', 'stroke-data.json');

const DATA_VERSION = '2.0.1';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const missingOnly = args.includes('--missing');

function distinctChars() {
  if (existsSync(generatedPath)) {
    const src = readFileSync(generatedPath, 'utf8');
    const chars = new Set();
    for (const m of src.matchAll(/"(?:zh|titleZh)":"((?:[^"\\]|\\.)*)"/g)) {
      try {
        for (const ch of JSON.parse(`"${m[1]}"`)) {
          if (/\p{Script=Han}/u.test(ch)) chars.add(ch);
        }
      } catch {
        // ignore a single malformed escape; the generator guards shape
      }
    }
    return chars;
  }
  if (existsSync(zhTxtPath)) {
    return new Set(
      [...readFileSync(zhTxtPath, 'utf8')].filter((ch) => /\p{Script=Han}/u.test(ch)),
    );
  }
  console.error(
    'error: no character source found (expected src/data/tao-te-ching.generated.ts or private/tao-te-ching.zh.txt).',
  );
  process.exit(1);
}

const chars = distinctChars();
const strokes = {};
const absent = [];

for (const ch of [...chars].sort()) {
  const local = join(legacyDir, `${ch}.json`);
  if (existsSync(local)) {
    try {
      const json = JSON.parse(readFileSync(local, 'utf8'));
      if (Array.isArray(json.strokes) && Array.isArray(json.medians)) {
        strokes[ch] = { strokes: json.strokes, medians: json.medians };
        continue;
      }
    } catch {
      // fall through to CDN
    }
  }
  try {
    const res = await fetch(
      `https://cdn.jsdelivr.net/npm/hanzi-writer-data@${DATA_VERSION}/${encodeURIComponent(ch)}.json`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json.strokes) || !Array.isArray(json.medians)) {
      throw new Error('unexpected shape');
    }
    strokes[ch] = { strokes: json.strokes, medians: json.medians };
  } catch {
    absent.push(ch);
  }
}

if (missingOnly) {
  console.log(absent.join(''));
  process.exit(0);
}

console.log(`distinct Han: ${chars.size} covered: ${Object.keys(strokes).length} absent: ${absent.length}`);
if (absent.length > 0) console.log(`absent (CDN fallback at runtime): ${absent.join(' ')}`);
if (dryRun) process.exit(0);

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(
  outPath,
  JSON.stringify({
    meta: {
      source: `hanzi-writer-data@${DATA_VERSION}`,
      license: 'ARPHIC PUBLIC LICENSE (Make Me a Hanzi data)',
      attribution: 'Stroke data: Make Me a Hanzi / Arphic license.',
      characters: Object.keys(strokes).length,
    },
    strokes,
  }),
);
const bytes = Buffer.byteLength(JSON.stringify({ strokes }));
console.log(`out: ${outPath} (${(bytes / 1024 / 1024).toFixed(2)} MB strokes payload)`);
