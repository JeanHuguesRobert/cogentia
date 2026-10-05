/**
 * Living Book Factory — Manifest Parser and Validator
 * Validates living-book/v1 manifests against JSON Schema and semantic invariants.
 */

import fs from 'node:fs';
import path from 'node:path';
import * as jsYaml from 'js-yaml';

export const MANIFEST_SCHEMA_PATH = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')),
  '../../../schemas/living-book.v1.schema.json'
);

export function loadManifest(manifestPathOrContent) {
  let content = '';
  let resolvedPath = null;

  if (typeof manifestPathOrContent === 'string') {
    if (fs.existsSync(manifestPathOrContent)) {
      resolvedPath = path.resolve(manifestPathOrContent);
      content = fs.readFileSync(resolvedPath, 'utf8');
    } else {
      content = manifestPathOrContent;
    }
  } else if (typeof manifestPathOrContent === 'object' && manifestPathOrContent !== null) {
    return { manifest: manifestPathOrContent, filePath: null };
  }

  let parsed = null;
  try {
    parsed = jsYaml.load(content);
  } catch (err) {
    throw new Error(`Failed to parse manifest YAML/JSON: ${err.message}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Manifest must be a non-empty object');
  }

  return { manifest: parsed, filePath: resolvedPath };
}

export function validateManifest(manifest) {
  const errors = [];
  const warnings = [];

  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['Manifest is not an object'], warnings };
  }

  if (manifest.schema !== 'living-book/v1') {
    errors.push(`Invalid schema: expected "living-book/v1", got "${manifest.schema}"`);
  }

  // Book section
  if (!manifest.book || typeof manifest.book !== 'object') {
    errors.push('Missing required "book" section');
  } else {
    const { id, title, canonical_host, language } = manifest.book;
    if (!id || typeof id !== 'string') {
      errors.push('Missing or invalid "book.id"');
    } else if (!/^[a-z0-9-]+$/.test(id)) {
      errors.push(`"book.id" must match pattern ^[a-z0-9-]+$, got "${id}"`);
    }

    if (!title || typeof title !== 'string') {
      errors.push('Missing or invalid "book.title"');
    }

    if (!canonical_host || typeof canonical_host !== 'string') {
      errors.push('Missing or invalid "book.canonical_host"');
    } else if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(canonical_host)) {
      warnings.push(`"book.canonical_host" "${canonical_host}" does not look like a standard FQDN`);
    }

    if (!language || typeof language !== 'string') {
      errors.push('Missing or invalid "book.language"');
    }
  }

  // Institution section
  if (!manifest.institution || typeof manifest.institution !== 'object') {
    errors.push('Missing required "institution" section');
  } else {
    if (!manifest.institution.publisher) {
      errors.push('Missing "institution.publisher"');
    }
  }

  // Editorial section
  if (!manifest.editorial || typeof manifest.editorial !== 'object') {
    errors.push('Missing required "editorial" section');
  } else {
    const requiredBools = ['book', 'magazine', 'site'];
    for (const key of requiredBools) {
      if (manifest.editorial[key] === undefined) {
        errors.push(`Missing "editorial.${key}" flag`);
      }
    }
    if (manifest.editorial.janus === true) {
      // Janus mode check
      // Janus requires clear proof regime separation between past and future
    }
  }

  // Magazine section
  if (manifest.magazine) {
    const mode = manifest.magazine.mode || 'local';
    if (!['local', 'federated', 'hybrid'].includes(mode)) {
      errors.push(`Invalid "magazine.mode": must be local, federated, or hybrid (got "${mode}")`);
    }
    if ((mode === 'federated' || mode === 'hybrid') && (!Array.isArray(manifest.magazine.sources) || manifest.magazine.sources.length === 0)) {
      warnings.push('Federated/hybrid magazine declared but no source Living Books specified in "magazine.sources"');
    }
  }

  // Extensions
  const knownExtensions = [
    'chronology',
    'cases',
    'people-registry',
    'accounting',
    'living-book-press',
    'federated-magazine',
    'maps',
    'genealogy'
  ];

  if (manifest.extensions && Array.isArray(manifest.extensions)) {
    for (const ext of manifest.extensions) {
      if (!knownExtensions.includes(ext)) {
        warnings.push(`Unrecognized or experimental extension declared: "${ext}"`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    manifest
  };
}
