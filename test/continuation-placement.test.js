import test from 'node:test';
import assert from 'node:assert/strict';
import {projectContinuationPlacement} from '../scripts/lib/continuation-placement.js';
const now='2026-11-09T10:00:00.000Z';
test('projects ephemeral packet identity and local handler match without self-granted authority',()=>{
 const c={id:'ctn_abc12345',status:'active',created_at:'2026-11-08T09:00:00.000Z',required_capabilities:['semantic_judgment'],context:{home_node:'fracta2'}};
 const h=[{id:'remote',available:true,node:'fracta',capabilities:['semantic_judgment']},{id:'local',available:true,node:'fracta2',capabilities:['semantic_judgment']}];
 const x=projectContinuationPlacement({continuations:[c],handlers:h,homeNode:'fracta2',now});
 assert.equal(x.entries[0].packet_ref,'continuation:ctn_abc12345');
 assert.equal(x.entries[0].handler_candidates[0].handler_id,'local');
 assert.equal(x.entries[0].claim_acquired,false);
 assert.equal(x.entries[0].effect_authorized,false);
});
test('oldest continuously eligible wins despite lower static priority; missing capabilities block',()=>{
 const cs=[{id:'ctn_old11111',status:'active',priority:0,created_at:'2026-11-01',required_capabilities:['x']},{id:'ctn_new22222',status:'active',priority:100,created_at:'2026-11-08',required_capabilities:['x']},{id:'ctn_block33',status:'active',created_at:'2026-11-01',required_capabilities:['y']}];
 const h=[{id:'worker',available:true,capabilities:['x']}];
 const x=projectContinuationPlacement({continuations:cs,handlers:h,now});
 assert.deepEqual(x.entries.map(e=>e.continuation_id),['ctn_old11111','ctn_new22222','ctn_block33']);
 assert.equal(x.entries[2].blocked_reason,'no_declared_available_capable_handler');
});
test('a future resumeAfter cannot be scheduled as runnable',()=>{
 const x=projectContinuationPlacement({continuations:[{id:'ctn_wait123',status:'active',conditions:{resumeAfter:'2026-11-10'},required_capabilities:['x']}],handlers:[{id:'h',available:true,capabilities:['x']}],now});
 assert.equal(x.entries[0].runnable_candidate,false);
 assert.equal(x.entries[0].blocked_reason,'waiting_until_due');
});

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
test('CLI projection reads shared continuation store and never claims or mutates',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'placement-'));
 try{
   const store=path.join(root,'.cogentia','continuations');fs.mkdirSync(store,{recursive:true});
   const original={id:'ctn_7777aaaa',status:'active',created_at:'2026-11-01T00:00:00Z',required_capabilities:['semantic_judgment'],context:{home_node:'fracta2',parentRef:'packet:parent-42'}};
   const file=path.join(store,'ctn_7777aaaa.json');const content=JSON.stringify(original);fs.writeFileSync(file,content);
   const manifest=path.join(root,'handlers.json');fs.writeFileSync(manifest,JSON.stringify({handlers:[{id:'chatgpt-current',available:true,node:'fracta2',capabilities:['semantic_judgment']}]}));
   const registry=path.join(root,'registry.json');fs.writeFileSync(registry,JSON.stringify({repos:[]}));
   const raw=execFileSync(process.execPath,['scripts/cogentia.js','continuation','placement','--registry',registry,'--handlers-file',manifest,'--home-node','fracta2','--json'],{encoding:'utf8'});
   const result=JSON.parse(raw);
   assert.equal(result.entries[0].packet_ref,'packet:parent-42');
   assert.equal(result.entries[0].handler_candidates[0].handler_id,'chatgpt-current');
   assert.equal(result.entries[0].claim_acquired,false);
   assert.equal(fs.readFileSync(file,'utf8'),content);
   assert.ok(!fs.existsSync(path.join(root,'.cogentia','resolvers')));
 } finally {fs.rmSync(root,{recursive:true,force:true});}
});
