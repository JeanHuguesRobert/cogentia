import test from 'node:test';
import assert from 'node:assert/strict';
import {createChatgptTurnCapability,validateChatgptTurnRequest,isChatgptTabUrl}
 from './browser-chatgpt-turn.js';

const tab={id:42,url:'https://chatgpt.com/',title:'ChatGPT'};
function mockSession(calls, tabUrl=tab.url){
 return {
   async withTabLease(id,tabId,fn){calls.push(['lease',id,tabId]);return fn(this)},
   async call(method,args){
     calls.push([method,args]);
     if(method==='tabs.list')return {tabs:[{...tab,url:tabUrl}]};
     if(method==='page.insertText')return {insertedLength:args.text.length,tab:{id:tab.id}};
     if(method==='page.evaluate'){
       if(args.code.includes('composer_found'))return {value:{ok:true,composer_found:true}};
       if(args.code.includes('click_dispatched'))return {value:{ok:true,click_dispatched:true}};
       return {value:{ok:true,assistant_count:1,last_answer:'HELLO',
          generating:false,composer_present:true}};
     }
     throw Error('unknown '+method);
   },
   close(){calls.push(['close'])},
 };
}
test('known host + exact tab, fixed Core script, no caller script injection',async()=>{
 const calls=[];
 const cap=createChatgptTurnCapability({sessionFactory:async()=>mockSession(calls)});
 const r=await cap.execute({action:'submit',tab_id:42,prompt:'Do this'});
 assert.equal(r.submitted,true);
 assert.equal(r.action,'submit');
 assert.equal(calls.filter(x=>x[0]==='page.insertText').length,1);
 assert.equal(calls.filter(x=>x[0]==='page.evaluate').length,2);
 assert.deepEqual(calls[0],['lease','fracta2-hosted',42]);
 assert.equal(calls.at(-1)[0],'close');
 const obs=await cap.execute({action:'observe',tab_id:42});
 assert.equal(obs.last_answer,'HELLO');
});
test('no request to another website, wrong tab or arbitrary input',async()=>{
 assert.equal(isChatgptTabUrl('https://chatgpt.com/'),true);
 assert.equal(isChatgptTabUrl('https://chatgpt.com/c/abc12345'),true);
 assert.equal(isChatgptTabUrl('https://chatgpt.com.evil.example/'),false);
 assert.equal(validateChatgptTurnRequest({action:'submit',tab_id:2,prompt:''}).ok,false);
 let inserted=false;const calls=[];
 const cap=createChatgptTurnCapability({sessionFactory:async()=>mockSession(calls,'https://example.com')});
 await assert.rejects(cap.execute({action:'submit',tab_id:42,prompt:'hello'}),/chatgpt_target_changed/);
 assert.equal(calls.some(x=>x[0]==='page.insertText'),false);
});

test('already drafted prompt can be sent only under exact continuation binding',async()=>{
 const calls=[];const cap=createChatgptTurnCapability({sessionFactory:async()=>mockSession(calls)});
 const id='ctn_chatgpt_browser_'+'a'.repeat(32);
 const sent=await cap.execute({action:'send_draft',tab_id:42,expected_continuation_id:id});
 assert.equal(sent.submitted,true);
 assert.equal(sent.continuation_id,id);
 assert.equal(calls.some(x=>x[0]==='page.insertText'),false);
 assert.equal(calls.filter(x=>x[0]==='page.evaluate').length,1);
 assert.ok(calls.find(x=>x[0]==='page.evaluate')[1].code.includes(id));
 assert.equal(validateChatgptTurnRequest({action:'send_draft',tab_id:42,expected_continuation_id:'other'}).ok,false);
});

test('ensure_tab reuses a free existing ChatGPT editor without creating anything',async()=>{
 const calls=[];
 const mock={
   async call(method,args){
     calls.push([method,args]);
     if(method==='tabs.list')return {tabs:[{id:60,url:'https://example.com/'},
       {id:42,url:'https://chatgpt.com/c/abc12345'}]};
     if(method==='page.evaluate')return {value:{ok:true,composer_present:true,
       composer_chars:1,composer_blank:true,generating:false}};
     throw Error('unexpected '+method);
   },
   async withTabLease(browser,id,fn){calls.push(['lease',id]);return fn(this)},
   close(){}
 };
 const cap=createChatgptTurnCapability({sessionFactory:async()=>mock});
 const result=await cap.execute({action:'ensure_tab'});
 assert.equal(result.reused,true);
 assert.equal(result.created,false);
 assert.equal(result.tab_id,42);
 assert.equal(calls.some(x=>x[0]==='tabs.create'),false);
});

test('ensure_tab creates an unfocused exact-origin tab when no ChatGPT tab exists',async()=>{
 const calls=[];
 let exists=false;
 const mock={
   async call(method,args){
     calls.push([method,args]);
     if(method==='tabs.list')return {tabs:exists?
       [{id:701,url:'https://chatgpt.com/',active:false}]:
       [{id:60,url:'https://example.com/'}]};
     if(method==='tabs.create'){
       assert.equal(args.url,'https://chatgpt.com/');
       assert.equal(args.active,false);
       exists=true;
       return {tab:{id:701,url:args.url}};
     }
     throw Error('unexpected '+method);
   },
   async withTabLease(browser,id,fn){return fn(this)},
   close(){}
 };
 const cap=createChatgptTurnCapability({sessionFactory:async()=>mock});
 const result=await cap.execute({action:'ensure_tab'});
 assert.deepEqual({created:result.created,reused:result.reused,tab_id:result.tab_id},
   {created:true,reused:false,tab_id:701});
 assert.equal(calls.filter(x=>x[0]==='tabs.create').length,1);
});

test('ensure_tab preserves drafts and active generation; rejects caller-controlled targets',async()=>{
 const calls=[];
 let exists=false;
 const mock={
   async call(method,args){
     calls.push([method,args]);
     if(method==='tabs.list')return {tabs:exists?
       [{id:702,url:'https://chatgpt.com/',active:false}]:
       [{id:42,url:'https://chatgpt.com/c/abc12345'},
        {id:43,url:'https://chatgpt.com/c/def12345'}]};
     if(method==='page.evaluate')return {value:{
       ok:true,composer_present:true,composer_chars:26,composer_blank:false,
       generating:args.tabId===43,
     }};
     if(method==='tabs.create'){exists=true;return {tab:{id:702,url:args.url}}}
     throw Error('unexpected '+method);
   },
   async withTabLease(browser,id,fn){return fn(this)},
   close(){}
 };
 const cap=createChatgptTurnCapability({sessionFactory:async()=>mock});
 assert.equal(validateChatgptTurnRequest({
   action:'ensure_tab',tab_id:4}).ok,false);
 assert.equal(validateChatgptTurnRequest({
   action:'ensure_tab',prompt:'send now'}).ok,false);
 const r=await cap.execute({action:'ensure_tab'});
 assert.equal(r.created,true);
 assert.equal(r.tab_id,702);
 assert.equal(calls.filter(x=>x[0]==='tabs.create').length,1);
});

test('ensure_tab must verify the newly created exact domain',async()=>{
 const calls=[];
 const mock={
   async call(method,args){
     calls.push([method,args]);
     if(method==='tabs.list')return {tabs:calls.length===1?[]:
       [{id:702,url:'https://chatgpt.com.evil.invalid/'}]};
     if(method==='tabs.create')return {tab:{id:702,url:'https://chatgpt.com/'}};
     throw Error('unexpected '+method);
   },
   async withTabLease(browser,id,fn){return fn(this)},
   close(){}
 };
 const cap=createChatgptTurnCapability({sessionFactory:async()=>mock});
 await assert.rejects(cap.execute({action:'ensure_tab'}),/chatgpt_created_tab_not_verified/);
});
