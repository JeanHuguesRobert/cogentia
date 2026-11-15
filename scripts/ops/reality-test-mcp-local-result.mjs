#!/usr/bin/env node
/** Explicitly opt-in, bounded live MCP local-fixture Reality Test.
 * Requires the existing signed JHN mandate, funded budget and real JHN
 * transport. Emits only a single 1-step COP fixture; never alters mandates.
 * Run on Fracta2 after service activation. Never prints bearer token.
 */
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {EventStorePacketClaimCoordinator} from '../../../inseme/packages/cop-kernel/src/packetCoordination.js';
import {declaredContinuationRecord,observeContinuationResult} from '../../../inseme/packages/cop-core/src/continuation-result.js';
import {hashPayload} from '../../../inseme/packages/cop-core/src/cop-event-envelope.js';

if(process.argv[2]!=='--live-local-fixture') {
  console.error('Usage: node scripts/ops/reality-test-mcp-local-result.mjs --live-local-fixture');
  process.exit(2);
}
const id='ctn_local_mcp_reality_'+randomUUID().replaceAll('-','');
const storePath='/var/lib/cogentia/cop/john-root-v1.sqlite';
const ref='mandate:jhn:john-root';
const store=createSqliteCopEventStore(storePath);
const ledger=createEventSourcedExecutionBudgetLedger({store,budget_id:'budget:'+ref,limits:{max_steps:2048},require_authority_grant:true});
const coordinator=new EventStorePacketClaimCoordinator({store});
const packetRef='packet:'+id;
const actor='agent:jhn';
const challenge='local-'+randomUUID();
let reservationId;
try {
  const before=ledger.snapshot();
  assert.equal(before.has_grant,true,'canonical budget grant');
  assert.ok(before.available.max_steps>=1,'one step must be available');
  const reserved=ledger.reserve({
    idempotency_key:'local-fixture:'+id,
    expected_version:before.version,
    demand:{max_steps:1}
  });
  assert.equal(reserved.ok,true,JSON.stringify(reserved));
  reservationId=reserved.reservation.reservation_id;
  const claim=await coordinator.tryClaim({packetRef,handlerRef:actor,ttlMs:120000});
  assert.equal(claim.ok,true,JSON.stringify(claim));
  const declaration=declaredContinuationRecord({
    continuation_id:id,packet_ref:packetRef,version:1,attempt_id:'a1',
    execution_binding_ref:'binding:'+id,lifecycle:'suspended',
    correlation:{challenge},budget_reservation_id:reservationId,
    claim:{claim_id:claim.claim.claim_id,epoch:claim.claim.epoch,
      expected_generation:coordinator.inspect(packetRef).generation},
    expected_result:{schema:'cogentia.step_result/v1'},
    provider:'local-fixture',channel:'mcp',
  });
  assert.equal(store.append(declaration).ok,true);
  // Read token from the already-running MCP process without output or logs.
  const pid=execFileSync('systemctl',['show','mcp-cogentia.service','--value','-p','MainPID'],{encoding:'utf8'}).trim();
  const entries=readFileSync('/proc/'+pid+'/environ').toString('utf8').split('\0');
  const token=entries.find(x=>x.startsWith('COGENTIA_MCP_JHN_TOKEN='))?.slice('COGENTIA_MCP_JHN_TOKEN='.length);
  assert.ok(token,'configured authenticated JHN transport');
  const step_result={protocol:'cogentia.step_result/v1',continuation_id:id,challenge,status:'answered',result:{answer:'local-MCP-ok'}};
  const submission={protocol:'cop.continuation-result-submit/v0',continuation_id:id,
    attempt_id:'a1',execution_binding_ref:'binding:'+id,
    continuation_version:'1',idempotency_key:'local-fixture:'+id+':result',
    result_digest:hashPayload(step_result),step_result};
  const send=async()=> {
    const response=await fetch('http://127.0.0.1:8791/mcp',{
      method:'POST',headers:{'content-type':'application/json',
        authorization:'Bearer '+token,'x-cogentia-actor':actor,
        'x-cogentia-mandate':'mandate:chatgpt-corpus-coding'},
      body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',
        params:{name:'cogentia_continuation_result_submit',arguments:submission}})
    });
    assert.equal(response.status,200);
    const json=await response.json();
    return json?.result?.structuredContent?.data ?? json;
  };
  const first=await send();
  assert.equal(first.ok,true,JSON.stringify(first));
  assert.equal(first.duplicate,false);
  const again=await send();
  assert.equal(again.ok,true,JSON.stringify(again));
  assert.equal(again.duplicate,true);
  assert.equal(first.receipt_ref,again.receipt_ref);
  const records=store.listTopic('continuation:'+id);
  assert.equal(records.filter(x=>x.payload?.surface==='mcp').length,1);
  const observation=records.find(x=>x.payload?.surface==='mcp');
  const recognized=observeContinuationResult(observation,{continuations:{
    [id]:{continuation_id:id,correlation:{challenge},expected_result:{schema:'cogentia.step_result/v1'},lifecycle:'suspended'}
  }});
  assert.equal(recognized.progression,'returned',JSON.stringify(recognized));
  assert.equal(store.appendBatch(recognized.proposed_events).ok,true);
  const returned=store.listTopic('continuation:'+id).filter(x=>x.payload?.profile==='cop.continuation-result/v1'&&x.payload.phase==='returned');
  assert.equal(returned.length,1);
  const settled=ledger.settle({reservation_id:reservationId,
    idempotency_key:'local-fixture:'+id+':settlement',
    usage:{max_steps:1},expected_version:ledger.snapshot().version});
  assert.equal(settled.ok,true,JSON.stringify(settled));
  console.log(JSON.stringify({ok:true,continuation_id:id,receipt_ref:first.receipt_ref,
    idempotent_retry:true,phase:'returned',budget_settled:true,
    autonomous_cps_wake_proven:false}));
} finally {store.close();}
