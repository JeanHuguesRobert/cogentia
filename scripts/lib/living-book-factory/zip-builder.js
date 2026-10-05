/**
 * Pure JavaScript ZIP archive builder using Node.js built-in zlib.
 * Generates valid, standards-compliant ZIP files with zero external dependencies.
 * Essential for creating EPUB files where mimetype must be stored uncompressed as the first entry.
 */

import zlib from 'node:zlib';

export class ZipBuilder {
  constructor() {
    this.entries = [];
  }

  /**
   * Add a file to the ZIP.
   * @param {string} name - Relative path inside zip (e.g. 'OEBPS/content.opf')
   * @param {string|Buffer} content - File content
   * @param {object} options - { compress: true/false }
   */
  addFile(name, content, options = {}) {
    const rawBuf = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    const compress = options.compress !== false;

    let compressedBuf = rawBuf;
    let method = 0; // STORE

    if (compress && rawBuf.length > 0) {
      compressedBuf = zlib.deflateRawSync(rawBuf, { level: 9 });
      method = 8; // DEFLATE
    }

    const crc = zlib.crc32(rawBuf);

    this.entries.push({
      name,
      uncompressedData: rawBuf,
      compressedData: compressedBuf,
      method,
      crc,
      uncompressedSize: rawBuf.length,
      compressedSize: compressedBuf.length
    });
  }

  build() {
    const localHeaders = [];
    const centralHeaders = [];
    let offset = 0;

    const now = new Date();
    // MS-DOS time and date format
    const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
    const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;

    for (const entry of this.entries) {
      const nameBuf = Buffer.from(entry.name, 'utf8');

      // 1. Local File Header (30 bytes + name length)
      const localHdr = Buffer.alloc(30 + nameBuf.length);
      localHdr.writeUInt32LE(0x04034b50, 0); // signature
      localHdr.writeUInt16LE(20, 4);          // version needed: 2.0
      localHdr.writeUInt16LE(0, 6);           // flags
      localHdr.writeUInt16LE(entry.method, 8); // compression method
      localHdr.writeUInt16LE(dosTime, 10);
      localHdr.writeUInt16LE(dosDate, 12);
      localHdr.writeUInt32LE(entry.crc, 14);
      localHdr.writeUInt32LE(entry.compressedSize, 18);
      localHdr.writeUInt32LE(entry.uncompressedSize, 22);
      localHdr.writeUInt16LE(nameBuf.length, 26);
      localHdr.writeUInt16LE(0, 28);          // extra field length
      nameBuf.copy(localHdr, 30);

      localHeaders.push(localHdr);
      localHeaders.push(entry.compressedData);

      // 2. Central Directory Header (46 bytes + name length)
      const centralHdr = Buffer.alloc(46 + nameBuf.length);
      centralHdr.writeUInt32LE(0x02014b50, 0); // signature
      centralHdr.writeUInt16LE(20, 4);          // version made by
      centralHdr.writeUInt16LE(20, 6);          // version needed
      centralHdr.writeUInt16LE(0, 8);           // flags
      centralHdr.writeUInt16LE(entry.method, 10);
      centralHdr.writeUInt16LE(dosTime, 12);
      centralHdr.writeUInt16LE(dosDate, 14);
      centralHdr.writeUInt32LE(entry.crc, 16);
      centralHdr.writeUInt32LE(entry.compressedSize, 20);
      centralHdr.writeUInt32LE(entry.uncompressedSize, 24);
      centralHdr.writeUInt16LE(nameBuf.length, 28);
      centralHdr.writeUInt16LE(0, 30);          // extra field length
      centralHdr.writeUInt16LE(0, 32);          // comment length
      centralHdr.writeUInt16LE(0, 34);          // disk number
      centralHdr.writeUInt16LE(0, 36);          // internal attrs
      centralHdr.writeUInt32LE(0, 38);          // external attrs
      centralHdr.writeUInt32LE(offset, 42);     // relative offset of local header
      nameBuf.copy(centralHdr, 46);

      centralHeaders.push(centralHdr);

      offset += localHdr.length + entry.compressedData.length;
    }

    const centralDirOffset = offset;
    const centralDirSize = centralHeaders.reduce((acc, h) => acc + h.length, 0);

    // 3. End of Central Directory Record (22 bytes)
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);            // signature
    eocd.writeUInt16LE(0, 4);                     // disk number
    eocd.writeUInt16LE(0, 6);                     // disk with start of central directory
    eocd.writeUInt16LE(this.entries.length, 8);   // entries on this disk
    eocd.writeUInt16LE(this.entries.length, 10);  // total entries
    eocd.writeUInt32LE(centralDirSize, 12);       // size of central directory
    eocd.writeUInt32LE(centralDirOffset, 16);     // offset of start of central directory
    eocd.writeUInt16LE(0, 20);                    // comment length

    return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
  }
}
