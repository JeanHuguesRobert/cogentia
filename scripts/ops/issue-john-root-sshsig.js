#!/usr/bin/env node
/** Narrow first-root issuance. Must be invoked manually at the local host.
 * Never uses MCP tunnel credentials as approval. No auto-mint or key creation.
 */
import {readFileSync,mkdirSync,chmodSync,existsSync,statSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {issueVerifiedJohnRoot} from '../lib/john-root-issuance.js';
import {createOfflineJohnIssuerVerifier} from '../lib/john-offline-issuer-verifier.js';
import {sshFingerprint} from '../lib/john-sshsig-approval.js';
import {proposalHash} from '../lib/john-root-mandate.js';
import {resolveMandate,evaluateMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
const EXPECTED_FINGERPRINT='SHA256:lG9BC3fIjurrBccYLO1w7VQpmc9ZMr8MvM1o3zJ6L3c';
const EXPECTED_HASH='sha256:0e984f4f0f52dee4242e99df60bb910a43ab3d2b10053e5105f0fbbb4fecb7a0';
const REF='mandate:jhn:john-root', CAP='browser.navigation.instances';
const [dbpath,signaturePath,proposalPath,authorizedKeysPath]=process.argv.slice(2);
if(!dbpath||!signaturePath||!proposalPath||!authorizedKeysPath)throw Error('usage: issue-john-root-sshsig.js <canonical.sqlite> <signature> <proposal> <authorized_keys>');
const proposal=JSON.parse(readFileSync(proposalPath,'utf8'));
if(proposalHash(proposal)!==EXPECTED_HASH)throw Error('unexpected_proposal_hash');
const pub=readFileSync(authorizedKeysPath,'utf8').split('\n').find(line=>{try{return sshFingerprint(line)===EXPECTED_FINGERPRINT;}catch{return false;}});
if(!pub)throw Error('trusted_issuer_public_key_unavailable');
const signature=readFileSync(signaturePath,'utf8');
const approval={kind:'cogentia.principal-sshsig/v1',principal_ref:'principal:jhn',payload_hash:EXPECTED_HASH,key_fingerprint:EXPECTED_FINGERPRINT,signature};
const verifyIssuer=createOfflineJohnIssuerVerifier({trustedSshPublicKey:pub,expectedSshFingerprint:EXPECTED_FINGERPRINT});
// Preflight proof BEFORE making persistent state or creating directories.
const {verifyRootSshsig}=await import('../lib/john-sshsig-approval.js');
const proof=verifyRootSshsig({proposal,approval,trustedPublicKey:pub,expectedFingerprint:EXPECTED_FINGERPRINT});
if(!proof.ok)throw Error('principal_signature_invalid:'+proof.error);
const path=resolve(dbpath),dir=dirname(path);
if(existsSync(path))throw Error('existing_canonical_store_requires_explicit_reconciliation');
mkdirSync(dir,{recursive:true,mode:0o700});
if((statSync(dir).mode&0o077)!==0)throw Error('cop_authority_directory_permissions_too_open');
const oldUmask=process.umask(0o077);
let store;
try{
 store=createSqliteCopEventStore(path);
 const issued=issueVerifiedJohnRoot({store,proposal,approval,trustedSshPublicKey:pub,expectedSshFingerprint:EXPECTED_FINGERPRINT});
 if(!issued.ok)throw Error('issuance_refused:'+issued.error);
 const mandate=resolveMandate(store,REF);
 const verifier=verifyIssuer({mandate,mandate_ref:REF});
 const grant=evaluateMandate(store,{mandate_ref:REF,version_pin:'v1',expected_principal_ref:'principal:jhn',expected_actor_ref:'agent:jhn',capability:CAP});
 const ledger=createEventSourcedExecutionBudgetLedger({store,budget_id:'budget:'+REF,limits:{max_steps:2048},require_authority_grant:true});
 const snap=ledger.snapshot();
 if(!verifier.verified||!grant.granted||!snap.has_grant||snap.mandate_ref!==REF||snap.available.max_steps!==2048)throw Error('issued_authority_failed_readback');
 console.log(JSON.stringify({ok:true,issued:true,activated_in_mcp:false,canonical_store:path,mandate_ref:REF,version:'v1',proposal_hash:EXPECTED_HASH,issuer_fingerprint:EXPECTED_FINGERPRINT,event_ids:issued.event_ids,budget:{max_steps:snap.available.max_steps},expiry:proposal.valid_until}));
}finally{store?.close();process.umask(oldUmask);}
