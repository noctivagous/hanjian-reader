[x] A real segmenter.  Chinese word segmentation is now heuristic. Greedy longest-match over the existing WordAlign set can mis-split a character
    sequence that isn't in the alignment table; the per-character fallback bounds the damage, but hover granularity in
    Chinese-primary mode will occasionally be one character where a two-character word exists.


- app might take data and actively convert it to .epub
along with one of the formats designed specifically 
for storing original text alongside its translations.

- Reading mode: add pagination as a display setting alongside the default
  continuous scroll. Paginated mode pages the reader column and keeps a
  stable footer (document position, page indicator) fixed at the bottom
  of the reading area while pages change above it.

[x] Private labeling / white labeling: rename the app and bundle it on a
  website with just a given set of texts, features, and defaults. Done via
  `src/brand.config.ts` (single editable file: `texts`, `theme`, `features`,
  `defaults`) merged over `src/brand.ts` defaults; `npm run build`, host
  `dist/`. Unknown keys and mistyped values fall back to the default brand,
  and disabled features are hidden in the UI and forced off in defaults.
