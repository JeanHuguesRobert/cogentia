import assert from 'node:assert/strict';
import {createBrowserCredentialCapabilities} from './browser-credential-capabilities.js';
const t={browser_instance_id:'fixture-hosted',tab_id:7,expected_origin:'https://test.example',credential_ref:'fixture-ref'};
const secret='UNIQUE_FAKE_SECRET_NOT_FOR_LOGS';
const calls=[];
const vault={
 async describe(){return {credential_ref:t.credential_ref,principal_ref:'principal:fixture',origin:t.expected_origin,available_fields:['username','password']};},
 async withSecret(req,fn){calls.push('vault');return fn(secret);}
};
const browser={async fillSecret({target,field,secret:value}){assert.equal(value,secret);assert.equal(field,'password');calls.push('fill');return {ok:true,submitted:false,origin:target.expected_origin,tab_id:target.tab_id,browser_instance_id:target.browser_instance_id,field};}};
const authorize=async({action})=>({authorized:true,principal_ref:'principal:fixture',actor_ref:'agent:fixture',mandate_ref:'mandate:fixture',...(action==='credential.fill'?{effect_authorization_id:'effect:fixture',budget_reservation_id:'budget:fixture'}:{})});
const capabilities=createBrowserCredentialCapabilities({vault,authorize,browser});
assert.deepEqual(await capabilities.lookup(t),{credential_ref:t.credential_ref,origin:t.expected_origin,available_fields:['username','password'],configured:true});
const result=await capabilities.fill({...t,field:'password'});
assert.equal(JSON.stringify(result).includes(secret),false);
assert.deepEqual(calls,['vault','fill']);
const fail=async(fn,code)=>assert.rejects(fn,e=>e.code===code && !JSON.stringify(e).includes(secret));
await fail(()=>createBrowserCredentialCapabilities({vault,browser}).lookup(t),'CREDENTIAL_COP_UNAVAILABLE');
await fail(()=>createBrowserCredentialCapabilities({vault,browser,authorize:async()=>({authorized:true})}).fill({...t,field:'password'}),'CREDENTIAL_AUTHORITY_DENIED');
await fail(()=>capabilities.fill({...t,field:'otp'}),'CREDENTIAL_FIELD_UNSUPPORTED');
await fail(()=>capabilities.fill({...t,expected_origin:'https://test.example/path',field:'password'}),'CREDENTIAL_ORIGIN_INVALID');
await fail(()=>capabilities.fill({...t,expected_origin:'http://test.example',field:'password'}),'CREDENTIAL_ORIGIN_INVALID');
await fail(()=>createBrowserCredentialCapabilities({vault,authorize,browser:{fillSecret:async()=>({ok:true,submitted:true})}}).fill({...t,field:'password'}),'CREDENTIAL_FILL_UNCONFIRMED');
await fail(()=>createBrowserCredentialCapabilities({vault,authorize,browser:{fillSecret:async()=>{throw Error(secret);}}}).fill({...t,field:'password'}),'CREDENTIAL_FILL_FAILED');
console.log('browser credential capabilities: fixtures ok');
