import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tokenizeChinese } from '../src/lib/tokenize.ts';
import { loadTaoDictLookup } from './tao-sentence-alignments.mjs';

const dictLookup = await loadTaoDictLookup();
const dict = { lookup: (text) => dictLookup(text) };

const HAN_REAL = /\p{Script=Han}/u;

// Chapter 10, sentence 1: authored gloss words carry offsets (as emitted
// by the build), leaving the particle 乎 with no authored word.
const ZH = '載營魄抱一，能無離乎？';
const WORDS = [
  { en: 'Carrying', zh: '載', pinyin: 'zài', def: 'to carry; to bear' },
  { en: 'body and soul', zh: '營魄', pinyin: 'yíng pò', def: 'body and soul' },
  { en: 'embracing', zh: '抱', pinyin: 'bào', def: 'to embrace' },
  { en: 'the one', zh: '一', pinyin: 'yī', def: 'one' },
  { en: 'Can', zh: '能', pinyin: 'néng', def: 'can' },
  {
    en: 'avoid separation',
    zh: '無離',
    pinyin: 'wú lí',
    def: 'to not separate',
    enStart: 54,
    enEnd: 70,
  },
];

describe('tokenizeChinese dictionary fill', () => {
  it('gives wordless characters dictionary readings alongside authored words', () => {
    const tokens = tokenizeChinese(ZH, WORDS, dict);
    for (const ch of Array.from(ZH)) {
      if (!HAN_REAL.test(ch)) continue;
      const token = tokens.find(
        (t) => Array.from(t.text).includes(ch) && t.word,
      );
      assert.ok(
        token,
        `character ${ch} has no hover word (particles like 乎 must resolve via the dictionary)`,
      );
      const w = token.word;
      assert.ok(
        w.pinyin || w.def || (w.senses && w.senses.length > 0),
        `character ${ch} has a word but no reading`,
      );
    }
  });

  it('never splits a hand-aligned word', () => {
    const tokens = tokenizeChinese(ZH, WORDS, dict);
    assert.ok(
      tokens.some((t) => t.text === '營魄' && t.word?.zh === '營魄'),
    );
    assert.ok(
      tokens.some((t) => t.text === '無離' && t.word?.zh === '無離'),
    );
  });
});
