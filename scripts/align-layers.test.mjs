import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  isDegenerateGloss,
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
    // pass added 42 more inside the formerly whole-sentence glosses.
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

  it('the whole book: no degenerate glosses, no span-only words, no gaps', () => {
    let tokens = 0;
    let glossCovered = 0;
    let marked = 0;
    let spanOnly = 0;
    let gap = 0;
    for (const [id, words] of Object.entries(alignments.units)) {
      const { zh, en } = texts[id];
      for (const w of words) {
        assert.ok(
          !isDegenerateGloss(w, words),
          `${id}: degenerate gloss '${w.en}' must be cut to word level`,
        );
      }
      const layers = layeredUnderlines(en, zh, words, 'both');
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
    assert.equal(tokens, 2231);
    assert.equal(gap, 0, 'gap words are reported as gaps, never absorbed');
    assert.equal(spanOnly, 0, 'every spanned word is glossed or marked');
    assert.equal(glossCovered + marked, tokens);
  });

  it('a sentence-scale gloss is demoted to its span, not deleted', () => {
    const text = 'One two three four five six seven eight';
    const words = [
      { en: text, zh: '甲乙', role: 'span', enStart: 0, enEnd: 39 },
      { en: text, zh: '甲乙', role: 'gloss', enStart: 0, enEnd: 39 },
    ];
    assert.ok(isDegenerateGloss(words[1], words));
    const layers = layeredUnderlines(text, '甲乙', words, 'both');
    assert.equal(layers.glosses.length, 0);
    assert.equal(layers.spans.length, 1);
    // Span-covered words are span-only, not gaps: nothing turns red.
    assert.deepEqual(layers.gaps, []);
  });

  it('a phrase gloss at span scale is not degenerate', () => {
    const text = 'from which all things are classified';
    const words = [
      { en: text, zh: '本乎數', role: 'span', enStart: 0, enEnd: 36 },
      { en: text, zh: '本乎數', role: 'gloss', enStart: 0, enEnd: 36 },
    ];
    assert.ok(!isDegenerateGloss(words[1], words));
  });

  it('inner entries rescue a long gloss from demotion', () => {
    const text = 'One two three four five six seven eight';
    const words = [
      { en: text, zh: '甲乙', role: 'span', enStart: 0, enEnd: 39 },
      { en: text, zh: '甲乙', role: 'gloss', enStart: 0, enEnd: 39 },
      { en: 'three', zh: '三', role: 'gloss', enStart: 8, enEnd: 13 },
    ];
    assert.ok(!isDegenerateGloss(words[1], words));
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
