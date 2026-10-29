import type { WordAlign } from '../data/types';
import type { ReadingProvider } from './dictionary';

export interface ZhToken {
  text: string;
  word?: WordAlign;
}

interface WordRun {
  text: string;
  wordLike: boolean;
}

// Minimal structural type so this compiles regardless of which TS lib
// version declares Intl.Segmenter.
interface IntlSegmenterLike {
  segment(input: string): Iterable<{ segment: string; isWordLike?: boolean }>;
}

// Dictionary-based word boundaries from the runtime's ICU data
// (all modern browsers, Node with full-icu). Returns null when the
// runtime has no word segmenter, so callers can fall back to greedy.
function icuRuns(zh: string): WordRun[] | null {
  const Ctor = (
    Intl as unknown as {
      Segmenter?: new (
        locale: string,
        options: { granularity: string },
      ) => IntlSegmenterLike;
    }
  ).Segmenter;
  if (typeof Ctor !== 'function') return null;
  try {
    const runs: WordRun[] = [];
    for (const s of new Ctor('zh', { granularity: 'word' }).segment(zh)) {
      runs.push({ text: s.segment, wordLike: s.isWordLike !== false });
    }
    return runs;
  } catch {
    return null;
  }
}

// Greedy longest-match over the aligned words' zh values. Characters
// with no aligned word become single-character tokens without a word.
function greedyInto(
  out: ZhToken[],
  text: string,
  byZh: Map<string, WordAlign>,
  candidates: string[],
): void {
  const chars = Array.from(text);
  let k = 0;
  while (k < chars.length) {
    const rest = chars.slice(k).join('');
    const match = candidates.find((c) => rest.startsWith(c));
    if (match) {
      out.push({ text: match, word: byZh.get(match) });
      k += Array.from(match).length;
    } else {
      out.push({ text: chars[k] });
      k += 1;
    }
  }
}

// Segment Chinese text into hover tokens. Alignment comes first: every
// entry the old greedy longest-match attached is still attached, so no
// hover card is ever lost to a segmenter boundary disagreement (e.g.
// ICU's "杯/中的" versus the aligned word "杯中"). The segmenter only
// repairs the fallback: consecutive characters the alignment table
// cannot explain are re-joined along ICU word runs, so an unaligned
// two-character word keeps its true span instead of collapsing to
// single characters. When a dictionary is supplied, spans still without
// a word are looked up there (first record wins for polyphones) and gain
// a hover card; anything the dictionary also lacks stays wordless.
export function tokenizeChinese(
  zh: string,
  words: WordAlign[],
  dict?: ReadingProvider,
): ZhToken[] {
  const byZh = new Map<string, WordAlign>();
  for (const w of words) {
    if (w.zh && !byZh.has(w.zh)) byZh.set(w.zh, w);
  }
  const candidates = [...byZh.keys()].sort((a, b) => b.length - a.length);

  const greedy: ZhToken[] = [];
  greedyInto(greedy, zh, byZh, candidates);

  const runs = icuRuns(zh);
  if (runs === null) return greedy;

  // Map each character offset to its ICU run index.
  const runOf: number[] = [];
  runs.forEach((r, ri) => {
    const n = Array.from(r.text).length;
    for (let k = 0; k < n; k++) runOf.push(ri);
  });

  // Re-join consecutive wordless single characters that share one run.
  const tokens: ZhToken[] = [];
  let pos = 0;
  let i = 0;
  while (i < greedy.length) {
    const t = greedy[i];
    const len = Array.from(t.text).length;
    if (t.word === undefined && len === 1) {
      let text = t.text;
      let j = i + 1;
      let p = pos + 1;
      while (j < greedy.length) {
        const u = greedy[j];
        if (u.word !== undefined || Array.from(u.text).length !== 1) break;
        if (runOf[p] !== runOf[pos]) break;
        text += u.text;
        j += 1;
        p += 1;
      }
      tokens.push({ text });
      i = j;
      pos = p;
    } else {
      tokens.push(t);
      i += 1;
      pos += len;
    }
  }
  if (dict) {
    for (const t of tokens) {
      if (t.word !== undefined || t.text.trim() === '') continue;
      const [first] = dict.lookup(t.text) ?? [];
      if (!first) continue;
      const [en] = first.def.split('; ');
      t.word = { en: en || '', zh: t.text, pinyin: first.pinyin, def: first.def };
    }
  }
  return tokens;
}
