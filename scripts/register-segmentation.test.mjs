// Register slice 2: segmentation follows the resolved register.
// classical -> Jiayan word boundaries; mandarin -> the modern path
// (Intl.Segmenter + CC-CEDICT, i.e. no segmentZh); script is only the
// fallback when no register can be determined. Run: npm test.
//
// The pinned token arrays below are the pre-slice behavior of the two
// segmenters on s03, captured from main c1001c1: for the traditional
// TCC the old script rule supplied Jiayan, so the Jiayan array is the
// regression baseline the register routing must reproduce exactly.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiayan } from '../src/lib/jiayan.ts';
import {
  resolveDocLanguageRegister,
  segmentationRoute,
} from '../src/lib/languageRegister.ts';
import { tokenizeChinese } from '../src/lib/tokenize.ts';
import { parallelDocFromXml } from '../src/lib/xliffParallel.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const jiayan = createJiayan(
  JSON.parse(readFileSync(join(root, 'public', 'dict', 'jiayan.json'), 'utf8'))
    .words,
);

function loadTcc() {
  const manifest = JSON.parse(
    readFileSync(join(root, 'public', 'texts', 'manifest.json'), 'utf8'),
  );
  const entry = (manifest.texts ?? manifest).find(
    (t) => t.id === 'three-character-classic',
  );
  assert.ok(entry, 'manifest lists the Three Character Classic');
  const xml = readFileSync(
    join(root, 'public', 'texts', 'three-character-classic.xlf'),
    'utf8',
  );
  return parallelDocFromXml(entry, xml, 'three-character-classic.xlf');
}

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

function tokens(zh, segmentZh) {
  return tokenizeChinese(zh, [], undefined, segmentZh).map((t) => t.text);
}

/** The segmenter the app would hand the tokenizer for this doc. */
function routedTokens(doc, override) {
  const route = segmentationRoute(
    resolveDocLanguageRegister(doc, override),
    doc,
  );
  return {
    route,
    tokens: tokens(
      doc.sections[0].paragraphs[0].sentences[0].zh,
      route === 'jiayan' ? jiayan.segment : undefined,
    ),
  };
}

const S03_ZH = '昔孟母，擇鄰處。子不學，斷機杼。';
const S03_JIAYAN = [
  '昔', '孟', '母', '，', '擇', '鄰', '處', '。',
  '子', '不', '學', '，', '斷', '機杼', '。',
];
const S03_MODERN = [
  '昔', '孟母', '，', '擇鄰', '處', '。',
  '子', '不學', '，', '斷', '機杼', '。',
];

describe('segmentationRoute on the bundled classic', () => {
  it('TCC (declared classical) segments exactly as the old script rule did', () => {
    const doc = loadTcc();
    assert.equal(doc.languageRegister, 'classical');
    const s03 = doc.sections
      .flatMap((s) => s.paragraphs)
      .flatMap((p) => p.sentences)
      .find((s) => s.zh === S03_ZH);
    assert.ok(s03, 's03 present in the bundled classic');
    const resolved = resolveDocLanguageRegister(doc, null);
    assert.equal(resolved.source, 'declared');
    assert.equal(segmentationRoute(resolved, doc), 'jiayan');
    assert.deepEqual(tokens(S03_ZH, jiayan.segment), S03_JIAYAN);
  });

  it('the same unit overridden to mandarin segments measurably differently', () => {
    const doc = loadTcc();
    const resolved = resolveDocLanguageRegister(doc, 'mandarin');
    assert.equal(resolved.source, 'override');
    assert.equal(segmentationRoute(resolved, doc), 'modern');
    const modern = tokens(S03_ZH, undefined);
    assert.deepEqual(modern, S03_MODERN);
    assert.notDeepEqual(modern, S03_JIAYAN);
  });

  it('undeclared classical text with real marker evidence routes to Jiayan', () => {
    // The detector's floors are book-scale (the bundled classic scores
    // 50 classical hits), so the fixture is the classic's own first 60
    // sentences with the declaration stripped — detection alone must
    // carry the routing.
    const sentences = loadTcc()
      .sections.flatMap((s) => s.paragraphs)
      .flatMap((p) => p.sentences)
      .slice(0, 60)
      .map((s) => s.zh);
    const doc = docWith(sentences, { script: 'traditional' });
    const resolved = resolveDocLanguageRegister(doc, null);
    assert.equal(resolved.source, 'detected');
    assert.equal(resolved.register, 'classical');
    assert.equal(segmentationRoute(resolved, doc), 'jiayan');
  });
});

describe('segmentationRoute on modern text', () => {
  it('a modern simplified doc segments identically under old and new routing', () => {
    // Old rule: simplified script -> no Jiayan -> modern segmenter.
    // New rule must land on the same segmenter and the same tokens.
    const zh = '我们今天去图书馆看书，也在网上买了几本新书。';
    const doc = docWith([zh], { script: 'simplified' });
    const { route, tokens: routed } = routedTokens(doc, null);
    assert.equal(route, 'modern');
    assert.deepEqual(routed, tokens(zh, undefined));
    assert.deepEqual(routed, [
      '我们', '今天', '去', '图书', '馆', '看书', '，',
      '也在', '网上', '买', '了', '几', '本', '新书', '。',
    ]);
  });

  it('a marker-rich modern doc routes modern by detection', () => {
    const doc = docWith(
      [
        '我们现在学习中文的时候，常常会用手机上的词典查生词。这本书的内容非常丰富，老师在课堂上说的话我们都听得很清楚。',
      ],
      { script: 'simplified' },
    );
    const resolved = resolveDocLanguageRegister(doc, null);
    assert.equal(resolved.register, 'mandarin');
    assert.equal(segmentationRoute(resolved, doc), 'modern');
  });

  it('modern prose in traditional script no longer gets the classical segmenter', () => {
    // The era bug this slice fixes: today this doc would load Jiayan
    // purely because its script is traditional.
    const doc = docWith(
      ['我們今天去圖書館看書，他也在那裡看報紙。這本書是他推薦的，我就借了回來。'],
      { script: 'traditional' },
    );
    const resolved = resolveDocLanguageRegister(doc, null);
    assert.equal(resolved.register, 'mandarin');
    assert.equal(segmentationRoute(resolved, doc), 'modern');
  });
});

describe('segmentationRoute script fallback (register undetermined)', () => {
  it('a one-line classical quotation in traditional script keeps Jiayan', () => {
    // 子曰：學而時習之 carries 3 classical markers — below the
    // evidence floor — so routing falls back to script, as before.
    const doc = docWith(['子曰：學而時習之。不亦說乎。'], {
      script: 'traditional',
    });
    const resolved = resolveDocLanguageRegister(doc, null);
    assert.equal(resolved.source, 'detected');
    assert.equal(segmentationRoute(resolved, doc), 'jiayan');
  });

  it('the same line in simplified script keeps the modern segmenter', () => {
    const doc = docWith(['子曰：学而时习之。不亦说乎。'], {
      script: 'simplified',
    });
    assert.equal(
      segmentationRoute(resolveDocLanguageRegister(doc, null), doc),
      'modern',
    );
  });

  it('an empty document falls back to script', () => {
    const doc = docWith([], { script: 'traditional' });
    const resolved = resolveDocLanguageRegister(doc, null);
    assert.equal(resolved.source, 'default');
    assert.equal(segmentationRoute(resolved, doc), 'jiayan');
  });
});
