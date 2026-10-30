import { useEffect, useMemo, useRef, useState } from 'react';
import { Header } from './components/Header';
import { ImportModal } from './components/ImportModal';
import { MobileTools } from './components/MobileTools';
import { MobileNavDrawer, NavSidebar } from './components/NavSidebar';
import {
  Reader,
  type HoverMode,
  type PrimaryLang,
  type Reveal,
} from './components/Reader';
import { Sidebar } from './components/Sidebar';
import { WordCard, type HoverState } from './components/WordCard';
import { applyBrand, brand, brandStorageKey } from './brand';
import { docs as seedDocs } from './data/documents';
import { extraDocs } from './data/localDocs';
import type { AlignRole, Doc, WordAlign } from './data/types';
import {
  loadDictionary,
  type DictIndex,
  type DictStatus,
} from './lib/dictionary';
import { loadJiayan, type JiayanIndex } from './lib/jiayan';
import { loadPublicDocs } from './lib/publicDocs';
import { docScript } from './lib/script';
import { importCustomDoc } from './lib/segment';
import { copyText, speakChinese } from './lib/speech';
import {
  buildDocPath,
  completeDocRoute,
  locateInDoc,
  parseDocRoute,
  resolveRouteTarget,
  sameRoute,
  type DocRoute,
} from './lib/docRoute';
import { useScrollObserver } from './lib/useScrollObserver';

const CUSTOM_DOCS_STORAGE_KEY = brandStorageKey('customDocs');

function readStoredCustomDocs(): Doc[] {
  try {
    const value = window.localStorage.getItem(CUSTOM_DOCS_STORAGE_KEY);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (doc): doc is Doc =>
        typeof doc === 'object' &&
        doc !== null &&
        (doc as Doc).format === 'hanjian' &&
        (doc as Doc).version === 1 &&
        typeof (doc as Doc).id === 'string' &&
        Array.isArray((doc as Doc).sections),
    );
  } catch {
    // Storage is unavailable or contains malformed data.
    return [];
  }
}

function readStoredDocId(): string {
  try {
    const v = window.localStorage.getItem(brandStorageKey('activeDoc'));
    if (v) return v;
  } catch {
    // storage unavailable (private mode)
  }
  return brand.defaults.defaultDocId;
}

const ROUTE_BASE = import.meta.env.BASE_URL;

function currentDocRoute(): DocRoute | null {
  return parseDocRoute(window.location.pathname, ROUTE_BASE);
}

function writeDocRoute(route: DocRoute, mode: 'push' | 'replace'): void {
  const path = buildDocPath(route, ROUTE_BASE);
  const url = `${path}${window.location.search}${window.location.hash}`;
  const here =
    window.location.pathname + window.location.search + window.location.hash;
  if (here === url) return;
  if (mode === 'push') window.history.pushState(route, '', url);
  else window.history.replaceState(route, '', url);
}

function pendingDoc(id: string): Doc {
  return {
    format: 'hanjian',
    version: 1,
    id,
    titleEn: 'Loading…',
    titleZh: '',
    author: '',
    sourceLanguage: 'zh',
    sections: [],
  };
}

export default function App() {
  const [customDocs, setCustomDocs] = useState<Doc[]>(readStoredCustomDocs);
  const [publicDocs, setPublicDocs] = useState<Doc[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);
  const docs = useMemo(
    () => [...seedDocs, ...publicDocs, ...extraDocs, ...customDocs],
    [publicDocs, customDocs],
  );
  // Public-domain XLIFF texts from public/texts/ load at runtime and slot
  // in after the bundled docs; private/ (localDocs) stays last.
  useEffect(() => {
    let live = true;
    loadPublicDocs().then((pub) => {
      if (!live) return;
      setPublicDocs(pub);
      setCatalogReady(true);
    });
    return () => {
      live = false;
    };
  }, []);
  const [activeId, setActiveId] = useState(
    () => currentDocRoute()?.docId ?? readStoredDocId(),
  );
  const routeIntent = useRef<DocRoute | null>(currentDocRoute());
  const skipRouteSync = useRef(false);
  const doc = useMemo(
    () => docs.find((d) => d.id === activeId) ?? pendingDoc(activeId),
    [docs, activeId],
  );

  useEffect(() => {
    if (!catalogReady) return;
    if (docs.some((d) => d.id === activeId)) return;
    const preferred = docs.find((d) => d.id === brand.defaults.defaultDocId);
    const fallback = preferred ?? docs[0];
    if (fallback) setActiveId(fallback.id);
  }, [catalogReady, docs, activeId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        CUSTOM_DOCS_STORAGE_KEY,
        JSON.stringify(customDocs),
      );
    } catch {
      // Storage is unavailable or full; the imported document stays in-memory.
    }
  }, [customDocs]);

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

  const [alignRole, setAlignRole] = useState<AlignRole>(() => {
    try {
      const v = window.localStorage.getItem(brandStorageKey('alignRole'));
      return v === 'gloss' || v === 'span' ? v : 'span';
    } catch {
      return 'span';
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(brandStorageKey('alignRole'), alignRole);
    } catch {
      // storage unavailable (private mode); alignment role stays in-memory
    }
  }, [alignRole]);

  const [hoverMode, setHoverMode] = useState<HoverMode>(() => {
    try {
      return window.localStorage.getItem(brandStorageKey('hoverMode')) ===
        'character'
        ? 'character'
        : 'word';
    } catch {
      return 'word';
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(brandStorageKey('hoverMode'), hoverMode);
    } catch {
      // storage unavailable (private mode); mode stays in-memory
    }
  }, [hoverMode]);

  useEffect(() => {
    if (!docs.some((d) => d.id === activeId)) return;
    try {
      window.localStorage.setItem(brandStorageKey('activeDoc'), activeId);
    } catch {
      // storage unavailable (private mode); selection stays in-memory
    }
  }, [activeId, docs]);

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
  const [pinnedWord, setPinnedWord] = useState<WordAlign | null>(null);
  const [hover, setHover] = useState<HoverState | null>(null);
  const linkedAlign = hover?.data ?? pinnedWord ?? null;

  const handlePin = (key: string | null, word?: WordAlign) => {
    setPinnedKey(key);
    setPinnedWord(key && word ? word : null);
  };
  const handleAlignRole = (role: AlignRole) => {
    setAlignRole(role);
    handlePin(null);
    setHover(null);
  };
  const handleHoverMode = (mode: HoverMode) => {
    setHoverMode(mode);
    setReveal((r) => ({ ...r, words: true }));
    handlePin(null);
    setHover(null);
  };
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

  // Lazy CC-CEDICT: fetched once when Chinese-primary reading needs it,
  // or when a traditional-script book (Tao Te Ching) or the inspector needs
  // readings in any mode. Null until loaded (or when the fetch fails);
  // tokens render wordless until then and gain readings on re-render.
  const [dict, setDict] = useState<DictIndex | null>(null);
  const [dictFailed, setDictFailed] = useState(false);
  const needsDict =
    brand.features.words &&
    (reveal.words ||
      primaryLang === 'zh' ||
      docScript(doc) === 'traditional' ||
      inspectedChar !== null);
  useEffect(() => {
    if (!needsDict || dict || dictFailed) return;
    let live = true;
    loadDictionary().then((d) => {
      if (!live) return;
      if (d) setDict(d);
      else setDictFailed(true);
    });
    return () => {
      live = false;
    };
  }, [needsDict, dict, dictFailed]);
  const dictStatus: DictStatus = dict
    ? 'ready'
    : dictFailed
      ? 'unavailable'
      : needsDict
        ? 'loading'
        : 'idle';

  const [jiayan, setJiayan] = useState<JiayanIndex | null>(null);
  const needsJiayan =
    brand.features.words && docScript(doc) === 'traditional';
  useEffect(() => {
    if (!needsJiayan || jiayan) return;
    let live = true;
    loadJiayan().then((j) => {
      if (live && j) setJiayan(j);
    });
    return () => {
      live = false;
    };
  }, [needsJiayan, jiayan]);
  const segmentZh = jiayan?.segment;

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
          handlePin(null);
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
    setCustomDocs((prev) => [...prev, custom]);
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
    handlePin(null);
    setHover(null);
  };

  const navIds = useMemo(
    () =>
      doc.sections.flatMap((s) => [
        s.id,
        ...s.paragraphs.flatMap((p) => [p.id, ...p.sentences.map((sent) => sent.id)]),
      ]),
    [doc],
  );
  const [activeNavId, setActiveNavId] = useScrollObserver(scrollRef, navIds, doc.id);

  const activeLocation = useMemo(
    () =>
      completeDocRoute(
        doc,
        activeNavId ? locateInDoc(doc, activeNavId) : { docId: doc.id },
      ),
    [doc, activeNavId],
  );

  const activeSectionId = useMemo(() => {
    return (
      activeLocation.sectionId ??
      doc.sections[0]?.id ??
      null
    );
  }, [doc, activeLocation.sectionId]);

  const activeParagraphId = activeLocation.paragraphId ?? null;

  useEffect(() => {
    const onPop = () => {
      const route = currentDocRoute();
      skipRouteSync.current = true;
      if (!route) {
        setActiveId(readStoredDocId());
        routeIntent.current = null;
        return;
      }
      setActiveId(route.docId);
      routeIntent.current = route;
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (skipRouteSync.current) {
      skipRouteSync.current = false;
      return;
    }
    if (routeIntent.current) return;
    if (!docs.some((d) => d.id === activeId)) return;
    const route: DocRoute = { docId: activeId };
    if (doc.id === activeId && doc.sections.length > 0) {
      route.sectionId = activeLocation.sectionId;
      route.paragraphId = activeLocation.paragraphId;
      route.sentenceId = activeLocation.sentenceId;
    }
    writeDocRoute(route, 'replace');
  }, [activeId, docs, doc, activeLocation]);

  useEffect(() => {
    const intent = routeIntent.current;
    if (!intent || intent.docId !== doc.id || doc.sections.length === 0) return;
    writeDocRoute(completeDocRoute(doc, intent), 'replace');
    const targetId = resolveRouteTarget(doc, intent);
    let cancelled = false;
    let tries = 0;
    const scroll = () => {
      if (cancelled) return;
      if (!targetId) {
        scrollRef.current?.scrollTo({ top: 0 });
        return;
      }
      const el = scrollRef.current?.querySelector(`#${CSS.escape(targetId)}`);
      if (el) {
        el.scrollIntoView({ block: 'start' });
        return;
      }
      if (tries++ < 40) requestAnimationFrame(scroll);
    };
    requestAnimationFrame(scroll);
    return () => {
      cancelled = true;
    };
  }, [doc]);

  useEffect(() => {
    const intent = routeIntent.current;
    if (!intent || intent.docId !== doc.id || doc.sections.length === 0) return;
    const completed = completeDocRoute(doc, intent);
    if (sameRoute(completed, activeLocation)) {
      routeIntent.current = null;
      return;
    }
    const t = window.setTimeout(() => {
      if (routeIntent.current === intent) routeIntent.current = null;
    }, 800);
    return () => window.clearTimeout(t);
  }, [doc, activeLocation]);

  const handleSelectDoc = (id: string) => {
    setActiveId(id);
    routeIntent.current = { docId: id };
    writeDocRoute({ docId: id }, 'push');
  };

  const handleNavigate = (id: string) => {
    setActiveNavId(id);
    setNavOpen(false);
    const loc = locateInDoc(doc, id);
    writeDocRoute(loc, 'push');
    const el = scrollRef.current?.querySelector(`#${CSS.escape(id)}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      data-script={docScript(doc)}
      className="h-screen min-h-0 overflow-hidden flex flex-col bg-[var(--paper)] text-[var(--ink)] selection:bg-[var(--verm-soft)]"
    >
      <Header
        onImport={() => setImportOpen(true)}
        primaryLang={primaryLang}
        onPrimaryLang={(v) => {
          setPrimaryLang(v);
          setHover(null);
          handlePin(null);
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
          activeDocId={activeId}
          onSelectDoc={handleSelectDoc}
          primaryLang={primaryLang}
          activeSectionId={activeSectionId}
          activeParagraphId={activeParagraphId}
          onNavigate={handleNavigate}
          wordHover={{
            enabled: reveal.words,
            mode: hoverMode,
            dict,
            pinnedKey,
            onPin: handlePin,
            onHover: setHover,
            linkedAlign,
            inspectedChar,
            onInspectChar: handleInspectChar,
          }}
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
            onPin={handlePin}
            linkedAlign={linkedAlign}
            hover={hover}
            onHover={setHover}
            inspectedChar={inspectedChar}
            onInspectChar={handleInspectChar}
            showSpeakerButtons={showSpeakerButtons}
            speakOnClick={speakOnClick}
            onSpeak={handleSpeak}
            dict={dict}
            segmentZh={segmentZh}
            alignRole={alignRole}
            hoverMode={hoverMode}
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
          dict={dict}
          alignRole={alignRole}
          onAlignRole={handleAlignRole}
          hoverMode={hoverMode}
          onHoverMode={handleHoverMode}
        />
      </div>

      <MobileNavDrawer
        doc={doc}
        docs={docs}
        activeDocId={activeId}
        onSelectDoc={handleSelectDoc}
        primaryLang={primaryLang}
        activeSectionId={activeSectionId}
        activeParagraphId={activeParagraphId}
        onNavigate={handleNavigate}
        wordHover={{
          enabled: reveal.words,
          mode: hoverMode,
          dict,
          pinnedKey,
          onPin: handlePin,
          onHover: setHover,
          linkedAlign,
          inspectedChar,
          onInspectChar: handleInspectChar,
        }}
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
        dict={dict}
        alignRole={alignRole}
        onAlignRole={handleAlignRole}
        hoverMode={hoverMode}
        onHoverMode={handleHoverMode}
      />

      {hover && reveal.words && (
        <WordCard
          key={hover.key}
          hover={hover}
          pinnedKey={pinnedKey}
          toneColors={toneColors}
          showZhuyin={showZhuyin}
          dict={dict}
          primaryLang={primaryLang}
          onEnter={setHover}
          onLeave={() => {
            if (pinnedKey !== hover.key) setHover(null);
          }}
          onInspect={(zh) => {
            handleInspectChar(zh);
            setHover(null);
            handlePin(null);
          }}
          onClose={() => {
            handlePin(null);
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
