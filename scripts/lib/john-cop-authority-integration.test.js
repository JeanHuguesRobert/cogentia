import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {recordMandateControl} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {issueVerifiedJohnRoot} from './john-root-issuance.js';
import {ROOT_MANDATE_KIND,RESERVED_ACTIONS,canonicalProposalBytes,proposalHash,publicKeyFingerprint} from './john-root-mandate.js';
import {resolveCallerAuth} from './cogentia-mcp-auth.js';
import {assessJohnCopAuthority} from './john-cop-authority-preflight.js';
import {createOfflineJohnIssuerVerifier} from './john-offline-issuer-verifier.js';

const keys=generateKeyPairSync('ed25519');
const trustedPublicKeyPem=keys.publicKey.export({type:'spki',format:'pem'});
const mandate_ref='mandate:jhn:john-root';
const proposal={kind:ROOT_MANDATE_KIND,mandate_id:mandate_ref,version:'v1',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',valid_from:'2026-01-01T00:00:00Z',valid_until:'2027-01-01T00:00:00Z',scope:{allowed_actions:['browser.hosted.inspect'],forbidden_actions:[...RESERVED_ACTIONS]},max_delegation_depth:2,budget_limits:{max_steps:3}};
const approval={kind:'cogentia.principal-signature/v1',principal_ref:'principal:jhn',payload_hash:proposalHash(proposal),key_fingerprint:publicKeyFingerprint(trustedPublicKeyPem),signature_base64:sign(null,canonicalProposalBytes(proposal),keys.privateKey).toString('base64')};
const auth=resolveCallerAuth({COGENTIA_MCP_JHN_MUTATE:'1',COGENTIA_MCP_JHN_TOKEN:'test-only'}, {headers:{authorization:'Bearer test-only'},meta:{'cogentia.actor':'agent:jhn','cogentia.mandate_ref':mandate_ref}});
const now=new Date('2026-11-06T13:00:00Z');
const verifyIssuer=createOfflineJohnIssuerVerifier({trustedPublicKeyPem,now:()=>now});

test('canonical Inseme signed issuance, funded preflight, bounded reservation, revocation',()=>{
 const store=createSqliteCopEventStore(':memory:');
 try {
  const issued=issueVerifiedJohnRoot({store,proposal,approval,trustedPublicKeyPem,now});
  assert.equal(issued.ok,true,JSON.stringify(issued));
  const ledger=createEventSourcedExecutionBudgetLedger({store,budget_id:'budget:'+mandate_ref,limits:{max_steps:3},require_authority_grant:true});
  const args={store,auth,mandate_ref,version_pin:'v1',capability:'browser.hosted.inspect',ledger,verifyIssuer,at_time:now};
  const declared=store.replay().find(e=>e.payload?.kind==='MandateDeclaration').payload;
  assert.equal(verifyIssuer({mandate:declared,mandate_ref}).verified,true);
  // Even a writer who can forge event metadata cannot impersonate the signer.
  assert.equal(verifyIssuer({mandate:{...declared,scope:{...declared.scope,allowed_actions:['browser.hosted.inspect','payment.execute']}},mandate_ref}).verified,false);
  assert.equal(verifyIssuer({mandate:{...declared,metadata:{...declared.metadata,signature_base64:'AAAA'}},mandate_ref}).verified,false);
  assert.equal(verifyIssuer({mandate:{...declared,metadata:{...declared.metadata,issuer_fingerprint:'sha256:forged'}},mandate_ref}).verified,false);
  const assessed=assessJohnCopAuthority(args);
  assert.equal(assessed.preflight_ok,true,JSON.stringify(assessed));
  assert.equal(assessed.authorized_to_execute,false);
  const before=ledger.snapshot();
  assert.equal(before.available.max_steps,3);
  const reservation=ledger.reserve({idempotency_key:'john-read-only-fixture',expected_version:before.version,demand:{max_steps:1}});
  assert.equal(reservation.ok,true,JSON.stringify(reservation));
  assert.equal(ledger.snapshot().available.max_steps,2);
  const settled=ledger.settle({reservation_id:reservation.reservation.reservation_id,expected_version:ledger.snapshot().version,usage:{max_steps:1}});
  assert.equal(settled.ok,true,JSON.stringify(settled));
  assert.equal(ledger.snapshot().settled.max_steps,1);
  assert.equal(assessJohnCopAuthority({...args,capability:'payment.execute'}).ok,false);
  recordMandateControl(store,{principal_ref:'principal:jhn',mandate_ref,action:'revoke'});
  assert.equal(assessJohnCopAuthority(args).error,'mandate_inactive');
 } finally {store.close();}
});
