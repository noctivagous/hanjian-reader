import type { Doc } from '../data/types';
import { allSentences, sentenceEn } from './doc.ts';

/**
 * TMX 1.4 export: the translation-memory format designed for storing
 * original text alongside its translations (the TASKS.md pairing for
 * the EPUB item). One translation unit per sentence: the Chinese
 * source segment and the active (primary) translation's segment.
 */

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildTmx(doc: Doc): string {
  const units = allSentences(doc)
    .map((s) => {
      const en = sentenceEn(s);
      const enTuv = en
        ? `\n    <tuv xml:lang="en"><seg>${escapeXml(en)}</seg></tuv>`
        : '';
      return `  <tu tuid="${escapeXml(s.id)}">\n    <tuv xml:lang="zh"><seg>${escapeXml(s.zh)}</seg></tuv>${enTuv}\n  </tu>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<tmx version="1.4">
  <header creationtool="HanJian Reader" creationtoolversion="0.1.0" segtype="sentence" datatype="plaintext" adminlang="en" srclang="zh" o-tmf="hanjian" />
  <body>
${units}
  </body>
</tmx>
`;
}

export function downloadTmx(doc: Doc): void {
  const blob = new Blob([buildTmx(doc)], {
    type: 'application/x-tmx+xml;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.id.replace(/[^a-zA-Z0-9_-]+/g, '-')}.tmx`;
  a.click();
  URL.revokeObjectURL(url);
}
