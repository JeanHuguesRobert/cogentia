#!/usr/bin/env node
/** Read-only at Continuation semantics: never emits, assigns or dispatches.
 * Prints only aggregate metadata, not questions, PII or source bodies.
 * --catalog inspects source-backed producer metadata without a database. */
import {existsSync} from 'node:fs';
import {continuationDatabasePath,createContinuationSqliteRepository}
  from '../lib/continuation-sqlite-repository.mjs';
import {CONTINUATION_PRODUCERS,CONTINUATION_PRODUCTION_CLASSES,
  summarizeStoredContinuationProducers}
  from '../lib/continuation-producer-taxonomy.mjs';
const args=process.argv.slice(2);
const roots=args.filter(a=>a.startsWith('--registry-root='));
if(args.some(a=>a!=='--catalog'&&!a.startsWith('--registry-root='))||roots.length>1){
  console.error('Usage: node scripts/ops/audit-continuation-producers.mjs [--registry-root=PATH] [--catalog]');
  process.exitCode=2;
}else if(args.includes('--catalog')){
  console.log(JSON.stringify({profile:'cogentia.continuation-producer-catalog/v1',
    read_only:true,classes:CONTINUATION_PRODUCTION_CLASSES,
    producers:CONTINUATION_PRODUCERS,external_effects:0},null,2));
}else{
  const registryRoot=roots[0]?.slice('--registry-root='.length)||
    '/srv/cogentia/repos/JeanHuguesRobert';
  const dbPath=continuationDatabasePath(registryRoot);
  if(!existsSync(dbPath)){
    console.error('Cannot audit: existing Continuation database not found');
    process.exitCode=1;
  }else{
    const local=createContinuationSqliteRepository({registryRoot,dbPath});
    try{console.log(JSON.stringify(summarizeStoredContinuationProducers(local.list()),null,2))}
    finally{local.close()}
  }
}
