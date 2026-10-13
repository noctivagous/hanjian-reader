## Goal

Rebuild `Hanjian-Reader.html` (single-file bundled React 18.3.1 artifact, ~218 KB) as a maintainable React + Vite + TypeScript project, preserving all current reading features with no behavior regressions.

## Success Criteria

- `npm run dev` serves the reader; `npm run build` produces a clean production bundle.
- All four reveal modes (Words `W`, Sentences `S`, Paragraphs `P`, Full `F`), display options, character inspector, search, and custom-document import work as described in `README.md`.
- Sample docs (*Courtyard Rain*, *Mending Clothes*) and the ~50-character dictionary survive the move intact.
- No minified-bundle code is carried over; only extracted data + theme tokens + behavior spec.

## Approach

Do NOT try to un-minify the bundle. The `<script type="module">` block (~194 KB) is minified React 18.3.1 runtime plus app code with ~30 `useState` calls — machine-generated output, not recoverable source. Treat the HTML file as a **behavioral spec + data mine**: harvest the structured data (sample docs, `charDict`), the theme tokens, and the interaction rules, then rebuild clean components on Vite. `README.md` already documents the data model, DOM conventions, and TTS usage — it is the primary spec.

Key decisions:

- **Scaffold**: fresh `npm create vite@latest` (react-ts template) in a new `hanjian-reader/` subdirectory, keeping the repo root untouched. Rejected: in-place conversion (no `package.json` exists; root is artifact + README only).
- **Styling**: keep Tailwind (it's the current styling system, compiled inline in the artifact) via the official Vite plugin, plus the CSS variables (`--paper`, `--ink`, `--verm`, etc.) moved to `src/index.css`. Rejected: CSS-module rewrite — unnecessary churn.
- **Data over code**: extract `SAMPLE_DOCS` + `charDict` with a one-off Node script that pulls string literals out of the bundle into `src/data/documents.ts` and `src/data/charDict.ts`, then hand-verify counts (2 docs, ~50 chars). Everything else is rewritten from the README spec.
- **No legacy shims**: per repo rules, no backward-compat layer for the old HTML file; the Vite app replaces it outright.

## Steps

1. **Scaffold** — `npm create vite@latest hanjian-reader -- --template react-ts`, add Tailwind Vite plugin + Google Fonts (Fraunces/Newsreader + Noto Serif SC) in `index.html`.
2. **Harvest data** — one-off script extracts embedded Chinese/English strings, pinyin, definitions into `src/data/documents.ts` (typed as `Doc`/`Paragraph`/`Sentence`/`WordAlign` per README) and `src/data/charDict.ts`; verify doc count (2) and dict size (~50) against the live HTML file.
3. **Theme + shell** — move CSS variables and base styles to `src/index.css`; build `App.tsx` layout: 760px column, header, right toolbar (desktop fixed / mobile bottom-sheet).
4. **Reader components** — `WordLayer`, `SentenceLayer`, `ParagraphLayer`, `FullDocView` (scroll-synced split), `CharInspector` modal, `ImportModal` (textarea pair, `\n\n` → paragraphs, `[.!?。！？]+` → sentences, index alignment), display-options controls, keyboard shortcuts (`W`/`S`/`P`/`F`).
5. **Services** — `src/lib/tts.ts` (`speechSynthesis`, `lang='zh-CN'`), `src/lib/segment.ts` (import splitting/alignment), tone-color map (1st red → 5th gray).
6. **Cutover** — confirm parity against the HTML artifact side-by-side, then delete or archive `Hanjian-Reader.html` (user confirms first).

## Validation Plan

- `npm run build` passes with zero TypeScript errors (highest-risk gate: mistyped harvested data — run `tsc --noEmit` right after Step 2).
- Manual parity checklist against the original file opened in a browser: each reveal mode, inspector fields (glyph, strokes, HSK, examples, notes), import/export round-trip, mobile drawer layout.
- Highest risk: word-alignment data for sample docs may extract imperfectly from the bundle — fallback is re-entering alignments by hand from the rendered HTML output.

## Risks / Open Questions

- **Risk**: auto-extracted alignment strings need cleanup; budget time for manual fix-up in Step 2.
- **Non-goal**: roadmap items (CEDICT, HanziWriter, Anki export) stay out.
- **Open question**: None — `go` starts at Step 1. (One confirmation needed at Step 6: delete vs. archive the old HTML file.)
