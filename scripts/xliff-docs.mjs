// Pure XLIFF reader (1.2 and 2.0) for the local-only book generator.
// Parsed with fast-xml-parser; this module does no I/O and throws Errors
// so it stays testable — the CLI wrapper in build-tao-te-ching.mjs turns
// them into loud failures.
//
// Contract: 81 <file> elements as chapters, or 1 <file> with 81 <group>
// (or 81 <unit>) chapters. Inside a chapter, <group> = paragraph (absent =
// single paragraph); <trans-unit> (1.2) or <segment> (2.0) = sentence,
// with <source> = Chinese and <target> = English.

import { XMLParser } from 'fast-xml-parser';

const STRUCT = new Set(['file', 'group', 'trans-unit', 'unit', 'segment']);

/** Strip an optional namespace prefix: `xlf:file` -> `file`. */
const local = (tag) => tag.split(':').pop().toLowerCase();

const squeeze = (s) => s.replace(/\s+/g, ' ').trim();

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === '' || value === null || value === undefined) return [];
  return [{ '#text': String(value) }];
}

/** Mixed content (text + inline elements) in document order, tags dropped. */
function textOf(entries) {
  let out = '';
  for (const entry of asArray(entries)) {
    if (typeof entry !== 'object' || entry === null) continue;
    const key = Object.keys(entry)[0];
    if (key === undefined) continue;
    if (key === '#text') out += entry[key];
    else out += textOf(asArray(entry[key]));
  }
  return out;
}

/** Structural nodes; unknown wrappers (xliff, body, …) stay transparent. */
function convert(entries) {
  const out = [];
  for (const entry of asArray(entries)) {
    if (typeof entry !== 'object' || entry === null) continue;
    const key = Object.keys(entry)[0];
    if (key === undefined || key === '#text') continue;
    const name = local(key);
    if (name === 'source' || name === 'target') {
      out.push({ kind: name, children: [], text: squeeze(textOf(asArray(entry[key]))) });
    } else if (STRUCT.has(name)) {
      out.push({ kind: name, children: convert(asArray(entry[key])) });
    } else {
      out.push(...convert(asArray(entry[key])));
    }
  }
  return out;
}

export function parseXliffFiles(xml, label) {
  const parser = new XMLParser({
    ignoreAttributes: true,
    preserveOrder: true,
    // Keep fragment spacing: textOf() joins mixed-content fragments
    // verbatim and squeeze() normalizes whitespace at the sentence level.
    trimValues: false,
  });
  let doc;
  try {
    doc = parser.parse(xml, true);
  } catch (err) {
    throw new Error(`${label}: invalid XML (${err.message})`);
  }
  const files = convert(doc).filter((n) => n.kind === 'file');
  if (files.length === 0) {
    throw new Error(`${label} contains no <file> elements; not XLIFF?`);
  }
  return files;
}

const unitText = (unit, side) =>
  unit.children.find((c) => c.kind === side)?.text ?? '';

function sentencesOf(container) {
  // Explicit segmentation: each segment (2.0) or trans-unit/unit (1.2)
  // is one sentence, in document order.
  const out = [];
  for (const child of container.children) {
    if (child.kind === 'segment' || child.kind === 'trans-unit') {
      out.push({ zh: unitText(child, 'source'), en: unitText(child, 'target') });
    } else if (child.kind === 'unit') {
      const segs = child.children.filter((c) => c.kind === 'segment');
      if (segs.length > 0) {
        for (const s of segs) {
          out.push({ zh: unitText(s, 'source'), en: unitText(s, 'target') });
        }
      } else {
        out.push({ zh: unitText(child, 'source'), en: unitText(child, 'target') });
      }
    }
  }
  return out;
}

/**
 * Chapters as arrays of paragraphs; each paragraph is an array of
 * { zh, en } sentences. Throws on chapter-count or empty-side violations.
 */
export function chaptersFromXliff(files, label) {
  let chapters = files;
  if (files.length === 1) {
    const groups = files[0].children.filter((c) => c.kind === 'group');
    const units = files[0].children.filter(
      (c) => c.kind === 'unit' || c.kind === 'trans-unit',
    );
    if (groups.length === 81) chapters = groups;
    else if (units.length === 81) chapters = units;
    else {
      throw new Error(
        `${label} has 1 <file> with ${groups.length} <group>s and ${units.length} <unit>s; ` +
          `expected 81 <file>s, or 1 <file> with 81 <group> or 81 <unit> chapters.`,
      );
    }
  } else if (files.length !== 81) {
    throw new Error(
      `${label} has ${files.length} <file>s; expected 81 chapter <file>s, ` +
        `or 1 <file> with 81 <group> or 81 <unit> chapters.`,
    );
  }
  return chapters.map((ch, i) => {
    const n = i + 1;
    const groups = ch.children.filter((c) => c.kind === 'group');
    const paraNodes = groups.length > 0 ? groups : [ch];
    const paras = paraNodes.map((g) => {
      const nested = g.children.filter((c) => c.kind === 'group');
      return nested.length > 0 ? nested.flatMap(sentencesOf) : sentencesOf(g);
    });
    const flat = paras.flat();
    if (flat.length === 0 || flat.some((s) => !s.zh || !s.en)) {
      throw new Error(
        `chapter ${n} has an empty Chinese or English side (every unit needs non-empty <source> and <target>).`,
      );
    }
    return paras;
  });
}

export function xliffChapters(xml, label) {
  return chaptersFromXliff(parseXliffFiles(xml, label), label);
}
