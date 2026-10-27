import type { WordAlign } from '../data/types';

export interface ZhToken {
  text: string;
  word?: WordAlign;
}

// Segment Chinese text by greedy longest-match over the aligned words' zh
// values (in Chinese order, not the English-ordered words array). Characters
// with no aligned word become single-character tokens without a word.
export function tokenizeChinese(zh: string, words: WordAlign[]): ZhToken[] {
  const byZh = new Map<string, WordAlign>();
  for (const w of words) {
    if (w.zh && !byZh.has(w.zh)) byZh.set(w.zh, w);
  }
  const candidates = [...byZh.keys()].sort((a, b) => b.length - a.length);
  const chars = Array.from(zh);
  const tokens: ZhToken[] = [];
  let i = 0;
  while (i < chars.length) {
    const rest = chars.slice(i).join('');
    const match = candidates.find((c) => rest.startsWith(c));
    if (match) {
      tokens.push({ text: match, word: byZh.get(match) });
      i += Array.from(match).length;
    } else {
      tokens.push({ text: chars[i] });
      i += 1;
    }
  }
  return tokens;
}
