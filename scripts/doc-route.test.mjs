import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDocPath,
  completeDocRoute,
  locateInDoc,
  parseDocRoute,
  resolveRouteTarget,
  routeSegment,
} from '../src/lib/docRoute.ts';

const doc = {
  id: 'three-character-classic',
  sections: [
    {
      id: 'three-character-classic-part-1',
      paragraphs: [
        {
          id: 'three-character-classic-part-1-p1',
          sentences: [{ id: 'three-character-classic-s01' }],
        },
      ],
    },
  ],
};

describe('docRoute', () => {
  it('builds and parses /doc/{id}/{section}/{paragraph}/{sentence}', () => {
    const path = buildDocPath({
      docId: 'three-character-classic',
      sectionId: 'three-character-classic-part-1',
      paragraphId: 'three-character-classic-part-1-p1',
      sentenceId: 'three-character-classic-s01',
    });
    assert.equal(
      path,
      '/doc/three-character-classic/part-1/part-1-p1/s01',
    );
    assert.deepEqual(parseDocRoute(path), {
      docId: 'three-character-classic',
      sectionId: 'part-1',
      paragraphId: 'part-1-p1',
      sentenceId: 's01',
    });
  });

  it('respects a non-root base path', () => {
    const path = buildDocPath({ docId: 'courtyard-rain' }, '/reader/');
    assert.equal(path, '/reader/doc/courtyard-rain');
    assert.equal(parseDocRoute(path, '/reader/')?.docId, 'courtyard-rain');
  });

  it('resolves stripped segments back to DOM ids', () => {
    assert.equal(routeSegment('three-character-classic-part-1', doc.id), 'part-1');
    const route = parseDocRoute(
      '/doc/three-character-classic/part-1/part-1-p1/s01',
    );
    assert.equal(
      resolveRouteTarget(doc, route),
      'three-character-classic-s01',
    );
  });

  it('locates a paragraph click as section + paragraph + first sentence', () => {
    assert.deepEqual(locateInDoc(doc, 'three-character-classic-part-1-p1'), {
      docId: 'three-character-classic',
      sectionId: 'three-character-classic-part-1',
      paragraphId: 'three-character-classic-part-1-p1',
      sentenceId: 'three-character-classic-s01',
    });
  });

  it('completes a stripped deep-link without snapping to the first section', () => {
    const two = {
      ...doc,
      sections: [
        doc.sections[0],
        {
          id: 'three-character-classic-part-6',
          paragraphs: [
            {
              id: 'three-character-classic-part-6-p1',
              sentences: [
                { id: 'three-character-classic-s73' },
                { id: 'three-character-classic-s74' },
              ],
            },
          ],
        },
      ],
    };
    const completed = completeDocRoute(
      two,
      parseDocRoute('/doc/three-character-classic/part-6/part-6-p1/s73'),
    );
    assert.deepEqual(completed, {
      docId: 'three-character-classic',
      sectionId: 'three-character-classic-part-6',
      paragraphId: 'three-character-classic-part-6-p1',
      sentenceId: 'three-character-classic-s73',
    });
  });
});
