# `public/texts/` — public-domain parallel texts in XLIFF (committed)

Texts here are **public domain** (unlike `private/`, which holds
in-copyright sources and is gitignored). Everything in this directory ships
to readers: Vite copies `public/` to `dist/` verbatim, and the app discovers
these texts at runtime through `manifest.json` — no code changes or rebuild
of `src/` needed to add one.

## Adding a text

1. Write the XLIFF (1.2 or 2.0), e.g. `my-text.xlf`, following the contract
   below. Source (`<source>`) is Chinese, target (`<target>`) is English;
   every unit needs both sides non-empty.
2. Register it in `manifest.json` (`id`, `file`, titles, author,
   `sourceLanguage`, `script`, default `translator`, `license`).
3. Open the app: the text appears after the bundled docs (and before any
   `private/` book, which always loads last).

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
`.txt`; the script verifies stanza count and full triplet coverage.
