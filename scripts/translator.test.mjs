import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  docHasTranslationChoice,
  docTranslations,
  primaryTranslation,
  selectTranslation,
  sentenceEn,
} from '../src/lib/doc.ts';

const tr = (id, translator, text) => ({
  id,
  language: 'en',
  label: 'English',
  translator,
  text,
  words: [],
});

const doc = {
  format: 'hanjian',
  version: 1,
  id: 'multi',
  titleEn: 'Multi',
  titleZh: '多',
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
            { id: 'a', zh: '道可道', translations: [tr('feng', 'Feng & English', 'The way that can be told'), tr('legge', 'Legge', 'The Tao that can be trodden')] },
            { id: 'b', zh: '非常道', translations: [tr('feng', 'Feng & English', 'is not the constant way')] },
          ],
        },
      ],
    },
  ],
};

describe('translator picker model', () => {
  it('lists the distinct translations in first-appearance order', () => {
    assert.deepEqual(
      docTranslations(doc).map((t) => t.id),
      ['feng', 'legge'],
    );
    assert.equal(docHasTranslationChoice(doc), true);
  });

  it('rotates the chosen translation to primary, per sentence', () => {
    const chosen = selectTranslation(doc, 'legge');
    const [a, b] = chosen.sections[0].paragraphs[0].sentences;
    assert.equal(sentenceEn(a), 'The Tao that can be trodden');
    assert.equal(primaryTranslation(a).translator, 'Legge');
    // A sentence without the chosen translation keeps its own primary.
    assert.equal(sentenceEn(b), 'is not the constant way');
    // The input document is not mutated.
    assert.equal(sentenceEn(doc.sections[0].paragraphs[0].sentences[0]), 'The way that can be told');
  });

  it('is a no-op for absent or already-primary choices', () => {
    assert.equal(selectTranslation(doc, undefined), doc);
    assert.equal(selectTranslation(doc, 'nobody'), doc);
    assert.equal(selectTranslation(doc, 'feng'), doc);
  });
});
