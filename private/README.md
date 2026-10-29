# `private/` — local-only book sources (never committed)

The Feng & English *Tao Te Ching* translation (*The Complete Tao Te Ching*,
Vintage 1972/1989) is in copyright, so it lives here — outside git — instead
of in `src/data/`. Anything you put in this directory (except this README and
`.gitkeep`) is ignored via `.gitignore` (`private/*`), as is the generated
module the build script emits (`src/data/tao-te-ching.generated.*`).

## What goes here

Two input styles — XLIFF when you have it (preferred: explicit sentence
alignment plus real tooling support), `.txt` otherwise. If both are present,
the XLIFF file wins.

- `tao-te-ching.xlf` (or `.xliff`) — XLIFF 1.2 or 2.0 carrying both
  languages. Either 81 `<file>` elements as chapters, or 1 `<file>` with 81
  `<group>` (or 81 `<unit>`) chapters. Inside a chapter, `<group>` = paragraph (absent =
  single paragraph); `<trans-unit>` (1.2) or `<segment>` (2.0) = sentence,
  with `<source>` = Chinese and `<target>` = English. Every unit needs
  non-empty `<source>` and `<target>`. Example (1.2):

  ```xml
  <xliff version="1.2">
    <file original="tao" source-language="zh" target-language="en">
      <body>
        <group>
          <trans-unit id="ch1-s1">
            <source>道可道，非常道。</source>
            <target>The tao that can be told is not the eternal Tao.</target>
          </trans-unit>
        </group>
      </body>
    </file>
    <!-- … 80 more <file> chapters … -->
  </xliff>
  ```

  Inline tags inside `<source>`/`<target>` (`<g>`, `<x/>`, `<ph/>`, …) are
  dropped, keeping their text. CDATA sections, entities, and namespace
  prefixes are handled; malformed XML fails loudly. The reader is covered
  by `scripts/xliff-docs.test.mjs` (`npm test`).

- `tao-te-ching.en.txt` — your copy of the Feng & English translation.
  Chapters 1–81 in order. Each chapter is one block; separate chapters with
  a line containing exactly `---` on its own line. Inside a chapter, a blank
  line starts a new paragraph. Example:

  ```text
  The tao that can be told
  is not the eternal Tao.

  ---
  When people see some things as beautiful,
  other things become ugly.
  ```

- `tao-te-ching.zh.txt` (optional, `.txt` mode only) — the Chinese text,
  same block layout (81 `---`-separated chapters). When absent, the
  generator fetches the public-domain Wang Bi received text from Chinese
  Wikisource at generation time; when present, the local file wins and no
  network is needed. XLIFF mode carries both languages, so no zh file
  is needed there.

## Source curations

The `.txt` files were extracted once from the public sources (Terebess HTML,
Wikisource wikitext) with these cleanups applied at extraction; the same
rules live in the generator's Wikisource path for future fetches:

- Wikisource `:{...}` commentary lines, `{{...}}` templates, `<ref>` notes,
  `跋`/音義 appendices, and single-`=` section headings dropped (canon text
  only); `-{谷}-` variant markers resolved to the shown form; `「」` quotes
  and stray spaces removed; `﹗` normalized to `！`; one half-width `,`
  typo fixed to `，`.
- Terebess orange number-word headings, the post-chapter-81 colophon/essay,
  and the `[First Vintage Books edition, 1972: …]` collation note in
  chapter 60 removed (not translation).

## Alignment

- `tao-te-ching.overrides.json` (same directory, also never committed) holds
  hand alignments per chapter: `{ "<n>": [ [ { zh, en }, … ] ] }`. The
  automatic clause grouping is positional and drifts wherever translators
  pack clause boundaries mid-line, so 75 of 81 chapters carry explicit
  pairings (6 needed none: 1, 9, 11, 40, 47, 79). The generator verifies
  every override sentence against its chapter's sources and requires full
  two-sided coverage — additions, losses, and edits fail loudly.
- Each override sentence may include **`words`**: `[ { "en": "Tao", "zh": "道" },
  … ]` (Courtyard Rain style — omit English with no Chinese). Regenerate with
  `node scripts/generate-tao-hover-overrides.mjs` (Jiayan +
  `scripts/tao-te-ching-glossary.mjs` + CC-CEDICT). The build resolves
  `enStart`/`enEnd` and writes `tao-te-ching.alignments.json`.

## Building the local book

```sh
node scripts/build-tao-te-ching.mjs
```

This reads the files above and emits the gitignored module
`src/data/tao-te-ching.generated.ts`, which the app picks up automatically
via `src/data/localDocs.ts` (no code changes needed). With no generated
file present, the app builds and runs with just the two sample docs.

## Rules

- Never `git add -f` anything in this directory (other than this README).
- Never paste the translation into a committed file, issue, or PR.
- Do not deploy a build made with the private book publicly without
  permission from the rights holder. See `refs/tao-te-ching-plan.md` P0-5.
