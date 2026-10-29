// Shared chapter/sentence grouping for Tao build + hover override generator.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { xliffChapters } from './xliff-docs.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const privateDir = join(root, 'private');
const enPath = join(privateDir, 'tao-te-ching.en.txt');
const defaultZhPath = join(privateDir, 'tao-te-ching.zh.txt');
const defaultXlf =
  ['tao-te-ching.xlf', 'tao-te-ching.xliff']
    .map((f) => join(privateDir, f))
    .find((p) => existsSync(p)) ?? null;

export function splitChapters(text, label) {
  const chapters = text
    .split(/^\s*---\s*$/m)
    .map((c) => c.replace(/^\s+|\s+$/g, ''));
  const empty = chapters.filter((c) => !c).length;
  if (chapters.length !== 81 || empty > 0) {
    throw new Error(
      `${label} has ${chapters.length} chapters (${empty} empty); expected 81.`,
    );
  }
  return chapters;
}

export const splitParas = (chapter) =>
  chapter
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

export function splitZhSentences(para) {
  const parts = para.match(/[^。；！？]+[。；！？]?/g) ?? [];
  return parts.map((s) => s.trim()).filter(Boolean);
}

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

async function loadZh(zhPath) {
  if (zhPath && existsSync(zhPath)) {
    return {
      chapters: splitChapters(readFileSync(zhPath, 'utf8'), zhPath),
      source: zhPath,
    };
  }
  throw new Error(`missing Chinese source: ${zhPath}`);
}

/** @returns {Promise<{ autoChapters: {zh:string,en:string}[][][], srcChapters: {zh:string,en:string}[], enSource: string }>} */
export async function loadTaoChapterData({ zhPath = defaultZhPath, xlfPath = defaultXlf } = {}) {
  let autoChapters;
  let enSource;
  let srcChapters;

  if (xlfPath && existsSync(xlfPath)) {
    autoChapters = xliffChapters(readFileSync(xlfPath, 'utf8'), xlfPath);
    enSource = `${xlfPath} (XLIFF)`;
    srcChapters = autoChapters.map((paras) => ({
      zh: paras.flat().map((s) => s.zh).join('\n'),
      en: paras.flat().map((s) => s.en).join('\n'),
    }));
    return { autoChapters, srcChapters, enSource };
  }

  if (!existsSync(enPath)) {
    throw new Error(`missing ${enPath} and no XLIFF`);
  }
  const enChapters = splitChapters(readFileSync(enPath, 'utf8'), enPath);
  const { chapters: zhChapters } = await loadZh(zhPath);
  enSource = enPath;
  srcChapters = zhChapters.map((zh, i) => ({ zh, en: enChapters[i] }));
  autoChapters = zhChapters.map((zhChapter, i) => {
    const zhParas = splitParas(zhChapter);
    const enLines = enChapters[i]
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const zhSents = zhParas.flatMap(splitZhSentences);
    if (zhSents.length === 0 || enLines.length === 0) {
      throw new Error(`chapter ${i + 1} has an empty side`);
    }
    const groups = zhSents.map((_, k) => {
      const a = Math.floor((k * enLines.length) / zhSents.length);
      const b = Math.floor(((k + 1) * enLines.length) / zhSents.length);
      return enLines.slice(a, Math.max(b, a + 1)).join(' ');
    });
    let k = 0;
    return zhParas.map((zhPara) =>
      splitZhSentences(zhPara).map((zh) => ({ zh, en: groups[k++] })),
    );
  });

  return { autoChapters, srcChapters, enSource };
}
