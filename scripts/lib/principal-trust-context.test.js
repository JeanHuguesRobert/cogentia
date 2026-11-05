import test from 'node:test';import assert from 'node:assert/strict';
import {resolvePrincipalTrust as resolve} from './principal-trust-context.js';
const evidence={channel:'ssh-session',claimed_principal:'principal:jhn'};
const verifier=async e=>({verified:true,channel:e.channel,principal_ref:'principal:jhn',issuer:'sshd:trusted-host',audience:'cogentia:principal-issuer',expires_at:'2026-11-06T00:00:00Z'});
const now=new Date('2026-11-05T12:00:00Z');
test('trusted session attests identity but never mints a mandate',async()=>{
 const r=await resolve({evidence,verifier,now});assert.equal(r.ok,true);assert.equal(r.grants_mandate_authority,false);
});
test('rejects arbitrary claims, wrong issuers, expiry and missing verifier',async()=>{
 assert.equal((await resolve({evidence,now})).error,'trusted_verifier_unavailable');
 assert.equal((await resolve({evidence:{channel:'untrusted-header'},verifier,now})).error,'unsupported_authentication_channel');
 assert.equal((await resolve({evidence,verifier:async()=>({verified:true,principal_ref:'principal:jhn'}),now})).error,'principal_identity_unverified');
 assert.equal((await resolve({evidence,verifier:async e=>({...await verifier(e),audience:'attacker'}),now})).error,'principal_identity_unverified');
 assert.equal((await resolve({evidence,verifier,now:new Date('2026-11-07T00:00:00Z')})).error,'principal_session_expired');
});
