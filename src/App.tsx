import { useEffect, useMemo, useRef, useState } from 'react';
import { Header } from './components/Header';
import { ImportModal } from './components/ImportModal';
import { MobileTools } from './components/MobileTools';
import { MobileNavDrawer, NavSidebar } from './components/NavSidebar';
import { Reader, type PrimaryLang, type Reveal } from './components/Reader';
import { Sidebar } from './components/Sidebar';
import { WordCard, type HoverState } from './components/WordCard';
import { applyBrand, brand, brandStorageKey } from './brand';
import { docs as seedDocs } from './data/documents';
import { extraDocs } from './data/localDocs';
import type { Doc } from './data/types';
import {
  loadDictionary,
  type DictIndex,
  type DictStatus,
} from './lib/dictionary';
import { docScript } from './lib/script';
import { importCustomDoc } from './lib/segment';
import { copyText, speakChinese } from './lib/speech';
import { useScrollSpy } from './lib/useScrollSpy';

const initialDocs: Doc[] = [...seedDocs, ...extraDocs];

export default function App() {
  const [docs, setDocs] = useState<Doc[]>(initialDocs);
  const [activeId, setActiveId] = useState(initialDocs[0].id);
  const doc = useMemo(
    () => docs.find((d) => d.id === activeId) || docs[0],
    [docs, activeId],
  );

  // White-label: initial state comes from the brand config, so a rebrand
  // ships its own texts, enabled features, and defaults with no code edits.
  const [reveal, setReveal] = useState<Reveal>(() => ({ ...brand.defaults.reveal }));
  const [primaryLang, setPrimaryLang] = useState<PrimaryLang>(() => {
    try {
      const v = window.localStorage.getItem(brandStorageKey('primaryLang'));
      return v === 'zh' || v === 'en' ? v : brand.defaults.primaryLang;
    } catch {
      return brand.defaults.primaryLang;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(brandStorageKey('primaryLang'), primaryLang);
    } catch {
      // storage unavailable (private mode); direction stays in-memory
    }
  }, [primaryLang]);

  const [showPinyin, setShowPinyin] = useState(brand.defaults.showPinyin);
  const [showZhuyin, setShowZhuyin] = useState(brand.defaults.showZhuyin);
  const [toneColors, setToneColors] = useState(brand.defaults.toneColors);
  const [defsInline, setDefsInline] = useState(brand.defaults.defsInline);
  const [showSentenceChips, setShowSentenceChips] = useState(
    brand.defaults.showSentenceChips,
  );
  const [fontScale, setFontScale] = useState(brand.defaults.fontScale);
  const [charSize, setCharSize] = useState(brand.defaults.charSize);
  const [showSpeakerButtons, setShowSpeakerButtons] = useState(
    brand.defaults.showSpeakerButtons,
  );
  const [speakOnClick, setSpeakOnClick] = useState(brand.defaults.speakOnClick);

  const [inspectedChar, setInspectedChar] = useState<string | null>(null);
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [openSentences, setOpenSentences] = useState<Set<string>>(new Set());
  const [closedSentences, setClosedSentences] = useState<Set<string>>(
    new Set(),
  );
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const [dark, setDark] = useState(brand.defaults.dark);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [showTip, setShowTip] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Lazy CC-CEDICT: fetched once when Chinese-primary reading needs it.
  // Null until loaded (or when the fetch fails); tokens render wordless
  // until then and gain readings on the re-render after load.
  const [dict, setDict] = useState<DictIndex | null>(null);
  const [dictFailed, setDictFailed] = useState(false);
  const dictLoadStarted = useRef(false);
  useEffect(() => {
    if (primaryLang !== 'zh' || !brand.features.words) return;
    if (dict || dictFailed || dictLoadStarted.current) return;
    dictLoadStarted.current = true;
    let live = true;
    loadDictionary().then((d) => {
      if (!live) return;
      if (d) setDict(d);
      else setDictFailed(true);
    });
    return () => {
      live = false;
    };
  }, [primaryLang, dict, dictFailed]);
  const dictStatus: DictStatus = dict
    ? 'ready'
    : dictFailed
      ? 'unavailable'
      : primaryLang === 'zh' && brand.features.words
        ? 'loading'
        : 'idle';

  const scrollRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (importOpen) setImportOpen(false);
        else if (navOpen) setNavOpen(false);
        else if (toolsOpen) setToolsOpen(false);
        else if (inspectedChar) setInspectedChar(null);
        else if (pinnedKey) {
          setPinnedKey(null);
          setHover(null);
        } else if (hover) setHover(null);
        else if (showTip) setShowTip(false);
        return;
      }
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      )
        return;
      const k = e.key.toLowerCase();
      if (k === 'w' && brand.features.words)
        setReveal((r) => ({ ...r, words: !r.words }));
      if (k === 's' && brand.features.sentences)
        setReveal((r) => ({ ...r, sentences: !r.sentences }));
      if (k === 'p' && brand.features.paragraphs)
        setReveal((r) => ({ ...r, paragraphs: !r.paragraphs }));
      if (k === 'f' && brand.features.full)
        setReveal((r) => ({ ...r, full: !r.full }));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [importOpen, navOpen, toolsOpen, inspectedChar, pinnedKey, hover, showTip]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    applyBrand(dark);
  }, [dark]);

  useEffect(() => {
    if (!showTip) return;
    const t = setTimeout(() => setShowTip(false), 6000);
    return () => clearTimeout(t);
  }, [showTip]);

  const flash = (msg: string, ms = 1800) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), ms);
  };

  const handleSpeak = (text: string) => {
    const err = speakChinese(text);
    if (err) flash(err);
  };

  const handleCopy = async (text: string, label: string) => {
    const ok = await copyText(text);
    flash(ok ? `${label} copied` : 'Copy failed');
  };

  const handleImport = (
    en: string,
    zh: string,
    titleEn: string,
    titleZh: string,
  ) => {
    const custom = importCustomDoc(en, zh, titleEn, titleZh);
    setDocs((prev) => [...prev, custom]);
    setActiveId(custom.id);
    setImportOpen(false);
    flash('Custom document imported', 2000);
  };

  const toggleSentence = (id: string) => {
    const toggle = (prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    };
    if (reveal.sentences) setClosedSentences(toggle);
    else setOpenSentences(toggle);
  };

  const toggleReveal = (k: keyof Reveal) => {
    if (!brand.features[k]) return;
    if (k === 'sentences') {
      if (reveal.sentences) setOpenSentences(new Set());
      else setClosedSentences(new Set());
    }
    setReveal((r) => ({ ...r, [k]: !r[k] }));
  };

  const handleInspectChar = (c: string) => {
    if (!brand.features.inspector) return;
    setInspectedChar((prev) => (prev === c ? null : c));
  };

  const clearSelection = () => {
    setInspectedChar(null);
    setPinnedKey(null);
    setHover(null);
  };

  const navIds = useMemo(
    () =>
      doc.sections.flatMap((s) => [
        s.id,
        ...s.paragraphs.map((p) => p.id),
      ]),
    [doc],
  );
  const [activeNavId, setActiveNavId] = useScrollSpy(scrollRef, navIds, doc.id);

  const activeSectionId = useMemo(() => {
    if (!activeNavId) return doc.sections[0]?.id ?? null;
    const direct = doc.sections.find((s) => s.id === activeNavId);
    if (direct) return direct.id;
    return (
      doc.sections.find((s) =>
        s.paragraphs.some((p) => p.id === activeNavId),
      )?.id ?? doc.sections[0]?.id ?? null
    );
  }, [doc, activeNavId]);

  const activeParagraphId = useMemo(() => {
    if (!activeNavId) return null;
    const isParagraph = doc.sections.some((s) =>
      s.paragraphs.some((p) => p.id === activeNavId),
    );
    return isParagraph ? activeNavId : null;
  }, [doc, activeNavId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [doc.id]);

  const handleNavigate = (id: string) => {
    setActiveNavId(id);
    setNavOpen(false);
    const el = scrollRef.current?.querySelector(`#${CSS.escape(id)}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      data-script={docScript(doc)}
      className="min-h-screen flex flex-col bg-[var(--paper)] text-[var(--ink)] selection:bg-[var(--verm-soft)]"
    >
      <Header
        onImport={() => setImportOpen(true)}
        primaryLang={primaryLang}
        onPrimaryLang={(v) => {
          setPrimaryLang(v);
          setHover(null);
          setPinnedKey(null);
        }}
        fontScale={fontScale}
        onFontScale={setFontScale}
        dark={dark}
        onToggleDark={() => setDark((v) => !v)}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
        navCollapsed={navCollapsed}
        onToggleNav={() => setNavCollapsed((v) => !v)}
        onOpenNav={() => setNavOpen(true)}
        onOpenTools={() => setToolsOpen(true)}
      />

      <div className="flex flex-1 min-h-0">
        <NavSidebar
          doc={doc}
          docs={docs}
          activeDocId={doc.id}
          onSelectDoc={setActiveId}
          primaryLang={primaryLang}
          activeSectionId={activeSectionId}
          activeParagraphId={activeParagraphId}
          onNavigate={handleNavigate}
          collapsed={navCollapsed}
        />
        <div
          ref={scrollRef}
          className="flex-1 flex justify-center overflow-auto"
          onClick={clearSelection}
        >
          <Reader
            doc={doc}
            reveal={reveal}
            primaryLang={primaryLang}
            showPinyin={showPinyin}
            showZhuyin={showZhuyin}
            toneColors={toneColors}
            showDefsInline={defsInline}
            showSentenceChips={showSentenceChips}
            fontScale={fontScale}
            charSize={charSize}
            openSentences={openSentences}
            closedSentences={closedSentences}
            onToggleSentence={toggleSentence}
            search={search}
            pinnedKey={pinnedKey}
            onPin={setPinnedKey}
            hover={hover}
            onHover={setHover}
            inspectedChar={inspectedChar}
            onInspectChar={handleInspectChar}
            showSpeakerButtons={showSpeakerButtons}
            speakOnClick={speakOnClick}
            onSpeak={handleSpeak}
            dict={dict}
          />
        </div>

        <Sidebar
          doc={doc}
          reveal={reveal}
          primaryLang={primaryLang}
          onToggleReveal={toggleReveal}
          showPinyin={showPinyin}
          onShowPinyin={setShowPinyin}
          showZhuyin={showZhuyin}
          onShowZhuyin={setShowZhuyin}
          showDefsInline={defsInline}
          onShowDefsInline={setDefsInline}
          toneColors={toneColors}
          onToneColors={setToneColors}
          showSentenceChips={showSentenceChips}
          onShowSentenceChips={setShowSentenceChips}
          charSize={charSize}
          onCharSize={setCharSize}
          showSpeakerButtons={showSpeakerButtons}
          onShowSpeakerButtons={setShowSpeakerButtons}
          speakOnClick={speakOnClick}
          onSpeakOnClick={setSpeakOnClick}
          search={search}
          onSearch={setSearch}
          inspectedChar={inspectedChar}
          note={inspectedChar ? notes[inspectedChar] || '' : ''}
          onNote={(ch, note) =>
            setNotes((prev) => ({ ...prev, [ch]: note }))
          }
          onSpeak={handleSpeak}
          onCopy={handleCopy}
          onAddToList={() => flash('Added to list (local)', 1500)}
          onImport={() => setImportOpen(true)}
          onCloseInspector={() => setInspectedChar(null)}
          collapsed={sidebarCollapsed}
          dictStatus={dictStatus}
        />
      </div>

      <MobileNavDrawer
        doc={doc}
        docs={docs}
        activeDocId={doc.id}
        onSelectDoc={setActiveId}
        primaryLang={primaryLang}
        activeSectionId={activeSectionId}
        activeParagraphId={activeParagraphId}
        onNavigate={handleNavigate}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />

      <MobileTools
        doc={doc}
        open={toolsOpen}
        onClose={() => setToolsOpen(false)}
        reveal={reveal}
        primaryLang={primaryLang}
        onToggleReveal={toggleReveal}
        inspectedChar={inspectedChar}
        onClearInspected={() => setInspectedChar(null)}
        onCopy={handleCopy}
        dictStatus={dictStatus}
      />

      {hover && reveal.words && (
        <WordCard
          key={hover.key}
          hover={hover}
          pinnedKey={pinnedKey}
          toneColors={toneColors}
          showZhuyin={showZhuyin}
          primaryLang={primaryLang}
          onEnter={setHover}
          onLeave={() => {
            if (pinnedKey !== hover.key) setHover(null);
          }}
          onInspect={(zh) => {
            handleInspectChar(zh);
            setHover(null);
            setPinnedKey(null);
          }}
          onClose={() => {
            setPinnedKey(null);
            setHover(null);
          }}
          onSpeak={handleSpeak}
        />
      )}

      {importOpen && brand.features.import && (
        <ImportModal
          onImport={handleImport}
          onClose={() => setImportOpen(false)}
        />
      )}

      {showTip && (
        <div
          className="hidden lg:block fixed top-[88px] z-20 w-[300px] rounded-[14px] bg-[#1A1A18] text-[#FFFEFB] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.3)] animate-[rise-in_0.4s_ease]"
          style={{ right: sidebarCollapsed ? 24 : 380 }}
        >
          <div className="text-[13px] font-medium">Progressive Reveal →</div>
          <div className="text-[12px] opacity-80 mt-1 leading-[1.5]">
            {primaryLang === 'en'
              ? 'Start reading in English. Use the toolbar to reveal Chinese words on hover (W), then sentences (S), paragraphs (P), and full side-by-side (F). Click any 汉字 to inspect.'
              : 'Start reading in Chinese. Use the toolbar to reveal English words on hover (W), then sentences (S), paragraphs (P), and full side-by-side (F). Click any 汉字 to inspect.'}
          </div>
          <button
            type="button"
            onClick={() => setShowTip(false)}
            className="mt-3 text-[11px] px-2.5 py-1 rounded-full bg-white text-black"
          >
            Got it
          </button>
          <div className="absolute -right-2 top-6 h-3 w-3 rotate-45 bg-[#1A1A18]" />
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full bg-[#1A1A18] text-white px-4 py-2 text-[12px] shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
