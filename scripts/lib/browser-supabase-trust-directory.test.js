import assert from 'node:assert/strict';
import {createSupabaseTrustDirectory} from './browser-supabase-trust-directory.js';
const principal_id='11111111-1111-4111-8111-111111111111';
const request={instance_slug:'jhn',principal_id,node_id:'fracta2',network_id:'jhn-net'};
const call=[];
const fetcher=async(url)=>{
 const u=new URL(url);call.push(u.pathname+'?'+u.searchParams.get('select'));
 assert.equal(u.searchParams.get('select').includes('value'),false);
 assert.equal(u.pathname.includes('vault'),false);
 return {ok:true,json:async()=>u.pathname.endsWith('instances')?
  [{canonical_slug:'jhn',principal_id,status:'autonomous'}]:[{network_id:'jhn-net',node_id:'fracta2'}]};
};
const directory=createSupabaseTrustDirectory({url:'https://exampleproject.supabase.co',serverKey:'synthetic-test-key-long-enough',fetcher});
assert.deepEqual(await directory.check(request),{bound:true,instance_slug:'jhn',node_id:'fracta2',network_id:'jhn-net'});
assert.equal(call.length,2);
const missing=createSupabaseTrustDirectory({url:'https://exampleproject.supabase.co',serverKey:'synthetic-test-key-long-enough',fetcher:async(url)=>({ok:true,json:async()=>new URL(url).pathname.endsWith('instances')?[{canonical_slug:'jhn',principal_id:null,status:'autonomous'}]:[]})});
assert.deepEqual(await missing.check(request),{bound:false,reason:'principal_identity_unbound'});
assert.deepEqual(await createSupabaseTrustDirectory().check(request),{bound:false,reason:'directory_not_configured'});
assert.deepEqual(await directory.check({...request,principal_id:'fake'}),{bound:false,reason:'directory_assertions_invalid'});
console.log('supabase trust directory: fixtures ok');
