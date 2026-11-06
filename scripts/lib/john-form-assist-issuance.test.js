import test from 'node:test';import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';import {tmpdir} from 'node:os';
import {RESERVED_ACTIONS,canonicalProposalBytes,proposalHash} from './john-root-mandate.js';
import {sshFingerprint} from './john-sshsig-approval.js';
import {FORM_ASSIST_KIND,FORM_ASSIST_MANDATE,FORM_ASSIST_NAMESPACE,verifyFormAssistApproval} from './john-form-assist-mandate.js';
import {issueFormAssistMandate,createFormAssistIssuerVerifier} from './john-form-assist-issuance.js';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {recordMandateControl,resolveMandate,evaluateMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
const now=new Date('2026-11-06T12:00:00Z');
test('distinct signed form-assistance scope is atomic, independently verifiable and revocable',()=>{
 const dir=mkdtempSync(join(tmpdir(),'john-form-sign-'));
 try{
  const key=join(dir,'key');assert.equal(spawnSync('ssh-keygen',['-q','-t','rsa','-b','2048','-N','','-f',key]).status,0);
  const pub=readFileSync(key+'.pub','utf8'),fp=sshFingerprint(pub);
  const proposal={kind:FORM_ASSIST_KIND,mandate_id:FORM_ASSIST_MANDATE,version:'v1',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',valid_from:'2026-11-06',valid_until:'2027-11-06',scope:{allowed_actions:['browser.form.fill'],forbidden_actions:[...RESERVED_ACTIONS]},max_delegation_depth:0,budget_limits:{max_steps:512}};
  const path=join(dir,'proposal');writeFileSync(path,canonicalProposalBytes(proposal));
  assert.equal(spawnSync('ssh-keygen',['-Y','sign','-f',key,'-n',FORM_ASSIST_NAMESPACE,path]).status,0);
  const approval={kind:'cogentia.principal-sshsig/v1',principal_ref:'principal:jhn',payload_hash:proposalHash(proposal),key_fingerprint:fp,signature:readFileSync(path+'.sig','utf8')};
  const args={proposal,approval,trustedSshPublicKey:pub,expectedFingerprint:fp,now};
  assert.equal(verifyFormAssistApproval(args).ok,true);
  assert.equal(verifyFormAssistApproval({...args,proposal:{...proposal,budget_limits:{max_steps:513}}}).ok,false);
  assert.equal(verifyFormAssistApproval({...args,proposal:{...proposal,scope:{...proposal.scope,allowed_actions:['browser.hosted.evaluate']}}}).ok,false);
  assert.equal(verifyFormAssistApproval({...args,expectedFingerprint:'SHA256:wrong'}).ok,false);
  const store=createSqliteCopEventStore(':memory:');try{
   const issued=issueFormAssistMandate({store,...args});assert.equal(issued.ok,true,JSON.stringify(issued));
   assert.equal(issueFormAssistMandate({store,...args}).ok,false);
   const verifier=createFormAssistIssuerVerifier({trustedSshPublicKey:pub,expectedFingerprint:fp,now:()=>now});
   const mandate=resolveMandate(store,FORM_ASSIST_MANDATE);
   assert.equal(verifier({mandate,mandate_ref:FORM_ASSIST_MANDATE}).verified,true);
   assert.equal(verifier({mandate:{...mandate,scope:{...mandate.scope,allowed_actions:['payment.execute']}},mandate_ref:FORM_ASSIST_MANDATE}).verified,false);
   recordMandateControl(store,{principal_ref:'principal:jhn',mandate_ref:FORM_ASSIST_MANDATE,action:'revoke'});
   const denied=evaluateMandate(store,{mandate_ref:FORM_ASSIST_MANDATE,version_pin:'v1',expected_principal_ref:'principal:jhn',expected_actor_ref:'agent:jhn',capability:'browser.form.fill',at_time:now});
   assert.equal(denied.granted,false);
  }finally{store.close()}
 }finally{rmSync(dir,{recursive:true,force:true})}
});
