import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildTmx, escapeXml } from '../src/lib/tmx.ts';
import { buildEpub, buildZip, crc32 } from '../src/lib/epub.ts';

const doc = {
  format: 'hanjian',
  version: 1,
  id: 'exp',
  titleEn: 'Export & Test',
  titleZh: '导出',
  author: 'Tester',
  sourceLanguage: 'zh',
  sections: [
    {
      id: 's1',
      titleEn: 'Chapter One',
      titleZh: '第一章',
      paragraphs: [
        {
          id: 'p1',
          zh: '學而時習之，不亦說乎。',
          sentences: [
            {
              id: 'a',
              zh: '學而時習之',
              translations: [
                { id: 'en', language: 'en', label: 'English', translator: '', text: 'Learning & practice <daily>', words: [] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 's2',
      titleEn: '',
      titleZh: '第二章',
      paragraphs: [{ id: 'p2', zh: '有朋自遠方來。', sentences: [] }],
    },
  ],
};

describe('TMX export', () => {
  it('emits one TU per sentence with escaped segments', () => {
    const tmx = buildTmx(doc);
    assert.match(tmx, /<tmx version="1\.4">/);
    assert.equal((tmx.match(/<tu /g) || []).length, 1);
    assert.ok(tmx.includes('<seg>學而時習之</seg>'));
    assert.ok(tmx.includes('<seg>Learning &amp; practice &lt;daily&gt;</seg>'));
    assert.equal(escapeXml('a & "b" <c>'), 'a &amp; &quot;b&quot; &lt;c&gt;');
  });
});

/** Read a store-only ZIP's central directory: [{name, crc, offset, size}]. */
function readDirectory(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = bytes.length - 22;
  assert.equal(view.getUint32(eocd, true), 0x06054b50);
  const count = view.getUint16(eocd + 10, true);
  let pos = view.getUint32(eocd + 16, true);
  const out = [];
  const dec = new TextDecoder();
  for (let i = 0; i < count; i++) {
    assert.equal(view.getUint32(pos, true), 0x02014b50);
    const nameLen = view.getUint16(pos + 28, true);
    const name = dec.decode(bytes.slice(pos + 46, pos + 46 + nameLen));
    out.push({
      name,
      crc: view.getUint32(pos + 16, true),
      size: view.getUint32(pos + 24, true),
      offset: view.getUint32(pos + 42, true),
    });
    pos += 46 + nameLen;
  }
  return out;
}

describe('EPUB export', () => {
  it('produces a structurally valid EPUB zip', () => {
    const bytes = buildEpub(doc);
    assert.equal(new DataView(bytes.buffer).getUint32(0, true), 0x04034b50);

    const dir = readDirectory(bytes);
    assert.deepEqual(
      dir.map((e) => e.name),
      [
        'mimetype',
        'META-INF/container.xml',
        'OEBPS/content.opf',
        'OEBPS/nav.xhtml',
        'OEBPS/style.css',
        'OEBPS/s001.xhtml',
        'OEBPS/s002.xhtml',
      ],
    );

    // The mimetype entry is first, stored, and exact.
    const first = dir[0];
    const nameLen = new DataView(bytes.buffer).getUint16(first.offset + 26, true);
    const data = bytes.slice(
      first.offset + 30 + nameLen,
      first.offset + 30 + nameLen + first.size,
    );
    assert.equal(new TextDecoder().decode(data), 'application/epub+zip');

    // Every directory CRC matches the stored data.
    const dec = new TextDecoder();
    for (const e of dir) {
      const nl = new DataView(bytes.buffer).getUint16(e.offset + 26, true);
      const d = bytes.slice(e.offset + 30 + nl, e.offset + 30 + nl + e.size);
      assert.equal(crc32(d), e.crc, `crc for ${e.name}`);
      const body = dec.decode(d);
      if (e.name === 'OEBPS/content.opf') {
        assert.ok(body.includes('<dc:title>Export &amp; Test</dc:title>'));
        assert.ok(body.includes('idref="s2"'));
      }
      if (e.name === 'OEBPS/s001.xhtml') {
        assert.ok(body.includes('學而時習之，不亦說乎。'));
        assert.ok(body.includes('Learning &amp; practice &lt;daily&gt;'));
      }
    }
  });

  it('buildZip round-trips arbitrary entries', () => {
    const bytes = buildZip([
      { name: 'a.txt', data: new TextEncoder().encode('hello') },
      { name: 'b/c.txt', data: new TextEncoder().encode('world') },
    ]);
    const dir = readDirectory(bytes);
    assert.deepEqual(dir.map((e) => e.name), ['a.txt', 'b/c.txt']);
    assert.equal(dir[0].size, 5);
  });
});
