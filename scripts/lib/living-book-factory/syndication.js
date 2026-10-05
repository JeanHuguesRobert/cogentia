/**
 * Living Book Factory — Magazine Syndication Engine
 * Handles creation, validation, and provider-neutral federated syndication of Magazine deltas.
 * Invariant: Syndication MUST NOT silently copy source authority.
 */

import fs from 'node:fs';
import path from 'node:path';
import * as jsYaml from 'js-yaml';

export function createMagazineItem(data) {
  const {
    id,
    source_book,
    published_at = new Date().toISOString().split('T')[0],
    event_at,
    title,
    summary,
    topics = [],
    epistemic_status = 'established',
    canonical_ref,
    provenance = {}
  } = data;

  if (!id || typeof id !== 'string') {
    throw new Error('Magazine item requires a unique "id" string');
  }
  if (!source_book || typeof source_book !== 'string') {
    throw new Error('Magazine item requires a "source_book" identifier');
  }
  if (!title || typeof title !== 'string') {
    throw new Error('Magazine item requires a "title" string');
  }
  if (!summary || !summary.short) {
    throw new Error('Magazine item requires a "summary.short" text');
  }
  if (!canonical_ref || typeof canonical_ref !== 'string') {
    throw new Error('Magazine item requires a "canonical_ref" reference');
  }

  const validStatuses = ['established', 'hypothesis', 'controversy', 'investigation', 'reality-test', 'correction'];
  if (!validStatuses.includes(epistemic_status)) {
    throw new Error(`Invalid epistemic_status "${epistemic_status}". Must be one of: ${validStatuses.join(', ')}`);
  }

  const item = {
    schema: 'living-book.magazine-item/v1',
    id,
    source_book,
    published_at,
    title,
    summary: {
      short: summary.short,
      ...(summary.medium ? { medium: summary.medium } : {})
    },
    topics: Array.isArray(topics) ? topics : [topics],
    epistemic_status,
    canonical_ref,
    provenance: {
      author: provenance.author || 'Jean Hugues Noël Robert, baron Mariani',
      affiliation: provenance.affiliation || 'Institut Mariani / C.O.R.S.I.C.A.',
      ...(provenance.derived_from ? { derived_from: provenance.derived_from } : {})
    }
  };

  if (event_at) {
    item.event_at = event_at;
  }

  return item;
}

export function syndicateMagazineItem(originalItem, recipientBookId, contextNote = '') {
  if (!originalItem || originalItem.schema !== 'living-book.magazine-item/v1') {
    throw new Error('Cannot syndicate item: invalid living-book.magazine-item/v1 item');
  }
  if (!recipientBookId || typeof recipientBookId !== 'string') {
    throw new Error('Recipient Living Book ID is required');
  }

  // Deep clone to avoid mutating original
  const syndicated = JSON.parse(JSON.stringify(originalItem));

  // Invariant: Syndication preserves canonical source, does not clone authority
  syndicated.syndication = {
    syndicated_by: recipientBookId,
    syndicated_at: new Date().toISOString().split('T')[0],
    contextual_note: contextNote || `Syndicated by ${recipientBookId} for cross-living-book analysis.`,
    source_authority_preserved: true
  };

  return syndicated;
}

export function extractMagazineItemFromMarkdown(filePath, bookId, canonicalUrlPrefix = '') {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Markdown file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  let frontmatter = {};
  let body = content;

  if (content.startsWith('---')) {
    const end = content.indexOf('---', 3);
    if (end !== -1) {
      const yamlStr = content.slice(3, end);
      body = content.slice(end + 3).trim();
      try {
        frontmatter = jsYaml.load(yamlStr) || {};
      } catch (e) {
        // ignore parse error in frontmatter
      }
    }
  }

  const filename = path.basename(filePath, path.extname(filePath));
  let title = frontmatter.title;
  if (!title) {
    const h1Match = body.match(/^#\s+(.+)$/m);
    title = h1Match ? h1Match[1] : filename;
  }

  const description = frontmatter.description || body.slice(0, 160).replace(/\n/g, ' ').trim();
  const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
  const published_at = frontmatter.date || (dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0]);

  const slug = filename.replace(/^\d{4}-\d{2}-\d{2}-/, '');
  const id = `${bookId}-${published_at}-${slug}`;

  const canonical_ref = frontmatter.canonical_url || `${canonicalUrlPrefix || `projects/${bookId}/magazine/`}${path.basename(filePath)}`;

  return createMagazineItem({
    id,
    source_book: bookId,
    published_at,
    title,
    summary: {
      short: description,
      medium: body.slice(0, 400).replace(/\n/g, ' ').trim()
    },
    topics: frontmatter.tags || frontmatter.topics || ['editorial'],
    epistemic_status: frontmatter.epistemic_status || 'established',
    canonical_ref,
    provenance: {
      author: frontmatter.author || 'Jean Hugues Noël Robert, baron Mariani',
      affiliation: frontmatter.affiliation || 'Institut Mariani / C.O.R.S.I.C.A.',
      derived_from: frontmatter.derived_from || []
    }
  });
}

export function renderFederatedFeedHtml(items, currentBookId = '') {
  if (!items || items.length === 0) {
    return '<p class="byline">Aucune chronique fédérée pour le moment.</p>';
  }

  return items.map(item => {
    const isSyndicated = Boolean(item.syndication);
    const sourceBadge = isSyndicated
      ? `<span class="pill" style="background:#e8edf5;color:#2c5282;">Source : Livre Vivant ${item.source_book}</span>`
      : `<span class="pill" style="background:#edf7ed;color:#1e4620;">Chronique locale</span>`;

    const noteHtml = isSyndicated && item.syndication.contextual_note
      ? `<div style="font-size:0.9rem;font-style:italic;color:#555;margin:0.5rem 0;padding-left:0.5rem;border-left:2px solid #cbd5e0;">Note de syndication (${item.syndication.syndicated_by}) : ${item.syndication.contextual_note}</div>`
      : '';

    return `
    <article class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
        ${sourceBadge}
        <span style="font-size:0.85rem;color:#777;">${item.published_at}</span>
      </div>
      <h3 style="margin-top:0.25rem;"><a href="${item.canonical_ref}">${item.title}</a></h3>
      <p style="font-size:0.95rem;margin:0.5rem 0;">${item.summary.short}</p>
      ${noteHtml}
      <div style="font-size:0.8rem;color:#666;margin-top:0.5rem;">
        Auteur : ${item.provenance.author} (${item.provenance.affiliation}) · Statut : <code>${item.epistemic_status}</code>
      </div>
    </article>
    `;
  }).join('\n');
}
