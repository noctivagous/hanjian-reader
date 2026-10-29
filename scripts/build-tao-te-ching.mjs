// Build-time generator (local-only): private/* -> gitignored
// src/data/tao-te-ching.generated.ts, picked up opportunistically by
// src/data/localDocs.ts. The English input is in-copyright and must never
// be committed; both the input and the output are .gitignored (see
// private/README.md).
//
// Usage: node scripts/build-tao-te-ching.mjs [--zh-file <path>] [--xlf-file <path>]
//
// Two input styles (XLIFF preferred when available, .txt otherwise):
//   private/tao-te-ching.xlf/.xliff  XLIFF 1.2 or 2.0: 81 <file> elements as
//                                    chapters (or 1 <file> with 81 <group>s);
//                                    <group> = paragraph, <trans-unit> (1.2)
//                                    or <segment> (2.0) = sentence,
//                                    <source> = Chinese, <target> = English.
//   private/tao-te-ching.en.txt       (fallback) chapters 1-81 in order,
//                                    separated by `---` lines; a blank line
//                                    inside a chapter starts a paragraph.
//   private/tao-te-ching.zh.txt       (optional, .txt mode only) same layout
//                                    as the .en.txt. When absent, the
//                                    public-domain Wang Bi text is fetched
//                                    from Chinese Wikisource; --zh-file
//                                    overrides. XLIFF mode carries both
//                                    languages, so no zh file is needed.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadTaoDictLookup,
  loadTaoSegmenter,
  locateAuthoredWords,
  proposeHoverWords,
} from './tao-sentence-alignments.mjs';
import { TAO_GLOSSARY } from './tao-te-ching-glossary.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const privateDir = join(root, 'private');
const enPath = join(privateDir, 'tao-te-ching.en.txt');
const defaultZhPath = join(privateDir, 'tao-te-ching.zh.txt');
const defaultXlf =
  ['tao-te-ching.xlf', 'tao-te-ching.xliff']
    .map((f) => join(privateDir, f))
    .find((p) => existsSync(p)) ?? null;
const outPath = join(root, 'src', 'data', 'tao-te-ching.generated.ts');
const alignmentPath = join(privateDir, 'tao-te-ching.alignments.json');

const WIKISOURCE_RAW =
  'https://zh.wikisource.org/w/index.php?title=%E9%81%93%E5%BE%B7%E7%B6%93_(%E7%8E%8B%E5%BC%BC%E6%9C%AC)&action=raw';

const args = process.argv.slice(2);
function flagValue(name) {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  if (!args[i + 1]) {
    console.error(`usage: node scripts/build-tao-te-ching.mjs [--zh-file <path>] [--xlf-file <path>]`);
    process.exit(1);
  }
  return args[i + 1];
}
const zhPath = flagValue('--zh-file') ?? defaultZhPath;
const xlfPath = flagValue('--xlf-file') ?? defaultXlf;

function splitChapters(text, label) {
  const chapters = text
    .split(/^\s*---\s*$/m)
    .map((c) => c.replace(/^\s+|\s+$/g, ''));
  const empty = chapters.filter((c) => !c).length;
  if (chapters.length !== 81 || empty > 0) {
    console.error(
      `error: ${label} has ${chapters.length} chapters (${empty} empty); expected 81 non-empty chapters separated by \`---\` lines.`,
    );
    process.exit(1);
  }
  return chapters;
}

const splitParas = (chapter) =>
  chapter
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

function splitZhSentences(para) {
  const parts = para.match(/[^。；！？]+[。；！？]?/g) ?? [];
  return parts.map((s) => s.trim()).filter(Boolean);
}

const NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
function chapterZh(n) {
  // Supports 1-99, enough for 81 chapters.
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  let s = '';
  if (tens === 0) s = NUM[ones];
  else if (tens === 1) s = `十${ones ? NUM[ones] : ''}`;
  else s = `${NUM[tens]}十${ones ? NUM[ones] : ''}`;
  return `第${s}章`;
}

// XLIFF input lives in ./xliff-docs.mjs (pure, tested): fast-xml-parser
// handles tokenizing, entities, CDATA, and namespaces; this script keeps
// only the chapter/shape contract and the .txt fallback below.
import { xliffChapters } from './xliff-docs.mjs';

function stripWikiMarkup(raw) {
  return raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/-\{([^{}]+)\}-/g, '$1')
    .replace(/﹗/g, '！')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[[^\]|]*\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/^[=\s]*[一二三四五六七八九十百千\d\s·・.、]*章[=\s]*$/gm, '\n---\n')
    .replace(/[ \t]+/g, ' ');
}

async function loadZh() {
  if (zhPath && existsSync(zhPath)) {
    return {
      chapters: splitChapters(readFileSync(zhPath, 'utf8'), zhPath),
      source: zhPath,
    };
  }
  if (args.includes('--zh-file')) {
    console.error(`error: --zh-file not found: ${zhPath}`);
    process.exit(1);
  }
  console.log('zh file absent; fetching Wang Bi text from Wikisource…');
  let raw;
  try {
    const res = await fetch(WIKISOURCE_RAW);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    raw = await res.text();
  } catch (err) {
    console.error(
      `error: could not fetch Wikisource text (${err}).\n` +
        `Save the Chinese text as ${defaultZhPath} (81 \`---\`-separated chapters) and re-run.`,
    );
    process.exit(1);
  }
  const chapters = stripWikiMarkup(raw)
    .split(/^\s*---\s*$/m)
    .map((c) => c.replace(/^\s+|\s+$/g, ''))
    .filter(Boolean);
  if (chapters.length !== 81) {
    console.error(
      `error: Wikisource parse yielded ${chapters.length} chapters, expected 81.\n` +
        `Save the Chinese text as ${defaultZhPath} (81 \`---\`-separated chapters) and re-run.`,
    );
    process.exit(1);
  }
  return { chapters, source: 'Chinese Wikisource (Wang Bi received text)' };
}

// Each chapter: array of paragraphs; each paragraph: array of { zh, en }.
let chapters;
let enSource;
let zhSourceLabel = null;
// Raw per-chapter sources backing the override guards: { zh, en } text.
let srcChapters = [];
const warnings = [];
if (xlfPath) {
  if (!existsSync(xlfPath)) {
    console.error(`error: --xlf-file not found: ${xlfPath}`);
    process.exit(1);
  }
  try {
    chapters = xliffChapters(readFileSync(xlfPath, 'utf8'), xlfPath);
  } catch (err) {
    console.error(`error: ${err.message}`);
    process.exit(1);
  }
  enSource = `${xlfPath} (XLIFF)`;
  srcChapters = chapters.map((paras) => ({
    zh: paras.flat().map((s) => s.zh).join('\n'),
    en: paras.flat().map((s) => s.en).join('\n'),
  }));
} else {
  if (!existsSync(enPath)) {
    console.error(
      `error: missing ${enPath} (and no private/tao-te-ching.xlf|.xliff found).\n` +
        'Place your copy of the Feng & English translation there (81 `---`-separated chapters) or as XLIFF. See private/README.md. This file is never committed.',
    );
    process.exit(1);
  }
  const enChapters = splitChapters(readFileSync(enPath, 'utf8'), enPath);
  const { chapters: zhChapters, source: zhSource } = await loadZh();
  enSource = enPath;
  srcChapters = zhChapters.map((zh, i) => ({ zh, en: enChapters[i] }));
  chapters = zhChapters.map((zhChapter, i) => {
    const n = i + 1;
    const zhParas = splitParas(zhChapter);
    const enLines = enChapters[i]
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const zhSents = zhParas.flatMap(splitZhSentences);
    if (zhSents.length === 0 || enLines.length === 0) {
      console.error(`error: chapter ${n} has an empty Chinese or English side.`);
      process.exit(1);
    }
    // Clause-by-clause grouping: spread the English lines over the Chinese
    // clauses as evenly as possible so every source line is accounted for.
    const groups = zhSents.map((_, k) => {
      const a = Math.floor((k * enLines.length) / zhSents.length);
      const b = Math.floor(((k + 1) * enLines.length) / zhSents.length);
      return enLines.slice(a, Math.max(b, a + 1)).join(' ');
    });
    if (enLines.length < zhSents.length) {
      warnings.push(
        `chapter ${n}: ${enLines.length} English lines for ${zhSents.length} Chinese clauses (some lines reused)`,
      );
    }
    let k = 0;
    return zhParas.map((zhPara) =>
      splitZhSentences(zhPara).map((zh) => ({ zh, en: groups[k++] })),
    );
  });
  zhSourceLabel = zhSource;
}

const TRANSLATOR = 'Gia-fu Feng & Jane English';
const LICENSE = 'In copyright — local/private use only, do not distribute';
let sentences = 0;
const segmentZh = await loadTaoSegmenter();
const dictLookup = await loadTaoDictLookup();
const alignmentUnits = {};

// Hand alignment overrides (local-only, gitignored like the sources — they
// quote the in-copyright translation, so they must never be committed).
// Shape: { "<chapter>": [ [ { zh, en, words? }, … ], … ] } (paragraphs of pairs).
// Optional `words`: [{ en, zh, pinyin?, def? }] hover rows (offsets computed at build).
// An override replaces the automatic alignment for that chapter wholesale.
const overridesPath = join(privateDir, 'tao-te-ching.overrides.json');
let overrides = {};
if (existsSync(overridesPath)) {
  try {
    overrides = JSON.parse(readFileSync(overridesPath, 'utf8'));
  } catch (err) {
    console.error(`error: cannot parse ${overridesPath} (${err.message})`);
    process.exit(1);
  }
  for (const [key, paras] of Object.entries(overrides)) {
    const n = Number(key);
    if (!Number.isInteger(n) || n < 1 || n > 81 || !Array.isArray(paras)) {
      console.error(`error: bad override key ${JSON.stringify(key)} (want "1"–"81" mapping to paragraphs of {zh,en} pairs)`);
      process.exit(1);
    }
    const flat = paras.flat();
    if (flat.length === 0 || flat.some((s) => !s?.zh?.trim() || !s?.en?.trim())) {
      console.error(`error: override chapter ${n} has an empty Chinese or English side`);
      process.exit(1);
    }
    for (const s of flat) {
      if (s.words !== undefined && !Array.isArray(s.words)) {
        console.error(`error: override chapter ${n} has invalid words field`);
        process.exit(1);
      }
    }
  }
  // Guards: every override sentence must come from its own chapter's
  // sources (typos), and together the pairs must account for the whole
  // chapter (coverage) — no dropped or altered text on either side.
  // Compared on whitespace-stripped joins, so regrouping and mid-line
  // splits pass but additions, losses, and edits fail loudly.
  const norm = (s) => s.replace(/\s+/g, '');
  for (const [key, paras] of Object.entries(overrides)) {
    const n = Number(key);
    const src = norm(srcChapters[n - 1].zh + '\n' + srcChapters[n - 1].en);
    for (const s of paras.flat()) {
      for (const side of [s.zh, s.en]) {
        if (!src.includes(norm(side))) {
          console.error(`error: override chapter ${key} quotes text not found in its chapter sources: ${JSON.stringify(side.slice(0, 60))}`);
          process.exit(1);
        }
      }
    }
    const ovZh = norm(paras.flat().map((s) => s.zh).join(''));
    const ovEn = norm(paras.flat().map((s) => s.en).join(''));
    if (ovZh !== norm(srcChapters[n - 1].zh)) {
      console.error(`error: override chapter ${n} drops or alters Chinese text`);
      process.exit(1);
    }
    if (ovEn !== norm(srcChapters[n - 1].en)) {
      console.error(`error: override chapter ${n} drops or alters English text`);
      process.exit(1);
    }
  }
  chapters = chapters.map((paras, i) => overrides[String(i + 1)] ?? paras);
  // Overridden chapters carry explicit alignments: their auto-split reuse
  // warnings no longer apply.
  for (let i = warnings.length - 1; i >= 0; i--) {
    if (overrides[String(warnings[i].match(/^chapter (\d+):/)?.[1])]) {
      warnings.splice(i, 1);
    }
  }
  console.log(`hand-aligned chapters: ${Object.keys(overrides).join(', ')}`);
}

const sections = chapters.map((paras, i) => {
  const n = i + 1;
  let k = 0;
  const paragraphs = paras.map((sents, p) => {
    const paraSents = sents.map(({ zh, en, words: handWords }) => {
      const id = `tao-ch${n}-p${p + 1}s${k + 1}`;
      const proposed =
        handWords?.length > 0
          ? handWords
          : proposeHoverWords(zh, en, segmentZh, dictLookup, TAO_GLOSSARY);
      const words = locateAuthoredWords(en, proposed);
      alignmentUnits[id] = words;
      const s = {
        id,
        zh,
        translations: [
          {
            id: 'en',
            language: 'en',
            label: 'English',
            translator: TRANSLATOR,
            license: LICENSE,
            text: en,
            words,
          },
        ],
      };
      k += 1;
      return s;
    });
    return {
      id: `tao-ch${n}-p${p + 1}`,
      zh: sents.map((s) => s.zh).join(''),
      sentences: paraSents,
    };
  });
  sentences += k;
  return {
    id: `tao-ch${n}`,
    titleEn: `Chapter ${n}`,
    titleZh: chapterZh(n),
    paragraphs,
  };
});

const distinct = new Set(sections.flatMap((s) => [...s.paragraphs.flatMap((p) => [...p.zh])]).join('')).size;

const doc = {
  format: 'hanjian',
  version: 1,
  id: 'tao-te-ching',
  titleEn: 'Tao Te Ching',
  titleZh: '道德經',
  author: `Laozi · 老子 · trans. ${TRANSLATOR}`,
  sourceLanguage: 'zh',
  script: 'traditional',
  license: LICENSE,
  sections,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(
  outPath,
  `// GENERATED — do not edit or commit. Local-only book data emitted by\n// scripts/build-tao-te-ching.mjs from in-copyright private/ sources.\n// The Feng & English translation is ${LICENSE}.\nimport type { Doc } from './types';\n\nexport const taoTeChing: Doc = ${JSON.stringify(doc)};\n`,
);

writeFileSync(
  alignmentPath,
  `${JSON.stringify({ version: 1, units: alignmentUnits }, null, 2)}\n`,
);

console.log(`81 chapters, ${sentences} sentences, 0 empty sides, 0 unaccounted source lines`);
console.log(`alignments: ${alignmentPath} (${Object.keys(alignmentUnits).length} units)`);
console.log(`distinct Chinese characters: ${distinct} (check P0-2 readings + P0-3 stroke coverage)`);
console.log(`en source: ${enSource}`);
if (!xlfPath) console.log(`zh source: ${zhSourceLabel}`);
console.log(`out: ${outPath} (gitignored)`);
for (const w of warnings) console.warn(`warn: ${w}`);
