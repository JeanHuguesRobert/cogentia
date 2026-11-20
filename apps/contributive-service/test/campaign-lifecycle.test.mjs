import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {makeServer} from '../server.mjs';
import {formatCopyReference,parseCopyReference} from '../references.mjs';

async function withService(fn,{legacy=false}={}) {
  const dir=mkdtempSync(join(tmpdir(),'3code-lifecycle-'));
  const dbPath=join(dir,'data.sqlite');
  if(legacy){
    const db=new DatabaseSync(dbPath);
    db.exec("CREATE TABLE campaigns(id TEXT PRIMARY KEY,title TEXT NOT NULL,goal TEXT NOT NULL,status TEXT NOT NULL,secret_hash TEXT NOT NULL,created_at TEXT NOT NULL)");
    db.exec("INSERT INTO campaigns VALUES('2e44c405-2fc9-47be-9e1f-20cb6985114e','Ancien titre','Ancien objectif','draft','0','2026-11-01T00:00:00Z')");
    db.close();
  }
  const server=makeServer({dbPath});
  try{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const base='http://127.0.0.1:'+server.address().port+'/3code/api';
    async function request(path,method='GET',body,token){
      const response=await fetch(base+path,{method,headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{'x-management-token':token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
      return {status:response.status,body:await response.json()};
    }
    await fn(request);
  }finally{
    await new Promise(resolve=>server.close(resolve));
    rmSync(dir,{recursive:true,force:true});
  }
}
test('3C1 is canonical, unambiguous and never a credential',()=>{
  const campaign_id='2e44c405-2fc9-47be-9e1f-20cb6985114e';
  const copy_id='ba5af39a-4e15-4428-8a59-3851fe2fdf6e';
  const ref=formatCopyReference({campaign_id,three_code:'3xy z89 p2k',copy_id});
  assert.equal(ref,`3C1:${campaign_id}:3XY-Z89-P2K:${copy_id}`);
  assert.deepEqual(parseCopyReference(ref),{version:'3C1',campaign_id,three_code:'3XY-Z89-P2K',copy_id});
  for(const value of ['3C2:'+ref.slice(4),ref+':token',ref.replace(campaign_id,'invalid'),ref.replace('3XY-Z89-P2K','BAD')]){
    assert.throws(()=>parseCopyReference(value));
  }
});
test('campaign management: edits require authority and optimistic version; pause/close are enforced',async()=>{
  await withService(async request=>{
    const created=await request('/campaigns','POST',{title:'Archives ouvertes',goal:'Préserver des connaissances',description:'Documentation, hors campagne électorale'});
    assert.equal(created.status,201);
    const {id,management_token:key}=created.body;
    let r=await request('/campaigns/'+id);
    assert.equal(r.body.campaign.description,'Documentation, hors campagne électorale');
    assert.equal(r.body.campaign.revision,1);
    assert.equal(JSON.stringify(r.body).includes(key),false);
    r=await request('/campaigns/'+id,'PATCH',{expected_revision:1,title:'Modifié'});
    assert.equal(r.status,403);
    r=await request('/campaigns/'+id,'PATCH',{expected_revision:1,title:'Modifié'},key);
    assert.equal(r.status,200);assert.equal(r.body.revision,2);
    r=await request('/campaigns/'+id,'PATCH',{expected_revision:1,title:'Obsolète'},key);
    assert.equal(r.status,409);
    r=await request('/campaigns/'+id,'PATCH',{expected_revision:2,status:'active'},key);
    assert.equal(r.status,400);
    r=await request('/campaigns/'+id+'/activate','POST',{},key);
    assert.equal(r.status,200);assert.equal(r.body.revision,3);
    r=await request('/campaigns/'+id,'PATCH',{expected_revision:3,status:'paused',description:'Pause volontaire'},key);
    assert.equal(r.status,200);assert.equal(r.body.revision,4);
    r=await request('/copies','POST',{campaign_id:id,title:'Nouveau tract'});
    assert.equal(r.status,409);
    r=await request('/campaigns/'+id,'PATCH',{expected_revision:4,status:'active'},key);
    assert.equal(r.status,200);
    r=await request('/copies','POST',{campaign_id:id,title:'Notice'});
    assert.equal(r.status,201);
    r=await request('/campaigns/'+id,'PATCH',{expected_revision:5,status:'closed'},key);
    assert.equal(r.status,200);
    r=await request('/copies','POST',{campaign_id:id,title:'Interdit'});
    assert.equal(r.status,409);
  });
});
test('same 3Code may occur in two copies and campaigns; 3C1 resolves exact copy',async()=>{
  await withService(async request=>{
    const c1=(await request('/campaigns','POST',{title:'Campagne A'})).body;
    const c2=(await request('/campaigns','POST',{title:'Campagne B'})).body;
    await request('/campaigns/'+c1.id+'/activate','POST',{},c1.management_token);
    await request('/campaigns/'+c2.id+'/activate','POST',{},c2.management_token);
    const copies=[];
    for(const campaign_id of [c1.id,c1.id,c2.id]){
      const r=await request('/copies','POST',{campaign_id,title:'Exemplaire de test',three_code:'3XY-Z89-P2K'});
      assert.equal(r.status,201);copies.push(r.body);
    }
    const all=await request('/resolve?code=3XY-Z89-P2K');
    assert.equal(all.body.ambiguous,true);assert.equal(all.body.results.length,3);
    for(const copy of copies){
      const r=await request('/references/parse?ref='+encodeURIComponent(copy.reference));
      assert.equal(r.status,200);
      assert.equal(r.body.copy_url,'/3code/e/'+copy.id);
      assert.equal(r.body.copy_id,copy.id);
      assert.equal(r.body.campaign_id,copy.campaign_id);
      const detail=await request('/copies/'+copy.id);
      assert.equal(detail.body.copy.reference,copy.reference);
      assert.equal(detail.body.copy.three_code,'3XY-Z89-P2K');
    }
    let forged=copies[0].reference.replace(c1.id,c2.id);
    assert.equal((await request('/references/parse?ref='+encodeURIComponent(forged))).status,404);
    forged=copies[0].reference.replace('3XY-Z89-P2K','300-000-000');
    assert.equal((await request('/references/parse?ref='+encodeURIComponent(forged))).status,404);
    assert.equal((await request('/references/parse?ref=invalid')).status,400);
  });
});
test('migration preserves existing campaigns and gives a revision',async()=>{
  await withService(async request=>{
    const r=await request('/campaigns/2e44c405-2fc9-47be-9e1f-20cb6985114e');
    assert.equal(r.status,200);
    assert.equal(r.body.campaign.title,'Ancien titre');
    assert.equal(r.body.campaign.description,'');
    assert.equal(r.body.campaign.revision,1);
  },{legacy:true});
});

test('aggregate presentation progress: separate declarations from official evidence and protect writes',async()=>{
  await withService(async request=>{
    const created=(await request('/campaigns','POST',{title:'Suivi de démarches civiques'})).body;
    const id=created.id,key=created.management_token;
    let r=await request('/campaigns/'+id+'/progress');
    assert.equal(r.status,200);assert.deepEqual(r.body.values,[]);
    assert.equal(r.body.provenance,'organizer-declaration');
    r=await request('/campaigns/'+id+'/progress','POST',{stage:'promise',count:3});
    assert.equal(r.status,403);
    r=await request('/campaigns/'+id+'/progress','POST',{stage:'promise',count:3},key);
    assert.equal(r.status,201);assert.equal(r.body.count,3);
    r=await request('/campaigns/'+id+'/progress','POST',{stage:'promise',count:5,evidence_url:'https://example.org/source'},key);
    assert.equal(r.status,201);
    r=await request('/campaigns/'+id+'/progress','POST',{stage:'validated',count:2},key);
    assert.equal(r.status,201);
    r=await request('/campaigns/'+id+'/progress');
    assert.equal(r.status,200);assert.equal(r.body.values.length,2);
    assert.equal(r.body.values.find(x=>x.stage==='promise').count,5);
    assert.equal(r.body.values.find(x=>x.stage==='validated').count,2);
    assert.match(r.body.notice,/non vérifiées/);
    for(const b of [
      {stage:'promise',count:-1},
      {stage:'promise',count:1.5},
      {stage:'promise',count:1,evidence_url:'http://example.com'},
      {stage:'promise',count:1,evidence_url:'javascript:alert(1)'},
      {stage:'non-existing',count:1}
    ])assert.equal((await request('/campaigns/'+id+'/progress','POST',b,key)).status,400);
    // No individual political contact names, email addresses or trail in aggregate records.
    assert.equal(Object.keys(r.body.values[0]).sort().join(','),'count,created_at,evidence_url,stage');
  });
});
