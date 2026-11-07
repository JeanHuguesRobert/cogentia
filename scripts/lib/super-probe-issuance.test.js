import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from 'node:fs';
import {join} from 'node:path';import {tmpdir} from 'node:os';import {spawnSync} from 'node:child_process';
import {canonicalProposalBytes} from './john-root-mandate.js';
import {sshFingerprint} from './john-sshsig-approval.js';
import {SUPER_PROBE_NAMESPACE,SUPER_PROBE_MANDATE} from './super-probe-approval.js';
import {issueSignedSuperProbe} from './super-probe-issuance.js';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
const proposal=JSON.parse(readFileSync(new URL('../../research/integration/approvals/jhn-super-probe-2026-11-07.proposal.json',import.meta.url)));
test('signed probe issues exactly one canonical mandate, reserves hard budget, then asks trusted root issuer',()=>{
 const dir=mkdtempSync(join(tmpdir(),'super-one-issuer-'));
 try{
  const key=join(dir,'key'),p=join(dir,'proposal');
  assert.equal(spawnSync('ssh-keygen',['-q','-t','rsa','-b','2048','-N','','-f',key]).status,0);
  writeFileSync(p,canonicalProposalBytes(proposal));
  assert.equal(spawnSync('ssh-keygen',['-Y','sign','-f',key,'-n',SUPER_PROBE_NAMESPACE,p]).status,0);
  const publicKey=readFileSync(key+'.pub','utf8');
  const store=createSqliteCopEventStore(':memory:'),now=new Date('2026-11-07T04:00:00Z');let invoked=0;
  const base={store,proposal,signature:readFileSync(p+'.sig','utf8'),trustedPublicKey:publicKey,
    expectedFingerprint:sshFingerprint(publicKey),now,
    issueRootGrant:({prepared,mandate_ref,authority_origin,budget_reservation_id})=>{
      invoked++;assert.equal(prepared.payload_hash,proposal.effect.payload_hash);
      assert.equal(mandate_ref,SUPER_PROBE_MANDATE);assert.equal(authority_origin,'principal');
      assert.ok(budget_reservation_id);
      return {authorization_id:'fixture_one_use',payload_hash:prepared.payload_hash,
        authority_origin:'principal',mandate_ref,single_use:true};
    }};
  const first=issueSignedSuperProbe(base);assert.equal(first.ok,true,JSON.stringify(first));assert.equal(invoked,1);
  const ledger=createEventSourcedExecutionBudgetLedger({store,budget_id:'budget:'+SUPER_PROBE_MANDATE,limits:{max_steps:1},require_authority_grant:true}).snapshot();
  assert.equal(ledger.available.max_steps,0);assert.equal(ledger.reserved.max_steps,1);
  assert.equal(issueSignedSuperProbe(base).error,'super_probe_already_issued');assert.equal(invoked,1);
  assert.equal(issueSignedSuperProbe({...base,proposal:{...proposal,effect:{...proposal.effect,command:'sudo touch /tmp/unauthorized'}}}).ok,false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
