# HanJian — UI readiness audit

Date: 2026-10-28
Scope: current Vite/React app in `src/` compared against the archived
web artifact in `archive/Hanjian-Reader.html`, the behavior described in
`README.md`, the plan in `refs/hanjian-format-recommendation.md`, and
`TASKS.md`. Items marked ✅ DONE were fixed after the audit; the rest
are still open. Every item names the file/symbol it was found in and
what "done" means.

Severity key: **P0** = a shipped-looking control is broken, dead, or
unrecoverable, or a core reading loop cannot be completed. **P1** =
feature promised by the README / data model / refs plan but missing or
half-wired. **P2** = polish, accessibility, and robustness gaps that
should close before calling the app ready.

---

## 1. ✅ DONE (2026-10-28): selection escape paths

> Status: implemented and browser-verified (click toggle, ✕ buttons,
> `Escape` cascade, background-click clear, sentence override sets, tip
> re-aim, modifier-guarded shortcuts). What follows is the original
> finding, kept for the record. Remaining §1-adjacent work: tip
> persistence and dismissal timer (§7.3), swipe-to-close on the mobile
> drawer (§1.2 table), word-card viewport flip (§3).

This class of bug — *state you can enter but not leave* — is the
pattern to hunt everywhere, not just the one reported case.

### 1.1 ✅ DONE (P0) Clicking a character a second time deselects it

`onInspectChar: (c: string) => void` (`src/components/Reader.tsx:37`)
is wired straight to `setInspectedChar` (`src/App.tsx:183`). Every
`HanChar` click — main text, sentence reveal, paragraph card, and the
full-view Chinese column (`Reader.tsx:127, 192, 251, 306, 465, 514`) —
only ever *sets* the character. There is:

- no toggle (`inspectedChar === ch ? null : ch`),
- no close/clear (✕) button in the inspector panel
  (`src/components/Sidebar.tsx:187-233`, `CharInspector.tsx`),
- no `Escape` handling (`App.tsx:68-83` handles only `W/S/P/F`),
- no deselect by clicking the reading background: the scroll
  container's `onClick` (`App.tsx:163`) clears `pinnedKey` only,
  never `inspectedChar`.

Contrast: word pinning already does toggle correctly
(`Reader.tsx:153-162, 216-225`) and even documents it
("click the word again to unpin", `WordCard.tsx:117`). Character
inspection needs the same contract.

**Done means:** second click on the inspected char clears it; the
inspector shows a visible close affordance; `Escape` clears char,
pinned word, and hover in that order; clicking empty reader area
clears both pinned word and inspected char; all of this works in
English-primary, Chinese-primary, sentence/paragraph reveals, and
full view (all six call sites above).

### 1.2 ✅ DONE (P0) Siblings of the same defect

Audit every toggle for the same enter-but-never-leave shape:

| Control | Current escape path | Gap |
|---|---|---|
| Inspected character | none (§1.1) | no toggle, ✕, Esc, or background-click |
| Pinned word card | re-click word, or click reader background (`App.tsx:163`) | card itself has no ✕ (`WordCard.tsx:97-119`); if the word is scrolled off-screen the card is stranded; `Escape` doesn't clear it |
| Open sentence | re-click its pill (`Reader.tsx:261-275`) | when **Sentences mode is on**, `open` is forced (`openSentences.has(s.id) \|\| reveal.sentences`, `Reader.tsx:431`), so the pill cannot close an individual sentence — the toggle is dead in exactly the mode that shows the pill's siblings everywhere |
| First-run tip | "Got it" button (`App.tsx:264-270`) | reappears on every load (see §7.3); fixed at `right-[380px]` (`App.tsx:257`) so it overlaps/misaims when the right sidebar is collapsed |
| Mobile tools drawer | ✕ / backdrop (`MobileTools.tsx:38-54`) | no `Escape`, no swipe-down; acceptable, but Esc should match desktop modals |
| Import modal | ✕ / backdrop (`ImportModal.tsx:15-36`) | no `Escape`; no focus trap or initial focus (§6) |

**Done means:** every dismissible surface (inspector, word card,
tip, modal, drawer) can be dismissed by re-trigger, by an explicit
close control, by `Escape`, and — where it floats over text — by
clicking away, with state actually cleared in `App.tsx`.

---

## 2.  Left sidebar for the text's divisions (agreed, not built)

Per `refs/hanjian-format-recommendation.md` ("Left panel") this was
already decided; the data model landed (`Section` in
`src/data/types.ts:30-35`, sample docs migrated) but no UI did.
Today sections render only as inline headings (`Reader.tsx:398-417`)
with no anchor `id`, and document switching is a `<select>` in the
header (`Header.tsx:57-71`). For an 81-chapter Tao Te Ching this is
unusable. Build the three-pane layout: left nav ~264px | reader |
right tools 360px (existing `Sidebar.tsx` stays the *right* panel;
name the new one accordingly, e.g. `NavSidebar`, to end the
ambiguity).

Required behavior:

- [ ] Book title/author at top, then one row per `Section`:
      number, `titleZh`, `titleEn`, sentence count. Sections with
      empty titles (both sample docs today) collapse to a single
      untitled group — no blank rows.
- [ ] Clicking a row scrolls to that section. Sections need anchor
      ids (`id={section.id}`) and `scroll-margin-top` under the
      64px sticky header (`Header.tsx:37`).
- [ ] Scroll-spy: the section in view is highlighted, driven by the
      existing scroll container (`App.tsx:160-164`, `scrollRef` is
      currently attached but never read).
- [ ] Filter/jump box ("chapter 42", 德) filtering the row list.
- [ ] Collapsible on desktop, reusing the right panel's collapse
      pattern (`Sidebar.tsx:50`); slide-over drawer on mobile,
      where the right panel is already a bottom sheet
      (`MobileTools.tsx`). Needs its own header button — the
      current sidebar toggle (`Header.tsx:132-138`) toggles the
      *right* panel and its ◀/▶ glyphs will be ambiguous once two
      sidebars exist.
- [ ] Becomes the document library later (book → chapters is one
      tree at two depths); the header `<select>` should retire or
      demote to a book switcher inside this panel, not duplicate it.

**Done means:** from any scroll position, one click reaches any
section, the current section is always highlighted, and the panel
works collapsed, open, and as a mobile drawer.

---

## 3. Selection, hover, and word-card behavior

- [ ] **(P0) Sentence pill is decorative when Sentences mode is off
      and dead when it's on.** The pill renders only under
      `reveal.sentences` (`Reader.tsx:261`) and `open` is forced by
      the same flag (`Reader.tsx:431`). Decide the contract: either
      the global mode shows all reveals and per-sentence pills
      collapse individually (track *closed* sentences instead), or
      the pill toggles independently of the mode. Current middle
      state does neither.
- [ ] **(P1) Word card can overflow the viewport.**
      `WordCard.tsx:38-41` clamps `left` only; `top` is always
      `rect.bottom + 8`, so words near the bottom render the card
      off-screen, and nothing repositions on scroll/resize while
      pinned. Flip above the word when near the bottom; reposition
      or dismiss on scroll.
- [ ] **(P1) Hover is mouse-only.** Word and char targets are
      `<span>`s (`Reader.tsx:74-83, 138, 201`) — not focusable, no
      keyboard path to a word card or char inspection, unusable on
      touch except by tap (which pins — undiscoverable). Add
      focusability/`tabIndex`, Enter-to-pin, and visible focus
      styles; verify tap behavior on mobile in both primary modes.
- [ ] **(P1) Chinese-primary mode has no char-level click.**
      Inside a segmented word token (`Reader.tsx:201-237`) the
      whole token pins the word card; individual characters are
      plain text, so inspection only happens via the card's
      Inspect button (which passes the whole word,
      `WordCard.tsx:100-102`). Decide: char click inspects,
      word click pins — or document that Inspect is the path.
      The unsegmented fallback path (`Reader.tsx:185-196`) does
      allow char clicks, so behavior currently differs by whether
      a word happened to align.
- [ ] **(P2) Punctuation inspects as a character.** `HanChar`
      renders ，。！？ etc. as clickable (`Reader.tsx:122-129`);
      clicking one opens an inspector full of `—`. Skip
      non-CJK codepoints, or render them unclickable.
- [ ] **(P2) Stale hover on mode/language switch.** Switching
      primary language clears hover/pin (`App.tsx:145-149`) but
      toggling Words mode off, switching documents, or scrolling
      does not clear `hover`/`pinnedKey`/`inspectedChar`/
      `openSentences`/`search` — stale state follows the reader
      into a different document. Reset per-document state in one
      place on `activeId` change (also scroll to top — §5).

## 4. Character Inspector completeness

`src/components/CharInspector.tsx`, rendered from
`Sidebar.tsx:220-231`.

- [ ] **(P0) "+ List" is fake.** `onAddToList` flashes
      "Added to list (local)" (`App.tsx:212`) and stores nothing.
      Either build the list (collect chars/words, view them, remove
      items, copy/export the list) or remove the button. A study
      list that silently discards is worse than none.
- [ ] **(P1) Stroke order is placeholder art.** `CharDetail`
      draws up to 5 invented bezier paths (`CharInspector.tsx:82-96`)
      labeled "Stroke Order · 笔顺". It has no replay button —
      the animation runs once on mount. At minimum label it as
      illustrative and add replay; real data (HanziWriter) is
      already on the README roadmap.
- [ ] **(P1) Unknown characters dead-end.** Beyond the ~82 curated
      entries in `src/data/charDict.ts`, meaning reads
      "Tap to add definition" (`CharInspector.tsx:51`) but nothing
      is tappable — there is no definition editor, only the notes
      box. Make the note/definition actually editable and saved,
      or change the copy. (Full dictionary coverage is scoped in
      `refs/chinese-dictionary.md`; the UI gap is the dead copy.)
- [ ] **(P1) Notes are memory-only and mis-keyed on mobile.**
      Notes live in `App.tsx:56` state keyed by char string, lost
      on reload; in `MobileTools.tsx:88-91` `onNote` is a no-op
      and `note=""`, so mobile users can't even see them. Persist
      (see §7) and wire the mobile path or hide the box there.
- [ ] **(P2) Examples are inert.** Example compounds
      (`CharInspector.tsx:100-117`) can't be clicked to inspect,
      spoken, or copied. Make the word clickable → inspect/speak.
- [ ] **(P2) Zhuyin defaults disagree.** `CharInspector` defaults
      `showZhuyin = true` (`CharInspector.tsx:125`) while the app
      default is `false` (`App.tsx:45`) and `MobileTools` hardcodes
      `toneColors` on (`MobileTools.tsx:88`). One source of truth.
- [ ] **(P2) No close button** — covered in §1.1, but the fix
      lands here: an ✕ in the inspector header
      (`Sidebar.tsx:189-196`) that clears `inspectedChar`.

## 5. Reading experience and navigation

- [ ] **(P1) No reading position memory.** Switching documents
      keeps the old scroll offset mid-text; reload restarts at the
      top. Scroll to top on doc change; persist per-doc scroll
      position (bookmark) and restore it.
- [ ] **(P1) No progress or section navigation in the reader.**
      No progress indicator, no prev/next section, no
      back-to-top. The footer (`Reader.tsx:534-541`) shows counts
      only. The left panel (§2) covers jumping; add a slim
      progress bar under the header.
- [ ] **(P1) Full Document view is a dead end.**
      (`Reader.tsx:486-532`) English paragraphs are plain text —
      no search highlight, no sentence linking, no hover sync
      between the two columns; clicking a sentence's counterpart
      doesn't highlight the pair. At minimum apply search
      highlight and scroll-sync/highlight on click; the Chinese
      column's chars hit §1.1's deselect bug too.
- [ ] **(P1) Search is a partial match highlighter, not search.**
      `highlight()` marks only the *first* occurrence per text run
      (`Reader.tsx:46-59`, single `indexOf`); there's no match
      count, no next/previous, no jump-to-match, no "no results"
      state, and clearing requires reaching the right sidebar —
      search doesn't exist at all on mobile or when the sidebar is
      collapsed. Rebuild: highlight all occurrences, count + n/N
      navigation with scroll-into-view, `Esc`/`✕` clears, surface
      it in the header or left panel so it's always reachable.
- [ ] **(P2) TTS gaps.** `speakChinese` (`src/lib/speech.ts:3-14`)
      always speaks Chinese: the 🔊 beside an *English* reveal in
      Chinese-primary mode speaks the Chinese sentence
      (`Reader.tsx:288`) with no English TTS option anywhere; no
      stop button (a second click just restarts via
      `cancel()`), no speaking indicator, and `getVoices()` is
      read synchronously before voices load, so the first play
      often gets the fallback voice. Add per-language speak,
      stop/state feedback, and a `voiceschanged` retry.
- [ ] **(P2) Dark mode is partial and unpersisted.** The toggle
      (`App.tsx:85-91`) only swaps `--paper` on the root; the
      reader column hardcodes `bg-[#FFFEFB]`
      (`Reader.tsx:365`) and several cards hardcode white, so
      "dark" is a patchwork. It's also lost on reload. Audit all
      hardcoded hex backgrounds against `.dark`, then persist.
- [ ] **(P2) Print.** No print stylesheet; sidebar, tip, and
      toolbars would print. Add `@media print` hiding chrome and
      expanding revealed content, or a dedicated print view.

## 6. Import, documents, and data UI

- [ ] **(P1) Imported documents vanish on reload.** `docs` is
      in-memory (`App.tsx:14`); there's also no way to delete,
      rename, or re-import an imported doc — the `<select>` grows
      forever within a session. Persist imported docs
      (localStorage/IndexedDB) and add remove/rename in the
      document switcher (or left panel, §2).
- [ ] **(P1) Import silently misaligns.** `importCustomDoc`
      (`src/lib/segment.ts:17-39`) aligns by index: extra Chinese
      paragraphs are dropped, missing ones become empty strings,
      and sentence-count mismatches produce sentences with no
      Chinese — with no warning in `ImportModal`. Show counts
      before import ("12 EN paragraphs / 9 ZH paragraphs") and
      flag unmatched sentences in the reader.
- [ ] **(P1) Import requires both languages and paste only.**
      `disabled={!en || !zh}` (`ImportModal.tsx:93`) blocks the
      Chinese-only drop flow planned in
      `refs/hanjian-format-recommendation.md`. No file picker, no
      drag-and-drop anywhere in the app. Add file/drop entry
      (`.txt`/`.md`/`.hanjian.json` first), allow Chinese-only
      with an explicit "no translation yet" sentence state
      (the reader already has a no-translation branch,
      `Reader.tsx:120-130` — it needs a visible label).
- [ ] **(P1) No downloads.** Document Tools copy to clipboard
      only (`Sidebar.tsx:239-269`). The agreed downloads —
      `.hanjian.json` (lossless, re-importable), then `.tmx`,
      then generated `.epub` — have no UI. Start with JSON
      download + re-import round-trip; clipboard copy stays.
- [ ] **(P2) Modal chrome.** Import modal: no `Escape`, no focus
      trap, no initial focus, textarea content lost if closed
      accidentally (`ImportModal.tsx`). Add Esc + confirm-or-
      preserve draft.
- [ ] **(P2) No empty/error states.** Empty document, document
      with zero sections, clipboard failure ("Copy failed" toast
      is the only feedback, `App.tsx:110-113`), and unsupported
      TTS all need inline states, not silence.

## 7. Settings, persistence, and state hygiene

- [ ] **(P1) Almost nothing persists.** Only `hanjian:primaryLang`
      survives reload (`App.tsx:27-42`). Persist as one versioned
      settings record: reveal modes, showPinyin/showZhuyin,
      toneColors, defsInline, fontScale, charSize, dark, sidebar
      collapsed (both panels), notes, study list (§4), dismissed
      tip, imported docs (§6).
- [ ] **(P1) Translator picker and compare view are missing.**
      The data model carries `translations[]` per sentence
      (`types.ts:18-22`) but `primaryTranslation()` always returns
      `[0]` (`src/lib/doc.ts:6-8`, comment admits "until a
      translator picker exists"). Sample docs ship one translation
      so nothing looks broken — until the Tao lands. Build: picker
      in left panel/header setting the active translation per
      book, per-sentence "compare" stacking all translations.
      This is step 4 of the order in
      `refs/hanjian-format-recommendation.md`; the UI audit flags
      it as required-before-Tao, not optional.
- [ ] **(P2) Tip dismissal not remembered.** `showTip` resets every
      load (`App.tsx:62`); with the 6s auto-hide (`App.tsx:93-97`)
      it also vanishes before slow readers finish it. Persist
      dismissal; drop or lengthen the timer.
- [ ] **(P2) Font-size control is desktop-only and stateless.**
      Hidden below `md` (`Header.tsx:107`), no numeric readout,
      no reset-to-100%. Mobile readers get no text-size control
      (`MobileTools` lacks it entirely). Move into Display Options
      too, show the percentage like Character Size does
      (`Sidebar.tsx:147-149`).
- [ ] **(P2) Keyboard shortcuts are undiscoverable and unsafe.**
      `W/S/P/F` (`App.tsx:68-83`) fire on any bare keypress
      outside inputs — including with modifiers held
      (Cmd/Ctrl+W would toggle Words while trying to close the
      tab, where the browser allows it). Guard modifiers, add a
      shortcuts help surface (`?` or a footer listing), add `/`
      to focus search and `Esc` per §1.2.

## 8. Mobile parity

`MobileTools.tsx` is a subset of the desktop sidebar, and some of
what it does render is wired to no-ops. Missing or dead on mobile:

- [ ] **(P1)** Display Options entirely: pinyin, zhuyin,
      definitions-inline, tone colors, character size, font size.
- [ ] **(P1)** Search (see §5).
- [ ] **(P1)** Inspector speak/notes/add-to-list are `() => {}`
      (`MobileTools.tsx:90-93`) — the compact inspector shows no
      stroke order, examples, radical/HSK pills either
      (`CharInspector.tsx:136-150`). Wire real handlers; reuse the
      full inspector in a sheet.
- [ ] **(P1)** Import (header button is `hidden md:inline-flex`,
      `Header.tsx:75`) and bilingual copy (EN/ZH only,
      `MobileTools.tsx:98-113`).
- [ ] **(P1)** Left divisions nav (§2) — mobile gets a drawer or
      the book is unnavigable.
- [ ] **(P2)** Import button, direction toggle labels, and reveal
      toggles have no shortcut hints or mode descriptions
      (desktop has both, `Sidebar.tsx:62-99`).

**Done means:** every control reachable on desktop is reachable
and functional on mobile, even if the layout differs.

## 9. Accessibility and robustness

- [ ] **(P1)** Clickable `<span>`s everywhere (chars, words,
      full-view chars) — not focusable, no `role`, no keyboard
      activation, no `aria-pressed` on toggle pills. Icon-only
      buttons (dark mode, sidebar toggles, TTS 🔊,
      `Header.tsx:125-145`) lack `aria-label`s; the dark-mode
      glyph is also inverted (shows ☾ while dark,
      `Header.tsx:130`). Sweep: buttons or `tabIndex=0` + key
      handlers, labels on every icon button, `:focus-visible`
      rings.
- [ ] **(P1)** Toast has no `aria-live` (`App.tsx:275-279`);
      hover card and inspector changes aren't announced. Add
      polite live regions for toast and inspector.
- [ ] **(P2)** Touch targets: `HanChar` is `px-0.5` text and the
      sentence pill is `py-0.5` (`Reader.tsx:79, 268`) — well
      under 24px. Enlarge hit areas without changing glyph size.
- [ ] **(P2)** Motion: reveal grids animate
      (`Reader.tsx:277, 437`) with no `prefers-reduced-motion`
      handling. Add the media query.
- [ ] **(P2)** No error boundary: a malformed imported doc or a
      charDict miss in a new surface takes down the whole reader.
      Add a boundary around `Reader` with a recoverable fallback.
- [ ] **(P2)** Color-only state: pinned/inspected is conveyed by
      vermillion fill alone (`Reader.tsx:79, 164`). Add a
      non-color cue (weight/underline) for color-vision safety.

## 10. Known non-UI debt that surfaces in the UI

- **Segmenter accuracy** (`TASKS.md`): greedy longest-match
  (`src/lib/tokenize.ts`) mis-splits some Chinese-primary words;
  hover granularity will occasionally be one char short. UI side:
  when a token falls back to single chars, that's the visible
  symptom — no UI fix beyond §3's char-click decision, but note it
  in the "How to read" copy if it ships as-is.
- **Dictionary coverage** (`refs/chinese-dictionary.md`): staged
  plan exists; the UI work it needs is §4's editable-definition
  stopgap now, and an attribution/About surface when CC-CEDICT
  ships. There is currently **no About/credits surface at all** —
  add one (also the natural home for translation licenses,
  `types.ts:13`, and the shortcuts list, §7).

---

## Suggested order

1. ✅ DONE (2026-10-28) — **Selection escape fixes** (§1):
   char toggle/close/Esc plus the sentence-pill contract (§3 P0 row).
2. **Left divisions sidebar** (§2) with anchors + scroll-spy.
3. **Dead-control sweep** (§4 list, §8 mobile no-ops): wire or
   remove every no-op button.
4. **Persistence + per-document state reset** (§7, §3, §5).
5. **Search rebuild** (§5) and word-card positioning (§3).
6. **Translator picker + compare** (§7) — gate for the Tao.
7. **Downloads (JSON first), import hardening, file drop** (§6).
8. **Accessibility + mobile parity sweep** (§8, §9).
9. **Polish**: dark-mode completion, print, TTS voices, About
   surface (§5, §9, §10).
