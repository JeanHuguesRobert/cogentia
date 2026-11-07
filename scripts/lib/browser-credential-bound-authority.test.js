import assert from 'node:assert/strict';
import {createCredentialBoundAuthority} from './browser-credential-bound-authority.js';
const principal_id='11111111-1111-4111-8111-111111111111';
const target={browser_instance_id:'fracta2-hosted',tab_id:5,expected_origin:'https://example.org',credential_ref:'fixture'};
const source={
 trustDirectory:{check:async()=>({bound:true})},
 authenticatePrincipal:async()=>({verified:true,principal_ref:'principal:jhn',actor_ref:'agent:jhn',principal_id,instance_slug:'jhn'}),
 attestNode:async()=>({verified:true,node_id:'fracta2',network_id:'trustnet'}),
 copAuthorize:async({action,target,field})=>({authorized:true,principal_ref:'principal:jhn',actor_ref:'agent:jhn',mandate_ref:'mandate:fixture',issuer_verified:true,
  browser_instance_id:target.browser_instance_id,tab_id:target.tab_id,origin:target.expected_origin,credential_ref:target.credential_ref,
  ...(action==='credential.fill'?{field,effect_authorization_id:'effect:fixture',budget_reservation_id:'budget:fixture'}:{})}),
 nodeByBrowserInstance:Object.freeze({'fracta2-hosted':Object.freeze({node_id:'fracta2',network_id:'trustnet'})})
};
const args={action:'credential.fill',target,field:'password'};
assert.equal((await createCredentialBoundAuthority(source)(args)).authorized,true);
for(const change of [
 {trustDirectory:{check:async()=>({bound:false})}},
 {authenticatePrincipal:async()=>({verified:false})},
 {attestNode:async()=>({verified:true,node_id:'other',network_id:'trustnet'})},
 {copAuthorize:async()=>({authorized:true,principal_ref:'principal:jhn'})},
 {nodeByBrowserInstance:{}},
]){
 const result=await createCredentialBoundAuthority({...source,...change})(args);
 assert.deepEqual(result,{authorized:false});
}
assert.deepEqual(await createCredentialBoundAuthority(source)({...args,target:{...target,browser_instance_id:'thinkpad-chrome'}}),{authorized:false});
console.log('browser credential bound authority: fixtures ok');
