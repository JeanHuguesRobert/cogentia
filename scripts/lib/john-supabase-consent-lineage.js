/**
 * Cold-read provenance of an already committed, independently authenticated
 * Supabase Principal consent. Reuses the canonical COP request/decision/
 * consumption event chain rather than treating MandateDeclaration metadata
 * as self-authenticating. Does not call Supabase or issue a new mandate.
 *
 * Trust boundary: Supabase auth was verified at consent time by the protected
 * listener; on cold read, this verifies its exact locally custody-controlled
 * immutable journal evidence, not an exportable Supabase signature.
 */
import {mandateProposalHash} from './cop-proposal-digest.js';
const deny=()=>({verified:false,reason:'supabase_consent_lineage_unverified'});
/** Cold-read evidence for the streamlined one-step Supabase Principal action.
 * The issuer listener validated the human auth token and matched the JHN
 * Supabase user ID to the instance principal_id before appending the intent.
 * The offline reader trusts that existing protected COP event journal, not
 * an agent-controlled claim or an unverified MandateDeclaration alone.
 */
export function verifyJohnSupabaseDirectAmendment({store,prior,current,proposal}={}){
 if(!store?.replay||!store?.listTopic||!prior?.event_id||!current?.event_id||!proposal)
   return deny();
 const a=current.payload?.metadata?.amendment;
 if(a?.approval_scheme!=='supabase_authenticated_owner_direct_intent_v1'||
    typeof a.approval_evidence_ref!=='string')return deny();
 const evidence=store.replay().find(e=>e.event_id===a.approval_evidence_ref);
 if(evidence?.payload?.kind!=='PrincipalAuthenticatedMandateIntent'||
    typeof evidence.topic?.id!=='string'||
    !/^principal-consent:direct:[0-9a-f-]{36}$/.test(evidence.topic.id))
   return deny();
 const history=store.listTopic(evidence.topic.id);
 if(history.length!==1||history[0].event_id!==evidence.event_id||
    evidence.topic.seq!==1||evidence.actor_ref!=='principal:jhn'||
    evidence.subject_ref!=='principal:jhn'||evidence.visibility!=='restricted')
   return deny();
 const p=evidence.payload;
 if(p.principal_ref!==current.payload.principal_ref||
    p.principal_ref!=='principal:jhn'||
    p.mandate_ref!==proposal.mandate_ref||
    p.previous_version!==prior.payload.version||
    p.new_version!==current.payload.version||
    p.payload_hash!==mandateProposalHash(proposal)||
    p.authentication!=='supabase-auth-current-session-and-jhn-instance'||
    p.intent!=='authenticated_owner_request_apply_exact_server_proposal')
   return deny();
 return {verified:true,scheme:'supabase_authenticated_owner_direct_intent_v1',
   evidence_ref:evidence.event_id};
}
export function verifyJohnSupabaseConsentAmendment({store,prior,current,proposal}={}){
 if(!store?.replay||!prior?.event_id||!current?.event_id||!proposal)
   return deny();
 const a=current.payload?.metadata?.amendment;
 if(a?.approval_scheme!=='supabase_authenticated_exact_consent_v1'||
    typeof a.approval_evidence_ref!=='string')return deny();
 const consumed=store.replay().find(e=>e.event_id===a.approval_evidence_ref);
 if(consumed?.payload?.kind!=='PrincipalConsentConsumed')return deny();
 const topic=consumed.topic?.id;
 if(typeof topic!=='string'||!topic.startsWith('principal-consent:'))return deny();
 const history=store.listTopic(topic);
 if(history.length!==3)return deny();
 const [requested,approved,used]=history;
 if(requested.payload?.kind!=='PrincipalConsentRequested'||
    approved.payload?.kind!=='PrincipalConsentApproved'||
    used.payload?.kind!=='PrincipalConsentConsumed'||
    used.event_id!==consumed.event_id)return deny();
 const submitted=requested.payload.proposal;
 if(submitted?.kind!=='cop.mandate-amendment.proposal/v1'||
    JSON.stringify(submitted)!==JSON.stringify(proposal)||
    submitted.previous_event_id!==prior.event_id||
    submitted.new_version!==current.payload.version)return deny();
 const hash=mandateProposalHash(proposal);
 if(requested.payload.payload_hash!==hash||
    approved.payload.payload_hash!==hash||
    used.payload.payload_hash!==hash||
    requested.payload.principal_ref!==current.payload.principal_ref||
    approved.payload.principal_ref!==current.payload.principal_ref||
    requested.payload.action_class!=='cop.mandate.amend'||
    approved.payload.decision!=='approve'||
    approved.payload.channel!=='supabase-auth-session'||
    approved.payload.request_event_id!==requested.event_id||
    used.payload.request_event_id!==requested.event_id||
    used.payload.approved_event_id!==approved.event_id)return deny();
 return {verified:true,scheme:'supabase_authenticated_exact_consent_v1',
    evidence_ref:used.event_id};
}
