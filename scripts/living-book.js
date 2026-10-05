#!/usr/bin/env node

/**
 * Living Book Factory CLI
 * Inspects, validates, scaffolds, and federates Living Books.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as jsYaml from 'js-yaml';
import { loadManifest, validateManifest } from './lib/living-book-factory/manifest.js';
import { inspectLivingBook, formatInspectReport } from './lib/living-book-factory/inspector.js';
import { scaffoldLivingBook } from './lib/living-book-factory/scaffold.js';
import {
  createMagazineItem,
  syndicateMagazineItem,
  extractMagazineItemFromMarkdown,
  renderFederatedFeedHtml
} from './lib/living-book-factory/syndication.js';
import { renderLivingBookProjections } from './lib/living-book-factory/render-projections.js';

function printUsage() {
  console.log(`
Living Book Factory — Minimal Generative Architecture

Usage:
  node scripts/living-book.js <command> [arguments] [options]

Commands:
  validate <manifest>               Validate a living-book/v1 manifest against schema & doctrine.
  inspect <manifest_or_dir>         Inspect an existing Living Book implementation.
  scaffold <manifest> [options]     Generate minimal common shell & projections for a Living Book.
  syndicate [options]               Syndicate a Magazine delta from one Living Book to another.
  render <manifest_or_dir>          Generate working projections in preparation (HTML, PDF, EPUB).

Options:
  --out <dir>                       Output directory for scaffolding (defaults to manifest dir).
  --force                           Overwrite existing generated files during scaffolding.
  --json                            Emit output as JSON.
  --target <manifest_or_dir>        Target Living Book for syndication.
  --source-book <book_id>           Origin Living Book ID (e.g. privai, commons).
  --item <file_path>                Path to source magazine article (.md or .json).
  --note <text>                     Editorial contextual note explaining the syndication rationale.
`);
}

function parseArgs(args) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        flags[key] = args[i + 1];
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const command = positional[0];

  if (!command || command === 'help' || flags.help) {
    printUsage();
    process.exit(0);
  }

  try {
    if (command === 'validate') {
      const manifestPath = positional[1];
      if (!manifestPath) {
        console.error('Error: missing manifest path. Usage: living-book validate <manifest>');
        process.exit(1);
      }
      const { manifest } = loadManifest(manifestPath);
      const res = validateManifest(manifest);

      if (flags.json) {
        console.log(JSON.stringify(res, null, 2));
      } else {
        if (res.valid) {
          console.log(`✓ Manifest "${manifestPath}" is valid living-book/v1.`);
          if (res.warnings.length > 0) {
            console.log('\nWarnings:');
            res.warnings.forEach(w => console.log(`  ⚠ ${w}`));
          }
        } else {
          console.error(`✗ Manifest "${manifestPath}" is invalid:`);
          res.errors.forEach(e => console.error(`  - ${e}`));
          process.exit(1);
        }
      }
    } else if (command === 'inspect') {
      const target = positional[1] || '.';
      const report = inspectLivingBook(target);

      if (flags.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log(formatInspectReport(report));
      }
      if (report.summary.failed > 0) {
        process.exit(1);
      }
    } else if (command === 'scaffold') {
      const manifestPath = positional[1];
      if (!manifestPath) {
        console.error('Error: missing manifest path. Usage: living-book scaffold <manifest> [--out <dir>]');
        process.exit(1);
      }
      const { manifest, filePath } = loadManifest(manifestPath);
      const validation = validateManifest(manifest);
      if (!validation.valid) {
        console.error('Error: Cannot scaffold from invalid manifest:');
        validation.errors.forEach(e => console.error(`  - ${e}`));
        process.exit(1);
      }

      const targetDir = flags.out || (filePath ? path.dirname(filePath) : process.cwd());
      console.log(`Scaffolding Living Book "${manifest.book.title}" in ${targetDir}...`);
      const res = scaffoldLivingBook(manifest, targetDir, { force: Boolean(flags.force) });

      if (flags.json) {
        console.log(JSON.stringify(res, null, 2));
      } else {
        console.log(`✓ Created ${res.createdDirs.length} directories.`);
        console.log(`✓ Generated ${res.createdFiles.length} files:`);
        res.createdFiles.forEach(f => console.log(`   + ${f}`));
        if (res.skippedFiles.length > 0) {
          console.log(`ℹ Preserved ${res.skippedFiles.length} existing files (use --force to overwrite):`);
          res.skippedFiles.forEach(f => console.log(`   = ${f}`));
        }
      }
    } else if (command === 'syndicate') {
      const target = flags.target || positional[1];
      const sourceBook = flags['source-book'];
      const itemFile = flags.item;
      const note = flags.note || '';

      if (!target || !sourceBook || !itemFile) {
        console.error('Error: missing parameters for syndication. Usage: living-book syndicate --target <dir> --source-book <id> --item <file> [--note <text>]');
        process.exit(1);
      }

      let targetDir = path.resolve(target);
      if (fs.existsSync(targetDir) && fs.statSync(targetDir).isFile()) {
        targetDir = path.dirname(targetDir);
      }

      // Read target manifest to get target book ID
      let recipientBookId = 'recipient';
      const candidateManifest = path.join(targetDir, 'living-book.yml');
      if (fs.existsSync(candidateManifest)) {
        const { manifest } = loadManifest(candidateManifest);
        recipientBookId = manifest.book?.id || recipientBookId;
      }

      let originalItem = null;
      if (itemFile.endsWith('.json')) {
        originalItem = JSON.parse(fs.readFileSync(itemFile, 'utf8'));
      } else if (itemFile.endsWith('.md')) {
        originalItem = extractMagazineItemFromMarkdown(itemFile, sourceBook);
      } else {
        throw new Error(`Unsupported magazine item format: ${itemFile}`);
      }

      const syndicated = syndicateMagazineItem(originalItem, recipientBookId, note);

      // Save into target project
      const fedDir = path.join(targetDir, 'magazine', 'federated');
      if (!fs.existsSync(fedDir)) {
        fs.mkdirSync(fedDir, { recursive: true });
      }

      const outFile = path.join(fedDir, `${syndicated.id}.json`);
      fs.writeFileSync(outFile, JSON.stringify(syndicated, null, 2), 'utf8');

      // Update site/magazine.html if present
      const siteMagFile = path.join(targetDir, 'site', 'magazine.html');
      if (fs.existsSync(siteMagFile)) {
        const existingFedFiles = fs.readdirSync(fedDir).filter(f => f.endsWith('.json'));
        const allItems = existingFedFiles.map(f => JSON.parse(fs.readFileSync(path.join(fedDir, f), 'utf8')));
        const feedHtml = renderFederatedFeedHtml(allItems, recipientBookId);

        let magHtml = fs.readFileSync(siteMagFile, 'utf8');
        const beginMarker = '<!-- BEGIN_FEDERATED_FEED -->';
        const endMarker = '<!-- END_FEDERATED_FEED -->';
        const startIdx = magHtml.indexOf(beginMarker);
        const endIdx = magHtml.indexOf(endMarker);

        if (startIdx !== -1 && endIdx !== -1) {
          magHtml = magHtml.slice(0, startIdx + beginMarker.length) +
            '\n    <h2>Chroniques et syndications fédérées</h2>\n' +
            feedHtml +
            '\n    ' + magHtml.slice(endIdx);
          fs.writeFileSync(siteMagFile, magHtml, 'utf8');
        } else {
          const feedMarker = '<div id="federated-feed">';
          const sIdx = magHtml.indexOf(feedMarker);
          if (sIdx !== -1) {
            const eIdx = magHtml.indexOf('</div>', sIdx + feedMarker.length);
            if (eIdx !== -1) {
              magHtml = magHtml.slice(0, sIdx + feedMarker.length) +
                '\n    <!-- BEGIN_FEDERATED_FEED -->\n    <h2>Chroniques et syndications fédérées</h2>\n' +
                feedHtml +
                '\n    <!-- END_FEDERATED_FEED -->\n  ' + magHtml.slice(eIdx);
              fs.writeFileSync(siteMagFile, magHtml, 'utf8');
            }
          }
        }
      }

      if (flags.json) {
        console.log(JSON.stringify(syndicated, null, 2));
      } else {
        console.log(`✓ Syndicated item "${syndicated.title}" from "${sourceBook}" to "${recipientBookId}".`);
        console.log(`   Saved: ${path.relative(process.cwd(), outFile)}`);
      }
    } else if (command === 'render') {
      const target = positional[1] || '.';
      console.log(`Rendering projections in preparation (HTML, PDF, EPUB) for ${target}...`);
      const res = renderLivingBookProjections(target, flags);

      if (flags.json) {
        console.log(JSON.stringify(res, null, 2));
      } else {
        console.log(`✓ Generated HTML preview : ${path.relative(process.cwd(), res.html.path)} (${res.html.size} bytes)`);
        console.log(`   SHA-256: ${res.html.sha256}`);
        console.log(`✓ Generated PDF preview  : ${path.relative(process.cwd(), res.pdf.path)} (${res.pdf.size} bytes)`);
        console.log(`   SHA-256: ${res.pdf.sha256}`);
        console.log(`✓ Generated EPUB preview : ${path.relative(process.cwd(), res.epub.path)} (${res.epub.size} bytes)`);
        console.log(`   SHA-256: ${res.epub.sha256}`);
        console.log(`✓ Projection contract written to projections/preview.yml`);
      }
    } else {
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
