// Proof-of-inbound-email association, independent from 3Code generation and
// physical-copy declarations. Do not confuse receipt with civil identity.
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const sha = s => createHash('sha256').update(String(s)).digest('hex');
const stamp = () => new Date().toISOString();
const sevenDays = 7 * 24 * 60 * 60 * 1000;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const problem = (message,status=400) => Object.assign(new Error(message),{status});

export function validateInbox(raw='') {
  const s=String(raw||'').trim().toLowerCase();
  if(!s)return '';
  if(!EMAIL.test(s)||s.length>254)throw problem('Adresse de réception non valide');
  return s;
}
export function initRegistrations(db) {
  db.exec([
    'CREATE TABLE IF NOT EXISTS three_code_registrations(id TEXT PRIMARY KEY,three_code TEXT NOT NULL,copy_id TEXT REFERENCES copies(id),title TEXT NOT NULL,status TEXT NOT NULL,challenge_digest TEXT NOT NULL,view_digest TEXT NOT NULL,sender_digest TEXT,message_digest TEXT,created_at TEXT NOT NULL,expires_at TEXT NOT NULL,confirmed_at TEXT)',
    'CREATE INDEX IF NOT EXISTS code_registration_lookup ON three_code_registrations(three_code,status)',
    'CREATE UNIQUE INDEX IF NOT EXISTS code_registration_mail ON three_code_registrations(message_digest) WHERE message_digest IS NOT NULL'
  ].join(';')+';');
}
export function createRegistration(db,{three_code,copy_id=null,title='',edit_token='',inbox=''}) {
  if(!inbox)throw problem('Boîte de réception non configurée : enregistrement différé',503);
  if(copy_id!==null) {
    if(!uuid.test(copy_id))throw problem('Identifiant de copie invalide');
    const target=db.prepare('SELECT three_code,edit_hash,title FROM copies WHERE id=?').get(copy_id);
    if(!target)throw problem('Exemplaire inexistant',404);
    if(target.three_code!==three_code)throw problem('3Code différent de celui de cet exemplaire');
    const provided=sha(edit_token);
    const a=Buffer.from(provided,'utf8'),b=Buffer.from(target.edit_hash,'utf8');
    if(!edit_token||a.length!==b.length||!timingSafeEqual(a,b))throw problem('Clé de gestion de cet exemplaire nécessaire',403);
    title=target.title;
  } else {
    title=String(title||'').trim().slice(0,160);
    if(title.length<2)throw problem('Décrivez la référence à enregistrer');
  }
  const id=randomUUID();
  const challenge=randomBytes(20).toString('hex').toUpperCase();
  const view=randomBytes(24).toString('base64url');
  const subject='KYS3 '+id+' '+challenge;
  const now=stamp(), expires=new Date(Date.now()+sevenDays).toISOString();
  db.prepare('INSERT INTO three_code_registrations(id,three_code,copy_id,title,status,challenge_digest,view_digest,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)')
    .run(id,three_code,copy_id,title,'awaiting_email',sha(challenge),sha(view),now,expires);
  return {
    id,three_code,copy_id,status:'awaiting_email',
    expires_at:expires,view_token:view,
    email_instruction:'Envoyez vous-même un courriel à la boîte indiquée, avec cet objet exact. Aucune réponse automatique ne sera envoyée.',
    email_to:inbox,email_subject:subject,
    mailto:'mailto:'+inbox+'?subject='+encodeURIComponent(subject),
    proof:'Preuve de réception d’un message, ni preuve d’identité civile ni de propriété.'
  };
}
export function getRegistration(db,id,viewToken) {
  if(!uuid.test(String(id||'')))throw problem('Référence invalide');
  const x=db.prepare('SELECT id,three_code,copy_id,title,status,view_digest,created_at,expires_at,confirmed_at FROM three_code_registrations WHERE id=?').get(id);
  if(!x)throw problem('Demande inconnue',404);
  if(typeof viewToken!=='string'||viewToken.length<20)throw problem('Jeton de consultation requis',403);
  const a=Buffer.from(sha(viewToken),'utf8'),b=Buffer.from(x.view_digest,'utf8');
  if(!timingSafeEqual(a,b))throw problem('Jeton de consultation invalide',403);
  const status=x.status==='awaiting_email'&&x.expires_at<=stamp()?'expired':x.status;
  return {id:x.id,three_code:x.three_code,copy_id:x.copy_id,title:x.title,status,created_at:x.created_at,expires_at:x.expires_at,confirmed_at:x.confirmed_at};
}
function senderAddress(s) {
  if(typeof s!=='string')throw problem('Expéditeur absent');
  const raw=s.trim().toLowerCase();
  const bracket=raw.match(/<([^<>]+)>$/);
  const address=bracket?bracket[1]:raw;
  if(!EMAIL.test(address)||address.length>254)throw problem('Expéditeur invalide');
  return address;
}
/**
 * Local trusted mailbox adapter only. Never bind this function to a public
 * /api endpoint: a caller-supplied From header is not proof of email receipt.
 * Source UID must come from the receiving mailbox provider, not the claimant.
 */
export function receiveRegistrationEmail(db,{from,subject,provider_uid,mailbox,expected_inbox,received_by}) {
  if(received_by!=='trusted-mailbox-adapter')throw problem('Import réservé à un adaptateur de boîte authentifié',403);
  const inbox=validateInbox(expected_inbox);
  if(!inbox||validateInbox(mailbox)!==inbox)throw problem('Boîte destinataire non conforme',403);
  const address=senderAddress(from);
  const match=String(subject||'').trim().match(/^KYS3 ([0-9a-f-]{36}) ([0-9A-F]{40})$/);
  if(!match||!uuid.test(match[1]))throw problem('Objet de courriel incorrect');
  if(typeof provider_uid!=='string'||provider_uid.length<5||provider_uid.length>250)throw problem('UID de réception manquant');
  const id=match[1],proof=match[2];
  const row=db.prepare('SELECT id,three_code,status,challenge_digest,expires_at,message_digest FROM three_code_registrations WHERE id=?').get(id);
  if(!row)throw problem('Demande inexistante',404);
  const proofA=Buffer.from(sha(proof),'utf8'),proofB=Buffer.from(row.challenge_digest,'utf8');
  if(!timingSafeEqual(proofA,proofB))throw problem('Challenge incorrect',403);
  const uidDigest=sha(inbox+'\n'+provider_uid);
  if(row.status==='mail_received'&&row.message_digest===uidDigest)return {id,status:'mail_received',already_processed:true};
  if(row.status!=='awaiting_email')throw problem('Demande déjà traitée',409);
  if(row.expires_at<=stamp())throw problem('Demande expirée',410);
  const contactDigest=sha(id+'\n'+address);
  try {
    db.prepare('UPDATE three_code_registrations SET status=?,sender_digest=?,message_digest=?,confirmed_at=? WHERE id=? AND status=?')
      .run('mail_received',contactDigest,uidDigest,stamp(),id,'awaiting_email');
  } catch(e) {
    if(String(e.message).includes('UNIQUE constraint'))throw problem('Ce message a déjà servi à enregistrer un code',409);
    throw e;
  }
  return {id,status:'mail_received',already_processed:false,notice:'Un courriel a été effectivement observé dans la boîte configurée. Identité et propriété non vérifiées.'};
}
export function resolvedRegistrations(db,threeCode) {
  return db.prepare("SELECT id,three_code,copy_id,title,confirmed_at FROM three_code_registrations WHERE three_code=? AND status='mail_received' ORDER BY confirmed_at DESC LIMIT 100").all(threeCode);
}
export function openRegistrationDB(dbPath) {
  const db=new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;');
  return db;
}
