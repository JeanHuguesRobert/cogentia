#!/usr/bin/env node
/**
 * Prepare exactly one governed ChatGPT browser continuation after the
 * standing mandate is independently approved. No browser interaction occurs.
 * A returned result is accepted only with real claim and reserved budget.
 */
import {randomUUID} from 'node:crypto';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {EventStorePacketClaimCoordinator} from '../../../inseme/packages/cop-kernel/src/packetCoordination.js';
import {declaredContinuationRecord} from '../../../inseme/packages/cop-core/src/continuation-result.js';
import {resolveMandate,evaluateMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';

const path='/var/lib/cogentia/cop/john-root-v1.sqlite';
const ref='mandate:jhn:john-root';
const deny=error=>{console.log(JSON.stringify({ok:false,error}));process.exitCode=1};
if(process.argv.length!==3||process.argv[2]!=='--prepare'){
  deny('usage: --prepare');process.exit(1);
}
const store=createSqliteCopEventStore(path);
try {
 const mandate=resolveMandate(store,ref);
 const allowed=evaluateMandate(store,{mandate_ref:ref,version_pin:mandate?.version,
   expected_principal_ref:'principal:jhn',expected_actor_ref:'agent:jhn',
   capability:'browser.chatgpt.turn'});
 if(!allowed.granted){deny('signed_chatgpt_turn_mandate_required');process.exit(1);}
 const id='ctn_chatgpt_browser_'+randomUUID().replaceAll('-','');
 const challenge='browser-'+randomUUID();
 const ledger=createEventSourcedExecutionBudgetLedger({store,
   budget_id:'budget:'+ref,require_authority_grant:true});
 const reserved=ledger.reserve({idempotency_key:'chatgpt-browser:'+id,
   expected_version:ledger.snapshot().version,demand:{max_steps:1}});
 if(!reserved.ok){deny(reserved.error||'budget_reservation_failed');process.exit(1);}
 const packetRef='packet:'+id;
 const coordinator=new EventStorePacketClaimCoordinator({store});
 const claim=await coordinator.tryClaim({packetRef,handlerRef:'agent:jhn',ttlMs:900000});
 if(!claim.ok){ledger.release({reservation_id:reserved.reservation.reservation_id,
   expected_version:ledger.snapshot().version});
   deny('packet_claim_failed');process.exit(1);}
 const declared=declaredContinuationRecord({
   continuation_id:id,packet_ref:packetRef,version:1,attempt_id:'a1',
   execution_binding_ref:'binding:'+id,lifecycle:'suspended',
   correlation:{challenge},budget_reservation_id:reserved.reservation.reservation_id,
   claim:{claim_id:claim.claim.claim_id,epoch:claim.claim.epoch,
     expected_generation:coordinator.inspect(packetRef).generation},
   expected_result:{schema:'cogentia.step_result/v1'},
   provider:'chatgpt',channel:'browser',
   resumeTo:'handler:chatgpt-browser-result-observer',
 });
 const recorded=store.append(declared);
 if(!recorded.ok){deny(recorded.error||'continuation_declaration_failed');process.exit(1);}
 const submission={
   protocol:'cop.continuation-result-submit/v0',continuation_id:id,
   attempt_id:'a1',execution_binding_ref:'binding:'+id,
   continuation_version:'1',idempotency_key:'chatgpt-browser:'+id+':final',
   step_result:{protocol:'cogentia.step_result/v1',
     continuation_id:id,challenge,status:'answered',
     result:{answer:'READY'}},
 };
 const prompt=[
   'Vous intervenez dans une conversation ChatGPT distincte, pilotée par le jumeau numérique JHN.',
   'Votre unique objectif pour ce premier essai est de vérifier une livraison de résultat à Cogentia.',
   'Utilisez réellement le connecteur Cogentia et appelez l’outil cogentia_continuation_result_submit',
   'avec l’objet d’arguments JSON EXACT ci-dessous :',
   JSON.stringify(submission),
   'Ne prétendez pas avoir appelé l’outil si vous ne pouvez pas effectivement le faire.',
   'Si cet outil est inaccessible, répondez seulement TOOL_UNAVAILABLE.',
   'Si l’outil confirme un reçu durable, répondez seulement READY et son receipt_ref.',
   'Ne réalisez aucune autre action ni communication.',
 ].join('\n\n');
 console.log(JSON.stringify({ok:true,continuation_id:id,packet_ref:packetRef,
   budget_reservation_id:reserved.reservation.reservation_id,
   expires_at:claim.claim.expires_at,prompt,mandate_version:mandate.version}));
}finally{store.close()}
