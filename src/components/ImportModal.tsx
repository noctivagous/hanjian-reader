import { useMemo, useRef, useState } from 'react';
import type { Doc } from '../data/types';
import { parseHanjianDocJson } from '../lib/docFile';
import { analyzeImport } from '../lib/segment';

export interface ImportDraft {
  en: string;
  zh: string;
  titleEn: string;
  titleZh: string;
}

interface Props {
  /** Draft lives in App, so closing the modal no longer loses the text. */
  draft: ImportDraft;
  onDraftChange: (patch: Partial<ImportDraft>) => void;
  onImport: (en: string, zh: string, titleEn: string, titleZh: string) => void;
  onImportJson: (doc: Doc) => void;
  onClose: () => void;
}

export function ImportModal({
  draft,
  onDraftChange,
  onImport,
  onImportJson,
  onClose,
}: Props) {
  const { en, zh, titleEn, titleZh } = draft;
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fileTarget = useRef<'en' | 'zh' | 'json'>('json');

  const analysis = useMemo(
    () => (en || zh ? analyzeImport(en, zh) : null),
    [en, zh],
  );
  const warnings: string[] = [];
  if (analysis) {
    if (analysis.droppedZhParagraphs > 0)
      warnings.push(
        `${analysis.droppedZhParagraphs} Chinese paragraph(s) have no English counterpart and will be dropped.`,
      );
    if (analysis.emptyZhParagraphs > 0)
      warnings.push(
        `${analysis.emptyZhParagraphs} English paragraph(s) have no Chinese counterpart and will import with empty Chinese.`,
      );
    if (analysis.droppedZhSentences > 0)
      warnings.push(
        `${analysis.droppedZhSentences} Chinese sentence(s) have no English pair and will be dropped.`,
      );
  }

  const routeFile = async (file: File, target: 'en' | 'zh' | 'json') => {
    setFileError(null);
    const text = await file.text();
    if (target === 'json' || file.name.toLowerCase().endsWith('.json')) {
      const doc = parseHanjianDocJson(text);
      if (!doc) {
        setFileError('That file is not a valid .hanjian.json document.');
        return;
      }
      onImportJson(doc);
      return;
    }
    onDraftChange(target === 'en' ? { en: text } : { zh: text });
  };

  const pickFile = (target: 'en' | 'zh' | 'json') => {
    fileTarget.current = target;
    fileRef.current?.click();
  };

  const dropInto =
    (target: 'en' | 'zh') =>
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) void routeFile(file, target);
    };

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
          <input
            ref={fileRef}
            type="file"
            accept=".json,.txt,.md,application/json,text/plain"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void routeFile(file, fileTarget.current);
              e.target.value = '';
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => pickFile('json')}
              className="rounded-full border px-3.5 py-1.5 text-[12px] hover:border-[var(--verm)]"
            >
              Open .hanjian.json…
            </button>
            <span className="text-[11px] text-[var(--ink-mute)]">
              or load a text file:
            </span>
            <button
              type="button"
              onClick={() => pickFile('en')}
              className="rounded-full border px-3.5 py-1.5 text-[12px] hover:border-[var(--verm)]"
            >
              File → English
            </button>
            <button
              type="button"
              onClick={() => pickFile('zh')}
              className="rounded-full border px-3.5 py-1.5 text-[12px] hover:border-[var(--verm)]"
            >
              File → 中文
            </button>
            <span className="text-[11px] text-[var(--ink-mute)]">
              (or drop a file onto a text box)
            </span>
          </div>
          {fileError && (
            <div className="text-[12px] text-[var(--verm)]">{fileError}</div>
          )}
          <div className="grid md:grid-cols-2 gap-3">
            <input
              value={titleEn}
              onChange={(e) => onDraftChange({ titleEn: e.target.value })}
              placeholder="Title English"
              className="rounded-full border px-4 py-2 text-[13px] bg-white dark:bg-[#181611] outline-none"
            />
            <input
              value={titleZh}
              onChange={(e) => onDraftChange({ titleZh: e.target.value })}
              placeholder="标题 中文"
              className="rounded-full border px-4 py-2 text-[13px] bg-white dark:bg-[#181611] outline-none"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div onDragOver={(e) => e.preventDefault()} onDrop={dropInto('en')}>
              <div className="text-[11px] uppercase tracking-wide font-semibold mb-2">
                English
              </div>
              <textarea
                value={en}
                onChange={(e) => onDraftChange({ en: e.target.value })}
                placeholder={`Paragraphs separated by blank line.\n\nExample:\nThe courtyard was quiet.\n\nThe rain began...`}
                className="w-full h-[280px] rounded-[12px] border bg-white dark:bg-[#181611] p-3 text-[13px] leading-[1.6] outline-none focus:border-[var(--verm)] resize-none"
              />
            </div>
            <div onDragOver={(e) => e.preventDefault()} onDrop={dropInto('zh')}>
              <div className="text-[11px] uppercase tracking-wide font-semibold mb-2">
                中文
              </div>
              <textarea
                value={zh}
                onChange={(e) => onDraftChange({ zh: e.target.value })}
                placeholder={`段落之间空一行\n\n例如：\n庭院很安静。\n\n雨开始下了...`}
                className="w-full h-[280px] rounded-[12px] border bg-white dark:bg-[#181611] p-3 text-[14px] leading-[1.8] outline-none focus:border-[var(--verm)] resize-none serif-sc"
              />
            </div>
          </div>
          {analysis && (
            <div className="space-y-2">
              <div className="text-[12px] text-[var(--ink-mute)]">
                English: {analysis.enParagraphs} paragraph(s) ·{' '}
                {analysis.enSentences} sentence(s) — 中文：{' '}
                {analysis.zhParagraphs} 段 · {analysis.zhSentences} 句
              </div>
              {warnings.length > 0 && (
                <div className="rounded-[10px] border border-[#E8C87A] bg-[#FFF8E6] dark:bg-[#2A2410] dark:border-[#6B5A24] p-3 text-[12px] leading-[1.6]">
                  {warnings.map((w) => (
                    <div key={w}>⚠ {w}</div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-[var(--ink-mute)]">
              Auto-align splits by blank lines → paragraphs, then by 。！？.!? →
              sentences. Word hover disabled for custom docs. Your draft is
              kept if you close this dialog.
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
                className="rounded-full bg-[var(--verm)] text-white px-5 py-2 text-[12px] font-medium disabled:opacity-40"
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
