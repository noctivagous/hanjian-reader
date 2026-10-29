// Focused regression tests for the generic public-texts XLIFF reader.
// Run: npm test (node --test scripts/).
// Covers the section/group contract plus an end-to-end check of the real
// committed file, public/texts/three-character-classic.xlf.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parallelDocFromXml,
  parseParallelXliff,
} from '../src/lib/xliffParallel.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const xlfPath = join(root, 'public', 'texts', 'three-character-classic.xlf');
const manifestPath = join(root, 'public', 'texts', 'manifest.json');
const enPath = join(root, 'public', 'threeCharacterClassic.txt');

const META = {
  id: 'test',
  titleEn: 'Test',
  titleZh: '測',
  author: 'A',
  sourceLanguage: 'zh',
};

describe('parseParallelXliff', () => {
  it('reads groups as titled sections, trans-units as sentences', () => {
    const xml =
      '<xliff version="1.2"><file><body>' +
      '<group id="p1" resname="First|第一"><trans-unit id="s1"><source>道可道。</source><target>The way.</target></trans-unit></group>' +
      '<group id="p2"><trans-unit id="s2"><source>名可名。</source><target>The name.</target></trans-unit></group>' +
      '</body></file></xliff>';
    const secs = parseParallelXliff(xml, 'test');
    assert.equal(secs.length, 2);
    assert.equal(secs[0].id, 'p1');
    assert.equal(secs[0].titleEn, 'First');
    assert.equal(secs[0].titleZh, '第一');
    assert.equal(secs[0].paragraphs.length, 1);
    assert.deepEqual(secs[0].paragraphs[0][0], {
      id: 's1',
      zh: '道可道。',
      en: 'The way.',
      translator: null,
    });
    assert.equal(secs[1].titleEn, '');
  });

  it('reads translator notes and falls back to manifest credit', () => {
    const xml =
      '<xliff><file><trans-unit id="s1"><source>甲。</source><target>A.</target><note>translator: Ed</note></trans-unit>' +
      '<trans-unit id="s2"><source>乙。</source><target>B.</target></trans-unit></file></xliff>';
    const doc = parallelDocFromXml({ ...META, translator: 'Base' }, xml, 't');
    const [t1, t2] = doc.sections[0].paragraphs.flatMap((p) =>
      p.sentences.map((s) => s.translations[0]),
    );
    assert.equal(t1.translator, 'Ed');
    assert.equal(t2.translator, 'Base');
  });

  it('reads XLIFF 2.0 units/segments, namespaces, CDATA, entities', () => {
    const xml =
      '<xlf:xliff xmlns:xlf="urn:oasis:names:tc:xliff:document:2.0"><xlf:file id="f">' +
      '<xlf:unit id="u"><xlf:segment><xlf:source><![CDATA[道。]]></xlf:source><xlf:target>A <xlf:g>g</xlf:g> &amp; B</xlf:target></xlf:segment></xlf:unit>' +
      '</xlf:file></xlf:xliff>';
    const secs = parseParallelXliff(xml, 'test');
    assert.equal(secs.length, 1);
    assert.deepEqual(secs[0].paragraphs[0][0].zh, '道。');
    assert.deepEqual(secs[0].paragraphs[0][0].en, 'A g & B');
  });

  it('treats nested groups as multi-sentence paragraphs', () => {
    const xml =
      '<xliff><file><group id="s" resname="S"><group id="p"><trans-unit id="a"><source>甲。</source><target>A.</target></trans-unit>' +
      '<trans-unit id="b"><source>乙。</source><target>B.</target></trans-unit></group></group></file></xliff>';
    const doc = parallelDocFromXml(META, xml, 't');
    assert.equal(doc.sections.length, 1);
    assert.equal(doc.sections[0].paragraphs.length, 1);
    assert.equal(doc.sections[0].paragraphs[0].sentences.length, 2);
  });

  it('rejects non-XLIFF, malformed XML, and empty sides', () => {
    assert.throws(() => parseParallelXliff('<doc/>', 't'), /no <file>/);
    assert.throws(() => parseParallelXliff('<xliff><file><oops>', 't'), /invalid XML/);
    const empty =
      '<xliff><file><trans-unit id="s"><source></source><target>x</target></trans-unit></file></xliff>';
    assert.throws(() => parseParallelXliff(empty, 't'), /empty Chinese or English/);
  });
});

describe('three-character-classic.xlf', () => {
  it('parses to a complete parallel doc', () => {
    assert.ok(existsSync(xlfPath), 'generated XLIFF exists');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const entry = manifest.texts.find(
      (t) => t.id === 'three-character-classic',
    );
    assert.ok(entry, 'manifest lists the text');
    const doc = parallelDocFromXml(entry, readFileSync(xlfPath, 'utf8'), xlfPath);
    const sentences = doc.sections.flatMap((s) =>
      s.paragraphs.flatMap((p) => p.sentences),
    );
    assert.equal(doc.sections.length, 6);
    assert.equal(sentences.length, 94);
    for (const s of sentences) {
      assert.ok(s.zh.length > 0 && s.translations[0].text.length > 0);
    }
    const supplements = sentences.filter(
      (s) => s.translations[0].translator === 'Editorial supplement',
    );
    assert.equal(supplements.length, 18);
  });

  it('keeps the base English verbatim', () => {
    const stanzas = readFileSync(enPath, 'utf8')
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter(Boolean)
      .map((b) => b.replace(/^\d+\.\s*/, '').replace(/\s+/g, ' ').trim());
    assert.equal(stanzas.length, 76);
    const doc = parallelDocFromXml(
      { ...META, id: 'tcc' },
      readFileSync(xlfPath, 'utf8'),
      xlfPath,
    );
    const byId = {};
    for (const s of doc.sections.flatMap((sec) =>
      sec.paragraphs.flatMap((p) => p.sentences),
    )) {
      byId[s.id.replace(/^tcc-/, '')] = s.translations[0].text;
    }
    for (let i = 1; i <= 76; i++) {
      const id = `s${String(i).padStart(2, '0')}`;
      assert.equal(byId[id], stanzas[i - 1], `stanza ${i} verbatim`);
    }
  });

  it('covers the classic end to end in document order', () => {
    const doc = parallelDocFromXml(
      { ...META, id: 'tcc' },
      readFileSync(xlfPath, 'utf8'),
      xlfPath,
    );
    const units = doc.sections.flatMap((s) =>
      s.paragraphs.flatMap((p) => p.sentences),
    );
    assert.ok(units[0].zh.startsWith('人之初'));
    assert.ok(units[units.length - 1].zh.endsWith('宜勉力。'));
    assert.ok(units[units.length - 1].translations[0].text.includes('Diligence'));
    // The skipped Eastern-Chou passage is filled, in place, as supplement.
    const idx = units.findIndex((u) => u.id === 'tcc-sup-50a');
    assert.ok(idx > 0);
    assert.ok(units[idx].zh.startsWith('周轍東'));
    assert.equal(units[idx].translations[0].translator, 'Editorial supplement');
    assert.ok(units[idx - 1].zh.includes('最長久'));
    assert.ok(units[idx + 2].zh.startsWith('嬴秦氏'));
  });
});
