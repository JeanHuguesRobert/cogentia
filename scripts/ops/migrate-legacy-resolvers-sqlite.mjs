#!/usr/bin/env node
/** Explicit, non-destructive migration of historical resolver registry
 * and local legacy claim JSON to host-local SQLite. Dry run by default. */
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {importLegacyResolverJson} from '../lib/resolver-registry.js';

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const args=process.argv.slice(2);
  const pos=args.indexOf('--root');
  if(pos<0||!args[pos+1]){
    console.error('Usage: node migrate-legacy-resolvers-sqlite.mjs --root REGISTRY_ROOT [--apply]');
    process.exitCode=2;
  }else{
    const result=importLegacyResolverJson(resolve(args[pos+1]),{
      apply:args.includes('--apply')});
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
    if(!result.ok)process.exitCode=1;
  }
}
