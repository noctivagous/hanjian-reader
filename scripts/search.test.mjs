import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { foldedIndexOfAll } from '../src/lib/script.ts';
import { docSearchMatches } from '../src/lib/search.ts';

describe('foldedIndexOfAll', () => {
  it('finds every occurrence, not just the first', () => {
    assert.deepEqual(foldedIndexOfAll('the cat sat on the mat', 'the'), [0, 15]);
    assert.deepEqual(foldedIndexOfAll('aaaaa', 'aaa'), [0]);
    assert.deepEqual(foldedIndexOfAll('nothing here', 'zzz'), []);
    assert.deepEqual(foldedIndexOfAll('anything', ''), []);
  });

  it('folds case and script like foldedIndexOf', () => {
    assert.deepEqual(foldedIndexOfAll('The 經 and the 经', '经'), [4, 14]);
    assert.deepEqual(foldedIndexOfAll('ABC abc', 'abc'), [0, 4]);
  });
});

const doc = {
  format: 'hanjian',
  version: 1,
  id: 't',
  titleEn: 'T',
  titleZh: '题',
  author: '',
  sourceLanguage: 'zh',
  sections: [
    {
      id: 's1',
      titleEn: '',
      titleZh: '',
      paragraphs: [
        {
          id: 'p1',
          zh: '',
          sentences: [
            {
              id: 'sent-1',
              zh: '學而時習之',
              translations: [
                { id: 't1', language: 'en', label: '', translator: '', text: 'Learning and practice', words: [] },
              ],
            },
            {
              id: 'sent-2',
              zh: '習習習',
              translations: [
                { id: 't2', language: 'en', label: '', translator: '', text: 'practice, practice', words: [] },
              ],
            },
          ],
        },
      ],
    },
  ],
};

describe('docSearchMatches', () => {
  it('counts occurrences across both fields, in document order', () => {
    const practice = docSearchMatches(doc, 'practice');
    assert.equal(practice.total, 3); // 1 in sent-1 EN + 2 in sent-2 EN
    assert.deepEqual(practice.anchors, ['sent-1', 'sent-2', 'sent-2']);

    const xi = docSearchMatches(doc, '習');
    assert.equal(xi.total, 4); // 1 in sent-1 ZH + 3 in sent-2 ZH
    assert.deepEqual(xi.anchors, ['sent-1', 'sent-2', 'sent-2', 'sent-2']);
  });

  it('empty query and no-match queries return an empty result', () => {
    assert.deepEqual(docSearchMatches(doc, ''), { anchors: [], total: 0 });
    assert.deepEqual(docSearchMatches(doc, 'absent'), { anchors: [], total: 0 });
  });
});
