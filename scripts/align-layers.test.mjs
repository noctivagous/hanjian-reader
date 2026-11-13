import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
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
      assert.deepEqual(
        layers.translators.map((w) => w.en),
        ['carefully'],
        `mode ${mode}`,
      );
      // The mark's range slices exactly the word out of the sentence.
      const mark = layers.translators[0];
      assert.equal(en.slice(mark.enStart, mark.enEnd), 'carefully');
      assert.equal(mark.zh, '');
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
    assert.equal(total, 37);
  });

  it('sentences without authored marks simply have none (s01)', () => {
    const { zh, en } = texts.s01;
    const layers = layeredUnderlines(en, zh, alignments.units.s01, 'both');
    assert.deepEqual(layers.translators, []);
    assert.ok(layers.spans.length > 0 && layers.glosses.length > 0);
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
