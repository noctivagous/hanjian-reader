import type { ReactNode } from 'react';
import type { Doc, Sentence } from '../data/types';
import { allParagraphs, paragraphEn, primaryTranslation } from '../lib/doc';
import { toneColor } from '../lib/pinyin';
import { tokenizeChinese } from '../lib/tokenize';
import { zhuyinForWord } from '../lib/zhuyin';
import type { HoverState } from './WordCard';

export interface Reveal {
  words: boolean;
  sentences: boolean;
  paragraphs: boolean;
  full: boolean;
}

/** Language shown as the main text; the other language is revealed. */
export type PrimaryLang = 'en' | 'zh';

interface Props {
  doc: Doc;
  reveal: Reveal;
  primaryLang: PrimaryLang;
  showPinyin: boolean;
  showZhuyin: boolean;
  toneColors: boolean;
  showDefsInline: boolean;
  fontScale: number;
  charSize: number;
  openSentences: Set<string>;
  closedSentences: Set<string>;
  onToggleSentence: (id: string) => void;
  search: string;
  pinnedKey: string | null;
  onPin: (key: string | null) => void;
  hover: HoverState | null;
  onHover: (h: HoverState | null) => void;
  inspectedChar: string | null;
  onInspectChar: (c: string) => void;
  onSpeak: (text: string) => void;
}

/** True when `ch` is the inspected character or part of the inspected word. */
function isInspected(inspectedChar: string | null, ch: string): boolean {
  return inspectedChar !== null && Array.from(inspectedChar).includes(ch);
}

function highlight(text: string, query: string): ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[#FFE5B4] dark:bg-[#3A2A16] rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function HanChar({
  ch,
  inspected,
  onInspect,
  className,
}: {
  ch: string;
  inspected: boolean;
  onInspect: () => void;
  className?: string;
}) {
  if (ch.trim() === '') return <span>{ch}</span>;
  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        onInspect();
      }}
      className={`han-char inline-block px-0.5 rounded-[4px] cursor-pointer hover:bg-[#FFE0D2] dark:hover:bg-[#3A221C] transition ${inspected ? '!bg-[#C73E1D] !text-white' : ''} ${className || ''}`}
    >
      {ch}
    </span>
  );
}

function SentenceView({
  sentence,
  reveal,
  primaryLang,
  showPinyin,
  showZhuyin,
  toneColors,
  showDefsInline,
  charSize,
  open,
  onToggle,
  search,
  pinnedKey,
  onPin,
  onHover,
  inspectedChar,
  onInspectChar,
  onSpeak,
}: Props & { sentence: Sentence; open: boolean; onToggle: () => void }) {
  const translation = primaryTranslation(sentence);
  const words = translation?.words ?? [];
  const enText = translation?.text ?? '';
  const enPrimary = primaryLang === 'en';
  const zhTokens = enPrimary ? [] : tokenizeChinese(sentence.zh, words);
  const matched =
    search !== '' &&
    (enText.toLowerCase().includes(search.toLowerCase()) ||
      sentence.zh.includes(search));

  return (
    <div
      className={`relative leading-[1.9] ${matched ? 'bg-[#FFF6E8] dark:bg-[#2A2214] rounded' : ''}`}
    >
      <span className="sentence">
        {!translation ? (
          <span className="serif-sc text-[18px]">
            {Array.from(sentence.zh).map((ch, i) => (
              <HanChar
                key={i}
                ch={ch}
                inspected={isInspected(inspectedChar, ch)}
                onInspect={() => onInspectChar(ch)}
              />
            ))}
          </span>
        ) : enPrimary && words.length > 0 ? (
          words.map((w, i) => {
            const key = `${sentence.id}_${i}`;
            const hasZh = !!w.zh;
            const pinned = pinnedKey === key;
            return (
              <span className="inline" key={key}>
                <span
                  onMouseEnter={(e) => {
                    if (!reveal.words || !w.zh) return;
                    onHover({
                      key,
                      rect: e.currentTarget.getBoundingClientRect(),
                      data: w,
                    });
                  }}
                  onMouseLeave={() => {
                    if (pinnedKey !== key) onHover(null);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!w.zh) return;
                    if (pinnedKey === key) {
                      onPin(null);
                    } else {
                      onPin(key);
                      onHover({
                        key,
                        rect: e.currentTarget.getBoundingClientRect(),
                        data: w,
                      });
                    }
                  }}
                  className={`cursor-pointer transition relative ${hasZh && reveal.words ? 'border-b border-dotted border-[#C73E1D]/60 hover:bg-[#FFF0EB] dark:hover:bg-[#2A1A16] rounded-sm px-0.5' : 'px-0.5'} ${pinned ? '!bg-[#C73E1D] !text-white rounded' : ''}`}
                >
                  {search ? highlight(w.en, search) : w.en}
                  {hasZh && reveal.words && showDefsInline && (
                    <span className="ml-1 text-[11px] text-[var(--verm)] font-medium">
                      ({w.zh})
                    </span>
                  )}
                </span>
                <span className="inline"> </span>
              </span>
            );
          })
        ) : !enPrimary && words.length > 0 ? (
          <span
            className="serif-sc text-[18px]"
            style={{ fontSize: `${charSize}em` }}
          >
            {zhTokens.map((tok, i) => {
              const w = tok.word;
              if (!w) {
                return (
                  <span key={`${sentence.id}_t${i}`}>
                    {Array.from(tok.text).map((ch, j) => (
                      <HanChar
                        key={j}
                        ch={ch}
                        inspected={isInspected(inspectedChar, ch)}
                        onInspect={() => onInspectChar(ch)}
                      />
                    ))}
                  </span>
                );
              }
              const key = `${sentence.id}_t${i}`;
              const pinned = pinnedKey === key;
              return (
                <span
                  key={key}
                  onMouseEnter={(e) => {
                    if (!reveal.words) return;
                    onHover({
                      key,
                      rect: e.currentTarget.getBoundingClientRect(),
                      data: w,
                    });
                  }}
                  onMouseLeave={() => {
                    if (pinnedKey !== key) onHover(null);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (pinnedKey === key) {
                      onPin(null);
                    } else {
                      onPin(key);
                      onHover({
                        key,
                        rect: e.currentTarget.getBoundingClientRect(),
                        data: w,
                      });
                    }
                  }}
                  className={`cursor-pointer transition relative ${reveal.words ? 'border-b border-dotted border-[#C73E1D]/60 hover:bg-[#FFF0EB] dark:hover:bg-[#2A1A16] rounded-sm px-0.5' : 'px-0.5'} ${pinned ? '!bg-[#C73E1D] !text-white rounded' : ''}`}
                >
                  {search && tok.text.includes(search)
                    ? highlight(tok.text, search)
                    : tok.text}
                  {reveal.words && showDefsInline && w.en && (
                    <span className="ml-1 text-[11px] text-[var(--verm)] font-medium">
                      ({w.en})
                    </span>
                  )}
                </span>
              );
            })}
          </span>
        ) : !enPrimary ? (
          <span
            className="serif-sc text-[18px]"
            style={{ fontSize: `${charSize}em` }}
          >
            {Array.from(sentence.zh).map((ch, i) => (
              <HanChar
                key={i}
                ch={ch}
                inspected={isInspected(inspectedChar, ch)}
                onInspect={() => onInspectChar(ch)}
              />
            ))}
          </span>
        ) : (
          <span className="text-[16px] md:text-[18px]">
            {highlight(enText, search)}
          </span>
        )}
      </span>
      <button
        type="button"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`ml-2 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] tracking-wide transition ${open ? 'bg-[var(--verm)] text-white border-[var(--verm)]' : 'border-[var(--line)] hover:border-[var(--verm)] hover:text-[var(--verm)] bg-[var(--paper-2)]'}`}
      >
        <span className={enPrimary ? 'serif-sc' : ''}>
          {enPrimary ? '中文' : 'English'}
        </span>
        <span className="opacity-70">{open ? '−' : '+'}</span>
      </button>
      <div
        className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="rounded-[12px] bg-[#FFF8F0] dark:bg-[#1C1A16] border border-[#F2E6D6] dark:border-[#2A2722] border-l-2 border-l-[#C73E1D] p-4">
            {!enPrimary ? (
              <div className="flex items-start justify-between gap-3">
                <p className="text-[16px] leading-[1.8]">
                  {highlight(enText, search)}
                </p>
                <button
                  type="button"
                  onClick={() => onSpeak(sentence.zh)}
                  className="shrink-0 h-7 w-7 rounded-full bg-white dark:bg-[#121210] border border-[var(--line)] flex items-center justify-center hover:border-[var(--verm)]"
                >
                  🔊
                </button>
              </div>
            ) : (
              <>
            <div className="flex items-start justify-between gap-3">
              <div
                className="serif-sc leading-[1.9] text-[18px]"
                style={{ fontSize: `${0.95 * charSize}em` }}
              >
                {Array.from(sentence.zh).map((ch, i) => (
                  <HanChar
                    key={i}
                    ch={ch}
                    inspected={isInspected(inspectedChar, ch)}
                    onInspect={() => onInspectChar(ch)}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => onSpeak(sentence.zh)}
                className="shrink-0 h-7 w-7 rounded-full bg-white dark:bg-[#121210] border border-[var(--line)] flex items-center justify-center hover:border-[var(--verm)]"
              >
                🔊
              </button>
            </div>
            {(showPinyin || showZhuyin) && (
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
                {words
                  .filter((w) => w.zh)
                  .map((w, i) => {
                    const zhuyin = showZhuyin ? zhuyinForWord(w.pinyin) : null;
                    return (
                      <span key={i} className="inline-flex items-center gap-1">
                        <span className="serif-sc">{w.zh}</span>
                        {showPinyin && (
                          <span
                            style={{ color: toneColor(w.pinyin, toneColors) }}
                            className="font-mono text-[11px]"
                          >
                            {w.pinyin}
                          </span>
                        )}
                        {zhuyin && (
                          <span className="font-mono text-[11px] text-[var(--ink-mute)]">
                            {zhuyin}
                          </span>
                        )}
                        <span className="text-[var(--ink-mute)] text-[11px]">
                          {w.def}
                        </span>
                      </span>
                    );
                  })}
              </div>
            )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const NOISE_BG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`;

export function Reader(props: Props) {
  const { doc, reveal, primaryLang, fontScale, charSize, inspectedChar, onInspectChar, onSpeak } = props;
  const enPrimary = primaryLang === 'en';

  return (
    <div
      className="w-full max-w-[760px] px-6 md:px-10 py-10 md:py-14 bg-[#FFFEFB] dark:bg-[#121210] relative"
      style={{ fontSize: `${fontScale}em` }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025] mix-blend-multiply"
        style={{ backgroundImage: NOISE_BG }}
      />
      <div className="mb-10 relative">
        <div className="inline-flex items-center gap-2 mb-3">
          <span className="h-px w-8 bg-[var(--verm)]" />
          <span className="text-[11px] tracking-[0.2em] uppercase text-[var(--verm)]">
            Parallel Text · 双语对照
          </span>
        </div>
        <h1 className="serif-display text-[42px] md:text-[52px] leading-[0.95] tracking-tight font-[700]">
          {enPrimary ? doc.titleEn : doc.titleZh}
        </h1>
        <div className="mt-2 flex items-baseline gap-3">
          <span
            className={`serif-sc text-[20px] text-[var(--ink-mute)] transition-all ${reveal.paragraphs || reveal.full ? 'opacity-100' : 'opacity-70'}`}
          >
            {enPrimary ? doc.titleZh : doc.titleEn}
          </span>
          {doc.author && (
            <span className="text-[13px] text-[var(--ink-mute)]">
              — {doc.author}
            </span>
          )}
        </div>
        <div className="mt-6 h-px bg-[var(--line)] w-full" />
      </div>

      <div className="space-y-10">
        {doc.sections.map((section, sIdx) => {
          const offset = doc.sections
            .slice(0, sIdx)
            .reduce((n, s) => n + s.paragraphs.length, 0);
          return (
            <div key={section.id} className="space-y-10">
              {(section.titleEn || section.titleZh) && (
                <div>
                  {(enPrimary ? section.titleEn : section.titleZh) && (
                    <h2 className="serif-display text-[28px] font-semibold tracking-tight">
                      {enPrimary ? section.titleEn : section.titleZh}
                    </h2>
                  )}
                  {(enPrimary ? section.titleZh : section.titleEn) && (
                    <div className="serif-sc text-[18px] text-[var(--ink-mute)]">
                      {enPrimary ? section.titleZh : section.titleEn}
                    </div>
                  )}
                </div>
              )}
              {section.paragraphs.map((para, localIdx) => {
                const pIdx = offset + localIdx;
                return (
          <div className="group/para relative" key={para.id}>
            <div className="absolute -left-6 top-1 hidden md:block text-[10px] text-[var(--ink-mute)] font-mono">
              {String(pIdx + 1).padStart(2, '0')}
            </div>
            <div className="space-y-4">
              {para.sentences.map((s) => (
                <SentenceView
                  key={s.id}
                  {...props}
                  sentence={s}
                  open={
                    reveal.sentences
                      ? !props.closedSentences.has(s.id)
                      : props.openSentences.has(s.id)
                  }
                  onToggle={() => props.onToggleSentence(s.id)}
                />
              ))}
            </div>
            <div
              className={`grid transition-all duration-500 ${reveal.paragraphs ? 'grid-rows-[1fr] opacity-100 mt-6' : 'grid-rows-[0fr] opacity-0'}`}
            >
              <div className="overflow-hidden">
                <div className="rounded-[14px] bg-[#FFF8F0] dark:bg-[#1C1A16] border border-l-2 border-l-[#C73E1D] border-[#EFE0CF] dark:border-[#2A2722] p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] tracking-[0.18em] uppercase text-[var(--verm)]">
                      {enPrimary
                        ? `段落 · Paragraph ${pIdx + 1}`
                        : `English · Paragraph ${pIdx + 1}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSpeak(para.zh)}
                      className="text-[12px] border rounded-full px-2.5 py-1 hover:border-[var(--verm)]"
                    >
                      🔊 Play
                    </button>
                  </div>
                  {enPrimary ? (
                    <p
                      className="serif-sc text-[20px] leading-[2] tracking-wide"
                      style={{ fontSize: `${charSize}em` }}
                    >
                      {Array.from(para.zh).map((ch, i) => (
                        <HanChar
                          key={i}
                          ch={ch}
                          inspected={isInspected(inspectedChar, ch)}
                          onInspect={() => onInspectChar(ch)}
                          className="cursor-pointer rounded hover:bg-[#FFE0D2]"
                        />
                      ))}
                    </p>
                  ) : (
                    <p className="text-[16px] leading-[1.9]">
                      {paragraphEn(para)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div
        className={`mt-14 border-t border-dashed border-[var(--line)] pt-10 transition-all ${reveal.full ? 'opacity-100' : 'opacity-40'}`}
      >
        {reveal.full ? (
          <div className="grid md:grid-cols-2 gap-8">
            <div className={enPrimary ? '' : 'md:order-2 md:border-l md:border-[var(--line)] md:pl-8'}>
              <h3 className="text-[11px] tracking-[0.2em] uppercase text-[var(--ink-mute)] mb-4">
                English — Full Text
              </h3>
              <div className="space-y-4 text-[15px] leading-[1.8] opacity-80">
                {allParagraphs(doc).map((p) => (
                  <p key={p.id}>{paragraphEn(p)}</p>
                ))}
              </div>
            </div>
            <div className={enPrimary ? 'md:border-l md:border-[var(--line)] md:pl-8' : 'md:order-1'}>
              <h3 className="text-[11px] tracking-[0.2em] uppercase text-[var(--verm)] mb-4">
                中文 · 全文
              </h3>
              <div
                className="space-y-4 serif-sc text-[19px] leading-[2]"
                style={{ fontSize: `${charSize}em` }}
              >
                {allParagraphs(doc).map((p) => (
                  <p key={`${p.id}zh`}>
                    {Array.from(p.zh).map((ch, i) => (
                      <span
                        key={i}
                        onClick={() => onInspectChar(ch)}
                        className={`cursor-pointer rounded px-0.5 hover:bg-[#FFE0D2] ${isInspected(inspectedChar, ch) ? 'bg-[#C73E1D] text-white' : ''}`}
                      >
                        {ch}
                      </span>
                    ))}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-[13px] text-[var(--ink-mute)]">
            Enable{' '}
            <span className="text-[var(--verm)]">Full Document 全文</span> in
            toolbar to see side-by-side view (F)
          </div>
        )}
      </div>

      <div className="mt-20 pt-8 border-t border-[var(--line)] flex items-center justify-between text-[12px] text-[var(--ink-mute)]">
        <span>HanJian · Literary reader for modern Chinese</span>
        <span>
          {allParagraphs(doc).length} paragraphs ·{' '}
          {allParagraphs(doc).reduce((n, p) => n + p.sentences.length, 0)}{' '}
          sentences
        </span>
      </div>
    </div>
  );
}
