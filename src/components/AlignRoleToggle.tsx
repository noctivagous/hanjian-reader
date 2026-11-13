import type { UnderlineMode } from '../data/types';

const OPTIONS: { value: UnderlineMode; label: string; title: string }[] = [
  {
    value: 'both',
    label: 'Both',
    title:
      'Phrase spans and word glosses underlined together, with translator-only words in dotted gray',
  },
  {
    value: 'span',
    label: 'Span',
    title: 'Underline matching ranges in the translation',
  },
  {
    value: 'gloss',
    label: 'Gloss',
    title: 'Underline lexical glosses (and translator-only words in gray)',
  },
];

export function AlignRoleToggle({
  value,
  onChange,
}: {
  value: UnderlineMode;
  onChange: (mode: UnderlineMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Word alignment underlines: both layers, spans only, or glosses only"
      className="flex items-center gap-0.5 rounded-full border border-[var(--line)] p-1 bg-[var(--paper)]"
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          title={opt.title}
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-2 py-1 text-[11px] tracking-wide transition ${value === opt.value ? 'bg-[var(--ink)] text-[var(--paper)]' : 'hover:bg-[var(--line)]'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
