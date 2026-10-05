/**
 * Living Book Factory — EPUB 3 / EPUB 2 Renderer
 * Generates valid EPUB containers with zero external dependencies.
 */

import crypto from 'node:crypto';
import { ZipBuilder } from './zip-builder.js';

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function renderLivingBookEpub(bookMeta, chapters) {
  const zip = new ZipBuilder();

  const {
    id = 'living-book',
    title = 'Living Book',
    subtitle = '',
    author = 'Jean Hugues Noël Robert, baron Mariani',
    publisher = 'Institut Mariani / C.O.R.S.I.C.A.',
    language = 'fr',
    date = new Date().toISOString().split('T')[0]
  } = bookMeta;

  // 1. mimetype MUST be first, uncompressed
  zip.addFile('mimetype', 'application/epub+zip', { compress: false });

  // 2. META-INF/container.xml
  zip.addFile('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  // 3. Stylesheet
  const css = `body {
  font-family: Georgia, serif;
  line-height: 1.6;
  margin: 1.5rem;
  color: #111;
}
h1, h2, h3 { font-family: sans-serif; color: #9e2a2b; }
h1 { font-size: 1.8rem; margin-top: 1rem; border-bottom: 1px solid #ccc; padding-bottom: 0.3rem; }
h2 { font-size: 1.3rem; margin-top: 1.5rem; }
blockquote {
  border-left: 3px solid #9e2a2b;
  margin: 1rem 0;
  padding-left: 1rem;
  font-style: italic;
  color: #444;
}
.callout {
  background: #f7f6f2;
  border: 1px solid #ddd;
  padding: 1rem;
  margin: 1rem 0;
  border-radius: 4px;
}
.byline { font-size: 0.9rem; color: #666; }
`;
  zip.addFile('OEBPS/styles.css', css);

  // 4. Cover / Title page
  const coverHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${language}">
<head>
  <title>${escapeXml(title)}</title>
  <link rel="stylesheet" href="styles.css" type="text/css"/>
</head>
<body>
  <div style="text-align:center;margin-top:4rem;">
    <p style="font-size:0.85rem;text-transform:uppercase;letter-spacing:0.1em;color:#777;">Livre Vivant · Projection en préparation</p>
    <h1 style="font-size:2.4rem;margin:1.5rem 0 0.5rem;border:none;">${escapeXml(title)}</h1>
    ${subtitle ? `<p style="font-size:1.2rem;font-style:italic;color:#444;margin-bottom:2rem;">${escapeXml(subtitle)}</p>` : ''}
    <hr style="width:40%;border:none;border-top:2px solid #9e2a2b;margin:2rem auto;"/>
    <p style="font-size:1rem;margin-top:2rem;"><strong>${escapeXml(author)}</strong></p>
    <p style="font-size:0.9rem;color:#555;">${escapeXml(publisher)}</p>
    <p style="font-size:0.8rem;color:#888;margin-top:4rem;">Édition de travail · ${date} · Licence CC BY-SA 4.0</p>
  </div>
</body>
</html>`;
  zip.addFile('OEBPS/cover.xhtml', coverHtml);

  // 5. Chapters
  const chapterItems = [];
  const chapterRefs = [];

  chapters.forEach((ch, idx) => {
    const chId = `chapter-${idx + 1}`;
    const filename = `${chId}.xhtml`;

    const xhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${language}">
<head>
  <title>${escapeXml(ch.title)}</title>
  <link rel="stylesheet" href="styles.css" type="text/css"/>
</head>
<body>
  <h1>${escapeXml(ch.title)}</h1>
  ${ch.subtitle ? `<p class="byline"><em>${escapeXml(ch.subtitle)}</em></p>` : ''}
  <div>
    ${ch.htmlBody}
  </div>
</body>
</html>`;

    zip.addFile(`OEBPS/${filename}`, xhtml);
    chapterItems.push(`<item id="${chId}" href="${filename}" media-type="application/xhtml+xml"/>`);
    chapterRefs.push(`<itemref idref="${chId}"/>`);
  });

  // 6. Navigation (EPUB 3 nav.xhtml)
  const navList = chapters.map((ch, idx) => `      <li><a href="chapter-${idx + 1}.xhtml">${escapeXml(ch.title)}</a></li>`).join('\n');
  const navHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${language}">
<head>
  <title>Sommaire</title>
  <link rel="stylesheet" href="styles.css" type="text/css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Sommaire</h1>
    <ol>
      <li><a href="cover.xhtml">Titre &amp; Colophon</a></li>
${navList}
    </ol>
  </nav>
</body>
</html>`;
  zip.addFile('OEBPS/nav.xhtml', navHtml);

  // 7. NCX (EPUB 2 toc.ncx)
  const ncxPoints = chapters.map((ch, idx) => `    <navPoint id="navPoint-${idx + 2}" playOrder="${idx + 2}">
      <navLabel><text>${escapeXml(ch.title)}</text></navLabel>
      <content src="chapter-${idx + 1}.xhtml"/>
    </navPoint>`).join('\n');

  const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${id}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(title)}</text></docTitle>
  <navMap>
    <navPoint id="navPoint-1" playOrder="1">
      <navLabel><text>Titre</text></navLabel>
      <content src="cover.xhtml"/>
    </navPoint>
${ncxPoints}
  </navMap>
</ncx>`;
  zip.addFile('OEBPS/toc.ncx', ncx);

  // 8. OEBPS/content.opf
  const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">urn:uuid:${id}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    ${subtitle ? `<dc:description>${escapeXml(subtitle)}</dc:description>` : ''}
    <dc:creator>${escapeXml(author)}</dc:creator>
    <dc:publisher>${escapeXml(publisher)}</dc:publisher>
    <dc:language>${language}</dc:language>
    <dc:date>${date}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.[0-9]{3}/, '')}</meta>
  </metadata>
  <manifest>
    <item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="styles" href="styles.css" media-type="text/css"/>
    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>
    ${chapterItems.join('\n    ')}
  </manifest>
  <spine toc="toc">
    <itemref idref="cover"/>
    <itemref idref="nav"/>
    ${chapterRefs.join('\n    ')}
  </spine>
</package>`;
  zip.addFile('OEBPS/content.opf', opf);

  const epubBuffer = zip.build();
  const sha256 = crypto.createHash('sha256').update(epubBuffer).digest('hex');

  return {
    epubBuffer,
    sha256,
    byteLength: epubBuffer.length
  };
}
