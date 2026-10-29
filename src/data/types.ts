export interface WordSense {
  pinyin: string;
  def: string;
}

export interface WordAlign {
  en: string;
  zh: string;
  pinyin: string;
  def: string;
  /**
   * Character offsets into Translation.text. When both are present, the
   * reader preserves the original English and makes only this exact range
   * hoverable. Legacy alignments omit them and render as a word list.
   */
  enStart?: number;
  enEnd?: number;
  /**
   * Every dictionary reading for this exact headword. Set only for
   * dictionary-backed tokens. Hand alignments leave it unset and use
   * pinyin/def as the single authored reading.
   */
  senses?: WordSense[];
}

export interface Translation {
  id: string;
  language: string;
  label: string;
  translator: string;
  license?: string;
  text: string;
  words: WordAlign[];
}

export interface Sentence {
  id: string;
  zh: string;
  translations: Translation[];
}

export interface Paragraph {
  id: string;
  zh: string;
  sentences: Sentence[];
}

export interface Section {
  id: string;
  titleEn: string;
  titleZh: string;
  paragraphs: Paragraph[];
}

export interface Doc {
  format: 'hanjian';
  version: 1;
  id: string;
  titleEn: string;
  titleZh: string;
  author: string;
  sourceLanguage: string;
  /** Script of the Chinese text. Optional so older docs still typecheck. */
  script?: 'simplified' | 'traditional';
  /** Distribution/licensing note (e.g. private-only in-copyright text). */
  license?: string;
  sections: Section[];
}
