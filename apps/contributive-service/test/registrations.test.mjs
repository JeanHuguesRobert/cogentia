import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {makeServer,generate} from '../server.mjs';
import {openRegistrationDB,receiveRegistrationEmail} from '../registrations.mjs';

const inbox='registration@example.org';
let path,dir,server,base,pilotCampaign;
before(async()=>{
  dir=mkdtempSync(join(tmpdir(),'kys-mail-proof-'));path=join(dir,'db.sqlite');
  server=makeServer({dbPath:path,mailInbox:inbox});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  base='http://127.0.0.1:'+server.address().port+'/3code';
  const created=await req('/campaigns',{title:'Pilote Bouteilles à la Mer',goal:'Exemplaires singuliers'});
  assert.equal(created.status,201);
  pilotCampaign=created.body.id;
  await req('/campaigns/'+pilotCampaign+'/activate',{}, {'x-management-token':created.body.management_token});
});
after(async()=>{
  if(server)await new Promise(resolve=>server.close(resolve));
  if(dir)rmSync(dir,{recursive:true,force:true});
});
async function req(route,payload,header={}){
  const method=payload===undefined?'GET':'POST';
  const r=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json',...header},...(method==='POST'?{body:JSON.stringify(payload)}:{})});
  return {status:r.status,body:await r.json()};
}
async function prepareForCopy(title,threeCode=generate()){
  const c=await req('/copies',{campaign_id:pilotCampaign,title,three_code:threeCode});
  assert.equal(c.status,201);
  const r=await req('/registrations',{
    three_code:threeCode,copy_id:c.body.id,edit_token:c.body.edit_token,
    pilot_acknowledged:true
  });
  return {copy:c.body,registration:r};
}
function importProof(proof,uid,from='A Contributor <contributor@example.net>') {
  const db=openRegistrationDB(path);
  try{return receiveRegistrationEmail(db,{
    from,subject:proof.email_subject,provider_uid:uid,mailbox:inbox,
    expected_inbox:inbox,received_by:'trusted-mailbox-adapter'
  });}finally{db.close();}
}
test('public guide and assistant have no account / no conversation import',async()=>{
  let r=await fetch(base+'/guide');assert.equal(r.status,200);
  let body=await r.text();assert.match(body,/dialogue à trois/);assert.match(body,/assistant/);
  r=await fetch(base+'/assistant.fr.txt');assert.equal(r.status,200);
  body=await r.text();assert.match(body,/sans agir à ma place/);assert.match(body,/Ne partagez pas ma mémoire/);
  r=await fetch(base+'/service.json');assert.equal(r.status,200);
  const man=await r.json();assert.equal(man.data_policy.original_ai_conversation_transmitted,false);
  assert.equal(man.data_policy.automatic_sending_of_email,false);
  assert.equal(man.pilot_scope,'bottle-at-sea/v1');
  assert.equal(man.pilot_registration_rules.general_url_registration,false);
  assert.equal(man.pilot_registration_rules.federation_and_record_transfer_implemented,false);
});
test('registration configuration never implies an actual received email',async()=>{
  const r=await req('/registrations/config');
  assert.equal(r.status,200);assert.equal(r.body.enabled,true);assert.equal(r.body.inbox,inbox);
  assert.equal(r.body.scope,'bottle-at-sea/v1');
  assert.equal(r.body.requires_copy_id,true);
  assert.equal(r.body.registrar_id,'urn:3code:registrar:corsica:1');
});
let standalone,standaloneCode;
test('prepare email proof, pending; public cannot forge confirmation',async()=>{
  standaloneCode=generate();
  const created=await prepareForCopy('Tract technique synthétique',standaloneCode);
  let r=created.registration;
  assert.equal(r.status,201);standalone=r.body;
  assert.equal(standalone.registrar_id,'urn:3code:registrar:corsica:1');
  assert.equal(standalone.scope,'bottle-at-sea/v1');
  assert.equal(standalone.copy_id,created.copy.id);
  assert.equal(standalone.status,'awaiting_email');
  assert.match(standalone.email_subject,/^3Code [0-9a-f-]{36} [0-9A-F]{40}$/);
  assert.equal(standalone.email_to,inbox);
  assert.equal(standalone.mailto.startsWith('mailto:'),true);
  r=await req('/registrations/'+standalone.id,undefined,{'x-registration-view':standalone.view_token});
  assert.equal(r.body.status,'awaiting_email');
  r=await req('/registrations/'+standalone.id,undefined,{'x-registration-view':'not-a-token'});
  assert.equal(r.status,403);
  r=await req('/registrations/'+standalone.id+'/confirm',{from:'attacker@example.org',subject:standalone.email_subject});
  assert.equal(r.status,404);
  r=await req('/resolve?code='+encodeURIComponent(standaloneCode));
  assert.equal(r.body.registrations.length,0);
});
test('pilot rejects free URL associations, missing consent and wrong controller',async()=>{
  const alone=await req('/registrations',{
    three_code:generate(),title:'URL générique',url:'https://example.org',
    pilot_acknowledged:true
  });
  assert.equal(alone.status,422);
  const c=await req('/copies',{campaign_id:pilotCampaign,title:'Exemplaire contrôlé',three_code:generate()});
  assert.equal(c.status,201);
  let r=await req('/registrations',{three_code:c.body.three_code,copy_id:c.body.id,edit_token:c.body.edit_token});
  assert.equal(r.status,422);
  r=await req('/registrations',{three_code:generate(),copy_id:c.body.id,edit_token:c.body.edit_token,pilot_acknowledged:true});
  assert.equal(r.status,400);
  r=await req('/registrations',{three_code:c.body.three_code,copy_id:c.body.id,edit_token:'wrong',pilot_acknowledged:true});
  assert.equal(r.status,403);
});
test('only exact 3Code subject prefix is accepted, with no legacy alias',()=>{
  const db=openRegistrationDB(path);
  const input={from:'contributor@example.net',provider_uid:'mailbox-uid-old-format',
    mailbox:inbox,expected_inbox:inbox,received_by:'trusted-mailbox-adapter'};
  try{
    assert.throws(()=>receiveRegistrationEmail(db,{...input,
      subject:standalone.email_subject.replace(/^3Code /,'KYS3 ')}),/Objet de courriel incorrect/);
    assert.throws(()=>receiveRegistrationEmail(db,{...input,
      subject:standalone.email_subject.replace(/^3Code /,'3code ')}),/Objet de courriel incorrect/);
  }finally{db.close();}
});

test('inbound proof import checks mailbox source, subject, UID, expiry and idempotence',async()=>{
  const db=openRegistrationDB(path);
  try {
    assert.throws(()=>receiveRegistrationEmail(db,{
      from:'attacker@example.org',subject:standalone.email_subject,provider_uid:'mailbox-uid-1000',
      mailbox:inbox,expected_inbox:inbox,received_by:'public-http'
    }),/adaptateur/);
    assert.throws(()=>receiveRegistrationEmail(db,{
      from:'attacker@example.org',subject:standalone.email_subject,provider_uid:'mailbox-uid-1000',
      mailbox:'wrong@example.org',expected_inbox:inbox,received_by:'trusted-mailbox-adapter'
    }),/Boîte destinataire/);
    assert.throws(()=>receiveRegistrationEmail(db,{
      from:'attacker@example.org',subject:standalone.email_subject.slice(0,-1)+(standalone.email_subject.endsWith('A')?'B':'A'),provider_uid:'mailbox-uid-1000',
      mailbox:inbox,expected_inbox:inbox,received_by:'trusted-mailbox-adapter'
    }),/Challenge incorrect/);
  } finally{db.close();}
  let proof=importProof(standalone,'mailbox-uid-1000');
  assert.equal(proof.status,'mail_received');
  proof=importProof(standalone,'mailbox-uid-1000');
  assert.equal(proof.already_processed,true);
  assert.throws(()=>importProof(standalone,'mailbox-uid-1001'),/déjà traitée/);
  let r=await req('/registrations/'+standalone.id,undefined,{'x-registration-view':standalone.view_token});
  assert.equal(r.body.status,'mail_received');
  r=await req('/resolve?code='+standaloneCode);
  assert.equal(r.body.registrations.length,0);
  assert.equal(r.body.results[0].title,'Tract technique synthétique');
  assert.equal(r.body.results[0].registration_status,'mail_received');
  const line=JSON.stringify(r.body);
  assert.ok(!line.includes('contributor@example.net'));
  assert.ok(!line.includes('mailbox-uid-1000'));
  const db2=openRegistrationDB(path);
  try{
    const v=db2.prepare('SELECT sender_digest,message_digest FROM three_code_registrations WHERE id=?').get(standalone.id);
    assert.match(v.sender_digest,/^[0-9a-f]{64}$/);
    assert.match(v.message_digest,/^[0-9a-f]{64}$/);
  }finally{db2.close();}
});
test('local registration journal keeps scope, registrar and revision chain',async()=>{
  const db=openRegistrationDB(path);
  try{
    const packets=db.prepare('SELECT revision,packet_json,packet_digest FROM registration_journal WHERE record_id=? ORDER BY revision').all(standalone.id);
    assert.equal(packets.length,2);
    const first=JSON.parse(packets[0].packet_json),second=JSON.parse(packets[1].packet_json);
    assert.equal(first.operation,'registration_requested');
    assert.equal(first.scope,'bottle-at-sea/v1');
    assert.equal(first.registrar_id,'urn:3code:registrar:corsica:1');
    assert.equal(first.controller_method,'copy-edit-key/v1');
    assert.equal(first.revision,1);
    assert.equal(second.operation,'inbound_email_observed');
    assert.equal(second.revision,2);
    assert.equal(second.previous_digest,packets[0].packet_digest);
    assert.ok(!packets[1].packet_json.includes('contributor@example.net'));
    assert.ok(!packets[1].packet_json.includes('mailbox-uid-1000'));
  }finally{db.close();}
  const x=await req('/registrations/'+standalone.id,undefined,{'x-registration-view':standalone.view_token});
  assert.equal(x.body.revision,2);
  assert.equal(x.body.policy,'bottle-at-sea-registration/v1');
  assert.equal(x.body.receipt.events.length,2);
  assert.equal(x.body.receipt.independently_verified,false);
  assert.equal(x.body.receipt.events[1].previous_digest,x.body.receipt.events[0].event_digest);
  assert.ok(!JSON.stringify(x.body).includes('contributor@example.net'));
});
test('collision is resolved without false uniqueness',async()=>{
  const second=await prepareForCopy('Deuxième association indépendante',standaloneCode);
  const r=second.registration;
  assert.equal(r.status,201);
  importProof(r.body,'mailbox-uid-1002','other@example.net');
  const resolved=await req('/resolve?code='+standaloneCode);
  assert.equal(resolved.body.registrations.length,0);
  assert.equal(resolved.body.results.length,2);
  assert.ok(resolved.body.results.every(x=>x.registration_status==='mail_received'));
  assert.equal(resolved.body.ambiguous,true);
  assert.equal(resolved.body.resolution_scope,'local-only');
  assert.equal(resolved.body.federation_enabled,false);
  const check=await req('/registrations/'+r.body.id,undefined,{'x-registration-view':r.body.view_token});
  assert.equal(check.body.status,'mail_received');
});
test('an incoming email can confirm a copy only with its edit secret',async()=>{
  let a=await req('/campaigns',{title:'TEST - bibliographie',goal:'Test de mécanisme'});
  const secret=a.body.management_token;
  const campaign=a.body.id;
  await req('/campaigns/'+campaign+'/activate',{}, {'x-management-token':secret});
  const c=await req('/copies',{campaign_id:campaign,title:'Copie test',three_code:generate()});
  assert.equal(c.status,201);
  let r=await req('/registrations',{three_code:c.body.three_code,copy_id:c.body.id,pilot_acknowledged:true});
  assert.equal(r.status,403);
  r=await req('/registrations',{three_code:c.body.three_code,copy_id:c.body.id,edit_token:c.body.edit_token,pilot_acknowledged:true});
  assert.equal(r.status,201);
  importProof(r.body,'mailbox-uid-copy1');
  const res=await req('/resolve?code='+c.body.three_code);
  assert.equal(res.body.results[0].registration_status,'mail_received');
  assert.equal(res.body.results[0].registry_record_id,r.body.id);
});
test('trusted local email CLI imports a synthetic provider receipt',async()=>{
  const created=await prepareForCopy('Import local CLI');
  const r=created.registration;
  assert.equal(r.status,201);
  const script=fileURLToPath(new URL('../mail-receive.mjs',import.meta.url));
  const args=['--db',path,'--mailbox',inbox,'--from','contributor@example.net',
    '--subject',r.body.email_subject,'--provider-uid','trusted-message-cli-uid-0202'];
  let proc=spawnSync(process.execPath,[script,...args],{encoding:'utf8',
    env:{...process.env,CAMPAIGNS_INBOX:inbox}});
  assert.equal(proc.status,0,proc.stderr);
  assert.equal(JSON.parse(proc.stdout).status,'mail_received');
  proc=spawnSync(process.execPath,[script,...args],{encoding:'utf8',
    env:{...process.env,CAMPAIGNS_INBOX:inbox}});
  assert.equal(proc.status,0,proc.stderr);
  assert.equal(JSON.parse(proc.stdout).already_processed,true);
  proc=spawnSync(process.execPath,[script,...args],{encoding:'utf8',
    env:{...process.env,CAMPAIGNS_INBOX:''}});
  assert.equal(proc.status,2);
  const view=await req('/registrations/'+r.body.id,undefined,
    {'x-registration-view':r.body.view_token});
  assert.equal(view.body.status,'mail_received');
});
test('expired mail proof remains unregistered',async()=>{
  const created=await prepareForCopy('Challenge expiré');
  const r=created.registration;
  const db=openRegistrationDB(path);
  try{
    db.prepare('UPDATE three_code_registrations SET expires_at=? WHERE id=?').run('2020-01-01T00:00:00.000Z',r.body.id);
  }finally{db.close();}
  assert.throws(()=>importProof(r.body,'mailbox-uid-expired'),/expirée/);
  const status=await req('/registrations/'+r.body.id,undefined,{'x-registration-view':r.body.view_token});
  assert.equal(status.body.status,'expired');
});
test('no configured mailbox: registration refused, generation remains free',async()=>{
  const temp=mkdtempSync(join(tmpdir(),'kys-no-inbox-'));
  const srv=makeServer({dbPath:join(temp,'db.sqlite'),mailInbox:''});
  await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
  const addr='http://127.0.0.1:'+srv.address().port+'/3code/api';
  try{
    let r=await fetch(addr+'/registrations/config');const cfg=await r.json();
    assert.equal(cfg.enabled,false);assert.equal(cfg.inbox,null);
    r=await fetch(addr+'/campaigns',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'ESSAI',goal:'Pilot'})});
    const camp=await r.json();
    const sourceCode=generate();
    r=await fetch(addr+'/copies',{method:'POST',headers:{'Content-Type':'application/json','x-management-token':camp.management_token},
      body:JSON.stringify({campaign_id:camp.id,three_code:sourceCode,title:'Exemplaire sans boîte'})});
    const copy=await r.json();assert.equal(r.status,201);
    r=await fetch(addr+'/registrations',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({three_code:sourceCode,copy_id:copy.id,edit_token:copy.edit_token,pilot_acknowledged:true})});
    assert.equal(r.status,503);
    r=await fetch(addr+'/generate');assert.equal(r.status,200);
  }finally{
    await new Promise(resolve=>srv.close(resolve));rmSync(temp,{recursive:true,force:true});
  }
});
