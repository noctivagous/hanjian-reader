// Fetch missing hanzi-writer stroke JSON for the Tao Te Ching's distinct
// characters so the book works offline. Runtime already falls back to the
// CDN (see src/components/StrokeOrder.tsx); self-hosted files in
// public/hanzi-data/ simply win first.
//
// Usage:
//   node scripts/fetch-hanzi-data.mjs            # fetch all missing
//   node scripts/fetch-hanzi-data.mjs --dry-run  # list missing, fetch nothing
//   node scripts/fetch-hanzi-data.mjs --missing   # print missing chars only
//
// Source of truth for "distinct characters": the generated local book module
// (gitignored, emitted by scripts/build-tao-te-ching.mjs). When it is absent
// (clean clone), falls back to private/tao-te-ching.zh.txt.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'public', 'hanzi-data');
const generatedPath = join(root, 'src', 'data', 'tao-te-ching.generated.ts');
const zhTxtPath = join(root, 'private', 'tao-te-ching.zh.txt');

const DATA_VERSION = '2.0.1';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const missingOnly = args.includes('--missing');

function collectHan(text) {
  const out = new Set();
  for (const ch of text) {
    if (/\p{Script=Han}/u.test(ch)) out.add(ch);
  }
  return out;
}

function distinctChars() {
  if (existsSync(generatedPath)) {
    const src = readFileSync(generatedPath, 'utf8');
    const chars = new Set();
    // Sentence text ("zh") plus section/book titles ("titleZh"): titles
    // render as plain text but their characters should still resolve.
    for (const m of src.matchAll(/"(?:zh|titleZh)":"((?:[^"\\]|\\.)*)"/g)) {
      try {
        for (const ch of JSON.parse(`"${m[1]}"`)) {
          if (/\p{Script=Han}/u.test(ch)) chars.add(ch);
        }
      } catch {
        // ignore a single malformed escape; the generator guards shape
      }
    }
    return { chars, source: generatedPath };
  }
  if (existsSync(zhTxtPath)) {
    return {
      chars: collectHan(readFileSync(zhTxtPath, 'utf8')),
      source: zhTxtPath,
    };
  }
  console.error(
    'error: no character source found (expected src/data/tao-te-ching.generated.ts or private/tao-te-ching.zh.txt).',
  );
  process.exit(1);
}

const { chars, source } = distinctChars();
const have = new Set(
  existsSync(dataDir)
    ? readdirSync(dataDir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.slice(0, -'.json'.length))
    : [],
);
const missing = [...chars].filter((c) => !have.has(c)).sort();

if (missingOnly) {
  console.log(missing.join(''));
  process.exit(0);
}

console.log(`source: ${source}`);
console.log(`distinct Han: ${chars.size} have: ${have.size} missing: ${missing.length}`);
if (missing.length === 0) {
  console.log('stroke data complete — nothing to fetch.');
  process.exit(0);
}
if (dryRun) {
  console.log(`missing: ${missing.join(' ')}`);
  process.exit(0);
}

mkdirSync(dataDir, { recursive: true });
let fetched = 0;
const failed = [];
for (const ch of missing) {
  const url = `https://cdn.jsdelivr.net/npm/hanzi-writer-data@${DATA_VERSION}/${encodeURIComponent(ch)}.json`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json.strokes) || !Array.isArray(json.medians)) {
      throw new Error('unexpected shape');
    }
    writeFileSync(join(dataDir, `${ch}.json`), JSON.stringify(json));
    fetched++;
  } catch (err) {
    failed.push(`${ch} (${err.message})`);
  }
}
console.log(`fetched: ${fetched} failed: ${failed.length}`);
for (const f of failed) console.warn(`warn: ${f}`);
if (failed.length > 0) process.exit(1);
