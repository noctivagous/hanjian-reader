import type { AlignRole } from '../data/types';

export function AlignRoleToggle({
  value,
  onChange,
}: {
  value: AlignRole;
  onChange: (role: AlignRole) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Word alignment: translation spans or gloss chips"
      className="flex items-center gap-0.5 rounded-full border border-[var(--line)] p-1 bg-[var(--paper)]"
    >
      <button
        type="button"
        aria-pressed={value === 'span'}
        title="Underline matching ranges in the translation"
        onClick={() => onChange('span')}
        className={`rounded-full px-2 py-1 text-[11px] tracking-wide transition ${value === 'span' ? 'bg-[var(--ink)] text-[var(--paper)]' : 'hover:bg-[var(--line)]'}`}
      >
        Span
      </button>
      <button
        type="button"
        aria-pressed={value === 'gloss'}
        title="Show lexical gloss chips under the sentence"
        onClick={() => onChange('gloss')}
        className={`rounded-full px-2 py-1 text-[11px] tracking-wide transition ${value === 'gloss' ? 'bg-[var(--ink)] text-[var(--paper)]' : 'hover:bg-[var(--line)]'}`}
      >
        Gloss
      </button>
    </div>
  );
}
