# `private/` — local-only book sources (never committed)

The Feng & English *Tao Te Ching* translation (*The Complete Tao Te Ching*,
Vintage 1972/1989) is in copyright, so it lives here — outside git — instead
of in `src/data/`. Anything you put in this directory (except this README and
`.gitkeep`) is ignored via `.gitignore` (`private/*`), as is the generated
module the build script emits (`src/data/tao-te-ching.generated.*`).

## What goes here

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

- `tao-te-ching.zh.txt` (optional) — the Chinese text, same block layout
  (81 `---`-separated chapters). When absent, the generator fetches the
  public-domain Wang Bi received text from Chinese Wikisource at generation
  time; when present, the local file wins and no network is needed.

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
