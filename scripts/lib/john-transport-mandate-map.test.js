import test from 'node:test';import assert from 'node:assert/strict';
import {createMemoryCopEventStore} from '../../../inseme/packages/cop-core/src/cop-event-spool.js';
import {recordMandateDeclaration,recordMandateControl} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {resolveCallerAuth} from './cogentia-mcp-auth.js';
import {createJohnTransportMandateMap} from './john-transport-mandate-map.js';
const alias='mandate:chatgpt-corpus-coding',ref='mandate:jhn:john-root';
const env={COGENTIA_MCP_JHN_MUTATE:'1',COGENTIA_MCP_JHN_TOKEN:'fixture'};
const getAuth=m=>resolveCallerAuth(env,{headers:{authorization:'Bearer fixture','x-cogentia-actor':'agent:jhn','x-cogentia-mandate':m}});
const mapper=createJohnTransportMandateMap({transport_label:alias,mandate_ref:ref,version_pin:'v1',allowed_read_capabilities:['browser.hosted.inspect'],verifyIssuer:()=>({verified:true,principal_ref:'principal:jhn',mandate_ref:ref})});
test('server alias requires existing canonical grant, funded budget and active mandate',()=>{
 const store=createMemoryCopEventStore(),ledger={snapshot:()=>({has_grant:true,mandate_ref:ref,available:{max_steps:3}})};
 const args={auth:getAuth(alias),store,ledger,capability:'browser.hosted.inspect'};
 assert.equal(mapper.inspect(args).error,'issuer_provenance_unverified');
 recordMandateDeclaration(store,{mandate_id:ref,version:'v1',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',scope:{allowed_actions:['browser.hosted.inspect'],forbidden_actions:['payment.execute']}});
 const result=mapper.inspect(args);assert.equal(result.preflight_ok,true,JSON.stringify(result));
 assert.equal(mapper.inspect({...args,ledger:null}).error,'canonical_budget_unavailable');
 assert.equal(result.admitted,false);assert.equal(result.authorized_to_execute,false);assert.equal(result.reservation,null);
 for(const capability of ['gmail.send','payment.execute','browser.hosted.interact','browser.hosted.evaluate'])assert.equal(mapper.inspect({...args,capability}).error,'transport_capability_not_delegated');
 assert.equal(mapper.inspect({...args,auth:{...args.auth}}).error,'authenticated_jhn_caller_required');
 assert.equal(mapper.inspect({...args,auth:getAuth('mandate:other')}).error,'transport_label_mismatch');
 recordMandateControl(store,{principal_ref:'principal:jhn',mandate_ref:ref,action:'revoke'});
 assert.equal(mapper.inspect(args).error,'mandate_inactive');
});
test('wildcards and interactive tools cannot be transport-aliased',()=>{
 for(const cap of ['*','browser.*','browser.hosted.evaluate','browser.hosted.interact','browser.navigation.coordination','gmail.send','browser.fake.read'])
 assert.throws(()=>createJohnTransportMandateMap({transport_label:alias,mandate_ref:ref,version_pin:'v1',allowed_read_capabilities:[cap],verifyIssuer:()=>({verified:true})}),/invalid_server_mandate_mapping/);
});
