/** Same-process integration of canonical Inseme Vault callback and Cogentia.
 * Synthetic credential and provider; no network, real Vault value or mandate.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {createGovernedProviderSecretUse} from './governed-provider-secret-use.js';
import {createJhnVaultSecretLease} from '../../../inseme/apps/platform/scripts/lib/vault-secret-lease.js';
import {JHN_VAULT_INSTANCE_ID} from '../../../inseme/apps/platform/scripts/lib/vault-catalog.js';

test('Inseme Vault → COP authorize → trusted provider → redacted receipt',async()=>{
  const secret='SYNTHETIC_KEY_123';
  const operations=[];
  const client={from(name){assert.equal(name,'instance_config');return {select(){return {
    eq(){return this;},async single(){operations.push('vault.read');return {data:{
      instance_id:JHN_VAULT_INSTANCE_ID,key:'fixture_key',value:secret,is_secret:true,is_public:false},error:null};}
  };}};}};
  const vault=createJhnVaultSecretLease({client});
  let insideTrustedProvider=false;
  const bridge=createGovernedProviderSecretUse({
    vault,
    providers:{fixture:{credential_ref:'jhn-vault:fixture_key',capability:'fixture.status',
      async invoke({secret:value}){insideTrustedProvider=true;assert.equal(value,secret);
        operations.push('provider.invoke');return {ok:true,untrusted_response:secret};}}},
    async authorize({provider,capability,credential_ref}){operations.push('cop.authorize');return {
      authorized:true,provider,capability,credential_ref,principal_ref:'principal:jhn',
      actor_ref:'agent:fixture',issuer_ref:'issuer:fixture',mandate_ref:'mandate:fixture',
      effect_authorization_id:'effect:fixture',budget_reservation_id:'reserve:fixture'};},
    async settle(){operations.push('cop.settle');},
  });
  const reply=await bridge.invoke({provider:'fixture',capability:'fixture.status',input:{}});
  assert.equal(insideTrustedProvider,true);
  assert.deepEqual(operations,['cop.authorize','vault.read','provider.invoke','cop.settle']);
  assert.equal(reply.values_exposed,false);
  assert.equal(JSON.stringify(reply).includes(secret),false);
});
