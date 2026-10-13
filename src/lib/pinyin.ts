// Pinyin tone detection + tone colors, ported from the original artifact.

export type Tone = 1 | 2 | 3 | 4 | 5;

const TONE_COLORS: Record<Tone, string> = {
  1: '#C73E1D',
  2: '#D97A2A',
  3: '#2F7D4A',
  4: '#2E5AAC',
  5: '#8A8A85',
};

export function toneOf(pinyin: string): Tone {
  if (/[āēīōūǖ]/i.test(pinyin)) return 1;
  if (/[áéíóúǘ]/i.test(pinyin)) return 2;
  if (/[ǎěǐǒǔǚ]/i.test(pinyin)) return 3;
  if (/[àèìòùǜ]/i.test(pinyin)) return 4;
  return 5;
}

/** Tone color for a pinyin string; falls back to ink when disabled. */
export function toneColor(pinyin: string, enabled: boolean): string {
  if (!enabled) return 'var(--ink)';
  return TONE_COLORS[toneOf(pinyin)] ?? '#6B6B63';
}
