import type { WordAlign } from '../data/types';

/** Whether two alignment records refer to the same word pair in a sentence. */
export function alignWordsMatch(a: WordAlign, b: WordAlign): boolean {
  if (!a.zh || !b.zh || a.zh !== b.zh) return false;
  const enA = a.en.trim().toLowerCase();
  const enB = b.en.trim().toLowerCase();
  if (enA && enB) return enA === enB;
  return true;
}

export function isLinkedAlign(
  word: WordAlign,
  linked: WordAlign | null,
  crossLink: boolean,
): boolean {
  if (!crossLink || !linked || !word.zh) return false;
  return alignWordsMatch(word, linked);
}
