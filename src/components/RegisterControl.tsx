import type { LanguageRegister } from '../data/types';
import {
  REGISTER_SOURCE_BLURB,
  type RegisterSource,
} from '../lib/languageRegister';

const LABELS: Record<LanguageRegister, string> = {
  classical: 'Classical',
  mandarin: 'Mandarin',
};

interface Props {
  idPrefix: string;
  /** Effective register after resolution (override → declared → detected). */
  register: LanguageRegister;
  /** How the effective register was resolved. */
  source: RegisterSource;
  /** The user's per-document override, when one is set. */
  override?: LanguageRegister;
  /** Choosing Auto (null) clears the override. */
  onChange: (override: LanguageRegister | null) => void;
}

/**
 * Register picker, styled after the translator picker: a compact
 * select that always shows the effective register (inside the Auto
 * option when no override is set) and names its source in the title.
 */
export function RegisterControl({
  idPrefix,
  register,
  source,
  override,
  onChange,
}: Props) {
  const id = `${idPrefix}-register-select`;
  return (
    <div
      className="relative mt-2"
      title={`Language register: ${LABELS[register]} — ${REGISTER_SOURCE_BLURB[source]}`}
    >
      <label className="sr-only" htmlFor={id}>
        Register
      </label>
      <select
        id={id}
        value={override ?? 'auto'}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === 'auto' ? null : (v as LanguageRegister));
        }}
        className="w-full appearance-none rounded-full border border-[var(--line)] bg-[var(--paper)] py-1.5 pl-3 pr-8 text-[12px] outline-none transition hover:border-[var(--ink-mute)]"
      >
        <option value="auto">Register: Auto ({LABELS[register]})</option>
        <option value="classical">Register: Classical</option>
        <option value="mandarin">Register: Mandarin</option>
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px]">
        ▼
      </span>
    </div>
  );
}
