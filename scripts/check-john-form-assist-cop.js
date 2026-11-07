#!/usr/bin/env node
/** Signed fixture, not production Principal approval or hosted browser. */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createSqliteCopEventStore} from '../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {createEventSourcedExecutionBudgetLedger} from '../../inseme/packages/cop-core/src/execution-budget.js';
import {recordMandateControl} from '../../inseme/packages/cop-core/src/governed-act.js';
import {resolveCallerAuth} from './lib/cogentia-mcp-auth.js';
import {runJohnRequest} from './lib/john-run.js';
import {issueFormAssistMandate} from './lib/john-form-assist-issuance.js';
import {FORM_ASSIST_KIND,FORM_ASSIST_MANDATE,FORM_ASSIST_NAMESPACE} from './lib/john-form-assist-mandate.js';
import {RESERVED_ACTIONS,canonicalProposalBytes,proposalHash} from './lib/john-root-mandate.js';
import {sshFingerprint} from './lib/john-sshsig-approval.js';
import {executeJohnCanonicalForm} from './lib/john-cop-form-execution.js';
const dir=mkdtempSync(join(tmpdir(),'form-cop-integration-')),now=new Date('2026-11-06');
try{
 const path=join(dir,'key');assert.equal(spawnSync('ssh-keygen',['-q','-t','rsa','-b','2048','-N','','-f',path]).status,0);
 const pub=readFileSync(path+'.pub','utf8'),fp=sshFingerprint(pub);
 const proposal={kind:FORM_ASSIST_KIND,mandate_id:FORM_ASSIST_MANDATE,version:'v1',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',valid_from:'2026-11-06',valid_until:'2027-11-06',scope:{allowed_actions:['browser.form.fill'],forbidden_actions:[...RESERVED_ACTIONS]},max_delegation_depth:0,budget_limits:{max_steps:512}};
 const proposalPath=join(dir,'proposal');writeFileSync(proposalPath,canonicalProposalBytes(proposal));
 assert.equal(spawnSync('ssh-keygen',['-Y','sign','-f',path,'-n',FORM_ASSIST_NAMESPACE,proposalPath]).status,0);
 const approval={kind:'cogentia.principal-sshsig/v1',principal_ref:'principal:jhn',payload_hash:proposalHash(proposal),key_fingerprint:fp,signature:readFileSync(proposalPath+'.sig','utf8')};
 writeFileSync(join(dir,'allowed'),pub);
 const store=createSqliteCopEventStore(':memory:');try{
 const req={version:'john.request.v1',principal:{id:'principal:jhn'},mandate:{id:'mandate:chatgpt-corpus-coding',version:'v1'},budget:{id:'budget:'+FORM_ASSIST_MANDATE},request_id:'non-issued-form-test',capability:'browser.form.fill',exposure:'bounded',input:{prompt:'fill test field',arguments:{tab_id:1,field_index:0,expected_url:'https://example.org/test',text:'test-value'}},handler:{id:'bounded.once',kind:'capability_once_bounded',allowed_capabilities:['browser.form.fill']},execution_budget:{max_steps:3,max_tool_calls:1,max_internal_effects:1,max_external_effects:0,max_subagents:0,max_elapsed_ms:9000}};
 let invoked=0;
 const rejected=await executeJohnCanonicalForm({store,authorizedKeysPath:join(dir,'allowed'),request:req,run:()=>{invoked++}});
 assert.equal(rejected.ok,false);assert.equal(invoked,0);
 assert.equal(issueFormAssistMandate({store,proposal,approval,trustedSshPublicKey:pub,expectedFingerprint:fp,now}).ok,true);
 const auth=resolveCallerAuth({COGENTIA_MCP_JHN_MUTATE:'1',COGENTIA_MCP_JHN_TOKEN:'fixture'}, {headers:{authorization:'Bearer fixture','x-cogentia-actor':'agent:jhn','x-cogentia-mandate':'mandate:chatgpt-corpus-coding'}});
 const cap={name:'browser.form.fill',risk:'internal_recoverable',kind:'tool',costUnits:1,async execute(){invoked++;return {ok:true,inserted_length:10,submitted:false}}};
 const executed=await executeJohnCanonicalForm({store,auth,request:req,issuerFingerprint:fp,authorizedKeysPath:join(dir,'allowed'),run:async()=>{const ev=await runJohnRequest(req,{capabilities:[cap],allowedCapabilities:['browser.form.fill'],maxInternalEffects:1,approvedBoundedOnceCapability:'browser.form.fill',requiredEvents:false});return ev;}});
 assert.equal(executed.ok,true,JSON.stringify(executed.error));assert.equal(invoked,1);
 assert.equal(executed.settled_steps>=1,true);
 const framed={...req,request_id:'signed-fixture-oopif',input:{...req.input,arguments:{
   ...req.input.arguments,frame_id:'FRAME_0123',expected_frame_origin:'https://auth.example.org'
 }}};
 const framedReceipt=await executeJohnCanonicalForm({store,auth,request:framed,
   issuerFingerprint:fp,authorizedKeysPath:join(dir,'allowed'),run:()=>runJohnRequest(framed,{
     capabilities:[cap],allowedCapabilities:['browser.form.fill'],maxInternalEffects:1,
     approvedBoundedOnceCapability:'browser.form.fill',requiredEvents:false
   })});
 assert.equal(framedReceipt.ok,true,'signed fixture admits scoped iframe form');
 assert.equal(framedReceipt.events.some(e=>e.type==='john.tool.receipt'),true);
 assert.equal(invoked,2);
 assert.equal((await executeJohnCanonicalForm({store,auth,request:req,issuerFingerprint:fp,authorizedKeysPath:join(dir,'allowed'),run:()=>{invoked++}})).error,'canonical_form_request_duplicate');
 assert.equal(invoked,2);
 recordMandateControl(store,{principal_ref:'principal:jhn',mandate_ref:FORM_ASSIST_MANDATE,action:'revoke'});
 assert.equal((await executeJohnCanonicalForm({store,auth,request:{...req,request_id:'after-revoke'},issuerFingerprint:fp,authorizedKeysPath:join(dir,'allowed'),run:()=>{invoked++}})).ok,false);
 assert.equal(invoked,2);
 const ledger=createEventSourcedExecutionBudgetLedger({store,budget_id:'budget:'+FORM_ASSIST_MANDATE,limits:{max_steps:512},require_authority_grant:true});
 assert.equal(ledger.snapshot().has_grant,true);
 console.log(JSON.stringify({no_approval_no_execution:true,signed_fixture_admitted:true,actual_capability_calls:invoked,framed_scoped_receipt:true,settled:ledger.snapshot().settled.max_steps,duplicate_denied:true,revocation_denied:true}));
 }finally{store.close()}
}finally{rmSync(dir,{recursive:true,force:true})}
