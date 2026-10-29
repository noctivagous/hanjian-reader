// Generator: public/threeCharacterClassic.txt + curated Chinese -> committed
// public/texts/three-character-classic.xlf (XLIFF 1.2) + manifest entry.
//
// The English file holds 76 numbered stanzas covering the whole classic (its
// final stanza is 勤有功…宜勉力, the classic's traditional ending), but it
// skips several passages: the Eastern-Chou/Warring-States account, two
// capital/record couplets, the T'ang-to-Five-Dynasties bridge, two study
// exhortations, three 爾小生/爾幼學 couplets, and the whole Liao-to-Ch'ing
// continuation its stanza 59 names. Those are filled in here with new
// English in the same plain style, each unit marked
// <note>translator: Editorial supplement</note> so the reader credits them
// honestly and the base translation stays verbatim.
//
// The Chinese sequence (356 triplets) was verified against Herbert Giles'
// 1900 edition on English Wikisource (public domain); Qing taboo/variant
// forms it prints (尙/强/幷/玆/鷄/温/咏/碁, 元曾 for 玄曾) are normalized to
// standard traditional below. The Liao-to-Ch'ing continuation is the
// commonly printed Qing text (public domain); stanza 59's half-sentence on
// Yuan/Ming/Ch'ing stays verbatim and the fuller account follows it.
//
// Usage: node scripts/build-three-character-classic.mjs
// Re-runnable: re-reads the .txt, rewrites the .xlf, upserts the manifest.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ALIGNMENTS_PART_1 from './three-character-classic-alignments-part1.mjs';
import ALIGNMENTS_PART_2 from './three-character-classic-alignments-part2.mjs';
import { locateTccAlignments } from './tcc-locate-alignments.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const enPath = join(root, 'public', 'threeCharacterClassic.txt');
const outDir = join(root, 'public', 'texts');
const outPath = join(outDir, 'three-character-classic.xlf');
const alignmentPath = join(outDir, 'three-character-classic.alignments.json');
const manifestPath = join(outDir, 'manifest.json');

// 356 triplets in document order (Giles 1900 sequence; normalized forms).
// Written as one string per triplet; assembled into verses below.
const TRIPLETS = [
  '人之初', '性本善', '性相近', '習相遠', // 1-4
  '苟不教', '性乃遷', '教之道', '貴以專', // 5-8
  '昔孟母', '擇鄰處', '子不學', '斷機杼', // 9-12
  '竇燕山', '有義方', '教五子', '名俱揚', // 13-16
  '養不教', '父之過', '教不嚴', '師之惰', // 17-20
  '子不學', '非所宜', '幼不學', '老何為', // 21-24
  '玉不琢', '不成器', '人不學', '不知義', // 25-28
  '為人子', '方少時', '親師友', '習禮儀', // 29-32
  '香九齡', '能溫席', '孝於親', '所當執', // 33-36
  '融四歲', '能讓梨', '弟於長', '宜先知', // 37-40
  '首孝弟', '次見聞', '知某數', '識某文', // 41-44
  '一而十', '十而百', '百而千', '千而萬', // 45-48
  '三才者', '天地人', // 49-50
  '三光者', '日月星', // 51-52
  '三綱者', '君臣義', '父子親', '夫婦順', // 53-56
  '曰春夏', '曰秋冬', '此四時', '運不窮', // 57-60
  '曰南北', '曰西東', '此四方', '應乎中', // 61-64
  '曰水火', '木金土', '此五行', '本乎數', // 65-68
  '曰仁義', '禮智信', '此五常', '不容紊', // 69-72
  '稻粱菽', '麥黍稷', '此六穀', '人所食', // 73-76
  '馬牛羊', '雞犬豕', '此六畜', '人所飼', // 77-80
  '曰喜怒', '曰哀懼', '愛惡欲', '七情具', // 81-84
  '匏土革', '木石金', '絲與竹', '乃八音', // 85-88
  '高曾祖', '父而身', '身而子', '子而孫', '自子孫', '至玄曾', '乃九族', '人之倫', // 89-96
  '父子恩', '夫婦從', '兄則友', '弟則恭', '長幼序', '友與朋', '君則敬', '臣則忠', '此十義', '人所同', // 97-106
  '凡訓蒙', '須講究', '詳訓詁', '明句讀', // 107-110
  '為學者', '必有初', '小學終', '至四書', // 111-114
  '論語者', '二十篇', '群弟子', '記善言', // 115-118
  '孟子者', '七篇止', '講道德', '說仁義', // 119-122
  '作中庸', '子思筆', '中不偏', '庸不易', // 123-126
  '作大學', '乃曾子', '自修齊', '至平治', // 127-130
  '孝經通', '四書熟', '如六經', '始可讀', // 131-134
  '詩書易', '禮春秋', '號六經', '當講求', // 135-138
  '有連山', '有歸藏', '有周易', '三易詳', // 139-142
  '有典謨', '有訓誥', '有誓命', '書之奧', // 143-146
  '我周公', '作周禮', '著六官', '存治體', // 147-150
  '大小戴', '註禮記', '述聖言', '禮樂備', // 151-154
  '曰國風', '曰雅頌', '號四詩', '當諷詠', // 155-158
  '詩既亡', '春秋作', '寓褒貶', '別善惡', // 159-162
  '三傳者', '有公羊', '有左氏', '有穀梁', // 163-166
  '經既明', '方讀子', '撮其要', '記其事', // 167-170
  '五子者', '有荀楊', '文中子', '及老莊', // 171-174
  '經子通', '讀諸史', '考世系', '知終始', // 175-178
  '自羲農', '至黃帝', '號三皇', '居上世', // 179-182
  '唐有虞', '號二帝', '相揖遜', '稱盛世', // 183-186
  '夏有禹', '商有湯', '周文武', '稱三王', // 187-190
  '夏傳子', '家天下', '四百載', '遷夏社', // 191-194
  '湯伐夏', '國號商', '六百載', '至紂亡', // 195-198
  '周武王', '始誅紂', '八百載', '最長久', // 199-202
  '周轍東', '王綱墜', '逞干戈', '尚遊說', // 203-206
  '始春秋', '終戰國', '五霸強', '七雄出', // 207-210
  '嬴秦氏', '始兼並', '傳二世', '楚漢爭', // 211-214
  '高祖興', '漢業建', // 215-216
  '至孝平', '王莽篡', '光武興', '為東漢', '四百年', '終於獻', // 217-222
  '魏蜀吳', '爭漢鼎', '號三國', '迄兩晉', // 223-226
  '宋齊繼', '梁陳承', '為南朝', '都金陵', // 227-230
  '北元魏', '分東西', '宇文周', '與高齊', // 231-234
  '逮至隋', '一土宇', '不再傳', '失統緒', // 235-238
  '唐高祖', '起義師', '除隋亂', '創國基', // 239-242
  '二十傳', '三百載', '梁滅之', '國乃改', // 243-246
  '梁唐晉', '及漢周', '稱五代', '皆有由', // 247-250
  '炎宋興', '受周禪', '十八傳', '南北混', // 251-254
  '十七史', '全在茲', '載治亂', '知興衰', // 255-258
  '讀史者', '考實錄', '通古今', '若親目', // 259-262
  '口而誦', '心而惟', '朝於斯', '夕於斯', // 263-266
  '昔仲尼', '師項橐', '古聖賢', '尚勤學', // 267-270
  '趙中令', '讀魯論', '彼既仕', '學且勤', // 271-274
  '披蒲編', '削竹簡', '彼無書', '且知勉', // 275-278
  '頭懸梁', '錐刺股', '彼不教', '自勤苦', // 279-282
  '如囊螢', '如映雪', '家雖貧', '學不輟', // 283-286
  '如負薪', '如掛角', '身雖勞', '猶苦卓', // 287-290
  '蘇老泉', '二十七', '始發憤', '讀書籍', '彼既老', '猶悔遲', // 291-296
  '爾小生', '宜早思', // 297-298
  '若梁灝', '八十二', '對大廷', '魁多士', '彼晚成', '眾稱異', // 299-304
  '爾小生', '宜立志', // 305-306
  '瑩八歲', '能詠詩', '泌七歲', '能賦棋', '彼穎悟', '人稱奇', '爾幼學', '當效之', // 307-314
  '蔡文姬', '能辨琴', '謝道韞', '能詠吟', '彼女子', '且聰敏', '爾男子', '當自警', // 315-322
  '唐劉晏', '方七歲', '舉神童', '作正字', '彼雖幼', '身已仕', // 323-328
  '爾幼學', '勉而致', '有為者', '亦若是', // 329-332
  '犬守夜', '雞司晨', '苟不學', '曷為人', // 333-336
  '蠶吐絲', '蜂釀蜜', '人不學', '不如物', // 337-340
  '幼而學', '壯而行', '上致君', '下澤民', // 341-344
  '揚名聲', '顯父母', '光於前', '裕於後', // 345-348
  '人遺子', '金滿籯', '我教子', '惟一經', // 349-352
  '勤有功', '戲無益', '戒之哉', '宜勉力', // 353-356
];

// Qing-era continuation (commonly printed text, public domain), in triplets.
// Inserted between the Sung account (254) and the "seventeen histories"
// stanza (255), which the base translation keeps as-is.
const CONTINUATION = [
  '遼與金', '皆稱帝', '元滅金', '絕宋世',
  '輿圖廣', '超前代', '九十年', '國祚廢',
  '太祖興', '國大明', '號洪武', '都金陵',
  '迨成祖', '遷燕京', '十六世', '至崇禎',
  '權閹肆', '寇如林', '李闖出', '神器焚',
  '清世祖', '膺景命', '靖四方', '克大定',
  '由康雍', '歷乾嘉', '民安富', '治績誇',
  '道咸間', '變亂起', '始英法', '擾都鄙',
  '同光後', '政權移', '講新法', '謀自強',
];

// Base stanzas: unit id -> [firstTriplet, lastTriplet] (1-based, inclusive)
// into TRIPLETS. Order below is document order; s62 precedes s61 because the
// base translation numbers 昔仲尼… (267-268) after 古聖賢… (269-270).
const BASE = [
  ['s01', 1, 4], ['s02', 5, 8], ['s03', 9, 12], ['s04', 13, 16],
  ['s05', 17, 20], ['s06', 21, 24], ['s07', 25, 28], ['s08', 29, 32],
  ['s09', 33, 36], ['s10', 37, 40], ['s11', 41, 44], ['s12', 45, 48],
  ['s13', 49, 50], ['s14', 51, 52], ['s15', 53, 56], ['s16', 57, 60],
  ['s17', 61, 64], ['s18', 65, 68], ['s19', 69, 72], ['s20', 73, 76],
  ['s21', 77, 80], ['s22', 81, 84], ['s23', 85, 88], ['s24', 89, 96],
  ['s25', 97, 106], ['s26', 107, 110], ['s27', 111, 114], ['s28', 115, 118],
  ['s29', 119, 122], ['s30', 123, 126], ['s31', 127, 130], ['s32', 131, 134],
  ['s33', 135, 138], ['s34', 139, 142], ['s35', 143, 146], ['s36', 147, 150],
  ['s37', 151, 154], ['s38', 155, 158], ['s39', 159, 162], ['s40', 163, 166],
  ['s41', 167, 170], ['s42', 171, 174], ['s43', 175, 178], ['s44', 179, 182],
  ['s45', 183, 186], ['s46', 187, 190], ['s47', 191, 194], ['s48', 195, 198],
  ['s49', 199, 202],
  ['s50', 211, 214], ['s51', 215, 216], ['s52', 217, 222], ['s53', 223, 226],
  ['s54', 227, 228], ['s55', 231, 234], ['s56', 235, 238], ['s57', 239, 242],
  ['s58', 247, 250], ['s59', 251, 254], ['s60', 255, 258],
  ['s62', 267, 268], ['s61', 269, 270], ['s63', 271, 274], ['s64', 275, 278],
  ['s65', 279, 282], ['s66', 283, 286], ['s67', 287, 290], ['s68', 291, 296],
  ['s69', 299, 304], ['s70', 307, 314], ['s71', 315, 322], ['s72', 323, 328],
  ['s73', 333, 340], ['s74', 341, 344], ['s75', 345, 352], ['s76', 353, 356],
];

// Gap passages the base translation skips: [unit id, first, last, English].
// Triplets index into TRIPLETS; the history block indexes CONTINUATION.
const SUPPLEMENTS = [
  ['sup-50a', 203, 206,
    'When the Chou court moved east, the feudal bond slackened. Warfare prevailed, and wandering persuaders were held in high esteem.'],
  ['sup-50b', 207, 210,
    'This age began with the Spring and Autumn period and ended with the Warring States. The Five Hegemons rose to power, and the Seven Mighty States came forth.'],
  ['sup-54a', 229, 230,
    'These were the Southern dynasties, with their capital at Chin-ling.'],
  ['sup-58a', 243, 246,
    "The throne passed twenty times over three hundred years, until the Liang destroyed the T'ang and changed the dynastic title."],
  ['sup-60a', 259, 262,
    'Readers of history should study the true records, and understand all ages as though seeing them with their own eyes.'],
  ['sup-60b', 263, 266,
    'Recite with the mouth and reflect in the heart; do this in the morning and in the evening.'],
  ['sup-69a', 297, 298,
    'You young students should take thought betimes.'],
  ['sup-70a', 305, 306,
    'You young students should set your resolve.'],
  ['sup-72a', 329, 332,
    'You who learn in youth should strive to this end; those who have achieved did likewise.'],
];

const SUPPLEMENT_HISTORY = [
  ['sup-h1', 1, 4,
    'The Liao and the Chin both claimed imperial title. The Yuan destroyed the Chin and ended the Sung line.'],
  ['sup-h2', 5, 8,
    'Its territory was wider than any former age, yet after ninety years its mandate was spent.'],
  ['sup-h3', 9, 12,
    "The Grand Progenitor arose and founded the Great Ming; his reign title was Hung-wu, with Nanking as his capital."],
  ['sup-h4', 13, 16,
    "Under Ch'eng-tsu the capital moved to Yen-ching. Sixteen reigns later came Ch'ung-chen."],
  ['sup-h5', 17, 20,
    "Powerful eunuchs ran riot and rebels rose like forests. Li Ch'uang came forth, and the sacred throne was consumed in flames."],
  ['sup-h6', 21, 24,
    "Shih-tsu of the Ch'ing received the great mandate. He pacified the four quarters and secured the realm."],
  ['sup-h7', 25, 28,
    "From K'ang-hsi and Yung-cheng through Ch'ien-lung and Chia-ch'ing, the people lived in wealth and the government won praise."],
  ['sup-h8', 29, 32,
    'In the Tao-kuang and Hsien-feng years rebellions arose; first England and France troubled the capital region.'],
  ['sup-h9', 33, 36,
    "After T'ung-chih and Kuang-hsu the balance of power shifted. New reforms were discussed in the quest for strength."],
];

// Sections in document order: [group id, resname, unit ids in order].
// "sup-h*" units sit between s59 and s60; s62 precedes s61 (see BASE note).
const SECTIONS = [
  ['part-1', 'Human Nature and Learning|性善與為學',
    ['s01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10', 's11', 's12']],
  ['part-2', 'The World in Numbers|三才五行人倫',
    ['s13', 's14', 's15', 's16', 's17', 's18', 's19', 's20', 's21', 's22', 's23', 's24', 's25', 's26']],
  ['part-3', 'Books and the Order of Study|讀書次第',
    ['s27', 's28', 's29', 's30', 's31', 's32', 's33', 's34', 's35', 's36', 's37', 's38', 's39', 's40', 's41', 's42', 's43']],
  ['part-4', 'Dynasties and Histories|歷代興衰',
    ['s44', 's45', 's46', 's47', 's48', 's49', 'sup-50a', 'sup-50b', 's50', 's51', 's52', 's53', 's54', 'sup-54a', 's55', 's56', 's57', 'sup-58a', 's58', 's59', 'sup-h1', 'sup-h2', 'sup-h3', 'sup-h4', 'sup-h5', 'sup-h6', 'sup-h7', 'sup-h8', 'sup-h9', 's60', 'sup-60a', 'sup-60b']],
  ['part-5', 'Models of Diligence|勤學典範',
    ['s62', 's61', 's63', 's64', 's65', 's66', 's67', 's68', 'sup-69a', 's69', 'sup-70a', 's70', 's71', 's72', 'sup-72a']],
  ['part-6', 'Exhortation|勸學', ['s73', 's74', 's75', 's76']],
];

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Pair triplets into verses: AAA，BBB。CCC，DDD。 (all groups are even). */
function verse(first, last, table) {
  const trips = table.slice(first - 1, last);
  if (trips.length % 2 !== 0) {
    console.error(`error: unit ${first}-${last} has an odd triplet count.`);
    process.exit(1);
  }
  const out = [];
  for (let i = 0; i < trips.length; i += 2) {
    out.push(`${trips[i]}，${trips[i + 1]}。`);
  }
  return out.join('');
}

function main() {
  if (TRIPLETS.length !== 356) {
    console.error(`error: expected 356 triplets, have ${TRIPLETS.length}.`);
    process.exit(1);
  }
  if (CONTINUATION.length !== 36) {
    console.error(`error: expected 36 continuation triplets, have ${CONTINUATION.length}.`);
    process.exit(1);
  }
  if (!existsSync(enPath)) {
    console.error(`error: missing ${enPath}.`);
    process.exit(1);
  }
  const stanzas = readFileSync(enPath, 'utf8')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => {
      const m = b.match(/^(\d+)\.\s*([\s\S]*)$/);
      if (!m) {
        console.error(`error: stanza without leading number: ${JSON.stringify(b.slice(0, 40))}`);
        process.exit(1);
      }
      return { n: Number(m[1]), en: m[2].replace(/\s+/g, ' ').trim() };
    });
  if (stanzas.length !== 76 || !stanzas.every((s, i) => s.n === i + 1)) {
    console.error(`error: expected stanzas 1-76, have ${stanzas.map((s) => s.n).join(',')}.`);
    process.exit(1);
  }
  const enById = {};
  for (const [id] of BASE) enById[id] = stanzas[Number(id.slice(1)) - 1].en;

  // Coverage guard: every classic triplet appears in exactly one base or
  // supplement unit (s62/s61 order aside).
  const seen = new Array(357).fill(0);
  for (const [, a, b] of BASE) for (let i = a; i <= b; i++) seen[i]++;
  for (const [, a, b] of SUPPLEMENTS) for (let i = a; i <= b; i++) seen[i]++;
  const bad = [];
  for (let i = 1; i <= 356; i++) if (seen[i] !== 1) bad.push(`${i}x${seen[i]}`);
  if (bad.length > 0) {
    console.error(`error: triplet coverage broken: ${bad.join(' ')}.`);
    process.exit(1);
  }

  const zhById = {};
  for (const [id, a, b] of BASE) zhById[id] = verse(a, b, TRIPLETS);
  const enSupplement = {};
  for (const [id, a, b, en] of SUPPLEMENTS) {
    zhById[id] = verse(a, b, TRIPLETS);
    enSupplement[id] = en;
  }
  for (const [id, a, b, en] of SUPPLEMENT_HISTORY) {
    zhById[id] = verse(a, b, CONTINUATION);
    enSupplement[id] = en;
  }

  const unitXml = (id) => {
    const zh = zhById[id];
    const en = enById[id] ?? enSupplement[id];
    if (!zh || !en) {
      console.error(`error: unit ${id} missing Chinese or English.`);
      process.exit(1);
    }
    const note = enSupplement[id]
      ? `\n          <note>translator: Editorial supplement</note>`
      : '';
    return `        <trans-unit id="${id}">
          <source>${esc(zh)}</source>
          <target>${esc(en)}</target>${note}
        </trans-unit>`;
  };

  const groups = SECTIONS.map(([gid, resname, ids]) => {
    for (const id of ids) {
      if (!zhById[id]) {
        console.error(`error: section ${gid} references unknown unit ${id}.`);
        process.exit(1);
      }
    }
    return `      <group id="${gid}" resname="${esc(resname)}">\n${ids.map(unitXml).join('\n')}\n      </group>`;
  }).join('\n');

  const xlf = `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <!-- Three Character Classic 三字經: parallel Chinese/English. -->
  <!-- source = traditional Chinese (Sung original, Giles 1900 sequence, -->
  <!-- normalized forms; Qing continuation marked sup-h*), -->
  <!-- target = public/threeCharacterClassic.txt stanzas 1-76 verbatim plus -->
  <!-- editorial supplements (marked per-unit) for passages it skips. -->
  <!-- Note: s62 (昔仲尼…) precedes s61 (古聖賢…) in document order. -->
  <file original="three-character-classic" source-language="zh" target-language="en" datatype="plaintext">
    <body>
${groups}
    </body>
  </file>
</xliff>
`;
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, xlf);

  const authoredAlignments = {
    ...ALIGNMENTS_PART_1,
    ...ALIGNMENTS_PART_2,
  };
  const expectedIds = Object.keys(zhById);
  const unexpectedIds = Object.keys(authoredAlignments).filter(
    (id) => !expectedIds.includes(id),
  );
  const missingIds = expectedIds.filter((id) => !authoredAlignments[id]?.length);
  if (unexpectedIds.length || missingIds.length) {
    console.error(
      `error: alignment coverage invalid (unexpected: ${unexpectedIds.join(', ') || 'none'}; missing: ${missingIds.join(', ') || 'none'}).`,
    );
    process.exit(1);
  }
  const alignmentUnits = {};
  for (const id of expectedIds) {
    const pairs = authoredAlignments[id];
    const en = enById[id] ?? enSupplement[id];
    const zh = zhById[id];
    for (const pair of pairs) {
      if (
        !pair ||
        typeof pair.en !== 'string' ||
        typeof pair.zh !== 'string' ||
        !pair.en ||
        !pair.zh
      ) {
        console.error(`error: alignment ${id} has an empty or invalid pair.`);
        process.exit(1);
      }
      if (!zh.includes(pair.zh)) {
        console.error(`error: alignment ${id} Chinese span "${pair.zh}" is not in its source.`);
        process.exit(1);
      }
      const hasHand =
        Number.isInteger(pair.enStart) && Number.isInteger(pair.enEnd);
      if (hasHand) {
        const slice = en.slice(pair.enStart, pair.enEnd);
        if (pair.enStart < 0 || pair.enEnd > en.length || pair.enStart >= pair.enEnd) {
          console.error(`error: alignment ${id} invalid hand span on "${pair.zh}".`);
          process.exit(1);
        }
        if (pair.en && slice !== pair.en) {
          console.error(
            `error: alignment ${id} hand span "${slice}" ≠ "${pair.en}" for "${pair.zh}".`,
          );
          process.exit(1);
        }
      } else if (en.indexOf(pair.en) < 0) {
        console.error(`error: alignment ${id} cannot find "${pair.en}" in its target.`);
        process.exit(1);
      }
    }
    let words;
    try {
      words = locateTccAlignments(en, pairs, zh);
    } catch (err) {
      console.error(`error: alignment ${id}: ${err.message}`);
      process.exit(1);
    }
    if (words.length === 0) {
      console.error(`error: alignment ${id} has no word pairs.`);
      process.exit(1);
    }
    alignmentUnits[id] = words;
  }
  writeFileSync(
    alignmentPath,
    `${JSON.stringify({ version: 1, units: alignmentUnits }, null, 2)}\n`,
  );

  const entry = {
    id: 'three-character-classic',
    file: 'three-character-classic.xlf',
    alignmentFile: 'three-character-classic.alignments.json',
    titleEn: 'Three Character Classic',
    titleZh: '三字經',
    author: 'Wang Yinglin · 王應麟',
    sourceLanguage: 'zh',
    script: 'traditional',
    translator: '',
    license:
      'Chinese text: public domain (Sung original with later continuations). English stanzas 1-76: as provided in public/threeCharacterClassic.txt; passages it skips carry new editorial translations marked per-unit.',
  };
  let manifest = { texts: [] };
  if (existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (err) {
      console.error(`error: cannot parse ${manifestPath} (${err.message})`);
      process.exit(1);
    }
    if (!Array.isArray(manifest.texts)) manifest.texts = [];
  }
  const at = manifest.texts.findIndex((t) => t.id === entry.id);
  if (at >= 0) manifest.texts[at] = entry;
  else manifest.texts.push(entry);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const units = SECTIONS.reduce((n, [, , ids]) => n + ids.length, 0);
  console.log(`units: ${units} (76 base + ${units - 76} supplement), sections: ${SECTIONS.length}`);
  console.log(`out: ${outPath}`);
  console.log(`alignments: ${alignmentPath}`);
  console.log(`manifest: ${manifestPath}`);
}

main();

