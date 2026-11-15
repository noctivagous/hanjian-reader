import type { AlignRole, UnderlineMode, WordAlign } from '../data/types';

export function hasOffsets(word: WordAlign): boolean {
  return (
    Number.isInteger(word.enStart) &&
    Number.isInteger(word.enEnd) &&
    word.enStart! >= 0 &&
    word.enEnd! > word.enStart!
  );
}

export function alignRole(word: WordAlign): AlignRole | 'translator' {
  if (word.role === 'span' || word.role === 'gloss' || word.role === 'translator') {
    return word.role;
  }
  return hasOffsets(word) ? 'span' : 'gloss';
}

function nextIndex(hay: string, needle: string, from: number): number {
  if (!needle) return -1;
  const exact = hay.indexOf(needle, from);
  if (exact >= 0) return exact;
  return hay.toLowerCase().indexOf(needle.toLowerCase(), from);
}

/** Pin gloss labels into `text` in source order. */
export function pinGlossOffsets(text: string, words: WordAlign[]): WordAlign[] {
  let cursor = 0;
  return words.map((word) => {
    // Translator marks are authored with exact offsets and no Chinese
    // counterpart; never pin or relabel them.
    if (word.role === 'translator') return word;
    const role = alignRole(word);
    if (role === 'span' && hasOffsets(word)) return { ...word, role: 'span' };
    const needle = word.en.trim();
    if (!word.zh || !needle) return { ...word, role: 'gloss' };
    if (hasOffsets(word) && word.enEnd! <= text.length) {
      return { ...word, role: 'gloss' };
    }
    let start = nextIndex(text, needle, cursor);
    if (start < 0) start = nextIndex(text, needle, 0);
    if (start < 0) return { ...word, role: 'gloss' };
    const end = start + needle.length;
    cursor = end;
    return {
      ...word,
      role: 'gloss' as const,
      en: text.slice(start, end),
      enStart: start,
      enEnd: end,
    };
  });
}

function splitEnClauses(en: string): string[] {
  return en
    .replace(/[.?!]+$/u, '')
    .split(/,\s+/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitZhClauses(zh: string): string[] {
  return zh.split(/[，。；！？]+/u).map((s) => s.trim()).filter(Boolean);
}

function pinSlice(
  text: string,
  needle: string,
  from: number,
): { start: number; end: number } | null {
  const start = nextIndex(text, needle, from);
  if (start < 0) return null;
  return { start, end: start + needle.length };
}

/** Phrase-level spans from matching English / Chinese comma clauses. */
export function clauseSpansFromText(
  text: string,
  zh: string,
): WordAlign[] {
  const enParts = splitEnClauses(text);
  const zhParts = splitZhClauses(zh);
  if (enParts.length !== zhParts.length || enParts.length === 0) {
    return [
      {
        en: text.replace(/[.?!]+$/u, ''),
        zh: zh.replace(/[。！？]+$/u, ''),
        pinyin: '',
        def: '',
        role: 'span',
        enStart: 0,
        enEnd: text.replace(/[.?!]+$/u, '').length || text.length,
      },
    ];
  }
  const out: WordAlign[] = [];
  let cursor = 0;
  for (let i = 0; i < enParts.length; i++) {
    const hit = pinSlice(text, enParts[i]!, cursor);
    if (!hit) continue;
    cursor = hit.end;
    out.push({
      en: text.slice(hit.start, hit.end),
      zh: zhParts[i]!,
      pinyin: '',
      def: '',
      role: 'span',
      enStart: hit.start,
      enEnd: hit.end,
    });
  }
  return out;
}

/**
 * Fill a translation's `words` so both roles exist and spans have offsets.
 * Existing span records are kept; glosses without offsets are pinned;
 * missing spans are derived from matching clauses.
 */
export function normalizeTranslationWords(
  text: string,
  zh: string,
  words: WordAlign[],
): WordAlign[] {
  const pinned = pinGlossOffsets(text, words);
  const spans = pinned.filter((w) => alignRole(w) === 'span' && hasOffsets(w));
  const glosses = pinned.filter((w) => w.zh && alignRole(w) === 'gloss');
  const translators = pinned.filter(
    (w) => alignRole(w) === 'translator' && hasOffsets(w),
  );
  const derivedSpans = spans.length ? spans : clauseSpansFromText(text, zh);
  const out = [...derivedSpans];
  const seenGloss = new Set<string>();
  for (const g of glosses) {
    if (!hasOffsets(g)) continue;
    const key = `${g.enStart}:${g.enEnd}:${g.zh}`;
    if (seenGloss.has(key)) continue;
    seenGloss.add(key);
    out.push(g);
  }
  out.push(...translators);
  return out.sort(
    (a, b) =>
      (a.enStart ?? 0) - (b.enStart ?? 0) || (a.enEnd ?? 0) - (b.enEnd ?? 0),
  );
}

/** Underlines for the literary English, filtered by the active role. */
export function underlinesFor(
  text: string,
  zh: string,
  words: WordAlign[],
  role: AlignRole,
): WordAlign[] {
  const normalized = normalizeTranslationWords(text, zh, words);
  const spans = normalized.filter((w) => alignRole(w) === 'span' && hasOffsets(w));
  const glosses = normalized.filter(
    (w) => alignRole(w) === 'gloss' && w.zh && hasOffsets(w),
  );
  if (role === 'span') return spans;
  return glosses;
}

export interface UnderlineLayers {
  spans: WordAlign[];
  glosses: WordAlign[];
  /** Authored marks for English words with no Chinese counterpart. */
  translators: WordAlign[];
  /**
   * Word ranges covered by no layer at all — gaps in the alignment
   * data. Only computed in 'both' mode, where every word is supposed
   * to carry some mark; the reader underlines these red so missing
   * data looks missing.
   */
  gaps: { enStart: number; enEnd: number }[];
}

/** Word tokens for coverage purposes (alphabetic, incl. apostrophes). */
const WORD_TOKEN_RE = /[A-Za-z]+(?:['’][A-Za-z]+)?/g;

function wordCount(en: string): number {
  return (en.match(WORD_TOKEN_RE) ?? []).length;
}

/**
 * Words at or above which a gloss is sentence-scale rather than a
 * phrase gloss. The book's genuine phrase glosses run to about six
 * words ('from which all things are classified'); a gloss swallowing
 * seven or more words with no inner structure is a clause or sentence
 * wearing a gloss's clothes.
 */
export const SENTENCE_GLOSS_MIN_WORDS = 7;

/**
 * A degenerate gloss: its range equals its span's range, it covers at
 * least SENTENCE_GLOSS_MIN_WORDS words, and no gloss or translator
 * mark sits strictly inside it. Such a record claims word-level
 * coverage it does not provide — every word inside it is really only
 * span-covered — so the reader demotes it (the span still shows) and
 * the coverage checker refuses to count it as gloss coverage.
 */
export function isDegenerateGloss(
  gloss: WordAlign,
  words: WordAlign[],
): boolean {
  if (alignRole(gloss) !== 'gloss' || !hasOffsets(gloss)) return false;
  if (wordCount(gloss.en) < SENTENCE_GLOSS_MIN_WORDS) return false;
  const sameSpan = words.some(
    (w) =>
      alignRole(w) === 'span' &&
      hasOffsets(w) &&
      w.enStart === gloss.enStart &&
      w.enEnd === gloss.enEnd,
  );
  if (!sameSpan) return false;
  const hasInner = words.some(
    (w) =>
      w !== gloss &&
      hasOffsets(w) &&
      (alignRole(w) === 'gloss' || alignRole(w) === 'translator') &&
      w.enStart! >= gloss.enStart! &&
      w.enEnd! <= gloss.enEnd! &&
      (w.enStart! > gloss.enStart! || w.enEnd! < gloss.enEnd!),
  );
  return !hasInner;
}

/** Word-token ranges of `text` that no layer range fully covers. */
function uncoveredWordRanges(
  text: string,
  layers: WordAlign[],
): { enStart: number; enEnd: number }[] {
  const gaps: { enStart: number; enEnd: number }[] = [];
  for (const m of text.matchAll(WORD_TOKEN_RE)) {
    const start = m.index;
    const end = start + m[0].length;
    const covered = layers.some(
      (w) => hasOffsets(w) && w.enStart! <= start && end <= w.enEnd!,
    );
    if (!covered) gaps.push({ enStart: start, enEnd: end });
  }
  return gaps;
}

/**
 * The underline layers to draw for a sentence under a display mode.
 * Unlike the old either/or filter, `both` keeps spans and glosses at
 * once (the renderer layers them), and translator marks ride along
 * whenever glosses are shown — in span-only view the span band already
 * covers those words, so the gray mark would be redundant.
 */
export function layeredUnderlines(
  text: string,
  zh: string,
  words: WordAlign[],
  mode: UnderlineMode,
): UnderlineLayers {
  const normalized = normalizeTranslationWords(text, zh, words);
  const spans = normalized.filter((w) => alignRole(w) === 'span' && hasOffsets(w));
  // Degenerate (sentence-scale) glosses are demoted in every mode:
  // they are not glosses, and the span underneath them still shows.
  const glosses = normalized.filter(
    (w) =>
      alignRole(w) === 'gloss' &&
      w.zh &&
      hasOffsets(w) &&
      !isDegenerateGloss(w, normalized),
  );
  const translators = normalized.filter(
    (w) => alignRole(w) === 'translator' && hasOffsets(w),
  );
  if (mode === 'span') return { spans, glosses: [], translators: [], gaps: [] };
  if (mode === 'gloss') return { spans: [], glosses, translators, gaps: [] };
  const gaps =
    normalized.length > 0
      ? uncoveredWordRanges(text, [...spans, ...glosses, ...translators])
      : [];
  return { spans, glosses, translators, gaps };
}
