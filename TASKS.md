[x] A real segmenter.  Chinese word segmentation is now heuristic. Greedy longest-match over the existing WordAlign set can mis-split a character
    sequence that isn't in the alignment table; the per-character fallback bounds the damage, but hover granularity in
    Chinese-primary mode will occasionally be one character where a two-character word exists.


[x] app might take data and actively convert it to .epub
along with one of the formats designed specifically 
for storing original text alongside its translations.
Done 2026-11-12 (audit fix 7c): Document Tools downloads the open
book as .epub (src/lib/epub.ts — a dependency-free EPUB 3 generator:
store-only ZIP, one XHTML per section, Chinese paragraph followed by
its translation; validated by unit tests that re-read the archive
and by Python zipfile) and as .tmx (src/lib/tmx.ts — TMX 1.4, one
translation unit per sentence, source + active translation).

[x] Reading mode: add pagination as a display setting alongside the default
  continuous scroll. Paginated mode pages the reader column and keeps a
  stable footer (document position, page indicator) fixed at the bottom
  of the reading area while pages change above it.
  Done 2026-11-12 (audit fix 7b): "Paginated Reading / 分页" in Display
  Options (desktop + mobile), persisted in the settings record. A page
  is one section; the reader renders only the active section and the
  footer carries Prev/Next, the section title, "Section n of N" and
  the percentage through the book. Position restore points the nav at
  the stored anchor first so its section renders, then scrolls.

[x] Private labeling / white labeling: rename the app and bundle it on a
  website with just a given set of texts, features, and defaults. Done via
  `src/brand.config.ts` (single editable file: `texts`, `theme`, `features`,
  `defaults`) merged over `src/brand.ts` defaults; `npm run build`, host
  `dist/`. Unknown keys and mistyped values fall back to the default brand,
  and disabled features are hidden in the UI and forced off in defaults.
