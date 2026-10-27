import type { Doc, Paragraph } from '../data/types';

// Splits pasted English + Chinese into aligned paragraphs/sentences.
// Paragraphs split on blank lines; sentences on [. ! ? 。！？].
// Word hover is disabled for imported docs (words: []).

export function importCustomDoc(
  enText: string,
  zhText: string,
  titleEn: string,
  titleZh: string,
): Doc {
  const stamp = Date.now();
  const enParas = enText.split(/\n\s*\n/).filter(Boolean);
  const zhParas = zhText.split(/\n\s*\n/).filter(Boolean);

  const paragraphs: Paragraph[] = enParas.map((enPara, pIdx) => {
    const zhPara = zhParas[pIdx] || '';
    const enSentences = enPara.split(/(?<=[.!?])\s+/).filter(Boolean);
    const zhSentences = zhPara.split(/(?<=[。！？])\s*/).filter(Boolean);
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
