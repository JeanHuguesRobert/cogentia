import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {authenticateOAuthPrincipalSession as auth} from './principal-oauth-session.js';
const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const issuer='https://id.example.test',audience='https://cogentia.example.test/mcp';
const jwk={...publicKey.export({format:'jwk'}),kid:'test',alg:'RS256',use:'sig'};
const nowMs=Date.parse('2026-11-05T12:00:00Z');
const opts={issuer,audience,jwksUrl:issuer+'/jwks',bindingsJson:JSON.stringify([{issuer,subject:'human-subject-123',principal:'principal:jhn'}]),nowMs,fetch:async()=>({ok:true,json:async()=>({keys:[jwk]})})};
function token(changes={}){
 const h=Buffer.from(JSON.stringify({alg:'RS256',kid:'test'})).toString('base64url');
 const p=Buffer.from(JSON.stringify({iss:issuer,aud:audience,sub:'human-subject-123',exp:Math.floor(nowMs/1000)+600,scope:'cogentia.principal.approve',...changes})).toString('base64url');
 const b=h+'.'+p;return b+'.'+sign('RSA-SHA256',Buffer.from(b),privateKey).toString('base64url');
}
test('verified principal OAuth scope authenticates identity without granting mandate',async()=>{
 const r=await auth(token(),opts);assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.principal_ref,'principal:jhn');assert.equal(r.grants_mandate_authority,false);
});
test('read-only token is not approval; wrong subject, audience and expiry refuse',async()=>{
 for(const [t,o] of [[token({scope:'cogentia.private.read'}),opts],
 [token({sub:'agent-jhn'}),opts],[token({aud:'attacker'}),opts],
 [token({exp:Math.floor(nowMs/1000)-5}),opts],
 [token(),{...opts,bindingsJson:'[]'}]]){
  assert.equal((await auth(t,o)).ok,false);
 }
});
test('unsigned asserted principal and missing OAuth config refuse',async()=>{
 assert.equal((await auth('not-a-jwt',opts)).ok,false);
 assert.equal((await auth(token(),{})).error,'oauth_principal_not_configured');
});
