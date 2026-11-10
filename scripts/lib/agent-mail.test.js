import test from 'node:test';
import assert from 'node:assert/strict';
import {createAgentMail} from './agent-mail.js';
import {createMcpCore, MUTATE_TOOLS, PRIVATE_READ_TOOLS, TOOLS} from './cogentia-mcp-core.js';
import {CLI_COMMANDS} from './capability-inventory.js';

const sender='john@mail.fractavolta.com',recipient='john-worker@mail.fractavolta.com';
const session=({address})=>({primaryAccounts:{'urn:ietf:params:jmap:mail':'acct:'+address},accounts:{['acct:'+address]:{name:address}}});
function mocks() {
  const events=[];
  const post=async({address,methodCalls})=>{
    events.push({address,methodCalls});
    const method=methodCalls[0][0];
    if (method==='Identity/get')return {methodResponses:[['Identity/get',{list:[{id:'identity',email:address}]},'i']]};
    if (method==='Mailbox/get')return {methodResponses:[['Mailbox/get',{list:[{id:'draft',role:'drafts'},{id:'inbox',role:'inbox'}]},'b']]};
    if (method==='Email/query')return {methodResponses:[['Email/query',{ids:['msg1']},'q']]};
    if (method==='Email/get')return {methodResponses:[['Email/get',{list:[{id:'msg1',subject:'hi',from:[{email:sender}],to:[{email:recipient}],textBody:[{partId:'p1'}],bodyValues:{p1:{value:'received'}}}]},'g']]};
    return {methodResponses:[
      ['Email/set',{created:{m:{id:'msg1'}}},'e'],
      ['EmailSubmission/set',{created:{s:{id:'sub1'}}},'s'],
      ['Email/set',{destroyed:['msg1']},'s'],
    ]};
  };
  const credentialBroker=async()=>({password:'fixture-secret'});
  const authorize=async x=>x.capability==='agent.mail.send'
    ?{...x,authorized:true,authorization_id:'cop-fixture-1'}
    :{...x,actor:x.agent,authorized:true,principal:'principal:jhn'};
  return {post,events,credentialBroker,authorize,getSession:session};
}
test('local agent message: send uses immediate JMAP workflow with implicit response collision',async()=>{
  const opts=mocks(),mail=createAgentMail(opts);
  assert.equal(mail.status().bindings_configured,true);
  assert.equal(mail.status().ready,false);
  const result=await mail.send({from:sender,to:recipient,subject:'hi',body:'hello',correlation_id:'c1'});
  assert.equal(result.status,'submitted_not_delivery_verified');
  assert.equal(result.authorization_id,'cop-fixture-1');
  const request=opts.events.find(e=>e.methodCalls[0][0]==='Email/set');
  assert.equal(request.methodCalls[1][0],'EmailSubmission/set');
  assert.deepEqual(request.methodCalls[1][1].create.s.envelope.rcptTo,[{email:recipient}]);
  assert.equal(request.methodCalls[0][1].accountId,'acct:'+sender);
});
test('recipient JMAP read is independent and returns message body',async()=>{
  const mail=createAgentMail(mocks());
  const result=await mail.receive({agent:recipient});
  assert.equal(result.messages[0].text,'received');
});
test('nonlocal recipient rejected before any transport or authorization',async()=>{
  const opts=mocks(),mail=createAgentMail(opts);
  await assert.rejects(()=>mail.send({from:sender,to:'any@gmail.com',subject:'hi',body:'x'}),/outside_twin_trust_perimeter/);
  await assert.rejects(()=>mail.send({from:sender,to:'admin@mail.fractavolta.com',subject:'hi',body:'x'}),/agent_mailbox_not_enrolled_in_twin/);
  assert.equal(opts.events.length,0);
});
test('missing broker and COP decision fail closed',async()=>{
  const mail=createAgentMail();
  assert.equal(mail.status().ready,false);
  await assert.rejects(()=>mail.send({from:sender,to:recipient,subject:'x',body:'y'}),/cop_effect_authorization_required/);
  await assert.rejects(()=>mail.receive({agent:sender}),/cop_read_authorization_required/);
});
test('untrusted COP decision cannot authorize a different message',async()=>{
  const opts=mocks();opts.authorize=async()=>({authorized:true,capability:'agent.mail.send',principal:'principal:jhn',actor:sender,to:recipient,subject:'WRONG',body:'hello',correlation_id:'c1',authorization_id:'1'});
  const mail=createAgentMail(opts);
  await assert.rejects(()=>mail.send({from:sender,to:recipient,subject:'hi',body:'hello',correlation_id:'c1'}),/cop_effect_authorization_required/);
  assert.equal(opts.events.length,0);
});
test('MCP and CLI advertise agent mail without anonymous access',async()=>{
  assert.ok(MUTATE_TOOLS.has('cogentia_agent_mail_send'));
  assert.ok(PRIVATE_READ_TOOLS.has('cogentia_agent_mail_receive'));
  for(const name of ['cogentia_agent_mail_status','cogentia_agent_mail_receive','cogentia_agent_mail_send'])assert.ok(TOOLS.some(t=>t.name===name));
  for(const verb of ['agent mail status','agent mail receive','agent mail send'])assert.ok(CLI_COMMANDS.some(c=>c.verb===verb));
  const core=createMcpCore({COGENTIA_MCP_VIEW:'public'});
  const listing=await core.handleJsonRpc({jsonrpc:'2.0',id:1,method:'tools/list',params:{}});
  const names=listing.result.tools.map(t=>t.name);
  assert.ok(!names.includes('cogentia_agent_mail_send'));
  assert.ok(!names.includes('cogentia_agent_mail_receive'));
  assert.ok(!names.includes('cogentia_agent_mail_status'));
  const runtime=await core.callTool('cogentia_agent_mail_send',{from:sender,to:recipient,subject:'x',body:'y'}).then(()=>null,e=>e);
  assert.ok(runtime instanceof Error);
});

// The caller-to-mailbox binding is independent of COP's *effect* admission.
// An authenticated JHN agent may not claim a sibling mailbox by altering args.
import {bindAgentMailCaller} from './agent-mail-auth-binding.js';
import {resolveCallerAuth} from './cogentia-mcp-auth.js';
import {createLocalStalwartCredentialBroker} from './agent-mail-credential-broker.js';
const callerEnv={COGENTIA_MCP_JHN_MUTATE:'1',COGENTIA_MCP_JHN_TOKEN:'test-only'};
const authenticatedCaller=()=>resolveCallerAuth(callerEnv,{headers:{authorization:'Bearer test-only'},meta:{'cogentia.actor':'agent:jhn','cogentia.mandate_ref':'mandate:test'}});
test('real resolved MCP actor is tied to one mailbox',()=>{
  const auth=authenticatedCaller();
  assert.equal(bindAgentMailCaller(auth,'send',{from:sender}).mailbox,sender);
  assert.throws(()=>bindAgentMailCaller(auth,'send',{from:recipient}),/mail_actor_sender_mismatch/);
  assert.throws(()=>bindAgentMailCaller(auth,'receive',{agent:recipient}),/mail_actor_sender_mismatch/);
  assert.throws(()=>bindAgentMailCaller({auth:'jhn',actor:'agent:jhn'},'send',{from:sender}),/mail_verified_jhn_caller_required/);
});
test('broker checks address and file mode, without exposing passwords as result from tool',async()=>{
  const broker=createLocalStalwartCredentialBroker({
    statFile:async()=>({isFile:()=>true,mode:0o100640}),
    reader:async()=>JSON.stringify({[sender]:'test-internal-credential-12345678'})
  });
  assert.equal((await broker(sender)).password,'test-internal-credential-12345678');
  await assert.rejects(()=>broker('evil@example.com'),/outside_twin_trust_perimeter/);
  const bad=createLocalStalwartCredentialBroker({statFile:async()=>({isFile:()=>true,mode:0o100644}),reader:async()=>'{"foo":"bar"}'});
  await assert.rejects(()=>bad(sender),/mail_credential_permissions_invalid/);
});
test('MCP actor claim cannot bypass mail sender binding even when authorizer and broker are present',async()=>{
  const opts=mocks();
  const core=createMcpCore({COGENTIA_MCP_VIEW:'full',COGENTIA_ADMIN_TOKEN:'test-admin',COGENTIA_MCP_ALLOW_MUTATE:'1'},
    {agentMailCredentialBroker:opts.credentialBroker,agentMailAuthorize:async({request})=>opts.authorize(request),agentMailPost:opts.post,agentMailGetSession:opts.getSession});
  await assert.rejects(core.callTool('cogentia_agent_mail_send', {from:recipient,to:sender,subject:'x',body:'y'},
    {auth:authenticatedCaller()}),/mail_actor_sender_mismatch/);
  assert.equal(opts.events.length,0);
});
