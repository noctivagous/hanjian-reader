// Unit checks for P0-1 (refs/tao-te-ching-plan.md): the simplified vs
// traditional distinction, and the traditional↔simplified folding map
// used for search matching only (display text is never rewritten).
// Run: npm test (node --test scripts/).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TRAD_TO_SIMP,
  canonicalSearchText,
  docScript,
  foldScriptText,
  foldedIndexOf,
  matchesSearch,
  scriptTag,
  zhFontClass,
} from '../src/lib/script.ts';
import { docs } from '../src/data/documents.ts';

describe('TRAD_TO_SIMP', () => {
  it('folds 經→经 and 門→门', () => {
    assert.equal(TRAD_TO_SIMP['經'], '经');
    assert.equal(TRAD_TO_SIMP['門'], '门');
  });

  it('stays 1:1 single characters so folded indices map back onto display text', () => {
    const keys = Object.keys(TRAD_TO_SIMP);
    assert.ok(keys.length > 100, `expected a useful map, got ${keys.length}`);
    for (const k of keys) {
      assert.equal(Array.from(k).length, 1, `key ${k}`);
      assert.equal(Array.from(TRAD_TO_SIMP[k]).length, 1, `value for ${k}`);
      assert.notEqual(TRAD_TO_SIMP[k], k, `identity entry ${k}`);
    }
  });
});

describe('foldScriptText', () => {
  it('folds traditional to simplified without touching the input', () => {
    const text = '道德經';
    assert.equal(foldScriptText(text), '道德经');
    assert.equal(text, '道德經');
  });

  it('leaves simplified and English text alone', () => {
    assert.equal(foldScriptText('道德经'), '道德经');
    assert.equal(foldScriptText('Chapter 42'), 'Chapter 42');
  });
});

describe('matchesSearch', () => {
  it('matches across scripts in both directions', () => {
    assert.equal(matchesSearch('道德經', '道德经'), true);
    assert.equal(matchesSearch('道德经', '道德經'), true);
    assert.equal(matchesSearch('門', '门'), true);
    assert.equal(matchesSearch('门', '門'), true);
  });

  it('keeps case-insensitive English matching and rejects misses', () => {
    assert.equal(matchesSearch('Hello World', 'hello'), true);
    assert.equal(matchesSearch('道德經', '孔子'), false);
  });

  it('treats an empty query as a match', () => {
    assert.equal(matchesSearch('道德經', ''), true);
  });
});

describe('foldedIndexOf', () => {
  it('finds cross-script matches at code-point indices into the original', () => {
    assert.equal(foldedIndexOf('道德經', '道德经'), 0);
    assert.equal(foldedIndexOf('通道德經文', '道德经'), 1);
    assert.equal(foldedIndexOf('abc', 'z'), -1);
    assert.equal(foldedIndexOf('道德經', ''), -1);
  });

  it('stays aligned past astral characters', () => {
    assert.equal(foldedIndexOf('😀道德經', '道德经'), 1);
  });
});

describe('canonicalSearchText', () => {
  it('folds script and case together', () => {
    assert.equal(canonicalSearchText('道德經'), '道德经');
    assert.equal(canonicalSearchText('Chapter 42'), 'chapter 42');
  });
});

describe('doc script helpers', () => {
  it('defaults untagged docs to simplified', () => {
    assert.equal(docScript(undefined), 'simplified');
    assert.equal(docScript(null), 'simplified');
    assert.equal(docScript({}), 'simplified');
  });

  it('labels scripts 繁體 / 简体', () => {
    assert.equal(scriptTag({ script: 'traditional' }), '· 繁體');
    assert.equal(scriptTag({ script: 'simplified' }), '· 简体');
    assert.equal(scriptTag({}), '· 简体');
  });

  it('selects the TC font class for traditional docs', () => {
    assert.equal(zhFontClass({ script: 'traditional' }), 'serif-tc');
    assert.equal(zhFontClass({ script: 'simplified' }), 'serif-sc');
    assert.equal(zhFontClass({}), 'serif-sc');
  });
});

describe('bundled docs', () => {
  it('tags every doc with a script; the two existing docs are simplified', () => {
    assert.ok(docs.length >= 2);
    for (const d of docs) {
      assert.ok(
        d.script === 'simplified' || d.script === 'traditional',
        `${d.id} has script ${String(d.script)}`,
      );
    }
    assert.equal(docs[0].script, 'simplified');
    assert.equal(docs[1].script, 'simplified');
  });
});
