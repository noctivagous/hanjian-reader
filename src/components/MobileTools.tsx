import type { Doc } from '../data/types';
import { chineseText, englishText } from '../lib/doc';
import { CharInspector } from './CharInspector';
import type { Reveal } from './Reader';

const MODES: { k: keyof Reveal; l: string }[] = [
  { k: 'words', l: 'Words 词语' },
  { k: 'sentences', l: 'Sentences 句子' },
  { k: 'paragraphs', l: 'Paragraphs 段落' },
  { k: 'full', l: 'Full 全文' },
];

interface Props {
  doc: Doc;
  open: boolean;
  onClose: () => void;
  reveal: Reveal;
  onToggleReveal: (k: keyof Reveal) => void;
  inspectedChar: string | null;
  onCopy: (text: string, label: string) => void;
}

export function MobileTools({
  doc,
  open,
  onClose,
  reveal,
  onToggleReveal,
  inspectedChar,
  onCopy,
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
          <div className="grid grid-cols-2 gap-2">
            {MODES.map((m) => (
              <button
                key={m.k}
                type="button"
                onClick={() => onToggleReveal(m.k)}
                className={`rounded-[12px] border p-3 text-left ${reveal[m.k] ? 'bg-[#FFF0EB] border-[#C73E1D]' : 'bg-[var(--paper-2)]'}`}
              >
                <div className="text-[13px] font-medium">{m.l}</div>
                <div className="text-[11px] text-[var(--ink-mute)]">
                  {reveal[m.k] ? 'ON' : 'OFF'}
                </div>
              </button>
            ))}
          </div>
          <div className="rounded-[16px] border p-4 bg-white dark:bg-[#181611]">
            <div className="text-[12px] uppercase tracking-wide font-semibold mb-3">
              Character Inspector
            </div>
            {!inspectedChar ? (
              <div className="text-[13px] text-[var(--ink-mute)]">
                Tap any Chinese character in the article
              </div>
            ) : (
              <CharInspector
                char={inspectedChar}
                toneColors
                note=""
                onNote={() => {}}
                onSpeak={() => {}}
                onCopy={onCopy}
                onAddToList={() => {}}
                compact
              />
            )}
          </div>
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
        </div>
      </div>
    </div>
  );
}
