import type { Doc } from '../data/types';
import { CharInspector } from './CharInspector';
import type { Reveal } from './Reader';

const MODES: { k: keyof Reveal; label: string; sub: string; icon: string; hint: string }[] = [
  { k: 'words', label: 'Words / 词语', sub: 'Hover English words to see Chinese', icon: 'Aa→字', hint: 'W' },
  { k: 'sentences', label: 'Sentences / 句子', sub: 'Toggle per-sentence Chinese', icon: 'S', hint: 'S' },
  { k: 'paragraphs', label: 'Paragraphs / 段落', sub: 'Show Chinese paragraph cards', icon: '¶', hint: 'P' },
  { k: 'full', label: 'Full Document / 全文', sub: 'Side-by-side full view', icon: 'Doc', hint: 'F' },
];

interface Props {
  doc: Doc;
  reveal: Reveal;
  onToggleReveal: (k: keyof Reveal) => void;
  showPinyin: boolean;
  onShowPinyin: (v: boolean) => void;
  showDefsInline: boolean;
  onShowDefsInline: (v: boolean) => void;
  toneColors: boolean;
  onToneColors: (v: boolean) => void;
  charSize: number;
  onCharSize: (v: number) => void;
  search: string;
  onSearch: (v: string) => void;
  inspectedChar: string | null;
  note: string;
  onNote: (char: string, note: string) => void;
  onSpeak: (text: string) => void;
  onCopy: (text: string, label: string) => void;
  onAddToList: () => void;
  onImport: () => void;
  collapsed: boolean;
}

export function Sidebar(p: Props) {
  const activeCount = Object.values(p.reveal).filter(Boolean).length;

  return (
    <aside
      className={`hidden lg:flex flex-col w-[360px] shrink-0 sticky top-[64px] h-[calc(100vh-64px)] border-l border-[var(--line)] bg-[var(--glass)] backdrop-blur-xl overflow-y-auto transition-all duration-300 ${p.collapsed ? '!w-0 overflow-hidden border-l-0' : ''}`}
    >
      <div className="p-6 space-y-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="serif-display text-[18px] font-semibold tracking-tight">
              Reveal 中文
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--verm-soft)] text-[var(--verm)] border border-[#F2C4B8]">
              {activeCount}/4 active
            </span>
          </div>
          <div className="space-y-3">
            {MODES.map((m) => (
              <div
                key={m.k}
                className={`group flex items-center justify-between rounded-[12px] border p-3 transition ${p.reveal[m.k] ? 'bg-white dark:bg-[#1A1916] border-[#E8D8C8] shadow-sm' : 'bg-[var(--paper-2)] border-[var(--line)] hover:border-[#D8C9B5]'}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-8 w-8 rounded-[8px] flex items-center justify-center text-[12px] font-mono border ${p.reveal[m.k] ? 'bg-[var(--verm)] text-white border-[var(--verm)]' : 'bg-white dark:bg-[#121210] border-[var(--line)]'}`}
                  >
                    {m.icon}
                  </div>
                  <div>
                    <div className="text-[13px] font-medium leading-tight">
                      {m.label}
                    </div>
                    <div className="text-[11px] text-[var(--ink-mute)] leading-tight">
                      {m.sub}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--line)]">
                    {m.hint}
                  </span>
                  <button
                    type="button"
                    onClick={() => p.onToggleReveal(m.k)}
                    className={`relative h-6 w-10 rounded-full transition ${p.reveal[m.k] ? 'bg-[var(--verm)]' : 'bg-[#D8D0C5]'}`}
                  >
                    <span
                      className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
                      style={{ left: p.reveal[m.k] ? '18px' : '2px' }}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[14px] border border-[var(--line)] bg-white dark:bg-[#181611] p-4 space-y-4">
          <h3 className="text-[12px] tracking-[0.15em] uppercase font-semibold">
            Display Options
          </h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[13px]">Show Pinyin / 拼音</span>
              <input
                type="checkbox"
                checked={p.showPinyin}
                onChange={(e) => p.onShowPinyin(e.target.checked)}
                className="accent-[#C73E1D]"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[13px]">Show Definitions Inline</span>
              <input
                type="checkbox"
                checked={p.showDefsInline}
                onChange={(e) => p.onShowDefsInline(e.target.checked)}
                className="accent-[#C73E1D]"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[13px]">Tone Colors</span>
              <input
                type="checkbox"
                checked={p.toneColors}
                onChange={(e) => p.onToneColors(e.target.checked)}
                className="accent-[#C73E1D]"
              />
            </label>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px]">Character Size</span>
                <span className="text-[11px] font-mono text-[var(--ink-mute)]">
                  {Math.round(p.charSize * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.85}
                max={1.6}
                step={0.05}
                value={p.charSize}
                onChange={(e) => p.onCharSize(parseFloat(e.target.value))}
                className="w-full accent-[#C73E1D]"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-[12px] tracking-[0.15em] uppercase font-semibold">
            Search
          </h3>
          <div className="relative">
            <input
              value={p.search}
              onChange={(e) => p.onSearch(e.target.value)}
              placeholder="Search English or 中文..."
              className="w-full rounded-full border border-[var(--line)] bg-white dark:bg-[#181611] px-4 py-2 text-[13px] outline-none focus:border-[var(--verm)]"
            />
            {p.search && (
              <button
                type="button"
                onClick={() => p.onSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px]"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="sticky top-6">
          <div className="rounded-[16px] border border-[var(--line)] bg-white dark:bg-[#181611] overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            <div className="px-4 py-3 border-b border-[var(--line)] flex items-center justify-between">
              <h3 className="text-[12px] tracking-[0.15em] uppercase font-semibold">
                Character Inspector
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--paper-2)] border border-[var(--line)]">
                点击汉字查看
              </span>
            </div>
            {!p.inspectedChar ? (
              <div className="p-8 text-center">
                <div className="mx-auto h-16 w-16 rounded-full bg-[var(--verm-soft)] flex items-center justify-center text-[28px] mb-3">
                  字
                </div>
                <div className="text-[14px] font-medium">
                  Click any Chinese character to inspect
                </div>
                <div className="text-[12px] text-[var(--ink-mute)] mt-1">
                  点击汉字查看详细释义、拼音、部首与笔顺
                </div>
                <div className="mt-6 grid grid-cols-3 gap-2 text-[11px]">
                  <div className="rounded-lg bg-[var(--paper-2)] p-2">
                    Radical<br />部首
                  </div>
                  <div className="rounded-lg bg-[var(--paper-2)] p-2">
                    HSK<br />等级
                  </div>
                  <div className="rounded-lg bg-[var(--paper-2)] p-2">
                    Strokes<br />笔画
                  </div>
                </div>
              </div>
            ) : (
              <CharInspector
                char={p.inspectedChar}
                toneColors={p.toneColors}
                note={p.note}
                onNote={p.onNote}
                onSpeak={p.onSpeak}
                onCopy={p.onCopy}
                onAddToList={p.onAddToList}
              />
            )}
          </div>
        </div>

        <div className="rounded-[14px] border border-[var(--line)] bg-[var(--paper-2)] p-4 space-y-3">
          <h3 className="text-[12px] tracking-[0.15em] uppercase font-semibold">
            Document Tools
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() =>
                p.onCopy(p.doc.paragraphs.map((x) => x.en).join('\n\n'), 'English')
              }
              className="rounded-full border bg-white dark:bg-[#181611] py-1.5 text-[11px] hover:border-[var(--verm)]"
            >
              Copy EN
            </button>
            <button
              type="button"
              onClick={() =>
                p.onCopy(p.doc.paragraphs.map((x) => x.zh).join('\n\n'), 'Chinese')
              }
              className="rounded-full border bg-white dark:bg-[#181611] py-1.5 text-[11px] hover:border-[var(--verm)]"
            >
              Copy 中文
            </button>
            <button
              type="button"
              onClick={() =>
                p.onCopy(
                  p.doc.paragraphs.map((x) => `${x.en}\n${x.zh}`).join('\n\n'),
                  'Bilingual',
                )
              }
              className="rounded-full border bg-white dark:bg-[#181611] py-1.5 text-[11px] hover:border-[var(--verm)]"
            >
              Copy 双语
            </button>
          </div>
          <button
            type="button"
            onClick={p.onImport}
            className="w-full rounded-full border border-dashed border-[var(--line)] py-2 text-[12px] hover:border-[var(--verm)] hover:text-[var(--verm)]"
          >
            + Import Custom Document
          </button>
        </div>

        <div className="text-[11px] text-[var(--ink-mute)] leading-[1.6] border-t border-[var(--line)] pt-4">
          <div className="font-semibold text-[var(--ink)]">How to read</div>
          Start in English. Reveal Chinese progressively: words for quick
          lookup, sentences for structure, paragraphs for flow, full for
          immersion. Click any 汉字 to inspect in this panel.
        </div>
      </div>
    </aside>
  );
}
