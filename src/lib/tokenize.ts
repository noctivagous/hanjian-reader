import type { WordAlign, WordSense } from '../data/types';
import type { DictRecord, ReadingProvider } from './dictionary';

export interface ZhToken {
  text: string;
  word?: WordAlign;
}

const HAN = /\p{Script=Han}/u;

function sensesFrom(recs: DictRecord[]): WordSense[] {
  const seen = new Set<string>();
  const senses: WordSense[] = [];
  for (const rec of recs) {
    const key = `${rec.pinyin}\0${rec.def}`;
    if (seen.has(key)) continue;
    seen.add(key);
    senses.push({ pinyin: rec.pinyin, def: rec.def });
  }
  return senses;
}

// Exact headword only. One reading fills pinyin/def/en. Several readings
// stay on `senses` so the card can list them instead of picking one.
function wordFromLookup(zh: string, recs: DictRecord[]): WordAlign {
  const senses = sensesFrom(recs);
  if (senses.length === 1) {
    const [en] = senses[0].def.split('; ');
    return { en: en || '', zh, pinyin: senses[0].pinyin, def: senses[0].def };
  }
  return { en: '', zh, pinyin: '', def: '', senses };
}

/** Add dictionary readings to an authored alignment that supplies only spans. */
export function withDictionaryReading(
  word: WordAlign,
  dict?: ReadingProvider,
): WordAlign {
  if (!dict || !word.zh || word.pinyin || word.def || word.senses?.length) {
    return word;
  }
  const recs = dict.lookup(word.zh);
  if (!recs?.length) return word;
  return { ...word, ...wordFromLookup(word.zh, recs), en: word.en };
}

const SKIP_GLOSS =
  /^(surname |Kangxi |variant of |old variant |abbr\. |see |used in |\()/i;

/** Chip label for English-primary hover. Authored `en` wins. Otherwise the first listed gloss that is not a surname / bound-form note; the card still lists every sense. */
export function englishLabel(w: WordAlign): string {
  const defs = [
    ...(w.en ? [w.en] : []),
    ...(w.def ? [w.def] : []),
    ...(w.senses ?? []).map((s) => s.def),
  ];
  const glosses = defs.flatMap((d) =>
    d.split('; ').map((g) => g.trim()).filter(Boolean),
  );
  const pick =
    glosses.find((g) => !SKIP_GLOSS.test(g) && !g.startsWith('(')) ||
    glosses.find((g) => !SKIP_GLOSS.test(g)) ||
    glosses[0];
  if (!pick) return w.zh;
  const trimmed = pick.replace(/\s*CL:.*$/, '').trim();
  const chunk = trimmed.split(',')[0].trim();
  return chunk || trimmed || w.zh;
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

function charTokens(text: string, dict: ReadingProvider): ZhToken[] {
  const out: ZhToken[] = [];
  for (const ch of Array.from(text)) {
    if (!HAN.test(ch)) {
      out.push({ text: ch });
      continue;
    }
    const recs = dict.lookup(ch);
    if (recs?.length) out.push({ text: ch, word: wordFromLookup(ch, recs) });
    else out.push({ text: ch });
  }
  return out;
}

// Segmenter spans, then an exact dictionary hit on that span. A span the
// dictionary does not list is not given a guessed gloss: each character
// is looked up on its own.
function lookupSegmented(
  text: string,
  dict: ReadingProvider,
  segmentZh?: (zh: string) => string[],
): ZhToken[] {
  const runs = segmentZh
    ? segmentZh(text).map((t) => ({ text: t, wordLike: HAN.test(t) }))
    : icuRuns(text);
  if (runs === null) return charTokens(text, dict);
  const out: ZhToken[] = [];
  for (const run of runs) {
    const han = HAN.test(run.text);
    if (!run.wordLike || !han) {
      out.push({ text: run.text });
      continue;
    }
    const recs = dict.lookup(run.text);
    if (recs?.length) {
      out.push({ text: run.text, word: wordFromLookup(run.text, recs) });
      continue;
    }
    if (Array.from(run.text).length === 1) {
      out.push({ text: run.text });
      continue;
    }
    out.push(...charTokens(run.text, dict));
  }
  return out;
}

function fillWordless(
  greedy: ZhToken[],
  dict: ReadingProvider,
  segmentZh?: (zh: string) => string[],
): ZhToken[] {
  const tokens: ZhToken[] = [];
  let i = 0;
  while (i < greedy.length) {
    if (greedy[i].word !== undefined) {
      tokens.push(greedy[i]);
      i += 1;
      continue;
    }
    let text = '';
    while (i < greedy.length && greedy[i].word === undefined) {
      text += greedy[i].text;
      i += 1;
    }
    tokens.push(...lookupSegmented(text, dict, segmentZh));
  }
  return tokens;
}

function icuRepair(zh: string, greedy: ZhToken[]): ZhToken[] {
  const runs = icuRuns(zh);
  if (runs === null) return greedy;

  const runOf: number[] = [];
  runs.forEach((r, ri) => {
    const n = Array.from(r.text).length;
    for (let k = 0; k < n; k++) runOf.push(ri);
  });

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
  return tokens;
}

// Segment Chinese text into hover tokens. Authored alignments come
// first, so a hand-aligned word is never split by the segmenter (e.g.
// ICU's "杯/中的" versus the aligned word "杯中"). Unaligned text is
// segmented with `segmentZh` when given (Jiayan for classical /
// traditional docs) or Intl.Segmenter, then looked up as that exact
// headword. Several dictionary readings are all kept. A segmenter span
// with no dictionary entry is not guessed across; each character is
// looked up exactly. Without a dictionary, the segmenter still joins
// unaligned characters so a two-character word keeps its span.
export function tokenizeChinese(
  zh: string,
  words: WordAlign[],
  dict?: ReadingProvider,
  segmentZh?: (zh: string) => string[],
): ZhToken[] {
  const byZh = new Map<string, WordAlign>();
  for (const w of words) {
    if (w.zh && !byZh.has(w.zh)) byZh.set(w.zh, w);
  }
  const candidates = [...byZh.keys()].sort((a, b) => b.length - a.length);

  const greedy: ZhToken[] = [];
  greedyInto(greedy, zh, byZh, candidates);

  const authoredSidecar = words.some(
    (w) =>
      Number.isInteger(w.enStart) &&
      Number.isInteger(w.enEnd) &&
      w.enEnd! > w.enStart!,
  );
  if (dict && !authoredSidecar) return fillWordless(greedy, dict, segmentZh);
  if (segmentZh) {
    const tokens: ZhToken[] = [];
    let i = 0;
    while (i < greedy.length) {
      if (greedy[i].word !== undefined) {
        tokens.push(greedy[i]);
        i += 1;
        continue;
      }
      let text = '';
      while (i < greedy.length && greedy[i].word === undefined) {
        text += greedy[i].text;
        i += 1;
      }
      for (const t of segmentZh(text)) tokens.push({ text: t });
    }
    return tokens;
  }
  return icuRepair(zh, greedy);
}
