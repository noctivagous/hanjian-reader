// Language register: which variety of Chinese a document is written
// in (UI label "Register"). The reader's feature set follows the
// register — in this first slice, the order dictionaries are consulted
// for word readings. A document's effective register resolves in one
// place (resolveDocLanguageRegister): a per-document user override
// wins, then the register the document declares, then detection over
// the document's Chinese text, then the 'mandarin' default.

import type { Doc, LanguageRegister } from '../data/types';
import type { DictRecord, ReadingProvider } from './dictionary';

export type { LanguageRegister };

/** Where a document's effective register came from. */
export type RegisterSource = 'override' | 'declared' | 'detected' | 'default';

export interface ResolvedRegister {
  register: LanguageRegister;
  source: RegisterSource;
}

/**
 * Classical function words: the particles that carry 文言 grammar.
 * Dense use of these in short sentences is the strongest cheap signal
 * of classical prose — modern text uses them rarely (而 inside 而且，
 * 之 in set phrases) and never at classical density.
 */
const CLASSICAL_MARKERS = new Set(Array.from('之其而於曰者也矣焉'));

/**
 * Modern grammatical glue: possessive 的， aspect 了， copula 是，
 * plural 們， demonstratives 這/那， locative 在， coordinator 和，
 * adverb 就， 都. None of these carries classical prose; a text full
 * of them is vernacular/modern however old its script looks.
 */
const MODERN_MARKERS = new Set(Array.from('的了是在們這那和就都'));

export interface RegisterScore {
  /** Han characters counted. */
  hanChars: number;
  classicalHits: number;
  modernHits: number;
  sentences: number;
  /** Han characters per sentence, the terseness signal. */
  meanSentenceLength: number;
}

/** Raw detector signals over a Chinese text (exported for tests/UI). */
export function scoreLanguageRegister(text: string): RegisterScore {
  let hanChars = 0;
  let classicalHits = 0;
  let modernHits = 0;
  for (const ch of text) {
    if (ch < '一' || ch > '鿿') continue;
    hanChars += 1;
    if (CLASSICAL_MARKERS.has(ch)) classicalHits += 1;
    if (MODERN_MARKERS.has(ch)) modernHits += 1;
  }
  const sentences = text
    .split(/[。！？；]/)
    .filter((s) => /[一-鿿]/.test(s)).length;
  return {
    hanChars,
    classicalHits,
    modernHits,
    sentences,
    meanSentenceLength: sentences > 0 ? hanChars / sentences : hanChars,
  };
}

/**
 * Conservative detector: 'classical' only on a clear margin — enough
 * classical function words, dominating the modern markers at least
 * 3:1, in terse sentences (≤14 Han chars on average). Anything else
 * is 'mandarin', so short or ambiguous texts never flip a reader's
 * tools by accident. (Bundled check: the Three Character Classic
 * scores 50 classical hits to 5 modern at 6.0 chars/sentence; a
 * modern prose sample scores 1 to 10 at ~27.)
 */
export function detectLanguageRegister(text: string): LanguageRegister {
  const s = scoreLanguageRegister(text);
  if (
    s.classicalHits >= 10 &&
    s.classicalHits >= 3 * s.modernHits &&
    s.meanSentenceLength <= 14
  ) {
    return 'classical';
  }
  return 'mandarin';
}

/** All of a document's Chinese, in reading order, for detection. */
export function docChineseText(doc: Doc): string {
  const parts: string[] = [];
  for (const section of doc.sections) {
    for (const paragraph of section.paragraphs) {
      for (const sentence of paragraph.sentences) parts.push(sentence.zh);
    }
  }
  return parts.join('');
}

/**
 * The one precedence chain for a document's effective register:
 * user override (persisted per document) → declared in the document
 * → detected from its text → 'mandarin' default (empty document).
 */
export function resolveDocLanguageRegister(
  doc: Doc,
  override?: LanguageRegister | null,
): ResolvedRegister {
  if (override) return { register: override, source: 'override' };
  if (doc.languageRegister) {
    return { register: doc.languageRegister, source: 'declared' };
  }
  const text = docChineseText(doc);
  if (text) return { register: detectLanguageRegister(text), source: 'detected' };
  return { register: 'mandarin', source: 'default' };
}

/** Human phrasing for a resolution source, used in control titles. */
export const REGISTER_SOURCE_BLURB: Record<RegisterSource, string> = {
  override: 'set by you',
  declared: 'declared in the file',
  detected: 'detected from the text',
  default: 'default',
};

// --- Register-ordered dictionary lookup ------------------------------

/** Dictionary sources the register chooses between, in lookup order. */
export type DictSourceId = 'classical' | 'cedict';

export const DICT_SOURCE_LABELS: Record<DictSourceId, string> = {
  classical: 'Classical dictionary',
  cedict: 'CC-CEDICT',
};

export interface RegisterLookupHit {
  records: DictRecord[];
  source: DictSourceId;
  /** Display label naming the source that answered. */
  sourceLabel: string;
}

export interface RegisterProviders {
  classical?: ReadingProvider | null;
  cedict?: ReadingProvider | null;
}

/**
 * Consult the dictionary sources in register order: classical texts
 * ask the classical dictionary first (CC-CEDICT is the fallback, its
 * senses modern), mandarin texts ask CC-CEDICT first. Returns the
 * first hit with the source that answered, or undefined when neither
 * source knows the headword.
 */
export function lookupInRegisterOrder(
  text: string,
  register: LanguageRegister,
  providers: RegisterProviders,
): RegisterLookupHit | undefined {
  const order: DictSourceId[] =
    register === 'classical' ? ['classical', 'cedict'] : ['cedict', 'classical'];
  for (const source of order) {
    const records = providers[source]?.lookup(text);
    if (records?.length) {
      return { records, source, sourceLabel: DICT_SOURCE_LABELS[source] };
    }
  }
  return undefined;
}
