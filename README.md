# HanJian Reader · 涵简

Read Chinese documents in English by default, and reveal the Chinese
progressively — a word, a sentence, a paragraph, or the whole document
at a time. It works in the other direction too: read Chinese and
reveal English. Built for learners who want to meet real texts early,
with support that fades as they choose.

A Vite + React 19 + TypeScript app. Everything runs client-side;
your documents, notes, settings and study list never leave the
browser (localStorage).

## What it does

- **Progressive reveal** at word / sentence / paragraph / full-document
  granularity, in both directions (EN→中 and 中→EN), with word-level
  hover alignment between the languages.
- **Contents navigation**: a left panel listing the text's divisions,
  with filter/jump and highlighting that follows your scroll.
- **Character inspector**: readings (pinyin, zhuyin), definitions,
  notes, and real stroke order (HanziWriter over a 796-character
  local database, CDN fallback beyond it).
- **Dictionary layer**: CC-CEDICT (125,324 entries), lazy-loaded,
  both scripts. Segmentation is `Intl.Segmenter` for modern text and
  a Jiayan port for classical/traditional text.
- **Study list**: save characters from the inspector to a personal
  list that persists, and copy it out as tab-separated text.
- **Real search**: every occurrence highlighted, a match count, and
  next/previous navigation that scrolls to the match. Matching folds
  traditional/simplified variants and case, so searching 经 finds 經.
- **Settings that persist**: display options, dark mode, sizes, notes
  and your reading position per document, in one versioned record.
- **Import your own texts**: paste English + Chinese (with a count
  preview and mismatch warnings before anything is dropped), load
  text files, or drag-and-drop. Imported documents persist and can be
  renamed or deleted.
- **`.hanjian.json` round-trip**: download any document in the app's
  own format and re-import it later, losslessly.

## Content

- **Three Character Classic （三字經）** — the default public book,
  shipped as XLIFF with curated word alignments
  (`public/texts/`).
- **Two demo stories** — bundled sample documents.
- **Tao Te Ching （道德經）** — fully plumbed but **local-only by
  design**: the Feng & English translation is in copyright, so the
  text lives in a gitignored `private/` directory and is not in this
  repository. Making it public needs a public-domain or permissively
  licensed translation.

## Running

Requires Node 24 (the test suite uses `node --test` with TypeScript
sources imported directly).

```sh
npm install
npm run dev       # dev server
npm run build     # tsc + production build into dist/
npm run preview   # serve the production build
npm test          # node:test suites under scripts/
npm run lint      # oxlint
```

Deployment: a GitHub Actions workflow (`.github/workflows/pages.yml`)
builds and deploys to GitHub Pages on pushes to `main`; every runtime
asset is fetched relative to `import.meta.env.BASE_URL`, so the
project subpath works. CI (`.github/workflows/ci.yml`) runs lint,
tests and the build on pushes and pull requests.

## Customization (white-label)

The app is brandable from one file: edit `src/brand.config.ts` to
override the name, tagline, texts, theme, feature flags and defaults
declared in `src/brand.ts`. Storage keys are namespaced by brand id,
so differently-branded builds don't collide.

## Project layout

- `src/components/` — Reader, NavSidebar, Sidebar, CharInspector,
  MobileTools, ImportModal, …
- `src/lib/` — document model accessors, dictionary, segmentation,
  search, settings, study list, import/export, speech
- `src/data/` — shared types and the curated character dictionary
- `public/` — text manifest + XLIFF books (`texts/`), CC-CEDICT and
  Jiayan assets (`dict/`), stroke-order database (`stroke-data.json`)
- `scripts/` — the `node:test` suites
- `refs/` — design notes and audits, including the 2026-10-28 UI
  readiness audit (with a 2026-11-12 status pass)
- `TASKS.md` — the standing task list; `AUDIT-FIXES.md` — the
  2026-11-12 audit checklist and what has landed from it

## Licenses

The app itself is MIT (see `LICENSE`). Bundled data keeps its own
terms:

- CC-CEDICT — CC BY-SA 4.0 (https://cc-cedict.org)
- Stroke-order data — Make Me a Hanzi (Arphic Public License)
- Jiayan segmentation data — MIT
- Three Character Classic — Chinese text public domain; English
  translation provenance is recorded per book in
  `public/texts/manifest.json`
