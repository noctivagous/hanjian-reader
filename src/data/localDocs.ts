// Local-only books generated from in-copyright private/ sources (see
// private/README.md). The glob below matches only the gitignored generated
// module; on a clean clone it matches nothing and this exports [] — the app
// builds and runs with just the committed sample docs.

import type { Doc } from './types';

const modules = import.meta.glob<{ taoTeChing: Doc }>(
  './tao-te-ching.generated.ts',
  { eager: true },
);

let localDocs: Doc[] = [];
for (const mod of Object.values(modules)) {
  if (mod?.taoTeChing && typeof mod.taoTeChing.id === 'string') {
    localDocs.push(mod.taoTeChing);
  } else if (import.meta.env.DEV) {
    console.warn(
      '[localDocs] ignoring malformed generated module (expected `taoTeChing: Doc`)',
    );
  }
}

export const extraDocs: Doc[] = localDocs;
