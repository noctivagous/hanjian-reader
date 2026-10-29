// Focused regression tests for the XLIFF reader used by the local-only
// book generator. Run: npm test (node --test scripts/).
// Covers the chapter shapes plus the cases the previous hand-rolled
// parser got wrong: CDATA sections, namespace prefixes, and entities.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { xliffChapters } from './xliff-docs.mjs';

const N = 81;
const zh = (i) => `道章第${i}，無名萬物之始。`;
const en = (i) => `The way of chapter ${i}.`;

function files12(count = N, unit = (i) => `<trans-unit id="s${i}"><source>${zh(i)}</source><target>${en(i)}</target></trans-unit>`) {
  let x = '<xliff version="1.2">';
  for (let i = 1; i <= count; i++) {
    x += `<file original="ch${i}"><body><group>${unit(i)}</group></body></file>`;
  }
  return `${x}</xliff>`;
}

describe('xliffChapters', () => {
  it('reads 81 XLIFF 1.2 files with groups as chapters and paragraphs', () => {
    const chapters = xliffChapters(files12(), 'test');
    assert.equal(chapters.length, 81);
    assert.deepEqual(chapters[0], [[{ zh: zh(1), en: en(1) }]]);
    assert.deepEqual(chapters[80][0][0], { zh: zh(81), en: en(81) });
  });

  it('reads XLIFF 2.0 units with segments as sentences', () => {
    let x = '<xliff version="2.0"><file id="tao">';
    for (let i = 1; i <= N; i++) {
      x += `<unit id="ch${i}"><segment><source>${zh(i)}</source><target>${en(i)}</target></segment><segment><source>終${i}。</source><target>End ${i}.</target></segment></unit>`;
    }
    const chapters = xliffChapters(`${x}</file></xliff>`, 'test');
    assert.equal(chapters.length, 81);
    assert.equal(chapters[0].length, 1);
    assert.deepEqual(chapters[0][0][1], { zh: `終1。`, en: 'End 1.' });
  });

  it('reads a single file with 81 groups as chapters', () => {
    let x = '<xliff version="1.2"><file><body>';
    for (let i = 1; i <= N; i++) {
      x += `<group id="ch${i}"><trans-unit><source>${zh(i)}</source><target>${en(i)}</target></trans-unit></group>`;
    }
    const chapters = xliffChapters(`${x}</body></file></xliff>`, 'test');
    assert.equal(chapters.length, 81);
    assert.deepEqual(chapters[41][0][0], { zh: zh(42), en: en(42) });
  });

  it('keeps CDATA text clean', () => {
    const chapters = xliffChapters(files12(N, (i) => `<trans-unit><source><![CDATA[${zh(i)}]]></source><target>${en(i)}</target></trans-unit>`), 'test');
    assert.equal(chapters[0][0][0].zh, zh(1));
  });

  it('reads namespace-prefixed elements', () => {
    const ns = (x) => x.replaceAll('<xliff', '<xlf:xliff').replaceAll('</xliff>', '</xlf:xliff>').replaceAll('<file', '<xlf:file').replaceAll('</file>', '</xlf:file>').replaceAll('<body', '<xlf:body').replaceAll('</body>', '</xlf:body>').replaceAll('<group', '<xlf:group').replaceAll('</group>', '</xlf:group>');
    const chapters = xliffChapters(ns(files12(N, (i) => `<trans-unit><source>${zh(i)}</source><target>${en(i)}</target></trans-unit>`)).replaceAll('<trans-unit', '<xlf:trans-unit').replaceAll('</trans-unit>', '</xlf:trans-unit>').replaceAll('<source>', '<xlf:source>').replaceAll('</source>', '</xlf:source>').replaceAll('<target>', '<xlf:target>').replaceAll('</target>', '</xlf:target>'), 'test');
    assert.equal(chapters.length, 81);
    assert.deepEqual(chapters[0][0][0], { zh: zh(1), en: en(1) });
  });

  it('decodes entities and drops inline tags keeping their text', () => {
    const chapters = xliffChapters(files12(81, () => `<trans-unit><source>道。</source><target>Way <g id="g1">inline</g> &amp; <x id="x1"/> tail</target></trans-unit>`), 'test');
    assert.equal(chapters[0][0][0].en, 'Way inline & tail');
  });

  it('rejects wrong chapter counts', () => {
    assert.throws(() => xliffChapters(files12(80), 'test'), /80 <file>s/);
  });

  it('rejects empty source or target sides', () => {
    assert.throws(
      () => xliffChapters(files12(N, (i) => `<trans-unit><source>${zh(i)}</source><target>${i === 42 ? '' : en(i)}</target></trans-unit>`), 'test'),
      /chapter 42 has an empty Chinese or English side/,
    );
  });

  it('rejects non-XLIFF and malformed XML', () => {
    assert.throws(() => xliffChapters('<doc></doc>', 'test'), /no <file> elements/);
    assert.throws(() => xliffChapters('<xliff><file><oops>', 'test'), /invalid XML/);
  });
});
