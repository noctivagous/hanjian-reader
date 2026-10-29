// Generic XLIFF reader for public-domain parallel texts.
//
// Unlike scripts/xliff-docs.mjs (which enforces the Tao Te Ching's 81-chapter
// contract at build time), this module is structural: any number of <file>,
// <group>, and <trans-unit>/<segment> elements. It runs both in Node (tests,
// generators) and in the browser (runtime loading of public/texts/*.xlf),
// so it must stay free of Node and DOM APIs: fast-xml-parser does the lexing.
//
// Contract (documented further in public/texts/README.md):
//   <file>            one text part; groups across files concatenate.
//   <group>           one section. Optional resname="English title|Chinese
//                     title" (split on the first |); otherwise untitled.
//                     A nested <group> inside a section is one paragraph.
//   <trans-unit> (1.2)
//   <segment> (2.0)   one sentence: <source> = Chinese, <target> = English.
//                     Both sides must be non-empty (throws otherwise).
//                     An optional <note> starting with "translator:" overrides
//                     the translation credit for that unit.

import { XMLParser } from 'fast-xml-parser';
import type { Doc, WordAlign } from '../data/types';

export interface ParallelSentenceUnit {
  /** Stable unit id (trans-unit id when present, else generated). */
  id: string;
  zh: string;
  en: string;
  /** Per-unit credit from a "translator:" note; null inherits the default. */
  translator: string | null;
}

export interface ParallelSection {
  id: string;
  titleEn: string;
  titleZh: string;
  /** Each paragraph is a list of sentence units (usually one). */
  paragraphs: ParallelSentenceUnit[][];
}

export interface ParallelDocMeta {
  id: string;
  titleEn: string;
  titleZh: string;
  author: string;
  sourceLanguage: string;
  script?: 'simplified' | 'traditional';
  license?: string;
  /** Credit applied to every unit without its own "translator:" note. */
  translator?: string;
}

/** Authored English range alignments, keyed by XLIFF trans-unit ID. */
export type ParallelWordAlignments = Record<string, WordAlign[]>;

interface Node {
  kind: string;
  attrs: Record<string, string>;
  children: Node[];
  text: string;
}

const STRUCTURAL = new Set(['file', 'group', 'trans-unit', 'unit', 'segment']);

const localName = (tag: string): string =>
  tag.split(':').pop()?.toLowerCase() ?? tag.toLowerCase();

const squeeze = (s: string): string => s.replace(/\s+/g, ' ').trim();

function asArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  if (value === '' || value === null || value === undefined) return [];
  return [{ '#text': String(value) }];
}

/** Mixed content (text + inline elements) in document order, tags dropped. */
function textOf(entries: Record<string, unknown>[]): string {
  let out = '';
  for (const entry of entries) {
    if (typeof entry !== 'object' || entry === null) continue;
    const key = Object.keys(entry)[0];
    if (key === undefined) continue;
    if (key === '#text') out += String(entry[key]);
    else out += textOf(asArray(entry[key]));
  }
  return out;
}

function toNode(entries: Record<string, unknown>[]): Node[] {
  const out: Node[] = [];
  for (const entry of entries) {
    if (typeof entry !== 'object' || entry === null) continue;
    const key = Object.keys(entry)[0];
    if (key === undefined || key === '#text') continue;
    const name = localName(key);
    if (name === ':@' || name === '@') continue;
    const kids = asArray(entry[key]);
    const attrs: Record<string, string> = {};
    const collectAttrs = (obj: unknown): void => {
      if (typeof obj !== 'object' || obj === null) return;
      for (const [ak, av] of Object.entries(obj as Record<string, unknown>)) {
        attrs[String(ak).replace(/^@_/, '')] = String(av);
      }
    };
    // fast-xml-parser (preserveOrder) groups attributes under a ":@"
    // sibling key of the tag; tolerate the array-item form as well.
    collectAttrs((entry as Record<string, unknown>)[':@']);
    const rest: Record<string, unknown>[] = [];
    for (const kid of kids) {
      const k =
        typeof kid === 'object' && kid !== null
          ? Object.keys(kid as Record<string, unknown>)[0]
          : undefined;
      if (k === ':@') {
        collectAttrs((kid as Record<string, unknown>)[k]);
      } else {
        rest.push(kid);
      }
    }
    if (name === 'source' || name === 'target' || name === 'note') {
      out.push({ kind: name, attrs, children: [], text: squeeze(textOf(rest)) });
    } else if (STRUCTURAL.has(name)) {
      out.push({ kind: name, attrs, children: toNode(rest), text: '' });
    } else {
      // Unknown wrappers (xliff, body, …) stay transparent.
      out.push(...toNode(rest));
    }
  }
  return out;
}

const sideText = (unit: Node, side: string): string =>
  unit.children.find((c) => c.kind === side)?.text ?? '';

function unitSentences(container: Node, index: { n: number }): ParallelSentenceUnit[] {
  const out: ParallelSentenceUnit[] = [];
  for (const child of container.children) {
    if (child.kind === 'trans-unit' || child.kind === 'segment') {
      out.push(makeUnit(child, index));
    } else if (child.kind === 'unit') {
      const segs = child.children.filter((c) => c.kind === 'segment');
      if (segs.length > 0) {
        for (const s of segs) out.push(makeUnit(s, index, child.attrs['id']));
      } else {
        out.push(makeUnit(child, index));
      }
    }
  }
  return out;
}

function makeUnit(node: Node, index: { n: number }, fallbackId?: string): ParallelSentenceUnit {
  const zh = sideText(node, 'source');
  const en = sideText(node, 'target');
  if (!zh || !en) {
    throw new Error(
      `unit "${node.attrs['id'] ?? fallbackId ?? `#${index.n + 1}`}" has an empty Chinese or English side (every unit needs non-empty <source> and <target>).`,
    );
  }
  index.n += 1;
  let translator: string | null = null;
  for (const c of node.children) {
    if (c.kind === 'note' && c.text.toLowerCase().startsWith('translator:')) {
      translator = c.text.slice('translator:'.length).trim() || null;
    }
  }
  return {
    id: node.attrs['id'] ?? fallbackId ?? `u${index.n}`,
    zh,
    en,
    translator,
  };
}

function splitTitle(resname: string): { titleEn: string; titleZh: string } {
  const bar = resname.indexOf('|');
  if (bar < 0) return { titleEn: resname.trim(), titleZh: '' };
  return {
    titleEn: resname.slice(0, bar).trim(),
    titleZh: resname.slice(bar + 1).trim(),
  };
}

/**
 * Parse XLIFF 1.2/2.0 into sections of sentence units. Throws Errors on
 * malformed XML, missing <file> elements, or empty translation sides.
 */
export function parseParallelXliff(xml: string, label: string): ParallelSection[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    preserveOrder: true,
    // Keep fragment spacing: textOf() joins mixed-content fragments
    // verbatim and per-node text is normalized at the sentence level.
    trimValues: false,
  });
  let doc: unknown;
  try {
    doc = parser.parse(xml, true);
  } catch (err) {
    throw new Error(`${label}: invalid XML (${(err as Error).message})`);
  }
  const files = toNode(asArray(doc)).filter((n) => n.kind === 'file');
  if (files.length === 0) {
    throw new Error(`${label} contains no <file> elements; not XLIFF?`);
  }
  const sections: ParallelSection[] = [];
  const index = { n: 0 };
  let autoSection = 0;
  for (const file of files) {
    const groups = file.children.filter((c) => c.kind === 'group');
    if (groups.length > 0) {
      groups.forEach((g, gi) => {
        const { titleEn, titleZh } = splitTitle(g.attrs['resname'] ?? '');
        const nested = g.children.filter((c) => c.kind === 'group');
        const paragraphs =
          nested.length > 0
            ? nested.map((p) => unitSentences(p, index))
            : [unitSentences(g, index)];
        sections.push({
          id: g.attrs['id'] ?? `sec${sections.length + 1}-${gi + 1}`,
          titleEn,
          titleZh,
          paragraphs,
        });
      });
    } else {
      autoSection += 1;
      sections.push({
        id: file.attrs['id'] ?? `sec${autoSection}`,
        titleEn: '',
        titleZh: '',
        paragraphs: unitSentences(file, index).map((u) => [u]),
      });
    }
  }
  if (sections.every((s) => s.paragraphs.flat().length === 0)) {
    throw new Error(`${label} contains no translatable units.`);
  }
  return sections;
}

/** Assemble a reader Doc from parsed sections plus manifest metadata. */
export function parallelDocFromSections(
  meta: ParallelDocMeta,
  sections: ParallelSection[],
  alignments: ParallelWordAlignments = {},
): Doc {
  const defaultTranslator = meta.translator ?? '';
  return {
    format: 'hanjian',
    version: 1,
    id: meta.id,
    titleEn: meta.titleEn,
    titleZh: meta.titleZh,
    author: meta.author,
    sourceLanguage: meta.sourceLanguage,
    ...(meta.script ? { script: meta.script } : {}),
    ...(meta.license ? { license: meta.license } : {}),
    sections: sections.map((sec) => {
      const sectionId = `${meta.id}-${sec.id}`;
      let k = 0;
      return {
        id: sectionId,
        titleEn: sec.titleEn,
        titleZh: sec.titleZh,
        paragraphs: sec.paragraphs.map((units, p) => ({
          id: `${sectionId}-p${p + 1}`,
          zh: units.map((u) => u.zh).join(''),
          sentences: units.map((u) => {
            k += 1;
            return {
              id: `${meta.id}-${u.id}`,
              zh: u.zh,
              translations: [
                {
                  id: 'en',
                  language: 'en',
                  label: 'English',
                  translator: u.translator ?? defaultTranslator,
                  text: u.en,
                  words: alignments[u.id] ?? [],
                },
              ],
            };
          }),
        })),
      };
    }),
  };
}

/** Parse XLIFF text and assemble a reader Doc in one step. */
export function parallelDocFromXml(
  meta: ParallelDocMeta,
  xml: string,
  label: string,
  alignments?: ParallelWordAlignments,
): Doc {
  return parallelDocFromSections(meta, parseParallelXliff(xml, label), alignments);
}
