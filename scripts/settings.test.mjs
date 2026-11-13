import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultSettings,
  parseSettings,
  serializeSettings,
} from '../src/lib/settings.ts';

const defaults = defaultSettings({
  reveal: { words: true, sentences: false, paragraphs: false, full: false },
  showPinyin: true,
  showZhuyin: false,
  toneColors: true,
  defsInline: false,
  showSentenceChips: true,
  fontScale: 1,
  charSize: 1,
  showSpeakerButtons: true,
  speakOnClick: false,
  dark: false,
  showTip: true,
  sidebarCollapsed: false,
  navCollapsed: false,
  compareTranslations: false,
  pageMode: false,
});

describe('settings record', () => {
  it('round-trips', () => {
    const stored = {
      ...defaults,
      dark: true,
      fontScale: 1.25,
      reveal: { words: false, sentences: true, paragraphs: false, full: false },
      notes: { '永': 'eternity' },
      positions: { tao: 'ch-12' },
    };
    assert.deepEqual(parseSettings(serializeSettings(stored), defaults), stored);
  });

  it('falls back wholesale on missing, corrupt or future-version data', () => {
    assert.equal(parseSettings(null, defaults), defaults);
    assert.equal(parseSettings('{nope', defaults), defaults);
    assert.equal(parseSettings('"just a string"', defaults), defaults);
    assert.equal(
      parseSettings(JSON.stringify({ version: 99, dark: true }), defaults),
      defaults,
    );
  });

  it('degrades field-by-field on partial corruption', () => {
    const parsed = parseSettings(
      JSON.stringify({
        version: 1,
        dark: 'yes please', // not a boolean -> default
        showPinyin: false, // valid
        fontScale: 42, // out of range -> default
        charSize: 0.8, // valid
        reveal: { words: 'x', sentences: true },
        notes: { '永': 'ok', '木': 3, '水': 'also ok' },
        positions: { doc1: 'sec-2', doc2: null },
      }),
      defaults,
    );
    assert.equal(parsed.dark, false);
    assert.equal(parsed.showPinyin, false);
    assert.equal(parsed.fontScale, 1);
    assert.equal(parsed.charSize, 0.8);
    assert.deepEqual(parsed.reveal, {
      words: true,
      sentences: true,
      paragraphs: false,
      full: false,
    });
    assert.deepEqual(parsed.notes, { '永': 'ok', '水': 'also ok' });
    assert.deepEqual(parsed.positions, { doc1: 'sec-2' });
  });
});
