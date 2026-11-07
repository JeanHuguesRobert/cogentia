import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemoryCopEventStore} from '../../../inseme/packages/cop-core/src/cop-event-spool.js';
import {recordMandateDeclaration} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {recordExecutionBudgetGrant,createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {admitSignedSuperEffect} from './principal-super-effect-admission.js';
import {canonical} from '../super/principal-effect-issuer.mjs';
import {createHash} from 'node:crypto';
const now=new Date('2026-11-07T08:00:00Z');
const effect={action_class:'host.process.run',command:'sudo -n systemctl restart mcp-cogentia.service && systemctl is-active mcp-cogentia.service',execution_mode:'super',provider:'unix-process',target:'node:fracta2',timeout_ms:15000};
effect.payload_hash='sha256:'+createHash('sha256').update(canonical({capability:effect.action_class,target:effect.target,command:effect.command,args:[],timeout_ms:effect.timeout_ms,execution_mode:effect.execution_mode,provider:effect.provider})).digest('hex');
function setup(){const store=createMemoryCopEventStore();const mandate_ref='mandate:jhn:maintenance';
 recordMandateDeclaration(store,{mandate_id:mandate_ref,version:'v1',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',scope:{allowed_actions:['host.process.run']}});
 const budget='budget:'+mandate_ref;
 recordExecutionBudgetGrant(store,{budget_id:budget,mandate_ref,principal_ref:'principal:jhn',limits:{max_steps:2}});
 const ledger=createEventSourcedExecutionBudgetLedger({store,budget_id:budget,limits:{max_steps:2},require_authority_grant:true});
 const reservation=ledger.reserve({idempotency_key:'test:effect',expected_version:ledger.snapshot().version,demand:{max_steps:1}});
 assert.equal(reservation.ok,true,JSON.stringify(reservation));
 const proposal={kind:'cogentia.super-effect-proposal/v1',principal_ref:'principal:jhn',actor_ref:'agent:jhn',mandate_ref,mandate_version:'v1',budget_reservation_id:reservation.reservation.reservation_id,issuer_evidence:'ssh:principal:demo',recovery_ref:'ssh:independent',expires_at:'2026-11-07T08:05:00Z',risk_control:'B',single_use:true,effect};
 return {store,proposal};}
const opts=x=>({...x,now,signature:'-----BEGIN SSH SIGNATURE-----\nfixture',trustedPublicKey:'ssh-rsa TEST',verifiedSignature:()=>true,issuerVerified:true});
test('valid signed effect + canonical mandate and reservation returns admission, NOT a root grant',()=>{const s=setup();const r=admitSignedSuperEffect(opts(s));assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.grant,null);assert.equal(r.requires_atomic_claim,true);});
test('refuses absent independent issuer, stale mandate, lost reservation or altered command',()=>{
 const s=setup();assert.equal(admitSignedSuperEffect({...opts(s),issuerVerified:false}).error,'trusted_issuer_context_required');
 assert.equal(admitSignedSuperEffect(opts({...s,proposal:{...s.proposal,mandate_version:'v2'}})).ok,false);
 assert.equal(admitSignedSuperEffect(opts({...s,proposal:{...s.proposal,budget_reservation_id:'not-reserved'}})).error,'canonical_reservation_missing');
 assert.equal(admitSignedSuperEffect(opts({...s,proposal:{...s.proposal,effect:{...effect,command:'sudo reboot'}}})).error,'effect_hash_invalid');
});
