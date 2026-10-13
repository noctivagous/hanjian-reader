export interface WordAlign {
  en: string;
  zh: string;
  pinyin: string;
  def: string;
}

export interface Sentence {
  id: string;
  en: string;
  zh: string;
  words: WordAlign[];
}

export interface Paragraph {
  id: string;
  en: string;
  zh: string;
  sentences: Sentence[];
}

export interface Doc {
  id: string;
  titleEn: string;
  titleZh: string;
  author: string;
  paragraphs: Paragraph[];
}
