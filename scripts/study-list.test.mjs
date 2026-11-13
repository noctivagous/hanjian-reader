import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  addStudyItem,
  parseStudyList,
  removeStudyItem,
  serializeStudyList,
  studyListHas,
} from '../src/lib/studyList.ts';

describe('study list store', () => {
  it('adds, dedupes and reports membership', () => {
    const first = addStudyItem([], '永', 100);
    assert.equal(first.added, true);
    assert.deepEqual(first.items, [{ char: '永', addedAt: 100 }]);

    const again = addStudyItem(first.items, '永', 200);
    assert.equal(again.added, false);
    assert.equal(again.items, first.items); // unchanged, same reference

    assert.equal(studyListHas(first.items, '永'), true);
    assert.equal(studyListHas(first.items, '木'), false);
  });

  it('removes by character', () => {
    const items = [
      { char: '永', addedAt: 1 },
      { char: '木', addedAt: 2 },
    ];
    assert.deepEqual(removeStudyItem(items, '永'), [{ char: '木', addedAt: 2 }]);
    assert.deepEqual(removeStudyItem(items, '林'), items);
  });

  it('round-trips through storage', () => {
    const items = [
      { char: '永', addedAt: 1 },
      { char: '水', addedAt: 2 },
    ];
    assert.deepEqual(parseStudyList(serializeStudyList(items)), items);
  });

  it('tolerates malformed storage', () => {
    assert.deepEqual(parseStudyList(null), []);
    assert.deepEqual(parseStudyList('not json'), []);
    assert.deepEqual(parseStudyList('{"char":"永"}'), []);
    assert.deepEqual(
      parseStudyList(
        JSON.stringify([
          { char: '永', addedAt: 5 },
          { char: '永', addedAt: 6 }, // duplicate collapses
          { char: 42, addedAt: 7 }, // bad char dropped
          { addedAt: 8 }, // missing char dropped
          'junk',
          { char: '木' }, // missing addedAt defaults to 0
        ]),
      ),
      [
        { char: '永', addedAt: 5 },
        { char: '木', addedAt: 0 },
      ],
    );
  });
});
