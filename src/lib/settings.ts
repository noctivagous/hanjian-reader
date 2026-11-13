/**
 * The reader's settings record: ONE versioned object in localStorage
 * (key brandStorageKey('settings')) holding everything the audit found
 * unpersisted — display options, reveal modes, dark mode, sizes, the
 * tip dismissal, sidebar states, per-character notes, and per-document
 * reading positions.
 *
 * Keys that already persisted fine on their own (primaryLang,
 * alignRole, hoverMode, activeDoc, custom docs, the study list) keep
 * their own keys; this record covers the rest, so a future settings
 * migration has exactly one version number to bump.
 *
 * Pure parse/serialize with per-field validation: a corrupt or
 * hand-edited record degrades field-by-field to the caller's defaults
 * instead of breaking the reader. Unknown versions fall back to
 * defaults wholesale (a future version writes a migration here).
 */
import type { LanguageRegister } from '../data/types';
export interface RevealSettings {
  words: boolean;
  sentences: boolean;
  paragraphs: boolean;
  full: boolean;
}

export interface ReaderSettings {
  version: 1;
  reveal: RevealSettings;
  showPinyin: boolean;
  showZhuyin: boolean;
  toneColors: boolean;
  defsInline: boolean;
  showSentenceChips: boolean;
  fontScale: number;
  charSize: number;
  showSpeakerButtons: boolean;
  speakOnClick: boolean;
  dark: boolean;
  showTip: boolean;
  sidebarCollapsed: boolean;
  navCollapsed: boolean;
  notes: Record<string, string>;
  /** Reading position per document: the nav anchor id last in view. */
  positions: Record<string, string>;
  /** Chosen translation id per document (translator picker). */
  translations: Record<string, string>;
  /** Language-register override per document (Register control). */
  languageRegisters: Record<string, LanguageRegister>;
  /** Stack all translations of a sentence under it (compare view). */
  compareTranslations: boolean;
  /** Paginated reading: one section at a time with a stable footer. */
  pageMode: boolean;
}

const bool = (v: unknown, fallback: boolean): boolean =>
  typeof v === 'boolean' ? v : fallback;

const scale = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0.5 && v <= 2
    ? v
    : fallback;

function stringRecord(v: unknown): Record<string, string> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v)) {
    if (typeof val === 'string') out[k] = val;
  }
  return out;
}

function registerRecord(v: unknown): Record<string, LanguageRegister> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return {};
  const out: Record<string, LanguageRegister> = {};
  for (const [k, val] of Object.entries(v)) {
    if (val === 'classical' || val === 'mandarin') out[k] = val;
  }
  return out;
}

export function parseSettings(
  raw: string | null,
  defaults: ReaderSettings,
): ReaderSettings {
  if (!raw) return defaults;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaults;
  }
  if (typeof parsed !== 'object' || parsed === null) return defaults;
  const p = parsed as Record<string, unknown>;
  if (p.version !== 1) return defaults;
  const revealIn =
    typeof p.reveal === 'object' && p.reveal !== null
      ? (p.reveal as Record<string, unknown>)
      : {};
  return {
    version: 1,
    reveal: {
      words: bool(revealIn.words, defaults.reveal.words),
      sentences: bool(revealIn.sentences, defaults.reveal.sentences),
      paragraphs: bool(revealIn.paragraphs, defaults.reveal.paragraphs),
      full: bool(revealIn.full, defaults.reveal.full),
    },
    showPinyin: bool(p.showPinyin, defaults.showPinyin),
    showZhuyin: bool(p.showZhuyin, defaults.showZhuyin),
    toneColors: bool(p.toneColors, defaults.toneColors),
    defsInline: bool(p.defsInline, defaults.defsInline),
    showSentenceChips: bool(p.showSentenceChips, defaults.showSentenceChips),
    fontScale: scale(p.fontScale, defaults.fontScale),
    charSize: scale(p.charSize, defaults.charSize),
    showSpeakerButtons: bool(p.showSpeakerButtons, defaults.showSpeakerButtons),
    speakOnClick: bool(p.speakOnClick, defaults.speakOnClick),
    dark: bool(p.dark, defaults.dark),
    showTip: bool(p.showTip, defaults.showTip),
    sidebarCollapsed: bool(p.sidebarCollapsed, defaults.sidebarCollapsed),
    navCollapsed: bool(p.navCollapsed, defaults.navCollapsed),
    notes: stringRecord(p.notes),
    positions: stringRecord(p.positions),
    translations: stringRecord(p.translations),
    languageRegisters: registerRecord(p.languageRegisters),
    compareTranslations: bool(p.compareTranslations, defaults.compareTranslations),
    pageMode: bool(p.pageMode, defaults.pageMode),
  };
}

export function serializeSettings(settings: ReaderSettings): string {
  return JSON.stringify(settings);
}

/** The all-defaults record a brand ships, before any stored record applies. */
export function defaultSettings(
  partial: Omit<
    ReaderSettings,
    'version' | 'notes' | 'positions' | 'translations' | 'languageRegisters'
  >,
): ReaderSettings {
  return {
    version: 1,
    notes: {},
    positions: {},
    translations: {},
    languageRegisters: {},
    ...partial,
  };
}
