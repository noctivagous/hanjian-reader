import { useEffect, useRef, useState } from 'react';
import { brand } from '../brand';
import type { WordAlign } from '../data/types';
import type { ReadingProvider } from '../lib/dictionary';
import { toneColor } from '../lib/pinyin';
import { resolveCharReading } from '../lib/reading';
import { chooseDrawerPlacement, type DrawerPlacement } from '../lib/placement';
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
  onClose: () => void;
  onSpeak: (text: string) => void;
  dict?: ReadingProvider | null;
}

export function CharMiniDetail({
  ch,
  toneColors,
  showZhuyin,
  onInspect,
  dict,
}: {
  ch: string;
  toneColors: boolean;
  showZhuyin: boolean;
  onInspect: (zh: string) => void;
  dict?: ReadingProvider | null;
}) {
  const resolved = resolveCharReading(ch, dict);
  const info = resolved.hand;
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2.5">
        <div className="h-12 w-12 shrink-0 rounded-[12px] bg-[#FFF8F0] dark:bg-[#1C1A16] border border-[#F0DFCC] flex items-center justify-center serif-sc text-[28px] leading-none">
          {ch}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[16px] font-semibold leading-tight"
            style={{ color: toneColor(resolved.pinyin, toneColors) }}
          >
            {resolved.pinyin || '—'}
          </div>
          {showZhuyin && resolved.zhuyin && (
            <div className="font-mono text-[11px] text-[var(--ink-mute)]">
              {resolved.zhuyin}
            </div>
          )}
          <div className="text-[12px] leading-snug mt-0.5 truncate">
            {resolved.meaning || 'No definition yet'}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--paper-2)] border border-[var(--line)]">
          {info?.strokes != null ? `${info.strokes} strokes` : '? strokes'}
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--paper-2)] border border-[var(--line)]">
          {info?.radical || '—'}
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFEAD6] border border-[#F2C4A0] text-[#8A3D1A]">
          HSK {info?.hsk ?? '—'}
        </span>
        {info?.decom && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--paper-2)] border border-[var(--line)]">
            {info.decom}
          </span>
        )}
      </div>
      {(info?.examples?.slice(0, 3) || []).length > 0 && (
        <div className="space-y-1">
          {(info?.examples || []).slice(0, 3).map((ex, i) => (
            <div
              key={i}
              className="flex justify-between gap-2 text-[11px] px-2 py-1 rounded-lg bg-[var(--paper-2)] border border-[var(--line)]"
            >
              <span className="serif-sc shrink-0">{ex.split(' ')[0]}</span>
              <span className="text-[var(--ink-mute)] text-right truncate">
                {ex.split(' ').slice(1).join(' ')}
              </span>
            </div>
          ))}
        </div>
      )}
      {brand.features.inspector && (
        <button
          type="button"
          onClick={() => onInspect(ch)}
          className="w-full rounded-full bg-[var(--ink)] text-white text-[11px] py-1.5"
        >
          Inspect {ch} →
        </button>
      )}
    </div>
  );
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
  onClose,
  onSpeak,
  dict,
}: Props) {
  const zhuyin = showZhuyin ? zhuyinForWord(hover.data.pinyin) : null;
  const chars = Array.from(hover.data.zh || '');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [placement, setPlacement] = useState<DrawerPlacement>('right');
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const compute = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPlacement(
        chooseDrawerPlacement(rect.left, rect.right, window.innerWidth),
      );
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [hover.key, hover.rect]);

  const selectedChar =
    selectedIndex != null && selectedIndex < chars.length
      ? chars[selectedIndex]
      : null;

  const drawerClass =
    placement === 'right'
      ? 'absolute left-full ml-2 top-0 w-[240px] anim-drawer-right'
      : placement === 'left'
        ? 'absolute right-full mr-2 top-0 w-[240px] anim-drawer-left'
        : 'absolute left-0 top-full mt-2 w-[260px] anim-drawer-bottom';

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
      <div ref={anchorRef} className="relative">
        <div className="relative w-[260px] rounded-[14px] border border-[#EAD9C8] bg-white dark:bg-[#1E1C18] shadow-[0_12px_32px_rgba(0,0,0,0.18)] overflow-hidden anim-rise">
          <button
            type="button"
            aria-label="Close word card"
            onClick={() => {
              setSelectedIndex(null);
              onClose();
            }}
            className="absolute right-2 top-2 z-10 h-6 w-6 rounded-full border border-[var(--line)] bg-white dark:bg-[#1E1C18] flex items-center justify-center text-[11px] hover:border-[var(--verm)] hover:text-[var(--verm)]"
          >
            ✕
          </button>
          <div className="p-3 flex gap-3">
            <div
              className="flex flex-wrap content-start gap-1 shrink-0 max-w-[92px]"
              role="group"
              aria-label="Characters in this word"
            >
              {chars.length > 0 ? (
                chars.map((ch, i) => (
                  <button
                    key={`${hover.key}-ch${i}`}
                    type="button"
                    aria-pressed={selectedIndex === i}
                    aria-expanded={selectedIndex === i}
                    aria-label={`Show details for ${ch}`}
                    title={ch}
                    onClick={() =>
                      setSelectedIndex((prev) => (prev === i ? null : i))
                    }
                    className={`h-10 min-w-10 px-1.5 rounded-[10px] bg-[#FFF0EB] flex items-center justify-center serif-sc text-[18px] leading-none border transition hover:border-[var(--verm)] ${
                      selectedIndex === i
                        ? '!bg-[var(--verm)] !text-white border-[var(--verm)]'
                        : 'border-transparent'
                    }`}
                  >
                    {ch}
                  </button>
                ))
              ) : (
                <div className="h-10 w-10 rounded-[10px] bg-[#FFF0EB] flex items-center justify-center serif-sc text-[18px]">
                  字
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
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
            {brand.features.inspector && (
            <button
              type="button"
              onClick={() => {
                onInspect(hover.data.zh);
              }}
              className="flex-1 rounded-full bg-[var(--ink)] text-white text-[11px] py-1.5"
            >
              Inspect
            </button>
            )}
            {brand.features.speech && (
            <button
              type="button"
              onClick={() => onSpeak(hover.data.zh)}
              className="rounded-full border px-3 py-1.5 text-[11px]"
            >
              🔊
            </button>
            )}
          </div>
          {pinnedKey === hover.key && (
            <div className="px-3 pb-2 text-[10px] text-[var(--ink-mute)]">
              Pinned — click the word again, ✕, or press Esc to unpin
            </div>
          )}
        </div>
        {selectedChar && (
          <div
            role="dialog"
            aria-label={`Details for ${selectedChar}`}
            key={`${hover.key}-${selectedChar}-${selectedIndex}-${placement}`}
            className={`${drawerClass} rounded-[12px] border border-[#EAD9C8] bg-white dark:bg-[#1E1C18] shadow-[0_12px_32px_rgba(0,0,0,0.18)] p-3 max-h-[320px] overflow-y-auto`}
          >
            <CharMiniDetail
              ch={selectedChar}
              toneColors={toneColors}
              showZhuyin={showZhuyin}
              onInspect={onInspect}
              dict={dict}
            />
          </div>
        )}
      </div>
    </div>
  );
}
