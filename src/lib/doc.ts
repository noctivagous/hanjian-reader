import type { Doc, Paragraph, Sentence, Translation } from '../data/types';

// Accessors for the sectioned, multi-translation Doc model.
// The active translation is the first one in each sentence's list;
// the translator picker (selectTranslation below) works by rotating
// the reader's chosen translation to the front, so every accessor
// and view follows the choice without call-site changes.

export function primaryTranslation(sentence: Sentence): Translation | undefined {
  return sentence.translations[0];
}

/**
 * The distinct translations a document offers, in first-appearance
 * order. A document only offers a real choice when at least one
 * sentence carries more than one translation.
 */
export function docTranslations(doc: Doc): Translation[] {
  const seen = new Map<string, Translation>();
  for (const s of allSentences(doc)) {
    for (const t of s.translations) {
      if (!seen.has(t.id)) seen.set(t.id, t);
    }
  }
  return [...seen.values()];
}

export function docHasTranslationChoice(doc: Doc): boolean {
  return allSentences(doc).some((s) => s.translations.length > 1);
}

/**
 * Return the document with the named translation rotated to the
 * front of every sentence that carries it (sentences without it keep
 * their order). Returns the input unchanged when the id is absent or
 * already primary everywhere.
 */
export function selectTranslation(doc: Doc, translationId: string | undefined): Doc {
  if (!translationId) return doc;
  let changed = false;
  const sections = doc.sections.map((section) => ({
    ...section,
    paragraphs: section.paragraphs.map((p) => ({
      ...p,
      sentences: p.sentences.map((s) => {
        const idx = s.translations.findIndex((t) => t.id === translationId);
        if (idx <= 0) return s;
        changed = true;
        const chosen = s.translations[idx];
        return {
          ...s,
          translations: [
            chosen,
            ...s.translations.filter((t) => t.id !== translationId),
          ],
        };
      }),
    })),
  }));
  return changed ? { ...doc, sections } : doc;
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
