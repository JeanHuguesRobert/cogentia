#!/usr/bin/env node
/**
 * Non-destructive host-local migration: immutable PacketClaim epoch files and
 * terminal receipt files -> SQLite. No authority grant, effect or network call.
 * The source files are never modified/deleted. Dry run is the default.
 */
import {readdirSync,readFileSync,existsSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {claimEpochs,getTerminalReceipt,importClaimEpoch,putTerminalReceipt}
  from '../lib/continuation-claim-sqlite.mjs';
import {continuationDatabasePath} from '../lib/continuation-sqlite-repository.mjs';
const safeId=x=>typeof x==='string'&&/^[a-zA-Z0-9_.:-]{1,160}$/.test(x)&&!x.includes('..');
const files=dir=>existsSync(dir)?readdirSync(dir).filter(n=>n.endsWith('.json')).sort():[];

export function migrateLegacyCopClaims(root,{apply=false}={}){
  root=resolve(root);
  const base=join(root,'.cogentia','resolvers');
  const epochsRoot=join(base,'claims-v1');
  const receiptsRoot=join(base,'settlements');
  const report={schema:'cop-sqlite-claim-migration/v1',root,
    database:continuationDatabasePath(root),apply,epochs:0,receipts:0,
    imported:0,already_imported:0,conflicts:[],invalid:[]};
  const ids=existsSync(epochsRoot)?readdirSync(epochsRoot).filter(safeId).sort():[];
  for(const id of ids){
    const folder=join(epochsRoot,id);
    if(!statSync(folder).isDirectory())continue;
    for(const name of files(folder)){
      try{
        if(!/^\d{12}\.json$/.test(name))throw Error('invalid_epoch_filename');
        const doc=JSON.parse(readFileSync(join(folder,name),'utf8'));
        if(doc?.epoch!==Number(name.slice(0,12)) ||
           !['cop.packet-claim/v1','cogentia.cop-terminal-intent/v1'].includes(doc?.schema))
          throw Error('invalid_epoch_record');
        report.epochs++;
        if(!apply)continue;
        const result=importClaimEpoch(root,id,doc);
        if(result.ok){if(result.existing)report.already_imported++;else report.imported++}
        else report.conflicts.push({kind:'epoch',id,file:name,code:result.code});
      }catch(e){report.invalid.push({kind:'epoch',id,file:name,error:String(e.message)})}
    }
  }
  for(const name of files(receiptsRoot)){
    try{
      const id=name.slice(0,-5);
      if(!safeId(id))throw Error('invalid_receipt_filename');
      const doc=JSON.parse(readFileSync(join(receiptsRoot,name),'utf8'));
      if(doc?.schema!=='cogentia.continuation-settlement-receipt/v1'||
        doc.continuation_id!==id)throw Error('invalid_receipt_record');
      report.receipts++;
      if(!apply)continue;
      const prior=getTerminalReceipt(root,id);
      const result=putTerminalReceipt(root,id,doc);
      if(!result.ok)report.conflicts.push({kind:'receipt',id,file:name,code:result.code});
      else if(prior)report.already_imported++;
      else report.imported++;
    }catch(e){report.invalid.push({kind:'receipt',file:name,error:String(e.message)})}
  }
  report.ok=report.conflicts.length===0&&report.invalid.length===0;
  return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const args=process.argv.slice(2);
  const i=args.indexOf('--root');
  if(i<0||!args[i+1]){
    console.error('Usage: node migrate-legacy-cop-claims-sqlite.mjs --root REGISTRY_ROOT [--apply]');
    process.exitCode=2;
  }else{
    const report=migrateLegacyCopClaims(args[i+1],{apply:args.includes('--apply')});
    process.stdout.write(JSON.stringify(report,null,2)+'\n');
    if(!report.ok)process.exitCode=1;
  }
}
