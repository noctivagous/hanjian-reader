import { useCallback, useMemo, useRef, type ReactNode } from 'react';
import { brand } from '../brand';
import type { Doc, Paragraph, Sentence, WordAlign } from '../data/types';
import { allParagraphs, chineseText, paragraphEn, primaryTranslation } from '../lib/doc';
import type { ReadingProvider } from '../lib/dictionary';
import { toneColor } from '../lib/pinyin';
import {
  canonicalSearchText,
  foldedIndexOf,
  scriptTag,
  zhFontClass,
} from '../lib/script';
import { isLinkedAlign } from '../lib/alignLink';
import {
  englishLabel,
  tokenizeChinese,
  withDictionaryReading,
  type ZhToken,
} from '../lib/tokenize';
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
  showSentenceChips: boolean;
  fontScale: number;
  charSize: number;
  openSentences: Set<string>;
  closedSentences: Set<string>;
  onToggleSentence: (id: string) => void;
  search: string;
  pinnedKey: string | null;
  onPin: (key: string | null, word?: WordAlign) => void;
  /** Active word pair for cross-highlight when a sentence chip is open. */
  linkedAlign: WordAlign | null;
  hover: HoverState | null;
  onHover: (h: HoverState | null) => void;
  inspectedChar: string | null;
  onInspectChar: (c: string) => void;
  onSpeak: (text: string) => void;
  showSpeakerButtons: boolean;
  speakOnClick: boolean;
  dict: ReadingProvider | null;
  /** Classical word breaker (Jiayan). Used for traditional-script docs. */
  segmentZh?: (zh: string) => string[];
}

/** True when `ch` is the inspected character or part of the inspected word. */
function isInspected(inspectedChar: string | null, ch: string): boolean {
  return inspectedChar !== null && Array.from(inspectedChar).includes(ch);
}

function hoverSpanClasses({
  revealWords,
  hasZh,
  pinned,
  linked,
}: {
  revealWords: boolean;
  hasZh: boolean;
  pinned: boolean;
  linked: boolean;
}): string {
  let c = 'cursor-pointer transition relative px-0.5';
  if (revealWords && hasZh) {
    c +=
      ' border-b border-dotted border-[#C73E1D]/60 hover:bg-[#FFF0EB] dark:hover:bg-[#2A1A16] rounded-sm';
  }
  if (pinned) c += ' !bg-[var(--verm)] !text-white rounded';
  else if (linked) {
    c += ' bg-[#FFE8DE] dark:bg-[#3A221C] ring-1 ring-[var(--verm)]/40 rounded-sm';
  }
  return c;
}

function highlight(text: string, query: string): ReactNode {
  if (!query) return text;
  // Cross-script matching (simplified query finds traditional text and
  // vice versa); the original display text is sliced, never rewritten.
  const idx = foldedIndexOf(text, query);
  if (idx === -1) return text;
  const chars = Array.from(text);
  const qlen = Array.from(query).length;
  return (
    <>
      {chars.slice(0, idx).join('')}
      <mark className="bg-[#FFE5B4] dark:bg-[#3A2A16] rounded px-0.5">
        {chars.slice(idx, idx + qlen).join('')}
      </mark>
      {chars.slice(idx + qlen).join('')}
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
      className={`han-char inline-block px-0.5 rounded-[4px] cursor-pointer hover:bg-[#FFE0D2] dark:hover:bg-[#3A221C] transition ${inspected ? '!bg-[var(--verm)] !text-white' : ''} ${className || ''}`}
    >
      {ch}
    </span>
  );
}

function ZhHoverText({
  tokens,
  idPrefix,
  revealWords,
  showDefsInline,
  search,
  pinnedKey,
  onPin,
  onHover,
  linkedAlign,
  crossLink,
  inspectedChar,
  onCharClick,
}: {
  tokens: ZhToken[];
  idPrefix: string;
  revealWords: boolean;
  showDefsInline: boolean;
  search: string;
  pinnedKey: string | null;
  onPin: (key: string | null, word?: WordAlign) => void;
  onHover: (h: HoverState | null) => void;
  linkedAlign: WordAlign | null;
  crossLink: boolean;
  inspectedChar: string | null;
  onCharClick: (ch: string) => void;
}) {
  return (
    <>
      {tokens.map((tok, i) => {
        const w = tok.word;
        if (!w) {
          return (
            <span key={`${idPrefix}_t${i}`}>
              {Array.from(tok.text).map((ch, j) => (
                <HanChar
                  key={j}
                  ch={ch}
                  inspected={isInspected(inspectedChar, ch)}
                  onInspect={() => onCharClick(ch)}
                />
              ))}
            </span>
          );
        }
        const key = `${idPrefix}_t${i}`;
        const pinned = pinnedKey === key;
        const linked =
          !pinned && isLinkedAlign(w, linkedAlign, crossLink);
        return (
          <span
            key={key}
            onMouseEnter={(e) => {
              if (!revealWords) return;
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
                onPin(key, w);
                onHover({
                  key,
                  rect: e.currentTarget.getBoundingClientRect(),
                  data: w,
                });
              }
            }}
            className={hoverSpanClasses({
              revealWords,
              hasZh: true,
              pinned,
              linked,
            })}
          >
            {search && foldedIndexOf(tok.text, search) !== -1
              ? highlight(tok.text, search)
              : tok.text}
            {revealWords && showDefsInline && w.en && (
              <span className="ml-1 text-[11px] text-[var(--verm)] font-medium">
                ({w.en})
              </span>
            )}
          </span>
        );
      })}
    </>
  );
}

const NO_WORDS: WordAlign[] = [];

function paragraphWords(para: Paragraph): WordAlign[] {
  const found = para.sentences.flatMap((s) => primaryTranslation(s)?.words ?? NO_WORDS);
  return found.length > 0 ? found : NO_WORDS;
}

function EnglishAlignedText({
  text,
  words,
  idPrefix,
  revealWords,
  showDefsInline,
  search,
  pinnedKey,
  onPin,
  onHover,
  linkedAlign,
  crossLink,
  dict,
}: {
  text: string;
  words: WordAlign[];
  idPrefix: string;
  revealWords: boolean;
  showDefsInline: boolean;
  search: string;
  pinnedKey: string | null;
  onPin: (key: string | null, word?: WordAlign) => void;
  onHover: (h: HoverState | null) => void;
  linkedAlign: WordAlign | null;
  crossLink: boolean;
  dict: ReadingProvider | null;
}) {
  const aligned = words.filter(
    (word): word is WordAlign & { enStart: number; enEnd: number } =>
      typeof word.enStart === 'number' &&
      typeof word.enEnd === 'number' &&
      Number.isInteger(word.enStart) &&
      Number.isInteger(word.enEnd) &&
      word.enStart >= 0 &&
      word.enEnd > word.enStart &&
      word.enEnd <= text.length,
  );
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (let i = 0; i < aligned.length; i++) {
    const word = aligned[i];
    if (word.enStart < cursor) continue;
    if (word.enStart > cursor) {
      parts.push(
        <span key={`plain-${cursor}`}>{highlight(text.slice(cursor, word.enStart), search)}</span>,
      );
    }
    const key = `${idPrefix}_${i}`;
    const pinned = pinnedKey === key;
    const reading = withDictionaryReading(word, dict ?? undefined);
    const linked =
      !pinned &&
      !!reading.zh &&
      isLinkedAlign(reading, linkedAlign, crossLink);
    parts.push(
      <span
        key={key}
        onMouseEnter={(e) => {
          if (!revealWords) return;
          onHover({
            key,
            rect: e.currentTarget.getBoundingClientRect(),
            data: reading,
          });
        }}
        onMouseLeave={() => {
          if (pinnedKey !== key) onHover(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (!reading.zh) return;
          if (pinnedKey === key) {
            onPin(null);
          } else {
            onPin(key, reading);
            onHover({
              key,
              rect: e.currentTarget.getBoundingClientRect(),
              data: reading,
            });
          }
        }}
        className={hoverSpanClasses({
          revealWords,
          hasZh: !!reading.zh,
          pinned,
          linked,
        })}
      >
        {highlight(text.slice(word.enStart, word.enEnd), search)}
        {revealWords && showDefsInline && reading.zh && (
          <span className="ml-1 text-[11px] text-[var(--verm)] font-medium">
            ({reading.zh})
          </span>
        )}
      </span>,
    );
    cursor = word.enEnd;
  }
  if (cursor < text.length) {
    parts.push(<span key={`plain-${cursor}`}>{highlight(text.slice(cursor), search)}</span>);
  }
  return <>{parts}</>;
}

function SentenceView({
  doc,
  sentence,
  reveal,
  primaryLang,
  showPinyin,
  showZhuyin,
  toneColors,
  showDefsInline,
  showSentenceChips,
  charSize,
  open,
  onToggle,
  search,
  pinnedKey,
  onPin,
  onHover,
  linkedAlign,
  inspectedChar,
  onInspectChar,
  onSpeak,
  showSpeakerButtons,
  speakOnClick,
  dict,
  segmentZh,
}: Props & { sentence: Sentence; open: boolean; onToggle: () => void }) {
  const crossLink = open && reveal.words;
  const canSpeak = brand.features.speech && showSpeakerButtons;
  const zhFont = zhFontClass(doc);
  const handleCharClick = (ch: string) => {
    onInspectChar(ch);
    if (speakOnClick) onSpeak(ch);
  };
  const translation = primaryTranslation(sentence);
  const rawWords = translation?.words ?? NO_WORDS;
  const enText = translation?.text ?? '';
  const enPrimary = primaryLang === 'en';
  const hasEnglishOffsets = rawWords.some(
    (word) => Number.isInteger(word.enStart) && Number.isInteger(word.enEnd),
  );
  const words = rawWords;
  const zhTokens = useMemo(
    () => tokenizeChinese(sentence.zh, words, dict ?? undefined, segmentZh),
    [sentence.zh, words, dict, segmentZh],
  );
  const alignedGloss = words.filter((w) => w.zh);
  const glossWords =
    alignedGloss.length > 0
      ? alignedGloss
      : zhTokens.flatMap((t) => (t.word ? [t.word] : []));
  const foldedQuery = canonicalSearchText(search);
  const matched =
    search !== '' &&
    (canonicalSearchText(enText).includes(foldedQuery) ||
      canonicalSearchText(sentence.zh).includes(foldedQuery));

  const chipPanelRef = useRef<HTMLDivElement>(null);

  const isRevealPanelHover = useCallback(
    (key: string) => {
      if (key.includes('_chip')) return true;
      if (!enPrimary && key.startsWith(`${sentence.id}_en`)) return true;
      return false;
    },
    [enPrimary, sentence.id],
  );

  const handleHover = useCallback(
    (h: HoverState | null) => {
      if (!h || !open || !showSentenceChips) {
        onHover(h);
        return;
      }
      if (isRevealPanelHover(h.key)) {
        onHover(h);
        return;
      }
      const chipTop = chipPanelRef.current?.getBoundingClientRect().top;
      onHover(
        chipTop != null ? { ...h, avoidBelowY: chipTop } : h,
      );
    },
    [open, showSentenceChips, isRevealPanelHover, onHover],
  );

  return (
    <div
      className={`relative leading-[1.9] ${matched ? 'bg-[#FFF6E8] dark:bg-[#2A2214] rounded' : ''}`}
    >
      <span className="sentence">
        {!translation ? (
          <span className={`${zhFont} text-[18px]`}>
            {Array.from(sentence.zh).map((ch, i) => (
              <HanChar
                key={i}
                ch={ch}
                inspected={isInspected(inspectedChar, ch)}
                onInspect={() => handleCharClick(ch)}
              />
            ))}
          </span>
        ) : enPrimary && hasEnglishOffsets ? (
          <span className="text-[16px] md:text-[18px]">
            <EnglishAlignedText
              text={enText}
              words={words}
              idPrefix={sentence.id}
              revealWords={reveal.words}
              showDefsInline={showDefsInline}
              search={search}
              pinnedKey={pinnedKey}
              onPin={onPin}
              onHover={handleHover}
              linkedAlign={linkedAlign}
              crossLink={crossLink}
              dict={dict}
            />
          </span>
        ) : enPrimary && words.length > 0 ? (
          words.map((w, i) => {
            const key = `${sentence.id}_${i}`;
            const hasZh = !!w.zh;
            const pinned = pinnedKey === key;
            const linked =
              !pinned && isLinkedAlign(w, linkedAlign, crossLink);
            return (
              <span className="inline" key={key}>
                <span
                  onMouseEnter={(e) => {
                    if (!reveal.words || !w.zh) return;
                    handleHover({
                      key,
                      rect: e.currentTarget.getBoundingClientRect(),
                      data: w,
                    });
                  }}
                  onMouseLeave={() => {
                    if (pinnedKey !== key) handleHover(null);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!w.zh) return;
                    if (pinnedKey === key) {
                      onPin(null);
                    } else {
                      onPin(key, w);
                      handleHover({
                        key,
                        rect: e.currentTarget.getBoundingClientRect(),
                        data: w,
                      });
                    }
                  }}
                  className={hoverSpanClasses({
                    revealWords: reveal.words,
                    hasZh,
                    pinned,
                    linked,
                  })}
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
        ) : !enPrimary ? (
          <span
            className={`${zhFont} text-[18px]`}
            style={{ fontSize: `${charSize}em` }}
          >
            <ZhHoverText
              tokens={zhTokens}
              idPrefix={sentence.id}
              revealWords={reveal.words}
              showDefsInline={showDefsInline}
              search={search}
              pinnedKey={pinnedKey}
              onPin={onPin}
              onHover={handleHover}
              linkedAlign={linkedAlign}
              crossLink={crossLink}
              inspectedChar={inspectedChar}
              onCharClick={handleCharClick}
            />
          </span>
        ) : (
          // English-primary, no authored word alignments. Keep the
          // literary English. When Words is on, Jiayan/ICU spans plus
          // CEDICT supply hoverable English gloss chips (English → Chinese).
          // That does not map the prose onto the Chinese; it uses each
          // dictionary headword's English label.
          <>
            <span className="text-[16px] md:text-[18px]">
              {highlight(enText, search)}
            </span>
            {reveal.words && glossWords.length > 0 && (
              <span className="mt-1 block text-[16px] md:text-[18px] leading-[1.9]">
                {glossWords.map((w, i) => {
                  const key = `${sentence.id}_g${i}`;
                  const label = englishLabel(w);
                  const pinned = pinnedKey === key;
                  const linked =
                    !pinned && isLinkedAlign(w, linkedAlign, crossLink);
                  return (
                    <span className="inline" key={key}>
                      <span
                        onMouseEnter={(e) => {
                          handleHover({
                            key,
                            rect: e.currentTarget.getBoundingClientRect(),
                            data: w,
                          });
                        }}
                        onMouseLeave={() => {
                          if (pinnedKey !== key) handleHover(null);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (pinnedKey === key) {
                            onPin(null);
                          } else {
                            onPin(key, w);
                            handleHover({
                              key,
                              rect: e.currentTarget.getBoundingClientRect(),
                              data: w,
                            });
                          }
                        }}
                        className={hoverSpanClasses({
                          revealWords: true,
                          hasZh: true,
                          pinned,
                          linked,
                        })}
                      >
                        {search ? highlight(label, search) : label}
                        {showDefsInline && (
                          <span className="ml-1 text-[11px] text-[var(--verm)] font-medium">
                            ({w.zh})
                          </span>
                        )}
                      </span>
                      <span className="inline"> </span>
                    </span>
                  );
                })}
              </span>
            )}
          </>
        )}
      </span>
      {showSentenceChips && (
      <button
        type="button"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`ml-2 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] tracking-wide transition ${open ? 'bg-[var(--verm)] text-white border-[var(--verm)]' : 'border-[var(--line)] hover:border-[var(--verm)] hover:text-[var(--verm)] bg-[var(--paper-2)]'}`}
      >
        <span className={enPrimary ? zhFont : ''}>
          {enPrimary ? '中文' : 'English'}
        </span>
        <span className="opacity-70">{open ? '−' : '+'}</span>
      </button>
      )}
      <div
        className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div
            ref={chipPanelRef}
            className="rounded-[12px] bg-[#FFF8F0] dark:bg-[#1C1A16] border border-[#F2E6D6] dark:border-[#2A2722] border-l-2 border-l-[var(--verm)] p-4"
          >
            {!enPrimary ? (
              <div className="flex items-start justify-between gap-3">
                <div className="text-[16px] leading-[1.8]">
                  {hasEnglishOffsets && words.length > 0 ? (
                    <EnglishAlignedText
                      text={enText}
                      words={words}
                      idPrefix={`${sentence.id}_en`}
                      revealWords={reveal.words}
                      showDefsInline={showDefsInline}
                      search={search}
                      pinnedKey={pinnedKey}
                      onPin={onPin}
                      onHover={handleHover}
                      linkedAlign={linkedAlign}
                      crossLink={crossLink}
                      dict={dict}
                    />
                  ) : (
                    highlight(enText, search)
                  )}
                </div>
                {canSpeak && (
                <button
                  type="button"
                  onClick={() => onSpeak(sentence.zh)}
                  className="shrink-0 h-7 w-7 rounded-full bg-white dark:bg-[#121210] border border-[var(--line)] flex items-center justify-center hover:border-[var(--verm)]"
                >
                  🔊
                </button>
                )}
              </div>
            ) : (
              <>
            <div className="flex items-start justify-between gap-3">
              <div
                className={`${zhFont} leading-[1.9] text-[18px]`}
                style={{ fontSize: `${0.95 * charSize}em` }}
              >
                <ZhHoverText
                  tokens={zhTokens}
                  idPrefix={`${sentence.id}_chip`}
                  revealWords={reveal.words}
                  showDefsInline={showDefsInline}
                  search={search}
                  pinnedKey={pinnedKey}
                  onPin={onPin}
                  onHover={handleHover}
                  linkedAlign={linkedAlign}
                  crossLink={crossLink}
                  inspectedChar={inspectedChar}
                  onCharClick={handleCharClick}
                />
              </div>
              {canSpeak && (
              <button
                type="button"
                onClick={() => onSpeak(sentence.zh)}
                className="shrink-0 h-7 w-7 rounded-full bg-white dark:bg-[#121210] border border-[var(--line)] flex items-center justify-center hover:border-[var(--verm)]"
              >
                🔊
              </button>
              )}
            </div>
            {(showPinyin || showZhuyin) && (
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
                {glossWords.map((w, i) => {
                    const senses =
                      w.senses && w.senses.length > 0
                        ? w.senses
                        : [{ pinyin: w.pinyin, def: w.def }];
                    return (
                      <span key={i} className="inline-flex items-baseline gap-1">
                        <span className={zhFont}>{w.zh}</span>
                        <span className="inline-flex flex-col">
                          {senses.map((s, j) => {
                            const zhuyin = showZhuyin ? zhuyinForWord(s.pinyin) : null;
                            return (
                              <span key={j} className="inline-flex items-center gap-1">
                                {showPinyin && s.pinyin && (
                                  <span
                                    style={{ color: toneColor(s.pinyin, toneColors) }}
                                    className="font-mono text-[11px]"
                                  >
                                    {s.pinyin}
                                  </span>
                                )}
                                {zhuyin && (
                                  <span className="font-mono text-[11px] text-[var(--ink-mute)]">
                                    {zhuyin}
                                  </span>
                                )}
                                {s.def && (
                                  <span className="text-[var(--ink-mute)] text-[11px]">
                                    {s.def}
                                  </span>
                                )}
                              </span>
                            );
                          })}
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
  const { doc, reveal, primaryLang, fontScale, charSize, inspectedChar, onInspectChar, onSpeak, showSpeakerButtons, speakOnClick, dict, segmentZh } = props;
  const zhFont = zhFontClass(doc);
  const paragraphTokens = useMemo(() => {
    const map = new Map<string, ZhToken[]>();
    for (const p of allParagraphs(doc)) {
      map.set(
        p.id,
        tokenizeChinese(p.zh, paragraphWords(p), dict ?? undefined, segmentZh),
      );
    }
    return map;
  }, [doc, dict, segmentZh]);
  const enPrimary = primaryLang === 'en';
  const canSpeak = brand.features.speech && showSpeakerButtons;
  const handleCharClick = (ch: string) => {
    onInspectChar(ch);
    if (speakOnClick) onSpeak(ch);
  };

  return (
    <div
      className="w-full max-w-[760px] px-6 md:px-10 py-10 md:py-14 bg-[#FFFEFB] dark:bg-[#121210] relative"
      style={{ fontSize: `${fontScale}em` }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025] mix-blend-multiply"
        style={{ backgroundImage: NOISE_BG }}
      />
      {canSpeak && (
        <button
          type="button"
          onClick={() => onSpeak(chineseText(doc))}
          aria-label="Speak entire page"
          className="absolute top-10 right-6 md:right-10 z-10 text-[12px] border border-[var(--line)] rounded-full px-2.5 py-1 bg-[var(--paper-2)] hover:border-[var(--verm)]"
        >
          🔊 Page
        </button>
      )}
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
            className={`${zhFont} text-[20px] text-[var(--ink-mute)] transition-all ${reveal.paragraphs || reveal.full ? 'opacity-100' : 'opacity-70'}`}
          >
            {enPrimary ? doc.titleZh : doc.titleEn}
          </span>
          <span className="text-[13px] text-[var(--ink-mute)]">
            {doc.author ? `— ${doc.author} ` : ''}
            {scriptTag(doc)}
          </span>
        </div>
        <div className="mt-6 h-px bg-[var(--line)] w-full" />
      </div>

      <div className="space-y-10">
        {doc.sections.map((section, sIdx) => {
          const offset = doc.sections
            .slice(0, sIdx)
            .reduce((n, s) => n + s.paragraphs.length, 0);
          return (
            <div key={section.id} id={section.id} className="space-y-10 scroll-mt-[76px]">
              {(section.titleEn || section.titleZh) && (
                <div>
                  {(enPrimary ? section.titleEn : section.titleZh) && (
                    <h2 className="serif-display text-[28px] font-semibold tracking-tight">
                      {enPrimary ? section.titleEn : section.titleZh}
                    </h2>
                  )}
                  {(enPrimary ? section.titleZh : section.titleEn) && (
                    <div className={`${zhFont} text-[18px] text-[var(--ink-mute)]`}>
                      {enPrimary ? section.titleZh : section.titleEn}
                    </div>
                  )}
                </div>
              )}
              {section.paragraphs.map((para, localIdx) => {
                const pIdx = offset + localIdx;
                return (
          <div className="group/para relative scroll-mt-[76px]" key={para.id} id={para.id}>
            {canSpeak ? (
              <button
                type="button"
                onClick={() => onSpeak(para.zh)}
                aria-label={`Speak paragraph ${pIdx + 1}`}
                title={`Speak paragraph ${pIdx + 1}`}
                className="group absolute right-full mr-2 top-0.5 hidden md:inline-flex items-center gap-1 rounded-full border border-transparent px-1.5 py-1 text-[10px] font-mono text-[var(--ink-mute)] transition hover:border-[var(--verm)] hover:text-[var(--verm)] hover:bg-[var(--paper-2)] focus-visible:border-[var(--verm)]"
              >
                <span className="w-[14px] text-center text-[12px] opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  🔊
                </span>
                <span>{String(pIdx + 1).padStart(2, '0')}</span>
              </button>
            ) : (
              <div className="absolute -left-6 top-1 hidden md:block text-[10px] text-[var(--ink-mute)] font-mono">
                {String(pIdx + 1).padStart(2, '0')}
              </div>
            )}
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
                <div className="rounded-[14px] bg-[#FFF8F0] dark:bg-[#1C1A16] border border-l-2 border-l-[var(--verm)] border-[#EFE0CF] dark:border-[#2A2722] p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] tracking-[0.18em] uppercase text-[var(--verm)]">
                      {enPrimary
                        ? `段落 · Paragraph ${pIdx + 1}`
                        : `English · Paragraph ${pIdx + 1}`}
                    </span>
                    {canSpeak && (
                    <button
                      type="button"
                      onClick={() => onSpeak(para.zh)}
                      className="text-[12px] border rounded-full px-2.5 py-1 hover:border-[var(--verm)]"
                    >
                      🔊 Play
                    </button>
                    )}
                  </div>
                  {enPrimary ? (
                    <p
                      className={`${zhFont} text-[20px] leading-[2] tracking-wide`}
                      style={{ fontSize: `${charSize}em` }}
                    >
                      <ZhHoverText
                        tokens={paragraphTokens.get(para.id) ?? []}
                        idPrefix={para.id}
                        revealWords={reveal.words}
                        showDefsInline={props.showDefsInline}
                        search={props.search}
                        pinnedKey={props.pinnedKey}
                        onPin={props.onPin}
                        onHover={props.onHover}
                        linkedAlign={props.linkedAlign}
                        crossLink={false}
                        inspectedChar={inspectedChar}
                        onCharClick={handleCharClick}
                      />
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
                className={`space-y-4 ${zhFont} text-[19px] leading-[2]`}
                style={{ fontSize: `${charSize}em` }}
              >
                {allParagraphs(doc).map((p) => (
                  <p key={`${p.id}zh`}>
                    <ZhHoverText
                      tokens={paragraphTokens.get(p.id) ?? []}
                      idPrefix={`${p.id}_full`}
                      revealWords={reveal.words}
                      showDefsInline={props.showDefsInline}
                      search={props.search}
                      pinnedKey={props.pinnedKey}
                      onPin={props.onPin}
                      onHover={props.onHover}
                      linkedAlign={props.linkedAlign}
                      crossLink={false}
                      inspectedChar={inspectedChar}
                      onCharClick={handleCharClick}
                    />
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
