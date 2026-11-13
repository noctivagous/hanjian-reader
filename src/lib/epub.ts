import type { Doc } from '../data/types';
import { paragraphEn } from './doc.ts';
import { escapeXml } from './tmx.ts';

/**
 * EPUB 3 export, generated in the browser with no dependencies: a
 * store-only ZIP (mimetype first, uncompressed, per the EPUB spec)
 * carrying one XHTML file per section. Each paragraph appears as the
 * Chinese original followed by its translation, so the book reads in
 * any EPUB reader. buildEpub is pure and unit-tested; only the
 * download wrapper touches the DOM.
 */

// --- CRC32 (ZIP) -----------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// --- Minimal store-only ZIP ------------------------------------------

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

export function buildZip(entries: ZipEntry[]): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  // Fixed DOS date (2026-01-01) so exports are byte-stable.
  const dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1;

  for (const entry of entries) {
    const name = enc.encode(entry.name);
    const crc = crc32(entry.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 filenames
    local.setUint16(8, 0, true); // stored
    local.setUint16(10, 0, true);
    local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, entry.data.length, true);
    local.setUint32(22, entry.data.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    chunks.push(new Uint8Array(local.buffer), name, entry.data);

    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(8, 0x0800, true);
    central.setUint16(10, 0, true);
    central.setUint16(12, 0, true);
    central.setUint16(14, dosDate, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, entry.data.length, true);
    central.setUint32(24, entry.data.length, true);
    central.setUint16(28, name.length, true);
    central.setUint32(42, offset, true);
    centrals.push(new Uint8Array(central.buffer), name);

    offset += 30 + name.length + entry.data.length;
  }

  const cdStart = offset;
  let cdSize = 0;
  for (const c of centrals) cdSize += c.length;
  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true);
  eocd.setUint16(8, entries.length, true);
  eocd.setUint16(10, entries.length, true);
  eocd.setUint32(12, cdSize, true);
  eocd.setUint32(16, cdStart, true);

  const out = new Uint8Array(cdStart + cdSize + 22);
  let pos = 0;
  for (const c of [...chunks, ...centrals, new Uint8Array(eocd.buffer)]) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

// --- EPUB assembly ----------------------------------------------------

const enc = new TextEncoder();
const text = (s: string) => enc.encode(s);

function sectionXhtml(doc: Doc, section: Doc['sections'][number]): string {
  const title = section.titleEn || section.titleZh || doc.titleEn;
  const paras = section.paragraphs
    .map((p) => {
      const en = paragraphEn(p);
      return `    <p class="zh" xml:lang="zh">${escapeXml(p.zh)}</p>${
        en ? `\n    <p class="en" xml:lang="en">${escapeXml(en)}</p>` : ''
      }`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="zh" lang="zh">
  <head>
    <title>${escapeXml(title)}</title>
    <link rel="stylesheet" type="text/css" href="style.css" />
  </head>
  <body>
    <h1 xml:lang="zh">${escapeXml(section.titleZh || title)}</h1>
${section.titleEn && section.titleZh ? `    <p class="subtitle" xml:lang="en">${escapeXml(section.titleEn)}</p>\n` : ''}${paras}
  </body>
</html>
`;
}

export function buildEpub(doc: Doc): Uint8Array {
  const sectionFiles = doc.sections.map(
    (_, i) => `OEBPS/s${String(i + 1).padStart(3, '0')}.xhtml`,
  );
  const manifestItems = sectionFiles
    .map(
      (f, i) =>
        `    <item id="s${i + 1}" href="${f.slice('OEBPS/'.length)}" media-type="application/xhtml+xml" />`,
    )
    .join('\n');
  const spineItems = sectionFiles
    .map((_, i) => `    <itemref idref="s${i + 1}" />`)
    .join('\n');
  const navItems = doc.sections
    .map(
      (s, i) =>
        `        <li><a href="${sectionFiles[i].slice('OEBPS/'.length)}">${escapeXml(s.titleEn || s.titleZh || `Section ${i + 1}`)}</a></li>`,
    )
    .join('\n');

  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:hanjian:${escapeXml(doc.id)}</dc:identifier>
    <dc:title>${escapeXml(doc.titleEn || doc.titleZh)}</dc:title>
    <dc:creator>${escapeXml(doc.author || 'Unknown')}</dc:creator>
    <dc:language>zh</dc:language>
    <dc:publisher>HanJian Reader</dc:publisher>
    <meta property="dcterms:modified">2026-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />
    <item id="css" href="style.css" media-type="text/css" />
${manifestItems}
  </manifest>
  <spine>
${spineItems}
  </spine>
</package>
`;

  const nav = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
  <head><title>Contents</title></head>
  <body>
    <nav epub:type="toc">
      <h1>Contents</h1>
      <ol>
${navItems}
      </ol>
    </nav>
  </body>
</html>
`;

  const css = `body { font-family: serif; line-height: 1.7; margin: 1em; }
h1 { font-size: 1.4em; }
p.zh { margin: 0.8em 0 0.2em; }
p.en { margin: 0 0 0.8em; color: #444; }
p.subtitle { color: #666; }
`;

  const container = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />
  </rootfiles>
</container>
`;

  return buildZip([
    { name: 'mimetype', data: text('application/epub+zip') },
    { name: 'META-INF/container.xml', data: text(container) },
    { name: 'OEBPS/content.opf', data: text(opf) },
    { name: 'OEBPS/nav.xhtml', data: text(nav) },
    { name: 'OEBPS/style.css', data: text(css) },
    ...doc.sections.map((s, i) => ({
      name: sectionFiles[i],
      data: text(sectionXhtml(doc, s)),
    })),
  ]);
}

export function downloadEpub(doc: Doc): void {
  const bytes = buildEpub(doc);
  const blob = new Blob([bytes.buffer as ArrayBuffer], {
    type: 'application/epub+zip',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.id.replace(/[^a-zA-Z0-9_-]+/g, '-')}.epub`;
  a.click();
  URL.revokeObjectURL(url);
}
