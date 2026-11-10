/**
 * Owner-only COP consent workflow, using the SAME canonical COP event store.
 * A ChatGPT MCP App intent cannot call decide(); only an independently
 * authenticated Supabase Principal session can. Issuer/writer custody must be
 * protected by the hosting process; never expose the returned service as an
 * unauthenticated MCP tool or generic HTTP mutation endpoint.
 *
 * REQUEST is a trusted server-side API, not an agent-supplied mandate grant.
 * DECIDE is an authenticated transaction-level human decision (no grant).
 * APPLY consumes a one-time approved decision and calls the existing Inseme
 * canonical amendment kernel (subject to version/revocation checks).
 */
import {randomUUID} from 'node:crypto';
import {amendMandate,isMandateActive} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {mandateProposalHash} from './cop-proposal-digest.js';
import {createJhnSupabaseMandateApprovalService} from './jhn-supabase-mandate-approval-service.js';
const HASH=/^sha256:[a-f0-9]{64}$/;
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const deny=error=>Object.freeze({ok:false,error,grants_mandate_authority:false});
const topic=id=>`principal-consent:${id}`;
const kind=(event)=>event?.payload?.kind;
function append(store,id,seq,type,payload) {
  try {
    const result=store.append({
      event_type:type,topic:{id:topic(id),seq},actor_ref:'principal:jhn',
      subject_ref:'principal:jhn',visibility:'restricted',
      epistemic_status:type==='PrincipalConsentRequested'?'proposed':'decided',
      idempotency_key:`${type}:${id}`,payload:{kind:type,...payload}
    });
    return result?.ok===true&&!result.duplicate?result:null;
  }catch{return null;}
}
function validatedMandate(store,mandate) {
  let proposal;
  try {
    const draft=amendMandate(store,mandate,{
      verifyPrincipalApproval:p=>{proposal=p;return {verified:false};}
    });
    if(draft.ok||draft.error!=='principal_approval_unverified'||!proposal)return null;
    return proposal;
  } catch{return null;}
}
export function createJhnCanonicalConsentWorkflow({store,adminClient,authClient,clock=()=>new Date()}={}) {
  const approval=createJhnSupabaseMandateApprovalService({
    store,adminClient,authClient,
    verifyExactApproval:async({proposal,payload_hash,presented})=>{
      const id=presented?.challenge_id;
      if(!ID.test(id||''))return {verified:false};
      const history=store.listTopic(topic(id));
      if(history.length!==2||kind(history[0])!=='PrincipalConsentRequested'||
          kind(history[1])!=='PrincipalConsentApproved')return {verified:false};
      const request=history[0].payload;
      if(request.payload_hash!==payload_hash||request.payload_hash!==mandateProposalHash(proposal)||
          request.expires_at<=clock().toISOString()||
          history[1].payload.payload_hash!==payload_hash||
          history[1].payload.request_event_id!==history[0].event_id)return {verified:false};
      // Single-use consumption in the existing canonical append-only topic.
      // An atomic sequence constraint in the store refuses competing consumers.
      const consumed=append(store,id,3,'PrincipalConsentConsumed',{
        payload_hash,approved_event_id:history[1].event_id,
        request_event_id:history[0].event_id
      });
      if(!consumed)return {verified:false};
      return {verified:true,principal_ref:'principal:jhn',payload_hash,
        single_use:true,consumed:true,evidence_ref:consumed.event.event_id,
        scheme:'supabase_authenticated_exact_consent_v1'};
    }
  });
  return Object.freeze({
    /** Review the exact existing mandate without an amendment or a grant.
     * This is a REAL Principal ratification of a real present scope, not a
     * fixture: the recorded decision is advisory-only and cannot be applied
     * as a new COP MandateDeclaration. */
    requestRatification({mandate_ref,ttl_ms=600000}={}) {
      if(!store?.append||!store?.listTopic||!store?.replay)return deny('canonical_store_required');
      if(!Number.isSafeInteger(ttl_ms)||ttl_ms<1000||ttl_ms>600000)return deny('invalid_ttl');
      if(typeof mandate_ref!=='string'||!/^mandate:jhn:[a-z0-9-]{2,80}$/.test(mandate_ref))
        return deny('invalid_mandate_ref');
      const events=store.replay().filter(e=>e.payload?.kind==='MandateDeclaration'&&
        e.payload?.mandate_id===mandate_ref);
      const latest=events.at(-1);
      const row=latest?.payload;
      if(!row||row.status!=='active'||row.principal_ref!=='principal:jhn'||
        !isMandateActive(store,mandate_ref)||
        (row.valid_until&&Date.parse(row.valid_until)<=+clock()))
        return deny('mandate_not_active_or_unverified');
      // A ratification deliberately contains NO target version and can never
      // pass the mandate-amendment kernel (which requires previous_version).
      const proposal={kind:'cop.mandate-ratification.proposal/v1',
        mandate_ref,version:row.version,mandate_event_id:latest.event_id,
        principal_ref:'principal:jhn',logical_agent_ref:row.logical_agent_ref,
        scope:structuredClone(row.scope),valid_from:row.valid_from,
        valid_until:row.valid_until,
        reason:'Revue et ratification du mandat JHN déjà existant ; aucun nouveau pouvoir',
        effects:false,amendment:false};
      const challenge_id=randomUUID(),payload_hash=mandateProposalHash(proposal),
        expires_at=new Date(+clock()+ttl_ms).toISOString();
      const record=append(store,challenge_id,1,'PrincipalConsentRequested',{
        principal_ref:'principal:jhn',payload_hash,proposal,expires_at,
        action_class:'cop.mandate.ratification.no_grant'
      });
      if(!record)return deny('consent_request_append_failed');
      return {ok:true,schema:'cogentia.cop_consent_challenge.v1',challenge_id,
        payload_hash,proposal,expires_at,status:'pending',
        authority:'none',grants_mandate_authority:false};
    },
    // Read-only authentication gate for a protected presentation endpoint.
    authenticate:({session}={})=>approval.inspect({session}),
    /** The trusted issuer supplies this mandate only after resolving the
     * currently active canonical MandateDeclaration and its scope. */
    request({mandate,ttl_ms=300000}={}) {
      if(!store?.append||!store?.listTopic||!store?.replay)return deny('canonical_store_required');
      if(!Number.isSafeInteger(ttl_ms)||ttl_ms<1000||ttl_ms>600000)return deny('invalid_ttl');
      const proposal=validatedMandate(store,mandate);
      if(!proposal)return deny('mandate_proposal_invalid_or_inactive');
      const challenge_id=randomUUID(),payload_hash=mandateProposalHash(proposal);
      const expires_at=new Date(+clock()+ttl_ms).toISOString();
      const record=append(store,challenge_id,1,'PrincipalConsentRequested',{
        principal_ref:'principal:jhn',payload_hash,proposal,expires_at,
        action_class:'cop.mandate.amend'
      });
      if(!record)return deny('consent_request_append_failed');
      return {ok:true,schema:'cogentia.cop_consent_challenge.v1',challenge_id,
        payload_hash,proposal,expires_at,status:'pending',
        authority:'none',grants_mandate_authority:false};
    },
    inspect({challenge_id}={}) {
      if(!ID.test(challenge_id||'')||!store?.listTopic)return deny('invalid_challenge_id');
      const history=store.listTopic(topic(challenge_id));
      if(!history.length||kind(history[0])!=='PrincipalConsentRequested')return deny('challenge_not_found');
      const r=history[0].payload;
      const last=history.at(-1);
      const status=kind(last)==='PrincipalConsentConsumed'?'consumed':
        kind(last)==='PrincipalConsentApproved'?'approved':
        kind(last)==='PrincipalConsentRefused'?'refused':
        r.expires_at<=clock().toISOString()?'expired':'pending';
      return {ok:true,schema:'cogentia.cop_consent_challenge.v1',challenge_id,
        payload_hash:r.payload_hash,proposal:r.proposal,expires_at:r.expires_at,
        status,authority:'none',grants_mandate_authority:false};
    },
    async decide({challenge_id,payload_hash,session,decision}={}) {
      if(!ID.test(challenge_id||'')||!HASH.test(payload_hash||'')||
        !['approve','refuse'].includes(decision))return deny('consent_request_invalid');
      const current=this.inspect({challenge_id});
      if(!current.ok||current.status!=='pending')return deny('challenge_not_pending');
      if(current.payload_hash!==payload_hash)return deny('proposal_hash_mismatch');
      if(current.proposal?.kind==='cop.mandate-ratification.proposal/v1') {
        // Deny consent to a previously shown scope if its mandate was
        // superseded, expired, revoked or otherwise changed in the meantime.
        const events=store.replay().filter(e=>e.payload?.kind==='MandateDeclaration'&&
          e.payload?.mandate_id===current.proposal.mandate_ref);
        const latest=events.at(-1);
        if(!latest||latest.event_id!==current.proposal.mandate_event_id||
          !isMandateActive(store,current.proposal.mandate_ref)||
          (latest.payload.valid_until&&Date.parse(latest.payload.valid_until)<=+clock()))
          return deny('ratification_mandate_changed');
      }
      // Reverify the live human session and the stored JHN principal_id at the
      // moment of the decision; the technical MCP bearer never enters here.
      const identity=await approval.inspect({session});
      if(identity.ok!==true||identity.authenticated!==true||identity.principal_ref!=='principal:jhn')
        return deny('principal_session_unverified');
      if(this.inspect({challenge_id}).status!=='pending')return deny('challenge_not_pending');
      const name=decision==='approve'?'PrincipalConsentApproved':'PrincipalConsentRefused';
      const committed=append(store,challenge_id,2,name,{
        principal_ref:'principal:jhn',payload_hash,
        request_event_id:store.listTopic(topic(challenge_id))[0].event_id,
        channel:'supabase-auth-session',decision
      });
      if(!committed)return deny('consent_conflict_or_replay');
      return {ok:true,schema:'cogentia.cop_consent_decision.v1',
        challenge_id,payload_hash,decision,confirmation_event_id:committed.event.event_id,
        human_authenticated:true,issuer_verified:true,
        grants_mandate_authority:false,execution:false};
    },
    async apply({challenge_id,session}={}) {
      const pending=this.inspect({challenge_id});
      if(!pending.ok||pending.status!=='approved')return deny('approved_challenge_required');
      if(pending.proposal?.kind!=='cop.mandate-amendment.proposal/v1')
        return deny('ratification_never_grants_mandate');
      // Require the same current authenticated JHN Principal at commit time;
      // an untrusted MCP request or previously observed UI message is not enough.
      const result=await approval.amend({session,mandate:{
        mandate_ref:pending.proposal.mandate_ref,
        principal_ref:pending.proposal.principal_ref,
        expected_version:pending.proposal.previous_version,
        scope:pending.proposal.scope,
        reason:pending.proposal.reason,
        valid_from:pending.proposal.valid_from,
        valid_until:pending.proposal.valid_until
      },approval:{challenge_id}});
      return result;
    }
  });
}
