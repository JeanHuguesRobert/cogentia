#!/usr/bin/env node
/** One-way, additive legacy JSON -> primitive SQLite import.
 * Historical JSON remains untouched; consumers must be migrated separately.
 * No COP reinterpretation: preserve legacy status, kind and complete payload.
 */
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {hostname} from 'node:os';
import {createHash} from 'node:crypto';
import {createPrimitiveContinuationStore} from '../lib/primitive-continuations.mjs';

const digest=s=>createHash('sha256').update(s).digest('hex');
export function migrateJsonContinuations({source,dbPath,apply=false}={}){
  if(!source||!dbPath)throw Error('source_and_sqlite_db_required');
  const root=resolve(source);
  const names=readdirSync(root).filter(f=>f.endsWith('.json')).sort();
  const report={schema:'primitive-continuation-json-migration/v1',
    source:root,database:resolve(dbPath),apply,scanned:names.length,
    imported:0,already_imported:0,variants:0,source_versions:0,conflicts:[],invalid:[],candidates:0,
    by_status:{},by_kind:{}};
  const seenLogicalIds=new Map();
  const store=apply?createPrimitiveContinuationStore(dbPath):null;
  try{
    for(const name of names){
      try{
        const path=join(root,name);
        if(!statSync(path).isFile())continue;
        const bytes=readFileSync(path);
        const doc=JSON.parse(bytes.toString('utf8'));
        if(!doc||typeof doc!=='object'||Array.isArray(doc)||typeof doc.id!=='string'||
           !/^[a-zA-Z0-9_.:-]{1,200}$/.test(doc.id)||
           typeof doc.status!=='string'||!doc.status.trim())
          throw Error('invalid_legacy_continuation_shape');
        const kind=typeof doc.kind==='string'&&doc.kind.trim()?doc.kind:'legacy_continuation';
        const sourceHash=digest(bytes);
        const firstHash=seenLogicalIds.get(doc.id);
        const variant=firstHash!==undefined&&firstHash!==sourceHash;
        if(variant)report.variants++;
        if(firstHash===undefined)seenLogicalIds.set(doc.id,sourceHash);
        const entry={id:doc.id,kind,status:doc.status,scope:'legacy:'+hostname(),
          body:{source_format:'json-continuation',source_sha256:sourceHash,
            source_basename:name,original:doc},origin_ref:'legacy-json:'+hostname()+':'+name};
        report.by_status[doc.status]=(report.by_status[doc.status]||0)+1;
        report.by_kind[kind]=(report.by_kind[kind]||0)+1;
        report.candidates++;
        if(!store)continue;
        const put=store.create(entry);
        if(put.ok){
          if(put.existing)report.already_imported++;
          else report.imported++;
        }else if(variant&&put.code==='continuation_identity_conflict'&&put.current?.id===doc.id){
          // Source incarnations may differ while retaining one logical ID.
          // Do not create a second work identity for an archival variant.
        }else{
          report.conflicts.push({file:name,id:doc.id,code:put.code});
          continue;
        }
        const sourcePut=store.attachSource(doc.id,'legacy-json:'+hostname()+':'+name,sourceHash,doc);
        if(sourcePut.ok)report.source_versions++;
        else report.conflicts.push({file:name,id:doc.id,code:sourcePut.code});
      }catch(e){report.invalid.push({file:name,error:e.message});}
    }
  }finally{store?.close()}
  report.ok=report.invalid.length===0&&report.conflicts.length===0;
  return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const args=process.argv.slice(2);
  const opt=k=>{const n=args.indexOf(k);return n<0?null:args[n+1]};
  const apply=args.includes('--apply');
  const source=opt('--source');
  const dbPath=opt('--db');
  if(!source||!dbPath){
    console.error('Usage: node migrate-json-continuations-sqlite.mjs --source DIR --db PATH [--apply]');
    process.exitCode=2;
  }else{
    const report=migrateJsonContinuations({source,dbPath,apply});
    process.stdout.write(JSON.stringify(report,null,2)+'\n');
    if(!report.ok)process.exitCode=1;
  }
}
