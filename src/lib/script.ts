import type { Doc } from '../data/types';

export type Script = 'simplified' | 'traditional';

/**
 * Script of a doc. Untagged docs (e.g. user-imported documents, which
 * predate the field) read as simplified to preserve existing behavior.
 */
export function docScript(doc: Pick<Doc, 'script'> | null | undefined): Script {
  return doc?.script === 'traditional' ? 'traditional' : 'simplified';
}

/** Short tag appended to titles and bylines: `· 简体` or `· 繁體`. */
export function scriptTag(doc: Pick<Doc, 'script'> | null | undefined): string {
  return docScript(doc) === 'traditional' ? '· 繁體' : '· 简体';
}

/** Font class for a doc's Chinese text: TC glyph forms for traditional. */
export function zhFontClass(
  doc: Pick<Doc, 'script'> | null | undefined,
): 'serif-sc' | 'serif-tc' {
  return docScript(doc) === 'traditional' ? 'serif-tc' : 'serif-sc';
}

// Traditional → simplified pairs, one BMP character each. Every entry is
// single-char → single-char so folding never changes string length and
// folded match indices map 1:1 back onto the original text.
const TRAD_SIMP_PAIRS =
  '門门閉闭開开關关' +
  '語语說说話话記记認认識识讀读論论設设許许計计訪访評评詞词譯译護护讓让韻韵響响議议證证' +
  '學学覺觉頭头頁页須须頃顷題题顏颜額额類类顧顾願愿顯显' +
  '書书畫画晝昼盡尽畢毕辭辞辦办' +
  '車车連连運运達达遠远還还過过進进邊边導导遺遗選选適适遷迁違违遲迟遞递' +
  '見见觀观覽览親亲' +
  '來来個个們们時时實实寶宝審审寫写漢汉僅仅' +
  '軍军農农興兴舉举舊旧歸归區区醫医黨党廠厂廣广廢废彈弹嚴严變变發发髮发裏里裡里後后點点' +
  '龍龙龜龟馬马魚鱼鳥鸟麥麦黃黄雲云電电靈灵靜静聽听廳厅' +
  '經经萬万無无為为與与眾众樂乐幾几機机殺杀雜杂難难歡欢權权樹树橋桥潔洁緣缘縣县懸悬戀恋鏡镜驗验銳锐紛纷鬱郁鬆松麵面' +
  '絲丝級级紅红緊紧終终窮穷雙双麼么樣样臉脸腳脚體体輕轻較较輩辈輪轮館馆於于衹只';

function buildFoldMap(): Record<string, string> {
  const chars = Array.from(TRAD_SIMP_PAIRS);
  const map: Record<string, string> = {};
  for (let i = 0; i + 1 < chars.length; i += 2) {
    map[chars[i]] = chars[i + 1];
  }
  return map;
}

/** Traditional → simplified lookup used for search matching only. */
export const TRAD_TO_SIMP: Record<string, string> = buildFoldMap();

/**
 * Fold traditional variants to their simplified form. Display text is
 * never rewritten with this — it is only the search/match projection.
 */
export function foldScriptText(text: string): string {
  let out = '';
  for (const ch of text) out += TRAD_TO_SIMP[ch] ?? ch;
  return out;
}

/** ASCII-only lowercase, so folding stays 1:1 on every code point. */
function lowerAscii(s: string): string {
  return s.replace(/[A-Z]/g, (c) => c.toLowerCase());
}

/** Canonical form for search comparison: script-folded + case-folded. */
export function canonicalSearchText(text: string): string {
  return lowerAscii(foldScriptText(text));
}

/**
 * True when `haystack` contains `query`, folding traditional/simplified
 * variants together (searching simplified `经` finds traditional `經` and
 * vice versa). Empty queries match everything.
 */
export function matchesSearch(haystack: string, query: string): boolean {
  if (!query) return true;
  return canonicalSearchText(haystack).includes(canonicalSearchText(query));
}

/**
 * Code-point index of `query` in `text` under cross-script folding, or -1.
 * Because folding is 1:1, the index applies to the original text and can
 * be used to slice it for highlighting without rewriting display text.
 */
export function foldedIndexOf(text: string, query: string): number {
  const q = Array.from(canonicalSearchText(query));
  if (q.length === 0) return -1;
  // The canonical form is 1:1 per code point (single-char fold entries
  // plus ASCII-only lowering), so a code-point index here slices the
  // original text. A plain string indexOf would be UTF-16 based and
  // drift on astral characters.
  const hay = Array.from(canonicalSearchText(text));
  outer: for (let i = 0; i + q.length <= hay.length; i++) {
    for (let j = 0; j < q.length; j++) {
      if (hay[i + j] !== q[j]) continue outer;
    }
    return i;
  }
  return -1;
}
