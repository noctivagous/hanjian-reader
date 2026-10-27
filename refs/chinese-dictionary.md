# Chinese dictionary: findings for a later addition

## Why we want a dictionary

HanJian will eventually need a bundled Chinese dictionary. Not for the
`Show Zhuyin / 注音` toggle - that feature converts Pinyin to Zhuyin with a
deterministic converter and needs no dictionary (see "What a dictionary is
not for" below). We want a dictionary for three things the app cannot do
today:

1. **Readings where none exist.** A dropped Chinese-only text, Tao Te Ching
   sentences without word alignment, and Character Inspector lookups beyond
   the ~82 hand-written characters in `src/data/charDict.ts` all have no
   Pinyin attached. A dictionary supplies readings where the document does
   not carry them.
2. **Choosing the right reading.** Polyphonic characters (多音字) such as
   行, 重, 為, and 樂 change pronunciation with context. Only a word-level
   dictionary, keyed on the whole word, can pick correctly.
3. **A fuller Character Inspector.** Definitions, and eventually example
   words, for any character a reader clicks - not just the curated subset.

A dictionary also does **not** segment running Chinese into words. Word
segmentation is a separate component, needed before word-level lookup can be
applied to unsegmented dropped text.

## What a dictionary is not for

Converting Pinyin to Zhuyin is a closed initial/final/tone mapping. It needs
the converter in `src/lib/zhuyin.ts` (planned), not a dictionary:

- Every aligned word in the sample docs already carries Pinyin (verified:
  76 of 76 words with Chinese have Pinyin).
- The per-character Zhuyin in `src/data/charDict.ts` is too sparse to be the
  conversion source (it fully covers only 52 of those 76 words), but it is a
  good test oracle for the converter.

Do not pull a dictionary into the Zhuyin toggle work. It would add size and
a license obligation to solve a problem the converter already solves.

## Candidates

### CC-CEDICT (recommended when the time comes)

- Word-level Chinese-English dictionary, 125,326 entries in the release
  checked on 2026-10-27.
- Entries give numbered Pinyin (e.g. `lin2`), not Zhuyin, so the
  Pinyin-to-Zhuyin converter is still required on top of it.
- Strengths: word-level entries resolve most polyphonic characters in
  context; both traditional and simplified headwords in one file; actively
  maintained with frequent releases.
- Weakness: readings follow mainland Putonghua norms. Example: 垃圾 is
  `la1ji1` in CC-CEDICT but `lèsè` (ㄌㄜˋㄙㄜˋ) in Taiwan. For a
  Zhuyin-facing, Taiwan-oriented reader this gap is visible and may
  eventually justify the MOE route instead.
- Download: https://www.mdbg.net/chinese/dictionary?page=cedict
- Project home: https://cc-cedict.org/wiki/

### Unicode Unihan

- Per-character readings (`kMandarin`, `kHanyuPinyin`) from the Unicode
  Han Database.
- Clean, versioned source, but one primary reading per character, so it
  cannot resolve polyphonic characters in context and inherits mainland
  norms. Suitable as a per-character fallback, not as the main dictionary.
- Reference: https://www.unicode.org/reports/tr38/

### Taiwan Ministry of Education dictionaries

- The authoritative source for Zhuyin and Taiwan Mandarin readings (the
  data behind moedict / 萌典).
- Best correctness for this app's audience. However, bundling and
  redistribution terms are not a clean drop-in like CC-CEDICT's license, so
  this route needs a licensing review before any commitment.
- Dictionary site: https://dict.revised.moe.edu.tw/

## Licensing: CC-CEDICT is CC licensed

CC-CEDICT is released under Creative Commons Attribution-ShareAlike 4.0
(CC BY-SA 4.0). In practical terms, bundling it obliges us to:

- **Attribution.** Credit CC-CEDICT / MDBG wherever the data ships - in the
  app (an About or credits surface) and in any exported file that embeds
  its data.
- **ShareAlike.** If we improve or extend the dictionary data and
  distribute that derivative data, the derivative must be shared under the
  same CC BY-SA 4.0 license. This applies to the data, not to the app's
  code, but a corrected readings file derived from CC-CEDICT is data and
  would carry the obligation.
- Commercial and non-commercial use are both allowed under these terms.

Record the exact release version and download date in the data file header
when we generate a trimmed copy, so attribution and reproducibility survive
later edits.

## Recommended staging

1. **Now (Zhuyin toggle):** no dictionary. Ship the Pinyin-to-Zhuyin
   converter, validated against `src/data/charDict.ts`.
2. **With the Tao Te Ching:** generate a small per-book readings file at
   build time covering only that book's characters and words, with
   polyphonic readings reviewed by hand. Kilobytes, loaded with the book,
   instead of a full dictionary in the main bundle (currently ~272 KB of
   JS).
3. **With arbitrary dropped Chinese text:** bundle CC-CEDICT, trimmed to
   headword -> numbered Pinyin (plus definitions if the Inspector needs
   them), parsed at build time into an indexed JSON/ binary form and
   lazy-loaded as a separate chunk. Add the attribution surface at the
   same time, and decide then whether the Taiwan-reading gap justifies
   switching to, or supplementing with, MOE data.

## Open questions for when we add it

- Trimmed CC-CEDICT size after indexing, and the lazy-load format
  (JSON shards by first character vs a single compressed asset).
- Whether to keep simplified, traditional, or both headword sets - the
  Tao Te Ching and Taiwan audience argue for traditional-first.
- How ShareAlike interacts with our per-book hand-reviewed readings if
  they are derived from CC-CEDICT (keep them independently sourced, or
  accept and document the ShareAlike obligation).
