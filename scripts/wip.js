#!/usr/bin/env node
/** Standalone zero-dependency read-only WIP entrypoint for machines without full Cogentia dependencies. */
import { wipInventory, wipCompare } from './lib/wip-inventory.js';
const args = process.argv.slice(2);
function option(flag) { const i=args.indexOf(flag); return i<0 ? null : args[i+1]; }
const cmd=args[0] || 'inventory';
try {
  let result;
  if (cmd === 'inventory') result = wipInventory({ root: option('--root') || process.cwd() });
  else if (cmd === 'compare') result = wipCompare({ repo: option('--repo'), ref: option('--ref'), base: option('--base') || 'origin/main' });
  else throw new Error('Usage: node scripts/wip.js inventory --root <workspace> | compare --repo <path> --ref <ref> [--base origin/main]');
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  if (result.errors?.length || result.discovery_errors?.length) process.exitCode=2;
} catch (error) { console.error(error.message); process.exitCode=2; }
