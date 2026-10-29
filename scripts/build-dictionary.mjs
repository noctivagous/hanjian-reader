// Build-time generator: CC-CEDICT (raw download, NOT committed) ->
// public/dict/cedict.json (trimmed, committed, lazy-loaded at runtime).
//
// Usage: node scripts/build-dictionary.mjs /path/to/cedict.txt
// The raw file comes from https://www.mdbg.net/chinese/dictionary?page=cedict
// (CC BY-SA 4.0; provenance is recorded in the output meta block).
//
// Output shape:
//   { meta: {...}, entries: { <simp>: [[markedPinyin, "def1; def2"], ...] },
//     aliases: { <trad>: <simp> } }   // only when trad != simp
// Lookup tries the text as-is, then resolves one traditional alias.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, 'public', 'dict', 'cedict.json');

const MARKS = {
  a: ['ā', 'á', 'ǎ', 'à'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
};

function markSyllable(raw) {
  let syl = raw.toLowerCase().replace(/u:/g, 'ü');
  const m = syl.match(/^([a-zü]+)([1-5])$/);
  if (!m) return syl;
  const base = m[1];
  const tone = Number(m[2]);
  if (tone === 5 || !/[aeiouü]/.test(base)) return base;
  const at = (ch, from = 0) => {
    const i = base.indexOf(ch, from);
    return base.slice(0, i) + MARKS[ch][tone - 1] + base.slice(i + 1);
  };
  if (base.includes('a')) return at('a');
  if (base.includes('o')) return at('o');
  if (base.includes('e')) return at('e');
  if (base.includes('iu')) return at('u');
  if (base.includes('ui')) return at('i', 1);
  const vowels = [...base].filter((c) => 'iuü'.includes(c));
  const last = vowels[vowels.length - 1];
  return at(last, base.lastIndexOf(last));
}

function markPinyin(numbered) {
  return numbered
    .split(/\s+/)
    .filter(Boolean)
    .map(markSyllable)
    .join(' ');
}

const src = process.argv[2];
if (!src) {
  console.error('usage: node scripts/build-dictionary.mjs /path/to/cedict.txt');
  process.exit(1);
}

const entries = Object.create(null);
const aliases = Object.create(null);
let lines = 0;
let skipped = 0;

for (let raw of readFileSync(src, 'utf8').split('\n')) {
  const line = raw.replace(/\r$/, '');
  if (!line || line.startsWith('#')) continue;
  const m = line.match(/^(\S+) (\S+) \[(.+?)\] \/(.+)\/$/);
  if (!m) {
    skipped++;
    continue;
  }
  lines++;
  const [, trad, simp, pinyin, defs] = m;
  // Hover cards show the leading senses; the long tail of rare glosses
  // dominates file size, so keep the first three.
  const record = [markPinyin(pinyin), defs.split('/').slice(0, 3).join('; ')];
  (entries[simp] ??= []).push(record);
  if (trad !== simp) aliases[trad] = simp;
}

const payload = {
  meta: {
    source: 'CC-CEDICT (via MDBG)',
    download: 'https://www.mdbg.net/chinese/dictionary?page=cedict',
    release: '2026-10-29 01:05:57 GMT',
    retrieved: '2026-10-29',
    entries: lines,
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    attribution: 'Dictionary data from CC-CEDICT (cc-cedict.org), via MDBG.',
    notes:
      'Mainland Putonghua readings; polyphonic characters keep every entry ' +
      'in file order and callers take the first. See refs/chinese-dictionary.md.',
  },
  entries,
  aliases,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(payload));

const bytes = Buffer.byteLength(JSON.stringify(payload));
console.log(`lines: ${lines} skipped: ${skipped}`);
console.log(`headwords: ${Object.keys(entries).length} aliases: ${Object.keys(aliases).length}`);
console.log(`out: ${outPath} (${(bytes / 1024 / 1024).toFixed(2)} MB)`);

const glossCounts = Object.values(entries)
  .flat()
  .map((r) => r[1].split('; ').length);
glossCounts.sort((a, b) => a - b);
console.log(
  `glosses/record median: ${glossCounts[Math.floor(glossCounts.length / 2)]} ` +
    `p95: ${glossCounts[Math.floor(glossCounts.length * 0.95)]} ` +
    `max: ${glossCounts[glossCounts.length - 1]}`,
);
