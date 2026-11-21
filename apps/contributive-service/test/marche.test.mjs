import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {makeServer} from '../server.mjs';
import {marcheCampaignId,marcheCandidates} from '../marche.mjs';

let dir,server,base,dbPath;
before(async()=>{
  dir=mkdtempSync(join(tmpdir(),'3code-marche-'));
  dbPath=join(dir,'campaigns.sqlite');
  server=makeServer({dbPath,mailInbox:'3code@acorsica.org'});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  base='http://127.0.0.1:'+server.address().port+'/3code';
});
after(async()=>{
  if(server)await new Promise(resolve=>server.close(resolve));
  if(dir)rmSync(dir,{recursive:true,force:true});
});
async function request(path,method='GET',body,headers={}){
  const response=await fetch(base+path,{method,headers:{...(body===undefined?{}:{'content-type':'application/json'}),...headers},
    ...(body===undefined?{}:{body:JSON.stringify(body)})});
  let data;
  try{data=await response.json();}catch{data=null;}
  return {status:response.status,body:data};
}
test('catalog is alphabetical, open to candidates, with HTTPS links and no credentials',async()=>{
  const {status,body}=await request('/api/marche');
  assert.equal(status,200);
  assert.equal(body.campaign_id,marcheCampaignId);
  assert.ok(body.candidates.length>=30);
  const ordered=[...body.candidates].sort((a,b)=>a.name.localeCompare(b.name,'fr',{sensitivity:'base'}));
  assert.deepEqual(body.candidates.map(c=>c.id),ordered.map(c=>c.id));
  assert.deepEqual(marcheCandidates.map(c=>c.id),ordered.map(c=>c.id));
  assert.ok(body.candidates.some(c=>c.id==='baron-mariani'));
  assert.ok(body.candidates.some(c=>c.id==='clara-egger'&&c.site));
  assert.ok(body.candidates.some(c=>c.id==='selma-labib'&&c.x));
  assert.ok(body.candidates.some(c=>!c.site&&!c.x));
  for(const c of body.candidates)for(const key of ['site','x'])if(c[key])assert.ok(c[key].startsWith('https://'));
  assert.equal('management_token' in body,false);
  const campaigns=await request('/api/campaigns');
  assert.equal(campaigns.status,200);
  assert.equal(campaigns.body.campaigns.filter(c=>c.id===marcheCampaignId).length,1);
  const secret=readFileSync(join(dir,'marche-management-token.txt'),'utf8').trim();
  assert.ok(secret.length>=30);
  assert.equal(statSync(join(dir,'marche-management-token.txt')).mode&0o777,0o600);
  assert.equal((await request('/marche-management-token.txt')).status,404);
});
test('shared march: candidate selected, child source code retained, not a sponsorship',async()=>{
  let r=await request('/api/marche/documents','POST',{candidate_id:'inexistant',three_code:'3XY-Z89-P2K'});
  assert.equal(r.status,422);
  r=await request('/api/marche/documents','POST',{candidate_id:'clara-egger',three_code:'3XY-Z89-P2K'});
  assert.equal(r.status,201);
  const original=r.body;
  assert.equal(original.candidate.name,'Clara Egger');
  assert.equal(original.campaign_id,marcheCampaignId);
  assert.equal(original.three_code,'3XY-Z89-P2K');
  assert.ok(original.edit_token.length>=20);
  const source=await request('/api/marche/documents/'+original.id);
  assert.equal(source.status,200);
  assert.equal(source.body.document.three_code,'3XY-Z89-P2K');
  assert.equal(source.body.candidate.id,'clara-egger');
  const child=await request('/api/marche/documents','POST',{
    candidate_id:'anasse-kazib',three_code:'3AA-BBB-CC0',parent_code:original.three_code
  });
  assert.equal(child.status,201);
  assert.equal(child.body.parent_code,original.three_code);
  assert.equal(child.body.relation_status,'declared-unverified');
  assert.notEqual(child.body.reference,original.reference);
  const info=await request('/api/marche/documents/'+child.body.id);
  assert.equal(info.status,200);
  assert.equal(info.body.candidate.id,'anasse-kazib');
  assert.equal(info.body.document.parent_code,'3XY-Z89-P2K');
  assert.ok(info.body.document.reference.startsWith('3C1:'));
  const publicCopy=await request('/api/copies/'+child.body.id);
  assert.equal(publicCopy.status,200);
  assert.equal(JSON.stringify(publicCopy.body).includes(child.body.edit_token),false);
  assert.equal(JSON.stringify(info.body).includes(child.body.edit_token),false);
});
test('manual email preparation requires an explicit declaration and the copy secret',async()=>{
  const copy=(await request('/api/marche/documents','POST',{candidate_id:'selma-labib',three_code:'3AB-CDE-FG0'}));
  assert.equal(copy.status,201);
  let r=await request('/api/registrations','POST',{
    three_code:copy.body.three_code,copy_id:copy.body.id,edit_token:copy.body.edit_token,pilot_acknowledged:false
  });
  assert.equal(r.status,422);
  r=await request('/api/registrations','POST',{
    three_code:copy.body.three_code,copy_id:copy.body.id,edit_token:'invalid',pilot_acknowledged:true
  });
  assert.equal(r.status,403);
  r=await request('/api/registrations','POST',{
    three_code:copy.body.three_code,copy_id:copy.body.id,edit_token:copy.body.edit_token,pilot_acknowledged:true
  });
  assert.equal(r.status,201);
  assert.equal(r.body.status,'awaiting_email');
  assert.equal(r.body.email_to,'3code@acorsica.org');
  assert.ok(r.body.mailto.startsWith('mailto:'));
  assert.equal('sent_at' in r.body,false);
  const stat=await request('/api/registrations/'+r.body.id,'GET',undefined,{'x-registration-view':r.body.view_token});
  assert.equal(stat.status,200);
  assert.equal(stat.body.status,'awaiting_email');
});
test('public master tract and how-to are served; QR always points to shared instructions',async()=>{
  for(const path of ['/marche-du-soleil','/marche-du-soleil/mode-emploi','/marche-du-soleil/tract']){
    const r=await fetch(base+path);
    assert.equal(r.status,200,path);
    const html=await r.text();
    assert.match(html,/marche.js/);
  }
  const js=await fetch(base+'/marche.js');
  assert.equal(js.status,200);
  const code=await js.text();
  assert.ok(code.includes('/mode-emploi'));
  assert.ok(code.includes('Mon 3Code'));
  assert.ok(code.includes('3Code de l’exemplaire d’origine'));
  const qr=await fetch(base+'/api/qr?url='+encodeURIComponent('https://services.acorsica.org/3code/marche-du-soleil/mode-emploi'));
  assert.equal(qr.status,200);
  assert.match(await qr.text(),/<svg/);
});
test('shared campaign and candidate missions are idempotent across restarts',async()=>{
  const before=(await request('/api/campaigns/'+marcheCampaignId)).body.missions;
  assert.equal(before.length,marcheCandidates.length);
  const oldKey=readFileSync(join(dir,'marche-management-token.txt'),'utf8');
  await new Promise(resolve=>server.close(resolve));
  server=makeServer({dbPath,mailInbox:'3code@acorsica.org'});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  base='http://127.0.0.1:'+server.address().port+'/3code';
  const afterMissions=(await request('/api/campaigns/'+marcheCampaignId)).body.missions;
  assert.deepEqual(afterMissions,before);
  assert.equal(readFileSync(join(dir,'marche-management-token.txt'),'utf8'),oldKey);
});
