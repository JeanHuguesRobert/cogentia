import test from "node:test";
import assert from "node:assert/strict";
import {projectContinuationPlacement,PLACEMENT_PROTOCOL} from "./continuation-placement.js";

test("replacement for legacy next-preview remains read-only and distinguishes matching from authority",()=>{
 const now="2026-11-15T12:00:00.000Z";
 const continuations=[
  {id:"ctn_ready",status:"active",kind:"judgment",
   required_capabilities:["Judgement"],created_at:"2026-11-15T09:00:00Z",
   context:{packet_ref:"issue:JeanHuguesRobert/cogentia#305",home_node:"fracta2"},
   return_contract:{result_ref:"continuation:ctn_ready/resolution"}},
  {id:"ctn_waiting",status:"active",required_capabilities:["Judgement"],created_at:"2026-11-14T09:00:00Z",
   conditions:{resumeAfter:"2026-11-16T00:00:00Z"}},
  {id:"ctn_unavailable",status:"active",required_capabilities:["legal_judgment"],created_at:"2026-11-15T10:00:00Z"},
  {id:"ctn_closed",status:"resolved",required_capabilities:["Judgement"]},
 ];
 const handlers=[
  {id:"judge-remote",node:"other",available:true,capabilities:["Judgement"],capability_confidence:"declared"},
  {id:"judge-home",node:"fracta2",available:true,capabilities:["Judgement"],capability_confidence:"observed"},
  {id:"legal-offline",node:"fracta2",available:false,capabilities:["legal_judgment"]},
 ];
 const before=JSON.stringify({continuations,handlers});
 const result=projectContinuationPlacement({continuations,handlers,homeNode:"fracta2",now});
 assert.equal(result.protocol,PLACEMENT_PROTOCOL);
 assert.equal(result.read_only,true);
 assert.deepEqual(result.counts,{active:3,runnable_candidates:1,blocked:2});
 assert.equal(result.entries[0].continuation_id,"ctn_ready");
 assert.equal(result.entries[0].packet_ref,"issue:JeanHuguesRobert/cogentia#305");
 assert.equal(result.entries[0].return_ref,"continuation:ctn_ready/resolution");
 assert.deepEqual(result.entries[0].handler_candidates.map(x=>x.handler_id),["judge-home","judge-remote"]);
 assert.equal(result.entries[0].handler_candidates[0].match_basis,"declared_capabilities_only");
 for(const item of result.entries){
  assert.equal(item.claim_acquired,false);
  assert.equal(item.effect_authorized,false);
  assert.equal(item.selected_handler,null);
  assert.ok(item.handler_candidates.every(h=>h.mandate_verified===false&&h.claim_acquired===false));
 }
 assert.equal(result.entries.find(x=>x.continuation_id==="ctn_waiting").blocked_reason,"waiting_until_due");
 assert.equal(result.entries.find(x=>x.continuation_id==="ctn_unavailable").blocked_reason,"no_declared_available_capable_handler");
 assert.equal(JSON.stringify({continuations,handlers}),before,"a preview never mutates inputs");
 assert.deepEqual(projectContinuationPlacement({continuations,handlers,homeNode:"fracta2",now}),result);
});

test("invalid time and unavailable declarations never create runnable work",()=>{
 assert.throws(()=>projectContinuationPlacement({now:"not-a-date"}),/Invalid projection time/);
 const result=projectContinuationPlacement({continuations:[
  {id:"ctn_no_handler",status:"active",required_capabilities:["Judgement"]}],
 handlers:[{id:"claim-only",available:false,capabilities:["Judgement"]}]});
 assert.equal(result.counts.runnable_candidates,0);
 assert.equal(result.entries[0].handler_candidates.length,0);
});


test('temperature projection reuses COP journal and never presents parked descendants as ready',async()=>{
 const {createSqliteCopEventStore}=await import('../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js');
 const {linkPacketChild}=await import('../../../inseme/packages/cop-core/src/packet-parent-continuations.js');
 const {changePacketTemperature}=await import('../../../inseme/packages/cop-core/src/packet-temperature.js');
 const store=createSqliteCopEventStore(':memory:');
 try{
  const parent='continuation:ctn-projected-parent',child='continuation:ctn-projected-child';
  const c=[{id:'ctn-projected-parent',status:'active',created_at:'2026-11-15T07:00:00Z',required_capability:'read'},
   {id:'ctn-projected-child',status:'active',created_at:'2026-11-15T08:00:00Z',required_capability:'read'}];
  const h=[{id:'worker',node:'fracta2',available:true,capabilities:['read']}];
  const view=()=>projectContinuationPlacement({continuations:c,handlers:h,now:'2026-11-16T12:00:00Z',temperatureStore:store});
  assert.equal(linkPacketChild(store,{parent_ref:parent,child_ref:child}).ok,true);
  assert.equal(view().counts.runnable_candidates,2);
  assert.equal(changePacketTemperature(store,{packet_ref:parent,temperature:'parked',transition_id:'p-park'}).ok,true);
  assert.equal(view().counts.runnable_candidates,0);
  assert.ok(view().entries.every(e=>e.blocked_reason==='temperature:parked'));
  assert.equal(changePacketTemperature(store,{packet_ref:parent,temperature:'active',transition_id:'p-resume'}).ok,true);
  assert.deepEqual(view().entries.filter(e=>e.runnable_candidate).map(e=>e.continuation_id),['ctn-projected-parent']);
  assert.equal(changePacketTemperature(store,{packet_ref:child,temperature:'active',transition_id:'c-resume'}).ok,true);
  assert.equal(view().counts.runnable_candidates,2);
  assert.equal(store.auditCommitments().ok,true);
 }finally{store.close()}
});


test('suspending a continuation overrides a warm packet placement independently',async()=>{
 const {createSqliteCopEventStore}=await import('../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js');
 const {changePacketTemperature}=await import('../../../inseme/packages/cop-core/src/packet-temperature.js');
 const store=createSqliteCopEventStore(':memory:');try{
  const c={id:'ctn-on-warm-packet',packetRef:'packet:already-warm',status:'active',
    required_capability:'read'};
  const h={id:'worker',node:'fracta2',available:true,capabilities:['read']};
  const view=()=>projectContinuationPlacement({continuations:[c],handlers:[h],
    temperatureStore:store,now:'2026-11-16T12:00:00Z'});
  assert.equal(view().entries[0].runnable_candidate,true);
  assert.equal(changePacketTemperature(store,{packet_ref:'continuation:ctn-on-warm-packet',
    temperature:'parked',transition_id:'pause-continuation-only'}).ok,true);
  assert.equal(view().entries[0].runnable_candidate,false);
  assert.equal(view().entries[0].blocked_reason,'temperature:parked');
 }finally{store.close()}
});
