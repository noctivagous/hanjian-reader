import type { PrimaryLang, Reveal } from './components/Reader';
import { BRAND_OVERRIDE } from './brand.config';

// White-label / private-label configuration for the reader.
//
// A site owner rebrands the app by editing ONLY `src/brand.config.ts`
// (texts, theme, features, defaults), then rebuilding (`npm run build`)
// and hosting the resulting `dist/` folder. No other code changes needed.

export interface BrandTexts {
  /** Latin-script app name, e.g. "HanJian". */
  appName: string;
  /** Chinese-script app name, e.g. "涵简". */
  appNameZh: string;
  /** Tagline under the app name, e.g. "Parallel Reader". */
  tagline: string;
  /** Single glyph rendered in the header logo tile. */
  logoGlyph: string;
  /** Browser tab title. */
  documentTitle: string;
  /** Sidebar footer help text (English-primary mode). */
  howToReadEn: string;
  /** Sidebar footer help text (Chinese-primary mode). */
  howToReadZh: string;
}

export interface BrandTheme {
  /** Light-mode page background. */
  paper: string;
  /** Dark-mode page background. */
  paperDark: string;
  /** Primary text color. */
  ink: string;
  /** Accent color: toggles, badges, active states. */
  accent: string;
  /** Soft accent: tinted backgrounds behind badges and cards. */
  accentSoft: string;
}

export interface BrandFeatures {
  // Reveal modes offered in the toolbar.
  words: boolean;
  sentences: boolean;
  paragraphs: boolean;
  full: boolean;
  // Display options offered in the sidebar.
  pinyin: boolean;
  zhuyin: boolean;
  definitions: boolean;
  toneColors: boolean;
  charSize: boolean;
  fontSize: boolean;
  search: boolean;
  // Tooling.
  import: boolean;
  speech: boolean;
  darkMode: boolean;
  inspector: boolean;
}

export interface BrandDefaults {
  primaryLang: PrimaryLang;
  reveal: Reveal;
  showPinyin: boolean;
  showZhuyin: boolean;
  toneColors: boolean;
  defsInline: boolean;
  fontScale: number;
  charSize: number;
  dark: boolean;
}

export interface BrandConfig {
  /** URL-safe slug. Namespaces localStorage and identifies the bundle. */
  id: string;
  texts: BrandTexts;
  theme: BrandTheme;
  features: BrandFeatures;
  defaults: BrandDefaults;
}

export type BrandOverride = {
  [K in keyof BrandConfig]?: BrandConfig[K] extends object
    ? Partial<BrandConfig[K]>
    : BrandConfig[K];
};

export const DEFAULT_BRAND: BrandConfig = {
  id: 'hanjian',
  texts: {
    appName: 'HanJian',
    appNameZh: '涵简',
    tagline: 'Parallel Reader',
    logoGlyph: '涵',
    documentTitle: 'HanJian 涵简 — Parallel Reader',
    howToReadEn:
      'Start in English. Reveal Chinese progressively: words for quick lookup, sentences for structure, paragraphs for flow, full for immersion. Click any 汉字 to inspect in this panel.',
    howToReadZh:
      'Start in Chinese. Reveal English progressively: words for quick lookup, sentences for structure, paragraphs for flow, full for immersion. Click any 汉字 to inspect in this panel.',
  },
  theme: {
    paper: '#FFFEFB',
    paperDark: '#121210',
    ink: '#1A1A18',
    accent: '#C73E1D',
    accentSoft: '#FFF0EB',
  },
  features: {
    words: true,
    sentences: true,
    paragraphs: true,
    full: true,
    pinyin: true,
    zhuyin: true,
    definitions: true,
    toneColors: true,
    charSize: true,
    fontSize: true,
    search: true,
    import: true,
    speech: true,
    darkMode: true,
    inspector: true,
  },
  defaults: {
    primaryLang: 'en',
    reveal: { words: true, sentences: false, paragraphs: false, full: false },
    showPinyin: true,
    showZhuyin: false,
    toneColors: true,
    defsInline: false,
    fontScale: 1,
    charSize: 1,
    dark: false,
  },
};

// Merge a hand-edited override onto the defaults. Unknown keys are ignored
// and mistyped values fall back to the default, so a broken config file
// can never break the build — it just behaves like the default brand.
function mergeSection(
  base: Record<string, unknown>,
  override: unknown,
): Record<string, unknown> {
  if (!override || typeof override !== 'object' || Array.isArray(override)) {
    return base;
  }
  const src = override as Record<string, unknown>;
  const out = { ...base };
  for (const key of Object.keys(base)) {
    const value = src[key];
    if (value === undefined) continue;
    const current = base[key];
    if (
      current !== null &&
      typeof current === 'object' &&
      !Array.isArray(current)
    ) {
      out[key] = mergeSection(current as Record<string, unknown>, value);
      continue;
    }
    if (typeof value === typeof current) out[key] = value;
  }
  return out;
}

function mergeBrand(override: BrandOverride | undefined): BrandConfig {
  if (!override) return DEFAULT_BRAND;
  const { id, ...rest } = override as BrandOverride & { id?: unknown };
  const merged: BrandConfig = {
    id: typeof id === 'string' && id.length > 0 ? id : DEFAULT_BRAND.id,
    texts: mergeSection(
      DEFAULT_BRAND.texts as unknown as Record<string, unknown>,
      rest.texts,
    ) as unknown as BrandTexts,
    theme: mergeSection(
      DEFAULT_BRAND.theme as unknown as Record<string, unknown>,
      rest.theme,
    ) as unknown as BrandTheme,
    features: mergeSection(
      DEFAULT_BRAND.features as unknown as Record<string, unknown>,
      rest.features,
    ) as unknown as BrandFeatures,
    defaults: mergeSection(
      DEFAULT_BRAND.defaults as unknown as Record<string, unknown>,
      rest.defaults,
    ) as unknown as BrandDefaults,
  };
  // A reveal mode that is switched off must never start switched on.
  for (const mode of ['words', 'sentences', 'paragraphs', 'full'] as const) {
    if (!merged.features[mode]) merged.defaults.reveal[mode] = false;
  }
  // Display options that are switched off must never start switched on.
  if (!merged.features.pinyin) merged.defaults.showPinyin = false;
  if (!merged.features.zhuyin) merged.defaults.showZhuyin = false;
  if (!merged.features.toneColors) merged.defaults.toneColors = false;
  if (!merged.features.definitions) merged.defaults.defsInline = false;
  if (!merged.features.fontSize) merged.defaults.fontScale = 1;
  if (!merged.features.charSize) merged.defaults.charSize = 1;
  if (!merged.features.darkMode) merged.defaults.dark = false;
  if (merged.defaults.primaryLang !== 'en' && merged.defaults.primaryLang !== 'zh') {
    merged.defaults.primaryLang = 'en';
  }
  return merged;
}

export const brand: BrandConfig = mergeBrand(BRAND_OVERRIDE);

/** localStorage key namespaced by brand id, so white-labels don't collide. */
export function brandStorageKey(name: string): string {
  return `${brand.id}:${name}`;
}

/** Reveal modes offered by this brand, in toolbar order. */
export function brandModes(): (keyof Reveal)[] {
  return (['words', 'sentences', 'paragraphs', 'full'] as const).filter(
    (mode) => brand.features[mode],
  );
}

/** Apply brand theme colors + document title. Call on mount and on dark toggle. */
export function applyBrand(dark: boolean): void {
  const root = document.documentElement;
  root.style.setProperty(
    '--paper',
    dark ? brand.theme.paperDark : brand.theme.paper,
  );
  root.style.setProperty('--ink', brand.theme.ink);
  root.style.setProperty('--verm', brand.theme.accent);
  root.style.setProperty('--verm-soft', brand.theme.accentSoft);
  document.title = brand.texts.documentTitle;
}
