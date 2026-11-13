import { brand } from '../brand';
import type { Doc } from '../data/types';
import { chineseText, englishText } from '../lib/doc';
import type { DictStatus, ReadingProvider } from '../lib/dictionary';
import type { UnderlineMode } from '../data/types';
import { AlignRoleToggle } from './AlignRoleToggle';
import { CharInspector } from './CharInspector';
import type { HoverMode, PrimaryLang, Reveal } from './Reader';

const ALL_MODES: { k: keyof Reveal; l: string }[] = [
  { k: 'words', l: 'Words 词语' },
  { k: 'sentences', l: 'Sentences 句子' },
  { k: 'paragraphs', l: 'Paragraphs 段落' },
  { k: 'full', l: 'Full 全文' },
];

// White-label: only the reveal modes enabled by the brand are offered.
const MODES = ALL_MODES.filter((m) => brand.features[m.k]);

interface Props {
  doc: Doc;
  open: boolean;
  onClose: () => void;
  reveal: Reveal;
  primaryLang: PrimaryLang;
  onToggleReveal: (k: keyof Reveal) => void;
  hoverMode: HoverMode;
  onHoverMode: (mode: HoverMode) => void;
  alignRole: UnderlineMode;
  onAlignRole: (role: UnderlineMode) => void;
  inspectedChar: string | null;
  onClearInspected: () => void;
  onAddToList: () => void;
  studyListHasChar: boolean;
  note: string;
  onNote: (char: string, note: string) => void;
  onSpeak: (text: string) => void;
  showPinyin: boolean;
  onShowPinyin: (v: boolean) => void;
  showZhuyin: boolean;
  onShowZhuyin: (v: boolean) => void;
  showDefsInline: boolean;
  onShowDefsInline: (v: boolean) => void;
  toneColors: boolean;
  onToneColors: (v: boolean) => void;
  showSentenceChips: boolean;
  onShowSentenceChips: (v: boolean) => void;
  showSpeakerButtons: boolean;
  onShowSpeakerButtons: (v: boolean) => void;
  speakOnClick: boolean;
  onSpeakOnClick: (v: boolean) => void;
  charSize: number;
  onCharSize: (v: number) => void;
  pageMode: boolean;
  onPageMode: (v: boolean) => void;
  onCopy: (text: string, label: string) => void;
  dictStatus: DictStatus;
  dict?: ReadingProvider | null;
}

export function MobileTools({
  doc,
  open,
  onClose,
  reveal,
  primaryLang,
  onToggleReveal,
  hoverMode,
  onHoverMode,
  alignRole,
  onAlignRole,
  inspectedChar,
  onClearInspected,
  onAddToList,
  studyListHasChar,
  note,
  onNote,
  onSpeak,
  showPinyin,
  onShowPinyin,
  showZhuyin,
  onShowZhuyin,
  showDefsInline,
  onShowDefsInline,
  toneColors,
  onToneColors,
  showSentenceChips,
  onShowSentenceChips,
  showSpeakerButtons,
  onShowSpeakerButtons,
  speakOnClick,
  onSpeakOnClick,
  charSize,
  onCharSize,
  pageMode,
  onPageMode,
  onCopy,
  dictStatus,
  dict,
}: Props) {
  return (
    <div
      className={`lg:hidden fixed inset-0 z-40 transition ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        className={`absolute bottom-0 left-0 right-0 max-h-[88vh] rounded-t-[24px] border-t border-[var(--line)] bg-[var(--paper)] shadow-[0_-12px_40px_rgba(0,0,0,0.15)] overflow-auto transition-transform duration-300 ${open ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="sticky top-0 bg-[var(--paper)] z-10 p-4 border-b border-[var(--line)] flex items-center justify-between">
          <div className="mx-auto h-1 w-10 rounded-full bg-[var(--line)] absolute top-2 left-1/2 -translate-x-1/2" />
          <span className="serif-display font-semibold">Tools · 工具</span>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full border flex items-center justify-center"
          >
            ✕
          </button>
        </div>
        <div className="p-5 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[12px] text-[var(--ink-mute)]">
              {primaryLang === 'en'
                ? 'Reading English · revealing 中文'
                : 'Reading 中文 · revealing English'}
            </div>
            {brand.features.words && (
              <AlignRoleToggle value={alignRole} onChange={onAlignRole} />
            )}
          </div>
          {brand.features.words && (
            <div
              className="flex rounded-full border border-[var(--line)] bg-[var(--paper-2)] p-0.5 w-fit"
              role="group"
              aria-label="Hover granularity"
            >
              <button
                type="button"
                aria-pressed={hoverMode === 'word'}
                onClick={() => onHoverMode('word')}
                className={`rounded-full px-3 py-1 text-[11px] transition ${hoverMode === 'word' ? 'bg-[var(--ink)] text-[var(--paper)]' : ''}`}
              >
                Word hover
              </button>
              <button
                type="button"
                aria-pressed={hoverMode === 'character'}
                onClick={() => onHoverMode('character')}
                className={`rounded-full px-3 py-1 text-[11px] transition ${hoverMode === 'character' ? 'bg-[var(--ink)] text-[var(--paper)]' : ''}`}
              >
                Character hover
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {MODES.map((m) => (
              <button
                key={m.k}
                type="button"
                onClick={() => onToggleReveal(m.k)}
                className={`rounded-[12px] border p-3 text-left ${reveal[m.k] ? 'bg-[var(--verm-soft)] border-[var(--verm)]' : 'bg-[var(--paper-2)]'}`}
              >
                <div className="text-[13px] font-medium">{m.l}</div>
                <div className="text-[11px] text-[var(--ink-mute)]">
                  {reveal[m.k] ? 'ON' : 'OFF'}
                </div>
              </button>
            ))}
          </div>
          <div className="rounded-[16px] border p-4 bg-white dark:bg-[#181611] space-y-3">
            <div className="text-[12px] uppercase tracking-wide font-semibold">
              Display Options
            </div>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[13px]">Show Pinyin / 拼音</span>
              <input
                type="checkbox"
                checked={showPinyin}
                onChange={(e) => onShowPinyin(e.target.checked)}
                className="accent-[var(--verm)]"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[13px]">Show Zhuyin / 注音</span>
              <input
                type="checkbox"
                checked={showZhuyin}
                onChange={(e) => onShowZhuyin(e.target.checked)}
                className="accent-[var(--verm)]"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[13px]">Show Definitions Inline</span>
              <input
                type="checkbox"
                checked={showDefsInline}
                onChange={(e) => onShowDefsInline(e.target.checked)}
                className="accent-[var(--verm)]"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[13px]">Tone Colors</span>
              <input
                type="checkbox"
                checked={toneColors}
                onChange={(e) => onToneColors(e.target.checked)}
                className="accent-[var(--verm)]"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[13px]">Show Sentence-Level Toggles</span>
              <input
                type="checkbox"
                checked={showSentenceChips}
                onChange={(e) => onShowSentenceChips(e.target.checked)}
                className="accent-[var(--verm)]"
              />
            </label>
            {brand.features.speech && (
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-[13px]">Show Speaker Button</span>
                <input
                  type="checkbox"
                  checked={showSpeakerButtons}
                  onChange={(e) => onShowSpeakerButtons(e.target.checked)}
                  className="accent-[var(--verm)]"
                />
              </label>
            )}
            {brand.features.speakOnClick && (
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-[13px]">Speak On Click</span>
                <input
                  type="checkbox"
                  checked={speakOnClick}
                  onChange={(e) => onSpeakOnClick(e.target.checked)}
                  className="accent-[var(--verm)]"
                />
              </label>
            )}
            {brand.features.charSize && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px]">Character Size</span>
                  <span className="text-[11px] font-mono text-[var(--ink-mute)]">
                    {Math.round(charSize * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.85}
                  max={1.6}
                  step={0.05}
                  value={charSize}
                  onChange={(e) => onCharSize(parseFloat(e.target.value))}
                  className="w-full accent-[var(--verm)]"
                />
              </div>
            )}
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[13px]">Paginated Reading / 分页</span>
              <input
                type="checkbox"
                checked={pageMode}
                onChange={(e) => onPageMode(e.target.checked)}
                className="accent-[var(--verm)]"
              />
            </label>
          </div>
          {brand.features.inspector && (
          <div className="rounded-[16px] border p-4 bg-white dark:bg-[#181611]">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[12px] uppercase tracking-wide font-semibold">
                Character Inspector
              </div>
              {inspectedChar && (
                <button
                  type="button"
                  aria-label="Close character inspector"
                  onClick={onClearInspected}
                  className="h-6 w-6 rounded-full border flex items-center justify-center text-[11px]"
                >
                  ✕
                </button>
              )}
            </div>
            {!inspectedChar ? (
              <div className="text-[13px] text-[var(--ink-mute)]">
                Tap any Chinese character in the article
              </div>
            ) : (
              <CharInspector
                char={inspectedChar}
                toneColors={toneColors}
                showZhuyin={showZhuyin}
                note={note}
                onNote={onNote}
                onSpeak={onSpeak}
                onCopy={onCopy}
                onAddToList={onAddToList}
                inList={studyListHasChar}
                compact
                dict={dict}
              />
            )}
          </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onCopy(englishText(doc), 'EN')}
              className="flex-1 rounded-full border py-2 text-[12px]"
            >
              Copy EN
            </button>
            <button
              type="button"
              onClick={() => onCopy(chineseText(doc), '中文')}
              className="flex-1 rounded-full border py-2 text-[12px]"
            >
              Copy 中文
            </button>
          </div>
          <div className="text-[11px] text-[var(--ink-mute)] leading-[1.6] text-center">
            Word readings{' '}
            <a
              href="https://cc-cedict.org"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-dotted underline-offset-2"
            >
              CC-CEDICT
            </a>{' '}
            (CC BY-SA 4.0)
            {dictStatus === 'loading'
              ? ' · loading…'
              : dictStatus === 'ready'
                ? ' · ready'
                : dictStatus === 'unavailable'
                  ? ' · unavailable offline'
                  : ''}
          </div>
          <div className="text-[11px] text-[var(--ink-mute)] leading-[1.6] text-center">
            Classical word breaks{' '}
            <a
              href="https://github.com/jiaeyan/Jiayan"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-dotted underline-offset-2"
            >
              Jiayan
            </a>{' '}
            (MIT)
          </div>
        </div>
      </div>
    </div>
  );
}
