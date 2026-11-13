// Language register: detector, resolution precedence, register-ordered
// dictionary lookup, and the bundled declaration on the Three Character
// Classic. Run: npm test (node --test scripts/).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  detectLanguageRegister,
  docChineseText,
  lookupInRegisterOrder,
  resolveDocLanguageRegister,
  scoreLanguageRegister,
} from '../src/lib/languageRegister.ts';
import { parseParallelXliff } from '../src/lib/xliffParallel.ts';
import { parallelDocFromXml } from '../src/lib/xliffParallel.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const xlfPath = join(root, 'public', 'texts', 'three-character-classic.xlf');
const manifestPath = join(root, 'public', 'texts', 'manifest.json');

const MODERN_SAMPLE =
  '我们现在学习中文的时候，常常会用手机上的词典查生词。这本书的内容非常丰富，老师在课堂上说的话我们都听得很清楚。学生们觉得汉语很难，但是他们每天都在努力地练习，而且进步得很快。';

function docWith(zhSentences, extra = {}) {
  return {
    format: 'hanjian',
    version: 1,
    id: 'test-doc',
    titleEn: 'Test',
    titleZh: '測',
    author: 'A',
    sourceLanguage: 'zh',
    sections: [
      {
        id: 'test-doc-s1',
        titleEn: '',
        titleZh: '',
        paragraphs: [
          {
            id: 'test-doc-s1-p1',
            zh: zhSentences.join(''),
            sentences: zhSentences.map((zh, i) => ({
              id: `test-doc-u${i + 1}`,
              zh,
              translations: [],
            })),
          },
        ],
      },
    ],
    ...extra,
  };
}

describe('detectLanguageRegister', () => {
  it('classifies the bundled Three Character Classic as classical', () => {
    const sections = parseParallelXliff(
      readFileSync(xlfPath, 'utf8'),
      'three-character-classic.xlf',
    );
    const text = sections
      .flatMap((s) => s.paragraphs.flatMap((p) => p.map((u) => u.zh)))
      .join('');
    const score = scoreLanguageRegister(text);
    // The classic clears every margin with room to spare.
    assert.ok(score.classicalHits >= 40, `classical hits ${score.classicalHits}`);
    assert.ok(
      score.classicalHits >= 5 * score.modernHits,
      `classical ${score.classicalHits} vs modern ${score.modernHits}`,
    );
    assert.ok(score.meanSentenceLength <= 8, `mean ${score.meanSentenceLength}`);
    assert.equal(detectLanguageRegister(text), 'classical');
  });

  it('classifies modern prose as mandarin', () => {
    const score = scoreLanguageRegister(MODERN_SAMPLE);
    assert.ok(score.modernHits > score.classicalHits);
    assert.equal(detectLanguageRegister(MODERN_SAMPLE), 'mandarin');
  });

  it('stays mandarin on a short or ambiguous text', () => {
    assert.equal(detectLanguageRegister('子曰：學而時習之。'), 'mandarin');
    assert.equal(detectLanguageRegister(''), 'mandarin');
  });
});

describe('resolveDocLanguageRegister', () => {
  const classicalDoc = docWith(['人之初，性本善。', '苟不教，性乃遷。'], {
    languageRegister: 'classical',
  });

  it('lets a user override beat the declared register', () => {
    assert.deepEqual(resolveDocLanguageRegister(classicalDoc, 'mandarin'), {
      register: 'mandarin',
      source: 'override',
    });
  });

  it('uses the declared register when there is no override', () => {
    assert.deepEqual(resolveDocLanguageRegister(classicalDoc), {
      register: 'classical',
      source: 'declared',
    });
  });

  it('detects when the document declares nothing', () => {
    // Real text: the classic's first thirty units, undeclared.
    const sections = parseParallelXliff(
      readFileSync(xlfPath, 'utf8'),
      'three-character-classic.xlf',
    );
    const units = sections
      .flatMap((s) => s.paragraphs.flatMap((p) => p.map((u) => u.zh)))
      .slice(0, 30);
    const undeclared = docWith(units);
    const resolved = resolveDocLanguageRegister(undeclared);
    assert.equal(resolved.source, 'detected');
    assert.equal(resolved.register, 'classical');
    const modern = resolveDocLanguageRegister(docWith([MODERN_SAMPLE]));
    assert.deepEqual(modern, { register: 'mandarin', source: 'detected' });
  });

  it('defaults an empty document to mandarin', () => {
    assert.deepEqual(resolveDocLanguageRegister(docWith([])), {
      register: 'mandarin',
      source: 'default',
    });
  });

  it('collects a document’s Chinese for detection', () => {
    assert.equal(
      docChineseText(docWith(['人之初。', '性本善。'])),
      '人之初。性本善。',
    );
  });
});

describe('lookupInRegisterOrder', () => {
  const providers = {
    classical: {
      lookup: (text) =>
        text === '之' ? [{ pinyin: 'zhī', def: 'possessive particle' }] : undefined,
    },
    cedict: {
      lookup: (text) =>
        text === '之'
          ? [{ pinyin: 'zhī', def: '(possessive particle)' }]
          : text === '的'
            ? [{ pinyin: 'de', def: '(possessive particle)' }]
            : undefined,
    },
  };

  it('asks the classical dictionary first in classical register', () => {
    const hit = lookupInRegisterOrder('之', 'classical', providers);
    assert.equal(hit.source, 'classical');
    assert.equal(hit.sourceLabel, 'Classical dictionary');
    assert.equal(hit.records[0].def, 'possessive particle');
  });

  it('falls back to CC-CEDICT in classical register', () => {
    const hit = lookupInRegisterOrder('的', 'classical', providers);
    assert.equal(hit.source, 'cedict');
    assert.equal(hit.sourceLabel, 'CC-CEDICT');
  });

  it('asks CC-CEDICT first in mandarin register', () => {
    const hit = lookupInRegisterOrder('之', 'mandarin', providers);
    assert.equal(hit.source, 'cedict');
    assert.equal(hit.sourceLabel, 'CC-CEDICT');
  });

  it('returns undefined when neither source knows the headword', () => {
    assert.equal(lookupInRegisterOrder('龘', 'classical', providers), undefined);
    assert.equal(lookupInRegisterOrder('之', 'classical', {}), undefined);
  });
});

describe('bundled declaration', () => {
  it('the manifest declares the Three Character Classic classical', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const entry = manifest.texts.find(
      (t) => t.id === 'three-character-classic',
    );
    assert.ok(entry, 'manifest lists the classic');
    assert.equal(entry.languageRegister, 'classical');
  });

  it('the declaration reaches the loaded Doc', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const entry = manifest.texts.find(
      (t) => t.id === 'three-character-classic',
    );
    const doc = parallelDocFromXml(
      entry,
      readFileSync(xlfPath, 'utf8'),
      entry.file,
    );
    assert.equal(doc.languageRegister, 'classical');
    assert.deepEqual(resolveDocLanguageRegister(doc), {
      register: 'classical',
      source: 'declared',
    });
  });
});
