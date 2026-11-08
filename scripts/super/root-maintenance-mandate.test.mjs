import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {canonical} from './principal-effect-issuer.mjs';
import {verifySignedMaintenanceMandate,recordVerifiedMaintenanceMandate,enrollMaintenanceMandate} from './root-maintenance-mandate.mjs';
const now=new Date('2026-11-07T08:00:00Z');
const proposal={kind:'cogentia.maintenance-mandate-proposal/v1',mandate_id:'mandate:jhn:maintenance',version:'v1',principal_ref:'principal:jhn',actor_ref:'agent:jhn',max_delegation_depth:0,scope:{allowed_actions:['service.restart'],execution_mode:'super',target:'node:fracta2',service:'mcp-cogentia.service'},budget_limits:{max_steps:12},valid_from:'2026-11-07T07:00:00Z',valid_until:'2026-11-09T07:00:00Z',reason:'Deploy and maintain Fractanet MCP under signed COP approval'};
test('real SSHSIG maintenance mandate enrols once on canonical SQLite with traceable budget',()=>{
 const dir=mkdtempSync(join(tmpdir(),'jhn-maintenance-sign-'));
 try{
  const key=join(dir,'key'),doc=join(dir,'mandate');
  assert.equal(spawnSync('ssh-keygen',['-q','-t','ed25519','-N','','-f',key]).status,0);
  writeFileSync(doc,canonical(proposal));
  assert.equal(spawnSync('ssh-keygen',['-Y','sign','-n','cogentia-maintenance-mandate-v1','-f',key,doc]).status,0);
  const signature=readFileSync(doc+'.sig','utf8'),trustedPublicKey=readFileSync(key+'.pub','utf8');
  const proof=verifySignedMaintenanceMandate({proposal,signature,trustedPublicKey,now});
  assert.equal(proof.ok,true,JSON.stringify(proof));
  const store=createSqliteCopEventStore(join(dir,'cop.sqlite'));
  try {
   const admitted=recordVerifiedMaintenanceMandate({store,proposal,proof});
   assert.equal(admitted.ok,true,JSON.stringify(admitted));
   assert.equal(store.listTopic('mandate:mandate:jhn:maintenance').length,1);
   assert.equal(store.listTopic('execution-budget:budget:mandate:jhn:maintenance').length,1);
   assert.equal(recordVerifiedMaintenanceMandate({store,proposal,proof}).ok,false);
   assert.equal(recordVerifiedMaintenanceMandate({store,proposal,proof:{...proof,proposal_hash:'sha256:other'}}).ok,false);
  } finally {store.close();}
  assert.equal(verifySignedMaintenanceMandate({proposal:{...proposal,budget_limits:{max_steps:500}},signature,trustedPublicKey,now}).ok,false);
  assert.equal(verifySignedMaintenanceMandate({proposal:{...proposal,budget_limits:{max_steps:13}},signature,trustedPublicKey,now}).ok,false);
  assert.equal(verifySignedMaintenanceMandate({proposal:{...proposal,valid_until:'2026-11-10T07:01:00Z'},signature,trustedPublicKey,now}).ok,false);
  assert.equal(verifySignedMaintenanceMandate({proposal:{...proposal,scope:{...proposal.scope,service:'other.service'}},signature,trustedPublicKey,now}).ok,false);
  assert.equal(verifySignedMaintenanceMandate({proposal:{...proposal,reason:'Modified while signed'},signature,trustedPublicKey,now}).error,'signed_principal_approval_invalid');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('enrolment cannot be performed from ordinary uid',()=>{
 if(process.geteuid?.()===0)return;
 assert.equal(enrollMaintenanceMandate({proposal,signature:'fake'}).error,'root_required');
});
