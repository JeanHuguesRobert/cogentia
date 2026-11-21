// Shared, non-partisan 3Code campaign for the Marche du Soleil.
// Candidate selection is informational, not a declaration of investiture.
// Never interpret a citizen scan, a copied tract or an email as an official sponsorship.
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE=dirname(fileURLToPath(import.meta.url));
const CATALOG=JSON.parse(readFileSync(join(HERE,'marche-candidates.json'),'utf8'));
const UUID='819e514d-5ca5-4648-992c-714f3e1181cf';
const TITLE='La Marche du Soleil — initiative commune';
const GOAL='Faciliter la participation volontaire des citoyens à la recherche des présentations nécessaires aux candidatures présidentielles, dans le cadre des règles existantes.';
const DESCRIPTION='Chaque personne choisit librement une candidature. Les documents, courriels et démarches restent distincts des présentations officielles des élus. Initiative ouverte, sans soutien implicite de la part des candidats répertoriés.';
const sorted=Object.freeze([...CATALOG.candidates].sort((a,b)=>a.name.localeCompare(b.name,'fr',{sensitivity:'base'})));
const ids=new Set(sorted.map(c=>c.id));
if(ids.size!==sorted.length)throw Error('Duplicated Marche candidate ids');
for(const c of sorted){
  if(!/^[a-z0-9-]{4,90}$/.test(c.id)||typeof c.name!=='string'||!c.name.trim()||!c.movement)throw Error('Bad Marche candidate record');
  for(const prop of ['site','x']){
    if(c[prop]&&!/^https:\/\/[a-z0-9.-]+(?:\/|$)/i.test(c[prop]))throw Error('External link must be an HTTPS URL');
  }
}
const stamp=()=>new Date().toISOString();
const sha=s=>createHash('sha256').update(s).digest('hex');
export const marcheCampaignId=UUID;
export const marcheCandidates=sorted;
export const marcheVersion=CATALOG.version;
export const marcheSources=CATALOG.sources;
export function candidateFor(id){return sorted.find(c=>c.id===id)||null;}
export function ensureMarche(db,dbPath){
  // The separate key is local-only, owner-readable and never sent to browsers.
  // If an existing campaign lacks its original key, do not silently replace it.
  const keyPath=join(dirname(dbPath),'marche-management-token.txt');
  let key;
  if(existsSync(keyPath))key=readFileSync(keyPath,'utf8').trim();
  else if(!db.prepare('SELECT id FROM campaigns WHERE id=?').get(UUID)){
    key=randomBytes(32).toString('base64url');
    writeFileSync(keyPath,key+'\n',{flag:'wx',mode:0o600});
    chmodSync(keyPath,0o600);
  }
  const current=db.prepare('SELECT secret_hash FROM campaigns WHERE id=?').get(UUID);
  if(current && key && sha(key)!==current.secret_hash)throw Error('Marche management key does not match persisted campaign');
  if(!current && !key)throw Error('Marche campaign key is missing');
  db.exec('BEGIN IMMEDIATE');
  try{
    db.prepare('INSERT OR IGNORE INTO campaigns(id,title,goal,status,secret_hash,created_at,description,revision,updated_at) VALUES(?,?,?,?,?,?,?,?,?)')
      .run(UUID,TITLE,GOAL,'active',sha(key||''),stamp(),DESCRIPTION,1,stamp());
    db.exec('CREATE TABLE IF NOT EXISTS marche_candidates (candidate_id TEXT PRIMARY KEY,mission_id TEXT NOT NULL UNIQUE REFERENCES missions(id))');
    const statement=db.prepare('INSERT OR IGNORE INTO missions (id,campaign_id,title,description,created_at) VALUES(?,?,?,?,?)');
    const bind=db.prepare('INSERT OR IGNORE INTO marche_candidates (candidate_id,mission_id) VALUES(?,?)');
    const find=db.prepare('SELECT mission_id FROM marche_candidates WHERE candidate_id=?');
    for(const c of sorted){
      if(find.get(c.id))continue;
      const missionId=randomUUID();
      statement.run(missionId,UUID,'Candidature : '+c.name,'Démarches citoyennes de recherche de présentations pour '+c.name+'.',stamp());
      bind.run(c.id,missionId);
    }
    db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
}
export function missionForCandidate(db,candidateId){
  if(!candidateFor(candidateId))return null;
  return db.prepare('SELECT mission_id FROM marche_candidates WHERE candidate_id=?').get(candidateId)?.mission_id||null;
}
export function candidateForMission(db,missionId){
  const x=db.prepare('SELECT candidate_id FROM marche_candidates WHERE mission_id=?').get(missionId);
  return x?candidateFor(x.candidate_id):null;
}
