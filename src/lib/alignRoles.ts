import type { AlignRole, WordAlign } from '../data/types';

export function hasOffsets(word: WordAlign): boolean {
  return (
    Number.isInteger(word.enStart) &&
    Number.isInteger(word.enEnd) &&
    word.enStart! >= 0 &&
    word.enEnd! > word.enStart!
  );
}

export function alignRole(word: WordAlign): AlignRole {
  if (word.role === 'span' || word.role === 'gloss') return word.role;
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
