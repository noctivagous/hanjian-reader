/** Resolve curated { en, zh } glosses to non-overlapping spans in the unit English. */

const HAN = /\p{Script=Han}/u;

function hanCount(zh) {
  let n = 0;
  for (const ch of zh) if (HAN.test(ch)) n += 1;
  return n;
}

function overlaps(start, end, used) {
  return used.some(([s, e]) => start < e && end > s);
}

const EN_BOUNDARY = /[\s—–\-,;:!?()[\]{}"']/u;

function wordStarts(en) {
  const starts = [0];
  for (let i = 1; i < en.length; i++) {
    if (EN_BOUNDARY.test(en[i - 1]) && !EN_BOUNDARY.test(en[i])) starts.push(i);
  }
  return starts;
}

function expandSpanLeft(en, start, end, extraWords) {
  const starts = wordStarts(en);
  let wi = starts.findIndex((s) => s === start);
  if (wi < 0) {
    wi = starts.findIndex((s) => s > start);
    if (wi > 0) wi -= 1;
  }
  if (wi < 0) return { start, end, text: en.slice(start, end) };

  const newWi = Math.max(0, wi - extraWords);
  if (newWi > 0) {
    const prev = en[starts[newWi] - 1];
    if (prev && /[.,;:!?]/.test(prev)) {
      const afterPunct = starts.find((s) => s > starts[newWi] && /[.,;:!?]/.test(en[s - 1]));
      if (afterPunct !== undefined) {
        const w = starts.indexOf(afterPunct);
        if (w >= 0) {
          const s = starts[Math.min(w + extraWords, wi)];
          return { start: s, end, text: en.slice(s, end) };
        }
      }
    }
  }
  let s = starts[newWi];
  const comma = en.slice(s, start).lastIndexOf(',');
  if (comma >= 0) {
    s += comma + 1;
    while (s < en.length && en[s] === ' ') s += 1;
  }
  return { start: s, end, text: en.slice(s, end) };
}

function pushSpanAndGloss(words, en, pair, hit) {
  words.push({
    en: hit.text,
    zh: pair.zh,
    pinyin: '',
    def: '',
    role: 'span',
    enStart: hit.start,
    enEnd: hit.end,
  });
  const glosses = pair.glosses ?? [
    { en: pair.gloss ?? pair.en, zh: pair.zh },
  ];
  for (const gloss of glosses) {
    if (!gloss.en || !gloss.zh) continue;
    const gStart = en.indexOf(gloss.en, hit.start);
    if (gStart < 0 || gStart + gloss.en.length > hit.end) continue;
    words.push({
      en: gloss.en,
      zh: gloss.zh,
      pinyin: '',
      def: '',
      role: 'gloss',
      enStart: gStart,
      enEnd: gStart + gloss.en.length,
    });
  }
}

function handSpan(en, pair) {
  const { enStart, enEnd } = pair;
  if (enStart < 0 || enEnd > en.length || enStart >= enEnd) {
    throw new Error(`invalid hand span for "${pair.zh}"`);
  }
  const text = en.slice(enStart, enEnd);
  if (pair.en && text !== pair.en) {
    throw new Error(
      `hand span for "${pair.zh}" is "${text}", expected "${pair.en}"`,
    );
  }
  return { start: enStart, end: enEnd, text: pair.en || text };
}

/**
 * @param {string} en
 * @param {{ en: string; zh: string; gloss?: string; glosses?: { en: string; zh: string }[]; exact?: boolean; enStart?: number; enEnd?: number }[]} pairs
 * @param {string} zh full Chinese unit (for source order)
 */
export function locateTccAlignments(en, pairs, zh) {
  const used = [];
  const needleStart = new Map();
  for (const p of pairs) {
    if (Number.isInteger(p.enStart) && Number.isInteger(p.enEnd)) {
      needleStart.set(p, p.enStart);
      continue;
    }
    const i = en.indexOf(p.en);
    if (i < 0) throw new Error(`cannot find "${p.en}" in English`);
    needleStart.set(p, i);
  }
  const sorted = [...pairs].sort(
    (a, b) => zh.indexOf(a.zh) - zh.indexOf(b.zh) || a.en.localeCompare(b.en),
  );
  const words = [];
  const placed = new Set();

  function conflictsOtherNeedle(span, current) {
    for (const p of pairs) {
      if (p === current || placed.has(p)) continue;
      const n = needleStart.get(p);
      if (n === undefined) continue;
      const len =
        Number.isInteger(p.enStart) && Number.isInteger(p.enEnd)
          ? p.enEnd - p.enStart
          : p.en.length;
      const e = n + len;
      if (span.start < e && span.end > n) return true;
    }
    return false;
  }

  for (const pair of sorted) {
    if (Number.isInteger(pair.enStart) && Number.isInteger(pair.enEnd)) {
      const hit = handSpan(en, pair);
      if (overlaps(hit.start, hit.end, used)) {
        throw new Error(`overlap for hand span "${pair.zh}"`);
      }
      placed.add(pair);
      used.push([hit.start, hit.end]);
      pushSpanAndGloss(words, en, pair, hit);
      continue;
    }

    const needle = pair.en;
    const start = needleStart.get(pair);
    const end = start + needle.length;
    const hw = hanCount(pair.zh);
    let maxExtra = 0;
    if (!pair.exact) {
      maxExtra =
        hw >= 3 ? Math.min(4, hw) : hw >= 2 ? Math.min(2, hw) : 0;
    }

    let hit = null;
    for (let extra = maxExtra; extra >= 0; extra--) {
      const span = expandSpanLeft(en, start, end, extra);
      if (overlaps(span.start, span.end, used)) continue;
      if (conflictsOtherNeedle(span, pair)) continue;
      hit = span;
      break;
    }
    if (!hit) {
      throw new Error(`overlap for "${needle}" / "${pair.zh}"`);
    }
    placed.add(pair);
    used.push([hit.start, hit.end]);
    pushSpanAndGloss(words, en, pair, hit);
  }

  words.sort((a, b) => a.enStart - b.enStart || a.enEnd - b.enEnd);
  return words;
}
