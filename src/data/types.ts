export interface WordSense {
  pinyin: string;
  def: string;
}

/** How a pair is used in the reader. Omitted records are inferred. */
export type AlignRole = 'span' | 'gloss';

export interface WordAlign {
  en: string;
  zh: string;
  pinyin: string;
  def: string;
  /**
   * `span` underlines a range of Translation.text. `gloss` is a lexical
   * chip (not required to appear in the English sentence). When omitted:
   * offsets ⇒ span, otherwise gloss.
   */
  role?: AlignRole;
  /**
   * Character offsets into Translation.text. Required for the span
   * surface; ignored on gloss-only records.
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
