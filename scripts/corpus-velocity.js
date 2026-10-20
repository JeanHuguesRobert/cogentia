#!/usr/bin/env node
// Corpus velocity #267: reproducible Git snapshot counts, standard-library only.
// Usage: node scripts/corpus-velocity.js --registry research/corpus-velocity-repos.json --from 2025-10 --to 2026-10 --out /tmp/corpus-velocity
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
const arg=(flag,def)=>{const i=process.argv.indexOf(flag);return i<0?def:process.argv[i+1]};
const registry=JSON.parse(fs.readFileSync(arg('--registry','research/corpus-velocity-repos.json'),'utf8'));
const from=arg('--from','2025-10'),to=arg('--to','2026-10'),out=arg('--out','corpus-velocity-out');
if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(from)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(to)||from>to)throw Error('Invalid month interval');
const root=arg('--root',path.join(os.homedir(),'srv','cogentia','repos'));
const sh=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',maxBuffer:100*1024*1024}).trimEnd();
const months=[];for(let x=from;x<=to;){months.push(x);let d=new Date(x+'-01T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);x=d.toISOString().slice(0,7)}
const classify=p=>{
 const s=p.toLowerCase(), ext=path.extname(s);
 if(/(^|\/)(node_modules|vendor|dist|build|coverage|\.next|target|\.git|generated|__generated__|snapshots?|fixtures)\//.test(s)||/(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/.test(s))return 'excluded';
 if(/(^|\/)(index|corpus-status|llms(-full)?)\.md$/.test(s)||/(^|\/)(readme\.generated\.md)$/.test(s))return 'derived_md';
 if(ext==='.md')return 'markdown';
 if(new Set(['.js','.mjs','.cjs','.ts','.tsx','.jsx','.py','.go','.rs','.c','.cc','.cpp','.h','.hpp','.java','.rb','.php','.sh','.sql','.swift','.kt']).has(ext))return 'code:'+ext.slice(1);
 if(/(^|\/)(__tests__|tests?|specs?)\//.test(s)||/\.(test|spec)\./.test(s))return 'test_other';
 return 'other';
};
const rows=[],warnings=[];
for(const r of registry.repos){
 if(r.visibility==='private'||r.include===false){warnings.push({repo:r.name,status:'excluded_by_registry'});continue}
 const cwd=path.join(root,r.path||r.name.split('/').pop());
 if(!fs.existsSync(path.join(cwd,'.git'))){warnings.push({repo:r.name,status:'missing_local_clone',path:cwd});continue}
 for(const m of months){const end=new Date(m+'-01T00:00:00Z');end.setUTCMonth(end.getUTCMonth()+1);
 const until=new Date(end.getTime()-1000).toISOString();
 let sha='';try{sha=sh(cwd,'rev-list','-1','--before='+until,'HEAD')}catch(e){warnings.push({repo:r.name,month:m,status:'git_error',message:e.message});continue}
 const count={repo:r.name,month:m,sha:sha||null,files:0,bytes:0,code_files:0,code_bytes:0,markdown_files:0,tests:0,excluded_files:0,by_language:{},status:sha?'measured':'not_yet_created'};
 if(sha){let raw=sh(cwd,'ls-tree','-r','-l','-z',sha);for(const record of raw.split('\0')){if(!record)continue;let mt=record.match(/^\d+ (blob|commit) ([a-f0-9]+)\s+(-|\d+)\t([\s\S]+)$/);if(!mt||mt[1]!=='blob')continue;const size=Number(mt[3]),cat=classify(mt[4]);count.files++;count.bytes+=size;if(cat==='excluded'){count.excluded_files++;continue}if(cat==='markdown')count.markdown_files++;if(cat.startsWith('code:')){count.code_files++;count.code_bytes+=size;const lang=cat.slice(5);count.by_language[lang]=(count.by_language[lang]||0)+1;}if(/(^|\/)(tests?|__tests__|specs?)\//.test(mt[4])||/\.(test|spec)\./.test(mt[4]))count.tests++}}
 rows.push(count);
 }
}
fs.mkdirSync(out,{recursive:true});const manifest={generated_at:new Date().toISOString(),from,to,registry_path:arg('--registry','research/corpus-velocity-repos.json'),root,algorithm:'git rev-list --before then git ls-tree -r -l; committed blob sizes',status:warnings.length?'partial':'complete',filters:'heuristic; code LOC/SLOC/PR/CI not measured',rows,warnings};
fs.writeFileSync(path.join(out,'corpus-velocity.json'),JSON.stringify(manifest,null,2)+'\n');
const columns=['repo','month','sha','status','files','bytes','code_files','code_bytes','markdown_files','tests','excluded_files'];
const csv=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
fs.writeFileSync(path.join(out,'corpus-velocity.csv'),columns.join(',')+'\n'+rows.map(r=>columns.map(k=>csv(r[k])).join(',')).join('\n')+'\n');
console.log(JSON.stringify({status:manifest.status,rows:rows.length,warnings:warnings.length,out}));
