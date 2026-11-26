/** Build addressable public pages without modifying a site or frozen edition. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { marked, Renderer } from 'marked';
import { loadManifest } from './manifest.js';
import { loadWorkingSelection } from './projection-selection.js';

const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const escape = value => String(value).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const indexRoute = '/ressources/index.html';
const implementationSha = () => sha(Buffer.concat([
  './resource-projections.js', './projection-selection.js', './manifest.js',
  '../../../schemas/delta-disposition.v0.schema.json', '../../../pnpm-lock.yaml'
].map(relative => fs.readFileSync(new URL(relative, import.meta.url)))));

// Record a version only when Git's bytes actually match the rendered bytes.
// The last file-changing revision is stable across unrelated commits.
function verifiedSourceRevision(file, expectedDigest) {
  const git = (args, cwd) => execFileSync('git', ['-C', cwd, ...args],
    { stdio: ['ignore', 'pipe', 'ignore'] });
  try {
    const cwd = path.dirname(file);
    const root = fs.realpathSync(git(['rev-parse', '--show-toplevel'], cwd).toString().trim());
    const rel = path.relative(root, file).split(path.sep).join('/');
    if (!rel || rel.startsWith('../') ||
        sha(git(['show', 'HEAD:' + rel], root)) !== expectedDigest) return null;
    return git(['log', '-1', '--format=%H', 'HEAD', '--', rel], root).toString().trim() || null;
  } catch {
    return null;
  }
}

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

export function prepareResourceProjection(projectDir, { selection } = {}) {
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
  const inputs = {
    book: { id: book.id, title: book.title, language: book.language || 'fr' },
    implementation_sha256: implementationSha(),
    selection_sha256: selected.selectionSha256,
    selection_revision: verifiedSourceRevision(fs.realpathSync(selected.selectionFile), selected.selectionSha256),
    resources: selected.resources.map(({ id, route, source, absolute, sha256 }) =>
      ({ id, route, source, sha256, source_revision: verifiedSourceRevision(absolute, sha256) }))
  };
  return { root, book: inputs.book, selected, inputs, input_sha256: sha(JSON.stringify(inputs)) };
}

export function renderResourceProjections(projectDir, { selection, out } = {}) {
  return renderPreparedResourceProjection(prepareResourceProjection(projectDir, { selection }), out);
}

export function renderPreparedResourceProjection({ root, book, selected, inputs, input_sha256 }, out) {
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
  if (canonicalDestination === root || canonicalDestination.startsWith(root + path.sep))
    throw new Error('Resource build output must be outside the book source directory');
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
        return omit(href, 'not_selected');
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
    input_sha256,
    implementation_sha256: inputs.implementation_sha256,
    selection_sha256: inputs.selection_sha256,
    selection_revision: inputs.selection_revision,
    resources: inputs.resources,
    // This is a declared, bounded coverage report, not a discovery pass over
    // all Corpus knowledge. The underlying judgments remain source records.
    coverage: {
      scope: 'declared-selection-only',
      selected: selected.resources.map(r => r.id),
      deferred: selected.dispositions.filter(d => d.disposition === 'DEFERRED').map(d => d.id),
      excluded: selected.dispositions.filter(d =>
        ['NO_IMPACT', 'REJECTED', 'SUPERSEDED'].includes(d.disposition)).map(d => d.id),
      unresolved_link_count: unresolved.length
    },
    delta_dispositions: selected.dispositions,
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
