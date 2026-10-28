import type { PrimaryLang } from './Reader';

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
          className="hidden lg:flex h-8 w-8 rounded-full border border-[var(--line)] bg-[var(--paper)] items-center justify-center hover:bg-[var(--line)]"
        >
          {navCollapsed ? '▶' : '◀'}
        </button>
        <button
          type="button"
          aria-label="Open contents"
          onClick={onOpenNav}
          className="lg:hidden h-8 w-8 rounded-full border border-[var(--line)] bg-[var(--paper)] flex items-center justify-center"
        >
          ☰
        </button>
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-[10px] bg-[var(--ink)] text-[var(--paper)] flex items-center justify-center font-bold serif-display text-[14px] tracking-tight">
            涵
          </div>
          <div className="leading-none">
            <div className="serif-display font-semibold text-[17px] tracking-tight -mb-0.5">
              HanJian{' '}
              <span className="font-normal text-[var(--ink-mute)]">涵简</span>
            </div>
            <div className="text-[10px] tracking-[0.18em] uppercase text-[var(--ink-mute)]">
              Parallel Reader
            </div>
          </div>
        </div>
        <div className="hidden md:block h-5 w-px bg-[var(--line)] mx-2" />
        <button
          type="button"
          onClick={onImport}
          className="hidden md:inline-flex ml-2 text-[11px] tracking-wide uppercase border border-dashed border-[var(--line)] rounded-full px-3 py-1 hover:border-[var(--verm)] hover:text-[var(--verm)] transition"
        >
          Import Custom
        </button>
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
        <button
          type="button"
          onClick={onToggleDark}
          className="h-8 w-8 rounded-full border border-[var(--line)] bg-[var(--paper)] flex items-center justify-center text-[14px] hover:bg-[var(--line)] transition"
        >
          {dark ? '☾' : '☀'}
        </button>
        <button
          type="button"
          aria-label="Toggle tools panel"
          aria-expanded={!sidebarCollapsed}
          onClick={onToggleSidebar}
          className="hidden lg:flex h-8 w-8 rounded-full border border-[var(--line)] bg-[var(--paper)] items-center justify-center hover:bg-[var(--line)]"
        >
          {sidebarCollapsed ? '◀' : '▶'}
        </button>
        <button
          type="button"
          aria-label="Open tools"
          onClick={onOpenTools}
          className="lg:hidden h-8 w-8 rounded-full bg-[var(--ink)] text-[var(--paper)] flex items-center justify-center"
        >
          ≡
        </button>
      </div>
    </header>
  );
}
