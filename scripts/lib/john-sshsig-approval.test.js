import test from 'node:test';import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {ROOT_MANDATE_KIND,RESERVED_ACTIONS,canonicalProposalBytes,proposalHash} from './john-root-mandate.js';
import {verifyRootSshsig,sshFingerprint,SSHSIG_NAMESPACE} from './john-sshsig-approval.js';
import {createOfflineJohnIssuerVerifier} from './john-offline-issuer-verifier.js';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';import {issueVerifiedJohnRoot} from './john-root-issuance.js';
test('OpenSSH RSA signature is bound to exact root mandate, namespace and key',()=>{
 const dir=mkdtempSync(join(tmpdir(),'john-rsa-test-'));try{
 const key=join(dir,'id_rsa');assert.equal(spawnSync('ssh-keygen',['-q','-t','rsa','-b','2048','-N','','-f',key]).status,0);
 const pub=readFileSync(key+'.pub','utf8').trim(),fp=sshFingerprint(pub);
 const proposal={kind:ROOT_MANDATE_KIND,mandate_id:'mandate:jhn:john-root',version:'v1',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',valid_from:'2026-01-01',valid_until:'2027-01-01',scope:{allowed_actions:['browser.hosted.inspect'],forbidden_actions:[...RESERVED_ACTIONS]},max_delegation_depth:1,budget_limits:{max_steps:3}};
 const msg=join(dir,'proposal');writeFileSync(msg,canonicalProposalBytes(proposal));
 assert.equal(spawnSync('ssh-keygen',['-Y','sign','-f',key,'-n',SSHSIG_NAMESPACE,msg]).status,0);
 const approval={kind:'cogentia.principal-sshsig/v1',principal_ref:'principal:jhn',payload_hash:proposalHash(proposal),key_fingerprint:fp,signature:readFileSync(msg+'.sig','utf8')};
 const now=new Date('2026-11-06');assert.equal(verifyRootSshsig({proposal,approval,trustedPublicKey:pub,expectedFingerprint:fp,now}).ok,true);
 assert.equal(verifyRootSshsig({proposal:{...proposal,budget_limits:{max_steps:4}},approval,trustedPublicKey:pub,expectedFingerprint:fp,now}).ok,false);
 assert.equal(verifyRootSshsig({proposal,approval:{...approval,signature:approval.signature.replace('A','B')},trustedPublicKey:pub,expectedFingerprint:fp,now}).ok,false);
 assert.equal(verifyRootSshsig({proposal,approval,trustedPublicKey:pub,expectedFingerprint:'SHA256:wrong',now}).ok,false);
 const store=createSqliteCopEventStore(':memory:');try{
 const issued=issueVerifiedJohnRoot({store,proposal,approval,trustedSshPublicKey:pub,expectedSshFingerprint:fp,now});assert.equal(issued.ok,true,JSON.stringify(issued));assert.equal(store.replay().length,2);
 const declared=store.replay().find(e=>e.payload?.kind==='MandateDeclaration')?.payload;
 const verifier=createOfflineJohnIssuerVerifier({trustedSshPublicKey:pub,expectedSshFingerprint:fp,now:()=>now});
 assert.equal(verifier({mandate:declared,mandate_ref:proposal.mandate_id}).verified,true);
 assert.equal(verifier({mandate:{...declared,scope:{...declared.scope,allowed_actions:['payment.execute']}},mandate_ref:proposal.mandate_id}).verified,false);
 }finally{store.close();}
 }finally{rmSync(dir,{recursive:true,force:true});}
});
