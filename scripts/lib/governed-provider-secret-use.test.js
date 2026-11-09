import assert from 'node:assert/strict';
import test from 'node:test';
import {createGovernedProviderSecretUse} from './governed-provider-secret-use.js';
const SECRET='SECRET_FIXTURE_SHOULD_NOT_ESCAPE';
const ref='jhn-vault:example_token';
const base={provider:'example',capability:'example.read',input:{query:'public'}};
const grant={authorized:true,provider:'example',capability:'example.read',credential_ref:ref,
 principal_ref:'principal:jhn',actor_ref:'agent:jhn',mandate_ref:'mandate:fixture',
 issuer_ref:'issuer:fixture',effect_authorization_id:'auth:fixture',budget_reservation_id:'budget:fixture'};
const events=[];
function build({auth=async()=>grant,execute=async({secret})=>{assert.equal(secret,SECRET);return {ok:true,leak:SECRET}},
   backend={withSecret:async(_,cb)=>{events.push('vault');return cb(SECRET)}},settle=async({outcome})=>events.push(outcome)}={}){
 return createGovernedProviderSecretUse({vault:backend,authorize:auth,settle,providers:{example:{capability:'example.read',credential_ref:ref,invoke:execute}}});
}
test('valid mandated operation returns redacted receipt and settles budget',async()=>{
 events.length=0;const c=build();const r=await c.invoke(base);
 assert.equal(r.values_exposed,false);assert.equal(r.provider,'example');
 assert.equal(JSON.stringify(r).includes(SECRET),false);assert.deepEqual(events,['vault','completed']);
 assert.deepEqual(c.available(),[{name:'example',capability:'example.read',credential_ref:ref}]);
});
test('requires bounded provider binding and independent COP authority',async()=>{
 events.length=0;
 const c=build({auth:async()=>({...grant,issuer_ref:undefined})});
 await assert.rejects(c.invoke(base),e=>e.code==='PROVIDER_AUTHORITY_DENIED');
 assert.deepEqual(events,[]);
 await assert.rejects(c.invoke({...base,provider:'missing'}),e=>e.code==='PROVIDER_NOT_AVAILABLE');
 await assert.rejects(c.invoke({...base,capability:'example.write'}),e=>e.code==='PROVIDER_NOT_AVAILABLE');
 await assert.rejects(c.invoke({...base,input:null}),e=>e.code==='PROVIDER_REQUEST_INVALID');
});
test('fail-closed when adapters are missing and redact backend failures',async()=>{
 await assert.rejects(createGovernedProviderSecretUse({}).invoke(base),e=>e.code==='PROVIDER_NOT_AVAILABLE');
 const c=build({execute:async()=>{throw Error(SECRET)}});
 await assert.rejects(c.invoke(base),e=>e.code==='PROVIDER_EXECUTION_FAILED'&&!JSON.stringify(e).includes(SECRET));
 const bad=build({settle:async()=>{throw Error(SECRET)}});
 await assert.rejects(bad.invoke(base),e=>e.code==='PROVIDER_SETTLEMENT_FAILED'&&!JSON.stringify(e).includes(SECRET));
});
