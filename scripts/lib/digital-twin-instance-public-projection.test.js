import assert from 'node:assert/strict';
import {loadDigitalTwinInstance} from './digital-twin-engine.js';
const originalFetch=globalThis.fetch;
const instance='11111111-1111-4111-8111-111111111111';
const sentinel='PRIVATE_SHOULD_NEVER_APPEAR';
try {
 let called=0;
 globalThis.fetch=async(url)=>{
  called++;
  const u=new URL(url);
  assert.equal(u.searchParams.get('instance_id'),'eq.'+instance);
  assert.equal(u.searchParams.get('is_secret'),'eq.false');
  assert.equal(u.searchParams.get('is_public'),'eq.true');
  return {ok:true,json:async()=>[
   {key:'bot_name',value:'Safe bot',is_public:true,is_secret:false},
   {key:'password',value:sentinel,is_public:true,is_secret:false},
   {key:'policy_mode',value:sentinel,is_public:false,is_secret:true}
  ]};
 };
 const noBinding=await loadDigitalTwinInstance({instanceId:'jhn-personal',supabaseUrl:'https://example.supabase.co',supabaseKey:'fixture-key'});
 assert.equal(called,0);
 assert.equal(noBinding.supabase_vault.connected,false);
 const bound=await loadDigitalTwinInstance({instanceId:'jhn-personal',supabaseUrl:'https://example.supabase.co',supabaseKey:'fixture-key',supabaseInstanceId:instance});
 assert.equal(called,1);
 assert.equal(bound.bot_name,'Safe bot');
 assert.equal(JSON.stringify(bound).includes(sentinel),false);
 assert.deepEqual(bound.supabase_vault.overrides,{bot_name:'Safe bot'});
 console.log('digital twin public projection: fixtures ok');
}finally{globalThis.fetch=originalFetch;}
