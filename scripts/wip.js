#!/usr/bin/env node
/** Standalone zero-dependency read-only WIP entrypoint for machines without full Cogentia dependencies. */
import fs from 'node:fs';
import { wipInventory, wipCompare } from './lib/wip-inventory.js';
import { wipMergeInventories } from './lib/wip-merge.js';
const args = process.argv.slice(2);
function option(flag) { const i=args.indexOf(flag); return i<0 ? null : args[i+1]; }
const cmd=args[0] || 'inventory';
try {
  let result;
  if (cmd === 'inventory') result = wipInventory({ root: option('--root') || process.cwd() });
  else if (cmd === 'compare') result = wipCompare({ repo: option('--repo'), ref: option('--ref'), base: option('--base') || 'origin/main' });
  else if (cmd === 'merge') {
    const files=args.flatMap((v,i)=>v==='--input'&&args[i+1]?[args[i+1]]:[]);
    result=wipMergeInventories(files.map(p=>JSON.parse(fs.readFileSync(p,'utf8'))),
     {maxAgeHours:Number(option('--max-age-hours')||24)});
  }
  else throw new Error('Usage: node scripts/wip.js inventory --root <workspace> | compare --repo <path> --ref <ref> [--base origin/main] | merge --input <a.json> --input <b.json>');
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  if (result.errors?.length || result.discovery_errors?.length) process.exitCode=2;
} catch (error) { console.error(error.message); process.exitCode=2; }
