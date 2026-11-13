# HanJian Reader — audit fixes checklist

From the full audit of 2026-11-12 (report: `~/workspace/hanjian-reader-audit-2026-11-12.md`).
State at audit: `main` @ f1eba61, tests 59/59, build clean, lint 0 errors.
Check items off as they land. Comments under each item carry the audit's
evidence and what "done" looks like.

## What it has (built and real)

- [ ] The core reader: reveal Chinese at word / sentence / paragraph /
      full-document granularity, in both directions (EN→中 and 中→EN),
      with the left contents nav, filter/jump, and scroll highlighting
      that the Oct 28 UI audit asked for
      Verified in code and tests at audit. Nothing to do here unless it
      regresses; it is the baseline the fixes below must not break
      (gate: tests 59/59, build clean).

- [ ] Real stroke order via HanziWriter — a 796-character local database
      plus CDN fallback. The placeholder-art era is over
      Local DB is `public/stroke-data.json` (Make Me a Hanzi data);
      characters outside the 796 fall back to the CDN copy of the same
      dataset. (Separate standing direction, not part of this list:
      outline data is eventually to be replaced by the StrokeCore Bihua
      foundation — paused by the owner on 2026-11-12.)

- [ ] CC-CEDICT dictionary layer: 125,324 entries, lazy-loaded, both
      scripts; segmentation is Intl.Segmenter for modern text and a
      Jiayan port for classical/traditional text (the greedy
      longest-match is gone)
      Verified at audit: the dictionary asset loads lazily and lookup
      covers traditional and simplified. Segmentation choice follows
      the text, not a global setting.

- [ ] Content: the Three Character Classic ships as the default public
      book (XLIFF + curated alignments, tests verify end-to-end
      coverage); the two demo stories are bundled; the Tao Te Ching is
      fully plumbed but local-only by design, since the Feng & English
      translation is in-copyright and lives in gitignored private/
      The Tao's local-only status is a licensing decision, not a bug:
      do not "fix" it by committing the text. Any public Tao needs a
      public-domain or permissively licensed translation first.

- [ ] Import with persistence, and the white-label system
      (brand.config.ts) — both done
      Imported docs and the active doc survive reload (see the next
      section for the settings that don't). White-label: name, tagline
      and credits come from brand.config.ts, not hard-coded strings.

## What needs finishing

- [x] "+ List" is still fake — on desktop it flashes "Added to list
      (local)" and stores nothing; on mobile it's a literal no-op.
      It's the last dead control. Build the study list or remove the
      button
      DONE 2026-11-12 (feat/audit-fixes): built for real — see below.
      Audit §Partial-1: the handler is in App.tsx; the Oct 28 audit
      flagged this class of control as P0. Done = either a real study
      list (collect / view / remove / export, persisted) or the button
      gone from both desktop and mobile. Audit's suggested order puts
      this first.
      → Built: src/lib/studyList.ts (pure store: parse/serialize/add/
      remove/has, malformed-storage tolerant), persisted under
      brandStorageKey('studyList'); the button is now a toggle
      ("+ List" / "✓ In list" with truthful flash messages); a Study
      List section in the sidebar lists items (char, pinyin, meaning
      resolved live from the dictionary), click opens the inspector,
      ✕ removes, and a Copy button exports tab-separated text; the
      mobile inspector's button is wired to the same handler. Tests:
      scripts/study-list.test.mjs (4). Gate: build clean, tests 63/63,
      lint 0 errors.

- [x] Persistence is half-done: language, align role, hover mode,
      active doc, and imported docs survive reload — but display
      settings, dark mode, font sizes, notes, and reading position
      don't. Notes are lost on reload
      DONE 2026-11-12 (feat/audit-fixes): one versioned record — below.
      Audit §Partial-2: the fix is one versioned settings record in
      localStorage — display options (pinyin/zhuyin/tone colors/defs),
      reveal modes, font & char size, dark mode, notes, tip dismissal,
      sidebar states — plus per-doc scroll position. Dark mode exists
      and applies `.dark`; it only lacks persistence (audit §Partial-8).
      → Built: src/lib/settings.ts — a version:1 record under
      brandStorageKey('settings') with per-field validation (corrupt
      fields degrade individually to brand defaults; unknown versions
      fall back wholesale). App boots its display/reveal/dark/size/
      notes/sidebar/tip states from the record and rewrites it through
      one effect. Reading positions are stored per doc as the nav
      anchor id in view; on doc open without an explicit route intent
      the stored anchor is scrolled back into view, and position
      tracking waits for that restore so the observer's reset can't
      overwrite it. The older per-key stores (primaryLang, alignRole,
      hoverMode, activeDoc, custom docs, study list) keep their keys.
      Tests: scripts/settings.test.mjs (3). Gate: build clean, tests
      66/66, lint 0 errors.

- [x] Mobile inspector: note/speak/add-to-list handlers are () => {},
      and mobile has no Display Options at all
      DONE 2026-11-12 (feat/audit-fixes): handlers wired, options added.
      Audit §Partial-3: handlers are empty in MobileTools.tsx. Done =
      the compact inspector wired to the same actions as desktop, and
      Display Options (pinyin, sizes, tone colors) reachable on mobile.
      The add-to-list part depends on the study-list decision above.
      → Built: MobileTools' compact inspector now receives the real
      note/onNote/onSpeak (notes persist via the step-2 record), the
      real toneColors/showZhuyin instead of hardcoded values, and the
      step-1 add-to-list handler. A Display Options section in the
      mobile sheet mirrors the desktop one control-for-control:
      pinyin, zhuyin, definitions inline, tone colors, sentence
      toggles, speaker button, speak-on-click, character-size slider —
      with the same brand feature gates. Gate: build clean, tests
      66/66, lint 0 errors.

- [x] Search is still just a highlighter: first occurrence per text run
      only, no match count, no next/previous, no jump
      DONE 2026-11-12 (feat/audit-fixes): real search — see below.
      Audit §Partial-4: `highlight()` marks one occurrence per run.
      Done = all occurrences highlighted, a match count, next/previous
      with scroll-to-match, and an explicit no-results state. The box
      currently lives only in the right sidebar — placement is part of
      the rebuild's judgement call.
      → Built: foldedIndexOfAll in script.ts (all non-overlapping
      occurrences under the existing cross-script/case folding) and
      highlight() now marks every occurrence in a run. New
      src/lib/search.ts counts matches over the doc model (primary
      translation + Chinese of every sentence, document order) so the
      count is honest for unrevealed text too. The sidebar search box
      shows "n of N matches" (or "No matches · 无结果"), Prev/Next
      step occurrence-by-occurrence, scrolling the containing sentence
      into view and ringing it (Reader searchFocusId); a new query
      restarts at and jumps to the first match. The box stays in the
      right sidebar — it sits next to the other document tools and
      moving it was not worth the churn. Tests: scripts/search.test.mjs
      (4). Gate: build clean, tests 70/70, lint 0 errors.

- [x] Import hardening: no count preview or mismatch warning (extra
      Chinese paragraphs are silently dropped), paste-only, no
      delete/rename for imported docs
      DONE 2026-11-12 (feat/audit-fixes): preview, warnings, files,
      draft, rename/delete — see below.
      Audit §Partial-5: also missing a file picker / drag-drop (paste
      is the only way in), both languages are required, and the modal
      keeps no draft. Done = count preview before commit, a warning
      when EN/ZH counts mismatch instead of silent drops, file entry,
      and delete/rename for imported docs.
      → Built: analyzeImport in segment.ts reuses the importer's own
      split/pairing rules to preview paragraph/sentence counts for
      both languages and warns, before commit, about Chinese
      paragraphs/sentences that will be dropped and English paragraphs
      that will import empty. The modal takes files three ways —
      an "Open .hanjian.json…" picker, File → English / File → 中文
      text loaders, and drag-drop onto either text box — and its
      draft now lives in App state, so closing keeps the text. Under
      the book selector, an imported doc gets a rename field (commits
      on Enter/blur) and a two-step delete; deleting the open doc
      falls back to the default book. Tests: scripts/import-tools
      .test.mjs (5). Gate: build clean, tests 75/75.

- [x] Translator picker: the data model carries multiple translations
      per sentence, but the code still just takes the first one
      DONE 2026-11-12 (feat/audit-fixes): picker + compare view, below.
      Audit §Partial-6: `src/lib/doc.ts` returns translations[0], with
      the comment "until a translator picker exists". Per-unit
      translator credits already exist in the XLIFF notes. Done = a
      picker (and ideally a compare view) where a sentence has more
      than one translation; single-translation sentences unchanged.
      → Built: selectTranslation in doc.ts rotates the chosen
      translation to the front of every sentence carrying it, so the
      reader, search and copy tools follow the choice with no
      call-site changes (the doc.ts comment now says so). The picker
      is a select under the book selector, shown only when the book
      genuinely offers a choice (some sentence with 2+ translations);
      the choice persists per document in the settings record. A
      "Compare Translations" display option stacks each sentence's
      other translations under it with translator credits.
      Single-translation books are untouched (no picker appears).
      Tests: scripts/translator.test.mjs (3). Gate: build clean,
      tests 78/78.

## What isn't there

- [ ] Any downloads (clipboard copy only — no JSON round-trip, TMX, or
      EPUB), Anki/Pleco export, HSK-graded reveal, the alignment
      editor, pagination mode (both pagination and EPUB sit open in
      TASKS.md), a print stylesheet, an error boundary, an About page
      Audit §Isn't-there + §Partial-9. These are separate features, not
      one item of work: JSON export/re-import round-trip is the natural
      first (it pairs with import hardening above); pagination and
      EPUB are the standing TASKS.md items; the rest are unbuilt
      roadmap ideas. (HSK note: graded reveal exists as an idea only —
      nothing in the app references HSK levels today.)
      → Progress 2026-11-12: the JSON round-trip is DONE — Document
      Tools downloads the open doc as .hanjian.json (src/lib/docFile
      .ts; the internal Doc model is the file format, so export and
      re-import cannot drift), and the Import dialog opens the file
      back (same-id custom docs are replaced; an id colliding with a
      built-in doc imports under a fresh custom id). Pagination mode
      (a TASKS.md item) is also DONE: a Display Options toggle renders
      one section at a time over a stable footer with Prev/Next,
      section n of N and percentage. EPUB and TMX are DONE too
      (step 7c): Document Tools downloads .epub (dependency-free
      EPUB 3 generator in src/lib/epub.ts, externally validated with
      Python zipfile + XML parsing) and .tmx translation memory
      (src/lib/tmx.ts). Still open from this item: Anki/Pleco export,
      HSK-graded reveal, the alignment editor, print stylesheet,
      error boundary and About page — separate roadmap features, none
      of them part of the seven-step fix order.

- [x] Deployment plumbing: no Pages workflow, no CI, no LICENSE file
      despite the README claiming MIT
      DONE 2026-11-12 (feat/audit-fixes): LICENSE, CI and Pages
      workflows added; version 0.1.0 — see below.
      Audit §Isn't-there: `dist/` is gitignored, package version is
      still 0.0.0. Done = LICENSE file matching the README's claim, a
      CI workflow running tests + build, and a Pages deploy workflow
      if the reader is meant to be public.
      → Built: LICENSE (MIT, matching the claim); .github/workflows/
      ci.yml (lint + test + build on push/PR, Node 24);
      .github/workflows/pages.yml (test, build with
      --base=/hanjian-reader/, deploy to Pages on main) — every
      runtime asset is fetched via import.meta.env.BASE_URL, and the
      subpath build was verified locally to emit /hanjian-reader/
      asset paths. Package version 0.0.0 → 0.1.0 (lockfile too).
      Note: the workflows only run once this branch reaches GitHub;
      Pages also needs Pages enabled in the repo settings.

- [x] The README is badly stale — its top, Running, and Customization
      sections still describe the old single-file artifact ("no build
      step", "open the HTML file", stroke order as "placeholder"), and
      the Oct 28 UI audit in refs/ shows items as open that are fixed
      in code
      DONE 2026-11-12 (feat/audit-fixes): README rewritten; refs audit
      given a status pass — see below.
      Audit §Stale documentation: README's "How It Works" and Roadmap
      also understate reality (stroke order and CC-CEDICT are done in
      substance). Done = README rewritten against the Vite app as it
      is, and `refs/ui-readiness-audit.md` given a status pass so its
      open items match the code.
      → Built: README rewritten end-to-end against the Vite app
      (features as they now stand, Node 24 running instructions,
      layout, white-label, data licenses, deployment). The refs
      audit gained a dated 2026-11-12 status pass: §2's six items and
      fifteen further verified items flipped to [x] with per-section
      notes on what closed and what remains; nothing was flipped
      without code evidence.

## Suggested order (from the audit)

1. Study list — build it or delete the button.
2. One versioned settings record (persistence item above).
3. Mobile parity (inspector wiring + Display Options).
4. Search rebuild.
5. Import hardening + JSON download/re-import round-trip.
6. README + refs audit refresh; LICENSE; deployment decision.
7. Then the open TASKS: pagination mode, EPUB export; translator
   picker when a text with multiple translations lands.
