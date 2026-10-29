// Fill `words` on every sentence in private/tao-te-ching.overrides.json.
// Preserves existing { zh, en } clause groupings; adds hover rows from
// Jiayan + scripts/tao-te-ching-glossary.mjs + CC-CEDICT.
//
// Usage: node scripts/generate-tao-hover-overrides.mjs

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTaoChapterData } from './tao-te-ching-chapters.mjs';
import { TAO_GLOSSARY } from './tao-te-ching-glossary.mjs';
import {
  loadTaoDictLookup,
  loadTaoSegmenter,
  proposeHoverWords,
} from './tao-sentence-alignments.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const privateDir = join(root, 'private');
const overridesPath = join(privateDir, 'tao-te-ching.overrides.json');

const { autoChapters, srcChapters } = await loadTaoChapterData();
const segmentZh = await loadTaoSegmenter();
const dictLookup = await loadTaoDictLookup();

/** @type {Record<string, {zh:string,en:string,words?:object[]}[][]>} */
let existing = {};
if (existsSync(overridesPath)) {
  existing = JSON.parse(readFileSync(overridesPath, 'utf8'));
}

const norm = (s) => s.replace(/\s+/g, '');
const out = {};

for (let i = 0; i < 81; i++) {
  const key = String(i + 1);
  const paras = existing[key] ?? autoChapters[i];
  out[key] = paras.map((para) =>
    para.map((sent) => {
      const zh = sent.zh;
      const en = sent.en;
      const words = proposeHoverWords(
        zh,
        en,
        segmentZh,
        dictLookup,
        TAO_GLOSSARY,
      );
      return { zh, en, words };
    }),
  );

  const ovZh = norm(out[key].flat().map((s) => s.zh).join(''));
  const ovEn = norm(out[key].flat().map((s) => s.en).join(''));
  if (ovZh !== norm(srcChapters[i].zh)) {
    console.error(`error: chapter ${key} Chinese coverage mismatch after merge`);
    process.exit(1);
  }
  if (ovEn !== norm(srcChapters[i].en)) {
    console.error(`error: chapter ${key} English coverage mismatch after merge`);
    process.exit(1);
  }
}

writeFileSync(overridesPath, `${JSON.stringify(out, null, 2)}\n`);

const totalWords = Object.values(out).flat(2).reduce((n, s) => n + s.words.length, 0);
console.log(`wrote ${overridesPath} (81 chapters, ${totalWords} hover words)`);
