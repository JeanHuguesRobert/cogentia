/**
 * Living Book Factory — Projections Renderer
 * Generates the "en préparation" versions: HTML, PDF, and EPUB.
 * Enforces the invariant: Working projections are distinct from frozen editions.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as jsYaml from 'js-yaml';
import { loadManifest } from './manifest.js';
import { renderLivingBookPdf } from './pdf-book-renderer.js';
import { renderLivingBookEpub } from './epub-renderer.js';

function markdownToSimpleHtml(md) {
  let html = md;

  // Escape basic XML chars first
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks ``` ... ```
  html = html.replace(/```([a-z]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
  });

  // Inline code `...`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headings # ...
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Blockquotes > ...
  html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

  // Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Unordered Lists
  html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\s*)+/g, '<ul>$&</ul>');

  // Tables | ... |
  const lines = html.split('\n');
  const tableLines = [];
  let inTable = false;
  const processedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) inTable = true;
      tableLines.push(line);
    } else {
      if (inTable) {
        processedLines.push(renderTableHtml(tableLines));
        tableLines.length = 0;
        inTable = false;
      }
      processedLines.push(lines[i]);
    }
  }
  if (inTable) {
    processedLines.push(renderTableHtml(tableLines));
  }
  html = processedLines.join('\n');

  // Paragraphs
  const paragraphs = html.split(/\n\s*\n/);
  html = paragraphs.map(p => {
    const trimmed = p.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') || trimmed.startsWith('<ul') ||
        trimmed.startsWith('<blockquote') || trimmed.startsWith('<table') || trimmed.startsWith('<div')) {
      return trimmed;
    }
    return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
  }).filter(Boolean).join('\n');

  return html;
}

function renderTableHtml(lines) {
  if (lines.length < 2) return lines.join('\n');
  const header = lines[0].split('|').slice(1, -1).map(c => `<th>${c.trim()}</th>`).join('');
  const rows = [];

  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i].split('|').slice(1, -1).map(c => `<td>${c.trim()}</td>`).join('');
    rows.push(`<tr>${cells}</tr>`);
  }

  return `<table class="content-table">
  <thead><tr>${header}</tr></thead>
  <tbody>${rows.join('\n')}</tbody>
</table>`;
}

export function renderLivingBookProjections(projectDirInput, options = {}) {
  let projectDir = path.resolve(projectDirInput);
  if (fs.existsSync(projectDir) && fs.statSync(projectDir).isFile()) {
    projectDir = path.dirname(projectDir);
  }

  let manifestPath = path.join(projectDir, 'living-book.yml');
  if (!fs.existsSync(manifestPath)) {
    manifestPath = path.join(projectDir, 'manifest.yml');
  }
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Cannot render projections: living-book.yml or manifest.yml not found in ${projectDir}`);
  }

  const { manifest } = loadManifest(manifestPath);

  const bookMeta = {
    id: manifest.book?.id || 'living-book',
    title: manifest.book?.title || 'Living Book',
    subtitle: manifest.book?.subtitle || '',
    author: manifest.institution?.editorial_director || 'Jean Hugues Noël Robert, baron Mariani',
    publisher: `${manifest.institution?.research_unit || 'Institut Mariani'} / ${manifest.institution?.publisher || 'C.O.R.S.I.C.A.'}`,
    language: manifest.book?.language || 'fr',
    date: new Date().toISOString().split('T')[0]
  };

  // 1. Read Manuscript Chapters
  let manuscriptDir = path.join(projectDir, 'manuscript');
  if (!fs.existsSync(manuscriptDir)) {
    throw new Error(`manuscript directory not found in ${projectDir}`);
  }

  let files = fs.readdirSync(manuscriptDir)
    .filter(f => f.endsWith('.md') && f.toLowerCase() !== 'readme.md')
    .sort();

  if (files.length === 0) {
    const candidateSubdirs = ['n1', 'book', 'n4', 'v1'];
    for (const sub of candidateSubdirs) {
      const subPath = path.join(manuscriptDir, sub);
      if (fs.existsSync(subPath) && fs.statSync(subPath).isDirectory()) {
        const subFiles = fs.readdirSync(subPath)
          .filter(f => f.endsWith('.md') && f.toLowerCase() !== 'readme.md')
          .sort();
        if (subFiles.length > 0) {
          manuscriptDir = subPath;
          files = subFiles;
          break;
        }
      }
    }
  }

  if (files.length === 0) {
    throw new Error(`No manuscript chapters found in ${manuscriptDir}`);
  }

  const chapters = [];

  for (const f of files) {
    const fullPath = path.join(manuscriptDir, f);
    const rawContent = fs.readFileSync(fullPath, 'utf8');

    let frontmatter = {};
    let body = rawContent;

    if (rawContent.startsWith('---')) {
      const end = rawContent.indexOf('---', 3);
      if (end !== -1) {
        try {
          frontmatter = jsYaml.load(rawContent.slice(3, end)) || {};
        } catch (e) {}
        body = rawContent.slice(end + 3).trim();
      }
    }

    const title = frontmatter.title || f.replace(/^\d+-/, '').replace(/\.md$/, '').replace(/-/g, ' ');
    const subtitle = frontmatter.subtitle || '';
    const htmlBody = markdownToSimpleHtml(body);

    chapters.push({
      file: f,
      title,
      subtitle,
      frontmatter,
      rawBody: body,
      htmlBody
    });
  }

  // Ensure directories
  const projDir = path.join(projectDir, 'projections');
  const siteDir = path.join(projectDir, 'site');
  if (!fs.existsSync(projDir)) fs.mkdirSync(projDir, { recursive: true });
  if (!fs.existsSync(siteDir)) fs.mkdirSync(siteDir, { recursive: true });

  // 2. Generate PDF
  const { pdfBuffer, sha256: pdfSha } = renderLivingBookPdf(bookMeta, chapters);
  const pdfProjPath = path.join(projDir, 'preview.pdf');
  const pdfSitePath = path.join(siteDir, 'book.pdf');
  fs.writeFileSync(pdfProjPath, pdfBuffer);
  fs.writeFileSync(pdfSitePath, pdfBuffer);

  // 3. Generate EPUB
  const { epubBuffer, sha256: epubSha } = renderLivingBookEpub(bookMeta, chapters);
  const epubProjPath = path.join(projDir, 'preview.epub');
  const epubSitePath = path.join(siteDir, 'book.epub');
  fs.writeFileSync(epubProjPath, epubBuffer);
  fs.writeFileSync(epubSitePath, epubBuffer);

  // 4. Generate HTML Standalone Preview
  const tocHtml = chapters.map((ch, idx) => `      <li><a href="#chapitre-${idx + 1}">${ch.title}</a>${ch.subtitle ? ` <span class="toc-sub">— ${ch.subtitle}</span>` : ''}</li>`).join('\n');

  const chaptersHtml = chapters.map((ch, idx) => `
    <article id="chapitre-${idx + 1}" class="chapter">
      <header class="chapter-header">
        <p class="chapter-num">Chapitre ${idx + 1}</p>
        <h2>${ch.title}</h2>
        ${ch.subtitle ? `<p class="chapter-sub"><em>${ch.subtitle}</em></p>` : ''}
      </header>
      <div class="chapter-content">
        ${ch.htmlBody}
      </div>
    </article>
  `).join('\n<hr class="chapter-sep"/>\n');

  const fullHtml = `<!doctype html>
<html lang="${bookMeta.language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${bookMeta.title} — Projection de travail en préparation</title>
<link rel="stylesheet" href="../site/styles.css">
<style>
  body { max-width: 900px; margin: 0 auto; padding: 2rem 1.5rem; background: #faf9f6; }
  .book-cover { text-align: center; padding: 3rem 1rem 2rem; border-bottom: 2px solid #9e2a2b; margin-bottom: 3rem; }
  .book-cover h1 { font-size: 2.8rem; margin: 0.5rem 0; }
  .book-cover .sub { font-size: 1.3rem; color: #555; font-style: italic; }
  .downloads { background: #fff; border: 1px solid #e0ded9; padding: 1.25rem; border-radius: 6px; margin: 2rem 0; text-align: center; }
  .btn-download { display: inline-block; background: #9e2a2b; color: white; padding: 0.5rem 1rem; border-radius: 4px; text-decoration: none; font-weight: bold; margin: 0 0.5rem; }
  .btn-download:hover { background: #7c2122; }
  .chapter { margin: 3rem 0; background: #fff; padding: 2rem; border: 1px solid #e0ded9; border-radius: 6px; }
  .chapter-num { font-size: 0.85rem; text-transform: uppercase; color: #9e2a2b; font-weight: bold; letter-spacing: 0.05em; }
  .chapter-sub { color: #555; margin-bottom: 1.5rem; }
  .chapter-sep { border: none; height: 1px; background: #e0ded9; margin: 3rem 0; }
  .content-table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9rem; }
  .content-table th, .content-table td { border: 1px solid #ddd; padding: 0.5rem 0.75rem; text-align: left; }
  .content-table th { background: #f4f3ef; }
  @media print {
    .downloads, header.site { display: none; }
    .chapter { page-break-before: always; border: none; padding: 0; }
  }
</style>
</head>
<body>
  <div class="book-cover">
    <p class="pill">Projection de travail · En préparation · Non gelée</p>
    <h1>${bookMeta.title}</h1>
    ${bookMeta.subtitle ? `<p class="sub">${bookMeta.subtitle}</p>` : ''}
    <p class="byline"><strong>${bookMeta.author}</strong> · ${bookMeta.publisher}</p>
    <p style="font-size:0.85rem;color:#777;">Date de projection : ${bookMeta.date} · Licence CC BY-SA 4.0</p>
  </div>

  <div class="downloads">
    <p style="margin-top:0;"><strong>Formats téléchargeables en préparation :</strong></p>
    <a class="btn-download" href="preview.pdf" download>Télécharger PDF</a>
    <a class="btn-download" href="preview.epub" download>Télécharger EPUB</a>
    <a class="btn-download" href="../site/index.html" style="background:#555;">Retour au site</a>
  </div>

  <section class="call">
    <h3>Sommaire du manuscrit</h3>
    <ol style="line-height:1.8;">
${tocHtml}
    </ol>
  </section>

  <main>
${chaptersHtml}
  </main>

  <footer style="margin-top:4rem;text-align:center;font-size:0.85rem;color:#666;border-top:1px solid #ddd;padding-top:1.5rem;">
    <p>${bookMeta.title} · ${bookMeta.publisher} · Projection de travail en préparation (HTML, PDF, EPUB générés)</p>
  </footer>
</body>
</html>`;

  const htmlProjPath = path.join(projDir, 'preview.html');
  fs.writeFileSync(htmlProjPath, fullHtml, 'utf8');
  const htmlSha = crypto.createHash('sha256').update(fullHtml).digest('hex');

  // 5. Update site/book.html with embedded reading view
  const siteBookPath = path.join(siteDir, 'book.html');
  const siteBookContent = `<!doctype html>
<html lang="${bookMeta.language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${bookMeta.title} — Le Livre</title>
<link rel="stylesheet" href="styles.css">
<style>
  .chapter-box { background:#fff; border:1px solid var(--border); padding:1.5rem; border-radius:6px; margin:2rem 0; }
  .btn-download { display:inline-block; background:var(--accent); color:white; padding:0.4rem 0.8rem; border-radius:4px; text-decoration:none; font-size:0.9rem; font-weight:600; margin-right:0.5rem; }
  .btn-download:hover { background:#7c2122; }
</style>
</head>
<body>
<a class="skip" href="#contenu">Aller au contenu</a>
<header class="site">
  <p class="mark"><a href="index.html">${bookMeta.title}</a></p>
  <nav aria-label="Navigation principale">
    <a href="index.html">Accueil</a>
    <a href="book.html" aria-current="page">Livre</a>
    <a href="magazine.html">Magazine</a>
    <a href="annexes.html">Annexes</a>
    <a href="contribuer.html">Contribuer</a>
    <a href="guide.html">Guide</a>
    <a href="mentions.html">Mentions</a>
  </nav>
</header>
<main id="contenu">
  <p class="pill">Projection de travail · En préparation</p>
  <h1>Le Livre — Synthèse durable</h1>
  ${bookMeta.subtitle ? `<p class="lede"><strong>${bookMeta.subtitle}</strong></p>` : ''}
  <p class="byline">Direction éditoriale : ${bookMeta.author} · ${bookMeta.publisher}</p>

  <div class="call" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
    <div>
      <h3 style="margin-top:0;">Formats en préparation disponibles</h3>
      <p style="margin-bottom:0;">Tirages de travail numériques générés par la Living Book Factory :</p>
    </div>
    <div>
      <a class="btn-download" href="book.pdf" download>Format PDF</a>
      <a class="btn-download" href="book.epub" download>Format EPUB</a>
      <a class="btn-download" href="../projections/preview.html" target="_blank" style="background:#4a5568;">Version intégrale</a>
    </div>
  </div>

  <h2>Sommaire</h2>
  <div class="card">
    <ol style="line-height:1.8;margin:0;padding-left:1.5rem;">
${tocHtml}
    </ol>
  </div>

${chaptersHtml}

</main>
<footer>
  <p>${bookMeta.title} · ${bookMeta.author} · ${bookMeta.publisher} · Licence CC BY-SA 4.0</p>
</footer>
</body>
</html>`;
  fs.writeFileSync(siteBookPath, siteBookContent, 'utf8');

  // 6. Write projection contract in projections/preview.yml
  const projectionContract = {
    schema: 'living-book.projection/v1',
    id: 'preview-working',
    book_id: bookMeta.id,
    status: 'working',
    frozen: false,
    generated_at: new Date().toISOString(),
    formats: {
      html: {
        path: 'projections/preview.html',
        sha256: htmlSha,
        size: Buffer.byteLength(fullHtml, 'utf8')
      },
      pdf: {
        path: 'projections/preview.pdf',
        sha256: pdfSha,
        size: pdfBuffer.length
      },
      epub: {
        path: 'projections/preview.epub',
        sha256: epubSha,
        size: epubBuffer.length
      }
    },
    rule: 'This projection is a working preview in preparation. It does not constitute a frozen edition.'
  };

  const previewYmlPath = path.join(projDir, 'preview.yml');
  fs.writeFileSync(previewYmlPath, jsYaml.dump(projectionContract), 'utf8');

  return {
    bookId: bookMeta.id,
    projDir,
    html: { path: htmlProjPath, sha256: htmlSha, size: Buffer.byteLength(fullHtml, 'utf8') },
    pdf: { path: pdfProjPath, sha256: pdfSha, size: pdfBuffer.length },
    epub: { path: epubProjPath, sha256: epubSha, size: epubBuffer.length }
  };
}
