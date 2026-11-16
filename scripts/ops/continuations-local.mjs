#!/usr/bin/env node
/**
 * Dependency-free local SQLite continuation inspection.
 * Does not start Cogentia, contact a coordinator, or interpret COP authority.
 * It never creates or edits a database (unlike opening a live store).
 */
import {DatabaseSync} from 'node:sqlite';
import {existsSync,statSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {continuationDatabasePath} from '../lib/continuation-sqlite-repository.mjs';

function parse(args){
  const out={command:args[0]||'health',id:null,root:null,db:null,limit:200};
  for(let i=1;i<args.length;i++){
    if(args[i]==='--root')out.root=args[++i];
    else if(args[i]==='--db')out.db=args[++i];
    else if(args[i]==='--limit')out.limit=Math.min(10000,Math.max(1,Number(args[++i])||200));
    else if(args[i]==='--id')out.id=args[++i];
    else throw Error('unknown_argument:'+args[i]);
  }
  return out;
}
export function inspectLocalContinuations({command='health',db,limit=200,id=null}={}){
  if(typeof db!=='string'||!db.trim())throw Error('database_path_required');
  const filename=resolve(db);
  if(!existsSync(filename))return {ok:false,error:'database_not_found',database:filename};
  const conn=new DatabaseSync(filename,{readOnly:true});
  try{
    if(command==='health'){
      const integrity=conn.prepare('PRAGMA quick_check').get();
      const counts=conn.prepare('SELECT status,kind,COUNT(*) AS n FROM primitive_continuations GROUP BY status,kind').all();
      const sources=conn.prepare('SELECT COUNT(*) AS n FROM primitive_sources').get().n;
      const slots=conn.prepare('SELECT COUNT(*) AS n FROM primitive_slots').get().n;
      return {ok:integrity.quick_check==='ok',database:filename,size_bytes:statSync(filename).size,
        integrity:integrity.quick_check,continuations:counts.reduce((n,x)=>n+x.n,0),
        source_versions:sources,memoized_slots:slots,groups:counts};
    }
    if(command==='list'){
      const rows=conn.prepare('SELECT id,kind,status,revision,scope,updated_at,origin_ref FROM primitive_continuations ORDER BY updated_at DESC,id LIMIT ?').all(limit);
      return {ok:true,database:filename,limit,items:rows};
    }
    if(command==='inspect'){
      if(typeof id!=='string'||!/^[a-zA-Z0-9_.:-]{1,200}$/.test(id))
        throw Error('continuation_id_required');
      const row=conn.prepare('SELECT * FROM primitive_continuations WHERE id=?').get(id);
      if(!row)return {ok:false,error:'continuation_not_found',id,database:filename};
      const sources=conn.prepare('SELECT source_ref,source_hash,created_at FROM primitive_sources WHERE continuation_id=?').all(id);
      return {ok:true,database:filename,continuation:{...row,body:JSON.parse(row.body_json),body_json:undefined},sources};
    }
    throw Error('unknown_command:'+command);
  }finally{conn.close()}
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname)){
  try{
    const opt=parse(process.argv.slice(2));
    const db=opt.db||(opt.root&&continuationDatabasePath(opt.root));
    const result=inspectLocalContinuations({...opt,db});
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
    if(!result.ok)process.exitCode=1;
  }catch(e){
    process.stderr.write(JSON.stringify({ok:false,error:e.message})+'\n');
    process.exitCode=2;
  }
}
