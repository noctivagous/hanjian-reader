import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  alignRole,
  normalizeTranslationWords,
  underlinesFor,
} from '../src/lib/alignRoles.ts';

describe('alignRoles', () => {
  it('infers span from offsets and gloss from a bare pair', () => {
    assert.equal(
      alignRole({ en: 'born', zh: '初', pinyin: '', def: '', enStart: 0, enEnd: 4 }),
      'span',
    );
    assert.equal(
      alignRole({ en: 'old man', zh: '老人', pinyin: '', def: '' }),
      'gloss',
    );
  });

  it('gives Courtyard-style glosses both clause spans and pinned gloss ranges', () => {
    const text =
      'The old man sat in the courtyard, watching the rain fall on the banana leaves.';
    const zh = '老人坐在庭院里，看着雨落在芭蕉叶上。';
    const words = [
      { en: 'old man', zh: '老人', pinyin: '', def: '' },
      { en: 'sat', zh: '坐', pinyin: '', def: '' },
      { en: 'the courtyard', zh: '庭院', pinyin: '', def: '' },
      { en: 'watching', zh: '看着', pinyin: '', def: '' },
      { en: 'rain', zh: '雨', pinyin: '', def: '' },
    ];
    const spans = underlinesFor(text, zh, words, 'span');
    const glosses = underlinesFor(text, zh, words, 'gloss');
    assert.deepEqual(
      spans.map((w) => w.en),
      [
        'The old man sat in the courtyard',
        'watching the rain fall on the banana leaves',
      ],
    );
    assert.ok(glosses.some((w) => w.en === 'old man' && w.zh === '老人'));
    assert.equal(text.slice(spans[0].enStart, spans[0].enEnd), spans[0].en);
  });

  it('uses the authored needle as a gloss, not every English word in the span', () => {
    const text =
      'If a man has not been properly taught, his nature will gradually become bad.';
    const zh = '苟不教，性乃遷。';
    const words = [
      {
        en: 'his nature will gradually become bad',
        zh: '性乃遷',
        pinyin: '',
        def: '',
        role: 'span',
        enStart: text.indexOf('his nature will gradually become bad'),
        enEnd:
          text.indexOf('his nature will gradually become bad') +
          'his nature will gradually become bad'.length,
      },
      {
        en: 'gradually become bad',
        zh: '性乃遷',
        pinyin: '',
        def: '',
        role: 'gloss',
        enStart: text.indexOf('gradually become bad'),
        enEnd:
          text.indexOf('gradually become bad') + 'gradually become bad'.length,
      },
    ];
    assert.deepEqual(
      underlinesFor(text, zh, words, 'span').map((w) => w.en),
      ['his nature will gradually become bad'],
    );
    assert.deepEqual(
      underlinesFor(text, zh, words, 'gloss').map((w) => w.en),
      ['gradually become bad'],
    );
  });

  it('keeps a gloss that occupies the same English range as its span', () => {
    const text = 'All men are born with the same good nature.';
    const zh = '人之初，性本善。';
    const words = [
      {
        en: 'All men are born',
        zh: '人之初',
        pinyin: '',
        def: '',
        role: 'span',
        enStart: 0,
        enEnd: 16,
      },
      {
        en: 'All men are born',
        zh: '人之初',
        pinyin: '',
        def: '',
        role: 'gloss',
        enStart: 0,
        enEnd: 16,
      },
    ];
    assert.deepEqual(underlinesFor(text, zh, words, 'gloss').map((w) => w.en), [
      'All men are born',
    ]);
  });

  it('keeps authored span and gloss records when normalizing', () => {
    const text = 'The old man sat.';
    const zh = '老人坐。';
    const out = normalizeTranslationWords(text, zh, [
      { en: 'old man', zh: '老人', pinyin: '', def: '' },
      { en: 'sat', zh: '坐', pinyin: '', def: '' },
    ]);
    assert.ok(out.some((w) => w.role === 'span'));
    assert.ok(out.some((w) => w.role === 'gloss' && w.zh === '老人'));
  });
});
