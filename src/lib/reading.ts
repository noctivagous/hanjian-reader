import { charDict, type CharInfo } from '../data/charDict';
import type { DictRecord, ReadingProvider } from './dictionary';
import { zhuyinForWord } from './zhuyin';

export interface ResolvedReading {
  /** Tone-marked pinyin, or '' when unknown. */
  pinyin: string;
  /** Short gloss / definition, or '' when unknown. */
  meaning: string;
  /** Zhuyin derived from pinyin when available. */
  zhuyin: string | null;
  /** Full hand-written entry when the char is in charDict. */
  hand: CharInfo | null;
  /** First dictionary record when falling back to CC-CEDICT. */
  dict: DictRecord | null;
}

/**
 * Lookup order for hover/inspection: hand-written charDict first, then
 * the runtime dictionary (CC-CEDICT, traditional-aware via aliases),
 * then the unknown fallback. HSK is intentionally left unset for
 * dictionary-only (classical) entries — callers render '—'.
 */
export function resolveCharReading(
  ch: string,
  dict?: ReadingProvider | null,
): ResolvedReading {
  const hand = charDict[ch] ?? null;
  if (hand) {
    return {
      pinyin: hand.pinyin,
      meaning: hand.meaning,
      zhuyin: hand.zhuyin || null,
      hand,
      dict: null,
    };
  }
  const [first] = dict?.lookup(ch) ?? [];
  if (first) {
    const [gloss] = first.def.split('; ');
    return {
      pinyin: first.pinyin,
      meaning: gloss || first.def,
      zhuyin: zhuyinForWord(first.pinyin),
      hand: null,
      dict: first,
    };
  }
  return { pinyin: '', meaning: '', zhuyin: null, hand: null, dict: null };
}
