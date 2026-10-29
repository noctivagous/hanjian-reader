// Jiayan WordNgramTokenizer (classical lexicon) and its use as tokenizeChinese
// `segmentZh`. Run: npm test
//
// 非常 is a modern compound (ICU/CEDICT "very"); it is not in Jiayan's
// lexicon, so 非常道 should split 非 + 常 + 道. 天下 / 万物 are listed.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiayan } from '../src/lib/jiayan.ts';
import { englishLabel, tokenizeChinese } from '../src/lib/tokenize.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = JSON.parse(
  readFileSync(join(root, 'public', 'dict', 'jiayan.json'), 'utf8'),
);
const jiayan = createJiayan(file.words);

function texts(zh, words = [], dict, segmentZh) {
  return tokenizeChinese(zh, words, dict, segmentZh).map((t) => t.text);
}

const dict = {
  lookup(text) {
    const table = {
      非: [{ pinyin: 'fēi', def: 'not' }],
      常: [{ pinyin: 'cháng', def: 'constant' }],
      道: [{ pinyin: 'dào', def: 'way' }],
      天下: [{ pinyin: 'tiānxià', def: 'all under heaven' }],
      萬物: [{ pinyin: 'wànwù', def: 'all things' }],
      万物: [{ pinyin: 'wànwù', def: 'all things' }],
      天地: [{ pinyin: 'tiāndì', def: 'heaven and earth' }],
    };
    return table[text];
  },
};

describe('Jiayan lexicon', () => {
  it('does not list 非常 as a word and does list 天下 / 万物 / 天地', () => {
    assert.equal(file.words['非常'], undefined);
    assert.ok(file.words['天下'] > 0);
    assert.ok(file.words['万物'] > 0);
    assert.ok(file.words['天地'] > 0);
  });
});

describe('createJiayan', () => {
  it('splits 非常道 into 非 + 常 + 道', () => {
    assert.deepEqual(jiayan.segment('非常道'), ['非', '常', '道']);
  });

  it('keeps 天下 as one token, including in running text', () => {
    assert.deepEqual(jiayan.segment('天下'), ['天下']);
    const toks = jiayan.segment('天下萬物');
    assert.equal(toks[0], '天下');
  });

  it('maps traditional 萬物 back onto the original characters', () => {
    assert.deepEqual(jiayan.segment('萬物'), ['萬物']);
  });
});

describe('tokenizeChinese + Jiayan', () => {
  it('emits 非 and 常 as separate dictionary tokens', () => {
    const toks = tokenizeChinese('非常道', [], dict, (zh) => jiayan.segment(zh));
    assert.deepEqual(
      toks.map((t) => t.text),
      ['非', '常', '道'],
    );
    assert.equal(toks[0].word?.def, 'not');
    assert.equal(toks[1].word?.def, 'constant');
  });

  it('keeps 天下 as one hover span', () => {
    const toks = tokenizeChinese('天下', [], dict, (zh) => jiayan.segment(zh));
    assert.deepEqual(
      toks.map((t) => t.text),
      ['天下'],
    );
    assert.equal(toks[0].word?.def, 'all under heaven');
  });

  it('does not split an authored alignment (杯中)', () => {
    const words = [
      { en: 'in the cup', zh: '杯中', pinyin: 'bēi zhōng', def: 'in the cup' },
    ];
    const t = texts('杯中的茶', words, dict, (zh) => jiayan.segment(zh));
    assert.equal(t[0], '杯中');
  });
});

describe('englishLabel', () => {
  it('uses authored en, else a short listed gloss (skips surname / bound-form notes)', () => {
    assert.equal(
      englishLabel({ en: 'in cup', zh: '杯中', pinyin: '', def: '' }),
      'in cup',
    );
    assert.equal(
      englishLabel({
        en: '',
        zh: '相',
        pinyin: '',
        def: '',
        senses: [
          { pinyin: 'xiāng', def: 'surname Xiang' },
          { pinyin: 'xiāng', def: 'each other; one another; mutually' },
        ],
      }),
      'each other',
    );
    assert.equal(
      englishLabel({
        en: '(bound form) at first',
        zh: '初',
        pinyin: 'chū',
        def: '(bound form) at first; beginning',
      }),
      'beginning',
    );
  });
});
