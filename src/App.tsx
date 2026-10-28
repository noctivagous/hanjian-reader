import { useEffect, useMemo, useRef, useState } from 'react';
import { Header } from './components/Header';
import { ImportModal } from './components/ImportModal';
import { MobileTools } from './components/MobileTools';
import { Reader, type PrimaryLang, type Reveal } from './components/Reader';
import { Sidebar } from './components/Sidebar';
import { WordCard, type HoverState } from './components/WordCard';
import { docs as seedDocs } from './data/documents';
import type { Doc } from './data/types';
import { importCustomDoc } from './lib/segment';
import { copyText, speakChinese } from './lib/speech';

export default function App() {
  const [docs, setDocs] = useState<Doc[]>(seedDocs);
  const [activeId, setActiveId] = useState(seedDocs[0].id);
  const doc = useMemo(
    () => docs.find((d) => d.id === activeId) || docs[0],
    [docs, activeId],
  );

  const [reveal, setReveal] = useState<Reveal>({
    words: true,
    sentences: false,
    paragraphs: false,
    full: false,
  });
  const [primaryLang, setPrimaryLang] = useState<PrimaryLang>(() => {
    try {
      const v = window.localStorage.getItem('hanjian:primaryLang');
      return v === 'zh' || v === 'en' ? v : 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('hanjian:primaryLang', primaryLang);
    } catch {
      // storage unavailable (private mode); direction stays in-memory
    }
  }, [primaryLang]);

  const [showPinyin, setShowPinyin] = useState(true);
  const [showZhuyin, setShowZhuyin] = useState(false);
  const [toneColors, setToneColors] = useState(true);
  const [defsInline, setDefsInline] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [charSize, setCharSize] = useState(1);

  const [inspectedChar, setInspectedChar] = useState<string | null>(null);
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [openSentences, setOpenSentences] = useState<Set<string>>(new Set());
  const [closedSentences, setClosedSentences] = useState<Set<string>>(
    new Set(),
  );
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const [dark, setDark] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [showTip, setShowTip] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (importOpen) setImportOpen(false);
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
      if (k === 'w') setReveal((r) => ({ ...r, words: !r.words }));
      if (k === 's') setReveal((r) => ({ ...r, sentences: !r.sentences }));
      if (k === 'p') setReveal((r) => ({ ...r, paragraphs: !r.paragraphs }));
      if (k === 'f') setReveal((r) => ({ ...r, full: !r.full }));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [importOpen, toolsOpen, inspectedChar, pinnedKey, hover, showTip]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.setProperty(
      '--paper',
      dark ? '#121210' : '#FFFEFB',
    );
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
    if (k === 'sentences') {
      if (reveal.sentences) setOpenSentences(new Set());
      else setClosedSentences(new Set());
    }
    setReveal((r) => ({ ...r, [k]: !r[k] }));
  };

  const handleInspectChar = (c: string) => {
    setInspectedChar((prev) => (prev === c ? null : c));
  };

  const clearSelection = () => {
    setInspectedChar(null);
    setPinnedKey(null);
    setHover(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--paper)] text-[var(--ink)] selection:bg-[var(--verm-soft)]">
      <Header
        docs={docs}
        activeId={doc.id}
        onSelect={setActiveId}
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
        onOpenTools={() => setToolsOpen(true)}
      />

      <div className="flex flex-1 min-h-0">
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
            onSpeak={handleSpeak}
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
          charSize={charSize}
          onCharSize={setCharSize}
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
        />
      </div>

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
      />

      {hover && reveal.words && (
        <WordCard
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

      {importOpen && (
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
