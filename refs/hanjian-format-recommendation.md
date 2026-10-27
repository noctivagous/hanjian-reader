# HanJian format recommendation

Response to `refs/translation-file-formats.md` and `TASKS.md`, for an app whose
first real book will be the Tao Te Ching, whose document may contain multiple
translations of the same sentence, which will be downloadable by the user, which
needs a left side panel for browsing sections of a book, and which will later let
the user drop a Chinese text onto the app.

## Recommendation in one line

Do not make TMX, XLIFF, or EPUB the app's internal format. Use a versioned
HanJian JSON document as the source of truth, then generate downloadable EPUB
and TMX from it.

The research in `refs/translation-file-formats.md` is broadly accurate, but it
answers a different question than this app needs. Those formats are interchange
formats. HanJian needs a reading model first.

## Where the current app stands

The current model cannot support the Tao Te Ching plan without changes:

- `src/data/types.ts` has `Doc -> Paragraph -> Sentence`, with exactly one `en`
  and one `zh` per sentence. No sections/chapters, no multiple translations, no
  translator metadata.
- There is no book navigation. The reader is one continuous 760px column with
  paragraph numbers in `src/components/Reader.tsx`, and document switching is a
  `<select>` in `src/components/Header.tsx`.
- The only sidebar is the right-hand 360px tools/inspector panel in
  `src/components/Sidebar.tsx`.
- "Download" today means copy-to-clipboard buttons, not a file.
- Import in `src/lib/segment.ts` requires *both* English and Chinese pasted,
  then aligns by paragraph/sentence index. That breaks when counts differ -
  and they will differ across Tao translations.

## Format verdict

| Format | Best role here | Verdict |
|---|---|---|
| HanJian JSON | Internal model, download, re-import | Canonical |
| EPUB | Reading download for other apps | Generate, don't store |
| TMX | CAT-tool / translator reuse | Export, embed in EPUB |
| XLIFF | Localization handoff | Skip for now |
| PO, DOCX, XLSX | Wrong domain / presentation only | Skip |

Two corrections to the implications of the refs doc:

- **Embedding TMX in an EPUB works, but nothing reads it.** As the doc itself
  notes, Apple Books and Kindle ignore it and EPUB JavaScript is too restricted
  to reliably `fetch()` it. So the EPUB must have readable bilingual XHTML
  *baked in at generation time* - `lang`/`xml:lang`-tagged Chinese and English
  per segment, with a real EPUB nav/TOC. The embedded TMX is a bonus for
  re-import and CAT tools, never the mechanism.
- **TMX does not natively model "3 English translations of one Chinese
  sentence."** A `<tu>` holds one `<tuv>` per language. Multiple same-language
  variants need a non-standard property to say which translator each is. Our
  JSON should model that properly; TMX export can flatten to the selected
  translation, or emit one TU per translation with translator metadata.

## Proposed data model

Extend, don't replace, the existing types:

```ts
interface Translation {
  id: string;            // "legge-1891"
  translator: string;
  label: string;         // "Legge (1891)"
  language: string;      // "en"
  text: string;
  license?: string;      // "public-domain"
  words: WordAlign[];    // alignment belongs to a translation, not the sentence
}

interface Sentence {
  id: string;            // "ttc-01-03"
  zh: string;            // source is the anchor
  translations: Translation[];
}

interface Section {      // chapter
  id: string;            // "ttc-01"
  titleZh: string;       // 第一章
  titleEn: string;
  paragraphs: Paragraph[];
}

interface Doc {
  format: "hanjian"; version: 1;
  id: string; titleEn: string; titleZh: string; author: string;
  sourceLanguage: "zh";
  sections: Section[];
}
```

Key decisions in that shape:

- **Chinese is the anchor, English is a variant.** Today English is primary
  (`en` on the sentence). For a multi-translation book that inverts: one `zh`,
  N translations. The reader stays English-first visually; the data stops
  pretending there's one English.
- **`words` moves under `Translation`.** Word alignment is a property of a
  specific translator's wording. Legge's alignment is meaningless for another
  translation.
- **Stable sentence IDs** (`ttc-01-03`). These are what make TMX export, EPUB
  anchors, left-panel deep links, and future dropped-in translations align
  reliably instead of by index.
- **License per translation.** This matters immediately for the Tao: Legge
  (1891) is public domain; Stephen Mitchell's is not. Ship public-domain
  translations first, and record the license in the file so downloads carry
  attribution.

For the Tao specifically: 81 chapters map cleanly to 81 `Section`s. Within a
chapter, segment by line/verse unit, not by running the English sentence
splitter in `src/lib/segment.ts` - classical Chinese punctuation is editorial,
and translators break lines differently. Hand-curate this one file; don't
auto-segment it.

## Left panel

Add a left nav, keep the right tools panel. Three-pane layout: nav ~264px |
reader | tools 360px.

- Book title at top, then the chapter list: number, Chinese title, English
  title, sentence count.
- Click scrolls to that section (sections need anchor IDs and
  `scroll-margin-top` under the 64px header); highlight the chapter currently
  in view via scroll-spy.
- A filter box for jumping ("chapter 42", 德).
- Collapsible on desktop, reusing the existing collapse pattern; a slide-over
  drawer on mobile, since the right panel already becomes a bottom sheet
  there.
- This panel should also become the document library later - book -> chapters
  is the same tree at two depths.

Multiple translations in the UI: a translator picker in the left panel (or
header) sets the active translation for the whole book. A per-sentence
"compare" affordance stacks all translations under the Chinese. Default to one
active translation so the existing Words/Sentences/Paragraphs/Full reveal
modes keep working unchanged.

## Downloads, and TASKS.md

The two-line TASKS note is the right instinct, with the order flipped: the app
should *hold* HanJian JSON and *convert on download*, not take data in as
EPUB/TMX.

Offer three downloads per book:

1. **`.hanjian.json`** - lossless, re-importable into HanJian. This is the
   archival file.
2. **`.epub`** - generated in-browser (zip + OPF/nav/XHTML templates; needs one
   zip dependency, no backend). Parallel segments baked into XHTML, chapter
   TOC from `sections`, `lang` attributes throughout, TMX embedded as a
   manifest resource.
3. **`.tmx`** - selected translation only, for translators and CAT tools.

Skip XLIFF until someone actually hands you a localization workflow; it's
segment-state machinery this app doesn't need yet.

## Future Chinese-text drop

Design for it now, cheaply:

- Accept drops on the whole window with a drop overlay. Accept `.txt`/`.md`
  first; `.hanjian.json`, `.tmx`, `.epub` importers later behind the same
  entry point.
- Generalize `importCustomDoc` in `src/lib/segment.ts` into
  `importChineseDoc(text)`: Chinese is required, translations optional and
  empty. Split chapters on `第X章` markers and blank lines; a dropped text
  becomes a `Doc` with `translations: []`, rendered Chinese-primary with
  "no translation yet" state per sentence.
- That is exactly the shape that lets someone later drop in a translation and
  have it attach by section/sentence position - which is why stable IDs and
  the Chinese-anchored model pay off.

## Suggested order

1. New types (`Section`, `Translation`, `words` relocation) + migrate the two
   sample docs.
2. Left nav panel with scroll-spy, driven by `sections`.
3. Tao Te Ching as the first real book: 81 sections, Chinese source + Legge to
   start, curated as a data file loaded on demand rather than bundled into the
   main JS.
4. Translator picker + per-sentence compare view.
5. Downloads: JSON first (trivial), then TMX, then EPUB generation.
6. Drag-and-drop Chinese import.
