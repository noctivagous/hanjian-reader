import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { locateTccAlignments } from './tcc-locate-alignments.mjs';
import { ALIGNMENTS_PART_1 } from './three-character-classic-alignments-part1.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('locateTccAlignments', () => {
  it('s01: keeps gloss needles while spans may expand left', () => {
    const en =
      'All men are born with the same good nature, but as they grow up, they acquire different habits, so they become widely different in their characters.';
    const zh = '人之初，性本善。性相近，習相遠。';
    const words = locateTccAlignments(en, ALIGNMENTS_PART_1.s01, zh);
    const born = words.find((w) => w.zh === '人之初');
    assert.ok(born);
    assert.equal(born.en, 'All men are born');
    assert.equal(born.role, 'span');
    const bornGloss = words.find((w) => w.zh === '初' && w.role === 'gloss');
    assert.ok(bornGloss);
    assert.equal(bornGloss.en, 'born');
    const menGloss = words.find((w) => w.zh === '人' && w.role === 'gloss');
    assert.ok(menGloss);
    assert.equal(menGloss.en, 'men');
    const nature = words.find((w) => w.zh === '性本善');
    assert.ok(nature);
    assert.equal(nature.en, 'good nature');
    const near = words.find((w) => w.zh === '性相近');
    assert.ok(near);
    assert.equal(near.role, 'span');
    assert.equal(near.en, 'with the same');
    assert.equal(near.enStart, 17);
    const nearGloss = words.find(
      (w) => w.zh === '性相近' && w.role === 'gloss',
    );
    assert.ok(nearGloss);
    assert.equal(nearGloss.en, 'same');
  });
});
