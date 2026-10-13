import { useState } from 'react';

interface Props {
  onImport: (en: string, zh: string, titleEn: string, titleZh: string) => void;
  onClose: () => void;
}

export function ImportModal({ onImport, onClose }: Props) {
  const [en, setEn] = useState('');
  const [zh, setZh] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [titleZh, setTitleZh] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-[820px] max-h-[90vh] rounded-[20px] bg-[var(--paper)] border border-[var(--line)] shadow-[0_24px_64px_rgba(0,0,0,0.25)] overflow-auto">
        <div className="sticky top-0 bg-[var(--paper)] border-b border-[var(--line)] p-5 flex items-center justify-between">
          <div>
            <div className="serif-display text-[20px] font-semibold">
              Import Custom Document
            </div>
            <div className="text-[12px] text-[var(--ink-mute)]">
              Paste English and Chinese, split by blank lines into paragraphs
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full border flex items-center justify-center"
          >
            ✕
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <input
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder="Title English"
              className="rounded-full border px-4 py-2 text-[13px] bg-white dark:bg-[#181611] outline-none"
            />
            <input
              value={titleZh}
              onChange={(e) => setTitleZh(e.target.value)}
              placeholder="标题 中文"
              className="rounded-full border px-4 py-2 text-[13px] bg-white dark:bg-[#181611] outline-none"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-wide font-semibold mb-2">
                English
              </div>
              <textarea
                value={en}
                onChange={(e) => setEn(e.target.value)}
                placeholder={`Paragraphs separated by blank line.\n\nExample:\nThe courtyard was quiet.\n\nThe rain began...`}
                className="w-full h-[280px] rounded-[12px] border bg-white dark:bg-[#181611] p-3 text-[13px] leading-[1.6] outline-none focus:border-[#C73E1D] resize-none"
              />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide font-semibold mb-2">
                中文
              </div>
              <textarea
                value={zh}
                onChange={(e) => setZh(e.target.value)}
                placeholder={`段落之间空一行\n\n例如：\n庭院很安静。\n\n雨开始下了...`}
                className="w-full h-[280px] rounded-[12px] border bg-white dark:bg-[#181611] p-3 text-[14px] leading-[1.8] outline-none focus:border-[#C73E1D] resize-none serif-sc"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-[var(--ink-mute)]">
              Auto-align splits by blank lines → paragraphs, then by 。！？.!? →
              sentences. Word hover disabled for custom docs.
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border px-4 py-2 text-[12px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onImport(en, zh, titleEn, titleZh)}
                disabled={!en || !zh}
                className="rounded-full bg-[#C73E1D] text-white px-5 py-2 text-[12px] font-medium disabled:opacity-40"
              >
                Import & Read
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
