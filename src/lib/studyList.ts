/**
 * The study list: characters the reader saved from the inspector to
 * learn. Deliberately minimal storage — a character and when it was
 * added; readings and meanings are resolved at display time through the
 * same dictionary path the inspector uses, so the list never carries a
 * stale copy of dictionary data.
 *
 * Pure functions only (storage lives in App, keyed by
 * brandStorageKey('studyList')), so the behaviour is unit-testable
 * without a DOM.
 */
export interface StudyItem {
  char: string;
  addedAt: number;
}

/** Parse a stored JSON payload, tolerating anything malformed. */
export function parseStudyList(raw: string | null): StudyItem[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const seen = new Set<string>();
  const items: StudyItem[] = [];
  for (const entry of parsed) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { char, addedAt } = entry as { char?: unknown; addedAt?: unknown };
    if (typeof char !== 'string' || char.length === 0 || seen.has(char)) continue;
    seen.add(char);
    items.push({
      char,
      addedAt: typeof addedAt === 'number' && Number.isFinite(addedAt) ? addedAt : 0,
    });
  }
  return items;
}

export function serializeStudyList(items: StudyItem[]): string {
  return JSON.stringify(items);
}

export function studyListHas(items: StudyItem[], char: string): boolean {
  return items.some((i) => i.char === char);
}

/** Add a character; returns the (possibly unchanged) list and whether it changed. */
export function addStudyItem(
  items: StudyItem[],
  char: string,
  now: number,
): { items: StudyItem[]; added: boolean } {
  if (!char || studyListHas(items, char)) return { items, added: false };
  return { items: [...items, { char, addedAt: now }], added: true };
}

export function removeStudyItem(items: StudyItem[], char: string): StudyItem[] {
  return items.filter((i) => i.char !== char);
}
