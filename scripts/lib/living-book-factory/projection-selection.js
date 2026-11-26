/**
 * Bounded, explicit selection of Markdown content for an unfrozen projection.
 * Legacy books can still render by the previous manuscript-directory fallback.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as jsYaml from 'js-yaml';

const within = (parent, candidate) =>
  candidate === parent || candidate.startsWith(parent + path.sep);

function resolveSelectedMarkdown(projectDir, declaredPath) {
  if (typeof declaredPath !== 'string' || !declaredPath.trim() ||
      path.isAbsolute(declaredPath) || declaredPath.includes('\\')) {
    throw new Error('Selection source must be a nonempty relative POSIX path');
  }
  const inProjects = path.basename(path.dirname(projectDir)) === 'projects';
  const root = declaredPath.startsWith('projects/') && inProjects ?
    path.resolve(projectDir, '..', '..') : projectDir;
  const rootReal = fs.realpathSync(root);
  const candidate = path.resolve(root, declaredPath);
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
    throw new Error('Selected source missing: ' + declaredPath);
  }
  const real = fs.realpathSync(candidate);
  if (!within(rootReal, real) || path.extname(real).toLowerCase() !== '.md') {
    throw new Error('Selected source outside admitted Markdown scope: ' + declaredPath);
  }
  return real;
}

// Addressable resources deliberately have a stricter disclosure contract than
// the legacy manuscript selection. Sources are corpus-relative, not routes.
function loadResources(projectReal, data) {
  const values = data.resources ?? [];
  if (!Array.isArray(values)) throw new Error('Selection resources must be an array');
  const root = path.basename(path.dirname(projectReal)) === 'projects'
    ? fs.realpathSync(path.resolve(projectReal, '..', '..')) : projectReal;
  const ids = new Set(), routes = new Set(), sources = new Set();
  return values.map(entry => {
    const { id, route, source } = entry || {};
    if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(id))
      throw new Error('Invalid public resource identity');
    if (typeof route !== 'string' || !/^\/ressources\/[a-z0-9][a-z0-9-]*\.html$/.test(route) ||
        route === '/ressources/index.html')
      throw new Error('Invalid or reserved public resource route: ' + route);
    if (typeof source !== 'string' || !/\.md$/i.test(source) ||
        source.includes('\\') || source.includes(':') ||
        source.split('/').some(part => !part || part === '.' || part === '..'))
      throw new Error('Invalid corpus-relative resource source');
    const absolute = fs.realpathSync(path.resolve(root, source));
    if (!within(root, absolute) || !fs.statSync(absolute).isFile() ||
        path.extname(absolute).toLowerCase() !== '.md')
      throw new Error('Resource source outside admitted Markdown scope: ' + source);
    if (ids.has(id) || routes.has(route) || sources.has(absolute))
      throw new Error('Duplicate resource identity, route or source: ' + id);
    ids.add(id); routes.add(route); sources.add(absolute);
    const raw = fs.readFileSync(absolute, 'utf8');
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    const metadata = match ? jsYaml.load(match[1]) : null;
    if (metadata?.visibility !== 'public' || typeof metadata.title !== 'string' ||
        !metadata.title.trim())
      throw new Error('Resource requires explicit public visibility and title: ' + id);
    return { id, route, source, absolute, title: metadata.title,
      body: raw.slice(match[0].length),
      sha256: crypto.createHash('sha256').update(raw).digest('hex') };
  });
}

// Carry existing semantic judgments without assigning them in the renderer.
// The Delta Disposition contract is shared with other projections (#194).
function loadDispositions(data) {
  const values = data.dispositions ?? [];
  if (!Array.isArray(values)) throw new Error('Selection dispositions must be an array');
  if (!values.length) return values;
  const schema = JSON.parse(fs.readFileSync(new URL(
    '../../../schemas/delta-disposition.v0.schema.json', import.meta.url), 'utf8'));
  const ids = new Set();
  for (const value of values) {
    if (!value || typeof value !== 'object' ||
        schema.required.some(key => !Object.hasOwn(value, key)) ||
        value.schema !== schema.properties.schema.const ||
        !['id', 'summary'].every(key => typeof value[key] === 'string' && value[key].trim()) ||
        !Array.isArray(value.sources) || !value.sources.length ||
        value.sources.some(source => typeof source !== 'string' || !source.trim()) ||
        !['significance', 'projection_relevance', 'disposition'].every(key =>
          schema.properties[key].enum.includes(value[key])) || ids.has(value.id)) {
      throw new Error('Invalid or duplicate Delta Disposition in selection');
    }
    ids.add(value.id);
  }
  return values;
}

export function loadWorkingSelection(projectDir, manifest, { resourcesOnly = false } = {}) {
  const rel = manifest.projection?.selection;
  if (!rel) return null;
  if (typeof rel !== 'string' || path.isAbsolute(rel) || rel.includes('\\')) {
    throw new Error('projection.selection must be a relative YAML path');
  }
  const projectReal = fs.realpathSync(projectDir);
  const file = path.resolve(projectReal, rel);
  if (!fs.existsSync(file) || !within(projectReal, fs.realpathSync(file))) {
    throw new Error('projection.selection must exist within the book directory');
  }
  const buffer = fs.readFileSync(file);
  const data = jsYaml.load(buffer.toString('utf8'));
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Projection selection must be a YAML mapping');
  }
  if (data.frozen === true || data.status === 'frozen') {
    throw new Error('Cannot render an immutable/frozen edition as a working selection');
  }
  const sources = [];
  const seen = new Set();
  for (const [key, part] of [
    ['chapters', 'Livre'], ['magazine', 'Magazine'], ['annexes', 'Annexes']
  ]) {
    const value = data[key] || [];
    const paths = typeof value === 'string' ? [value] : value;
    if (!Array.isArray(paths) || paths.some(x => typeof x !== 'string')) {
      throw new Error('Projection selection '+key+' must be a string or array of paths');
    }
    for (const declaredPath of paths) {
      const absolute = resolveSelectedMarkdown(projectReal, declaredPath);
      if (seen.has(absolute)) throw new Error('Duplicate selected source: ' + declaredPath);
      seen.add(absolute);
      sources.push({ absolute, declaredPath, part });
    }
  }
  if (!resourcesOnly && !sources.some(x => x.part === 'Livre')) {
    throw new Error('Projection selection requires at least one chapter');
  }
  return {
    selectionFile: file,
    selectionSha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    sources,
    resources: loadResources(projectReal, data),
    dispositions: loadDispositions(data)
  };
}
