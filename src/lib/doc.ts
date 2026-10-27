import type { Doc, Paragraph, Sentence, Translation } from '../data/types';

// Accessors for the sectioned, multi-translation Doc model.
// Until a translator picker exists, the active translation is the first one.

export function primaryTranslation(sentence: Sentence): Translation | undefined {
  return sentence.translations[0];
}

export function sentenceEn(sentence: Sentence): string {
  return primaryTranslation(sentence)?.text ?? '';
}

export function allParagraphs(doc: Doc): Paragraph[] {
  return doc.sections.flatMap((s) => s.paragraphs);
}

export function allSentences(doc: Doc): Sentence[] {
  return allParagraphs(doc).flatMap((p) => p.sentences);
}

export function paragraphEn(paragraph: Paragraph): string {
  return paragraph.sentences.map(sentenceEn).filter(Boolean).join(' ');
}

export function englishText(doc: Doc): string {
  return allParagraphs(doc).map(paragraphEn).join('\n\n');
}

export function chineseText(doc: Doc): string {
  return allParagraphs(doc)
    .map((p) => p.zh)
    .join('\n\n');
}

export function bilingualText(doc: Doc): string {
  return allParagraphs(doc)
    .map((p) => `${paragraphEn(p)}\n${p.zh}`)
    .join('\n\n');
}
