import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readerContainerStyle } from '../src/lib/readerScale.ts';

describe('readerContainerStyle', () => {
  it('scales px-sized reader text with the header control', () => {
    // The reader renders text with fixed-px classes, so inheriting
    // font-size leaves them unmoved. The container style must carry a
    // mechanism that scales px text (zoom), not font-size inheritance.
    assert.equal(readerContainerStyle(1.2).zoom, 1.2);
    assert.equal(readerContainerStyle(0.85).zoom, 0.85);
    assert.ok(!('fontSize' in readerContainerStyle(1.2)));
  });
});
