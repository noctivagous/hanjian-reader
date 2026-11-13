import type { Doc, Paragraph } from '../data/types';

// Splits pasted English + Chinese into aligned paragraphs/sentences.
// Paragraphs split on blank lines; sentences on [. ! ? 。！？].
// Word hover is disabled for imported docs (words: []).

export function splitParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).filter(Boolean);
}

export function splitEnSentences(para: string): string[] {
  return para.split(/(?<=[.!?])\s+/).filter(Boolean);
}

export function splitZhSentences(para: string): string[] {
  return para.split(/(?<=[。！？])\s*/).filter(Boolean);
}

export interface ImportAnalysis {
  enParagraphs: number;
  zhParagraphs: number;
  enSentences: number;
  zhSentences: number;
  /** Chinese paragraphs beyond the English count — import drops them. */
  droppedZhParagraphs: number;
  /** English paragraphs with no Chinese counterpart — import leaves them empty. */
  emptyZhParagraphs: number;
  /** Chinese sentences beyond the paired English ones — import drops them. */
  droppedZhSentences: number;
}

/**
 * Count what an import will produce (and what it will silently lose)
 * using the exact pairing rules importCustomDoc applies: paragraphs
 * pair by index against the English, sentences pair by index within
 * each paragraph.
 */
export function analyzeImport(enText: string, zhText: string): ImportAnalysis {
  const enParas = splitParagraphs(enText);
  const zhParas = splitParagraphs(zhText);
  let enSentences = 0;
  let zhSentences = 0;
  let droppedZhSentences = 0;
  enParas.forEach((enPara, pIdx) => {
    const enS = splitEnSentences(enPara).length;
    const zhS = splitZhSentences(zhParas[pIdx] || '').length;
    enSentences += enS;
    zhSentences += zhS;
    droppedZhSentences += Math.max(0, zhS - enS);
  });
  zhParas.forEach((zhPara, pIdx) => {
    if (pIdx < enParas.length) return;
    zhSentences += splitZhSentences(zhPara).length;
  });
  return {
    enParagraphs: enParas.length,
    zhParagraphs: zhParas.length,
    enSentences,
    zhSentences,
    droppedZhParagraphs: Math.max(0, zhParas.length - enParas.length),
    emptyZhParagraphs: Math.max(0, enParas.length - zhParas.length),
    droppedZhSentences,
  };
}

export function importCustomDoc(
  enText: string,
  zhText: string,
  titleEn: string,
  titleZh: string,
): Doc {
  const stamp = Date.now();
  const enParas = splitParagraphs(enText);
  const zhParas = splitParagraphs(zhText);

  const paragraphs: Paragraph[] = enParas.map((enPara, pIdx) => {
    const zhPara = zhParas[pIdx] || '';
    const enSentences = splitEnSentences(enPara);
    const zhSentences = splitZhSentences(zhPara);
    return {
      id: `cp_${stamp}_${pIdx}`,
      zh: zhPara,
      sentences: enSentences.map((en, sIdx) => ({
        id: `c_${stamp}_${pIdx}_${sIdx}`,
        zh: (zhSentences[sIdx] || '').trim(),
        translations: [
          {
            id: 'en',
            language: 'en',
            label: 'English',
            translator: '',
            text: en.trim(),
            words: [],
          },
        ],
      })),
    };
  });

  return {
    format: 'hanjian',
    version: 1,
    id: `custom_${stamp}`,
    titleEn: titleEn || 'Custom Document',
    titleZh: titleZh || '自定义文档',
    author: '',
    sourceLanguage: 'zh',
    sections: [
      {
        id: `custom_${stamp}-main`,
        titleEn: '',
        titleZh: '',
        paragraphs,
      },
    ],
  };
}
