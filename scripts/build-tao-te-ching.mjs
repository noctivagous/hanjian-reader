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

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const privateDir = join(root, 'private');
const enPath = join(privateDir, 'tao-te-ching.en.txt');
const defaultZhPath = join(privateDir, 'tao-te-ching.zh.txt');
const defaultXlf =
  ['tao-te-ching.xlf', 'tao-te-ching.xliff']
    .map((f) => join(privateDir, f))
    .find((p) => existsSync(p)) ?? null;
const outPath = join(root, 'src', 'data', 'tao-te-ching.generated.ts');

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

// --- Minimal XLIFF reader (1.2 and 2.0) ---
//
// Only the structural elements the contract needs are understood: file,
// group, trans-unit, unit, segment, source, target. Inline elements inside
// source/target (<g>, <x/>, <ph/>, …) are dropped, keeping their text.
// Attributes containing `>` are not supported — keep them simple.

function unescapeXml(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

const cleanText = (s) =>
  unescapeXml(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

function parseXliff(xml, label) {
  // Tiny stack parser building { kind, children } nodes; source/target
  // nodes also gather raw text.
  const STRUCT = new Set(['file', 'group', 'trans-unit', 'unit', 'segment']);
  const rootNode = { kind: 'root', children: [] };
  const stack = [rootNode];
  const tagRe = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<(\/?)([a-zA-Z][\w.-]*)\b[^>]*?(\/?)>|([^<]+)/g;
  let m;
  let files = 0;
  while ((m = tagRe.exec(xml))) {
    const [, close, name, selfClose, text] = m;
    if (text !== undefined) {
      const top = stack[stack.length - 1];
      if (top.kind === 'source' || top.kind === 'target') top.text += text;
      continue;
    }
    if (name === undefined) continue; // comment / PI / doctype
    const kind = name.toLowerCase();
    if (close) {
      if (
        stack.length > 1 &&
        stack[stack.length - 1].kind === kind &&
        (STRUCT.has(kind) || kind === 'source' || kind === 'target')
      ) {
        stack.pop();
      }
      continue;
    }
    if (kind === 'source' || kind === 'target') {
      const node = { kind, children: [], text: '' };
      stack[stack.length - 1].children.push(node);
      if (!selfClose) stack.push(node);
    } else if (STRUCT.has(kind)) {
      const node = { kind, children: [] };
      stack[stack.length - 1].children.push(node);
      if (kind === 'file') files += 1;
      if (!selfClose) stack.push(node);
    }
    // Anything else (xliff root, skeleton, inline tags, …) is ignored;
    // inline tags inside source/target vanish but their text is kept.
  }
  if (files === 0) {
    console.error(`error: ${label} contains no <file> elements; not XLIFF?`);
    process.exit(1);
  }
  return rootNode.children.filter((c) => c.kind === 'file');
}

const unitText = (unit, side) =>
  cleanText(
    (unit.children.find((c) => c.kind === side)?.text ?? ''),
  );

function sentencesOf(container) {
  // Explicit segmentation: each segment (2.0) or trans-unit/unit (1.2)
  // is one sentence, in document order.
  const out = [];
  for (const child of container.children) {
    if (child.kind === 'segment' || child.kind === 'trans-unit') {
      out.push({ zh: unitText(child, 'source'), en: unitText(child, 'target') });
    } else if (child.kind === 'unit') {
      const segs = child.children.filter((c) => c.kind === 'segment');
      if (segs.length > 0) {
        for (const s of segs) {
          out.push({ zh: unitText(s, 'source'), en: unitText(s, 'target') });
        }
      } else {
        out.push({ zh: unitText(child, 'source'), en: unitText(child, 'target') });
      }
    }
  }
  return out;
}

function chaptersFromXliff(files, label) {
  let chapters = files;
  if (files.length === 1) {
    const groups = files[0].children.filter((c) => c.kind === 'group');
    const units = files[0].children.filter(
      (c) => c.kind === 'unit' || c.kind === 'trans-unit',
    );
    if (groups.length === 81) chapters = groups;
    else if (units.length === 81) chapters = units;
    else {
      console.error(
        `error: ${label} has 1 <file> with ${groups.length} <group>s and ${units.length} <unit>s; expected 81 <file>s, or 1 <file> with 81 <group> or 81 <unit> chapters.`,
      );
      process.exit(1);
    }
  } else if (files.length !== 81) {
    console.error(
      `error: ${label} has ${files.length} <file>s; expected 81 chapter <file>s, or 1 <file> with 81 <group> or 81 <unit> chapters.`,
    );
    process.exit(1);
  }
  return chapters.map((ch, i) => {
    const n = i + 1;
    const groups = ch.children.filter((c) => c.kind === 'group');
    const paraNodes = groups.length > 0 ? groups : [ch];
    const paras = paraNodes.map((g) => {
      const nested = g.children.filter((c) => c.kind === 'group');
      const sents =
        nested.length > 0 ? nested.flatMap(sentencesOf) : sentencesOf(g);
      return sents;
    });
    const flat = paras.flat();
    if (flat.length === 0 || flat.some((s) => !s.zh || !s.en)) {
      console.error(
        `error: chapter ${n} has an empty Chinese or English side (every unit needs non-empty <source> and <target>).`,
      );
      process.exit(1);
    }
    return paras;
  });
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
const warnings = [];
if (xlfPath) {
  if (!existsSync(xlfPath)) {
    console.error(`error: --xlf-file not found: ${xlfPath}`);
    process.exit(1);
  }
  const files = parseXliff(readFileSync(xlfPath, 'utf8'), xlfPath);
  chapters = chaptersFromXliff(files, xlfPath);
  enSource = `${xlfPath} (XLIFF)`;
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

const sections = chapters.map((paras, i) => {
  const n = i + 1;
  let k = 0;
  const paragraphs = paras.map((sents, p) => {
    const paraSents = sents.map(({ zh, en }) => {
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
            text: en,
            words: [],
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

console.log(`81 chapters, ${sentences} sentences, 0 empty sides, 0 unaccounted source lines`);
console.log(`distinct Chinese characters: ${distinct} (check P0-2 readings + P0-3 stroke coverage)`);
console.log(`en source: ${enSource}`);
if (!xlfPath) console.log(`zh source: ${zhSourceLabel}`);
console.log(`out: ${outPath} (gitignored)`);
for (const w of warnings) console.warn(`warn: ${w}`);
