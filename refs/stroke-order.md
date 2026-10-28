# Stroke Order: findings for a later addition

## Recommendation

Use [hanzi-writer](https://hanziwriter.org/docs.html) (MIT, ~30KB dist /
9KB gzip, v3.7.x) plus
[hanzi-writer-data](https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/%E4%B8%AD.json)
per-character JSON. It is the only candidate with animation plus a graded
freehand stroke-order quiz. Do not use `cnchar-draw` as the animator.

## Current repo state

- React 19 + Vite 8 + Tailwind 4. Stroke Order today is a placeholder:
  `src/components/CharInspector.tsx` (lines ~26-27, ~68-99) renders up to
  5 generic `M 15+i*14` SVG paths with a CSS `stroke-draw` animation from
  `src/index.css` (~56-60), not real glyph strokes.
- No stroke library or data is installed: no hanzi/cnchar dependency in
  `package.json`, no stroke SVG/JSON in `src` or `public`.
- Greenfield install. Wire point: `CharInspector inspectedChar` ->
  new `src/components/StrokeOrder.tsx`.

## Candidates

### hanzi-writer + hanzi-writer-data (recommended)

- API: `HanziWriter.create(el, char, {...})`, `animateCharacter()`,
  `loopCharacterAnimation()`, `animateStroke(i)` / `highlightStroke(i)`
  (0-indexed), `quiz({...})`, `cancelQuiz()`, `setCharacter`,
  `show/hideCharacter`, `show/hideOutline`, `updateColor`,
  `charDataLoader`, `loadCharacterData`, `getScalingTransform`.
- Quiz payloads: `onCorrectStroke` / `onMistake({strokeNum,
  mistakesOnStroke, totalMistakes, strokesRemaining, drawnPath})`,
  `onComplete({character, totalMistakes})`; options `leniency (~1.2)`,
  `showHintAfterMisses`, `quizStartStrokeNum`, `acceptBackwardsStrokes`,
  `highlightOnComplete`, `markStrokeCorrectAfterMisses`.
- Data shape per char: `{strokes: [svg d], medians: [[[x,y]...]],
  radStrokes: [...]}`; coords x 0..1024, y 900..-124, y-up; stroke
  start is `medians[i][0]`.
- Coverage ~9000+ chars with known rare-variant gaps; full repack is
  MBs, so lazy per-char load is recommended.
- Library MIT. Glyph data derives from Make Me a Hanzi / Arphic 1999
  fonts: ship Arphic Public License attribution for stroke outlines.

### cnchar + cnchar-draw 3.2.6 (complement, not replacement)

- MIT, modes normal/animation/stroke/test, single-stroke mode via
  `autoAnimate: false`. Test mode is stepwise display with no graded
  freehand quiz. Maintenance low/inactive.
- Useful only for pinyin/stroke-count metadata via `cnchar-order`,
  not for animation or quiz.

### Rejected

- `scribing` (hanzi-writer fork): only if formal-font/offline packs
  are needed later.
- animCJK (LGPL-3.0) / KanjiVG: Japanese-only data.
- react-native wrappers: reuse the hanzi-writer core.

## What neither lib ships (custom work)

- Clickable / hoverable strokes: no built-in hit-targets. Implement
  raw-SVG mode (`loadCharacterData` + `getScalingTransform(...).transform`
  on a `<g>`, one `<path>` per stroke with own handlers calling
  `animateStroke(i)` / `highlightStroke(i)`), or an invisible hit-path
  overlay over the live writer.
- Numbered circles: no built-in badges. Place at stroke starts
  (`medians[i][0]`). Standalone diagram recipe: `<g
  transform="scale(1,-1) translate(0,-900)">paths</g>` with labels at
  `x=mx, y=900-my` (`paint-order: stroke`); live-writer overlay via
  `getScalingTransform` mapping. Naive median placement overlaps on
  dense characters (hanzi-writer#61) -- accept overlap in v1 or nudge
  colliding badges.

## Integration steps

1. `npm i hanzi-writer hanzi-writer-data`. Self-host needed JSON
   under `public/hanzi-data/<char>.json` (or vendor full set) with
   long cache headers; `charDataLoader: (char, onComplete) =>
   fetch(...).then(r => r.json()).then(onComplete)`; CDN fallback to
   jsDelivr when the offline pack misses.
2. New `src/components/StrokeOrder.tsx` replacing the placeholder
   panel: div ref + `useEffect` create/destroy (`cancelQuiz` on
   unmount/char change); loading/error states; missing-char fallback
   to `charDict.ts` stroke count; Arphic attribution.
3. Controls: Play, Loop toggle, Step +/-, Quiz mode, radical toggle
   (`showOutline` + `radicalColor`).

## Effort estimate

- S (0.5d): install + self-hosted `charDataLoader` + Play/Loop writer
  in `CharInspector`.
- M (1-2d): step controls + quiz + loading/error states +
  missing-char fallback + attribution.
- M (1-2d): clickable-stroke overlay + numbered-circle badges with
  overlap handling.
- Total: ~1-2 days basic animate+quiz; ~3-4 days with clickable
  strokes, numbered badges, and offline pack.

## Unverified at research time

- Exact `hanzi-writer-data` total char count / full-dataset bytes
  (run `npm view hanzi-writer-data` at install).
- `cnchar-draw` exact minified KB (check bundlephobia; larger than
  hanzi-writer due to bundled data).
