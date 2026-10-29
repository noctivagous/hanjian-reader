import type { WordAlign } from '../data/types';

const HAN = /\p{Script=Han}/u;

/** Contiguous Han runs in source order (punctuation stripped). */
export function hanSegments(zh: string): string[] {
  const runs: string[] = [];
  let buf = '';
  for (const ch of zh) {
    if (HAN.test(ch)) buf += ch;
    else if (buf) {
      runs.push(buf);
      buf = '';
    }
  }
  if (buf) runs.push(buf);
  return runs;
}

interface HanRange {
  from: number;
  to: number;
}

/** Han run indices touched by an alignment's `zh` phrase. */
function hanRangeForPhrase(phrase: string, runs: string[]): HanRange {
  let from = runs.length;
  let to = -1;
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    if (run.includes(phrase) || phrase.includes(run)) {
      from = Math.min(from, i);
      to = Math.max(to, i);
    }
  }
  if (to < 0) return { from: 0, to: 0 };
  return { from, to };
}

/** Han runs that sit in `fullZh` strictly between two aligned phrases. */
function hanRunsBetweenPhrases(
  fullZh: string,
  prevPhrase: string,
  nextPhrase: string,
): string[] {
  const prevAt = fullZh.indexOf(prevPhrase);
  if (prevAt < 0) return [];
  const afterPrev = prevAt + prevPhrase.length;
  const nextAt = fullZh.indexOf(nextPhrase, afterPrev);
  if (nextAt < 0) return [];
  return hanSegments(fullZh.slice(afterPrev, nextAt));
}

function hanRunsForGap(
  fullZh: string,
  runs: string[],
  prev: WordAlign | null,
  next: WordAlign | null,
  position: 'before' | 'between' | 'after',
): string[] {
  if (position === 'before' && next) {
    const { from } = hanRangeForPhrase(next.zh, runs);
    if (from <= 0) return [next.zh];
    return runs.slice(0, from);
  }
  if (position === 'between' && prev && next) {
    const between = hanRunsBetweenPhrases(fullZh, prev.zh, next.zh);
    if (between.length) return between;
    const prevR = hanRangeForPhrase(prev.zh, runs);
    const nextR = hanRangeForPhrase(next.zh, runs);
    const from = prevR.to + 1;
    const to = nextR.from - 1;
    if (from <= to) return runs.slice(from, to + 1);
    return [prev.zh];
  }
  if (position === 'after' && prev) {
    const { to } = hanRangeForPhrase(prev.zh, runs);
    if (to + 1 >= runs.length) return [prev.zh];
    return runs.slice(to + 1);
  }
  return [];
}

interface EnWordSpan {
  text: string;
  enStart: number;
  enEnd: number;
}

export function segmentEnglishWords(
  en: string,
  start: number,
  end: number,
): EnWordSpan[] {
  const slice = en.slice(start, end);
  if (!slice) return [];

  type Seg = { segment: string; isWordLike?: boolean };
  const Ctor = (
    Intl as unknown as {
      Segmenter?: new (
        locale: string,
        options: { granularity: string },
      ) => { segment(input: string): Iterable<Seg> };
    }
  ).Segmenter;

  if (typeof Ctor === 'function') {
    try {
      const out: EnWordSpan[] = [];
      let offset = start;
      for (const seg of new Ctor('en', { granularity: 'word' }).segment(slice)) {
        const t = seg.segment;
        if (seg.isWordLike !== false && /[\p{L}\p{N}]/u.test(t)) {
          out.push({ text: t, enStart: offset, enEnd: offset + t.length });
        }
        offset += t.length;
      }
      if (out.length) return out;
    } catch {
      /* fallback */
    }
  }

  const out: EnWordSpan[] = [];
  const re = /[\p{L}\p{N}]+/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(slice))) {
    out.push({
      text: m[0],
      enStart: start + m.index,
      enEnd: start + m.index + m[0].length,
    });
  }
  return out;
}

function assignGapWords(
  en: string,
  gapStart: number,
  gapEnd: number,
  zhRuns: string[],
  fallbackZh: string,
): WordAlign[] {
  const words = segmentEnglishWords(en, gapStart, gapEnd);
  if (!words.length) return [];
  const runs = zhRuns.length ? zhRuns : [fallbackZh];
  const out: WordAlign[] = [];
  let w = 0;
  for (let r = 0; r < runs.length; r++) {
    const remaining = words.length - w;
    const slots = runs.length - r;
    const take = Math.max(1, Math.ceil(remaining / slots));
    for (let j = 0; j < take && w < words.length; j++, w++) {
      const seg = words[w]!;
      out.push({
        en: seg.text,
        zh: runs[r]!,
        pinyin: '',
        def: '',
        enStart: seg.enStart,
        enEnd: seg.enEnd,
      });
    }
  }
  return out;
}

function wordifySpan(en: string, word: WordAlign): WordAlign[] {
  const start = word.enStart!;
  const end = word.enEnd!;
  const parts = segmentEnglishWords(en, start, end);
  if (parts.length <= 1) return [word];
  return parts.map((seg) => ({
    ...word,
    en: seg.text,
    enStart: seg.enStart,
    enEnd: seg.enEnd,
  }));
}

/**
 * Expand sparse English range alignments into per-word hover spans that cover
 * the whole sentence. Gap words inherit the Chinese runs that fall between
 * curated anchors in source order (optional; not used in the reader UI).
 */
export function expandEnglishHover(
  en: string,
  zh: string,
  words: WordAlign[],
): WordAlign[] {
  const aligned = words
    .filter(
      (w) =>
        Number.isInteger(w.enStart) &&
        Number.isInteger(w.enEnd) &&
        w.enEnd! > w.enStart! &&
        w.enStart! >= 0 &&
        w.enEnd! <= en.length,
    )
    .sort((a, b) => a.enStart! - b.enStart! || a.enEnd! - b.enEnd!);

  if (!aligned.length) return words;

  const runs = hanSegments(zh);
  const out: WordAlign[] = [];
  let cursor = 0;

  for (let i = 0; i < aligned.length; i++) {
    const w = aligned[i]!;
    const start = w.enStart!;

    if (start > cursor) {
      const prev = i > 0 ? aligned[i - 1]! : null;
      const zhRuns = hanRunsForGap(
        zh,
        runs,
        prev,
        w,
        i === 0 ? 'before' : 'between',
      );
      const fallback = w.zh || prev?.zh || runs[0] || '';
      out.push(...assignGapWords(en, cursor, start, zhRuns, fallback));
    }

    out.push(...wordifySpan(en, w));
    cursor = Math.max(cursor, w.enEnd!);
  }

  if (cursor < en.length) {
    const last = aligned[aligned.length - 1]!;
    const zhRuns = hanRunsForGap(zh, runs, last, null, 'after');
    out.push(...assignGapWords(en, cursor, en.length, zhRuns, last.zh));
  }

  return out.sort((a, b) => a.enStart! - b.enStart! || a.enEnd! - b.enEnd!);
}
