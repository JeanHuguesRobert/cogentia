/** Read-only candidate packet attachment. No new packet, mutation or authority. */
import fs from 'node:fs';
import path from 'node:path';

const STOP = new Set('the and for from with that this have into about work issue notes source status title type should would after before when where which comme dans pour avec cette sont plus nous vous mais sans donc aussi cela dont chaque tout leur tres etre avoir vers elle entre puis parce cette ses des les une aux par sur est ont qui que un du de la le en au ce et ou pas its not are was one can may our new use all any has why how what when been work possible possible'.split(' '));
const normalize = s => String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const tokens = s => [...new Set(normalize(s).match(/[a-z0-9][a-z0-9_-]{2,}/g)?.filter(x=>!STOP.has(x)&&!/^\d+$/.test(x))||[])];
const capped = (s,n=500) => String(s||'').replace(/\s+/g,' ').trim().slice(0,n);
const safeRead = file => { try { if (fs.lstatSync(file).isSymbolicLink() || fs.statSync(file).size>200_000) return ''; return fs.readFileSync(file,'utf8'); }catch{return '';} };
const exclusions = new Set(['node_modules','.git','dist','build','private','memory','.cache','previews','generated']);
function enumerate(base, depth, out, max=3500){
  if(depth<0||out.length>=max)return;
  let entries;try{entries=fs.readdirSync(base,{withFileTypes:true});}catch{return;}
  for(const ent of entries.sort((a,b)=>a.name.localeCompare(b.name))){
    if(out.length>=max)break;
    if(ent.isSymbolicLink())continue;
    if(ent.isDirectory()){if(!exclusions.has(ent.name))enumerate(path.join(base,ent.name),depth-1,out,max);}
    else if(ent.isFile() && /\.(md|json)$/.test(ent.name))out.push(path.join(base,ent.name));
  }
}
function candidates(root){
  const files=[];
  // Packet sources, live and completed continuations, issue packets. Nothing else.
  for(const p of ['.cogentia/continuations','.cogentia/issues','research'])enumerate(path.join(root,p),p==='research'?1:3,files);
  return files;
}
function meta(text,file){
  if (file.endsWith('.json')) {
    try { const data=JSON.parse(text); return {title:data.title||data.subject||data.mandate?.mission||path.basename(file),id:data.packet_id||data.id||null,status:data.status||null,visibility:data.visibility||null}; } catch {}
  }
  const front = text.startsWith('---\n') ? text.slice(4,text.indexOf('\n---',4)>0?text.indexOf('\n---',4):4_000) : text.slice(0,1300);
  const pick = key => (front.match(new RegExp(`^${key}:\\s*(.+)$`,'m'))?.[1]||'').replace(/^['"]|['"]$/g,'').trim();
  return {title:pick('title')||pick('subject')||path.basename(file),id:pick('packet_id')||pick('id')||pick('issue_url')||null,status:pick('status')||null,visibility:pick('visibility')||null};
}
/** Strict suggestion-only contract; a score is a ranking signal, not an identity probability. */
export function relatePacket({text,roots=[],limit=6,source='inline',maxFiles=3500}={}){
  if(typeof text!=='string'||!text.trim())throw new Error('Provide nonempty --text or --file content');
  const query=tokens(text.slice(0,12000));
  if(query.length<1)throw new Error('Input lacks searchable terms');
  const found=[],seen=new Set();let scanned=0,read=0;
  for(const rootArg of roots){
    const root=path.resolve(rootArg);
    for(const file of candidates(root).slice(0,maxFiles)){
      scanned++;
      const rel=path.relative(root,file);
      const key=`${root}/${rel}`;
      if(seen.has(key))continue;seen.add(key);
      const content=safeRead(file);
      if(!content)continue;read++;
      const m=meta(content,file);
      // No silent eligibility for private/non-public sources.
      if(['private','confidential','restricted'].includes(normalize(m.visibility)))continue;
      const head=tokens(`${m.title} ${m.id||''} ${rel}`);
      const body=tokens(content.slice(0,16000));
      const matches=query.filter(t=>body.includes(t)||head.includes(t));
      if(matches.length<2 && !(matches.length===1 && query.length===1))continue;
      const titleMatches=matches.filter(t=>head.includes(t));
      const ratio=matches.length/query.length;
      const rank=Math.round(100*(0.6*ratio + 0.4*titleMatches.length/Math.max(1,query.length)));
      if(rank<7)continue;
      const lines=content.split('\n');
      const excerptLine=lines.findIndex(line=>matches.some(t=>tokens(line).includes(t)) && line.trim().length>22 && !/^(#|\s*[a-z_]+:)/.test(line));
      found.push({reference:`${path.basename(root)}/${rel}`,packet_id:m.id,title:m.title,status:m.status,rank_signal:rank,relation:'semantic_candidate',decision:'review_required',matched_terms:matches.slice(0,12),title_terms:titleMatches.slice(0,8),evidence:excerptLine>=0?{line:excerptLine+1,excerpt:capped(lines[excerptLine])}:null,reason:`${matches.length}/${query.length} distinct query terms match; ${titleMatches.length} appear in title, ID or path. Shared finality and provenance NOT verified.`});
    }
  }
  found.sort((a,b)=>b.rank_signal-a.rank_signal || a.reference.localeCompare(b.reference));
  return {protocol:'cogentia.packet_relation_proposal.v1',read_only:true,source,query_terms:query.slice(0,32),review_required:true,packet_creation_recommended:false,packet_creation_assessed:false,notices:['Lexical candidate discovery only; semantic relation and identity require review.','No COP mandate, packet mutation or authority is granted.','Private memory and private paths are excluded by default.'],scanned_files:scanned,read_files:read,candidates:found.slice(0,Math.max(1,Math.min(25,limit)))};
}
