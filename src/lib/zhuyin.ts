// Pinyin (tone-marked) -> Zhuyin (Bopomofo) conversion.
// Taiwan conventions: tone marks follow the syllable (ㄌㄠˇ), the first tone
// is unmarked, and the neutral tone is a leading dot (˙ㄓㄜ).
// Returns null for anything unconvertible so callers can omit Zhuyin
// rather than render a guess.

const TONE_MARKS: Record<string, { base: string; tone: number }> = {
  ā: { base: 'a', tone: 1 }, á: { base: 'a', tone: 2 }, ǎ: { base: 'a', tone: 3 }, à: { base: 'a', tone: 4 },
  ē: { base: 'e', tone: 1 }, é: { base: 'e', tone: 2 }, ě: { base: 'e', tone: 3 }, è: { base: 'e', tone: 4 },
  ī: { base: 'i', tone: 1 }, í: { base: 'i', tone: 2 }, ǐ: { base: 'i', tone: 3 }, ì: { base: 'i', tone: 4 },
  ō: { base: 'o', tone: 1 }, ó: { base: 'o', tone: 2 }, ǒ: { base: 'o', tone: 3 }, ò: { base: 'o', tone: 4 },
  ū: { base: 'u', tone: 1 }, ú: { base: 'u', tone: 2 }, ǔ: { base: 'u', tone: 3 }, ù: { base: 'u', tone: 4 },
  ǖ: { base: 'ü', tone: 1 }, ǘ: { base: 'ü', tone: 2 }, ǚ: { base: 'ü', tone: 3 }, ǜ: { base: 'ü', tone: 4 },
};

const TONE_SUFFIX: Record<number, string> = { 1: '', 2: 'ˊ', 3: 'ˇ', 4: 'ˋ' };

const INITIALS: Record<string, string> = {
  zh: 'ㄓ', ch: 'ㄔ', sh: 'ㄕ',
  b: 'ㄅ', p: 'ㄆ', m: 'ㄇ', f: 'ㄈ',
  d: 'ㄉ', t: 'ㄊ', n: 'ㄋ', l: 'ㄌ',
  g: 'ㄍ', k: 'ㄎ', h: 'ㄏ',
  j: 'ㄐ', q: 'ㄑ', x: 'ㄒ',
  r: 'ㄖ', z: 'ㄗ', c: 'ㄘ', s: 'ㄙ',
};

const FINALS: Record<string, string> = {
  a: 'ㄚ', o: 'ㄛ', e: 'ㄜ', ai: 'ㄞ', ei: 'ㄟ', ao: 'ㄠ', ou: 'ㄡ',
  an: 'ㄢ', en: 'ㄣ', ang: 'ㄤ', eng: 'ㄥ', ong: 'ㄨㄥ', er: 'ㄦ',
  i: 'ㄧ', ia: 'ㄧㄚ', ie: 'ㄧㄝ', iao: 'ㄧㄠ', iu: 'ㄧㄡ',
  ian: 'ㄧㄢ', in: 'ㄧㄣ', iang: 'ㄧㄤ', ing: 'ㄧㄥ', iong: 'ㄩㄥ',
  u: 'ㄨ', ua: 'ㄨㄚ', uo: 'ㄨㄛ', uai: 'ㄨㄞ', ui: 'ㄨㄟ',
  uan: 'ㄨㄢ', un: 'ㄨㄣ', uang: 'ㄨㄤ', ueng: 'ㄨㄥ',
  'ü': 'ㄩ', 'üe': 'ㄩㄝ', 'üan': 'ㄩㄢ', 'ün': 'ㄩㄣ',
};

// Syllables where the written i is not a vowel sound (zhi, chi, ...).
const HOLLOW_I: Record<string, string> = {
  zh: 'ㄓ', ch: 'ㄔ', sh: 'ㄕ', r: 'ㄖ', z: 'ㄗ', c: 'ㄘ', s: 'ㄙ',
};

const Y_FINALS: Record<string, string> = {
  yi: 'i', ya: 'ia', ye: 'ie', yao: 'iao', you: 'iu', yan: 'ian',
  yin: 'in', yang: 'iang', ying: 'ing', yong: 'iong',
  yu: 'ü', yue: 'üe', yuan: 'üan', yun: 'ün',
};

const W_FINALS: Record<string, string> = {
  wu: 'u', wa: 'ua', wo: 'uo', wai: 'uai', wei: 'ui',
  wan: 'uan', wen: 'un', wang: 'uang', weng: 'ueng',
};

const I_INITIALS = new Set(['b', 'p', 'm', 'd', 't', 'n', 'l', 'j', 'q', 'x']);
const UMLAUT_INITIALS = new Set(['n', 'l', 'j', 'q', 'x']);
const ZERO_FINALS = new Set([
  'a', 'o', 'e', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'er',
]);

function convertSyllable(base: string, tone: number): string | null {
  if (base === 'er') return finish('ㄦ', tone);
  if (base in Y_FINALS) return finish(FINALS[Y_FINALS[base]], tone);
  if (base in W_FINALS) return finish(FINALS[W_FINALS[base]], tone);

  let initial = '';
  for (const cand of ['zh', 'ch', 'sh']) {
    if (base.startsWith(cand)) { initial = cand; break; }
  }
  if (!initial && base[0] in INITIALS) initial = base[0];
  let final = base.slice(initial.length);
  if (!final) return null;

  if (final === 'i' && initial in HOLLOW_I) {
    return finish(HOLLOW_I[initial], tone);
  }
  // j/q/x write ü as u (ju, jue, juan, jun).
  if ((initial === 'j' || initial === 'q' || initial === 'x') && final.startsWith('u')) {
    final = 'ü' + final.slice(1);
  }

  const finalZh = FINALS[final];
  if (!finalZh) return null;

  if (!initial) {
    if (!ZERO_FINALS.has(final)) return null;
  } else {
    if ((final.startsWith('i') || final === 'iong') && !I_INITIALS.has(initial)) return null;
    if (final.startsWith('ü') && !UMLAUT_INITIALS.has(initial)) return null;
    if (final === 'o' && !['b', 'p', 'm', 'f', 'l'].includes(initial)) return null;
    if (final === 'ong' && ['b', 'p', 'm', 'f', 'j', 'q', 'x'].includes(initial)) return null;
    if (final === 'ueng') return null;
    if (final === 'er') return null;
  }
  return finish((initial ? INITIALS[initial] : '') + finalZh, tone);
}

function finish(body: string, tone: number): string {
  if (tone === 5) return '˙' + body;
  return body + (TONE_SUFFIX[tone] ?? '');
}

interface SyllableSpan {
  base: string;
  tone: number;
  end: number;
  zhuyin: string;
}

// Try to read one syllable starting at index i of a tone-stripped token.
// raw keeps the original characters; bases/tones are parallel arrays.
function readSyllable(bases: string[], tones: number[], start: number): SyllableSpan | null {
  let best: SyllableSpan | null = null;
  for (let len = 1; len <= 6 && start + len <= bases.length; len++) {
    const sliceTones = tones.slice(start, start + len);
    const marked = sliceTones.filter((t) => t > 0);
    if (marked.length > 1) break;
    const base = bases.slice(start, start + len).join('');
    if (!/[aeiouü]/.test(base)) continue;
    const zhuyin = convertSyllable(base, marked[0] ?? 5);
    if (zhuyin) best = { base, tone: marked[0] ?? 5, end: start + len, zhuyin };
  }
  return best;
}

function convertToken(token: string): string | null {
  const bases: string[] = [];
  const tones: number[] = [];
  for (const ch of token) {
    const marked = TONE_MARKS[ch];
    if (marked) { bases.push(marked.base); tones.push(marked.tone); }
    else if (/[a-züv]/.test(ch)) { bases.push(ch === 'v' ? 'ü' : ch); tones.push(0); }
    else return null;
  }
  if (bases.length === 0) return null;

  // Longest-match segmentation, left to right.
  const out: string[] = [];
  let pos = 0;
  while (pos < bases.length) {
    const span = readSyllable(bases, tones, pos);
    if (!span) return null;
    out.push(span.zhuyin);
    pos = span.end;
  }
  return out.join(' ');
}

/** Convert a tone-marked Pinyin word/phrase to Zhuyin, or null. */
export function zhuyinForWord(pinyin: string): string | null {
  if (!pinyin) return null;
  const tokens = pinyin.toLowerCase().split(/[\s'’-]+/).filter(Boolean);
  if (tokens.length === 0) return null;
  const parts: string[] = [];
  for (const token of tokens) {
    const converted = convertToken(token);
    if (!converted) return null;
    parts.push(converted);
  }
  return parts.join(' ');
}
