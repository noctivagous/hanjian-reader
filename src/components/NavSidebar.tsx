import { useMemo, useState } from 'react';
import type { Doc } from '../data/types';
import { paragraphEn } from '../lib/doc';
import type { PrimaryLang } from './Reader';

interface NavContentProps {
  idPrefix: string;
  doc: Doc;
  docs: Doc[];
  activeDocId: string;
  onSelectDoc: (id: string) => void;
  primaryLang: PrimaryLang;
  activeSectionId: string | null;
  activeParagraphId: string | null;
  onNavigate: (id: string) => void;
}

function sentenceCount(section: Doc['sections'][number]): number {
  return section.paragraphs.reduce((n, p) => n + p.sentences.length, 0);
}

export function NavContent({
  idPrefix,
  doc,
  docs,
  activeDocId,
  onSelectDoc,
  primaryLang,
  activeSectionId,
  activeParagraphId,
  onNavigate,
}: NavContentProps) {
  const enPrimary = primaryLang === 'en';
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const allUntitled = doc.sections.every((s) => !s.titleEn && !s.titleZh);
  const query = filter.trim().toLowerCase();

  // Global paragraph numbering, mirroring Reader's offset numbering.
  const globalIndex = useMemo(() => {
    const map = new Map<string, number>();
    let n = 0;
    for (const s of doc.sections) {
      for (const p of s.paragraphs) map.set(p.id, n++);
    }
    return map;
  }, [doc]);

  const visibleSections = useMemo(() => {
    return doc.sections
      .map((section, sIdx) => {
        const paras = section.paragraphs.map((p) => {
          const en = paragraphEn(p);
          return { p, en, global: globalIndex.get(p.id) ?? 0 };
        });
        if (!query) return { section, sIdx, paras };
        const sectionText =
          `${sIdx + 1} chapter ${sIdx + 1} ${section.titleZh} ${section.titleEn}`.toLowerCase();
        if (sectionText.includes(query)) return { section, sIdx, paras };
        const matched = paras.filter(
          ({ p, en, global }) =>
            p.zh.toLowerCase().includes(query) ||
            en.toLowerCase().includes(query) ||
            String(global + 1) === query ||
            String(global + 1).padStart(2, '0') === query,
        );
        return { section, sIdx, paras: matched };
      })
      .filter(({ paras, section }) => paras.length > 0 || (!query && section));
  }, [doc, globalIndex, query]);

  const hasResults = visibleSections.some(({ paras }) => paras.length > 0);

  const isSectionExpanded = (id: string, isActive: boolean) =>
    (expanded.has(id) || isActive) && !collapsed.has(id);

  const toggleExpanded = (id: string, currentlyExpanded: boolean) => {
    if (currentlyExpanded) {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setCollapsed((prev) => new Set(prev).add(id));
    } else {
      setCollapsed((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setExpanded((prev) => new Set(prev).add(id));
    }
  };

  const paraRow = ({
    p,
    en,
    global,
  }: {
    p: Doc['sections'][number]['paragraphs'][number];
    en: string;
    global: number;
  }) => {
    const active = activeParagraphId === p.id;
    const preview = (enPrimary ? en : p.zh) || p.zh || en;
    return (
      <button
        key={p.id}
        type="button"
        aria-current={active ? 'true' : undefined}
        onClick={() => onNavigate(p.id)}
        className={`flex w-full items-baseline gap-2 rounded-[8px] px-2.5 py-1.5 text-left transition focus-visible:outline-2 focus-visible:outline-[var(--verm)] ${active ? 'bg-[var(--verm-soft)] text-[var(--verm)] font-semibold' : 'hover:bg-[var(--paper-2)]'}`}
      >
        <span className="shrink-0 font-mono text-[10px] text-[var(--ink-mute)]">
          {String(global + 1).padStart(2, '0')}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[12px] leading-snug">
            {preview || '—'}
          </span>
          <span className="block text-[10px] text-[var(--ink-mute)]">
            {p.sentences.length}{' '}
            {p.sentences.length === 1 ? 'sentence' : 'sentences'}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-[var(--line)] p-4 pb-3">
        <div className="relative">
          <label className="sr-only" htmlFor={`${idPrefix}-doc-select`}>
            Book
          </label>
          <select
            id={`${idPrefix}-doc-select`}
            value={activeDocId}
            onChange={(e) => onSelectDoc(e.target.value)}
            className="w-full appearance-none rounded-full border border-[var(--line)] bg-[var(--paper)] py-1.5 pl-3 pr-8 text-[13px] font-medium tracking-tight outline-none transition hover:border-[var(--ink-mute)]"
          >
            {docs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.titleEn} · {d.titleZh}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px]">
            ▼
          </span>
        </div>
        <h2 className="serif-display mt-3 text-[18px] font-semibold leading-tight tracking-tight">
          {enPrimary ? doc.titleEn : doc.titleZh}
        </h2>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="serif-sc text-[14px] text-[var(--ink-mute)]">
            {enPrimary ? doc.titleZh : doc.titleEn}
          </span>
          {doc.author && (
            <span className="truncate text-[11px] text-[var(--ink-mute)]">
              — {doc.author}
            </span>
          )}
        </div>
        <div className="relative mt-3">
          <label className="sr-only" htmlFor={`${idPrefix}-filter`}>
            Filter contents
          </label>
          <input
            id={`${idPrefix}-filter`}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                setFilter('');
              }
            }}
            placeholder="Filter · chapter 42 · 德…"
            className="w-full rounded-full border border-[var(--line)] bg-[var(--paper)] px-3.5 py-1.5 text-[12px] outline-none focus:border-[var(--verm)]"
          />
          {filter && (
            <button
              type="button"
              aria-label="Clear filter"
              onClick={() => setFilter('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px]"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <nav aria-label="Document contents" className="min-h-0 flex-1 overflow-y-auto p-2">
        {!hasResults ? (
          <p className="px-2.5 py-4 text-[12px] text-[var(--ink-mute)]">
            No sections match “{filter.trim()}”.
          </p>
        ) : allUntitled && !query ? (
          <div className="space-y-0.5">
            {visibleSections.flatMap(({ paras }) => paras.map(paraRow))}
          </div>
        ) : (
          <div className="space-y-1">
            {visibleSections.map(({ section, sIdx, paras }) => {
              const isActiveSection = activeSectionId === section.id;
              const isExpanded =
                !!query || allUntitled || isSectionExpanded(section.id, isActiveSection);
              const titlePrimary = enPrimary ? section.titleEn : section.titleZh;
              const titleSecondary = enPrimary ? section.titleZh : section.titleEn;
              const count = sentenceCount(section);
              return (
                <div key={section.id}>
                  <div
                    className={`flex items-stretch gap-0.5 rounded-[8px] transition ${isActiveSection ? 'bg-[var(--verm-soft)]' : 'hover:bg-[var(--paper-2)]'}`}
                  >
                    <button
                      type="button"
                      aria-current={isActiveSection ? 'true' : undefined}
                      onClick={() => onNavigate(section.id)}
                      className="flex min-w-0 flex-1 items-baseline gap-2 rounded-[8px] px-2.5 py-2 text-left focus-visible:outline-2 focus-visible:outline-[var(--verm)]"
                    >
                      <span className="shrink-0 font-mono text-[10px] text-[var(--ink-mute)]">
                        {String(sIdx + 1).padStart(2, '0')}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={`block truncate text-[13px] leading-snug ${isActiveSection ? 'font-semibold text-[var(--verm)]' : 'font-medium'}`}
                        >
                          {titlePrimary || titleSecondary || `Section ${sIdx + 1}`}
                        </span>
                        {titleSecondary && (
                          <span className="serif-sc block truncate text-[11px] text-[var(--ink-mute)]">
                            {titleSecondary}
                          </span>
                        )}
                        <span className="block text-[10px] text-[var(--ink-mute)]">
                          {count} {count === 1 ? 'sentence' : 'sentences'}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={`${isExpanded ? 'Collapse' : 'Expand'} section ${sIdx + 1}`}
                      aria-expanded={isExpanded}
                      onClick={() => toggleExpanded(section.id, isExpanded)}
                      className="shrink-0 rounded-[8px] px-2 text-[11px] text-[var(--ink-mute)] hover:text-[var(--verm)] focus-visible:outline-2 focus-visible:outline-[var(--verm)]"
                    >
                      {isExpanded ? '▾' : '▸'}
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="ml-4 space-y-0.5 border-l border-[var(--line)] pl-1.5 pt-0.5">
                      {paras.map(paraRow)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </nav>
    </div>
  );
}

interface SidebarProps extends Omit<NavContentProps, 'idPrefix'> {
  collapsed: boolean;
}

export function NavSidebar({ collapsed, ...content }: SidebarProps) {
  return (
    <aside
      aria-hidden={collapsed || undefined}
      className={`hidden w-[264px] shrink-0 flex-col self-start sticky top-[64px] h-[calc(100vh-64px)] border-r border-[var(--line)] bg-[var(--glass)] backdrop-blur-xl transition-all duration-300 lg:flex ${collapsed ? '!w-0 overflow-hidden border-r-0' : ''}`}
    >
      <NavContent idPrefix="nav-desktop" {...content} />
    </aside>
  );
}

interface DrawerProps extends Omit<NavContentProps, 'idPrefix'> {
  open: boolean;
  onClose: () => void;
}

export function MobileNavDrawer({ open, onClose, ...content }: DrawerProps) {
  return (
    <div
      className={`fixed inset-0 z-40 transition lg:hidden ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        className={`absolute bottom-0 left-0 top-0 flex w-[300px] max-w-[85vw] flex-col border-r border-[var(--line)] bg-[var(--paper)] shadow-[12px_0_40px_rgba(0,0,0,0.15)] transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between border-b border-[var(--line)] p-4 pb-3">
          <span className="serif-display font-semibold">Contents · 目录</span>
          <button
            type="button"
            aria-label="Close contents"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)]"
          >
            ✕
          </button>
        </div>
        <NavContent idPrefix="nav-mobile" {...content} />
      </div>
    </div>
  );
}
