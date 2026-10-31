import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiayan } from '../src/lib/jiayan.ts';
import { TAO_GLOSSARY } from './tao-te-ching-glossary.mjs';
import {
  loadTaoDictLookup,
  locateAuthoredWords,
  proposeHoverWords,
} from './tao-sentence-alignments.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const jiayan = createJiayan(
  JSON.parse(readFileSync(join(root, 'public', 'dict', 'jiayan.json'), 'utf8')).words,
);
const dictLookup = await loadTaoDictLookup();

describe('sentenceAlignments (Tao Te Ching builder)', () => {
  it('does not underline English words with no gloss match (Courtyard Rain rule)', () => {
    const zh = '道可道，非常道。名可名，非常名。';
    const en =
      'The tao that can be told is not the eternal Tao. The name that can be named is not the eternal Name.';
    const words = locateAuthoredWords(
      en,
      proposeHoverWords(zh, en, jiayan.segment, dictLookup, TAO_GLOSSARY),
    );
    assert.ok(!words.some((w) => w.en === 'The' || w.en === 'the'));
    assert.ok(!words.some((w) => w.en.toLowerCase() === 'that'));
    for (const w of words) {
      assert.ok(w.zh, 'every hover span has Chinese');
      assert.equal(en.slice(w.enStart, w.enEnd), w.en);
    }
  });

  it('matches dictionary glosses where they appear in the translation', () => {
    const zh = '道可道，非常道。名可名，非常名。';
    const en =
      'The tao that can be told is not the eternal Tao. The name that can be named is not the eternal Name.';
    const words = locateAuthoredWords(
      en,
      proposeHoverWords(zh, en, jiayan.segment, dictLookup, TAO_GLOSSARY),
    );
    assert.ok(words.some((w) => w.zh === '名' && w.en.toLowerCase() === 'name'));
    assert.ok(words.some((w) => w.zh === '可' && w.en.toLowerCase() === 'can'));
    assert.ok(words.some((w) => w.zh === '道' && w.en.toLowerCase() === 'tao'));
  });

  it('chapter 10 gloss covers every content character', () => {
    const overridesPath = join(
      root,
      'private',
      'tao-te-ching.overrides.json',
    );
    let overrides;
    try {
      overrides = JSON.parse(readFileSync(overridesPath, 'utf8'));
    } catch {
      return;
    }
    // Classical particles never carry an English anchor; the reader
    // resolves them at runtime via the dictionary (see tokenize.test.mjs).
    const PARTICLES = new Set([...'乎之而']);
    const paras = overrides['10'];
    assert.ok(Array.isArray(paras) && paras.length > 0);
    for (const para of paras) {
      for (const sent of para) {
        assert.ok(sent.zh?.trim() && sent.en?.trim());
        const covered = new Set(
          (sent.words ?? []).flatMap((w) => [...(w.zh ?? '')]),
        );
        for (const ch of sent.zh) {
          if (!/\p{Script=Han}/u.test(ch) || PARTICLES.has(ch)) continue;
          assert.ok(
            covered.has(ch),
            `ch10 "${sent.zh}": ${ch} has no gloss entry`,
          );
        }
        for (const w of sent.words ?? []) {
          assert.ok(w.en?.trim() && w.zh?.trim(), 'gloss rows need en + zh');
          assert.ok(
            w.pinyin?.trim() && w.def?.trim(),
            `ch10 "${w.zh}" needs a reviewed reading, not an empty row`,
          );
        }
      }
    }
  });

  it('matches generated alignment sidecar when present', () => {
    const alignmentPath = join(root, 'private', 'tao-te-ching.alignments.json');
    try {
      readFileSync(alignmentPath, 'utf8');
    } catch {
      return;
    }
    const { units } = JSON.parse(readFileSync(alignmentPath, 'utf8'));
    const id = 'tao-ch1-p1s1';
    const words = units[id];
    assert.ok(words?.length > 0);
    for (const w of words) {
      assert.ok(w.zh);
      assert.ok(!['The', 'that'].includes(w.en));
    }
  });
});
