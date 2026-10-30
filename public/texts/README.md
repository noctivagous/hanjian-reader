# `public/texts/` — public-domain parallel texts in XLIFF (committed)

Texts here are **public domain** (unlike `private/`, which holds
in-copyright sources and is gitignored). Everything in this directory is
**committed and shipped** (Vite copies `public/` to `dist/` verbatim). The
app loads them at runtime through `manifest.json`. The default opening book
is **Three Character Classic** (`three-character-classic`); Tao Te Ching
never lives here — it is built locally from gitignored `private/` sources.

## Adding a text

1. Write the XLIFF (1.2 or 2.0), e.g. `my-text.xlf`, following the contract
   below. Source (`<source>`) is Chinese, target (`<target>`) is English;
   every unit needs both sides non-empty.
2. Register it in `manifest.json` (`id`, `file`, titles, author,
   `sourceLanguage`, `script`, default `translator`, `license`).
3. Open the app: the text appears after the bundled docs (and before any
   `private/` book, which always loads last).

### Optional word-alignment sidecar

An entry may set `alignmentFile` to a JSON file in this directory. Its
`units` object is keyed by XLIFF unit ID, and each value is an ordered array
of `{ en, zh, pinyin, def, role, enStart, enEnd }` records.

Two roles on the same literary English line (the Span / Gloss pill only
changes which ranges are underlined):

- **`span`** — phrase/clause offsets into the unit's English `text`.
  Sidecar files require offsets; missing `role` is treated as `span`.
- **`gloss`** — the authored lexical English for that Chinese unit (the
  needle), not every word of the literary clause. Bundled sample docs store
  both. If a text only has glosses, span underlines are matching
  comma-clauses.

**Three Character Classic** (`three-character-classic`) stores curated
pairs in `scripts/three-character-classic-alignments-part*.mjs`; re-run
`node scripts/build-three-character-classic.mjs` after editing them.
The build writes a **span** (left-expanded clause, unless `exact: true`)
and a **gloss** (the authored `en` needle) for each pair.

## XLIFF contract

Parsed by `src/lib/xliffParallel.ts` (covered by
`scripts/xliff-parallel.test.mjs`):

- One or more `<file>` elements per XLIFF; groups concatenate in order.
- `<group>` is a **section**. Its optional `resname` gives the titles as
  `English title|Chinese title` (split on the first `|`); without it the
  section is untitled. A `<group>` nested inside a section is one
  **paragraph** holding several sentences.
- `<trans-unit>` (1.2) or `<segment>` (2.0) is one **sentence**:
  `<source>` Chinese, `<target>` English. An optional `<note>` starting
  with `translator:` overrides the manifest's default credit for that unit
  (used to mark editorial gap-fill translations honestly).
- Inline markup inside source/target is dropped, keeping its text; CDATA,
  entities, and namespace prefixes are handled. Malformed XML or an empty
  side fails loudly at parse time; at runtime a bad file is skipped with a
  dev-mode warning so the rest of the app still loads.

## Regenerating the Three Character Classic

`three-character-classic.xlf` is generated, not hand-written:

```sh
node scripts/build-three-character-classic.mjs
```

It combines the 76 English stanzas in
`public/threeCharacterClassic.txt` (kept verbatim) with the traditional
Chinese sequence, filling the passages that translation skips (marked
`translator: Editorial supplement` per unit). Re-run after editing the
`.txt`; the script verifies stanza count, full triplet coverage, and the
curated English–Chinese alignment table before generating both the XLIFF and
`three-character-classic.alignments.json`.
