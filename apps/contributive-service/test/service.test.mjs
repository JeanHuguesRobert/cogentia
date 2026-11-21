import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,statSync,symlinkSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {makeServer,code,generate} from '../server.mjs';
let dir,server,base;
before(async()=>{
  dir=mkdtempSync(join(tmpdir(),'contributive-'));
  server=makeServer({dbPath:join(dir,'db.sqlite')});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  base='http://127.0.0.1:'+server.address().port+'/3code';
});
after(async()=>{
  if(server)await new Promise(resolve=>server.close(resolve));
  if(dir)rmSync(dir,{force:true,recursive:true});
});
async function call(path,body,secret){
  const method=body===undefined?'GET':'POST';
  const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(secret?{'x-management-token':secret}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  return {status:response.status,body:await response.json()};
}
test('3Code format, normalization, collisions permitted',()=>{
  assert.equal(code('3xy-z89-p2k'),'3XY-Z89-P2K');
  assert.equal(code('3xy z89 p2k'),'3XY-Z89-P2K');
  assert.throws(()=>code('bad'));
  assert.throws(()=>code('3XY-Z89-P2U'));
  const a=new Set();for(let i=0;i<1000;i++)a.add(generate());
  assert.equal(a.size,1000);
  for(const c of a)assert.match(c,/^3[A-Z0-9]{2}-[A-Z0-9]{3}-[A-Z0-9]{3}$/);
});

test('regression: executable entrypoint starts through deployed symlink',async()=>{
  const sandbox=mkdtempSync(join(tmpdir(),'contributive-link-'));
  const linked=join(sandbox,'server.mjs');
  symlinkSync(fileURLToPath(new URL('../server.mjs',import.meta.url)),linked);
  const proc=spawn(process.execPath,[linked],{
    env:{...process.env,PORT:'0',HOST:'127.0.0.1',CAMPAIGNS_DB:join(sandbox,'db.sqlite')},
    stdio:['ignore','pipe','pipe']
  });
  try {
    const started=await Promise.race([
      new Promise((resolve,reject)=>{
        proc.stdout.on('data',data=>{if(String(data).includes('contributive-service listening'))resolve(true);});
        proc.once('exit',(code,signal)=>reject(new Error('server exited before listen: '+code+'/'+signal)));
        proc.once('error',reject);
      }),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('timed out waiting for listener')),4000))
    ]);
    assert.equal(started,true);
    assert.equal(statSync(sandbox).mode&0o777,0o700); // A caller-owned shared parent never chmod.
  } finally {
    proc.kill('SIGTERM');
    await new Promise(resolve=>proc.once('exit',resolve));
    rmSync(sandbox,{recursive:true,force:true});
  }
});

test('private SQLite file mode',()=>{
  assert.equal(statSync(join(dir,'db.sqlite')).mode & 0o777,0o600);
  assert.equal(statSync(dir).mode & 0o777,0o700);
});
test('health, user-facing static and SVG QR',async()=>{
  let r=await call('/api/health');assert.equal(r.status,200);assert.equal(r.body.db,true);
  let page=await fetch(base);assert.equal(page.status,200);assert.match(await page.text(),/non partisan/);
  let qr=await fetch(base+'/api/qr?url='+encodeURIComponent('https://services.acorsica.org/3code'));
  assert.equal(qr.status,200);assert.match(await qr.text(),/<svg/);
  qr=await fetch(base+'/api/qr?url='+encodeURIComponent('https://evil.example/'));
  assert.equal(qr.status,400);
});
let campaign,secret,mission,parent,child,contribution;
test('campaign creation requires key to activate and manage',async()=>{
  const d=await call('/api/campaigns',{title:'Inventaire des moulins',goal:'Contributions ouvertes.'});
  assert.equal(d.status,201);campaign=d.body.id;secret=d.body.management_token;assert.equal(d.body.status,'draft');
  let r=await call('/api/campaigns');assert.equal(r.body.campaigns.length,1);assert.match(r.body.campaigns[0].title,/Marche du Soleil/);
  r=await call('/api/campaigns/'+campaign+'/activate',{});assert.equal(r.status,403);
  r=await call('/api/campaigns/'+campaign+'/activate',{},secret);assert.equal(r.body.status,'active');
  r=await call('/api/campaigns');assert.equal(r.body.campaigns.length,2);
});
test('mission: authenticated write only',async()=>{
  let r=await call('/api/missions',{campaign_id:campaign,title:'Recueillir une archive'});assert.equal(r.status,403);
  r=await call('/api/missions',{campaign_id:campaign,title:'Recueillir une archive',description:'Sans identité obligatoire'},secret);
  assert.equal(r.status,201);mission=r.body.id;
});
test('copies, fork, declared parent and duplicate 3Code',async()=>{
  let r=await call('/api/copies',{campaign_id:campaign,mission_id:mission,title:'Feuille source'});
  assert.equal(r.status,201);parent=r.body;assert.equal(parent.parent_code,null);
  r=await call('/api/copies',{campaign_id:campaign,mission_id:mission,title:'Photocopie',parent_id:parent.id,three_code:parent.three_code});
  assert.equal(r.status,201);child=r.body;
  assert.equal(child.parent_code,parent.three_code);
  assert.equal(child.relation_status,'linked-unverified');
  assert.notEqual(child.id,parent.id);
  r=await call('/api/resolve?code='+encodeURIComponent(parent.three_code));
  assert.equal(r.status,200);assert.equal(r.body.results.length,2);assert.equal(r.body.ambiguous,true);
  r=await call('/api/copies/'+child.id);assert.equal(r.body.copy.parent_code,parent.three_code);
  r=await call('/api/copies',{campaign_id:campaign,parent_code:'3XY-Z89-P2K',title:'Parent hors ligne'});
  assert.equal(r.body.relation_status,'declared-unverified');
});
test('private contributions: pending until authorized review',async()=>{
  let r=await call('/api/contributions',{copy_id:child.id,message:'J’ai trouvé une photographie originale.'});
  assert.equal(r.status,201);contribution=r.body.id;assert.equal(r.body.status,'pending');
  r=await call('/api/copies/'+child.id);assert.equal(r.body.contributions.length,0);
  r=await call('/api/campaigns/'+campaign+'/contributions');assert.equal(r.status,403);
  r=await call('/api/campaigns/'+campaign+'/contributions',undefined,secret);
  // A GET request can still use the management header via raw fetch.
  let response=await fetch(base+'/api/campaigns/'+campaign+'/contributions',{headers:{'x-management-token':secret}});
  assert.equal(response.status,200);let d=await response.json();assert.equal(d.contributions.length,1);
  r=await call('/api/contributions/'+contribution+'/review',{status:'accepted'});assert.equal(r.status,403);
  r=await call('/api/contributions/'+contribution+'/review',{status:'accepted'},secret);assert.equal(r.status,200);
  r=await call('/api/copies/'+child.id);assert.equal(r.body.contributions.length,1);
});
test('reject invalid records and unsupported methods',async()=>{
  let r=await call('/api/resolve?code=not-valid');assert.equal(r.status,400);
  r=await call('/api/copies',{campaign_id:campaign,parent_code:'broken',title:'Invalid'});assert.equal(r.status,400);
  r=await call('/api/copies',{campaign_id:campaign,mission_id:'00000000-0000-0000-0000-000000000000',title:'Wrong mission'});assert.equal(r.status,400);
  const u=await fetch(base+'/api/private');assert.equal(u.status,404);
});
