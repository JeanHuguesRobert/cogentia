/**
 * Pure JavaScript PDF generator for Living Book Press.
 * Generates standards-compliant PDF-1.4 documents with no external dependencies.
 */

import crypto from 'node:crypto';

/**
 * Escapes text for PDF string literals: replaces (, ), \
 */
function escapePdfText(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Formats points into string with 2 decimals
 */
function pt(val) {
  return Number(val).toFixed(2);
}

export class SimplePdfDocument {
  constructor(options = {}) {
    this.format = options.format || 'A4';
    // A4: 595.28 x 841.89 pt, A5: 419.53 x 595.28 pt
    if (this.format.toUpperCase() === 'A5') {
      this.width = 419.53;
      this.height = 595.28;
    } else {
      this.width = 595.28;
      this.height = 841.89;
    }
    this.pages = [];
  }

  addPage() {
    const page = {
      commands: []
    };
    this.pages.push(page);
    return page;
  }

  // Draw rectangle outline or filled
  drawRect(page, x, y, width, height, stroke = true, fill = false, grayStroke = 0, grayFill = 1) {
    let cmd = '';
    if (stroke) cmd += `${pt(grayStroke)} G `;
    if (fill) cmd += `${pt(grayFill)} g `;
    cmd += `${pt(x)} ${pt(y)} ${pt(width)} ${pt(height)} re `;
    if (stroke && fill) cmd += 'B\n';
    else if (fill) cmd += 'f\n';
    else cmd += 'S\n';
    page.commands.push(cmd);
  }

  // Draw line
  drawLine(page, x1, y1, x2, y2, gray = 0, lineWidth = 1) {
    page.commands.push(`${pt(lineWidth)} w ${pt(gray)} G ${pt(x1)} ${pt(y1)} m ${pt(x2)} ${pt(y2)} l S\n`);
  }

  // Add text
  addText(page, text, x, y, fontSize = 10, fontName = 'F1', gray = 0) {
    const escaped = escapePdfText(text);
    page.commands.push(`BT /${fontName} ${pt(fontSize)} Tf ${pt(gray)} g ${pt(x)} ${pt(y)} Td (${escaped}) Tj ET\n`);
  }

  // Build the binary PDF buffer with exact xref table
  build() {
    const chunks = [];
    const offsets = [];

    function write(str) {
      const buf = Buffer.isBuffer(str) ? str : Buffer.from(str, 'binary');
      chunks.push(buf);
      return buf.length;
    }

    let currentOffset = 0;
    function addChunk(str) {
      const len = write(str);
      currentOffset += len;
    }

    // Header (PDF-1.4 + binary marker)
    addChunk('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

    // Object 1: Catalog
    offsets[1] = currentOffset;
    addChunk('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    // Page count & page object numbers
    // Obj 2 is Pages
    // For each page:
    // Obj (2 + i*2 + 1) is Page
    // Obj (2 + i*2 + 2) is Contents
    const pageCount = this.pages.length;
    const pageObjIds = [];
    for (let i = 0; i < pageCount; i++) {
      pageObjIds.push(3 + i * 2);
    }
    const font1Id = 3 + pageCount * 2;
    const font2Id = font1Id + 1;
    const font3Id = font1Id + 2;

    // Object 2: Pages
    offsets[2] = currentOffset;
    const kidsStr = pageObjIds.map(id => `${id} 0 R`).join(' ');
    addChunk(`2 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${pageCount} >>\nendobj\n`);

    // Write each Page and its Contents stream
    for (let i = 0; i < pageCount; i++) {
      const page = this.pages[i];
      const pageId = 3 + i * 2;
      const contentId = pageId + 1;

      // Stream content
      const streamBody = page.commands.join('');
      const streamLen = Buffer.byteLength(streamBody, 'utf8');

      // Page Object
      offsets[pageId] = currentOffset;
      addChunk(`${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pt(this.width)} ${pt(this.height)}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${font1Id} 0 R /F2 ${font2Id} 0 R /F3 ${font3Id} 0 R >> >> >>\nendobj\n`);

      // Content Stream Object
      offsets[contentId] = currentOffset;
      addChunk(`${contentId} 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamBody}\nendstream\nendobj\n`);
    }

    // Fonts: F1 = Helvetica, F2 = Helvetica-Bold, F3 = Courier
    offsets[font1Id] = currentOffset;
    addChunk(`${font1Id} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`);

    offsets[font2Id] = currentOffset;
    addChunk(`${font2Id} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`);

    offsets[font3Id] = currentOffset;
    addChunk(`${font3Id} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n`);

    // XRef Table
    const startXref = currentOffset;
    const totalObjs = font3Id + 1;
    addChunk(`xref\n0 ${totalObjs}\n`);
    addChunk('0000000000 65535 f \n');
    for (let i = 1; i < totalObjs; i++) {
      const off = String(offsets[i]).padStart(10, '0');
      addChunk(`${off} 00000 n \n`);
    }

    // Trailer
    addChunk(`trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`);

    return Buffer.concat(chunks);
  }
}

/**
 * Generates a complete Living Book unique copy PDF with colophon/identity page.
 */
export function renderUniqueCopyPdf(copyRecord, options = {}) {
  const doc = new SimplePdfDocument({ format: copyRecord.render?.format || 'A4' });

  // Page 1: The Singular Copy Colophon / Identity Plate
  const p1 = doc.addPage();
  const W = doc.width;
  const H = doc.height;

  // Outer border
  doc.drawRect(p1, 30, 30, W - 60, H - 60, true, false, 0.2, 1);
  doc.drawRect(p1, 34, 34, W - 68, H - 68, true, false, 0.7, 1);

  // Top Living Book Badge
  doc.drawRect(p1, 50, H - 85, W - 100, 35, true, true, 0.1, 0.95);
  doc.addText(p1, 'LIVING BOOK PRESS — REGISTRE D\'EXEMPLAIRES SINGULIERS', 65, H - 68, 10, 'F2', 0.2);

  // Book Title & Subtitle
  const bookTitle = options.bookTitle || copyRecord.book_id.toUpperCase();
  const bookSubtitle = options.bookSubtitle || 'Edition Figee & Exemplaire Unique';
  doc.addText(p1, bookTitle, 50, H - 125, 20, 'F2', 0);
  doc.addText(p1, bookSubtitle, 50, H - 145, 11, 'F1', 0.3);
  doc.drawLine(p1, 50, H - 155, W - 50, H - 155, 0.8, 1);

  // Big Singular Copy Identity Box
  doc.drawRect(p1, 50, H - 280, W - 100, 110, true, true, 0.1, 0.98);
  
  const isSingulier = copyRecord.singularization === 'singulier';
  const tag = isSingulier ? 'EXEMPLAIRE SINGULIER — UNIQUE' : 'EXEMPLAIRE STANDARD';
  doc.addText(p1, tag, 65, H - 195, 12, 'F2', isSingulier ? 0.1 : 0.4);

  // Prominent Copy ID
  doc.addText(p1, copyRecord.copy_id, 65, H - 235, 24, 'F3', 0);

  // Material Profile & Issue Date
  const profileLabel = `Profil materiel: ${(copyRecord.material_profile || 'accessible').toUpperCase()} | Format: ${doc.format}`;
  const dateLabel = `Emis le: ${copyRecord.issued_at}`;
  doc.addText(p1, profileLabel, 65, H - 258, 9, 'F1', 0.3);
  doc.addText(p1, dateLabel, 65, H - 272, 9, 'F1', 0.3);

  // Edition and Source Provenance
  doc.addText(p1, 'PROVENANCE EDITORIALE & SOURCE FIGEE', 50, H - 315, 11, 'F2', 0.2);
  doc.drawLine(p1, 50, H - 322, W - 50, H - 322, 0.8, 1);

  const ed = `Edition: ${copyRecord.edition_id}`;
  const repo = `Depot source: ${copyRecord.edition_source?.repository || 'n/a'}`;
  const commit = `Commit source: ${copyRecord.edition_source?.commit || 'n/a'}`;
  doc.addText(p1, ed, 50, H - 340, 10, 'F2', 0.1);
  doc.addText(p1, repo, 50, H - 355, 9, 'F3', 0.2);
  doc.addText(p1, commit, 50, H - 370, 9, 'F3', 0.2);

  // Verification & Traceability Box (Simulated QR / Verification Frame)
  doc.drawRect(p1, 50, H - 510, W - 100, 120, true, false, 0.3, 1);
  doc.addText(p1, 'VERIFICATION PUBLIQUE & TRAJECTOIRE', 65, H - 410, 10, 'F2', 0.1);
  
  // Simulated visual code block
  doc.drawRect(p1, 65, H - 495, 75, 75, true, true, 0.1, 0.92);
  doc.addText(p1, '[ QR CODE ]', 75, H - 455, 8, 'F3', 0.4);
  doc.addText(p1, 'SCAN ME', 82, H - 470, 8, 'F2', 0.2);

  // Verification URL details
  doc.addText(p1, 'Point de verification public permanent:', 155, H - 430, 9, 'F1', 0.3);
  doc.addText(p1, copyRecord.verification_url, 155, H - 445, 9, 'F3', 0);
  doc.addText(p1, 'Cet exemplaire physique est enregistre dans le registre du Living Book.', 155, H - 465, 8, 'F1', 0.4);
  doc.addText(p1, 'Toute annotation, mission ou etape de circulation peut y etre rattachee.', 155, H - 480, 8, 'F1', 0.4);

  // Optional Mission / Dedication if present
  if (copyRecord.biography?.mission_ref || copyRecord.biography?.dedication) {
    doc.drawRect(p1, 50, H - 590, W - 100, 65, true, true, 0.4, 0.97);
    doc.addText(p1, 'MISSION OU DEDICACE DE L\'EXEMPLAIRE', 65, H - 535, 9, 'F2', 0.1);
    if (copyRecord.biography.mission_ref) {
      doc.addText(p1, `Mission: ${copyRecord.biography.mission_ref}`, 65, H - 555, 9, 'F1', 0);
    }
    if (copyRecord.biography.dedication) {
      doc.addText(p1, `Dedicace: ${copyRecord.biography.dedication}`, 65, H - 572, 9, 'F1', 0);
    }
  }

  // Printing & Handling instructions at bottom
  doc.addText(p1, 'CONSEILS D\'IMPRESSION ET D\'USAGE', 50, 95, 9, 'F2', 0.3);
  doc.drawLine(p1, 50, 90, W - 50, 90, 0.8, 1);
  doc.addText(p1, '• Impression domicile : selectionner recto-verso (bord long), echelle 100%.', 50, 78, 8, 'F1', 0.4);
  doc.addText(p1, '• Imprimeur professionnel : fichier PDF standard pret a l\'emploi, sans marge perdue.', 50, 66, 8, 'F1', 0.4);
  doc.addText(p1, '• Unicite : cette copie physique est votre incarnation. Ne pas diffuser de retirage sans nouveau copy_id.', 50, 54, 8, 'F1', 0.4);

  // Page 2: Sample text / Chapter summary page
  const p2 = doc.addPage();
  doc.drawRect(p2, 30, 30, W - 60, H - 60, true, false, 0.2, 1);
  doc.addText(p2, `${bookTitle} — MANIFESTE DU MANUSCRIT`, 50, H - 70, 14, 'F2', 0);
  doc.addText(p2, `Exemplaire ${copyRecord.copy_id} | Edition ${copyRecord.edition_id}`, 50, H - 90, 9, 'F3', 0.3);
  doc.drawLine(p2, 50, H - 100, W - 50, H - 100, 0.8, 1);

  doc.addText(p2, 'Cet exemplaire unique inclut le texte certifie de l\'edition gelee.', 50, H - 130, 11, 'F1', 0.1);
  doc.addText(p2, 'La lecture et la possession physique de cette copie constituent une continuation', 50, H - 150, 10, 'F1', 0.2);
  doc.addText(p2, 'active du Corpus et de sa trajectoire humaine dans le Réel.', 50, H - 165, 10, 'F1', 0.2);

  doc.drawRect(p2, 50, H - 320, W - 100, 130, true, true, 0.6, 0.98);
  doc.addText(p2, 'Engagement du lecteur / detenteur :', 65, H - 215, 10, 'F2', 0.2);
  doc.addText(p2, '1. Conserver l\'exemplaire ou le transmettre sciemment a un pair.', 65, H - 240, 9, 'F1', 0.3);
  doc.addText(p2, '2. En cas de transmission, scanner le QR code pour enregistrer l\'etape si souhaite.', 65, H - 260, 9, 'F1', 0.3);
  doc.addText(p2, '3. Ne pas considerer cet objet comme une denree speculative (anti-capture).', 65, H - 280, 9, 'F1', 0.3);
  doc.addText(p2, '4. Faire vivre l\'enquete en confrontant ses affirmations au Reel.', 65, H - 300, 9, 'F1', 0.3);

  // Footer on page 2
  doc.addText(p2, `Living Book Press • ${copyRecord.copy_id} • Page 2/2`, W / 2 - 80, 50, 8, 'F1', 0.5);

  const pdfBuffer = doc.build();
  const sha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

  return {
    pdfBuffer,
    sha256,
    byteLength: pdfBuffer.length
  };
}
