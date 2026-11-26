import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {verifyMcpOAuthToken} from './mcp-oauth-token.js';
import {verifySupabaseWorkDeliveryToken as verify,createSupabaseWorkDeliveryResolver as resolver,
 createOAuthWorkDeliveryResolver,isSupabaseWorkDeliveryToken} from './work-delivery-access.js';

const {publicKey,privateKey}=generateKeyPairSync('ec',{namedCurve:'P-256'});
const jwk={...publicKey.export({format:'jwk'}),kid:'fixture',alg:'ES256',use:'sig'};
const issuer='https://project.fixture.test/auth/v1',audience='https://mcp.fixture.test/mcp';
const nowMs=Date.parse('2026-11-26T19:00:00Z');
const subject='11111111-1111-4111-8111-111111111111';
const clientA='22222222-2222-4222-8222-222222222222';
const clientB='33333333-3333-4333-8333-333333333333';
const clientC='44444444-4444-4444-8444-444444444444';
const opts={issuer,audience,jwksUrl:issuer+'/.well-known/jwks.json',nowMs,
 fetch:async()=>({ok:true,json:async()=>({keys:[jwk]})})};
const base={iss:issuer,aud:audience,sub:subject,exp:Math.floor(nowMs/1000)+600,
 role:'authenticated',is_anonymous:false,scope:'openid email',client_id:clientA};
function token(changes={}){
 const h=Buffer.from(JSON.stringify({alg:'ES256',kid:jwk.kid})).toString('base64url');
 const p=Buffer.from(JSON.stringify({...base,...changes})).toString('base64url');
 const b=h+'.'+p;return b+'.'+sign('sha256',Buffer.from(b),{key:privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url');
}
const contract={schema:'cogentia.work-commissioning/v1',principal_ref:'principal:jhn',
 subject_ref:null,twin_ref:'twin:personal',delivery:{recipient_ref:'principal:jhn',
 destination_ref:'destination:personal',provider_account_ref:null,visibility:'public',mode:'retrieve_by_reference'}};
const delivery={...contract.delivery,subject_ref:contract.subject_ref,twin_ref:contract.twin_ref};
const bindingsJson=JSON.stringify([{issuer,subject,principal:'principal:jhn',work_delivery:[
 {...delivery,client_id:clientA},{...delivery,client_id:clientB},
 {...delivery,client_id:clientC,destination_ref:'destination:collective'}]}]);
const read=resolver({issuer,audience,bindingsJson,now:()=>nowMs});
test('two signed clients of the SAME Supabase user can retrieve an explicitly assigned destination',async()=>{
 const a=await verify(token(),opts),b=await verify(token({client_id:clientB}),opts);
 assert.equal(a.subject,b.subject);
 assert.notEqual(a.claims.client_id,b.claims.client_id);
 assert.equal(read({oauthPrincipal:a,contract}),true);
 assert.equal(read({oauthPrincipal:b,contract}),true);
 assert.equal(read({oauthPrincipal:{...a},contract}),false);
 assert.equal(createOAuthWorkDeliveryResolver({bindingsJson,now:()=>nowMs})({oauthPrincipal:a,contract}),false);
 assert.equal(read({oauthPrincipal:await verify(token({client_id:clientC}),opts),contract}),false);
 for(const c of [{...contract,principal_ref:'principal:other'},{...contract,twin_ref:'twin:collective'},
  {...contract,delivery:{...contract.delivery,provider_account_ref:'account:other'}},
  {...contract,delivery:{...contract.delivery,visibility:'restricted'}}])
   assert.equal(read({oauthPrincipal:a,contract:c}),false);
});
test('no generic audience, non-OAuth session, anonymous user, wrong issuer or administrative role',async()=>{
 for(const c of [{aud:'authenticated'},{aud:[audience,'authenticated']},{client_id:undefined},
  {is_anonymous:true},{is_anonymous:undefined},{role:'service_role'},{sub:'not-uuid'},
  {iss:'https://other.test/auth/v1'},{exp:Math.floor(nowMs/1000)-1}])
  await assert.rejects(verify(token(c),opts));
 await assert.rejects(verify(token({aud:'authenticated'}),{...opts,audience:'authenticated'}));
 await assert.rejects(verify(token(),{...opts,jwksUrl:'https://other.test/jwks'}));
});
test('ordinary verified JWT is not a Supabase delivery profile; expiration and removed entitlement refuse',async()=>{
 const generic=await verifyMcpOAuthToken(token(),opts);
 assert.equal(isSupabaseWorkDeliveryToken(generic),false);
 assert.equal(read({oauthPrincipal:generic,contract}),false);
 const a=await verify(token(),opts);
 assert.equal(resolver({issuer,audience,bindingsJson:'[]',now:()=>nowMs})({oauthPrincipal:a,contract}),false);
 assert.equal(resolver({issuer,audience,bindingsJson,now:()=>nowMs+601000})({oauthPrincipal:a,contract}),false);
 assert.equal(resolver({issuer,audience,bindingsJson:JSON.stringify([...JSON.parse(bindingsJson),...JSON.parse(bindingsJson)]),now:()=>nowMs})({oauthPrincipal:a,contract}),false);
});
