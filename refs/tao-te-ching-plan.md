## Do First — Prerequisites (before any Tao text lands)

These come first, in this order. The *Tao Te Ching* is the app's first
traditional-character, classical-Chinese text; the two bundled docs are modern
simplified. Landing the text before these are done would ship a book whose
characters mostly show `—` in the inspector and whose script is nowhere
distinguished from the simplified docs.

### P0-1. Make simplified vs traditional a first-class distinction

- Add a script field to the document model in `src/data/types.ts` (today
  `Doc` has only `sourceLanguage: 'zh'`; nothing records script). Recommended:
  `script: 'simplified' | 'traditional'`. Tag the two existing docs
  `simplified`; the *Tao Te Ching* will be `traditional`. Keep the Chinese
  text itself exactly as sourced — no simplified↔traditional conversion
  anywhere in the pipeline.
- Surface it in the UI: append `· 繁體` / `· 简体` to the dropdown option
  text and the nav heading in `src/components/NavSidebar.tsx`, and to the
  byline in `src/components/Reader.tsx`. A reader must be able to tell which
  script a book is in before opening it.
- Search must not silently fail across scripts: searching simplified `经`
  should find traditional `經` (and vice versa). Add a small
  traditional↔simplified folding map for search matching only (display text
  is never rewritten), reused by the nav filter in `NavSidebar.tsx` and the
  in-text highlight in `Reader.tsx`.
- Fonts: `index.html` loads only Noto Serif SC. Traditional glyphs render,
  but with SC glyph forms. Add Noto Serif TC to the font stack and select it
  for `traditional` docs (e.g. a `serif-tc` class alongside `serif-sc`).

### P0-2. Dictionary / readings layer for characters the app has never seen

- Today `src/data/charDict.ts` covers 82 characters, all from the two sample
  stories. Checked against chapter 1's vocabulary: 道， 德， 經， 萬， 無，
  為， 玄， 牝， 眾， 妙， 門 are all absent (only 天 is present).
  `src/components/CharInspector.tsx` therefore shows `—` / "Tap to add
  definition" for nearly every character in the book.
- Follow the staging already recommended in `refs/chinese-dictionary.md`
  (step 2, "With the Tao Te Ching"): generate a small per-book readings file
  from CC-CEDICT — which carries traditional and simplified headwords in one
  file — covering only the *Tao Te Ching*'s distinct characters and words
  (pinyin + definition). Kilobytes, shipped with the book, not the full
  dictionary in the main bundle.
- Hand-review polyphonic characters in classical context （為 wéi/wèi, 行
  xíng/háng, 重 zhòng/chóng, 樂 lè/yuè, 長， 知， etc.). A word-level entry
  resolves most; single-character fallbacks do not. Note CC-CEDICT follows
  modern Putonghua norms, so flag any reading where classical usage differs.
- Wire lookup order in `CharInspector.tsx` / `src/components/WordCard.tsx`:
  hand-written `charDict` first, then the per-book readings file, then the
  current `—` fallback. HSK badges are meaningless for classical vocabulary —
  render `—` (current fallback) rather than inventing levels.
- Record the CC-CEDICT release version and download date in the generated
  file header, and add the CC BY-SA 4.0 attribution to the README/credits.
  ShareAlike applies to derivative dictionary data, not app code; keep the
  hand-reviewed readings' provenance documented per
  `refs/chinese-dictionary.md`.

### P0-3. Stroke-order data for traditional characters

- `public/hanzi-data/` holds JSON for only the same 82 sample characters.
  `src/components/StrokeOrder.tsx` already falls back to the
  hanzi-writer-data CDN, which covers traditional characters — verify 經，
  萬， 無， 為 animate correctly, then self-host the generated subset for the
  book's distinct characters so the book works offline. Keep the existing
  Make Me a Hanzi / Arphic attribution (`refs/stroke-order.md`).

### P0-4. Decide the word-level scope, using P0-2

- With `words: []` (the imported-doc precedent in `src/lib/segment.ts`), word
  hover, inline pinyin/zhuyin, and tone colors do nothing; `Reader.tsx`
  falls back to per-character Chinese. That is the minimum viable book.
- The P0-2 readings file makes the better option cheap: run the existing
  greedy longest-match segmenter (`src/lib/tokenize.ts`, the open item at
  the top of `TASKS.md`) over each sentence against the book's word list to
  generate `words` alignments, with English glosses from the dictionary —
  not word-for-word claims about the Feng/English verse. Decide before
  generating data (Step 3 below): sentence-level only, or dictionary-derived
  word alignments. Do not hand-write 81 chapters of word alignments.

### P0-5. Licensing gate for the translation

- The Chinese original is public domain. The Feng/English translation is
  *The Complete Tao Te Ching*, Vintage Books 1972/1989; Jane English
  (b. 1942) is living, so it is in copyright, and Terebess hosting it is not
  a redistribution license. Bundling for local/personal use proceeds as
  requested; confirm permission or restrict distribution before any public
  deployment, and record the outcome in the translation's `license` field.

## Goal

Add the *Tao Te Ching* as a third bundled text in the existing book
dropdown: original Chinese (traditional, Wang Bi received text) paired with
the Gia-fu Feng & Jane English translation from Terebess, readable with all
existing reveal modes.

## Success Criteria

- Prerequisites P0-1 to P0-4 are done (P0-5 recorded) before the book data
  is generated.
- `Tao Te Ching · 道德經 · 繁體` appears in the dropdown in both the desktop
  nav sidebar and the mobile drawer, alongside the two existing sample docs.
- All 81 chapters load, in order, with no chapter missing Chinese or English
  text, and clicking characters in the book shows real pinyin/definitions
  for the great majority of its distinct characters.
- English-primary and Chinese-primary modes, sentence chips, paragraph/full
  reveal, cross-script search, paragraph speech buttons, and per-character
  click all work on it.
- `npm run build` and `npm run lint` pass.

## Approach

The dropdown needs no new UI component: `src/components/NavSidebar.tsx`
renders a `<select>` over the `docs` prop, fed from `seedDocs` in
`src/App.tsx`. Appending one well-formed `Doc` to `src/data/documents.ts`
puts it in both dropdowns automatically.

Mapping to the existing model in `src/data/types.ts`:

- **Doc**: `id: 'tao-te-ching'`, `titleEn: 'Tao Te Ching'`,
  `titleZh: '道德經'`, `author: 'Laozi · 老子'`, `sourceLanguage: 'zh'`,
  plus the new `script: 'traditional'` from P0-1.
- **Section = chapter** (81 sections). `titleEn: 'Chapter 1'` …,
  `titleZh: '第一章'` … `'第八十一章'`, matching the source headings. This
  also makes the existing nav filter (`chapter 42`, already supported) and
  the section list useful instead of one giant untitled section.
- **Paragraph/Sentence**: within each chapter, sentences are Chinese clauses
  (split on `。；！？`) each paired with the corresponding English lines from
  the Terebess page joined as prose. `translations[0]` carries
  `translator: 'Gia-fu Feng & Jane English'` and the `words` decided in
  P0-4.
- **Generated, checked-in data file**, not hand-edited JSON inside the
  already 718-line `src/data/documents.ts` and not runtime fetching (the app
  is a static bundle; runtime scraping would break offline and hit
  anti-scraping walls — ctext.org already refuses scrapers).

## Steps

1. Do P0-1 to P0-4 above; record P0-5.
2. **Write a one-off generator** `scripts/build-tao-te-ching.mjs` (plain
   Node, no new dependencies):
   - Fetch the Terebess page; extract chapters 1–81 via its `Kap01`…`Kap81`
     anchors / `One`…`Eighty-one` headings; strip markup, collapse verse
     line-breaks into sentences, keep blank-line paragraph breaks.
   - Fetch the Wang Bi text from Chinese Wikisource; extract `一章`…
     `八十一章`; strip markup/editorial brackets; normalize whitespace and
     punctuation spacing. Save both raw extracts under `scripts/tao-src/`
     so regeneration is reproducible and diffable.
   - Cross-check the distinct-character list against P0-2/P0-3 outputs so
     readings and stroke data cover exactly the characters the book uses.
3. **Align in the generator, verify by hand**: split each Chinese chapter on
   `。；！？`, group the English lines to match clause-by-clause, and emit a
   draft. Hand-check every chapter where automatic clause/line counts
   diverge, and fully proof chapters 1, 2, 25, 42, 64, and 81 against both
   sources. The generator fails loudly on: chapter count ≠ 81, any empty
   Chinese or English side, or any source line/character left unaccounted
   for.
4. **Emit `src/data/tao-te-ching.ts`** exporting `taoTeChing: Doc` (ids:
   `tao`, `tao-ch1`…, `tao-ch1-p1`, `tao-ch1-p1s1`…), with `translator`
   set. In `src/data/documents.ts`, import it and append it to the `docs`
   array — no changes needed to `App.tsx` or the dropdown itself.
5. **Attribution in the UI**: since `translator`/`license` are in the data
   model but displayed nowhere, append the credit to the visible byline:
   `author: 'Laozi · 老子 · trans. Gia-fu Feng & Jane English'`. It renders
   in both the reader header and nav sidebar with no component changes.
6. **Update `README.md`**: "Two fully-aligned sample documents" → three,
   noting the *Tao Te Ching* is traditional script, its alignment level
   (per P0-4), its sources, the CC-CEDICT attribution, and the P0-5 caveat.

## Validation Plan

- Generator self-check output: `81 chapters, N sentences, 0 empty sides,
  0 unaccounted source lines/chars` — must be clean before the data file is
  accepted. Report distinct-character coverage of the P0-2 readings file and
  P0-3 stroke data (target: 100% of characters used in the book; list any
  exceptions).
- Unit-level checks for the new pieces: script folding maps 經→经 and
  門→门 (and back) without touching display text; the two existing docs are
  tagged `simplified` and render/search exactly as before.
- `npm run build` (`tsc -b && vite build`) and `npm run lint` (oxlint)
  pass; note the bundle-size delta from ~81 chapters of bilingual text.
- Manual browser check (`npm run dev`): select `Tao Te Ching · 道德經 · 繁體`
  in the desktop dropdown and the mobile drawer; in both primary-language
  modes toggle words/sentences/paragraphs/full (W/S/P/F); open a sentence
  chip in chapters 1 and 81; filter nav by `chapter 42`, by traditional
  `道德`, and by simplified `道德经` (cross-script search); click 經， 萬，
  為 and confirm pinyin, definition, and stroke animation load; use a
  paragraph speaker button. Repeat a click/search check on a simplified doc
  to confirm no regression.
- Spot-check rendered chapter 1 against both sources character-for-character
  on the Chinese side.

## Risks / Open Questions

- **Copyright** (P0-5) is the main risk; it gates public deployment, not
  local implementation.
- **Textual variants**: the Wang Bi received text occasionally differs in
  wording from the text Feng & English translated from, so a few clauses
  will be near- rather than exact equivalents. Accepted; noted in README.
- **Classical readings**: CC-CEDICT modern Putonghua readings may differ
  from classical pronunciation for some characters; the P0-2 hand review
  mitigates but cannot eliminate this. Speech synthesis will read the
  traditional text with modern Mandarin regardless.
- Open questions: None. Assumptions: the existing two docs stay first in the
  dropdown (current default document unchanged); the *Tao Te Ching* ships
  traditional-only, with no in-app simplified rendering of it.

## Sources

- https://terebess.hu/english/tao/gia.html
- https://zh.wikisource.org/wiki/%E9%81%93%E5%BE%B7%E7%B6%93_(%E7%8E%8B%E5%BC%BC%E6%9C%AC)
- `refs/chinese-dictionary.md` (CC-CEDICT staging, licensing, traditional-first)
- `refs/stroke-order.md` (hanzi-writer data coverage and attribution)
