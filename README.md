# HanJian (涵简) — Chinese / English Parallel Reader

A literary reading environment for Chinese documents translated to English. Read in English by default, reveal Chinese progressively at word, sentence, paragraph, and full-document granularity, then inspect any character in depth.

> Built as a single-file React artifact — no build step, no backend.

**Live Artifact:** `hanjian-reader_agentic_artifact_1_58702b01beec.html`

---

## Concept

Most parallel readers force you to choose: English *or* Chinese, side-by-side. HanJian treats English as primary and Chinese as a progressive disclosure layer:

1.  **You read fluently** in English without interruption.
2.  **You reveal** Chinese only when you want it, at the granularity you need.
3.  **You inspect** the exact character that caught your eye.

The header direction control (`EN → 中` / `中 → EN`, left of the `Aa`
font-size control) chooses which language is shown and which is revealed:
read the translation and uncover the Chinese, or read the original Chinese
and reveal the English. The choice is kept in `localStorage`
(`hanjian:primaryLang`) and defaults to English-first.

Ideal for translated literature, business docs, classical texts, or any Chinese → English workflow where you want comprehension without losing the original.

## Features

### Reading Experience
- Warm paper theme (`#FFFEFB`), serif typography (Fraunces/Newsreader + Noto Serif SC)
- Centered 760px column, generous line-height, focus mode
- Two fully-aligned sample documents included:
  - *The Courtyard Rain / 庭院里的雨*
  - *Mending Clothes Under Lamplight / 灯下缝衣*

### Right Toolbar — Reveal Controls

The toolbar is fixed on desktop (360px), bottom-sheet drawer on mobile.

| Control | Shortcut | What it does |
|---|---|---|
| **Words / 词语** | `W` | Dotted underline on translatable words in the shown language. Hover → floating card with the other language, pinyin (tone-colored), definition. Click to pin. |
| **Sentences / 句子** | `S` | `中文` / `English` pill at end of each sentence. Toggles the other-language sentence block (Chinese block includes pinyin and 🔊 TTS, Web Speech API `zh-CN`). |
| **Paragraphs / 段落** | `P` | Other-language paragraph card below each paragraph — left vermillion accent, each hanzi clickable in the Chinese card. |
| **Full Document / 全文** | `F` | Side-by-side split view. Shown language first, revealed language second. |

Modes are independent — combine Words + Sentences for intensive study, or just Paragraphs for light review.

### Display Options
- Show Pinyin toggle
- Tone Colors: 1st red, 2nd orange, 3rd green, 4th blue, 5th gray
- Show Definitions Inline
- Character size slider (affects all Chinese)
- Search with highlight
- Font size Aa-/+

### Character Inspector

Click any visible Chinese character:

- **Big glyph** + stroke count badge + HSK pill
- **Pinyin + Zhuyin**, tone-colored
- **Meaning, radical, stroke count, decomposition** (e.g., 庭 = 广 + 廷)
- **Example compounds** with definitions
- **Animated stroke order** — SVG path draw animation (placeholder strokes for demo)
- **Actions:** 🔊 Play, Copy Character, Add to List, personal notes textarea
- Selection state persists and highlights in text

Character dictionary is embedded for ~50 characters from sample docs. Unknown characters fall back gracefully with `—` and allow user notes.

### Import Custom Documents

`Import Custom` modal:

- Two textareas: English + Chinese
- Splits by `\n\n` → paragraphs, then by `[.!?。！？]+` → sentences
- Auto-aligns by paragraph/sentence index
- Word alignment disabled for custom docs (sentence/paragraph/full + char inspection still work)
- Export: Copy English, Copy Chinese, Copy Bilingual

## How It Works — Data Model

```ts
type WordAlign = { en: string; zh: string; pinyin: string; def: string }
type Sentence = { en: string; zh: string; words: WordAlign[] }
type Paragraph = { en: string; zh: string; sentences: Sentence[] }
type Doc = { id: string; title: { en: string; zh: string }; paragraphs: Paragraph[] }

type CharInfo = {
  pinyin: string; meaning: string;
  radical: string; strokes: number; hsk: number;
  examples: string[]; decom: string;
}
```

- English is rendered as `<span class="sentence"><span class="word has-zh">...</span></span>`
- Chinese reveals are conditional renders based on `reveal = {words, sentences, paragraphs, full}`
- All Chinese characters wrapped in `<span class="han-char" data-char="X">` for click handling
- TTS: `speechSynthesis.speak(new SpeechSynthesisUtterance(text))` with `lang='zh-CN'`

No external dependencies. Tailwind via CDN. Single file.

## Running

Just open the HTML file:

```bash
open hanjian-reader_agentic_artifact_1_58702b01beec.html
# or drag into any browser
```

To embed in a repo / GitHub Pages:

```
/docs/index.html  <- copy artifact here
/README.md
```

## Customization

**Add your own documents:** Edit `SAMPLE_DOCS` array in the file:

```js
{
  id: 'my-doc',
  title: { en: "My Memo", zh: "我的备忘录" },
  paragraphs: [{ en: "...", zh: "...", sentences: [{ en:"...", zh:"...", words:[...] }] }]
}
```

**Extend character dictionary:** Edit `charDict` object. Add entries:

```js
"涵": { pinyin:"hán", meaning:"contain; immerse", radical:"氵 (water)", strokes:11, hsk:6, examples:["涵盖 hángài - encompass"], decom:"氵+函" }
```

**Theming:** Change CSS variables at top: `--paper`, `--ink`, `--vermillion`.

## Roadmap

- [ ] CEDICT integration for full dictionary coverage
- [ ] True word-alignment editor (drag to align)
- [ ] Stroke order data via HanziWriter
- [ ] Anki / Pleco export
- [ ] Pinyin auto-generation via pinyin-pro
- [ ] Audio alignment + sentence replay
- [ ] Collaborative notes / translation comments

## License

MIT — use freely for personal, educational, and commercial translation review workflows.

---

*Built with the idea that translation should be readable first, inspectable second. English for flow, Chinese for depth.*

## What does HanJian mean?

AI:

**HanJian — 涵简** is a double pun I picked for this reader:

### 1. The literal characters I used:

**涵 (hán)** — to contain water, to immerse, to be steeped in, to have depth / cultivation. As in 涵养 (cultivation) and 包含 (to contain). It's the "holding" side — keeping the original Chinese inside the English.

**简 (jiǎn)** — simple, brief, concise, clear. As in 简单 (simple) and 简明 (concise). It's the "revealing simply" side — you only reveal what you need.

So **涵简 = "immersive simplicity" / "depth contained simply"** — exactly what the toolbar does: the depth is always there, but shown simply.

### 2. The homophone I was playing on:

**汉简 (hànjiǎn)** — pronounced the same, it means **Han dynasty bamboo slips** — the ancient Chinese documents written on strips of bamboo. That's literally what your artifact is: a viewer for Chinese documents.

Historians still dig up 汉简 in the desert to read old letters and official memos. Your version just lets you read them in English first.

So when you say it:
- `hán` like in English "hahn" with rising tone
- `jiǎn` like "jyen" dipping

You can write it either way depending on vibe you want:
- **涵简** if you want the poetic "contain + simplify" meaning
- **汉简** if you want the historical "Han slips" reference

I used 涵简 in the app because it matches the interaction better — but the logo holds both meanings at once.


## What future features?

AI:

For HanJian, I'd push it in 4 directions — each builds on "English first, Chinese on demand":

### 1. Make the alignment actually smart

**The biggest unlock right now is import.** Instead of manual paste:

- **OCR drop:** Drag a scanned Chinese PDF / photo, it OCRs (PaddleOCR) and auto-segments into paragraphs. You paste English and it auto-aligns by semantic similarity, not just line count.
- **Visual word-link editor:** Like in translation tools — you see English sentence top, Chinese bottom, and you drag lines between words to fix alignments. That alignment data is what makes the Words mode magical.
- **Translation diff view:** Load 2-3 English translations of same Chinese doc (human vs DeepL vs your draft) and toggle between them to see where they diverge.

### 2. Make Chinese inspection deeper

This is where you beat every other reader:

- **Graded reveal by HSK:** In toolbar, set "I know HSK 4". Any word above HSK 4 stays highlighted in Chinese, everything you know stays hidden. Instant personalized reading.
- **HanziWriter + practice canvas:** Right in the inspector, not just an animation — a canvas where you can trace the character and it grades stroke order/direction.
- **Decomposition tree:** Click 涵 and see: 氵(water) + 函(box) → 函 = 丂 + 了 + 丶 ... interactive, like you're peeling the character.
- **Grammar lens:** When you reveal a sentence, show a tiny parse: 主语 / 谓语 / 宾语 color underlines so you see *why* the English order flipped.

### 3. Make it a learning loop

- **Shadowing mode:** Sentence TTS plays Chinese, blanks out English, you have to recall. Spacebar to reveal. Auto-loops through paragraphs.
- **One-click Anki / Pleco export:** Inspector has "Add + context". It saves: character + pinyin + your note + the sentence it appeared in + audio. That's a card you actually remember.
- **Personal dictionary:** Characters you inspect get frequency-ranked. Toolbar shows "32 characters from this doc are new to you" and lets you pre-study them.

### 4. Make it a work tool, not just a reader

Since you said "Chinese documents that were translated to English" — that sounds like work docs, not just literature:

- **Inline comments / translator notes:** Select any English span, leave a note like "Original says 庭院里, more like 'courtyard inside' not 'garden'". Threaded, resolvable.
- **Side-by-side edit:** Edit English translation in place while Chinese stays locked. Version history so you can see what changed.
- **Corpus search:** Upload 20 docs, then search "庭院" across all of them — see every English translation you've used before.
- **PWA offline:** Save docs locally, works on a plane, syncs later.

---

**If I had to pick 3 to build next for you:**

1.  **HSK-graded reveal** — 1 toggle that instantly makes it feel personal.
2.  **HanziWriter tracing** in inspector — turns inspection from passive to active.
3.  **OCR + smart auto-align** — so you can drop any real-world doc in, not just my samples.

Which direction are you actually using this for — literature study, or work translation review? I'd spec the next version differently based on that.
