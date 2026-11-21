#!/usr/bin/env node
// KYS public-interest contributive campaigns: neutral, accountless MVP.
// 3Code = public reference, not an identity, a right or a proof.
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, chmodSync, existsSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { normalize3Code, formatCopyReference, parseCopyReference } from './references.mjs';
import { ensureMarche, marcheCandidates, marcheSources, marcheVersion, marcheCampaignId, missionForCandidate, candidateForMission, candidateFor } from './marche.mjs';
import { initRegistrations, validateInbox, createRegistration, getRegistration, resolvedRegistrations, PILOT_SCOPE, PILOT_REGISTRAR_ID } from './registrations.mjs';

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
const code = normalize3Code;
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
  process.umask(0o077); // SQLite DB, WAL and SHM must never be world-readable.
  const dbDir = dirname(dbPath);
  // Only tighten a directory created by this service; never chmod /tmp or
  // another caller-owned shared parent supplied in CAMPAIGNS_DB.
  const newDir = !existsSync(dbDir);
  mkdirSync(dbDir,{recursive:true,mode:0o700});
  if(newDir) chmodSync(dbDir,0o700);
  const db=new DatabaseSync(dbPath);
  chmodSync(dbPath,0o600);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000; PRAGMA foreign_keys=ON;');
  db.exec([
    'CREATE TABLE IF NOT EXISTS campaigns(id TEXT PRIMARY KEY,title TEXT NOT NULL,goal TEXT NOT NULL,status TEXT NOT NULL,secret_hash TEXT NOT NULL,created_at TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS missions(id TEXT PRIMARY KEY,campaign_id TEXT NOT NULL REFERENCES campaigns(id),title TEXT NOT NULL,description TEXT NOT NULL,created_at TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS copies(id TEXT PRIMARY KEY,campaign_id TEXT NOT NULL REFERENCES campaigns(id),mission_id TEXT REFERENCES missions(id),title TEXT NOT NULL,three_code TEXT NOT NULL,parent_id TEXT,parent_code TEXT,relation_status TEXT NOT NULL,source_template TEXT,edit_hash TEXT NOT NULL,created_at TEXT NOT NULL)',
    'CREATE INDEX IF NOT EXISTS copies_code ON copies(three_code)',
    'CREATE TABLE IF NOT EXISTS contributions(id TEXT PRIMARY KEY,copy_id TEXT NOT NULL REFERENCES copies(id),message TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL,reviewed_at TEXT)',
    'CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,copy_id TEXT NOT NULL REFERENCES copies(id),kind TEXT NOT NULL,context TEXT NOT NULL,created_at TEXT NOT NULL)'
  ].join(';')+';');
  // Additive migration: preserve existing campaign ids and management secrets.
  const campaignColumns=new Set(db.prepare("SELECT name FROM pragma_table_info('campaigns')").all().map(r=>r.name));
  if(!campaignColumns.has('description'))db.exec("ALTER TABLE campaigns ADD COLUMN description TEXT NOT NULL DEFAULT ''");
  if(!campaignColumns.has('revision'))db.exec("ALTER TABLE campaigns ADD COLUMN revision INTEGER NOT NULL DEFAULT 1");
  if(!campaignColumns.has('updated_at'))db.exec("ALTER TABLE campaigns ADD COLUMN updated_at TEXT");
  const copyColumns=new Set(db.prepare("SELECT name FROM pragma_table_info('copies')").all().map(r=>r.name));
  if(!copyColumns.has('status'))db.exec("ALTER TABLE copies ADD COLUMN status TEXT NOT NULL DEFAULT 'declared'");
  if(!copyColumns.has('revision'))db.exec("ALTER TABLE copies ADD COLUMN revision INTEGER NOT NULL DEFAULT 1");
  if(!copyColumns.has('updated_at'))db.exec("ALTER TABLE copies ADD COLUMN updated_at TEXT");
  // Aggregate organizer declarations only. Never persist names or addresses of
  // elected officials or citizens here. No value implies official validation.
  db.exec('CREATE TABLE IF NOT EXISTS campaign_progress_events (id INTEGER PRIMARY KEY AUTOINCREMENT,campaign_id TEXT NOT NULL REFERENCES campaigns(id),stage TEXT NOT NULL,count INTEGER NOT NULL,evidence_url TEXT,created_at TEXT NOT NULL);');
  db.exec('CREATE INDEX IF NOT EXISTS campaign_progress_by_campaign ON campaign_progress_events(campaign_id,stage,id);');
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
const colCampaign='id,title,goal,description,status,created_at,updated_at,revision';
const colCopy='id,campaign_id,mission_id,title,three_code,parent_id,parent_code,relation_status,source_template,created_at,status,revision,updated_at';
function owner(db,id,req) {
  const row=db.prepare('SELECT secret_hash FROM campaigns WHERE id=?').get(id);
  if(!row)fail('Campagne inconnue',404);
  if(!authorize(req.headers['x-management-token'],row.secret_hash))fail('Clé de gestion nécessaire',403);
}
function createCopy(db,b,req){
        if(!textId(b.campaign_id))fail('Campagne requise');
        const camp=db.prepare('SELECT status FROM campaigns WHERE id=?').get(b.campaign_id);
        if(!camp)fail('Campagne inconnue',404);
        if(camp.status==='paused'||camp.status==='closed')fail('Campagne non ouverte aux nouveaux exemplaires',409);
        if(camp.status!=='active')owner(db,b.campaign_id,req);
        let parent=null,parentCode=null,relation='none';
        if(b.parent_id) {
          parent=db.prepare('SELECT id,three_code,campaign_id,status FROM copies WHERE id=?').get(b.parent_id);
          if(!parent||parent.status==='revoked')fail('Parent introuvable ou révoqué',404);
          if(parent.campaign_id!==b.campaign_id)fail('Parent hors campagne');
          parentCode=parent.three_code;relation='linked-unverified';
        } else if(b.parent_code) {parentCode=code(b.parent_code);relation='declared-unverified';}
        const given=b.three_code?code(b.three_code):generate();
        const mid=b.mission_id||null;
        if(mid&&!db.prepare('SELECT id FROM missions WHERE id=? AND campaign_id=?').get(mid,b.campaign_id))fail('Mission hors campagne');
        const id=randomUUID(),edit=token(),t=now(),title=short(b.title,160)||'Exemplaire singulier';
        db.prepare('INSERT INTO copies(id,campaign_id,mission_id,title,three_code,parent_id,parent_code,relation_status,source_template,edit_hash,created_at,status,revision,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
          .run(id,b.campaign_id,mid,title,given,parent?.id||null,parentCode,relation,short(b.source_template,160)||null,hash(edit),t,'declared',1,t);
        db.prepare('INSERT INTO events VALUES(?,?,?,?,?)').run(randomUUID(),id,parentCode?'FORK_DECLARED':'REGISTERED',JSON.stringify({status:'declaration-non-verifiee'}),t);
        return {id,campaign_id:b.campaign_id,three_code:given,reference:formatCopyReference({campaign_id:b.campaign_id,three_code:given,copy_id:id}),status:'declared',revision:1,parent_code:parentCode,relation_status:relation,url:ROOT+'/e/'+id,edit_token:edit,notice:'Enregistrement déclaratif, ni authentification de l’objet ni preuve de détention.'};
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
export function makeServer({
  dbPath=process.env.CAMPAIGNS_DB||'/srv/cogentia/data/contributive/campaigns.sqlite',
  mailInbox=process.env.CAMPAIGNS_INBOX||''
}={}) {
  const db=init(dbPath), rates=new Map(), inbox=validateInbox(mailInbox);
  initRegistrations(db);
  ensureMarche(db,dbPath);
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
        return json(res,200,{ok:true,service:'contributive-campaigns',schema:'campaigns-mvp-v3',db:!!db.prepare('SELECT 1 AS ok').get(),time:now()});
      }
      if(req.method==='GET'&&p===ROOT+'/api/generate') return json(res,200,{code:generate(),registered:false});
      if(req.method==='GET'&&p===ROOT+'/api/marche'){
        return json(res,200,{title:'La Marche du Soleil',campaign_id:marcheCampaignId,updated:marcheVersion,
          notice:'Répertoire indicatif de candidatures annoncées, sans investiture ni participation présumée de leurs équipes. Une présentation officielle appartient à l’élu habilité.',
          candidates:marcheCandidates,sources:marcheSources,
          howto:ROOT+'/marche-du-soleil/mode-emploi',
          tract:ROOT+'/marche-du-soleil/tract'});
      }
      const marcheCopy=p.match(/^\/3code\/api\/marche\/documents\/([a-f0-9-]{36})$/);
      if(req.method==='GET'&&marcheCopy){
        const row=db.prepare('SELECT '+colCopy+' FROM copies WHERE id=? AND campaign_id=?').get(marcheCopy[1],marcheCampaignId);
        if(!row)fail('Document de la Marche inconnu',404);
        if(row.status==='revoked')fail('Ce document a été retiré',410);
        const candidate=candidateForMission(db,row.mission_id);
        if(!candidate)fail('Candidature non référencée',404);
        return json(res,200,{document:{...row,reference:formatCopyReference({...row,copy_id:row.id})},
          candidate,howto:ROOT+'/marche-du-soleil/mode-emploi'});
      }
      if(req.method==='POST'&&p===ROOT+'/api/marche/documents'){
        const b=await load(req);
        if(typeof b.candidate_id!=='string'||!candidateFor(b.candidate_id))fail('Choisissez une candidature proposée',422);
        const mission_id=missionForCandidate(db,b.candidate_id);
        const candidate=candidateFor(b.candidate_id);
        const created=createCopy(db,{
          campaign_id:marcheCampaignId,mission_id,
          three_code:b.three_code,parent_code:b.parent_code||null,
          parent_id:b.parent_id||null,source_template:'marche-du-soleil/tract/v1',
          title:'Tract — '+candidate.name
        },req);
        return json(res,201,{...created,candidate:{id:candidate.id,name:candidate.name,movement:candidate.movement}});
      }
      if(req.method==='GET'&&p===ROOT+'/api/registrations/config') {
        return json(res,200,{enabled:!!inbox,inbox:inbox||null,method:'inbound-email-only',
          scope:PILOT_SCOPE,registrar_id:PILOT_REGISTRAR_ID,
          requires_copy_id:true,requires_copy_control_key:true,
          notice:inbox?'Le pilote enregistre uniquement les exemplaires Bouteilles à la Mer; le courriel doit être reçu.':'Boîte de réception non configurée; enregistrement de Bouteilles à la Mer différé.'});
      }
      if(req.method==='POST'&&p===ROOT+'/api/registrations') {
        const b=await load(req);
        const r=createRegistration(db,{three_code:code(b.three_code),copy_id:b.copy_id||null,
          edit_token:b.edit_token||'',pilot_acknowledged:b.pilot_acknowledged===true,inbox});
        return json(res,201,r);
      }
      const registrationMatch=p.match(/^\/3code\/api\/registrations\/([a-f0-9-]{36})$/);
      if(req.method==='GET'&&registrationMatch){
        return json(res,200,getRegistration(db,registrationMatch[1],req.headers['x-registration-view']));
      }
      if(req.method==='GET'&&p===ROOT+'/api/campaigns'){
        return json(res,200,{campaigns:db.prepare('SELECT '+colCampaign+' FROM campaigns WHERE status=? ORDER BY created_at DESC LIMIT 100').all('active')});
      }
      if(req.method==='POST'&&p===ROOT+'/api/campaigns'){
        const b=await load(req),id=randomUUID(),key=token(),t=now();
        db.prepare('INSERT INTO campaigns (id,title,goal,status,secret_hash,created_at,description,revision,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,requireText(b.title,120),short(b.goal,1200),'draft',hash(key),t,short(b.description,3000),1,t);
        return json(res,201,{id,status:'draft',revision:1,management_token:key,notice:'Conservez cette clé hors du document public. Elle ne pourra pas être retrouvée.'});
      }
      const cm=p.match(/^\/3code\/api\/campaigns\/([a-f0-9-]{36})(?:\/(activate|contributions|progress))?$/);
      if(cm){
        const [_,id,sub]=cm;
        const camp=db.prepare('SELECT '+colCampaign+' FROM campaigns WHERE id=?').get(id);
        if(!camp)fail('Campagne inconnue',404);
        if(req.method==='GET'&&!sub){
          return json(res,200,{campaign:camp,missions:db.prepare('SELECT id,title,description FROM missions WHERE campaign_id=? ORDER BY created_at').all(id)});
        }
        if(sub==='progress'){
          const stages=['contact','interest','promise','form_sent','officially_received','validated'];
          const notice='Déclarations agrégées de l’organisateur, non vérifiées par le registrar ni par le Conseil constitutionnel. Une promesse ne vaut pas présentation.';
          if(req.method==='GET'){
            const rows=db.prepare(`SELECT e.stage,e.count,e.evidence_url,e.created_at FROM campaign_progress_events e
              JOIN (SELECT stage,MAX(id) latest_id FROM campaign_progress_events WHERE campaign_id=? GROUP BY stage) latest ON latest.latest_id=e.id
              ORDER BY e.stage`).all(id);
            return json(res,200,{campaign_id:id,provenance:'organizer-declaration',stages,values:rows,notice});
          }
          if(req.method==='POST'){
            owner(db,id,req);
            const b=await load(req),stage=b.stage,amount=b.count;
            if(!stages.includes(stage))fail('Étape inconnue');
            if(!Number.isSafeInteger(amount)||amount<0||amount>1000000)fail('Nombre agrégé invalide');
            let evidence=null;
            if(b.evidence_url!==undefined&&b.evidence_url!==null&&b.evidence_url!==''){
              if(typeof b.evidence_url!=='string'||b.evidence_url.length>600)fail('URL de preuve invalide');
              let url;
              try{url=new URL(b.evidence_url);}catch{fail('URL de preuve invalide');}
              if(url.protocol!=='https:'||url.username||url.password)fail('URL de preuve HTTPS sans identifiants requise');
              evidence=url.href;
            }
            const at=now();
            db.prepare('INSERT INTO campaign_progress_events(campaign_id,stage,count,evidence_url,created_at) VALUES(?,?,?,?,?)')
              .run(id,stage,amount,evidence,at);
            return json(res,201,{campaign_id:id,stage,count:amount,evidence_url:evidence,created_at:at,provenance:'organizer-declaration',notice});
          }
        }
        if(req.method==='PATCH'&&!sub){
          owner(db,id,req);
          const b=await load(req),expected=b.expected_revision;
          if(!Number.isSafeInteger(expected)||expected<1)fail('Révision attendue obligatoire');
          if(expected!==camp.revision)fail('Conflit de révision : rechargez la campagne',409);
          const fields=['title','goal','description','status'];
          if(Object.keys(b).some(k=>k!=='expected_revision'&&!fields.includes(k)))fail('Champ de modification inconnu');
          if(!fields.some(k=>Object.hasOwn(b,k)))fail('Aucune modification');
          const title=Object.hasOwn(b,'title')?requireText(b.title,120):camp.title;
          const goal=Object.hasOwn(b,'goal')?short(b.goal,1200):camp.goal;
          const description=Object.hasOwn(b,'description')?short(b.description,3000):camp.description;
          let status=camp.status;
          if(Object.hasOwn(b,'status')){
            if(!((camp.status==='active'&&['paused','closed'].includes(b.status))||
                 (camp.status==='paused'&&['active','closed'].includes(b.status))))
              fail('Transition d’état interdite; une campagne brouillon s’active séparément');
            status=b.status;
          }
          const t=now();
          const result=db.prepare('UPDATE campaigns SET title=?,goal=?,description=?,status=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?')
            .run(title,goal,description,status,t,id,expected);
          if(result.changes!==1)fail('Conflit de révision',409);
          return json(res,200,{id,title,goal,description,status,revision:expected+1,updated_at:t});
        }
        if(req.method==='POST'&&sub==='activate'){
          owner(db,id,req);
          if(camp.status!=='draft')fail('Cette campagne n’est plus en brouillon',409);
          db.prepare('UPDATE campaigns SET status=?,revision=revision+1,updated_at=? WHERE id=?').run('active',now(),id);
          return json(res,200,{id,status:'active',revision:camp.revision+1});
        }
        if(req.method==='GET'&&sub==='contributions'){
          owner(db,id,req);
          return json(res,200,{contributions:db.prepare('SELECT contributions.* FROM contributions JOIN copies ON copies.id=contributions.copy_id WHERE copies.campaign_id=? ORDER BY contributions.created_at DESC LIMIT 200').all(id)});
        }
      }
      if(req.method==='POST'&&p===ROOT+'/api/missions'){
        const b=await load(req);if(!textId(b.campaign_id))fail('Identifiant invalide');
        owner(db,b.campaign_id,req);
        if(db.prepare('SELECT status FROM campaigns WHERE id=?').get(b.campaign_id)?.status==='closed')fail('Campagne clôturée',409);
        const id=randomUUID(),t=now(),title=requireText(b.title,140),desc=short(b.description,1200);
        db.prepare('INSERT INTO missions VALUES(?,?,?,?,?)').run(id,b.campaign_id,title,desc,t);
        return json(res,201,{id,campaign_id:b.campaign_id,title,description:desc});
      }
      if(req.method==='GET'&&p===ROOT+'/api/references/parse'){
        const parsed=parseCopyReference(u.searchParams.get('ref')||'');
        const stored=db.prepare('SELECT '+colCopy+' FROM copies WHERE id=?').get(parsed.copy_id);
        if(!stored || stored.campaign_id!==parsed.campaign_id || stored.three_code!==parsed.three_code)
          fail('Référence non résolue dans ce registrar',404);
        if(stored.status==='revoked')fail('Cette référence a été révoquée',410);
        return json(res,200,{...parsed,resolution_scope:'local-only',copy_url:ROOT+'/e/'+stored.id,
          notice:'Référence publique, sans preuve d’identité, de possession, de mandat ou de soutien.'});
      }
      if(req.method==='GET'&&p===ROOT+'/api/resolve'){
        const value=code(u.searchParams.get('code')||'');
        const rows=db.prepare("SELECT "+colCopy+" FROM copies WHERE three_code=? AND status!='revoked' ORDER BY created_at DESC LIMIT 100").all(value);
        const registrations=resolvedRegistrations(db,value);
        const verifiedCopyIds=new Map(registrations.filter(x=>x.copy_id).map(x=>[x.copy_id,x.id]));
        const results=rows.map(x=>({...x,
          registration_status:verifiedCopyIds.has(x.id)?'mail_received':'unverified_declaration',
          registry_record_id:verifiedCopyIds.get(x.id)||null,
          registrar_id:verifiedCopyIds.has(x.id)?PILOT_REGISTRAR_ID:null
        }));
        return json(res,200,{code:value,registrar_id:PILOT_REGISTRAR_ID,
          resolution_scope:'local-only',federation_enabled:false,
          ambiguous:results.length+registrations.filter(x=>!x.copy_id).length>1,
          results,registrations:registrations.filter(x=>!x.copy_id),
          more_possible:rows.length===100||registrations.length===100,
          notice:'Pilote limité aux Bouteilles à la Mer. Les exemplaires sont déclaratifs; « courriel reçu » prouve seulement un contact, pas une identité ni une propriété. Un résultat local n’est pas une recherche fédérée.'});
      }
      if(req.method==='POST'&&p===ROOT+'/api/copies'){
        return json(res,201,createCopy(db,await load(req),req));
      }
      const copyMatch=p.match(/^\/3code\/api\/copies\/([a-f0-9-]{36})$/);
      if(copyMatch){
        const row=db.prepare('SELECT '+colCopy+' FROM copies WHERE id=?').get(copyMatch[1]);
        if(!row)fail('Exemplaire inconnu',404);
        if(row.status==='revoked')fail('Cet exemplaire a été révoqué',410);
        if(req.method==='PATCH'){
          const privateRow=db.prepare('SELECT edit_hash FROM copies WHERE id=?').get(row.id);
          const hasCopyAuthority=authorize(req.headers['x-copy-edit-token'],privateRow.edit_hash);
          if(!hasCopyAuthority)owner(db,row.campaign_id,req);
          const b=await load(req),expected=b.expected_revision;
          if(!Number.isSafeInteger(expected)||expected<1)fail('Révision attendue obligatoire');
          if(expected!==row.revision)fail('Conflit de révision : rechargez l’exemplaire',409);
          if(Object.keys(b).some(k=>!['expected_revision','title','status'].includes(k)))fail('Champ inconnu');
          if(!Object.hasOwn(b,'title')&&!Object.hasOwn(b,'status'))fail('Aucune modification');
          const title=Object.hasOwn(b,'title')?requireText(b.title,160):row.title;
          const status=Object.hasOwn(b,'status')?b.status:'declared';
          if(!['declared','revoked'].includes(status))fail('Statut invalide');
          if(status==='revoked'&&Object.hasOwn(b,'title'))fail('Révocation et édition séparées');
          const kind=status==='revoked'?'REVOKED':'UPDATED';
          db.exec('BEGIN IMMEDIATE');
          try{
            const at=now();
            const updated=db.prepare('UPDATE copies SET title=?,status=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?')
              .run(title,status,at,row.id,expected);
            if(updated.changes!==1)fail('Conflit de révision',409);
            db.prepare('INSERT INTO events VALUES(?,?,?,?,?)').run(randomUUID(),row.id,kind,JSON.stringify({revision:expected+1,method:hasCopyAuthority?'copy-key':'campaign-manager'}),at);
            db.exec('COMMIT');
            return json(res,200,{id:row.id,title,status,revision:expected+1,updated_at:at});
          }catch(e){db.exec('ROLLBACK');throw e;}
        }
        if(req.method==='GET')return json(res,200,{copy:{...row,reference:formatCopyReference({...row,copy_id:row.id})},contributions:db.prepare('SELECT id,message,created_at FROM contributions WHERE copy_id=? AND status=? ORDER BY created_at LIMIT 100').all(row.id,'accepted'),events:db.prepare('SELECT kind,created_at FROM events WHERE copy_id=? ORDER BY created_at').all(row.id)});
      }
      if(req.method==='POST'&&p===ROOT+'/api/contributions'){
        const b=await load(req),copy=db.prepare('SELECT copies.id,copies.status,campaigns.status AS campaign_status FROM copies JOIN campaigns ON campaigns.id=copies.campaign_id WHERE copies.id=?').get(b.copy_id);
        if(!copy||copy.status==='revoked')fail('Exemplaire inconnu ou révoqué',404);
        if(copy.campaign_status!=='active')fail('Campagne fermée aux nouvelles contributions',409);
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
      const pub={
        '/3code/app.js':['public/app.js','text/javascript; charset=utf-8'],
        '/3code/marche.js':['public/marche.js','text/javascript; charset=utf-8'],
        '/3code/guide.js':['public/guide.js','text/javascript; charset=utf-8'],
        '/3code/assistant.fr.txt':['public/assistant.fr.txt','text/plain; charset=utf-8'],
        '/3code/service.json':['public/service.json','application/json; charset=utf-8'],
        '/3code/style.css':['public/style.css','text/css; charset=utf-8']
      };
      const entry=pub[p]||(req.method==='GET'&&p===ROOT+'/guide'?['public/guide.html','text/html; charset=utf-8']:null)||
        (req.method==='GET'&&(p===ROOT+'/marche-du-soleil'||p===ROOT+'/marche-du-soleil/'||p===ROOT+'/marche-du-soleil/mode-emploi'||p===ROOT+'/marche-du-soleil/tract')?['public/marche.html','text/html; charset=utf-8']:null)||(req.method==='GET'&&(p===ROOT||p===ROOT+'/'||p===ROOT+'/print'||p.startsWith(ROOT+'/e/')||p.startsWith(ROOT+'/campaign/'))?['public/index.html','text/html; charset=utf-8']:null);
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
if(process.argv[1]&&realpathSync(fileURLToPath(import.meta.url))===realpathSync(process.argv[1])) {
  const port=Number(process.env.PORT||8879),host=process.env.HOST||'127.0.0.1';
  makeServer().listen(port,host,()=>process.stdout.write('contributive-service listening '+host+':'+port+'\n'));
}
export {code,generate};
