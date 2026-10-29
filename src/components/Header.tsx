import { brand } from '../brand';
import type { PrimaryLang } from './Reader';

const ROUND_ICON_BTN =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper)] p-0 leading-none hover:bg-[var(--line)]';

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-3.5 shrink-0"
      fill="none"
    >
      <path
        d={direction === 'left' ? 'M10 4 6 8l4 4' : 'M6 4l4 4-4 4'}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none">
      <path
        d="M3 4.5h10M3 8h10M3 11.5h10"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ThemeIcon({ dark }: { dark: boolean }) {
  if (dark) {
    return (
      <svg aria-hidden viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none">
        <path
          d="M8 2.5a5.5 5.5 0 1 0 5.5 5.5 4.25 4.25 0 0 1-5.5-5.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none">
      <circle cx="8" cy="8" r="2.75" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 1.75v1M8 13.25v1M1.75 8h1M13.25 8h1M3.46 3.46l.7.7M11.84 11.84l.7.7M3.46 12.54l.7-.7M11.84 4.16l.7-.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface Props {
  onImport: () => void;
  primaryLang: PrimaryLang;
  onPrimaryLang: (v: PrimaryLang) => void;
  fontScale: number;
  onFontScale: (v: number) => void;
  dark: boolean;
  onToggleDark: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  navCollapsed: boolean;
  onToggleNav: () => void;
  onOpenNav: () => void;
  onOpenTools: () => void;
}

export function Header({
  onImport,
  primaryLang,
  onPrimaryLang,
  fontScale,
  onFontScale,
  dark,
  onToggleDark,
  sidebarCollapsed,
  onToggleSidebar,
  navCollapsed,
  onToggleNav,
  onOpenNav,
  onOpenTools,
}: Props) {
  return (
    <header
      className="sticky top-0 z-30 flex h-[64px] items-center justify-between border-b border-[var(--line)] bg-[var(--glass)] px-4 md:px-6 backdrop-blur-xl"
      style={{ paddingTop: 'var(--safe-area-inset-top)' }}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Toggle contents panel"
          aria-expanded={!navCollapsed}
          onClick={onToggleNav}
          className={`hidden lg:flex ${ROUND_ICON_BTN}`}
        >
          <ChevronIcon direction={navCollapsed ? 'right' : 'left'} />
        </button>
        <button
          type="button"
          aria-label="Open contents"
          onClick={onOpenNav}
          className={`lg:hidden ${ROUND_ICON_BTN}`}
        >
          <MenuIcon />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-[10px] bg-[var(--ink)] text-[var(--paper)] flex items-center justify-center font-bold serif-display text-[14px] tracking-tight">
            {brand.texts.logoGlyph}
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="serif-display font-semibold text-[17px] leading-tight tracking-tight">
              {brand.texts.appName}{' '}
              <span className="font-normal text-[var(--ink-mute)]">
                {brand.texts.appNameZh}
              </span>
            </div>
            <div className="text-[10px] leading-none tracking-[0.18em] uppercase text-[var(--ink-mute)]">
              {brand.texts.tagline}
            </div>
          </div>
        </div>
        {brand.features.import && (
          <>
            <div className="hidden md:block h-5 w-px bg-[var(--line)] mx-2" />
            <button
              type="button"
              onClick={onImport}
              className="hidden md:inline-flex ml-2 text-[11px] tracking-wide uppercase border border-dashed border-[var(--line)] rounded-full px-3 py-1 hover:border-[var(--verm)] hover:text-[var(--verm)] transition"
            >
              Import Custom
            </button>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div
          role="group"
          aria-label="Reading direction: language shown first, language revealed"
          className="flex items-center gap-0.5 rounded-full border border-[var(--line)] p-1 bg-[var(--paper)]"
        >
          <button
            type="button"
            aria-pressed={primaryLang === 'en'}
            title="Read English, reveal Chinese"
            onClick={() => onPrimaryLang('en')}
            className={`rounded-full px-2 py-1 text-[11px] tracking-wide transition ${primaryLang === 'en' ? 'bg-[var(--ink)] text-[var(--paper)]' : 'hover:bg-[var(--line)]'}`}
          >
            EN<span aria-hidden="true"> → </span>
            <span className="serif-sc">中</span>
          </button>
          <button
            type="button"
            aria-pressed={primaryLang === 'zh'}
            title="Read Chinese, reveal English"
            onClick={() => onPrimaryLang('zh')}
            className={`rounded-full px-2 py-1 text-[11px] tracking-wide transition ${primaryLang === 'zh' ? 'bg-[var(--ink)] text-[var(--paper)]' : 'hover:bg-[var(--line)]'}`}
          >
            <span className="serif-sc">中</span>
            <span aria-hidden="true"> → </span>EN
          </button>
        </div>
        {brand.features.fontSize && (
        <div className="hidden md:flex items-center gap-1 rounded-full border border-[var(--line)] p-1 bg-[var(--paper)]">
          <span className="px-2 text-[11px] tracking-wide">Aa</span>
          <button
            type="button"
            onClick={() => onFontScale(Math.max(0.85, fontScale - 0.05))}
            className="h-6 w-6 rounded-full hover:bg-[var(--line)] flex items-center justify-center text-[14px]"
          >
            −
          </button>
          <div className="w-px h-4 bg-[var(--line)]" />
          <button
            type="button"
            onClick={() => onFontScale(Math.min(1.35, fontScale + 0.05))}
            className="h-6 w-6 rounded-full hover:bg-[var(--line)] flex items-center justify-center text-[14px]"
          >
            +
          </button>
        </div>
        )}
        {brand.features.darkMode && (
        <button
          type="button"
          onClick={onToggleDark}
          className={`${ROUND_ICON_BTN} transition`}
        >
          <ThemeIcon dark={dark} />
        </button>
        )}
        <button
          type="button"
          aria-label="Toggle tools panel"
          aria-expanded={!sidebarCollapsed}
          onClick={onToggleSidebar}
          className={`hidden lg:flex ${ROUND_ICON_BTN}`}
        >
          <ChevronIcon direction={sidebarCollapsed ? 'left' : 'right'} />
        </button>
        <button
          type="button"
          aria-label="Open tools"
          onClick={onOpenTools}
          className="lg:hidden flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] p-0 leading-none text-[var(--paper)]"
        >
          <MenuIcon />
        </button>
      </div>
    </header>
  );
}
