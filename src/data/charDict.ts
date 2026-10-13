export interface CharInfo {
  pinyin: string;
  meaning: string;
  radical: string;
  strokes: number;
  hsk: number;
  examples: string[];
  decom: string;
  zhuyin: string;
}

export const charDict: Record<string, CharInfo> = {
  "老": {
    "pinyin": "lǎo",
    "meaning": "old; aged",
    "radical": "耂 (old)",
    "strokes": 6,
    "hsk": 1,
    "examples": [
      "老人 old person",
      "老师 teacher"
    ],
    "decom": "土+匕",
    "zhuyin": "ㄌㄠˇ"
  },
  "人": {
    "pinyin": "rén",
    "meaning": "person; people",
    "radical": "人 (person)",
    "strokes": 2,
    "hsk": 1,
    "examples": [
      "男人 man",
      "女人 woman"
    ],
    "decom": "人",
    "zhuyin": "ㄖㄣˊ"
  },
  "坐": {
    "pinyin": "zuò",
    "meaning": "sit",
    "radical": "土 (earth)",
    "strokes": 7,
    "hsk": 2,
    "examples": [
      "坐下 sit down",
      "请坐 please sit"
    ],
    "decom": "人+土",
    "zhuyin": "ㄗㄨㄛˋ"
  },
  "在": {
    "pinyin": "zài",
    "meaning": "at; in; exist",
    "radical": "土",
    "strokes": 6,
    "hsk": 1,
    "examples": [
      "在家 at home",
      "存在 exist"
    ],
    "decom": "才+土",
    "zhuyin": "ㄗㄞˋ"
  },
  "庭": {
    "pinyin": "tíng",
    "meaning": "courtyard; court",
    "radical": "广",
    "strokes": 9,
    "hsk": 4,
    "examples": [
      "庭院 courtyard",
      "家庭 family"
    ],
    "decom": "广+廷",
    "zhuyin": "ㄊㄧㄥˊ"
  },
  "院": {
    "pinyin": "yuàn",
    "meaning": "yard; courtyard",
    "radical": "阝",
    "strokes": 10,
    "hsk": 3,
    "examples": [
      "医院 hospital",
      "院子 yard"
    ],
    "decom": "阝+完",
    "zhuyin": "ㄩㄢˋ"
  },
  "里": {
    "pinyin": "lǐ",
    "meaning": "inside; village",
    "radical": "里",
    "strokes": 7,
    "hsk": 1,
    "examples": [
      "里面 inside",
      "公里 kilometer"
    ],
    "decom": "里",
    "zhuyin": "ㄌㄧˇ"
  },
  "看": {
    "pinyin": "kàn",
    "meaning": "look; see",
    "radical": "目",
    "strokes": 9,
    "hsk": 1,
    "examples": [
      "看见 see",
      "看起来 looks like"
    ],
    "decom": "手+目",
    "zhuyin": "ㄎㄢˋ"
  },
  "着": {
    "pinyin": "zhe",
    "meaning": "particle -ing",
    "radical": "目",
    "strokes": 11,
    "hsk": 2,
    "examples": [
      "看着 looking",
      "听着 listening"
    ],
    "decom": "羊+目",
    "zhuyin": "˙ㄓㄜ"
  },
  "雨": {
    "pinyin": "yǔ",
    "meaning": "rain",
    "radical": "雨",
    "strokes": 8,
    "hsk": 1,
    "examples": [
      "下雨 rain",
      "雨声 sound of rain"
    ],
    "decom": "雨",
    "zhuyin": "ㄩˇ"
  },
  "落": {
    "pinyin": "luò",
    "meaning": "fall; drop",
    "radical": "艹",
    "strokes": 12,
    "hsk": 3,
    "examples": [
      "落在 fall on",
      "落叶 fallen leaves"
    ],
    "decom": "艹+洛省",
    "zhuyin": "ㄌㄨㄛˋ"
  },
  "芭": {
    "pinyin": "bā",
    "meaning": "banana; plant name",
    "radical": "艹",
    "strokes": 7,
    "hsk": 5,
    "examples": [
      "芭蕉 banana leaf",
      "芭蕾 ballet"
    ],
    "decom": "艹+巴",
    "zhuyin": "ㄅㄚ"
  },
  "蕉": {
    "pinyin": "jiāo",
    "meaning": "banana; plantain",
    "radical": "艹",
    "strokes": 15,
    "hsk": 6,
    "examples": [
      "香蕉 banana",
      "芭蕉 banana"
    ],
    "decom": "艹+焦",
    "zhuyin": "ㄐㄧㄠ"
  },
  "叶": {
    "pinyin": "yè",
    "meaning": "leaf",
    "radical": "口",
    "strokes": 5,
    "hsk": 3,
    "examples": [
      "叶子 leaf",
      "茶叶 tea leaves"
    ],
    "decom": "口+十",
    "zhuyin": "ㄧㄝˋ"
  },
  "上": {
    "pinyin": "shàng",
    "meaning": "on; up; above",
    "radical": "一",
    "strokes": 3,
    "hsk": 1,
    "examples": [
      "上面 above",
      "早上 morning"
    ],
    "decom": "一+卜",
    "zhuyin": "ㄕㄤˋ"
  },
  "这": {
    "pinyin": "zhè",
    "meaning": "this",
    "radical": "辶",
    "strokes": 7,
    "hsk": 1,
    "examples": [
      "这个 this one",
      "这里 here"
    ],
    "decom": "文+辶",
    "zhuyin": "ㄓㄜˋ"
  },
  "场": {
    "pinyin": "chǎng",
    "meaning": "field; occasion; classifier for rain",
    "radical": "土",
    "strokes": 6,
    "hsk": 2,
    "examples": [
      "一场雨 a rain",
      "操场 playground"
    ],
    "decom": "土+场右",
    "zhuyin": "ㄔㄤˇ"
  },
  "他": {
    "pinyin": "tā",
    "meaning": "he; him",
    "radical": "亻",
    "strokes": 5,
    "hsk": 1,
    "examples": [
      "他们 they",
      "他的 his"
    ],
    "decom": "亻+也",
    "zhuyin": "ㄊㄚ"
  },
  "已": {
    "pinyin": "yǐ",
    "meaning": "already",
    "radical": "己",
    "strokes": 3,
    "hsk": 2,
    "examples": [
      "已经 already",
      "已知 known"
    ],
    "decom": "已",
    "zhuyin": "ㄧˇ"
  },
  "经": {
    "pinyin": "jīng",
    "meaning": "through; classic",
    "radical": "纟",
    "strokes": 8,
    "hsk": 2,
    "examples": [
      "已经 already",
      "经常 often"
    ],
    "decom": "纟+巠",
    "zhuyin": "ㄐㄧㄥ"
  },
  "等": {
    "pinyin": "děng",
    "meaning": "wait; equal",
    "radical": "竹",
    "strokes": 12,
    "hsk": 2,
    "examples": [
      "等待 wait",
      "等等 wait a moment"
    ],
    "decom": "竹+寺",
    "zhuyin": "ㄉㄥˇ"
  },
  "了": {
    "pinyin": "le",
    "meaning": "particle completed",
    "radical": "乛",
    "strokes": 2,
    "hsk": 1,
    "examples": [
      "好了 done",
      "来了 came"
    ],
    "decom": "乛+了",
    "zhuyin": "˙ㄌㄜ"
  },
  "很": {
    "pinyin": "hěn",
    "meaning": "very",
    "radical": "彳",
    "strokes": 9,
    "hsk": 1,
    "examples": [
      "很好 very good",
      "很多 many"
    ],
    "decom": "彳+艮",
    "zhuyin": "ㄏㄣˇ"
  },
  "多": {
    "pinyin": "duō",
    "meaning": "many; much",
    "radical": "夕",
    "strokes": 6,
    "hsk": 1,
    "examples": [
      "很多 many",
      "多长时间 how long"
    ],
    "decom": "夕+夕",
    "zhuyin": "ㄉㄨㄛ"
  },
  "天": {
    "pinyin": "tiān",
    "meaning": "day; sky",
    "radical": "大",
    "strokes": 4,
    "hsk": 1,
    "examples": [
      "今天 today",
      "天气 weather"
    ],
    "decom": "一+大",
    "zhuyin": "ㄊㄧㄢ"
  },
  "杯": {
    "pinyin": "bēi",
    "meaning": "cup; glass",
    "radical": "木",
    "strokes": 8,
    "hsk": 2,
    "examples": [
      "一杯茶 a cup of tea",
      "杯子 cup"
    ],
    "decom": "木+不",
    "zhuyin": "ㄅㄟ"
  },
  "中": {
    "pinyin": "zhōng",
    "meaning": "middle; in",
    "radical": "丨",
    "strokes": 4,
    "hsk": 1,
    "examples": [
      "中国 China",
      "中间 middle"
    ],
    "decom": "口+丨",
    "zhuyin": "ㄓㄨㄥ"
  },
  "茶": {
    "pinyin": "chá",
    "meaning": "tea",
    "radical": "艹",
    "strokes": 9,
    "hsk": 2,
    "examples": [
      "喝茶 drink tea",
      "茶叶 tea leaf"
    ],
    "decom": "艹+茶省",
    "zhuyin": "ㄔㄚˊ"
  },
  "凉": {
    "pinyin": "liáng",
    "meaning": "cool; cold",
    "radical": "冫",
    "strokes": 10,
    "hsk": 3,
    "examples": [
      "凉了 gone cold",
      "凉快 cool"
    ],
    "decom": "冫+京",
    "zhuyin": "ㄌㄧㄤˊ"
  },
  "但": {
    "pinyin": "dàn",
    "meaning": "but",
    "radical": "亻",
    "strokes": 7,
    "hsk": 2,
    "examples": [
      "但是 but",
      "不但 not only"
    ],
    "decom": "亻+旦",
    "zhuyin": "ㄉㄢˋ"
  },
  "没": {
    "pinyin": "méi",
    "meaning": "not; have not",
    "radical": "氵",
    "strokes": 7,
    "hsk": 1,
    "examples": [
      "没有 not have",
      "没事 it's ok"
    ],
    "decom": "氵+殳",
    "zhuyin": "ㄇㄟˊ"
  },
  "有": {
    "pinyin": "yǒu",
    "meaning": "have; exist",
    "radical": "月",
    "strokes": 6,
    "hsk": 1,
    "examples": [
      "有意思 interesting",
      "有名 famous"
    ],
    "decom": "𠂇+月",
    "zhuyin": "ㄧㄡˇ"
  },
  "察": {
    "pinyin": "chá",
    "meaning": "observe;察觉 notice",
    "radical": "宀",
    "strokes": 14,
    "hsk": 4,
    "examples": [
      "察觉 notice",
      "观察 observe"
    ],
    "decom": "宀+祭",
    "zhuyin": "ㄔㄚˊ"
  },
  "觉": {
    "pinyin": "jué",
    "meaning": "feel; sense",
    "radical": "见",
    "strokes": 9,
    "hsk": 3,
    "examples": [
      "觉得 feel",
      "察觉 notice"
    ],
    "decom": "学省+见",
    "zhuyin": "ㄐㄩㄝˊ"
  },
  "声": {
    "pinyin": "shēng",
    "meaning": "sound; voice",
    "radical": "士",
    "strokes": 7,
    "hsk": 2,
    "examples": [
      "声音 sound",
      "大声 loud"
    ],
    "decom": "士+尸",
    "zhuyin": "ㄕㄥ"
  },
  "像": {
    "pinyin": "xiàng",
    "meaning": "like; resemble",
    "radical": "亻",
    "strokes": 13,
    "hsk": 2,
    "examples": [
      "好像 like",
      "画像 portrait"
    ],
    "decom": "亻+象",
    "zhuyin": "ㄒㄧㄤˋ"
  },
  "一": {
    "pinyin": "yī",
    "meaning": "one",
    "radical": "一",
    "strokes": 1,
    "hsk": 1,
    "examples": [
      "一个 one",
      "一起 together"
    ],
    "decom": "一",
    "zhuyin": "ㄧ"
  },
  "位": {
    "pinyin": "wèi",
    "meaning": "position; classifier",
    "radical": "亻",
    "strokes": 7,
    "hsk": 2,
    "examples": [
      "一位 one (person)",
      "位置 position"
    ],
    "decom": "亻+立",
    "zhuyin": "ㄨㄟˋ"
  },
  "朋": {
    "pinyin": "péng",
    "meaning": "friend",
    "radical": "月",
    "strokes": 8,
    "hsk": 1,
    "examples": [
      "朋友 friend",
      "亲朋 relatives"
    ],
    "decom": "月+月",
    "zhuyin": "ㄆㄥˊ"
  },
  "友": {
    "pinyin": "yǒu",
    "meaning": "friend",
    "radical": "又",
    "strokes": 4,
    "hsk": 1,
    "examples": [
      "朋友 friend",
      "友好 friendly"
    ],
    "decom": "又+丶",
    "zhuyin": "ㄧㄡˇ"
  },
  "讲": {
    "pinyin": "jiǎng",
    "meaning": "speak; tell",
    "radical": "讠",
    "strokes": 6,
    "hsk": 2,
    "examples": [
      "讲述 tell",
      "讲话 speak"
    ],
    "decom": "讠+井",
    "zhuyin": "ㄐㄧㄤˇ"
  },
  "述": {
    "pinyin": "shù",
    "meaning": "narrate",
    "radical": "辶",
    "strokes": 8,
    "hsk": 4,
    "examples": [
      "讲述 narrate",
      "描述 describe"
    ],
    "decom": "术+辶",
    "zhuyin": "ㄕㄨˋ"
  },
  "远": {
    "pinyin": "yuǎn",
    "meaning": "far; distant",
    "radical": "辶",
    "strokes": 7,
    "hsk": 2,
    "examples": [
      "远山 distant mountain",
      "很远 far"
    ],
    "decom": "元+辶",
    "zhuyin": "ㄩㄢˇ"
  },
  "山": {
    "pinyin": "shān",
    "meaning": "mountain",
    "radical": "山",
    "strokes": 3,
    "hsk": 1,
    "examples": [
      "山上 on mountain",
      "远山 distant hills"
    ],
    "decom": "山",
    "zhuyin": "ㄕㄢ"
  },
  "故": {
    "pinyin": "gù",
    "meaning": "old; story; reason",
    "radical": "攵",
    "strokes": 9,
    "hsk": 3,
    "examples": [
      "故事 story",
      "故乡 hometown"
    ],
    "decom": "古+攵",
    "zhuyin": "ㄍㄨˋ"
  },
  "事": {
    "pinyin": "shì",
    "meaning": "matter; thing",
    "radical": "亅",
    "strokes": 8,
    "hsk": 1,
    "examples": [
      "事情 matter",
      "故事 story"
    ],
    "decom": "亅+聿",
    "zhuyin": "ㄕˋ"
  },
  "停": {
    "pinyin": "tíng",
    "meaning": "stop",
    "radical": "亻",
    "strokes": 11,
    "hsk": 2,
    "examples": [
      "雨停 rain stops",
      "停止 stop"
    ],
    "decom": "亻+亭",
    "zhuyin": "ㄊㄧㄥˊ"
  },
  "时": {
    "pinyin": "shí",
    "meaning": "time; when",
    "radical": "日",
    "strokes": 7,
    "hsk": 1,
    "examples": [
      "时候 when",
      "时间 time"
    ],
    "decom": "日+寸",
    "zhuyin": "ㄕˊ"
  },
  "候": {
    "pinyin": "hòu",
    "meaning": "wait; time",
    "radical": "亻",
    "strokes": 10,
    "hsk": 2,
    "examples": [
      "时候 time",
      "等候 wait"
    ],
    "decom": "亻+侯",
    "zhuyin": "ㄏㄡˋ"
  },
  "变": {
    "pinyin": "biàn",
    "meaning": "change; become",
    "radical": "又",
    "strokes": 8,
    "hsk": 2,
    "examples": [
      "变得 become",
      "变化 change"
    ],
    "decom": "亦+又",
    "zhuyin": "ㄅㄧㄢˋ"
  },
  "得": {
    "pinyin": "de",
    "meaning": "particle; obtain",
    "radical": "彳",
    "strokes": 11,
    "hsk": 1,
    "examples": [
      "变得 become",
      "得到 get"
    ],
    "decom": "彳+旦",
    "zhuyin": "˙ㄉㄜ"
  },
  "干": {
    "pinyin": "gān",
    "meaning": "dry; clean",
    "radical": "干",
    "strokes": 3,
    "hsk": 2,
    "examples": [
      "干净 clean",
      "干了 dry"
    ],
    "decom": "干",
    "zhuyin": "ㄍㄢ"
  },
  "净": {
    "pinyin": "jìng",
    "meaning": "clean; net",
    "radical": "冫",
    "strokes": 8,
    "hsk": 3,
    "examples": [
      "干净 clean",
      "安静 quiet"
    ],
    "decom": "冫+争",
    "zhuyin": "ㄐㄧㄥˋ"
  },
  "而": {
    "pinyin": "ér",
    "meaning": "and; but",
    "radical": "而",
    "strokes": 6,
    "hsk": 2,
    "examples": [
      "然而 however",
      "美丽而安静"
    ],
    "decom": "而",
    "zhuyin": "ㄦˊ"
  },
  "明": {
    "pinyin": "míng",
    "meaning": "bright; clear",
    "radical": "日",
    "strokes": 8,
    "hsk": 1,
    "examples": [
      "明亮 bright",
      "明白 understand"
    ],
    "decom": "日+月",
    "zhuyin": "ㄇㄧㄥˊ"
  },
  "亮": {
    "pinyin": "liàng",
    "meaning": "bright; light",
    "radical": "亠",
    "strokes": 9,
    "hsk": 2,
    "examples": [
      "明亮 bright",
      "灯光 light"
    ],
    "decom": "高省+几",
    "zhuyin": "ㄌㄧㄤˋ"
  },
  "只": {
    "pinyin": "zhī",
    "meaning": "only; classifier",
    "radical": "口",
    "strokes": 5,
    "hsk": 1,
    "examples": [
      "一只 a (animal)",
      "只有 only"
    ],
    "decom": "口+八",
    "zhuyin": "ㄓ"
  },
  "麻": {
    "pinyin": "má",
    "meaning": "hemp; sesame",
    "radical": "麻",
    "strokes": 11,
    "hsk": 4,
    "examples": [
      "麻雀 sparrow",
      "麻烦 trouble"
    ],
    "decom": "麻",
    "zhuyin": "ㄇㄚˊ"
  },
  "雀": {
    "pinyin": "què",
    "meaning": "sparrow; bird",
    "radical": "隹",
    "strokes": 11,
    "hsk": 5,
    "examples": [
      "麻雀 sparrow",
      "孔雀 peacock"
    ],
    "decom": "小+隹",
    "zhuyin": "ㄑㄩㄝˋ"
  },
  "石": {
    "pinyin": "shí",
    "meaning": "stone",
    "radical": "石",
    "strokes": 5,
    "hsk": 2,
    "examples": [
      "石头 stone",
      "石桌 stone table"
    ],
    "decom": "石",
    "zhuyin": "ㄕˊ"
  },
  "桌": {
    "pinyin": "zhuō",
    "meaning": "table; desk",
    "radical": "木",
    "strokes": 10,
    "hsk": 2,
    "examples": [
      "桌子 table",
      "书桌 desk"
    ],
    "decom": "木+卓",
    "zhuyin": "ㄓㄨㄛ"
  },
  "黄": {
    "pinyin": "huáng",
    "meaning": "yellow",
    "radical": "黄",
    "strokes": 11,
    "hsk": 2,
    "examples": [
      "黄色 yellow",
      "黄灯 yellow light"
    ],
    "decom": "黄",
    "zhuyin": "ㄏㄨㄤˊ"
  },
  "色": {
    "pinyin": "sè",
    "meaning": "color",
    "radical": "色",
    "strokes": 6,
    "hsk": 2,
    "examples": [
      "颜色 color",
      "黄色 yellow"
    ],
    "decom": "色",
    "zhuyin": "ㄙㄜˋ"
  },
  "灯": {
    "pinyin": "dēng",
    "meaning": "lamp; light",
    "radical": "火",
    "strokes": 6,
    "hsk": 2,
    "examples": [
      "灯光 lamplight",
      "台灯 desk lamp"
    ],
    "decom": "火+丁",
    "zhuyin": "ㄉㄥ"
  },
  "光": {
    "pinyin": "guāng",
    "meaning": "light",
    "radical": "儿",
    "strokes": 6,
    "hsk": 2,
    "examples": [
      "灯光 light",
      "阳光 sunlight"
    ],
    "decom": "小+兀",
    "zhuyin": "ㄍㄨㄤ"
  },
  "下": {
    "pinyin": "xià",
    "meaning": "down; under",
    "radical": "一",
    "strokes": 3,
    "hsk": 1,
    "examples": [
      "下面 below",
      "灯下 under lamp"
    ],
    "decom": "一+卜",
    "zhuyin": "ㄒㄧㄚˋ"
  },
  "母": {
    "pinyin": "mǔ",
    "meaning": "mother",
    "radical": "母",
    "strokes": 5,
    "hsk": 2,
    "examples": [
      "母亲 mother",
      "父母 parents"
    ],
    "decom": "母",
    "zhuyin": "ㄇㄨˇ"
  },
  "亲": {
    "pinyin": "qīn",
    "meaning": "parent; dear",
    "radical": "亠",
    "strokes": 9,
    "hsk": 1,
    "examples": [
      "母亲 mother",
      "亲爱的 dear"
    ],
    "decom": "立+木",
    "zhuyin": "ㄑㄧㄣ"
  },
  "缝": {
    "pinyin": "féng",
    "meaning": "sew; stitch",
    "radical": "纟",
    "strokes": 13,
    "hsk": 5,
    "examples": [
      "缝补 mend",
      "缝衣 sew clothes"
    ],
    "decom": "纟+逢",
    "zhuyin": "ㄈㄥˊ"
  },
  "补": {
    "pinyin": "bǔ",
    "meaning": "mend; supplement",
    "radical": "衤",
    "strokes": 7,
    "hsk": 3,
    "examples": [
      "缝补 mend",
      "补充 supplement"
    ],
    "decom": "衤+卜",
    "zhuyin": "ㄅㄨˇ"
  },
  "我": {
    "pinyin": "wǒ",
    "meaning": "I; me",
    "radical": "戈",
    "strokes": 7,
    "hsk": 1,
    "examples": [
      "我们 we",
      "我的 my"
    ],
    "decom": "手+戈",
    "zhuyin": "ㄨㄛˇ"
  },
  "旧": {
    "pinyin": "jiù",
    "meaning": "old; used",
    "radical": "日",
    "strokes": 5,
    "hsk": 2,
    "examples": [
      "旧衣服 old clothes",
      "依旧 still"
    ],
    "decom": "丨+日",
    "zhuyin": "ㄐㄧㄡˋ"
  },
  "外": {
    "pinyin": "wài",
    "meaning": "outside; outer",
    "radical": "夕",
    "strokes": 5,
    "hsk": 1,
    "examples": [
      "外面 outside",
      "外套 coat"
    ],
    "decom": "夕+卜",
    "zhuyin": "ㄨㄞˋ"
  },
  "套": {
    "pinyin": "tào",
    "meaning": "set; cover",
    "radical": "大",
    "strokes": 10,
    "hsk": 3,
    "examples": [
      "外套 coat",
      "一套 a set"
    ],
    "decom": "大+長",
    "zhuyin": "ㄊㄠˋ"
  },
  "手": {
    "pinyin": "shǒu",
    "meaning": "hand",
    "radical": "手",
    "strokes": 4,
    "hsk": 1,
    "examples": [
      "手里 in hand",
      "动手 start"
    ],
    "decom": "手",
    "zhuyin": "ㄕㄡˇ"
  },
  "慢": {
    "pinyin": "màn",
    "meaning": "slow",
    "radical": "忄",
    "strokes": 14,
    "hsk": 2,
    "examples": [
      "慢慢 slow",
      "慢一点 slower"
    ],
    "decom": "忄+曼",
    "zhuyin": "ㄇㄢˋ"
  },
  "每": {
    "pinyin": "měi",
    "meaning": "each; every",
    "radical": "母",
    "strokes": 7,
    "hsk": 2,
    "examples": [
      "每一 every",
      "每天 daily"
    ],
    "decom": "人+母",
    "zhuyin": "ㄇㄟˇ"
  },
  "针": {
    "pinyin": "zhēn",
    "meaning": "needle; stitch",
    "radical": "钅",
    "strokes": 7,
    "hsk": 4,
    "examples": [
      "一针 a stitch",
      "针线 needlework"
    ],
    "decom": "钅+十",
    "zhuyin": "ㄓㄣ"
  },
  "细": {
    "pinyin": "xì",
    "meaning": "fine; careful",
    "radical": "纟",
    "strokes": 8,
    "hsk": 3,
    "examples": [
      "细心 careful",
      "仔细 detailed"
    ],
    "decom": "纟+田",
    "zhuyin": "ㄒㄧˋ"
  },
  "心": {
    "pinyin": "xīn",
    "meaning": "heart; mind",
    "radical": "心",
    "strokes": 4,
    "hsk": 1,
    "examples": [
      "细心 careful",
      "心里 in heart"
    ],
    "decom": "心",
    "zhuyin": "ㄒㄧㄣ"
  },
  "结": {
    "pinyin": "jié",
    "meaning": "knot; firm; tie",
    "radical": "纟",
    "strokes": 9,
    "hsk": 3,
    "examples": [
      "结实 firm",
      "结果 result"
    ],
    "decom": "纟+吉",
    "zhuyin": "ㄐㄧㄝˊ"
  },
  "实": {
    "pinyin": "shí",
    "meaning": "real; solid",
    "radical": "宀",
    "strokes": 8,
    "hsk": 2,
    "examples": [
      "结实 solid",
      "真实 true"
    ],
    "decom": "宀+头",
    "zhuyin": "ㄕˊ"
  }
};
