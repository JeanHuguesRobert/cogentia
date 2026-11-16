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

export function loadWorkingSelection(projectDir, manifest) {
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
  if (!sources.some(x => x.part === 'Livre')) {
    throw new Error('Projection selection requires at least one chapter');
  }
  return {
    selectionFile: file,
    selectionSha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    sources
  };
}
