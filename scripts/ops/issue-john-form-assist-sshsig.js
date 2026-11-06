#!/usr/bin/env node
/** Add separately approved form mandate to EXISTING Inseme COP store. */
import {readFileSync,statSync} from 'node:fs';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {resolveMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {issueFormAssistMandate,createFormAssistIssuerVerifier} from '../lib/john-form-assist-issuance.js';
import {FORM_ASSIST_MANDATE,verifyFormAssistApproval} from '../lib/john-form-assist-mandate.js';
import {sshFingerprint} from '../lib/john-sshsig-approval.js';
import {proposalHash} from '../lib/john-root-mandate.js';
const HASH='sha256:82852d8947fa1b74cd425499cd892e0f53db41de65631be4b00628e03e167536';
const FP='SHA256:lG9BC3fIjurrBccYLO1w7VQpmc9ZMr8MvM1o3zJ6L3c';
const [dbpath,sigpath,proposalpath,keyspath]=process.argv.slice(2);
if(!dbpath||!sigpath||!proposalpath||!keyspath)throw Error('usage: issue-john-form-assist-sshsig.js <existing_store> <signature> <proposal> <authorized_keys>');
const stat=statSync(dbpath);
if(!stat.isFile()||(stat.mode&0o077)!==0)throw Error('protected_existing_canonical_store_required');
const p=JSON.parse(readFileSync(proposalpath,'utf8'));
if(proposalHash(p)!==HASH)throw Error('unexpected_form_proposal_hash');
const trusted=readFileSync(keyspath,'utf8').split('\n').find(line=>{
 try{return sshFingerprint(line)===FP}catch{return false}
});
if(!trusted)throw Error('form_issuer_public_key_unavailable');
const approval={kind:'cogentia.principal-sshsig/v1',principal_ref:'principal:jhn',payload_hash:HASH,key_fingerprint:FP,signature:readFileSync(sigpath,'utf8')};
const proof=verifyFormAssistApproval({proposal:p,approval,trustedSshPublicKey:trusted,expectedFingerprint:FP});
if(!proof.ok)throw Error('personal_form_approval_invalid:'+proof.error);
const store=createSqliteCopEventStore(dbpath);
try{
 const issued=issueFormAssistMandate({store,proposal:p,approval,trustedSshPublicKey:trusted,expectedFingerprint:FP});
 if(!issued.ok)throw Error('form_issuance_refused:'+issued.error);
 const verifier=createFormAssistIssuerVerifier({trustedSshPublicKey:trusted,expectedFingerprint:FP});
 const checked=verifier({mandate:resolveMandate(store,FORM_ASSIST_MANDATE),mandate_ref:FORM_ASSIST_MANDATE});
 const s=createEventSourcedExecutionBudgetLedger({store,budget_id:'budget:'+FORM_ASSIST_MANDATE,limits:{max_steps:512},require_authority_grant:true}).snapshot();
 if(!checked.verified||!s.has_grant||s.available.max_steps!==512)throw Error('form_issued_readback_failed');
 console.log(JSON.stringify({ok:true,activated_in_mcp:false,mandate_ref:FORM_ASSIST_MANDATE,proposal_hash:HASH,event_ids:issued.event_ids,budget_available:s.available.max_steps}));
}finally{store.close()}
