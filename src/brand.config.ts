// ─── White-label configuration ─────────────────────────────────────────────
// This is the ONLY file a site owner edits to private-label the reader.
//
// 1. Change texts, theme colors, features, and defaults below.
// 2. Run `npm run build`.
// 3. Host the resulting `dist/` folder on any static website.
//
// Every field is optional: delete a line (or empty this object) to fall back
// to the default HanJian brand. Unknown keys and mistyped values are ignored
// safely (see `src/brand.ts`).
//
// Example — a minimal Spanish-first rebrand with only sentence reveal:
//
//   export const BRAND_OVERRIDE: BrandOverride = {
//     id: 'academia-lectora',
//     texts: {
//       appName: 'Lector',
//       appNameZh: '阅读',
//       tagline: 'Lector Paralelo',
//       logoGlyph: '阅',
//       documentTitle: 'Lector — Lector Paralelo',
//     },
//     theme: { accent: '#1D5CC7', accentSoft: '#EBF2FF' },
//     features: { words: false, paragraphs: false, full: false, import: false },
//     defaults: { primaryLang: 'zh' },
//   };

import type { BrandOverride } from './brand';

export const BRAND_OVERRIDE: BrandOverride = {
  // id: 'hanjian',
  // texts: {
  //   appName: 'HanJian',
  //   appNameZh: '涵简',
  //   tagline: 'Parallel Reader',
  //   logoGlyph: '涵',
  //   documentTitle: 'HanJian 涵简 — Parallel Reader',
  // },
  // theme: {
  //   paper: '#FFFEFB',
  //   paperDark: '#121210',
  //   ink: '#1A1A18',
  //   accent: '#C73E1D',
  //   accentSoft: '#FFF0EB',
  // },
  // features: {
  //   words: true,
  //   sentences: true,
  //   paragraphs: true,
  //   full: true,
  //   pinyin: true,
  //   zhuyin: true,
  //   definitions: true,
  //   toneColors: true,
  //   sentenceChips: true,
  //   charSize: true,
  //   fontSize: true,
  //   search: true,
  //   import: true,
  //   speech: true,
  //   speakerButtons: true,
  //   speakOnClick: true,
  //   darkMode: true,
  //   inspector: true,
  // },
  // defaults: {
  //   primaryLang: 'en',
  //   reveal: { words: true, sentences: false, paragraphs: false, full: false },
  //   showPinyin: true,
  //   showZhuyin: false,
  //   toneColors: true,
  //   defsInline: false,
  //   showSentenceChips: true,
  //   fontScale: 1,
  //   charSize: 1,
  //   dark: false,
  //   showSpeakerButtons: true,
  //   speakOnClick: false,
  // },
};
