#!/usr/bin/env node
/**
 * Explicit, locality-preserving primitive continuation snapshot operations.
 * No COP mandate, network call, implicit transfer of ownership, or replay of
 * external effects. File transport is deliberately OUTSIDE this layer.
 */
import {existsSync,statSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createPrimitiveContinuationStore} from '../lib/primitive-continuations.mjs';

function parse(argv){
  const [action,...rest]=argv;
  if(!['export','import','reconcile'].includes(action))
    throw Error('action_must_be_export_import_or_reconcile');
  const opts={action};
  for(let i=0;i<rest.length;i+=2){
    const flag=rest[i],val=rest[i+1];
    if(!['--db','--id','--out','--in','--scope'].includes(flag)||
       typeof val!=='string'||!val.length)
      throw Error('invalid_cli_argument:'+String(flag));
    if(opts[flag]!==undefined)throw Error('duplicate_cli_argument:'+flag);
    opts[flag]=val;
  }
  if(!opts['--db'])throw Error('database_path_required');
  if(action==='export'&&(!opts['--id']||!opts['--out']||opts['--in']))
    throw Error('export_requires_id_and_out');
  if(action!=='export'&&(!opts['--in']||opts['--out']||opts['--id']))
    throw Error('import_requires_input_snapshot');
  if(action==='export'&&opts['--scope'])throw Error('scope_only_for_import_or_reconcile');
  return opts;
}

export function operateLocalSnapshot(opts){
  const dbPath=resolve(opts['--db']);
  const operation=opts.action;
  if(operation!=='import'&&!existsSync(dbPath))
    throw Error('database_not_found');
  if(operation==='export'&&existsSync(resolve(opts['--out'])))
    throw Error('snapshot_output_exists');
  let envelope;
  if(operation!=='export'){
    const file=resolve(opts['--in']);
    const size=statSync(file).size;
    if(size<1||size>32*1024*1024)throw Error('snapshot_file_size_not_supported');
    envelope=JSON.parse(readFileSync(file,'utf8'));
  }
  const store=createPrimitiveContinuationStore(dbPath);
  try{
    if(operation==='export'){
      const snapshot=store.snapshot(opts['--id']);
      if(!snapshot)return {ok:false,code:'not_found',id:opts['--id']};
      writeFileSync(resolve(opts['--out']),JSON.stringify(snapshot)+'\n',
        {flag:'wx',mode:0o600,encoding:'utf8'});
      return {ok:true,action:operation,id:snapshot.continuation.id,
        revision:snapshot.continuation.revision,scope:snapshot.continuation.scope,
        sha256:snapshot.sha256,output:resolve(opts['--out'])};
    }
    const scope=opts['--scope']??null;
    const result=operation==='import'
      ?store.importSnapshot(envelope,{scope})
      :store.reconcileSnapshot(envelope,{scope});
    return {ok:result.ok,action:operation,
      id:envelope?.continuation?.id??null,
      revision:result.row?.revision??result.current?.revision??null,
      code:result.code??null,
      advanced:result.advanced??false,
      preserved:result.preserved??false,
      already_preserved:result.already_preserved??false,
      existing:result.existing??false,
      sha256:envelope.sha256??null};
  }finally{store.close()}
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){
  try{
    const result=operateLocalSnapshot(parse(process.argv.slice(2)));
    process.stdout.write(JSON.stringify(result)+'\n');
    if(!result.ok)process.exitCode=1;
  }catch(e){
    process.stderr.write(JSON.stringify({ok:false,error:String(e.message)})+'\n');
    process.exitCode=2;
  }
}
