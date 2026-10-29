// Build-time generator (local-only): private/*.txt -> gitignored
// src/data/tao-te-ching.generated.ts, picked up opportunistically by
// src/data/localDocs.ts. The English input is in-copyright and must never
// be committed; both the input and the output are .gitignored (see
// private/README.md).
//
// Usage: node scripts/build-tao-te-ching.mjs [--zh-file <path>]
//
// Inputs (chapter blocks separated by a line containing exactly `---`):
//   private/tao-te-ching.en.txt  (required) chapters 1-81 in order; a blank
//                                 line inside a chapter starts a paragraph.
//   private/tao-te-ching.zh.txt   (optional) same layout. When absent, the
//                                 public-domain Wang Bi text is fetched from
//                                 Chinese Wikisource; --zh-file overrides.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const privateDir = join(root, 'private');
const enPath = join(privateDir, 'tao-te-ching.en.txt');
const defaultZhPath = join(privateDir, 'tao-te-ching.zh.txt');
const outPath = join(root, 'src', 'data', 'tao-te-ching.generated.ts');

const WIKISOURCE_RAW =
  'https://zh.wikisource.org/w/index.php?title=%E9%81%93%E5%BE%B7%E7%B6%93_(%E7%8E%8B%E5%BC%BC%E6%9C%AC)&action=raw';

const args = process.argv.slice(2);
const zhFlag = args.indexOf('--zh-file');
const zhPath = zhFlag >= 0 ? args[zhFlag + 1] : defaultZhPath;
if (zhFlag >= 0 && !zhPath) {
  console.error('usage: node scripts/build-tao-te-ching.mjs [--zh-file <path>]');
  process.exit(1);
}

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

function stripWikiMarkup(raw) {
  return raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, '')
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
  if (zhFlag >= 0) {
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

if (!existsSync(enPath)) {
  console.error(
    `error: missing ${enPath}.\n` +
      'Place your copy of the Feng & English translation there (81 `---`-separated chapters). See private/README.md. This file is never committed.',
  );
  process.exit(1);
}

const enChapters = splitChapters(readFileSync(enPath, 'utf8'), enPath);
const { chapters: zhChapters, source: zhSource } = await loadZh();

const TRANSLATOR = 'Gia-fu Feng & Jane English';
const LICENSE = 'In copyright — local/private use only, do not distribute';
const warnings = [];
let sentences = 0;

const sections = zhChapters.map((zhChapter, i) => {
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
  sentences += zhSents.length;
  let k = 0;
  const paragraphs = zhParas.map((zhPara, p) => {
    const paraSents = splitZhSentences(zhPara).map((zh) => {
      const text = groups[k];
      const s = {
        id: `tao-ch${n}-p${p + 1}s${k + 1}`,
        zh,
        translations: [
          {
            id: 'en',
            language: 'en',
            label: 'English',
            translator: TRANSLATOR,
            license: LICENSE,
            text,
            words: [],
          },
        ],
      };
      k += 1;
      return s;
    });
    return { id: `tao-ch${n}-p${p + 1}`, zh: zhPara, sentences: paraSents };
  });
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

console.log(`81 chapters, ${sentences} sentences, 0 empty sides, 0 unaccounted source lines`);
console.log(`distinct Chinese characters: ${distinct} (check P0-2 readings + P0-3 stroke coverage)`);
console.log(`zh source: ${zhSource}`);
console.log(`out: ${outPath} (gitignored)`);
for (const w of warnings) console.warn(`warn: ${w}`);
