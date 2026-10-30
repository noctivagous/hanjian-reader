import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { docs } from '../src/data/documents.ts';
import { normalizeTranslationWords } from '../src/lib/alignRoles.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

for (const doc of docs) {
  for (const section of doc.sections) {
    for (const para of section.paragraphs) {
      for (const sentence of para.sentences) {
        for (const tr of sentence.translations) {
          tr.words = normalizeTranslationWords(tr.text, sentence.zh, tr.words);
        }
      }
    }
  }
}

const body = `import type { Doc } from './types';\n\nexport const docs: Doc[] = ${JSON.stringify(docs, null, 2)};\n`;
writeFileSync(join(root, 'src/data/documents.ts'), body);
console.log('normalized bundled alignments');
