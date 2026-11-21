import test from 'node:test';
import assert from 'node:assert/strict';
import {readHostedInstanceDirectory} from '../lib/hosted-instance-directory.js';
const env={SUPABASE_URL:'https://ndiysuhzmztatpxbkezn.supabase.co',
 SUPABASE_SERVICE_ROLE_KEY:'synthetic'};
test('generic hosted directory returns instance identity and nonsecret configured resources',async()=>{
 const calls=[];
 const fake=async(url,opt)=>{
   const u=new URL(url);const table=u.pathname.split('/').at(-1);
   calls.push({table,query:u.searchParams,headers:opt.headers});
   if(table==='instances')return new Response(JSON.stringify([{
      id:'instance1',canonical_slug:'alice-demo',display_name:'Alice',
      bot_name:'Ophélia',subject_ref:'subject:alice-demo',
      subject_root_ref:'twin:alice-demo',subject_kind:'living_person',
      host_instance_id:'00000000-0000-0000-0000-000000000001',
      status:'provisional',is_claimable:true,principal_id:null
   }]),{status:200});
   return new Response(JSON.stringify([{
     instance_id:'instance1',key:'personal_twin_services',
     value_json:{services:[{kind:'gmail',address:'a@example.invalid',
       status:'declared',access:'not_delegated'}]}
   }]),{status:200});
 };
 const result=await readHostedInstanceDirectory({env,fetchFn:fake,slug:'alice-demo'});
 assert.equal(result.ok,true);assert.equal(result.total,1);
 assert.equal(result.instances[0].principal_bound,false);
 assert.equal(result.instances[0].services[0].access,'not_delegated');
 assert.equal(calls[0].query.get('host_instance_id'),
   'eq.00000000-0000-0000-0000-000000000001');
 assert.equal(calls[1].query.get('is_secret'),'eq.false');
 assert.ok(!JSON.stringify(result).includes('synthetic'));
});
test('fails closed without a private service credential',async()=>{
 const r=await readHostedInstanceDirectory({env:{},fetchFn:async()=>{throw Error('unexpected');}});
 assert.equal(r.error,'jhn_supabase_not_configured');
});
test('rejects arbitrary slug and subject-kind query injection',async()=>{
 assert.equal((await readHostedInstanceDirectory({env,slug:'x);DELETE'})).ok,false);
 assert.equal((await readHostedInstanceDirectory({env,subject_kind:'anything'})).ok,false);
});
