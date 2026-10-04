#!/usr/bin/env node

/**
 * Living Book Press CLI
 * Issues unique Living Book copies, verifies copies, and inspects the press registry.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LivingBookPress } from './lib/living-book-press/press.js';
import { LivingBookRegistry } from './lib/living-book-press/registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultStorageDir = path.join(process.cwd(), '.cogentia', 'press');

const press = new LivingBookPress({
  registry: new LivingBookRegistry({ storageDir: defaultStorageDir })
});

function printUsage() {
  console.log(`
Living Book Press — Unique Copy Registry & PDF Issuance

Usage:
  node scripts/living-book-press.js <command> [options]

Commands:
  profiles                           List registered Living Books and frozen editions.
  request --book <id> [options]      Authoritatively issue a unique copy and render PDF.
  verify <copy_id>                   Verify an issued copy against the public registry.
  materialize <copy_id>              Confirm physical printing/materialization.
  duplicate <copy_id> [options]      Handle duplicate print (rematerialization or fork).
  audit [--book <id>]                Export complete registry audit summary.

Options:
  --book <id>                        Living Book ID (e.g. suicide-corse)
  --edition <id>                     Frozen edition ID (defaults to book's active edition)
  --singularization <mode>           singulier (default) | standard
  --material <profile>               accessible (default) | luxe
  --format <fmt>                     A4 (default) | A5
  --mission <text>                   Initial mission or dedication text
  --out <path>                       File path to save the generated PDF
  --rematerialize                    Document rematerialization of the same copy
  --fork                             Issue an incarnation fork (new copy ID)
  --reason <text>                    Reason for rematerialization or fork
  --json                             Emit pure JSON output
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
  return { flags, positional };
}

const { flags, positional } = parseArgs(process.argv.slice(2));
const cmd = positional[0];

if (!cmd || cmd === 'help' || flags.help) {
  printUsage();
  process.exit(0);
}

try {
  if (cmd === 'profiles') {
    const list = press.listProfiles();
    if (flags.json) {
      console.log(JSON.stringify(list, null, 2));
    } else {
      console.log('Registered Living Books:\n');
      for (const p of list) {
        console.log(`• [${p.id}] ${p.title}`);
        console.log(`  Subtitle: ${p.subtitle}`);
        console.log(`  Repository: ${p.repository}`);
        console.log('  Frozen Editions:');
        for (const [eId, ed] of Object.entries(p.editions)) {
          console.log(`    - ${eId} (${ed.name}) [commit: ${ed.commit.slice(0, 10)}]`);
        }
        console.log('');
      }
    }
  } else if (cmd === 'request') {
    const bookId = flags.book;
    if (!bookId) {
      console.error('Error: --book <id> is required.');
      process.exit(1);
    }

    const editionId = flags.edition;
    const singularization = flags.singularization || 'singulier';
    const materialProfile = flags.material || 'accessible';
    const format = flags.format || 'A4';
    const biography = {
      mission_ref: flags.mission || null
    };

    const res = press.requestCopy({
      bookId,
      editionId,
      singularization,
      materialProfile,
      format,
      biography
    });

    if (flags.out) {
      const outPath = path.resolve(flags.out);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, res.pdfBuffer);
    }

    if (flags.json) {
      console.log(JSON.stringify({
        record: res.record,
        sha256: res.sha256,
        byteLength: res.pdfBuffer.length,
        savedTo: flags.out ? path.resolve(flags.out) : null
      }, null, 2));
    } else {
      console.log('✓ Unique copy successfully allocated & rendered!\n');
      console.log(`Copy ID:          ${res.record.copy_id}`);
      console.log(`Book / Edition:   ${res.record.book_id} / ${res.record.edition_id}`);
      console.log(`Singularization:  ${res.record.singularization.toUpperCase()}`);
      console.log(`Material Profile: ${res.record.material_profile.toUpperCase()}`);
      console.log(`Render Hash:      ${res.sha256}`);
      console.log(`Verification URL: ${res.record.verification_url}`);
      if (flags.out) {
        console.log(`PDF Saved To:     ${path.resolve(flags.out)}`);
      }
    }
  } else if (cmd === 'verify') {
    const copyId = positional[1] || flags.id;
    if (!copyId) {
      console.error('Error: specify <copy_id> to verify.');
      process.exit(1);
    }

    const info = press.verifyCopy(copyId);
    if (flags.json) {
      console.log(JSON.stringify(info, null, 2));
    } else {
      if (!info.found) {
        console.log(`✗ Verification failed: ${info.error}`);
        process.exit(1);
      }
      console.log('✓ Copy verified in Living Book registry:\n');
      console.log(`Copy ID:          ${info.copy_id}`);
      console.log(`Book / Edition:   ${info.book_id} / ${info.edition_id}`);
      console.log(`Status:           ${info.status}`);
      console.log(`Issued At:        ${info.issued_at}`);
      console.log(`Singularization:  ${info.singularization}`);
      console.log(`Material Profile: ${info.material_profile}`);
      console.log(`Render Fingerprint: ${info.render_sha256}`);
      console.log(`Verification URL: ${info.verification_url}`);
      if (info.has_mission) {
        console.log(`Mission:          ${info.mission_summary}`);
      }
    }
  } else if (cmd === 'materialize') {
    const copyId = positional[1] || flags.id;
    if (!copyId) {
      console.error('Error: specify <copy_id> to materialize.');
      process.exit(1);
    }
    const updated = press.confirmMaterialized(copyId);
    if (flags.json) {
      console.log(JSON.stringify(updated, null, 2));
    } else {
      console.log(`✓ Copy ${copyId} confirmed as MATERIALIZED.`);
    }
  } else if (cmd === 'duplicate') {
    const copyId = positional[1] || flags.id;
    if (!copyId) {
      console.error('Error: specify <copy_id> for duplicate handling.');
      process.exit(1);
    }
    const intention = flags.fork ? 'independent_object' : 'rematerialization';
    const reason = flags.reason || (flags.fork ? 'new physical circulating copy' : 'reprint replacement');
    const result = press.handleDuplicatePrint(copyId, { intention, reason });
    if (flags.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(result.message);
    }
  } else if (cmd === 'audit') {
    const bookId = flags.book || null;
    const audit = press.registry.exportAudit(bookId);
    if (flags.json) {
      console.log(JSON.stringify(audit, null, 2));
    } else {
      console.log('Living Book Press — Registry Audit Summary:');
      console.log(`Exported At:  ${audit.exported_at}`);
      console.log(`Total Copies: ${audit.total_copies}`);
      console.log('By Status:', audit.by_status);
      console.log('By Mode:  ', audit.by_singularization);
    }
  } else {
    console.error(`Unknown command: ${cmd}`);
    printUsage();
    process.exit(1);
  }
} catch (err) {
  console.error('Execution error:', err.message);
  process.exit(1);
}
