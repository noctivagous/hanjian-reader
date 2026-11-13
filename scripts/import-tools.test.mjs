import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeImport, importCustomDoc } from '../src/lib/segment.ts';
import {
  docFileName,
  isHanjianDoc,
  parseHanjianDocJson,
  serializeDoc,
} from '../src/lib/docFile.ts';

describe('analyzeImport', () => {
  it('counts matched input cleanly', () => {
    const a = analyzeImport(
      'One. Two.\n\nThree.',
      '一。二。\n\n三。',
    );
    assert.deepEqual(a, {
      enParagraphs: 2,
      zhParagraphs: 2,
      enSentences: 3,
      zhSentences: 3,
      droppedZhParagraphs: 0,
      emptyZhParagraphs: 0,
      droppedZhSentences: 0,
    });
  });

  it('predicts exactly what import drops and empties', () => {
    const en = 'Only paragraph. One sentence.';
    const zh = '第一段。一句。两句。\n\n多余的段落。';
    const a = analyzeImport(en, zh);
    assert.equal(a.droppedZhParagraphs, 1);
    assert.equal(a.emptyZhParagraphs, 0);
    assert.equal(a.droppedZhSentences, 1); // 两句。 has no English pair

    const doc = importCustomDoc(en, zh, 'T', '题');
    const paras = doc.sections[0].paragraphs;
    assert.equal(paras.length, 1); // the extra Chinese paragraph is gone
    assert.equal(paras[0].sentences.length, 2); // 两句。 dropped with it
    assert.equal(paras[0].sentences[1].zh, '一句。');
  });

  it('flags English paragraphs that will import with empty Chinese', () => {
    const a = analyzeImport('One.\n\nTwo.', '一。');
    assert.equal(a.emptyZhParagraphs, 1);
    assert.equal(a.droppedZhParagraphs, 0);
  });
});

describe('.hanjian.json round-trip', () => {
  it('serializes and parses back to the same document', () => {
    const doc = importCustomDoc('Hello world.', '你好世界。', 'Hi', '嗨');
    const parsed = parseHanjianDocJson(serializeDoc(doc));
    assert.deepEqual(parsed, doc);
    assert.equal(docFileName(doc), `${doc.id}.hanjian.json`);
  });

  it('rejects payloads that are not HanJian documents', () => {
    assert.equal(parseHanjianDocJson('not json'), null);
    assert.equal(parseHanjianDocJson('{"format":"other"}'), null);
    assert.equal(parseHanjianDocJson('[1,2,3]'), null);
    assert.equal(isHanjianDoc(null), false);
    assert.equal(
      isHanjianDoc({ format: 'hanjian', version: 1, id: 'x', sections: [] }),
      true,
    );
  });
});
