/** Incremental, build-only orchestration of declared addressable resource selections. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { prepareResourceProjection, renderPreparedResourceProjection } from './resource-projections.js';

const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const selection = 'projections/resources-working.yml';

function verifiedCache(directory, input) {
  const receipt = JSON.parse(fs.readFileSync(path.join(directory, 'receipt.json'), 'utf8'));
  if (receipt.schema !== 'living-book.resource-projection/v1' ||
      receipt.input_sha256 !== input.input_sha256 ||
      receipt.book_id !== input.book.id ||
      receipt.selection_sha256 !== input.inputs.selection_sha256 ||
      receipt.selection_revision !== input.inputs.selection_revision ||
      receipt.implementation_sha256 !== input.inputs.implementation_sha256 ||
      JSON.stringify(receipt.resources) !== JSON.stringify(input.inputs.resources))
    throw new Error('Cached receipt does not match declared inputs: ' + directory);
  const expected = [...input.inputs.resources.map(r => r.route), '/ressources/index.html'].sort();
  if (JSON.stringify(receipt.artifacts.map(a => a.route).sort()) !== JSON.stringify(expected))
    throw new Error('Cached artifact routes do not match selection');
  const site = path.join(directory, 'site');
  const res = path.join(site, 'ressources');
  if ([directory, site, res, path.join(directory, 'receipt.json')].some(p => fs.lstatSync(p).isSymbolicLink()) ||
      JSON.stringify(fs.readdirSync(site).sort()) !== JSON.stringify(['ressources']) ||
      JSON.stringify(fs.readdirSync(res).sort()) !== JSON.stringify(expected.map(r => path.basename(r)).sort()))
    throw new Error('Unexpected cached public files');
  for (const artifact of receipt.artifacts) {
    const file = path.join(site, artifact.route.slice(1));
    if (!fs.lstatSync(file).isFile()) throw new Error('Invalid cached artifact: ' + file);
    const bytes = fs.readFileSync(file);
    if (bytes.length !== artifact.size || sha(bytes) !== artifact.sha256)
      throw new Error('Cached artifact digest mismatch: ' + file);
  }
  return receipt;
}

export function buildResourceBatch(corpusDir, { out, plan = false } = {}) {
  const root = fs.realpathSync(corpusDir);
  if (typeof out !== 'string' || !out) throw new Error('--out must be an existing build cache directory');
  const cache = fs.realpathSync(out);
  if (cache === root || cache.startsWith(root + path.sep))
    throw new Error('Batch cache must be outside the Corpus');
  const projects = path.join(root, 'projects');
  // Discover only declared working resource selections, not arbitrary Markdown.
  const candidates = fs.readdirSync(projects, { withFileTypes: true })
    .filter(e => e.isDirectory() && fs.existsSync(path.join(projects, e.name, selection)))
    .map(e => path.join(projects, e.name)).sort();
  const ids = new Set();
  const entries = candidates.map(project => {
    const input = prepareResourceProjection(project, { selection });
    if (!/^[a-z0-9][a-z0-9-]*$/.test(input.book.id) || ids.has(input.book.id))
      throw new Error('Invalid or duplicate book id: ' + input.book.id);
    ids.add(input.book.id);
    const directory = path.join(cache, input.book.id + '-' + input.input_sha256);
    const hit = fs.existsSync(directory);
    if (hit) verifiedCache(directory, input);
    return { project, input, directory, hit };
  });
  // Validate every selection and existing hit before creating any new artifact.
  return {
    schema: 'living-book.resource-batch/v1',
    books: entries.map(({project, input, directory, hit}) => {
      if (!hit && !plan) {
        const receipt = renderPreparedResourceProjection(input, directory);
        if (receipt.input_sha256 !== input.input_sha256)
          throw new Error('Inputs changed during build; refresh and retry');
        verifiedCache(directory, input);
      }
      return { book_id: input.book.id, input_sha256: input.input_sha256,
        status: hit ? 'REUSED_VERIFIED' : plan ? 'NEEDS_BUILD' : 'BUILT_VERIFIED',
        directory };
    })
  };
}
