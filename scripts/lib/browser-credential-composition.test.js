import assert from 'node:assert/strict';
import {createBoundBrowserCredentialCapabilities} from './browser-credential-composition.js';
const t={browser_instance_id:'fracta2-hosted',tab_id:3,expected_origin:'https://example.test',credential_ref:'test-account'};
let browserTouched=false;
const options={
 trustDirectory:{check:async()=>({bound:true})},
 authenticatePrincipal:async()=>({verified:true,principal_ref:'principal:jhn',actor_ref:'agent:jhn',principal_id:'11111111-1111-4111-8111-111111111111',instance_slug:'jhn'}),
 attestNode:async()=>({verified:true,node_id:'fracta2',network_id:'local'}),
 nodeByBrowserInstance:{'fracta2-hosted':{node_id:'fracta2',network_id:'local'}},
 copAuthorize:async({action,target,field,principal_ref})=>({authorized:true,principal_ref,issuer_verified:true,actor_ref:'agent:jhn',mandate_ref:'mandate:fixture',
  browser_instance_id:target.browser_instance_id,tab_id:target.tab_id,origin:target.expected_origin,credential_ref:target.credential_ref,
  ...(action==='credential.fill'?{effect_authorization_id:'effect:fixture',budget_reservation_id:'reservation:fixture',field}:{})}),
 vault:{describe:async()=>({credential_ref:t.credential_ref,origin:t.expected_origin,principal_ref:'principal:jhn',available_fields:['password']}),
  withSecret:async(_,fn)=>fn('fixture-only-nonreal-secret')},
 browser:{fillSecret:async({target,secret,field})=>{assert.equal(secret,'fixture-only-nonreal-secret');browserTouched=true;return {ok:true,submitted:false,origin:target.expected_origin,browser_instance_id:target.browser_instance_id,tab_id:target.tab_id,field};}}
};
const cap=createBoundBrowserCredentialCapabilities(options);
assert.equal((await cap.lookup(t)).configured,true);
assert.equal((await cap.fill({...t,field:'password'})).submitted,false);
assert.equal(browserTouched,true);
browserTouched=false;
const unbound=createBoundBrowserCredentialCapabilities({...options,trustDirectory:{check:async()=>({bound:false})}});
await assert.rejects(()=>unbound.fill({...t,field:'password'}),e=>e.code==='CREDENTIAL_AUTHORITY_DENIED');
assert.equal(browserTouched,false);
const mismatch=createBoundBrowserCredentialCapabilities({...options,vault:{...options.vault,describe:async()=>({credential_ref:t.credential_ref,origin:t.expected_origin,principal_ref:'principal:other',available_fields:['password']})}});
await assert.rejects(()=>mismatch.fill({...t,field:'password'}),e=>e.code==='CREDENTIAL_METADATA_MISMATCH');
assert.equal(browserTouched,false);
console.log('browser bound credential composition: fixtures ok');
