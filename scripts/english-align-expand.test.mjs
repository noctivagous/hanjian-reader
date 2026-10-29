import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  expandEnglishHover,
  hanSegments,
  segmentEnglishWords,
} from '../src/lib/englishAlignExpand.ts';

describe('englishAlignExpand helpers', () => {
  it('splits Han runs', () => {
    assert.deepEqual(hanSegments('人之初，性本善。'), ['人之初', '性本善']);
  });

  it('segments English words inside a range', () => {
    const spans = segmentEnglishWords('they are born good', 5, 18);
    assert.deepEqual(
      spans.map((s) => s.text),
      ['are', 'born', 'good'],
    );
  });

  it('expandEnglishHover fills gaps between anchors (library only)', () => {
    const en =
      'Men at their birth, are naturally good. Their natures are much the same; their habits become widely different.';
    const zh = '人之初，性本善。性相近，習相遠。';
    const anchors = [
      { en: 'born', zh: '人之初', enStart: 12, enEnd: 16 },
      { en: 'good nature', zh: '性本善', enStart: 31, enEnd: 42 },
      { en: 'different habits', zh: '習相遠', enStart: 78, enEnd: 94 },
    ];
    const expanded = expandEnglishHover(en, zh, anchors);
    assert.ok(expanded.length > anchors.length, 'fills gaps between anchors');
    for (const w of expanded) {
      assert.ok(w.zh, 'every expanded span has Chinese');
    }
  });
});
