// Hover word proposals: Jiayan spans matched to English phrases via
// translation glossary + CC-CEDICT (Courtyard Rain — no zh, no underline).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiayan } from '../src/lib/jiayan.ts';
import { englishLabel } from '../src/lib/tokenize.ts';

const HAN = /\p{Script=Han}/u;
const SKIP_GLOSS =
  /^(surname |Kangxi |variant of |old variant |abbr\. |see |used in |\()/i;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadCedictLookup() {
  const file = JSON.parse(
    readFileSync(join(root, 'public', 'dict', 'cedict.json'), 'utf8'),
  );
  return (text) => {
    const direct = file.entries[text];
    if (direct) {
      return direct.map(([pinyin, def]) => ({ pinyin, def }));
    }
    const simp = file.aliases[text];
    if (!simp || !file.entries[simp]) return undefined;
    return file.entries[simp].map(([pinyin, def]) => ({ pinyin, def }));
  };
}

function stripTone(pinyin) {
  return pinyin
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

function pinyinCandidates(pinyin) {
  const out = new Set();
  for (const raw of pinyin.split(/\s+/)) {
    const bare = stripTone(raw);
    if (bare.length < 2) continue;
    out.add(bare);
    out.add(bare[0].toUpperCase() + bare.slice(1));
  }
  return [...out];
}

function glossCandidates(zh, recs, glossary) {
  const candidates = new Set();
  for (const g of glossary[zh] ?? []) candidates.add(g);

  if (recs?.length) {
    const senses = recs.map((r) => ({ pinyin: r.pinyin, def: r.def }));
    const w = { en: '', zh, pinyin: '', def: '', senses };
    if (senses.length === 1) {
      w.pinyin = senses[0].pinyin;
      w.def = senses[0].def;
      const [first] = senses[0].def.split('; ');
      w.en = first || '';
    }
    const label = englishLabel(w);
    if (label && label !== zh) candidates.add(label);

    for (const rec of recs) {
      for (const part of rec.def.split('; ')) {
        let g = part.trim();
        g = g.replace(/^\([^)]*\)\s*/, '').trim();
        if (!g || SKIP_GLOSS.test(g)) continue;
        const chunk = g.split(',')[0].trim();
        if (chunk) candidates.add(chunk);
        for (const p of pinyinCandidates(rec.pinyin)) candidates.add(p);
      }
    }
  }

  return [...candidates].filter((c) => c.length >= 2);
}

export function findWord(en, phrase, from = 0) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b${escaped}\\b`, 'gi');
  re.lastIndex = from;
  const m = re.exec(en);
  if (!m) return null;
  return { start: m.index, end: m.index + m[0].length, text: m[0] };
}

function overlaps(start, end, used) {
  return used.some(([s, e]) => start < e && end > s);
}

/**
 * Propose { en, zh } pairs (no offsets) for override storage.
 * @param {Record<string, string[]>} glossary
 */
export function proposeHoverWords(zh, en, segmentZh, dictLookup, glossary) {
  const tokens = segmentZh(zh).filter((t) => HAN.test(t));
  if (!tokens.length) return [];

  const byPos = [...tokens].sort(
    (a, b) => b.length - a.length || zh.indexOf(a) - zh.indexOf(b),
  );
  const used = [];
  const out = [];

  for (const token of byPos) {
    const recs = dictLookup(token);
    const candidates = glossCandidates(token, recs, glossary).sort(
      (a, b) => b.length - a.length,
    );
    if (!candidates.length) continue;

    let hit = null;
    for (const phrase of candidates) {
      for (let from = 0; from < en.length; ) {
        const m = findWord(en, phrase, from);
        if (!m) break;
        if (!overlaps(m.start, m.end, used)) {
          hit = m;
          break;
        }
        from = m.start + 1;
      }
      if (hit) break;
    }
    if (!hit) continue;

    used.push([hit.start, hit.end]);
    out.push({ en: hit.text, zh: token, pinyin: '', def: '' });
  }

  return out.sort(
    (a, b) => en.indexOf(a.en) - en.indexOf(b.en) || a.en.localeCompare(b.en),
  );
}

/** Resolve authored { en, zh } rows to character offsets in the English sentence. */
export function locateAuthoredWords(en, handWords) {
  const used = [];
  const out = [];
  const sorted = [...handWords].filter((w) => w?.zh && w?.en);

  for (const w of sorted) {
    let from = 0;
    let hit = null;
    while (from < en.length) {
      const m = findWord(en, w.en, from);
      if (!m) break;
      if (!overlaps(m.start, m.end, used)) {
        hit = m;
        break;
      }
      from = m.start + 1;
    }
    if (!hit) continue;
    used.push([hit.start, hit.end]);
    out.push({
      en: hit.text,
      zh: w.zh,
      pinyin: w.pinyin ?? '',
      def: w.def ?? '',
      enStart: hit.start,
      enEnd: hit.end,
    });
  }

  return out.sort((a, b) => a.enStart - b.enStart || a.enEnd - b.enEnd);
}

/** @deprecated use proposeHoverWords + locateAuthoredWords */
export function sentenceAlignments(zh, en, segmentZh, dictLookup, glossary = {}) {
  const proposed = proposeHoverWords(zh, en, segmentZh, dictLookup, glossary);
  return locateAuthoredWords(en, proposed);
}

let jiayanPromise;
let dictLookupPromise;

export function loadTaoSegmenter() {
  if (!jiayanPromise) {
    jiayanPromise = Promise.resolve().then(() => {
      const file = JSON.parse(
        readFileSync(join(root, 'public', 'dict', 'jiayan.json'), 'utf8'),
      );
      return createJiayan(file.words).segment;
    });
  }
  return jiayanPromise;
}

export function loadTaoDictLookup() {
  if (!dictLookupPromise) {
    dictLookupPromise = Promise.resolve(loadCedictLookup());
  }
  return dictLookupPromise;
}
