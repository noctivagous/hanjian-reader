// Jiayan (甲言) WordNgramTokenizer, ported from
// https://github.com/jiaeyan/Jiayan (MIT, Jiajie Yan). Classical Chinese
// max-probability path over Jiayan's frequency lexicon. The recommended
// CharHMMTokenizer needs KenLM + jiayan.klm and stays in Python; this is
// the dictionary tokenizer that ships with the package.
//
// The lexicon is simplified. Traditional input is folded with the same
// 1:1 map as search (`foldScriptText`) so token offsets map back onto
// the original characters; display text is never rewritten.

import { foldScriptText } from './script.ts';

export interface JiayanIndex {
  readonly entries: number;
  segment(zh: string): string[];
}

interface JiayanFile {
  meta: { entries: number };
  words: Record<string, number>;
}

const ZH_SPLIT = /([\u4E00-\u9FA5]+)/;
const ZH_ONLY = /^[\u4E00-\u9FA5]+$/;

function buildPrefix(words: Record<string, number>): {
  prefix: Map<string, number>;
  total: number;
} {
  const prefix = new Map<string, number>();
  let total = 0;
  for (const [word, freq] of Object.entries(words)) {
    prefix.set(word, freq);
    total += freq;
    const chars = Array.from(word);
    for (let i = 0; i < chars.length; i++) {
      const p = chars.slice(0, i + 1).join('');
      if (!prefix.has(p)) prefix.set(p, 0);
    }
  }
  return { prefix, total };
}

function genDag(chars: string[], prefix: Map<string, number>): number[][] {
  const n = chars.length;
  const dag: number[][] = [];
  for (let start = 0; start < n; start++) {
    const ends: number[] = [];
    let end = start;
    let p = chars[start];
    while (end < n && prefix.has(p)) {
      if (prefix.get(p)) ends.push(end);
      end += 1;
      p = chars.slice(start, end + 1).join('');
    }
    if (ends.length === 0) ends.push(start);
    dag[start] = ends;
  }
  return dag;
}

function cutDag(
  chars: string[],
  prefix: Map<string, number>,
  total: number,
): string[] {
  const n = chars.length;
  const dag = genDag(chars, prefix);
  const route: Array<[number, number]> = Array.from({ length: n + 1 }, () => [
    0, 0,
  ]);
  const logTotal = Math.log(total);
  for (let i = n - 1; i >= 0; i--) {
    let best: [number, number] = [-Infinity, i];
    for (const end of dag[i]) {
      const word = chars.slice(i, end + 1).join('');
      const freq = prefix.get(word) || 1;
      const score = Math.log(freq) - logTotal + route[end + 1][0];
      if (score > best[0]) best = [score, end];
    }
    route[i] = best;
  }
  const out: string[] = [];
  let start = 0;
  while (start < n) {
    const end = route[start][1];
    out.push(chars.slice(start, end + 1).join(''));
    start = end + 1;
  }
  return out;
}

function tokenizeSimplified(
  text: string,
  prefix: Map<string, number>,
  total: number,
): string[] {
  const chunks = text.split(ZH_SPLIT).filter((c) => c.length > 0);
  const out: string[] = [];
  for (const chunk of chunks) {
    if (ZH_ONLY.test(chunk)) {
      out.push(...cutDag(Array.from(chunk), prefix, total));
    } else {
      out.push(chunk);
    }
  }
  return out;
}

/** Build a tokenizer from the raw frequency table (simplified headwords). */
export function createJiayan(words: Record<string, number>): JiayanIndex {
  const { prefix, total } = buildPrefix(words);
  return {
    entries: Object.keys(words).length,
    segment(zh: string): string[] {
      const orig = Array.from(zh);
      const folded = orig.map((ch) => {
        const s = foldScriptText(ch);
        return s.length === 1 ? s : ch;
      });
      const simp = folded.join('');
      const tokens = tokenizeSimplified(simp, prefix, total);
      if (folded.length !== orig.length) return tokens;
      const out: string[] = [];
      let i = 0;
      for (const tok of tokens) {
        const n = Array.from(tok).length;
        out.push(orig.slice(i, i + n).join(''));
        i += n;
      }
      return out;
    },
  };
}

let pending: Promise<JiayanIndex | null> | null = null;

/** Fetch the Jiayan lexicon once; safe to call from any component. */
export function loadJiayan(): Promise<JiayanIndex | null> {
  if (!pending) {
    pending = fetch(`${import.meta.env.BASE_URL}dict/jiayan.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`jiayan HTTP ${res.status}`);
        return res.json() as Promise<JiayanFile>;
      })
      .then((file) => createJiayan(file.words))
      .catch(() => null);
  }
  return pending;
}
