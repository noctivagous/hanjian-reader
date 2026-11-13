import type { Doc } from '../data/types';

/**
 * The .hanjian.json round-trip: a document serializes to JSON and the
 * same JSON imports back as a custom doc. The internal Doc model IS
 * the file format (format: 'hanjian', version: 1) — no conversion
 * layer, so export and re-import cannot drift apart.
 */

export function isHanjianDoc(value: unknown): value is Doc {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Doc).format === 'hanjian' &&
    (value as Doc).version === 1 &&
    typeof (value as Doc).id === 'string' &&
    Array.isArray((value as Doc).sections)
  );
}

/** Parse a .hanjian.json payload; null when it is not a valid document. */
export function parseHanjianDocJson(text: string): Doc | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return isHanjianDoc(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function serializeDoc(doc: Doc): string {
  return JSON.stringify(doc, null, 2);
}

export function docFileName(doc: Doc): string {
  const safe = doc.id.replace(/[^a-zA-Z0-9_-]+/g, '-');
  return `${safe}.hanjian.json`;
}

/** Trigger a browser download of the document as .hanjian.json. */
export function downloadDoc(doc: Doc): void {
  const blob = new Blob([serializeDoc(doc)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = docFileName(doc);
  a.click();
  URL.revokeObjectURL(url);
}
