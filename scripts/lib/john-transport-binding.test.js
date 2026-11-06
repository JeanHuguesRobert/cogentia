import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveCallerAuth} from './cogentia-mcp-auth.js';
import {bindJohnTransportClaims as bind} from './john-transport-binding.js';
const env={COGENTIA_MCP_JHN_MUTATE:'1',COGENTIA_MCP_JHN_TOKEN:'fixture'};
const transport={headers:{authorization:'Bearer fixture','x-cogentia-actor':'agent:jhn','x-cogentia-mandate':'mandate:chatgpt-corpus-coding'}};
const req={principal:{id:'principal:attacker'},mandate:{id:'mandate:attacker',version:'v1'},budget:{id:'budget:unverified'}};
test('authenticated JHN transport replaces caller-supplied identity labels, not budgets',()=>{
 const auth=resolveCallerAuth(env,transport);
 const r=bind(req,auth);
 assert.equal(r.bound,true);
 assert.equal(r.request.principal.id,'principal:jhn');
 assert.equal(r.request.mandate.id,'mandate:chatgpt-corpus-coding');
 assert.equal(r.request.budget.id,'budget:unverified');
 assert.equal(req.principal.id,'principal:attacker');
 assert.equal(req.mandate.id,'mandate:attacker');
});
test('forged auth object, bogus principal and wrong token cannot attach JHN identity',()=>{
 const auth=resolveCallerAuth(env,transport);
 assert.equal(bind(req,{...auth}).bound,false);
 assert.equal(bind(req,resolveCallerAuth(env,{...transport,headers:{...transport.headers,'x-cogentia-principal':'principal:other'}})).bound,false);
 assert.equal(bind(req,resolveCallerAuth(env,{...transport,headers:{...transport.headers,authorization:'Bearer wrong'}})).bound,false);
});
test('historical human label resolves to the same canonical technical Principal reference',()=>{
 const auth=resolveCallerAuth(env,{...transport,headers:{...transport.headers,'x-cogentia-principal':'jean-hugues-noel-robert'}});
 assert.equal(auth.auth,'jhn');
 assert.equal(auth.principal_ref,'principal:jhn');
});
