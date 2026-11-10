/**
 * Inseme canonical admission adapter for intra-Twin JMAP messaging.
 * Reuses the independently verified John mandate, event-sourced budget and
 * optimistic reservations. Does not issue any mandate or synthesize rights.
 * No COP decision is made from the supplied email address or model claims.
 */
import {assessJohnCopAuthority} from './john-cop-authority-preflight.js';
import {randomUUID,createHash} from 'node:crypto';
import {resolveMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';

const REF='mandate:jhn:john-root';
const BUDGET='budget:'+REF;
const DIMENSION='max_steps';
const CONTRACT='cogentia.agent_mail_cop.v1';
const fail=code=>{throw Object.assign(new Error(code),{error_class:code});};
export function createCanonicalAgentMailAuthorizer({store,verifyIssuer,transportMandateLabel='mandate:chatgpt-corpus-coding'}={}) {
  if(!store?.replay||!store?.listTopic||!store?.append||typeof verifyIssuer!=='function')fail('canonical_mail_authority_not_configured');
  // The current root mandate is *not* a subagent mandate. Delegated actors
  // must be independently authorized in the canonical store later.
  return async function admit({request,caller}={}) {
    if(!request||!caller||caller.principal_ref!=='principal:jhn'||
       caller.actor_ref!=='agent:jhn'||caller.mailbox!=='john@mail.fractavolta.com')fail('mail_canonical_agent_binding_missing');
    const capability=request.capability;
    if(!['agent.mail.send','agent.mail.receive'].includes(capability))fail('mail_canonical_capability_invalid');
    if(capability==='agent.mail.send') {
      if(request.actor!==caller.mailbox||request.principal!=='principal:jhn')fail('mail_actor_scope_mismatch');
    } else if(request.agent!==caller.mailbox)fail('mail_actor_scope_mismatch');
    const ledger=createEventSourcedExecutionBudgetLedger({store,budget_id:BUDGET,limits:{max_steps:2048},require_authority_grant:true});
    const activeMandate=resolveMandate(store,REF);
    if(!activeMandate?.version)fail('mail_canonical_mandate_absent');
    const pre=assessJohnCopAuthority({store,auth:caller.auth,
      mandate_ref:REF,version_pin:activeMandate.version,capability,ledger,verifyIssuer,
      transport_mandate_label:transportMandateLabel});
    if(pre.preflight_ok!==true)fail(pre.error||'mail_canonical_mandate_denied');
    const correlationId=capability==='agent.mail.send'?request.correlation_id:`read:${request.agent}:${randomUUID()}`;
    if(typeof correlationId!=='string'||!correlationId||correlationId.length>160)fail('mail_correlation_invalid');
    const reservation=ledger.reserve({idempotency_key:`agent-mail:${capability}:${correlationId}`,
      expected_version:ledger.snapshot().version,demand:{[DIMENSION]:1}});
    if(!reservation.ok||reservation.duplicate)fail(reservation.error||'mail_duplicate_or_reserved');
    let completed=false;
    const reservationId=reservation.reservation.reservation_id;
    const decision={
      authorized:true,
      capability,
      principal:'principal:jhn',
      actor:request.actor||caller.mailbox,
      agent:request.agent,
      to:request.to,subject:request.subject,body:request.body,
      correlation_id:request.correlation_id,
      authorization_id:reservationId,
      budget_reservation_id:reservationId,
      mandate_ref:REF,
      schema:CONTRACT,
      async finalize({outcome,submission_id}={}) {
        if(completed)fail('mail_reservation_already_finalized');
        completed=true;
        const usage={max_steps:outcome==='submitted'||outcome==='completed'?1:0};
        const result=ledger.settle({reservation_id:reservationId,
          expected_version:ledger.snapshot().version,usage,
          evidence:{schema:CONTRACT,capability,outcome:outcome||'failed',
            actor_ref:caller.actor_ref,recipient:request.to||null,
            correlation_id:request.correlation_id||null,
            subject_hash:request.subject?createHash('sha256').update(request.subject).digest('hex'):null,
            submission_id:typeof submission_id==='string'&&submission_id.length<256?submission_id:null}});
        if(!result.ok)fail('mail_canonical_settlement_unconfirmed');
        return {ok:true,reservation_id:reservationId,usage};
      }
    };
    return decision;
  };
}
