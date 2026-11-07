#!/usr/bin/env node
/** Settle one canonical Inseme step ONLY against validated live broker receipt. */
import {readFileSync,statSync} from 'node:fs';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {SUPER_PROBE_MANDATE,SUPER_PROBE_EFFECT_HASH} from '../lib/super-probe-approval.js';
const expectedReceipt=JSON.parse(readFileSync('/home/ubuntu/jhn-super-probe-root-receipt.json','utf8'));
const brokerReceipt=JSON.parse(readFileSync(process.argv[2],'utf8'));
if(expectedReceipt.phase!=='ROOT_GRANT_ISSUED_NOT_EXECUTED'||
   expectedReceipt.payload_hash!==SUPER_PROBE_EFFECT_HASH||
   expectedReceipt.mandate!==SUPER_PROBE_MANDATE||
   !brokerReceipt.ok||!brokerReceipt.cop_reserved||brokerReceipt.exit_code!==0||
   brokerReceipt.authority_id!==expectedReceipt.authorization_id||
   brokerReceipt.payload_hash!==SUPER_PROBE_EFFECT_HASH||
   brokerReceipt.mandate!==SUPER_PROBE_MANDATE||
   brokerReceipt.stdout!=='1001\n0\n')throw Error('broker_receipt_not_confirmed');
const db='/var/lib/cogentia/cop/john-root-v1.sqlite';
const stat=statSync(db);
if(!stat.isFile()||(stat.mode&0o077)!==0)throw Error('canonical_store_unprotected');
const store=createSqliteCopEventStore(db);
try{
 const ledger=createEventSourcedExecutionBudgetLedger({store,budget_id:'budget:'+SUPER_PROBE_MANDATE,
   limits:{max_steps:1},require_authority_grant:true});
 const snapshot=ledger.snapshot();
 if(snapshot.reserved.max_steps!==1||snapshot.settled.max_steps!==0)throw Error('unexpected_super_budget_state');
 const result=ledger.settle({reservation_id:expectedReceipt.reservation_id,
   expected_version:snapshot.version,usage:{max_steps:1},evidence:{
     kind:'verified_root_broker_receipt',authorization_id:brokerReceipt.authority_id,
     payload_hash:brokerReceipt.payload_hash,exit_code:0}});
 if(!result.ok)throw Error('canonical_settlement_failed:'+result.error);
 const after=ledger.snapshot();
 if(after.settled.max_steps!==1||after.reserved.max_steps!==0||after.available.max_steps!==0)
   throw Error('canonical_settlement_readback_invalid');
 console.log(JSON.stringify({ok:true,phase:'SUPER_EFFECT_SETTLED',authorization_id:brokerReceipt.authority_id,
   mandate:SUPER_PROBE_MANDATE,settled:1,reserved:0,available:0}));
}finally{store.close()}
