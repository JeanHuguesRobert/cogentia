import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createMcpCore} from './cogentia-mcp-core.js';
import {resolveVerifiedOAuthContext} from './mcp-oauth-identity.js';
import {verifySupabaseWorkDeliveryToken} from './work-delivery-access.js';

const issuer='https://project.fixture.test/auth/v1';
const audience='https://mcp.fixture.test/mcp';
const subject='11111111-1111-4111-8111-111111111111';
const clientA='22222222-2222-4222-8222-222222222222';
const clientB='33333333-3333-4333-8333-333333333333';
const {publicKey,privateKey}=generateKeyPairSync('ec',{namedCurve:'P-256'});
const jwk={...publicKey.export({format:'jwk'}),kid:'fixture',alg:'ES256',use:'sig'};
const bindings=[{issuer,subject,principal:'principal:jhn',client_ids:[clientA,clientB]}];
const env={COGENTIA_MCP_VIEW:'public',COGENTIA_MCP_OAUTH_PROFILE:'supabase',
 COGENTIA_MCP_OAUTH_ISSUER:issuer,COGENTIA_MCP_OAUTH_RESOURCE:audience,
 COGENTIA_MCP_OAUTH_JWKS_URL:issuer+'/.well-known/jwks.json',
 COGENTIA_MCP_OAUTH_IDENTITY_BINDINGS:JSON.stringify(bindings)};
const options={issuer,audience,jwksUrl:env.COGENTIA_MCP_OAUTH_JWKS_URL,
 fetch:async()=>({ok:true,json:async()=>({keys:[jwk]})})};
const core=createMcpCore(env);
async function proof(changes={}){
 const h=Buffer.from(JSON.stringify({alg:'ES256',kid:jwk.kid})).toString('base64url');
 const p=Buffer.from(JSON.stringify({iss:issuer,aud:audience,sub:subject,
  exp:Math.floor(Date.now()/1000)+600,client_id:clientA,role:'authenticated',
  is_anonymous:false,scope:'openid',...changes})).toString('base64url');
 const s=h+'.'+p;
 return verifySupabaseWorkDeliveryToken(s+'.'+sign('sha256',Buffer.from(s),
  {key:privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url'),options);
}
const rpc=(method,params={},transport={})=>core.handleJsonRpc({jsonrpc:'2.0',id:1,method,params},transport);
const identity=async transport=>(await rpc('tools/call',{name:'cogentia_identity',arguments:{}},transport)).result.structuredContent.data;
test('two explicitly bound signed clients resolve the same Principal with no mandate',async()=>{
 for(const client_id of [clientA,clientB]){
   const a=await proof({client_id});
   const c=await identity({oauthIdentityToken:a,headers:{}});
   assert.deepEqual(c,{authenticated:true,principal_ref:'principal:jhn',authentication:'oauth',
    mandate_ref:null,grants_authority:false});
   const list=(await rpc('tools/list',{}, {oauthIdentityToken:a,headers:{}})).result;
   assert.equal(list._cogentia.allowMutate,false);
   assert.equal(list.tools.some(t=>t.name==='cogentia_host_process_run'),false);
   assert.equal(list.tools.some(t=>t.name==='cogentia_memory_capture'),false);
   assert.deepEqual(list.tools.find(t=>t.name==='cogentia_identity').securitySchemes,
     [{type:'oauth2',scopes:['openid']}]);
   const denied=await rpc('tools/call',{name:'cogentia_host_process_run',arguments:{command:'false'}},{oauthIdentityToken:a,headers:{}});
   assert.equal(denied.result.isError,true);
 }
});
test('anonymous, spoofed headers, copied evidence, unknown clients and subjects remain unbound',async()=>{
 const a=await proof();
 for(const tr of [{},{headers:{'x-cogentia-principal':'principal:jhn'}},
  {oauthIdentityToken:{...a}}, {oauthIdentityToken:await proof({client_id:'44444444-4444-4444-8444-444444444444'})},
  {oauthIdentityToken:await proof({sub:'55555555-5555-4555-8555-555555555555'})}]){
   assert.equal((await identity(tr)).authenticated,false);
 }
 assert.equal(resolveVerifiedOAuthContext(a,JSON.stringify([...bindings,...bindings])),null);
 assert.equal(resolveVerifiedOAuthContext(a,JSON.stringify(bindings),Date.now()+700000),null);
 await assert.rejects(proof({aud:'authenticated'}));
 await assert.rejects(proof({client_id:undefined}));
});
test('OIDC identity is not legacy private-read even if a custom scope appears',async()=>{
 const a=await proof({scope:'openid cogentia.private.read cogentia.mutate'});
 const list=(await rpc('tools/list',{}, {oauthIdentityToken:a,headers:{}})).result;
 assert.equal(list._cogentia.auth,'none');
 assert.equal(list._cogentia.allowMutate,false);
 assert.equal(list.tools.some(t=>t.name==='cogentia_memory_capture'),false);
});
