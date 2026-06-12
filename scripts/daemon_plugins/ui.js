import fs from 'node:fs';
import path from 'node:path';

export const plugin = {
  name: 'ui',
  class: 'ui',
  title: 'Document Navigator UI',
  description: 'Provides a minimal browser-based document navigator and markdown renderer.',
  routes: [
    { method: 'GET', path: '/ui', handler: renderUi },
    { method: 'GET', path: '/ui/static/*', handler: serveStatic },
  ],
};

export const routes = plugin.routes;

function renderUi(req, res, ctx, url) {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cogentia Document Navigator</title>
  <style>
    :root {color-scheme: light; font-family: Inter,system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}
    body {margin:0; min-height:100vh; display:flex; background:#f5f7fa;}
    .sidebar {width:320px; border-right:1px solid #dfe3e8; background:#fff; padding:16px; overflow:auto;}
    .main {flex:1; display:flex; flex-direction:column;}
    .header {padding:16px; border-bottom:1px solid #dfe3e8; background:#fff;}
    .browser {flex:1; overflow:auto; padding:16px;}
    .file-list {list-style:none; margin:0; padding:0;}
    .file-list li {padding:8px 10px; border-radius:8px; cursor:pointer; display:flex; justify-content:space-between; align-items:center;}
    .file-list li:hover {background:#eef3ff;}
    .file-list li.selected {background:#dde8ff;}
    .breadcrumb {font-size:0.9rem; color:#555; margin-bottom:12px;}
    .toolbar {display:flex; gap:8px; flex-wrap:wrap;}
    .toolbar button {padding:8px 12px; border:1px solid #c7d0db; border-radius:8px; background:#fff; cursor:pointer;}
    .toolbar button.active {background:#2d6cdf; color:#fff; border-color:#2d6cdf;}
    .viewer {flex:1; overflow:auto; padding:16px; background:#fff;}
    iframe {width:100%; min-height:calc(100vh - 120px); border:none;}
    .error {color:#b00020;}
  </style>
</head>
<body>
  <aside class="sidebar">
    <div class="header"><strong>Cogentia Navigator</strong></div>
    <div class="toolbar">
      <input id="searchBox" placeholder="Full-text search (grep)" style="flex:1;padding:8px;border:1px solid #c7d0db;border-radius:8px" />
      <button id="searchBtn">Search</button>
    </div>
    <div style="padding:8px 16px; display:flex; gap:8px;">
      <select id="repoSelect" style="flex:1;padding:8px;border:1px solid #c7d0db;border-radius:8px"></select>
      <button id="docsSummary">Docs</button>
      <button id="continuations">Continuations</button>
      <button id="plugins">Plugins</button>
    </div>
    <div class="browser">
      <div class="breadcrumb" id="breadcrumb"></div>
      <ul class="file-list" id="fileList"></ul>
      <div class="error" id="error"></div>
      <div id="messagePanel" style="margin-top:12px;padding:12px;border:1px solid #dfe3ef;border-radius:10px;background:#f4f7fb;display:none;max-height:220px;overflow:auto;font-size:0.95rem;line-height:1.4;color:#102a43;"></div>
      <div id="snippetPanel" style="margin-top:12px;padding:12px;border:1px solid #e4e7ed;border-radius:10px;background:#fafbfc;display:none;max-height:280px;overflow:auto;font-size:0.95rem;line-height:1.4;"></div>
    </div>
  </aside>
  <section class="main">
    <div class="header"><div style="display:flex;align-items:center;justify-content:space-between"><div>
      <div id="statusInfo" style="font-size:0.9rem;color:#333;margin-bottom:4px">Loading status…</div>
      <div><span id="selectedPath">Select a file to preview</span></div>
    </div><div><button id="copyPermalink">Copy permalink</button></div></div></div>
    <div class="viewer" id="viewer">
      <div id="meta" style="padding:12px;border-bottom:1px solid #eef2f7;background:#fbfdff;max-height:160px;overflow:auto;font-family:monospace;font-size:0.9rem"></div>
      <iframe id="viewerFrame"></iframe>
    </div>
  </section>
  <script>
    const apiBase = '/api/fs';
    const uiBase = '/ui';
    const root = '';
    let currentDir = '';
    let selectedFile = '';

    const breadcrumb = document.getElementById('breadcrumb');
    const fileList = document.getElementById('fileList');
    const error = document.getElementById('error');
    const selectedPath = document.getElementById('selectedPath');
    const viewerFrame = document.getElementById('viewerFrame');
    const meta = document.getElementById('meta');
    const statusInfo = document.getElementById('statusInfo');
    const copyPermalink = document.getElementById('copyPermalink');
    const searchBox = document.getElementById('searchBox');
    const searchBtn = document.getElementById('searchBtn');
    const repoSelect = document.getElementById('repoSelect');
    const docsSummaryBtn = document.getElementById('docsSummary');
    const continuationsBtn = document.getElementById('continuations');
    const pluginsBtn = document.getElementById('plugins');
    const snippetPanel = document.getElementById('snippetPanel');
    const messagePanel = document.getElementById('messagePanel');

    searchBtn.addEventListener('click', () => doSearch());
    searchBox.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
    docsSummaryBtn.addEventListener('click', () => showDocsSummary());
    continuationsBtn.addEventListener('click', () => showContinuations());
    pluginsBtn.addEventListener('click', () => showPlugins());
    copyPermalink.addEventListener('click', () => {
      if (!selectedFile) return setInfo('No file selected');
      const url = location.origin + '/ui?file=' + encodeURIComponent(selectedFile);
      navigator.clipboard.writeText(url).then(() => setInfo('Permalink copied'), () => setError('Copy failed'));
    });

    loadRepos();
    loadStatus();

    function setError(message) {
      error.textContent = message || '';
      messagePanel.style.display = 'none';
    }

    function setInfo(message) {
      messagePanel.style.display = 'block';
      messagePanel.innerHTML = message || '';
      error.textContent = '';
    }

    async function loadDirectory(dir) {
      setError('');
      const url = apiBase + '/list?dir=' + encodeURIComponent(dir);
      const res = await fetch(url);
      if (!res.ok) {
        setError('Failed to load directory: ' + res.status);
        return;
      }
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || 'Unknown error');
        return;
      }
      currentDir = dir;
      renderBreadcrumb(dir, data.root);
      renderEntries(data.entries);
    }

    function renderBreadcrumb(dir, root) {
      const parts = dir.split('\\').filter(Boolean);
      const segments = [{ label: 'root', path: '' }, ...parts.map((part, index) => ({ label: part, path: parts.slice(0, index + 1).join('\\') }))];
      breadcrumb.innerHTML = segments.map(seg => '<a href="#" data-path="' + encodeURIComponent(seg.path) + '">' + seg.label + '</a>').join(' / ');
      breadcrumb.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', e => {
          e.preventDefault();
          loadDirectory(decodeURIComponent(a.dataset.path));
        });
      });
    }

    function renderEntries(entries) {
      fileList.innerHTML = entries.map(function(entry) {
        return '<li data-name="' + encodeURIComponent(entry.name) + '" data-type="' + entry.type + '">' +
               '<span>' + (entry.type === 'dir' ? '📁' : '📄') + ' ' + entry.name + '</span>' +
               '<span>' + entry.type + '</span>' +
               '</li>';
      }).join('');
      fileList.querySelectorAll('li').forEach(function(li) {
        li.addEventListener('click', function() {
          const name = decodeURIComponent(li.dataset.name);
          const type = li.dataset.type;
          if (type === 'dir') {
            loadDirectory(currentDir ? currentDir + '/' + name : name);
          } else {
            selectFile(currentDir ? currentDir + '/' + name : name);
          }
        });
      });
    }

    function selectFile(file) {
      selectedFile = file;
      selectedPath.textContent = file;
      viewerFrame.src = apiBase + '/file?path=' + encodeURIComponent(file) + '&render=html';
      loadMetadata(file);
    }

    async function loadMetadata(file) {
      meta.textContent = 'Loading metadata…';
      try {
        const res = await fetch('/api/cli/docs/inspect?path=' + encodeURIComponent(file));
        if (!res.ok) { meta.textContent = 'No metadata'; return; }
        const data = await res.json();
        if (!data.ok) { meta.textContent = 'No metadata'; return; }
        meta.textContent = JSON.stringify(data.metadata || data, null, 2);
      } catch (e) { meta.textContent = 'Error loading metadata'; }
    }

    async function loadRepos() {
      try {
        const res = await fetch('/api/cli/state');
        if (!res.ok) return;
        const data = await res.json();
        if (!data.ok) return;
        repoSelect.innerHTML = '';
        repoSelect.appendChild(new Option('all', 'all'));
        for (const r of data.repos) repoSelect.appendChild(new Option(r.name, r.name));
      } catch (e) { /* ignore */ }
    }

    async function loadStatus() {
      try {
        statusInfo.textContent = 'Loading status…';
        const res = await fetch('/api/cli/status');
        if (!res.ok) { statusInfo.textContent = 'Status unavailable'; return; }
        const data = await res.json();
        if (!data.ok) { statusInfo.textContent = 'Status unavailable'; return; }
        const rows = data.rows || [];
        const repos = rows.length;
        const docs = rows.reduce((s, r) => s + (r.docs || 0), 0);
        const gaps = rows.reduce((s, r) => s + (r.unindexed || 0), 0);
        const dirty = rows.reduce((s, r) => s + (r.dirty || 0), 0);
        statusInfo.textContent = repos + ' repos • ' + docs + ' docs • ' + gaps + ' gaps • ' + dirty + ' dirty';
      } catch (e) { statusInfo.textContent = 'Status error'; }
    }

    async function doSearch() {
      setError('');
      const q = searchBox.value.trim();
      if (!q) return loadDirectory('');
      const repo = repoSelect.value || 'all';
      const url = '/api/cli/docs/search?q=' + encodeURIComponent(q) + '&repo=' + encodeURIComponent(repo) + '&limit=200';
      const res = await fetch(url);
      if (!res.ok) return setError('Search failed');
      const data = await res.json();
      if (!data.ok) return setError(data.error || 'Search error');
      // render matches with snippets and highlight
      fileList.innerHTML = data.matches.map(function(m){
        return '<li data-repo="' + m.repo + '" data-path="' + encodeURIComponent(m.path) + '" data-line="' + m.line + '">' 
          + '<div style="font-weight:600">' + m.repo + '/' + escapeHtml(m.path) + ' <span style="font-weight:400;color:#666">(line ' + m.line + ')</span></div>'
          + '<div style="color:#333;margin-top:6px">' + escapeHtml(m.snippet).replace(new RegExp(escapeRegExp(q), 'ig'), function(x){ return '<mark>' + x + '</mark>'; }) + '</div>'
          + '</li>';
      }).join('');
      fileList.querySelectorAll('li').forEach(function(li){ li.addEventListener('click', async function(){ const path = decodeURIComponent(li.dataset.path); const repo = li.dataset.repo; selectFile(repo + '/' + path); // fetch server-side snippets too for full context
        const res2 = await fetch('/api/cli/docs/snippet?ref=' + encodeURIComponent(repo + '/' + path) + '&q=' + encodeURIComponent(q));
        if (res2.ok) { const d2 = await res2.json(); if (d2 && d2.matches) { renderSnippetPanel(d2.matches, repo + '/' + path, q); } else { renderSnippetPanel([], repo + '/' + path, q); } } else { renderSnippetPanel([], repo + '/' + path, q); }
      }); });
    }

    async function showDocsSummary() {
      const res = await fetch('/api/cli/docs/summary');
      if (!res.ok) return setError('Failed to load docs summary');
      const data = await res.json();
      if (!data.ok) return setError(data.error || 'Unknown');
      const lines = ['<strong>Docs summary</strong>'];
      lines.push('<div>Total docs: ' + escapeHtml(String(data.total)) + '</div>');
      for (let i = 0; i < (data.repos || []).length; i++) {
        const r = data.repos[i];
        lines.push('<div>' + escapeHtml(r.repo) + ': docs=' + escapeHtml(String(r.documents)) + ' source=' + escapeHtml(String(r.source)) + ' derived=' + escapeHtml(String(r.derived)) + ' gaps=' + escapeHtml(String(r.gaps)) + '</div>');
      }
      setInfo(lines.join(''));
    }

    async function showContinuations() {
      const res = await fetch('/api/cli/continuation/list?status=active');
      if (!res.ok) return setError('Failed to load continuations');
      const data = await res.json();
      if (!data.ok) return setError(data.error || 'Unknown');
      if (!data.continuations || !data.continuations.length) return setInfo('No active continuations');
      const lines = ['<strong>Active continuations</strong>'];
      for (let i = 0; i < data.continuations.length; i++) {
        const c = data.continuations[i];
        lines.push('<div>' + escapeHtml(c.id) + ' [' + escapeHtml(c.kind) + '] ' + escapeHtml(c.title || '') + '</div>');
      }
      setInfo(lines.join(''));
    }

    async function showPlugins() {
      const res = await fetch('/api/plugins');
      if (!res.ok) return setError('Failed to load plugin list');
      const data = await res.json();
      if (!data.ok) return setError(data.error || 'Unknown error');
      const lines = ['<strong>Plugins</strong>'];
      (data.plugins || []).forEach(function(p){ lines.push('<div><strong>' + escapeHtml(p.title) + '</strong> (' + escapeHtml(p.name) + ') — ' + escapeHtml(p.class) + '<br>' + escapeHtml(p.description) + '</div>'); });
      setInfo(lines.join(''));
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>\"]/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]); });
    }

    function escapeRegExp(s) {
      return String(s).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    function renderSnippetPanel(matches, ref, q) {
      if (!matches || !matches.length) {
        snippetPanel.style.display = 'block';
        snippetPanel.innerHTML = '<strong>No snippets available for <code>' + escapeHtml(ref) + '</code></strong>';
        return;
      }
      snippetPanel.style.display = 'block';
      snippetPanel.innerHTML = '<div style="font-weight:600;margin-bottom:8px">Snippets for <code>' + escapeHtml(ref) + '</code> matching <code>' + escapeHtml(q) + '</code></div>' +
        matches.map(function(m){
          return '<div style="margin-bottom:10px;padding:10px;border-radius:8px;background:#fff;border:1px solid #e3e8f0">'
            + '<div style="font-size:0.88rem;color:#555;margin-bottom:4px">Line ' + m.line + '</div>'
            + '<div style="white-space:pre-wrap;">' + escapeHtml(m.snippet).replace(new RegExp(escapeRegExp(q), 'ig'), function(x){ return '<mark>' + x + '</mark>'; }) + '</div>'
            + '</div>';
        }).join('');
    }

    loadDirectory('');
  </script>
</body>
</html>`;
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function serveStatic(req, res, ctx, url) {
  const file = url.pathname.slice('/ui/static/'.length);
  const full = path.join(process.cwd(), 'scripts', 'daemon_plugins', 'ui_static', file);
  if (!full.startsWith(path.join(process.cwd(), 'scripts', 'daemon_plugins'))) {
    res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'forbidden' }));
    return;
  }
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'not_found' }));
    return;
  }
  const content = fs.readFileSync(full);
  res.writeHead(200, { 'Content-Type': guessMime(full) });
  res.end(content);
}

function guessMime(full) {
  if (full.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (full.endsWith('.css')) return 'text/css; charset=utf-8';
  if (full.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}
