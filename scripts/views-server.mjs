#!/usr/bin/env node
/**
 * Views Store API Server
 * Serves generated markdown views with rendering, raw, and download options.
 *
 * Design in the open philosophy: everything is public unless explicitly marked otherwise.
 *
 * Usage: node views-server.mjs [--port 3423] [--dir /srv/views]
 *
 * Dependencies: None (Node.js built-ins only)
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = parseInt(process.env.PORT || process.argv[2] || '3423', 10);
const VIEWS_DIR = process.env.VIEWS_DIR || '/srv/views';

const MIME_TYPES = {
  '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

// Frontmatter-based visibility check
// Default: public (design in the open)
// Blocked if: visibility is private/confidential/secret OR public: false
function checkVisibility(content) {
  // Try to extract YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return { visible: true, reason: 'no frontmatter (default public)' };
  }

  const frontmatterText = frontmatterMatch[1];
  const lines = frontmatterText.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Check visibility: field
    const visMatch = trimmed.match(/^visibility:\s*(.+)$/i);
    if (visMatch) {
      const visibility = visMatch[1].toLowerCase().trim();
      if (['private', 'confidential', 'secret'].includes(visibility)) {
        return { visible: false, reason: `visibility: ${visibility}` };
      }
    }

    // Check public: false
    const publicMatch = trimmed.match(/^public:\s*(.+)$/i);
    if (publicMatch) {
      const publicVal = publicMatch[1].toLowerCase().trim();
      if (publicVal === 'false' || publicVal === 'no') {
        return { visible: false, reason: 'public: false' };
      }
    }

    // Check published: false
    const publishedMatch = trimmed.match(/^published:\s*(.+)$/i);
    if (publishedMatch) {
      const publishedVal = publishedMatch[1].toLowerCase().trim();
      if (publishedVal === 'false' || publishedVal === 'no') {
        return { visible: false, reason: 'published: false' };
      }
    }
  }

  return { visible: true, reason: 'frontmatter allows public (default)' };
}

function listViews() {
  if (!fs.existsSync(VIEWS_DIR)) return [];
  return fs.readdirSync(VIEWS_DIR)
    .filter(f => f.endsWith('.md') || f.endsWith('.json'))
    .map(f => {
      const filePath = path.join(VIEWS_DIR, f);
      const stat = fs.statSync(filePath);
      let visibility = { visible: true, reason: 'default public' };

      if (f.endsWith('.md')) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          visibility = checkVisibility(content);
        } catch (e) {
          visibility = { visible: false, reason: 'error reading file' };
        }
      }

      return {
        name: f,
        size: stat.size,
        modified: stat.mtime.toISOString(),
        url: `/views/${f}`,
        visible: visibility.visible,
        visibility_reason: visibility.reason,
      };
    })
    .filter(v => v.visible); // Only show public views
}

function renderMarkdown(content) {
  // Simple markdown rendering - just add basic HTML structure
  // For production, consider using a proper markdown library
  const lines = content.split('\n');
  let html = '';
  let inCodeBlock = false;
  let codeLang = '';

  for (const line of lines) {
    // Code blocks
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        const lang = line.slice(3).trim();
        codeLang = lang || 'text';
        html += `<pre><code class="language-${codeLang}">`;
      } else {
        html += '</code></pre>\n';
      }
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      html += line + '\n';
      continue;
    }

    // Headers
    if (line.startsWith('# ')) {
      const level = line.match(/^#+/)[0].length;
      const text = line.slice(level + 1);
      html += `<h${level}>${text}</h${level}>\n`;
      continue;
    }

    // Horizontal rules
    if (line.trim() === '---') {
      html += '<hr>\n';
      continue;
    }

    // Bold
    line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Links
    line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Lists (simple)
    if (line.startsWith('- ') || line.startsWith('* ')) {
      html += `<li>${line.slice(2)}</li>\n`;
      continue;
    }

    // Regular lines
    if (line.trim()) {
      html += `<p>${line}</p>\n`;
    }
  }

  return html;
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

function sendHtml(res, content, status = 200) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(content);
}

function sendMarkdown(res, content, status = 200) {
  res.writeHead(status, { 'Content-Type': 'text/markdown; charset=utf-8' });
  res.end(content);
}

function sendFile(res, filePath, download = false) {
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  if (download) {
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${path.basename(filePath)}"`,
    });
  } else {
    res.writeHead(200, { 'Content-Type': contentType });
  }

  const content = fs.readFileSync(filePath);
  res.end(content);
}

function generateIndexHtml(views) {
  const viewsList = views.map(v => `
    <div class="view-item">
      <h3><a href="/views/${v.name}">${v.name}</a></h3>
      <p>Size: ${Math.round(v.size / 1024)}KB | Modified: ${new Date(v.modified).toLocaleString()}</p>
      <div class="actions">
        <a href="/views/${v.name}?render">Render</a> |
        <a href="/views/${v.name}?raw">Raw</a> |
        <a href="/views/${v.name}?download">Download</a>
      </div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Views Store</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
    h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
    .view-item { border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .view-item h3 { margin-top: 0; }
    .actions { margin-top: 10px; }
    .actions a { color: #0066cc; margin-right: 15px; }
    .actions a:hover { text-decoration: underline; }
    pre { background: #f4f4f4; padding: 10px; border-radius: 3px; overflow-x: auto; }
    code { background: #f4f4f4; padding: 2px 5px; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>📊 Views Store</h1>
  <p>Generated views from cogentia.js</p>
  <div class="views">${viewsList}</div>
</body>
</html>`;
}

function generateViewHtml(viewName, content) {
  const rendered = renderMarkdown(content);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${viewName} - Views Store</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 900px; margin: 40px auto; padding: 20px; line-height: 1.6; }
    h1, h2, h3 { margin-top: 1.5em; }
    pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    hr { border: none; border-top: 2px solid #eee; margin: 2em 0; }
    a { color: #0066cc; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .actions a { margin-left: 15px; padding: 5px 10px; background: #f0f0f0; border-radius: 3px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${viewName}</h1>
    <div class="actions">
      <a href="/">← Back to Views</a>
      <a href="/views/${viewName}?raw">Raw</a>
      <a href="/views/${viewName}?download">Download</a>
    </div>
  </div>
  <article>${rendered}</article>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Root - index of all views
  if (url.pathname === '/' || url.pathname === '/views') {
    const views = listViews();
    return sendHtml(res, generateIndexHtml(views));
  }

  // API endpoint for listing views
  if (url.pathname === '/api/views') {
    const views = listViews();
    return sendJson(res, { views, count: views.length });
  }

  // Individual view
  if (url.pathname.startsWith('/views/')) {
    const fileName = url.pathname.slice(7); // Remove '/views/'
    const filePath = path.join(VIEWS_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      return sendJson(res, { error: 'Not found' }, 404);
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    // Check visibility for markdown files
    if (fileName.endsWith('.md')) {
      const visibility = checkVisibility(content);
      if (!visibility.visible) {
        console.log(`[BLOCKED] ${fileName}: ${visibility.reason}`);
        return sendJson(res, { error: 'Not available', reason: visibility.reason }, 403);
      }
    }

    const params = url.searchParams;
    const render = params.has('render');
    const raw = params.has('raw');
    const download = params.has('download');

    if (raw) {
      return sendMarkdown(res, content);
    }

    if (download) {
      return sendFile(res, filePath, true);
    }

    if (render) {
      return sendHtml(res, generateViewHtml(fileName, content));
    }

    // Default: render markdown
    return sendHtml(res, generateViewHtml(fileName, content));
  }

  // 404
  sendJson(res, { error: 'Not found' }, 404);
});

server.listen(PORT, () => {
  console.log(`Views Store API running on http://0.0.0.0:${PORT}`);
  console.log(`Serving views from: ${VIEWS_DIR}`);
});
