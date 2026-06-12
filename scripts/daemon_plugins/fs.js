import fs from 'node:fs';
import path from 'node:path';

export const plugin = {
  name: 'fs',
  class: 'filesystem',
  title: 'Filesystem Navigator',
  description: 'Browse repository directories and fetch files via daemon endpoints.',
};

export const routes = [
  {
    method: 'GET',
    path: '/api/fs/list',
    handler: async (req, res, ctx, url) => {
      const q = url.searchParams.get('dir') || '';
      const root = (ctx && ctx.registryRoot) ? ctx.registryRoot : process.cwd();
      const target = path.resolve(root, q);
      if (!target.startsWith(root)) {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'forbidden' }));
        return;
      }
      if (!fs.existsSync(target)) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'not_found' }));
        return;
      }
      const entries = fs.readdirSync(target, { withFileTypes: true }).map(e => ({
        name: e.name,
        type: e.isDirectory() ? 'dir' : 'file',
      }));
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, root, path: target, entries }, null, 2));
    },
  },
  {
    method: 'GET',
    path: '/api/fs/file',
    handler: async (req, res, ctx, url) => {
      const q = url.searchParams.get('path') || '';
      const render = url.searchParams.get('render') || '';
      const root = (ctx && ctx.registryRoot) ? ctx.registryRoot : process.cwd();
      const target = path.resolve(root, q);
      if (!target.startsWith(root)) {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'forbidden' }));
        return;
      }
      if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'not_found' }));
        return;
      }
      const raw = fs.readFileSync(target, 'utf8');
      if (render === 'html' && /\.md$/i.test(target)) {
        const html = `<!doctype html><html><head><meta charset="utf-8"><meta name=viewport content="width=device-width,initial-scale=1"><title>${path.basename(target)}</title><style>body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:20px;max-width:900px;margin:auto}pre{background:#111;color:#eee;padding:12px;overflow:auto}code{background:#f6f8fa;padding:2px 4px;border-radius:4px}a{color:#0066cc}</style></head><body>${renderMarkdown(raw)}</body></html>`;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(raw);
    },
  },
];

function escapeHtml(s) {
  return s.replace(/[&<>\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function renderMarkdown(md) {
  // Very small markdown renderer: headings, code blocks, inline code, links, bold/italic, paragraphs
  let out = md;
  // escape
  out = escapeHtml(out);
  // code blocks
  out = out.replace(/```([\s\S]*?)```/g, (m, code) => `<pre><code>${escapeHtml(code)}</code></pre>`);
  // headings
  out = out.replace(/^######\s?(.*)$/gm, '<h6>$1</h6>');
  out = out.replace(/^#####\s?(.*)$/gm, '<h5>$1</h5>');
  out = out.replace(/^####\s?(.*)$/gm, '<h4>$1</h4>');
  out = out.replace(/^###\s?(.*)$/gm, '<h3>$1</h3>');
  out = out.replace(/^##\s?(.*)$/gm, '<h2>$1</h2>');
  out = out.replace(/^#\s?(.*)$/gm, '<h1>$1</h1>');
  // inline code
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  // bold and italic
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // links
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // paragraphs
  out = out.split(/\n{2,}/).map(p => p.trim()).filter(Boolean).map(p => {
    if (/^<h\d/.test(p) || /^<pre/.test(p) || /^<ul|^<ol|^<blockquote/.test(p)) return p;
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');
  return out;
}
