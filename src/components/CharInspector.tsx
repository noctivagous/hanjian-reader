import { charDict } from '../data/charDict';
import { toneColor } from '../lib/pinyin';

interface Props {
  char: string;
  toneColors: boolean;
  showZhuyin?: boolean;
  note: string;
  onNote: (char: string, note: string) => void;
  onSpeak: (text: string) => void;
  onCopy: (text: string, label: string) => void;
  onAddToList: () => void;
  compact?: boolean;
}

function CharDetail({
  ch,
  toneColors,
  showZhuyin,
}: {
  ch: string;
  toneColors: boolean;
  showZhuyin: boolean;
}) {
  const info = charDict[ch];
  const strokeCount = Math.min(info?.strokes || 3, 5);
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative h-[92px] w-[92px] shrink-0 rounded-[16px] bg-[#FFF8F0] dark:bg-[#1C1A16] border border-[#F0DFCC] flex items-center justify-center">
          <span className="serif-sc text-[64px] leading-none">{ch}</span>
          <span className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--ink)] text-white">
            {info?.strokes ?? '?'} strokes
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span
              className="text-[22px] font-semibold"
              style={{ color: toneColor(info?.pinyin || '', toneColors) }}
            >
              {info?.pinyin || '—'}
            </span>
            {showZhuyin && info?.zhuyin && (
              <span className="text-[12px] text-[var(--ink-mute)] font-mono">
                {info.zhuyin}
              </span>
            )}
          </div>
          <div className="text-[13px] leading-[1.5] mt-1">
            {info?.meaning || 'Tap to add definition'}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--paper-2)] border border-[var(--line)]">
              {info?.radical || '—'}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FFEAD6] border border-[#F2C4A0] text-[#8A3D1A]">
              HSK {info?.hsk ?? '—'}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--paper-2)] border border-[var(--line)]">
              {info?.decom || '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-[12px] bg-[#FFFEFB] dark:bg-[#121210] border border-dashed border-[var(--line)] p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] uppercase tracking-wide font-semibold">
            Stroke Order · 笔顺
          </span>
          <span className="text-[10px] text-[var(--ink-mute)]">
            {info?.strokes || '?'} strokes
          </span>
        </div>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-[84px] rounded bg-white dark:bg-[#1A1916] border border-[var(--line)]"
        >
          <rect x="0" y="50" width="100" height="0.5" fill="#E5DDD2" />
          <rect x="50" y="0" width="0.5" height="100" fill="#E5DDD2" />
          {Array.from({ length: strokeCount }).map((_, i) => (
            <path
              key={i}
              d={`M ${15 + i * 14} 20 Q ${30 + i * 10} ${40 + i * 10} ${20 + i * 15} 78`}
              stroke="#C73E1D"
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
              style={{
                strokeDasharray: 120,
                strokeDashoffset: 120,
                animation: `stroke-draw 1.2s ease forwards ${i * 0.3}s`,
              }}
            />
          ))}
        </svg>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wide font-semibold mb-1.5">
          Examples · 词组
        </div>
        <div className="space-y-1">
          {(info?.examples || ['暂无例子 — add manually']).map((ex, i) => (
            <div
              key={i}
              className="flex justify-between text-[12px] px-2.5 py-1.5 rounded-lg bg-[var(--paper-2)] border border-[var(--line)]"
            >
              <span className="serif-sc">{ex.split(' ')[0]}</span>
              <span className="text-[var(--ink-mute)]">
                {ex.split(' ').slice(1).join(' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CharInspector({
  char,
  toneColors,
  showZhuyin = true,
  note,
  onNote,
  onSpeak,
  onCopy,
  onAddToList,
  compact,
}: Props) {
  const chars = Array.from(char);
  const isWord = chars.length > 1;

  if (compact) {
    if (!isWord) {
      const info = charDict[char];
      return (
        <div className="flex gap-3">
          <div className="h-20 w-20 rounded-xl bg-[#FFF8F0] flex items-center justify-center text-[48px] serif-sc">
            {char}
          </div>
          <div>
            <div className="font-semibold">{info?.pinyin}</div>
            <div className="text-[13px]">{info?.meaning}</div>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-[#FFF8F0] flex items-center justify-center py-3 serif-sc text-[32px]">
          {char}
        </div>
        <div className="space-y-2">
          {chars.map((ch, i) => {
            const info = charDict[ch];
            return (
              <div key={`${ch}-${i}`} className="flex gap-3 items-baseline">
                <span className="serif-sc text-[20px]">{ch}</span>
                <span className="font-semibold text-[13px]">{info?.pinyin || '—'}</span>
                <span className="text-[13px]">{info?.meaning || ''}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {isWord && (
        <div className="rounded-[12px] bg-[#FFF8F0] dark:bg-[#1C1A16] border border-[#F0DFCC] px-3 py-2 text-center">
          <span className="serif-sc text-[28px] leading-none">{char}</span>
          <span className="block text-[11px] text-[var(--ink-mute)] mt-1">
            {chars.length} characters
          </span>
        </div>
      )}
      {chars.map((ch, i) => (
        <div
          key={`${ch}-${i}`}
          className={isWord ? 'border-t border-[var(--line)] pt-4 first:border-t-0 first:pt-0' : undefined}
        >
          <CharDetail ch={ch} toneColors={toneColors} showZhuyin={showZhuyin} />
        </div>
      ))}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSpeak(char)}
          className="flex-1 rounded-full bg-[var(--ink)] text-[var(--paper)] py-2 text-[12px] font-medium hover:opacity-90"
        >
          🔊 Play
        </button>
        <button
          type="button"
          onClick={() => onCopy(char, isWord ? 'Word' : 'Character')}
          className="flex-1 rounded-full border border-[var(--line)] bg-white dark:bg-[#1A1916] py-2 text-[12px]"
        >
          Copy
        </button>
        <button
          type="button"
          onClick={onAddToList}
          className="flex-1 rounded-full border border-[var(--line)] bg-[var(--verm-soft)] text-[var(--verm)] py-2 text-[12px] font-medium"
        >
          + List
        </button>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wide font-semibold mb-1">
          Notes
        </div>
        <textarea
          value={note}
          onChange={(e) => onNote(char, e.target.value)}
          placeholder="Add personal note..."
          className="w-full min-h-[64px] rounded-[10px] border border-[var(--line)] bg-[var(--paper)] p-2.5 text-[12px] outline-none focus:border-[var(--verm)] resize-none"
        />
      </div>
    </div>
  );
}
