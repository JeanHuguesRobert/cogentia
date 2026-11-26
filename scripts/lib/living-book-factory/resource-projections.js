/** Build addressable public pages without modifying a site or frozen edition. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { marked, Renderer } from 'marked';
import { loadManifest } from './manifest.js';
import { loadWorkingSelection } from './projection-selection.js';

const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const escape = value => String(value).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const indexRoute = '/ressources/index.html';

function page(title, book, body) {
  return '<!doctype html>\n<html lang="' + escape(book.language || 'fr') +
    '"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + escape(title) + ' — ' + escape(book.title) + '</title>' +
    '<style>body{font:1.05rem/1.65 system-ui,sans-serif;max-width:48rem;margin:auto;padding:1.5rem}' +
    'a{color:#174a78}table{border-collapse:collapse;max-width:100%}td,th{border:1px solid #ccc;padding:.4rem}' +
    'pre{overflow:auto}nav{margin-bottom:2rem}footer{margin-top:2rem}</style>' +
    '<body><nav aria-label="Navigation"><a href="/">Accueil du Livre Vivant</a> · ' +
    '<a href="' + indexRoute + '">Ressources</a></nav><main>' + body +
    '</main><footer>Projection de travail du Corpus · ' + escape(book.title) + '</footer></body></html>\n';
}

export function renderResourceProjections(projectDir, { selection, out } = {}) {
  const root = fs.realpathSync(projectDir);
  const manifestPath = ['living-book.yml', 'manifest.yml'].map(f => path.join(root, f))
    .find(f => fs.existsSync(f));
  if (!manifestPath) throw new Error('Book manifest not found');
  const { manifest } = loadManifest(manifestPath);
  const book = manifest.book;
  if (!book?.id || !book?.title) throw new Error('Invalid book identity');
  if (selection !== undefined) manifest.projection = { ...manifest.projection, selection };
  const selected = loadWorkingSelection(root, manifest, { resourcesOnly: true });
  if (!selected?.resources.length) throw new Error('No selected public resources');
  if (typeof out !== 'string' || !out) throw new Error('A new --out directory is required');
  const destination = path.resolve(out);
  if (fs.existsSync(destination)) throw new Error('Output already exists: ' + destination);
  const parent = fs.realpathSync(path.dirname(destination));
  const canonicalDestination = path.join(parent, path.basename(destination));
  const site = path.resolve(root, 'site');
  // Never write directly to a site's tree; these are build artifacts.
  const realSite = fs.existsSync(site) ? fs.realpathSync(site) : site;
  if (canonicalDestination === realSite || canonicalDestination.startsWith(realSite + path.sep))
    throw new Error('Resource build output cannot be within the existing site');
  const bySource = new Map(selected.resources.map(r => [r.absolute, r.route]));
  const unresolved = [];
  const files = new Map();
  for (const resource of selected.resources) {
    const renderer = new Renderer();
    const omit = (href, reason) => {
      unresolved.push({ id: resource.id, href, reason });
      return null;
    };
    const resolve = href => {
      if (/^https?:\/\//i.test(href)) return href;
      // Fragments need explicit generated anchor support; report rather than
      // emitting broken links. No automatic fallback to repository URLs.
      if (href.includes('#') || href.includes('?')) return omit(href, 'unverified_fragment_or_query');
      if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('/') || href.includes('\\'))
        return omit(href, 'unsupported_reference');
      try {
        const target = fs.realpathSync(path.resolve(path.dirname(resource.absolute), decodeURIComponent(href)));
        return bySource.get(target) ?? omit(href, 'not_selected');
      } catch {
        return omit(href, 'missing_reference');
      }
    };
    renderer.html = token => escape(token.text);
    renderer.link = function(token) {
      const label = this.parser.parseInline(token.tokens);
      const href = resolve(token.href);
      return href ? '<a href="' + escape(href) + '">' + label + '</a>' : label;
    };
    // Source reproduction is a separately selected artifact, not an implicit
    // consequence of projecting a Markdown source.
    renderer.image = token => { omit(token.href, 'image_not_projected'); return escape(token.text); };
    const body = marked.parse(resource.body, { renderer, async: false });
    files.set(resource.route, page(resource.title, book, body));
  }
  files.set(indexRoute, page('Ressources', book, '<h1>Ressources</h1><ul>' +
    selected.resources.map(r => '<li><a href="' + r.route + '">' + escape(r.title) + '</a></li>').join('') +
    '</ul>'));
  const receipt = {
    schema: 'living-book.resource-projection/v1',
    book_id: book.id,
    selection_sha256: selected.selectionSha256,
    resources: selected.resources.map(({ id, route, source, sha256 }) => ({ id, route, source, sha256 })),
    artifacts: [...files].map(([route, bytes]) => ({ route, sha256: sha(bytes), size: Buffer.byteLength(bytes) })),
    unresolved
  };
  // Receipt is intentionally outside the public site tree. All selection and
  // rendering checks complete before any output is made visible.
  const staging = fs.mkdtempSync(path.join(parent, '.living-book-resources-'));
  try {
    for (const [route, bytes] of files) {
      const file = path.join(staging, 'site', route.slice(1));
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, bytes);
    }
    fs.writeFileSync(path.join(staging, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
    if (fs.existsSync(destination)) throw new Error('Output already exists: ' + destination);
    fs.renameSync(staging, destination);
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
  return receipt;
}
