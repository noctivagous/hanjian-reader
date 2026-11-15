import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  isWholeSpanGloss,
  layeredUnderlines,
  normalizeTranslationWords,
  underlinesFor,
} from '../src/lib/alignRoles.ts';

// Ground truth: the shipped Three Character Classic data. Sentence
// texts come from the XLIFF targets; alignment records from the
// curated alignments file the app itself loads.
const xlf = readFileSync(
  new URL('../public/texts/three-character-classic.xlf', import.meta.url),
  'utf8',
);
const texts = {};
for (const m of xlf.matchAll(
  /<trans-unit id="([^"]+)"[^>]*>[\s\S]*?<source>([\s\S]*?)<\/source>[\s\S]*?<target>([\s\S]*?)<\/target>/g,
)) {
  texts[m[1]] = { zh: m[2].trim(), en: m[3].trim() };
}
const alignments = JSON.parse(
  readFileSync(
    new URL(
      '../public/texts/three-character-classic.alignments.json',
      import.meta.url,
    ),
    'utf8',
  ),
);

describe('layered underlines', () => {
  it('keeps spans and glosses together in both mode (s03)', () => {
    const { zh, en } = texts.s03;
    const layers = layeredUnderlines(en, zh, alignments.units.s03, 'both');
    const spanEns = layers.spans.map((w) => w.en);
    const glossEns = layers.glosses.map((w) => w.en);
    assert.ok(spanEns.includes('carefully chose her neighbours'));
    assert.ok(glossEns.includes('chose her neighbours'));
    assert.ok(glossEns.includes('mother of Mencius'));
  });

  it("marks 'carefully' as a translator word in s03 — and not 'son'", () => {
    const { zh, en } = texts.s03;
    for (const mode of ['both', 'gloss']) {
      const layers = layeredUnderlines(en, zh, alignments.units.s03, mode);
      // Since the zero-gap fill, s03 carries marks for every scaffolding
      // word; the invariant this test guards is which side of the line
      // 'carefully' (no counterpart) and 'son' (子) fall on.
      const mark = layers.translators.find((w) => w.en === 'carefully');
      assert.ok(mark, `mode ${mode}: 'carefully' is marked`);
      // The mark's range slices exactly the word out of the sentence.
      assert.equal(en.slice(mark.enStart, mark.enEnd), 'carefully');
      assert.equal(mark.zh, '');
      assert.ok(
        !layers.translators.some((w) => w.en === 'son'),
        `mode ${mode}: 'son' is not a translator word`,
      );
      assert.ok(
        layers.glosses.some((w) => w.en === 'son' && w.zh === '子'),
        `mode ${mode}: 'son' is glossed to 子`,
      );
    }
  });

  it('hides translator marks in span mode (the span already covers them)', () => {
    const { zh, en } = texts.s03;
    const layers = layeredUnderlines(en, zh, alignments.units.s03, 'span');
    assert.ok(layers.spans.length > 0);
    assert.deepEqual(layers.glosses, []);
    assert.deepEqual(layers.translators, []);
  });

  it('the whole book: every authored translator mark is exact and gloss-free', () => {
    let total = 0;
    for (const [id, words] of Object.entries(alignments.units)) {
      const { zh, en } = texts[id];
      const layers = layeredUnderlines(en, zh, words, 'both');
      total += layers.translators.length;
      for (const mark of layers.translators) {
        assert.equal(en.slice(mark.enStart, mark.enEnd), mark.en, id);
        for (const g of layers.glosses) {
          assert.ok(
            mark.enEnd <= g.enStart || g.enEnd <= mark.enStart,
            `${id}: translator mark '${mark.en}' overlaps gloss '${g.en}'`,
          );
        }
      }
    }
    // 37 hand-picked marks before the zero-gap fill; the fill marks every
    // English word with no Chinese counterpart, book-wide. The gloss-cut
    // passes added 33 more inside the formerly whole-sentence glosses of
    // s02 and s27, and 9 more inside the two flagged clauses (s02/s04).
    assert.equal(total, 991);
  });

  it('s01 marks its scaffolding words and keeps content words glossed', () => {
    const { zh, en } = texts.s01;
    const layers = layeredUnderlines(en, zh, alignments.units.s01, 'both');
    assert.ok(layers.spans.length > 0 && layers.glosses.length > 0);
    // Since the zero-gap fill every sentence carries authored marks; each
    // must slice its word exactly, and anchored content words stay glosses.
    assert.ok(layers.translators.length > 0);
    for (const mark of layers.translators) {
      assert.equal(en.slice(mark.enStart, mark.enEnd), mark.en);
    }
    assert.ok(!layers.translators.some((w) => w.en === 'nature'));
    assert.ok(layers.glosses.some((w) => w.en === 'nature'));
  });

  it('translator records survive normalization unpinned, and legacy filters exclude them', () => {
    const words = [
      { en: 'carefully', zh: '', pinyin: '', def: '', role: 'translator', enStart: 22, enEnd: 31 },
      { en: 'chose', zh: '擇', pinyin: '', def: '', role: 'gloss', enStart: 32, enEnd: 37 },
    ];
    const text = 'The mother of Mencius carefully chose her neighbours.';
    const normalized = normalizeTranslationWords(text, '孟母擇鄰', words);
    const mark = normalized.find((w) => w.role === 'translator');
    assert.ok(mark);
    assert.equal(mark.enStart, 22);
    assert.equal(mark.enEnd, 31);
    assert.deepEqual(underlinesFor(text, '孟母擇鄰', words, 'gloss').map((w) => w.en), ['chose']);
    assert.ok(!underlinesFor(text, '孟母擇鄰', words, 'span').some((w) => w.en === 'carefully'));
  });
});

describe('coverage classification (gloss-covered / span-only / gap)', () => {
  const WORD = /[A-Za-z]+(?:['’][A-Za-z]+)?/g;
  const inside = (ranges, s, e) =>
    ranges.some((w) => w.enStart <= s && e <= w.enEnd);

  it('the whole book: spans classify by strictly-inner glosses; no word is a gap', () => {
    let spans = 0;
    let spansWithInner = 0;
    let wholeSpanGlosses = 0;
    let tokens = 0;
    let glossCovered = 0;
    let marked = 0;
    let spanOnly = 0;
    let gap = 0;
    for (const [id, words] of Object.entries(alignments.units)) {
      const { zh, en } = texts[id];
      const rawSpans = words.filter((w) => w.role === 'span');
      const rawGlosses = words.filter((w) => w.role === 'gloss');
      spans += rawSpans.length;
      wholeSpanGlosses += rawGlosses.filter((g) =>
        isWholeSpanGloss(g, words),
      ).length;
      for (const s of rawSpans) {
        const inner = rawGlosses.some(
          (g) =>
            g.enStart >= s.enStart &&
            g.enEnd <= s.enEnd &&
            (g.enStart > s.enStart || g.enEnd < s.enEnd),
        );
        if (inner) spansWithInner += 1;
      }
      const layers = layeredUnderlines(en, zh, words, 'both');
      // The renderer's gloss layer must never carry a whole-span gloss.
      for (const g of layers.glosses) {
        assert.ok(
          !isWholeSpanGloss(g, words),
          `${id}: whole-span gloss '${g.en}' leaked into the gloss layer`,
        );
      }
      const gapRanges = new Set(
        layers.gaps.map((g) => `${g.enStart}-${g.enEnd}`),
      );
      for (const m of en.matchAll(WORD)) {
        const s = m.index;
        const e = s + m[0].length;
        tokens += 1;
        if (inside(layers.glosses, s, e)) glossCovered += 1;
        else if (inside(layers.translators, s, e)) marked += 1;
        else if (inside(layers.spans, s, e)) spanOnly += 1;
        else {
          gap += 1;
          assert.ok(
            gapRanges.has(`${s}-${e}`),
            `${id}: gap word '${m[0]}' must be reported in layers.gaps`,
          );
        }
      }
    }
    assert.equal(spans, 483);
    // 369 spans carry word-level glosses strictly inside them; the
    // other 114 are span-class segments (109 still carry a whole-span
    // gloss record, which the renderer demotes; the rest none).
    assert.equal(spansWithInner, 369);
    assert.equal(wholeSpanGlosses, 109);
    assert.equal(tokens, 2231);
    assert.equal(gap, 0, 'gap words are reported as gaps, never absorbed');
    assert.equal(glossCovered + marked + spanOnly, tokens);
    assert.ok(spanOnly > 0, 'span-class words are an honest, expected class');
  });

  it('a whole-span gloss is demoted at any length — even one word', () => {
    const text = 'Heaven and Earth';
    const words = [
      { en: 'Heaven', zh: '天', role: 'span', enStart: 0, enEnd: 6 },
      { en: 'Heaven', zh: '天', role: 'gloss', enStart: 0, enEnd: 6 },
    ];
    assert.ok(isWholeSpanGloss(words[1], words));
    for (const mode of ['both', 'gloss']) {
      const layers = layeredUnderlines(text, '天地', words, mode);
      assert.equal(layers.glosses.length, 0, mode);
    }
    const both = layeredUnderlines(text, '天地', words, 'both');
    assert.equal(both.spans.length, 1);
    // 'Heaven' itself is span-covered (span-only, not a gap); the
    // fixture's other words have no coverage at all, so they are gaps.
    assert.deepEqual(both.gaps, [{ enStart: 7, enEnd: 10 }, { enStart: 11, enEnd: 16 }]);
  });

  it('a whole-span gloss over a sentence is demoted the same way', () => {
    const text = 'One two three four five six seven eight';
    const words = [
      { en: text, zh: '甲乙', role: 'span', enStart: 0, enEnd: 39 },
      { en: text, zh: '甲乙', role: 'gloss', enStart: 0, enEnd: 39 },
    ];
    const layers = layeredUnderlines(text, '甲乙', words, 'both');
    assert.equal(layers.glosses.length, 0);
    assert.equal(layers.spans.length, 1);
    assert.deepEqual(layers.gaps, []);
  });

  it('inner glosses survive; only the whole-span record is demoted', () => {
    const text = 'One two three four five six seven eight';
    const words = [
      { en: text, zh: '甲乙', role: 'span', enStart: 0, enEnd: 39 },
      { en: text, zh: '甲乙', role: 'gloss', enStart: 0, enEnd: 39 },
      { en: 'three', zh: '三', role: 'gloss', enStart: 8, enEnd: 13 },
    ];
    const layers = layeredUnderlines(text, '甲乙', words, 'both');
    assert.deepEqual(layers.glosses.map((g) => g.en), ['three']);
  });

  it('a gloss strictly inside its span is kept as gloss', () => {
    const text = 'carefully chose her neighbours';
    const words = [
      { en: text, zh: '擇鄰處', role: 'span', enStart: 0, enEnd: 30 },
      { en: 'chose her neighbours', zh: '擇鄰處', role: 'gloss', enStart: 10, enEnd: 30 },
    ];
    assert.ok(!isWholeSpanGloss(words[1], words));
    const layers = layeredUnderlines(text, '擇鄰處', words, 'gloss');
    assert.deepEqual(layers.glosses.map((g) => g.en), ['chose her neighbours']);
  });

  it('an uncovered word is reported as a gap range', () => {
    const text = 'Alpha beta gamma';
    const words = [
      { en: 'Alpha', zh: '甲', role: 'span', enStart: 0, enEnd: 5 },
      { en: 'Alpha', zh: '甲', role: 'gloss', enStart: 0, enEnd: 5 },
      { en: 'beta', zh: '', role: 'translator', enStart: 6, enEnd: 10 },
    ];
    const layers = layeredUnderlines(text, '甲', words, 'both');
    assert.deepEqual(layers.gaps, [{ enStart: 11, enEnd: 16 }]);
    // Single-layer modes never report gaps: the reader only paints
    // them in the combined view.
    assert.deepEqual(layeredUnderlines(text, '甲', words, 'gloss').gaps, []);
    assert.deepEqual(layeredUnderlines(text, '甲', words, 'span').gaps, []);
  });
});
