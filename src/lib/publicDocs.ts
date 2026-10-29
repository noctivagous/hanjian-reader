// Runtime loader for public-domain parallel texts shipped as XLIFF in
// public/texts/ (see public/texts/README.md and scripts/
// build-three-character-classic.mjs). The manifest lists each text; every
// entry's XLIFF is fetched, parsed with the shared generic reader
// (src/lib/xliffParallel.ts), and converted to a Doc. Failures are silent
// by design: the app runs with its bundled docs when a public text is
// missing or malformed (e.g. opened from file:// with no fetch).

import type { Doc } from '../data/types';
import { parallelDocFromXml, type ParallelDocMeta } from './xliffParallel';

export interface PublicTextEntry extends ParallelDocMeta {
  /** XLIFF filename inside public/texts/. */
  file: string;
}

interface PublicManifest {
  texts?: PublicTextEntry[];
}

export async function loadPublicDocs(): Promise<Doc[]> {
  const base = import.meta.env.BASE_URL;
  let manifest: PublicManifest;
  try {
    const res = await fetch(`${base}texts/manifest.json`);
    if (!res.ok) return [];
    manifest = (await res.json()) as PublicManifest;
  } catch {
    return [];
  }
  if (!Array.isArray(manifest.texts)) return [];
  const docs: Doc[] = [];
  for (const entry of manifest.texts) {
    if (!entry || typeof entry.id !== 'string' || typeof entry.file !== 'string') {
      continue;
    }
    try {
      const res = await fetch(`${base}texts/${entry.file}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      docs.push(parallelDocFromXml(entry, await res.text(), entry.file));
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn(`[publicDocs] ignoring ${entry.file} (${err})`);
      }
    }
  }
  return docs;
}
