import type { WordAlign } from '../data/types';
import { toneColor } from '../lib/pinyin';
import { zhuyinForWord } from '../lib/zhuyin';

export interface HoverState {
  key: string;
  rect: DOMRect;
  data: WordAlign;
}

interface Props {
  hover: HoverState;
  pinnedKey: string | null;
  toneColors: boolean;
  showZhuyin: boolean;
  primaryLang?: 'en' | 'zh';
  onEnter: (h: HoverState) => void;
  onLeave: () => void;
  onInspect: (zh: string) => void;
  onSpeak: (text: string) => void;
}

export function WordCard({
  hover,
  pinnedKey,
  toneColors,
  showZhuyin,
  primaryLang = 'en',
  onEnter,
  onLeave,
  onInspect,
  onSpeak,
}: Props) {
  const zhuyin = showZhuyin ? zhuyinForWord(hover.data.pinyin) : null;
  return (
    <div
      className="fixed z-50 pointer-events-auto"
      style={{
        left: Math.min(window.innerWidth - 280, hover.rect.left),
        top: hover.rect.bottom + 8,
      }}
      onMouseEnter={() => onEnter(hover)}
      onMouseLeave={onLeave}
    >
      <div className="w-[260px] rounded-[14px] border border-[#EAD9C8] bg-white dark:bg-[#1E1C18] shadow-[0_12px_32px_rgba(0,0,0,0.18)] overflow-hidden animate-[rise-in_0.18s_ease]">
        <div className="p-3 flex gap-3">
          <div className="h-10 w-10 rounded-[10px] bg-[#FFF0EB] flex items-center justify-center serif-sc text-[18px]">
            {hover.data.zh || '字'}
          </div>
          <div className="flex-1">
            {primaryLang === 'zh' ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold">{hover.data.en}</span>
                </div>
                <div className="text-[12px] text-[var(--ink-mute)] leading-tight mt-0.5">
                  <span className="serif-sc">{hover.data.zh}</span>
                  {hover.data.pinyin && (
                    <span
                      className="font-mono text-[11px] ml-1.5"
                      style={{ color: toneColor(hover.data.pinyin, toneColors) }}
                    >
                      {hover.data.pinyin}
                    </span>
                  )}
                  {zhuyin && (
                    <span className="font-mono text-[11px] text-[var(--ink-mute)] ml-1.5">
                      {zhuyin}
                    </span>
                  )}
                  {hover.data.def && <> · {hover.data.def}</>}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="serif-sc font-semibold">{hover.data.zh}</span>
                  <span
                    className="font-mono text-[11px]"
                    style={{ color: toneColor(hover.data.pinyin, toneColors) }}
                  >
                    {hover.data.pinyin}
                  </span>
                  {zhuyin && (
                    <span className="font-mono text-[11px] text-[var(--ink-mute)]">
                      {zhuyin}
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-[var(--ink-mute)] leading-tight mt-0.5">
                  {hover.data.def} · {hover.data.en}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="px-3 pb-2 flex gap-2">
          <button
            type="button"
            onClick={() => {
              onInspect(hover.data.zh[0] || hover.data.zh);
            }}
            className="flex-1 rounded-full bg-[var(--ink)] text-white text-[11px] py-1.5"
          >
            Inspect
          </button>
          <button
            type="button"
            onClick={() => onSpeak(hover.data.zh)}
            className="rounded-full border px-3 py-1.5 text-[11px]"
          >
            🔊
          </button>
        </div>
        {pinnedKey === hover.key && (
          <div className="px-3 pb-2 text-[10px] text-[var(--ink-mute)]">
            Pinned — click the word again to unpin
          </div>
        )}
      </div>
    </div>
  );
}
