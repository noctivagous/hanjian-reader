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
import type {
  Doc,
  LanguageRegister,
  UnderlineMode,
  WordAlign,
} from './data/types';
import {
  loadDictionary,
  type DictIndex,
  type DictStatus,
  type SourcedReadingProvider,
} from './lib/dictionary';
import { loadJiayan, type JiayanIndex } from './lib/jiayan';
import {
  lookupInRegisterOrder,
  resolveDocLanguageRegister,
  segmentationRoute,
  type RegisterProviders,
} from './lib/languageRegister';
import { loadPublicDocs } from './lib/publicDocs';
import { docScript } from './lib/script';
import { importCustomDoc } from './lib/segment';
import { copyText, speakChinese } from './lib/speech';
import {
  addStudyItem,
  parseStudyList,
  removeStudyItem,
  serializeStudyList,
  studyListHas,
  type StudyItem,
} from './lib/studyList';
import {
  defaultSettings,
  parseSettings,
  serializeSettings,
  type ReaderSettings,
} from './lib/settings';
import { docSearchMatches } from './lib/search';
import { downloadDoc, isHanjianDoc } from './lib/docFile';
import { downloadEpub } from './lib/epub';
import { downloadTmx } from './lib/tmx';
import {
  docHasTranslationChoice,
  docTranslations,
  selectTranslation,
} from './lib/doc';
import type { ImportDraft } from './components/ImportModal';
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
    return parsed.filter(isHanjianDoc);
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

/** The versioned settings record (display, dark, sizes, notes, positions). */
function readStoredSettings(): ReaderSettings {
  const defaults = defaultSettings({
    reveal: { ...brand.defaults.reveal },
    showPinyin: brand.defaults.showPinyin,
    showZhuyin: brand.defaults.showZhuyin,
    toneColors: brand.defaults.toneColors,
    defsInline: brand.defaults.defsInline,
    showSentenceChips: brand.defaults.showSentenceChips,
    fontScale: brand.defaults.fontScale,
    charSize: brand.defaults.charSize,
    showSpeakerButtons: brand.defaults.showSpeakerButtons,
    speakOnClick: brand.defaults.speakOnClick,
    dark: brand.defaults.dark,
    showTip: true,
    sidebarCollapsed: false,
    navCollapsed: false,
    compareTranslations: false,
    pageMode: false,
  });
  try {
    return parseSettings(
      window.localStorage.getItem(brandStorageKey('settings')),
      defaults,
    );
  } catch {
    return defaults;
  }
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
  const rawDoc = useMemo(
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
  const [bootSettings] = useState(readStoredSettings);
  const [translationByDoc, setTranslationByDoc] = useState<
    Record<string, string>
  >(() => bootSettings.translations);
  const [registerByDoc, setRegisterByDoc] = useState<
    Record<string, LanguageRegister>
  >(() => bootSettings.languageRegisters);
  const [compareTranslations, setCompareTranslations] = useState(
    bootSettings.compareTranslations,
  );
  const [pageMode, setPageMode] = useState(bootSettings.pageMode);
  const [reveal, setReveal] = useState<Reveal>(() => bootSettings.reveal);
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

  // Both underline layers show by default: spans as phrase context,
  // glosses as word-level underlines over them, translator-only words
  // in dotted gray. Lexical chips under each sentence still carry the
  // gloss layer's readings. A stored explicit choice always wins.
  const [alignRole, setAlignRole] = useState<UnderlineMode>(() => {
    try {
      const v = window.localStorage.getItem(brandStorageKey('alignRole'));
      return v === 'gloss' || v === 'span' || v === 'both' ? v : 'both';
    } catch {
      return 'both';
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

  const [showPinyin, setShowPinyin] = useState(bootSettings.showPinyin);
  const [showZhuyin, setShowZhuyin] = useState(bootSettings.showZhuyin);
  const [toneColors, setToneColors] = useState(bootSettings.toneColors);
  const [defsInline, setDefsInline] = useState(bootSettings.defsInline);
  const [showSentenceChips, setShowSentenceChips] = useState(
    bootSettings.showSentenceChips,
  );
  const [fontScale, setFontScale] = useState(bootSettings.fontScale);
  const [charSize, setCharSize] = useState(bootSettings.charSize);
  const [showSpeakerButtons, setShowSpeakerButtons] = useState(
    bootSettings.showSpeakerButtons,
  );
  const [speakOnClick, setSpeakOnClick] = useState(bootSettings.speakOnClick);

  const [inspectedChar, setInspectedChar] = useState<string | null>(null);
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const [pinnedWord, setPinnedWord] = useState<WordAlign | null>(null);
  const [hover, setHover] = useState<HoverState | null>(null);
  const linkedAlign = hover?.data ?? pinnedWord ?? null;

  const handlePin = (key: string | null, word?: WordAlign) => {
    setPinnedKey(key);
    setPinnedWord(key && word ? word : null);
  };
  const handleAlignRole = (role: UnderlineMode) => {
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
  const [notes, setNotes] = useState<Record<string, string>>(
    () => bootSettings.notes,
  );

  const [studyList, setStudyList] = useState<StudyItem[]>(() => {
    try {
      return parseStudyList(
        window.localStorage.getItem(brandStorageKey('studyList')),
      );
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        brandStorageKey('studyList'),
        serializeStudyList(studyList),
      );
    } catch {
      // storage unavailable (private mode); the list stays in-memory
    }
  }, [studyList]);

  /** The inspector's + List button: a real toggle over the study list. */
  const handleAddToList = () => {
    if (!inspectedChar) return;
    if (studyListHas(studyList, inspectedChar)) {
      setStudyList((prev) => removeStudyItem(prev, inspectedChar));
      flash(`Removed ${inspectedChar} from study list`, 1500);
    } else {
      setStudyList((prev) => addStudyItem(prev, inspectedChar, Date.now()).items);
      flash(`Added ${inspectedChar} to study list`, 1500);
    }
  };

  const [dark, setDark] = useState(bootSettings.dark);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    bootSettings.sidebarCollapsed,
  );
  const [navCollapsed, setNavCollapsed] = useState(bootSettings.navCollapsed);
  const [navOpen, setNavOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [showTip, setShowTip] = useState(bootSettings.showTip);
  const [positions, setPositions] = useState<Record<string, string>>(
    () => bootSettings.positions,
  );

  // One write path for the whole settings record: any covered state
  // change rewrites it, so display options, dark mode, sizes, notes and
  // reading positions all survive reload together.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        brandStorageKey('settings'),
        serializeSettings({
          version: 1,
          reveal,
          showPinyin,
          showZhuyin,
          toneColors,
          defsInline,
          showSentenceChips,
          fontScale,
          charSize,
          showSpeakerButtons,
          speakOnClick,
          dark,
          showTip,
          sidebarCollapsed,
          navCollapsed,
          notes,
          positions,
          translations: translationByDoc,
          languageRegisters: registerByDoc,
          compareTranslations,
          pageMode,
        }),
      );
    } catch {
      // storage unavailable (private mode); settings stay in-memory
    }
  }, [
    reveal,
    showPinyin,
    showZhuyin,
    toneColors,
    defsInline,
    showSentenceChips,
    fontScale,
    charSize,
    showSpeakerButtons,
    speakOnClick,
    dark,
    showTip,
    sidebarCollapsed,
    navCollapsed,
    notes,
    positions,
    translationByDoc,
    registerByDoc,
    compareTranslations,
    pageMode,
  ]);
  const [toast, setToast] = useState<string | null>(null);

  // The document's effective language register: the reader's override
  // wins, then the register the document declares, then detection.
  // One resolution (lib/languageRegister) feeds the Register control
  // and the dictionary order below.
  const docRegister = useMemo(
    () => resolveDocLanguageRegister(rawDoc, registerByDoc[rawDoc.id]),
    [rawDoc, registerByDoc],
  );
  const handleRegisterChange = (override: LanguageRegister | null) =>
    setRegisterByDoc((prev) => {
      const next = { ...prev };
      if (override) next[rawDoc.id] = override;
      else delete next[rawDoc.id];
      return next;
    });

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
      docScript(rawDoc) === 'traditional' ||
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
  // Segmentation follows the register (slice 2): the resolved register
  // picks the word breaker — Jiayan for classical, the modern path
  // otherwise — and script is only the fallback when no register can
  // be determined (see segmentationRoute). Jiayan still loads for
  // every traditional-script doc regardless of route, because the
  // classical dictionary provider below consults its headwords in
  // either register.
  const segRoute = useMemo(
    () => segmentationRoute(docRegister, rawDoc),
    [docRegister, rawDoc],
  );
  const needsJiayan =
    brand.features.words &&
    (segRoute === 'jiayan' || docScript(rawDoc) === 'traditional');
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
  const segmentZh = segRoute === 'jiayan' ? jiayan?.segment : undefined;

  // Register-ordered dictionary consultation for word readings. The
  // classical source is the Jiayan classical lexicon: it attests
  // headwords (the asset carries frequencies, not glosses), and the
  // readings themselves come from the CC-CEDICT store — so what the
  // register changes is which source is consulted first and credited
  // in the word card, never the readings. In classical register a
  // Jiayan-attested headword is answered by the classical dictionary;
  // anything else falls back to CC-CEDICT. In mandarin register
  // CC-CEDICT answers first.
  const registerProviders = useMemo<RegisterProviders>(() => {
    if (!dict) return {};
    return {
      cedict: dict,
      classical: jiayan
        ? {
            lookup: (text: string) =>
              jiayan.hasWord(text) ? dict.lookup(text) : undefined,
          }
        : null,
    };
  }, [dict, jiayan]);
  const registerDict = useMemo<SourcedReadingProvider | null>(() => {
    if (!dict) return null;
    const register = docRegister.register;
    return {
      lookup: (text: string) =>
        lookupInRegisterOrder(text, register, registerProviders)?.records,
      sourceOf: (text: string) =>
        lookupInRegisterOrder(text, register, registerProviders)?.sourceLabel,
    };
  }, [dict, registerProviders, docRegister.register]);
  const readerDict = registerDict ?? dict;

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

  const emptyImportDraft: ImportDraft = { en: '', zh: '', titleEn: '', titleZh: '' };
  const [importDraft, setImportDraft] = useState<ImportDraft>(emptyImportDraft);
  const patchImportDraft = (patch: Partial<ImportDraft>) =>
    setImportDraft((prev) => ({ ...prev, ...patch }));

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
    setImportDraft(emptyImportDraft);
    flash('Custom document imported', 2000);
  };

  /** A .hanjian.json file imports back as a custom doc (round-trip). */
  const handleImportJson = (incoming: Doc) => {
    const replaces = customDocs.some((d) => d.id === incoming.id);
    const collidesBuiltin =
      !replaces && docs.some((d) => d.id === incoming.id);
    const toAdd = collidesBuiltin
      ? { ...incoming, id: `custom_${Date.now()}` }
      : incoming;
    setCustomDocs((prev) =>
      replaces
        ? prev.map((d) => (d.id === toAdd.id ? toAdd : d))
        : [...prev, toAdd],
    );
    setActiveId(toAdd.id);
    setImportOpen(false);
    setImportDraft(emptyImportDraft);
    flash(
      replaces ? 'Document replaced from file' : 'Document imported from file',
      2000,
    );
  };

  const handleRenameDoc = (id: string, titleEn: string) => {
    setCustomDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, titleEn } : d)),
    );
  };

  const handleDeleteDoc = (id: string) => {
    setCustomDocs((prev) => prev.filter((d) => d.id !== id));
    if (activeId === id) handleSelectDoc(brand.defaults.defaultDocId);
    flash('Imported document deleted', 1500);
  };

  const isCustomDocId = (id: string) => customDocs.some((d) => d.id === id);

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

  // The translator picker rotates the chosen translation to the front
  // of each sentence (selectTranslation), so the whole app — reader,
  // search, copy tools — follows the per-document choice.
  const doc = useMemo(
    () => selectTranslation(rawDoc, translationByDoc[rawDoc.id]),
    [rawDoc, translationByDoc],
  );

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

  // Search navigation: matches are counted over the doc model (both
  // languages, every occurrence); next/prev steps through them and
  // scrolls the containing sentence into view.
  const searchResult = useMemo(
    () => docSearchMatches(doc, search),
    [doc, search],
  );
  const [searchIndex, setSearchIndex] = useState(0);
  const searchCurrent =
    searchResult.total > 0
      ? Math.min(searchIndex, searchResult.total - 1)
      : 0;
  const searchFocusId =
    searchResult.total > 0 ? searchResult.anchors[searchCurrent] : null;

  const scrollToSearchMatch = (idx: number, smooth = true) => {
    const id = searchResult.anchors[idx];
    if (!id) return;
    setActiveNavId(id);
    const el = scrollRef.current?.querySelector(`#${CSS.escape(id)}`);
    el?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  };

  const goToSearchMatch = (delta: number) => {
    if (searchResult.total === 0) return;
    const next =
      (searchCurrent + delta + searchResult.total) % searchResult.total;
    setSearchIndex(next);
    scrollToSearchMatch(next);
  };

  // A new query (or a new doc under the same query) restarts at the
  // first match and jumps to it.
  useEffect(() => {
    setSearchIndex(0);
    if (!search || searchResult.total === 0) return;
    const id = searchResult.anchors[0];
    let tries = 0;
    let raf = 0;
    const jump = () => {
      const el = scrollRef.current?.querySelector(`#${CSS.escape(id)}`);
      if (el) {
        el.scrollIntoView({ block: 'start' });
        return;
      }
      if (tries++ < 40) raf = requestAnimationFrame(jump);
    };
    raf = requestAnimationFrame(jump);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, doc.id]);

  // Reading position: restore the stored anchor when a doc opens
  // without an explicit route intent, then track the anchor in view.
  const restoredFor = useRef<string | null>(null);

  useEffect(() => {
    if (restoredFor.current === doc.id) return;
    if (routeIntent.current) {
      // An explicit navigation (URL route, doc select, click) wins.
      restoredFor.current = doc.id;
      return;
    }
    const target = positions[doc.id];
    if (!target) {
      restoredFor.current = doc.id;
      return;
    }
    // In page mode the target's section renders only once it is the
    // active one — point the nav at the anchor first, then scroll.
    if (pageMode) setActiveNavId(target);
    let cancelled = false;
    let tries = 0;
    const scroll = () => {
      if (cancelled) return;
      const el = scrollRef.current?.querySelector(`#${CSS.escape(target)}`);
      if (el) {
        el.scrollIntoView({ block: 'start' });
        restoredFor.current = doc.id;
        return;
      }
      if (tries++ < 40) requestAnimationFrame(scroll);
      else restoredFor.current = doc.id;
    };
    requestAnimationFrame(scroll);
    return () => {
      cancelled = true;
    };
  }, [doc, positions, pageMode]);

  useEffect(() => {
    // Don't record before the restore ran, or the observer's reset to
    // the first anchor would overwrite the stored position.
    if (restoredFor.current !== doc.id) return;
    if (!activeNavId) return;
    setPositions((prev) =>
      prev[doc.id] === activeNavId
        ? prev
        : { ...prev, [doc.id]: activeNavId },
    );
  }, [activeNavId, doc]);

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

  const translationOptions = docHasTranslationChoice(rawDoc)
    ? docTranslations(rawDoc)
    : [];
  const activeTranslationId =
    translationByDoc[rawDoc.id] ?? translationOptions[0]?.id ?? '';
  const handleSelectTranslation = (id: string) =>
    setTranslationByDoc((prev) => ({ ...prev, [rawDoc.id]: id }));

  // Pagination: a page is one section; the footer steps between them.
  const pageIdx = Math.max(
    0,
    doc.sections.findIndex((s) => s.id === activeSectionId),
  );
  const goToPage = (idx: number) => {
    const section = doc.sections[idx];
    if (!section) return;
    handleNavigate(section.id);
    scrollRef.current?.scrollTo({ top: 0 });
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
          isCustomDoc={isCustomDocId}
          onRenameDoc={handleRenameDoc}
          onDeleteDoc={handleDeleteDoc}
          translationOptions={translationOptions}
          activeTranslationId={activeTranslationId}
          onSelectTranslation={handleSelectTranslation}
          register={docRegister.register}
          registerSource={docRegister.source}
          registerOverride={registerByDoc[rawDoc.id]}
          onRegisterChange={handleRegisterChange}
          primaryLang={primaryLang}
          activeSectionId={activeSectionId}
          activeParagraphId={activeParagraphId}
          onNavigate={handleNavigate}
          wordHover={{
            enabled: reveal.words,
            mode: hoverMode,
            dict: readerDict,
            pinnedKey,
            onPin: handlePin,
            onHover: setHover,
            linkedAlign,
            inspectedChar,
            onInspectChar: handleInspectChar,
          }}
          collapsed={navCollapsed}
        />
        <div className="flex-1 flex flex-col min-w-0">
        <div
          ref={scrollRef}
          className="flex-1 flex justify-center overflow-auto"
          onClick={clearSelection}
        >
          <Reader
            doc={doc}
            pageMode={pageMode}
            pageSectionId={activeSectionId}
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
            searchFocusId={searchFocusId}
            compareTranslations={compareTranslations}
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
            dict={readerDict}
            segmentZh={segmentZh}
            alignRole={alignRole}
            hoverMode={hoverMode}
          />
        </div>
        {pageMode && (
          <div className="border-t border-[var(--line)] bg-[var(--paper)] px-4 py-2 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={pageIdx <= 0}
              onClick={() => goToPage(pageIdx - 1)}
              className="rounded-full border border-[var(--line)] px-3.5 py-1.5 text-[12px] disabled:opacity-40 hover:border-[var(--verm)]"
            >
              ← Prev
            </button>
            <div className="text-[12px] text-[var(--ink-mute)] truncate text-center">
              {doc.sections[pageIdx]?.titleEn || doc.sections[pageIdx]?.titleZh || ''}
              {doc.sections.length > 0 && (
                <>
                  {' · '}Section {pageIdx + 1} of {doc.sections.length}
                  {' · '}
                  {Math.round(((pageIdx + 1) / doc.sections.length) * 100)}%
                </>
              )}
            </div>
            <button
              type="button"
              disabled={pageIdx >= doc.sections.length - 1}
              onClick={() => goToPage(pageIdx + 1)}
              className="rounded-full border border-[var(--line)] px-3.5 py-1.5 text-[12px] disabled:opacity-40 hover:border-[var(--verm)]"
            >
              Next →
            </button>
          </div>
        )}
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
          compareTranslations={compareTranslations}
          onCompareTranslations={setCompareTranslations}
          pageMode={pageMode}
          onPageMode={setPageMode}
          searchTotal={searchResult.total}
          searchCurrent={searchResult.total > 0 ? searchCurrent + 1 : 0}
          onSearchPrev={() => goToSearchMatch(-1)}
          onSearchNext={() => goToSearchMatch(1)}
          inspectedChar={inspectedChar}
          note={inspectedChar ? notes[inspectedChar] || '' : ''}
          onNote={(ch, note) =>
            setNotes((prev) => ({ ...prev, [ch]: note }))
          }
          onSpeak={handleSpeak}
          onCopy={handleCopy}
          onAddToList={handleAddToList}
          onDownloadDoc={() => downloadDoc(doc)}
          onDownloadEpub={() => downloadEpub(doc)}
          onDownloadTmx={() => downloadTmx(doc)}
          studyList={studyList}
          onRemoveFromList={(ch) =>
            setStudyList((prev) => removeStudyItem(prev, ch))
          }
          onSelectStudyChar={(ch) => setInspectedChar(ch)}
          onImport={() => setImportOpen(true)}
          onCloseInspector={() => setInspectedChar(null)}
          collapsed={sidebarCollapsed}
          dictStatus={dictStatus}
          dict={readerDict}
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
        isCustomDoc={isCustomDocId}
        onRenameDoc={handleRenameDoc}
        onDeleteDoc={handleDeleteDoc}
        translationOptions={translationOptions}
        activeTranslationId={activeTranslationId}
        onSelectTranslation={handleSelectTranslation}
        register={docRegister.register}
        registerSource={docRegister.source}
        registerOverride={registerByDoc[rawDoc.id]}
        onRegisterChange={handleRegisterChange}
        primaryLang={primaryLang}
        activeSectionId={activeSectionId}
        activeParagraphId={activeParagraphId}
        onNavigate={handleNavigate}
        wordHover={{
          enabled: reveal.words,
          mode: hoverMode,
          dict: readerDict,
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
        onAddToList={handleAddToList}
        studyListHasChar={
          inspectedChar ? studyListHas(studyList, inspectedChar) : false
        }
        note={inspectedChar ? notes[inspectedChar] || '' : ''}
        onNote={(ch, note) =>
          setNotes((prev) => ({ ...prev, [ch]: note }))
        }
        onSpeak={handleSpeak}
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
        showSpeakerButtons={showSpeakerButtons}
        onShowSpeakerButtons={setShowSpeakerButtons}
        speakOnClick={speakOnClick}
        onSpeakOnClick={setSpeakOnClick}
        charSize={charSize}
        onCharSize={setCharSize}
        pageMode={pageMode}
        onPageMode={setPageMode}
        onCopy={handleCopy}
        dictStatus={dictStatus}
        dict={readerDict}
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
          dict={readerDict}
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
          draft={importDraft}
          onDraftChange={patchImportDraft}
          onImport={handleImport}
          onImportJson={handleImportJson}
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
