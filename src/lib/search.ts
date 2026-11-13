import type { Doc } from '../data/types';
import { allSentences, sentenceEn } from './doc.ts';
import { foldedIndexOfAll } from './script.ts';

/**
 * Document search over the data model (not the DOM): every occurrence
 * of the query in each sentence's English (primary translation) and
 * Chinese text, in document order. Counting over the model means the
 * total is honest even for text the current reveal settings keep
 * hidden; navigation anchors on sentence ids, which the Reader renders
 * as element ids.
 */
export interface DocSearch {
  /** One sentence id per occurrence, in document order. */
  anchors: string[];
  total: number;
}

export function docSearchMatches(doc: Doc, query: string): DocSearch {
  if (!query) return { anchors: [], total: 0 };
  const anchors: string[] = [];
  for (const sentence of allSentences(doc)) {
    const inEn = foldedIndexOfAll(sentenceEn(sentence), query).length;
    const inZh = foldedIndexOfAll(sentence.zh, query).length;
    for (let i = 0; i < inEn + inZh; i++) anchors.push(sentence.id);
  }
  return { anchors, total: anchors.length };
}
