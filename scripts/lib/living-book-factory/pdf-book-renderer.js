/**
 * Living Book Factory — PDF Book Renderer
 * Generates multi-page book preview PDFs for living book manuscripts.
 * Built directly on SimplePdfDocument with zero external dependencies.
 */

import crypto from 'node:crypto';
import { SimplePdfDocument } from '../living-book-press/pdf-renderer.js';

function wrapText(text, maxChars = 85) {
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (const w of words) {
    if ((currentLine + ' ' + w).trim().length <= maxChars) {
      currentLine = (currentLine + ' ' + w).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = w;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export function renderLivingBookPdf(bookMeta, chapters) {
  const doc = new SimplePdfDocument({ format: 'A4' });
  const W = doc.width;
  const H = doc.height;

  const {
    title = 'Living Book',
    subtitle = '',
    author = 'Jean Hugues Noël Robert, baron Mariani',
    publisher = 'Institut Mariani / C.O.R.S.I.C.A.',
    language = 'fr',
    date = new Date().toISOString().split('T')[0]
  } = bookMeta;

  // Page 1: Cover Page
  const p1 = doc.addPage();
  doc.drawRect(p1, 30, 30, W - 60, H - 60, true, false, 0.2, 1);
  doc.drawRect(p1, 35, 35, W - 70, H - 70, true, false, 0.8, 1);

  // Top Badge
  doc.drawRect(p1, 50, H - 85, W - 100, 30, true, true, 0.3, 0.95);
  doc.addText(p1, 'LIVRE VIVANT — PROJECTION DE TRAVAIL (EN PREPARATION)', 65, H - 67, 10, 'F2', 0.2);

  // Title & Subtitle
  doc.addText(p1, title, 50, H - 150, 22, 'F2', 0);
  if (subtitle) {
    const subLines = wrapText(subtitle, 60);
    let subY = H - 175;
    for (const sl of subLines) {
      doc.addText(p1, sl, 50, subY, 11, 'F1', 0.3);
      subY -= 15;
    }
  }
  doc.drawLine(p1, 50, H - 220, W - 50, H - 220, 0.8, 1);

  // Colophon / Metadata box
  doc.drawRect(p1, 50, H - 360, W - 100, 110, true, true, 0.5, 0.98);
  doc.addText(p1, 'CADRE EDITORIAL & PROVENANCE', 65, H - 275, 10, 'F2', 0.2);
  doc.addText(p1, `Direction editoriale : ${author}`, 65, H - 295, 10, 'F1', 0.1);
  doc.addText(p1, `Editeur responsable : ${publisher}`, 65, H - 310, 10, 'F1', 0.1);
  doc.addText(p1, `Date de projection : ${date} | Langue : ${language}`, 65, H - 325, 9, 'F1', 0.3);
  doc.addText(p1, 'Licence : Creative Commons CC BY-SA 4.0 (Open Commons Default)', 65, H - 340, 9, 'F1', 0.3);

  // State Notice
  doc.drawRect(p1, 50, H - 470, W - 100, 80, true, true, 0.8, 0.96);
  doc.addText(p1, 'STATUT : PROJECTION EN PREPARATION — NON GELEE', 65, H - 410, 10, 'F2', 0.1);
  doc.addText(p1, 'Ce document constitue le tirage d\'epreuve du manuscrit courant.', 65, H - 430, 9, 'F1', 0.3);
  doc.addText(p1, 'Il ne vaut pas edition gelee ni certification.', 65, H - 445, 9, 'F1', 0.3);

  // Footer on cover
  doc.addText(p1, 'Living Book Factory • Projection de travail', W / 2 - 80, 50, 8, 'F1', 0.5);

  // Page 2: Table of Contents (Sommaire)
  const p2 = doc.addPage();
  doc.drawRect(p2, 30, 30, W - 60, H - 60, true, false, 0.2, 1);
  doc.addText(p2, 'SOMMAIRE DU MANUSCRIT', 50, H - 70, 16, 'F2', 0);
  doc.drawLine(p2, 50, H - 80, W - 50, H - 80, 0.8, 1);

  let tocY = H - 120;
  chapters.forEach((ch, idx) => {
    doc.addText(p2, `Chapitre ${idx + 1} : ${ch.title}`, 60, tocY, 11, 'F2', 0.1);
    if (ch.subtitle) {
      doc.addText(p2, ch.subtitle, 80, tocY - 14, 9, 'F1', 0.4);
      tocY -= 16;
    }
    tocY -= 24;
  });

  doc.addText(p2, 'Page 2 | Sommaire', W / 2 - 40, 50, 8, 'F1', 0.5);

  // Chapters rendering
  let pageNum = 3;

  for (let cIdx = 0; cIdx < chapters.length; cIdx++) {
    const ch = chapters[cIdx];
    let curPage = doc.addPage();
    doc.drawRect(curPage, 30, 30, W - 60, H - 60, true, false, 0.2, 1);

    // Chapter Header
    doc.addText(curPage, `CHAPITRE ${cIdx + 1}`, 50, H - 65, 10, 'F2', 0.4);
    doc.addText(curPage, ch.title, 50, H - 85, 14, 'F2', 0);
    if (ch.subtitle) {
      doc.addText(curPage, ch.subtitle, 50, H - 100, 10, 'F1', 0.3);
    }
    doc.drawLine(curPage, 50, H - 110, W - 50, H - 110, 0.8, 1);

    let curY = H - 135;

    // Split text into paragraphs
    const paragraphs = ch.rawBody.split(/\n\s*\n/);

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('#')) {
        // Heading
        const headingText = trimmed.replace(/^#+\s*/, '');
        if (curY < 120) {
          doc.addText(curPage, `Page ${pageNum} | ${title}`, W / 2 - 60, 50, 8, 'F1', 0.5);
          pageNum++;
          curPage = doc.addPage();
          doc.drawRect(curPage, 30, 30, W - 60, H - 60, true, false, 0.2, 1);
          curY = H - 70;
        }
        curY -= 10;
        doc.addText(curPage, headingText, 50, curY, 12, 'F2', 0.1);
        curY -= 18;
      } else {
        // Normal paragraph
        const lines = wrapText(trimmed.replace(/\n/g, ' '), 82);
        for (const line of lines) {
          if (curY < 80) {
            doc.addText(curPage, `Page ${pageNum} | ${title}`, W / 2 - 60, 50, 8, 'F1', 0.5);
            pageNum++;
            curPage = doc.addPage();
            doc.drawRect(curPage, 30, 30, W - 60, H - 60, true, false, 0.2, 1);
            curY = H - 70;
          }
          doc.addText(curPage, line, 50, curY, 10, 'F1', 0.15);
          curY -= 14;
        }
        curY -= 8; // paragraph spacing
      }
    }

    doc.addText(curPage, `Page ${pageNum} | ${title}`, W / 2 - 60, 50, 8, 'F1', 0.5);
    pageNum++;
  }

  const pdfBuffer = doc.build();
  const sha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

  return {
    pdfBuffer,
    sha256,
    byteLength: pdfBuffer.length
  };
}
