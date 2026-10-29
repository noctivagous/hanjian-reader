// Runtime loader for public-domain parallel texts shipped as XLIFF in
// public/texts/ (see public/texts/README.md and scripts/
// build-three-character-classic.mjs). The manifest lists each text; every
// entry's XLIFF is fetched, parsed with the shared generic reader
// (src/lib/xliffParallel.ts), and converted to a Doc. Failures are silent
// by design: the app runs with its bundled docs when a public text is
// missing or malformed (e.g. opened from file:// with no fetch).

import type { Doc, WordAlign } from '../data/types';
import {
  parallelDocFromXml,
  type ParallelDocMeta,
  type ParallelWordAlignments,
} from './xliffParallel';

export interface PublicTextEntry extends ParallelDocMeta {
  /** XLIFF filename inside public/texts/. */
  file: string;
  /** Optional authored English–Chinese range alignments. */
  alignmentFile?: string;
}

interface PublicManifest {
  texts?: PublicTextEntry[];
}

function asAlignments(value: unknown): ParallelWordAlignments {
  if (!value || typeof value !== 'object') throw new Error('invalid alignment file');
  const units =
    'units' in value && value.units && typeof value.units === 'object'
      ? value.units
      : value;
  const out: ParallelWordAlignments = {};
  for (const [id, items] of Object.entries(units)) {
    if (!Array.isArray(items)) throw new Error(`alignment ${id} is not an array`);
    const words: WordAlign[] = [];
    for (const item of items) {
      if (
        !item ||
        typeof item !== 'object' ||
        typeof (item as WordAlign).en !== 'string' ||
        typeof (item as WordAlign).zh !== 'string' ||
        !Number.isInteger((item as WordAlign).enStart) ||
        !Number.isInteger((item as WordAlign).enEnd)
      ) {
        throw new Error(`alignment ${id} has an invalid word`);
      }
      words.push(item as WordAlign);
    }
    out[id] = words;
  }
  return out;
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
      const [textRes, alignmentRes] = await Promise.all([
        fetch(`${base}texts/${entry.file}`),
        entry.alignmentFile
          ? fetch(`${base}texts/${entry.alignmentFile}`)
          : Promise.resolve(null),
      ]);
      if (!textRes.ok) throw new Error(`HTTP ${textRes.status}`);
      if (alignmentRes && !alignmentRes.ok) {
        throw new Error(`alignment HTTP ${alignmentRes.status}`);
      }
      const alignments = alignmentRes
        ? asAlignments(await alignmentRes.json())
        : undefined;
      docs.push(parallelDocFromXml(entry, await textRes.text(), entry.file, alignments));
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn(`[publicDocs] ignoring ${entry.file} (${err})`);
      }
    }
  }
  return docs;
}
