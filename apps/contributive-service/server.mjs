#!/usr/bin/env node
// KYS public-interest contributive campaigns: neutral, accountless MVP.
// 3Code = public reference, not an identity, a right or a proof.
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const ROOT = '/3code';
const HERE = dirname(fileURLToPath(import.meta.url));
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const MAX_BODY = 16384;
const now = () => new Date().toISOString();
const hash = s => createHash('sha256').update(s).digest('hex');
const token = () => randomBytes(32).toString('base64url');
const short = (s,n) => typeof s === 'string' ? s.trim().slice(0,n) : '';
const textId = s => typeof s === 'string' && /^[a-zA-Z0-9_-]{4,100}$/.test(s);
const requireText = (s,n=120) => { const x=short(s,n); if(x.length<2)throw Error('Champ obligatoire (au moins 2 caractères).');return x; };
function code(raw) {
  if (typeof raw !== 'string') throw Error('3Code absent');
  const s=raw.toUpperCase().replace(/[-\s]/g,'').replace(/O/g,'0').replace(/[IL]/g,'1');
  if (s.length!==9 || s[0]!=='3' || ![...s.slice(1)].every(x=>ALPHABET.includes(x))) throw Error('3Code invalide');
  return s.slice(0,3)+'-'+s.slice(3,6)+'-'+s.slice(6,9);
}
function generate() {
  const n=randomBytes(5).readUIntBE(0,5);
  let suffix='';
  for(let j=7;j>=0;j--)suffix+=ALPHABET[(n / 2**(j*5))&31];
  return code('3'+suffix);
}
function authorize(provided, digest) {
  if(typeof provided!=='string'||provided.length<20||!digest)return false;
  const a=Buffer.from(hash(provided),'utf8'),b=Buffer.from(digest,'utf8');
  return a.length===b.length && timingSafeEqual(a,b);
}
function init(dbPath) {
  mkdirSync(dirname(dbPath),{recursive:true,mode:0o700});
  const db=new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000; PRAGMA foreign_keys=ON;');
  db.exec([
    'CREATE TABLE IF NOT EXISTS campaigns(id TEXT PRIMARY KEY,title TEXT NOT NULL,goal TEXT NOT NULL,status TEXT NOT NULL,secret_hash TEXT NOT NULL,created_at TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS missions(id TEXT PRIMARY KEY,campaign_id TEXT NOT NULL REFERENCES campaigns(id),title TEXT NOT NULL,description TEXT NOT NULL,created_at TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS copies(id TEXT PRIMARY KEY,campaign_id TEXT NOT NULL REFERENCES campaigns(id),mission_id TEXT REFERENCES missions(id),title TEXT NOT NULL,three_code TEXT NOT NULL,parent_id TEXT,parent_code TEXT,relation_status TEXT NOT NULL,source_template TEXT,edit_hash TEXT NOT NULL,created_at TEXT NOT NULL)',
    'CREATE INDEX IF NOT EXISTS copies_code ON copies(three_code)',
    'CREATE TABLE IF NOT EXISTS contributions(id TEXT PRIMARY KEY,copy_id TEXT NOT NULL REFERENCES copies(id),message TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL,reviewed_at TEXT)',
    'CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,copy_id TEXT NOT NULL REFERENCES copies(id),kind TEXT NOT NULL,context TEXT NOT NULL,created_at TEXT NOT NULL)'
  ].join(';')+';');
  return db;
}
function json(res,status,obj) {
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(obj));
}
function err(res,e) {json(res,e.status||400,{error:e.message||'Requête invalide'});}
function fail(message,status=400){const e=new Error(message);e.status=status;throw e;}
function load(req){
  return new Promise((resolve,reject)=>{
    let body='',size=0;
    req.on('data',chunk=>{size+=chunk.length;if(size>MAX_BODY){reject(Object.assign(new Error('Requête trop longue'),{status:413}));req.destroy();return;}body+=chunk;});
    req.on('end',()=>{try{resolve(JSON.parse(body||'{}'));}catch{reject(Object.assign(new Error('JSON invalide'),{status:400}));}});
    req.on('error',reject);
  });
}
const colCampaign='id,title,goal,status,created_at';
const colCopy='id,campaign_id,mission_id,title,three_code,parent_id,parent_code,relation_status,source_template,created_at';
function owner(db,id,req) {
  const row=db.prepare('SELECT secret_hash FROM campaigns WHERE id=?').get(id);
  if(!row)fail('Campagne inconnue',404);
  if(!authorize(req.headers['x-management-token'],row.secret_hash))fail('Clé de gestion nécessaire',403);
}
function rateGate(map,req,pathname) {
  if(req.method==='GET')return;
  const key=(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').toString().split(',').slice(-1)[0].trim()+':'+pathname;
  const t=Date.now();let rec=map.get(key);
  if(!rec||t-rec.t>60000)rec={t,n:0};
  rec.n++;map.set(key,rec);
  if(rec.n>30)fail('Trop de requêtes; réessayez dans une minute',429);
  if(map.size>5000)for(const [k,v] of map)if(t-v.t>120000)map.delete(k);
}
export function makeServer({dbPath=process.env.CAMPAIGNS_DB||'/srv/cogentia/data/contributive/campaigns.sqlite'}={}) {
  const db=init(dbPath), rates=new Map();
  const server=createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    try {
      const u=new URL(req.url,'http://localhost');
      const p=u.pathname;
      if(!p.startsWith(ROOT))return json(res,404,{error:'Hors service'});
      rateGate(rates,req,p);
      if(req.method==='GET'&&p===ROOT+'/api/health'){
        return json(res,200,{ok:true,service:'contributive-campaigns',schema:'campaigns-mvp-v1',db:!!db.prepare('SELECT 1 AS ok').get(),time:now()});
      }
      if(req.method==='GET'&&p===ROOT+'/api/generate') return json(res,200,{code:generate(),registered:false});
      if(req.method==='GET'&&p===ROOT+'/api/campaigns'){
        return json(res,200,{campaigns:db.prepare('SELECT '+colCampaign+' FROM campaigns WHERE status=? ORDER BY created_at DESC LIMIT 100').all('active')});
      }
      if(req.method==='POST'&&p===ROOT+'/api/campaigns'){
        const b=await load(req),id=randomUUID(),key=token(),t=now();
        db.prepare('INSERT INTO campaigns VALUES(?,?,?,?,?,?)').run(id,requireText(b.title,120),short(b.goal,1200),'draft',hash(key),t);
        return json(res,201,{id,status:'draft',management_token:key,notice:'Conservez cette clé hors du document public. Elle ne pourra pas être retrouvée.'});
      }
      const cm=p.match(/^\/3code\/api\/campaigns\/([a-f0-9-]{36})(?:\/(activate|contributions))?$/);
      if(cm){
        const [_,id,sub]=cm;
        const camp=db.prepare('SELECT '+colCampaign+' FROM campaigns WHERE id=?').get(id);
        if(!camp)fail('Campagne inconnue',404);
        if(req.method==='GET'&&!sub){
          return json(res,200,{campaign:camp,missions:db.prepare('SELECT id,title,description FROM missions WHERE campaign_id=? ORDER BY created_at').all(id)});
        }
        if(req.method==='POST'&&sub==='activate'){
          owner(db,id,req);
          db.prepare('UPDATE campaigns SET status=? WHERE id=?').run('active',id);
          return json(res,200,{id,status:'active'});
        }
        if(req.method==='GET'&&sub==='contributions'){
          owner(db,id,req);
          return json(res,200,{contributions:db.prepare('SELECT contributions.* FROM contributions JOIN copies ON copies.id=contributions.copy_id WHERE copies.campaign_id=? ORDER BY contributions.created_at DESC LIMIT 200').all(id)});
        }
      }
      if(req.method==='POST'&&p===ROOT+'/api/missions'){
        const b=await load(req);if(!textId(b.campaign_id))fail('Identifiant invalide');
        owner(db,b.campaign_id,req);
        const id=randomUUID(),t=now(),title=requireText(b.title,140),desc=short(b.description,1200);
        db.prepare('INSERT INTO missions VALUES(?,?,?,?,?)').run(id,b.campaign_id,title,desc,t);
        return json(res,201,{id,campaign_id:b.campaign_id,title,description:desc});
      }
      if(req.method==='GET'&&p===ROOT+'/api/resolve'){
        const value=code(u.searchParams.get('code')||'');
        const rows=db.prepare('SELECT '+colCopy+' FROM copies WHERE three_code=? ORDER BY created_at DESC LIMIT 100').all(value);
        return json(res,200,{code:value,ambiguous:rows.length>1,results:rows,more_possible:rows.length===100,notice:'Le 3Code n’est ni unique globalement ni preuve de propriété.'});
      }
      if(req.method==='POST'&&p===ROOT+'/api/copies'){
        const b=await load(req);
        if(!textId(b.campaign_id))fail('Campagne requise');
        const camp=db.prepare('SELECT status FROM campaigns WHERE id=?').get(b.campaign_id);
        if(!camp)fail('Campagne inconnue',404);
        if(camp.status!=='active')owner(db,b.campaign_id,req);
        let parent=null,parentCode=null,relation='none';
        if(b.parent_id) {
          parent=db.prepare('SELECT id,three_code,campaign_id FROM copies WHERE id=?').get(b.parent_id);
          if(!parent)fail('Parent introuvable',404);
          if(parent.campaign_id!==b.campaign_id)fail('Parent hors campagne');
          parentCode=parent.three_code;relation='linked-unverified';
        } else if(b.parent_code) {parentCode=code(b.parent_code);relation='declared-unverified';}
        const given=b.three_code?code(b.three_code):generate();
        const mid=b.mission_id||null;
        if(mid&&!db.prepare('SELECT id FROM missions WHERE id=? AND campaign_id=?').get(mid,b.campaign_id))fail('Mission hors campagne');
        const id=randomUUID(),edit=token(),t=now(),title=short(b.title,160)||'Exemplaire singulier';
        db.prepare('INSERT INTO copies VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,b.campaign_id,mid,title,given,parent?.id||null,parentCode,relation,short(b.source_template,160)||null,hash(edit),t);
        db.prepare('INSERT INTO events VALUES(?,?,?,?,?)').run(randomUUID(),id,parentCode?'FORK_DECLARED':'REGISTERED',JSON.stringify({status:'declaration-non-verifiee'}),t);
        return json(res,201,{id,campaign_id:b.campaign_id,three_code:given,parent_code:parentCode,relation_status:relation,url:ROOT+'/e/'+id,edit_token:edit,notice:'Enregistrement déclaratif, ni authentification de l’objet ni preuve de détention.'});
      }
      const copyMatch=p.match(/^\/3code\/api\/copies\/([a-f0-9-]{36})$/);
      if(req.method==='GET'&&copyMatch){
        const row=db.prepare('SELECT '+colCopy+' FROM copies WHERE id=?').get(copyMatch[1]);
        if(!row)fail('Exemplaire inconnu',404);
        return json(res,200,{copy:row,contributions:db.prepare('SELECT id,message,created_at FROM contributions WHERE copy_id=? AND status=? ORDER BY created_at LIMIT 100').all(row.id,'accepted'),events:db.prepare('SELECT kind,created_at FROM events WHERE copy_id=? ORDER BY created_at').all(row.id)});
      }
      if(req.method==='POST'&&p===ROOT+'/api/contributions'){
        const b=await load(req),copy=db.prepare('SELECT id FROM copies WHERE id=?').get(b.copy_id);
        if(!copy)fail('Exemplaire inconnu',404);
        const id=randomUUID(),t=now(),message=requireText(b.message,1000);
        db.prepare('INSERT INTO contributions VALUES(?,?,?,?,?,?)').run(id,b.copy_id,message,'pending',t,null);
        db.prepare('INSERT INTO events VALUES(?,?,?,?,?)').run(randomUUID(),b.copy_id,'CONTRIBUTION_PENDING','{}',t);
        return json(res,201,{id,status:'pending',notice:'Contribution non publiée avant examen.'});
      }
      const rev=p.match(/^\/3code\/api\/contributions\/([a-f0-9-]{36})\/review$/);
      if(req.method==='POST'&&rev){
        const b=await load(req),value=b.status;
        if(!['accepted','rejected'].includes(value))fail('Statut invalide');
        const row=db.prepare('SELECT copies.campaign_id FROM contributions JOIN copies ON copies.id=contributions.copy_id WHERE contributions.id=?').get(rev[1]);
        if(!row)fail('Contribution inconnue',404);
        owner(db,row.campaign_id,req);
        db.prepare('UPDATE contributions SET status=?,reviewed_at=? WHERE id=?').run(value,now(),rev[1]);
        return json(res,200,{id:rev[1],status:value});
      }
      if(req.method==='GET'&&p===ROOT+'/api/qr'){
        const url=u.searchParams.get('url')||'',target=new URL(url);
        if(target.protocol!=='https:'||target.hostname!=='services.acorsica.org'||!(target.pathname===ROOT||target.pathname.startsWith(ROOT+'/')))fail('QR autorisé seulement vers le service');
        const svg=await QRCode.toString(url,{type:'svg',margin:2,errorCorrectionLevel:'M'});
        res.writeHead(200,{'Content-Type':'image/svg+xml','Cache-Control':'public,max-age=1800'});
        return res.end(svg);
      }
      const pub={'/3code/app.js':['public/app.js','text/javascript; charset=utf-8'],'/3code/style.css':['public/style.css','text/css; charset=utf-8']};
      const entry=pub[p]||(req.method==='GET'&&(p===ROOT||p===ROOT+'/'||p===ROOT+'/print'||p.startsWith(ROOT+'/e/')||p.startsWith(ROOT+'/campaign/'))?['public/index.html','text/html; charset=utf-8']:null);
      if(req.method==='GET'&&entry){
        const body=readFileSync(join(HERE,entry[0]));
        res.writeHead(200,{'Content-Type':entry[1],'Cache-Control':'no-cache'});
        return res.end(body);
      }
      return json(res,404,{error:'Route inconnue'});
    } catch(e) {if(e instanceof TypeError&&/Invalid URL/.test(e.message))return err(res,failError('URL invalide'));return err(res,e);}
  });
  server.on('close',()=>db.close());
  return server;
}
function failError(s){const e=new Error(s);e.status=400;return e;}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]) {
  const port=Number(process.env.PORT||8879),host=process.env.HOST||'127.0.0.1';
  makeServer().listen(port,host,()=>process.stdout.write('contributive-service listening '+host+':'+port+'\n'));
}
export {code,generate};
