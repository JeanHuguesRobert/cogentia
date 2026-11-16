import test from 'node:test';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createChatgptTurnCapability,validateChatgptTurnRequest,isChatgptTabUrl,canRecoverChatgptFailedDraft,JUDGMENT_TAB_MARKER}
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

test('ensure_tab reuses only an unmarked blank-root ChatGPT editor',async()=>{
 const calls=[];
 const mock={
   async call(method,args){
     calls.push([method,args]);
     if(method==='tabs.list')return {tabs:[{id:60,url:'https://example.com/'},
       {id:42,url:'https://chatgpt.com/',title:'ChatGPT'}]};
     if(method==='page.evaluate')return {value:{ok:true,composer_present:true,
       composer_chars:1,composer_blank:true,generating:false,stable_composer:true}};
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
     if(method==='page.evaluate')return {value:{ok:true,composer_present:true,
       composer_blank:true,generating:false}};
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

test('ensure_tab waits for just-created exact tab to finish navigation (real browser race)',async()=>{
 let lists=0,created=0;
 const remote={
  async call(method){
   if(method==='tabs.create'){
     created++;return {tab:{id:79}};
   }
   if(method==='tabs.list'){
     lists++;
     if(lists===1)return {tabs:[]};
     if(lists<4)return {tabs:[{id:79,url:'about:blank',title:''}]};
     return {tabs:[{id:79,url:'https://chatgpt.com/',title:'ChatGPT'}]};
   }
   if(method==='page.evaluate')return {value:{ok:true,composer_present:true,
     composer_blank:true,generating:false}};
   throw Error('unexpected: '+method);
  },async withTabLease(_browser,_id,run){return run(this)},close(){}
 };
 const cap=createChatgptTurnCapability({sessionFactory:async()=>remote});
 const result=await cap.execute({action:'ensure_tab'});
 assert.equal(result.tab_id,79);
 assert.equal(result.created,true);
 assert.equal(created,1);
 assert.ok(lists>=4);
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
       ok:true,composer_present:true,
       composer_chars:args.tabId===702?0:26,
       composer_blank:args.tabId===702,
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


test('submit waits for transient Send readiness without inserting or clicking twice',async()=>{
 let submits=0,inserts=0;
 const remote={
   async withTabLease(id,tabId,fn){return fn(this)},
   async call(method,args){
     if(method==='tabs.list')return {tabs:[tab]};
     if(method==='page.insertText'){
       inserts++;return {insertedLength:args.text.length,tab:{id:42}};
     }
     if(method==='page.evaluate'){
       if(args.code.includes('composer_found'))return {value:{ok:true,composer_found:true}};
       if(args.code.includes('click_dispatched')){
         submits++;
         return {value:submits<3?{ok:false,error:'send_button_not_ready'}:
           {ok:true,click_dispatched:true}};
       }
     }
     throw Error('unexpected '+method);
   },close(){},
 };
 const cap=createChatgptTurnCapability({sessionFactory:async()=>remote});
 const r=await cap.execute({action:'submit',tab_id:42,prompt:'Bounded test'});
 assert.equal(r.submitted,true);
 assert.equal(inserts,1);
 assert.equal(submits,3);
});

test('submit does not retry a non-transient error or a confirmed click',async()=>{
 let submits=0;
 const remote={
   async withTabLease(id,tabId,fn){return fn(this)},
   async call(method,args){
     if(method==='tabs.list')return {tabs:[tab]};
     if(method==='page.insertText')return {insertedLength:args.text.length,tab:{id:42}};
     if(method==='page.evaluate'){
       if(args.code.includes('composer_found'))return {value:{ok:true,composer_found:true}};
       if(args.code.includes('click_dispatched')){
         submits++;return {value:{ok:false,error:'origin_changed'}};
       }
     }
     throw Error('unexpected');
   },close(){},
 };
 await assert.rejects(createChatgptTurnCapability({sessionFactory:async()=>remote})
   .execute({action:'submit',tab_id:42,prompt:'Never repeat'}),/origin_changed/);
 assert.equal(submits,1);
});


test('bound-draft recovery requires explicit failed-send UI and exact continuation binding',()=>{
 const id='ctn_chatgpt_browser_'+'a'.repeat(32);
 assert.equal(validateChatgptTurnRequest({action:'observe',tab_id:42,
   expected_continuation_id:id}).ok,true);
 assert.equal(validateChatgptTurnRequest({action:'observe',tab_id:42,
   expected_continuation_id:'ctn_fake'}).ok,false);
 const failure={send_failure_visible:true,draft_bound_to_requested_continuation:true,
   composer_present:true,composer_blank:false,generating:false};
 assert.equal(canRecoverChatgptFailedDraft(failure),true);
 for(const field of ['send_failure_visible','draft_bound_to_requested_continuation',
   'composer_present']){
   assert.equal(canRecoverChatgptFailedDraft({...failure,[field]:false}),false);
 }
 assert.equal(canRecoverChatgptFailedDraft({...failure,composer_blank:true}),false);
 assert.equal(canRecoverChatgptFailedDraft({...failure,generating:true}),false);
 assert.equal(canRecoverChatgptFailedDraft({}),false);
});

test('bound observation uses exact literal continuation ID without new browser insertion',async()=>{
 const calls=[],id='ctn_chatgpt_browser_'+'b'.repeat(32);
 const cap=createChatgptTurnCapability({sessionFactory:async()=>mockSession(calls)});
 const result=await cap.execute({action:'observe',tab_id:42,
   expected_continuation_id:id});
 assert.equal(result.action,'observe');
 const evals=calls.filter(x=>x[0]==='page.evaluate');
 assert.equal(evals.length,1);
 assert.equal(evals[0][1].code.includes(JSON.stringify(id)),true);
 assert.equal(calls.some(x=>x[0]==='page.insertText'),false);
});


test('every governed Judgment submission and bound draft recovery marks its browser tab',async()=>{
 assert.equal(JUDGMENT_TAB_MARKER,'[COGENTIA JUDGMENT - NE PAS INTERAGIR]');
 const calls=[],cap=createChatgptTurnCapability({sessionFactory:async()=>mockSession(calls)});
 await cap.execute({action:'submit',tab_id:42,prompt:'CPS packet'});
 await cap.execute({action:'send_draft',tab_id:42,
   expected_continuation_id:'ctn_chatgpt_browser_'+'b'.repeat(32)});
 const submitted=calls.filter(x=>x[0]==='page.evaluate'&&x[1].code.includes('click_dispatched'));
 assert.equal(submitted.length,2);
 for(const call of submitted){
   assert.equal(call[1].code.includes(JUDGMENT_TAB_MARKER),true);
   assert.equal(call[1].code.includes('MutationObserver'),true);
   assert.equal(call[1].code.includes('document.title='),true);
 }
 const observedCalls=[];
 await createChatgptTurnCapability({sessionFactory:async()=>mockSession(observedCalls)})
   .execute({action:'observe',tab_id:42});
 assert.equal(observedCalls.some(x=>x[0]==='page.evaluate'&&x[1].code.includes('document.title=')),false);
});


test('status observation never reads or returns model Output or transcript',async()=>{
 const calls=[];
 const remote={
   async withTabLease(browser,id,fn){return fn(this)},
   async call(method,args){
     calls.push([method,args]);
     if(method==='tabs.list')return {tabs:[tab]};
     if(method==='page.evaluate')return {value:{
       ok:true,composer_present:true,composer_chars:0,composer_blank:true,
       stable_composer:true,generating:false,send_failure_visible:false,
       last_answer:'SECRET_OUTPUT',transcript_answer:'SECRET_OUTPUT',
     }};
     throw Error('unexpected '+method);
   },close(){},
 };
 const cap=createChatgptTurnCapability({sessionFactory:async()=>remote});
 const id='ctn_chatgpt_browser_'+'a'.repeat(32);
 const observed=await cap.execute({action:'status',tab_id:42,
   expected_continuation_id:id});
 assert.equal(observed.action,'status');
 assert.equal(observed.stable_composer,true);
 assert.equal('last_answer' in observed,false);
 assert.equal('transcript_answer' in observed,false);
 const code=calls.find(x=>x[0]==='page.evaluate')[1].code;
 assert.equal(code.includes('SECRET_OUTPUT'),false);
 assert.equal(code.includes('ChatGPT said:'),false);
 assert.equal(code.includes('responseText'),false);
 assert.equal(code.includes("querySelector('main')"),false);
 assert.equal(code.includes(JSON.stringify(id)),true);
 assert.equal(calls.some(x=>x[0]==='page.insertText'),false);
 assert.equal(validateChatgptTurnRequest({action:'status',tab_id:42,
   prompt:'not allowed'}).ok,false);
});

test('ensure_tab never reuses an unmarked personal conversation',async()=>{
 const calls=[];
 let created=false;
 const remote={
   async withTabLease(browser,id,fn){return fn(this)},
   async call(method,args){
     calls.push([method,args]);
     if(method==='tabs.list')return {tabs:created
       ?[{id:100,url:'https://chatgpt.com/c/abc12345',title:'Personal chat'},
         {id:102,url:'https://chatgpt.com/',title:'ChatGPT'}]
       :[{id:100,url:'https://chatgpt.com/c/abc12345',title:'Personal chat'}]};
     if(method==='page.evaluate'){
       assert.notEqual(args.tabId,100,'personal tab must not be probed');
       return {value:{ok:true,composer_present:true,composer_blank:true,
         generating:false}};
     }
     if(method==='tabs.create'){
       created=true;assert.equal(args.active,false);
       return {tab:{id:102,url:'https://chatgpt.com/'}};
     }
     throw Error('unexpected '+method);
   },close(){},
 };
 const cap=createChatgptTurnCapability({sessionFactory:async()=>remote});
 const result=await cap.execute({action:'ensure_tab'});
 assert.equal(result.created,true);
 assert.equal(result.tab_id,102);
 assert.equal(calls.filter(x=>x[0]==='page.evaluate'&&x[1]?.tabId===100).length,0);
});


test('ensure_tab isolates a parked uncertain Judgment conversation even when its editor is empty',async()=>{
 let created=false,probes=0;
 const marked='[COGENTIA JUDGMENT - NE PAS INTERAGIR] | ChatGPT';
 const session={
   async call(method,args){
     if(method==='tabs.list')return {tabs:[
       {id:31,url:'https://chatgpt.com/c/deadbeef1234',title:marked},
       ...(created?[{id:39,url:'https://chatgpt.com/',title:'ChatGPT'}]:[])]};
     if(method==='page.evaluate'){
       probes++;assert.notEqual(args.tabId,31);
       return {value:{ok:true,composer_present:true,composer_chars:0,
         composer_blank:true,generating:false}};
     }
     if(method==='tabs.create'){
       assert.equal(args.url,'https://chatgpt.com/');
       assert.equal(args.active,false);
       created=true;return {tab:{id:39}};
     }
     throw Error('unexpected method: '+method);
   },
   async withTabLease(_browser,_id,run){return run(this)},
   close(){}
 };
 const cap=createChatgptTurnCapability({sessionFactory:async()=>session});
 const result=await cap.execute({action:'ensure_tab'});
 assert.equal(result.created,true);
 assert.equal(result.tab_id,39);
 assert.equal(probes,1,'new root probed; marked conversation not probed');
});


test('ensure_tab waits for hydration of newly created exact-origin root before returning',async()=>{
 let created=false,reads=0;
 const session={
   async call(method,args){
     if(method==='tabs.list')return {tabs:created?
       [{id:305,url:'https://chatgpt.com/',title:'ChatGPT'}]:[]};
     if(method==='tabs.create'){
       created=true;return {tab:{id:305,url:'https://chatgpt.com/'}};
     }
     if(method==='page.evaluate'){
       assert.equal(args.tabId,305);
       assert.equal(args.expectedUrl,'https://chatgpt.com/');
       reads++;
       return {value:{ok:true,composer_present:reads>=3,
         composer_blank:true,generating:false}};
     }
     throw Error('unexpected '+method);
   },
   async withTabLease(_browser,_id,run){return run(this)},
   close(){}
 };
 const cap=createChatgptTurnCapability({sessionFactory:async()=>session});
 const r=await cap.execute({action:'ensure_tab'});
 assert.equal(r.created,true);
 assert.equal(r.editor_ready_observed,true);
 assert.equal(reads,3);
});

test('clear_owned_draft can only remove a canonical, ID-bound draft from an unmarked root',async()=>{
 const id='ctn_chatgpt_browser_1234567890abcdef1234567890abcdef';
 const expected='[COGENTIA JUDGMENT - NE PAS INTERAGIR]\n'+id+'\n'+ 'A'.repeat(150);
 let probes=0;
 const session={
  async call(method,args){
   if(method==='tabs.list')return {tabs:[{id:99,url:'https://chatgpt.com/',title:'ChatGPT'}]};
   if(method==='page.evaluate'){
    probes++;assert.equal(args.expectedUrl,'https://chatgpt.com/');
    assert.equal(args.tabId,99);
    assert.ok(args.code.includes(JSON.stringify(id)));
    assert.ok(args.code.includes(JSON.stringify(expected)));
    assert.ok(args.code.includes('draft_mismatch'));
    assert.ok(args.code.includes('execCommand("delete"'));
    assert.doesNotThrow(()=>new vm.Script(args.code),
      'the ACTUAL browser code must compile after all prompt substitutions');
    assert.equal(args.code.includes('send.click()'),false);
    return {value:{ok:true,cleared:true,originally_matched:true,
      original_char_count:expected.length}};
   }
   throw Error('unexpected '+method);
  },
  async withTabLease(_browser,_id,run){return run(this)},close(){}
 };
 const cap=createChatgptTurnCapability({sessionFactory:async()=>session});
 assert.equal(validateChatgptTurnRequest({action:'clear_owned_draft',tab_id:99,
    expected_continuation_id:id,expected_prompt:expected}).ok,true);
 assert.equal(validateChatgptTurnRequest({action:'clear_owned_draft',tab_id:99,
    expected_continuation_id:id,expected_prompt:'user text'}).ok,false);
 const r=await cap.execute({action:'clear_owned_draft',tab_id:99,
   expected_continuation_id:id,expected_prompt:expected});
 assert.equal(r.cleared,true);assert.equal(probes,1);
});

test('clear_owned_draft cannot edit an existing conversation or a mismatched draft',async()=>{
 const id='ctn_chatgpt_browser_1234567890abcdef1234567890abcdef';
 const expected='[COGENTIA JUDGMENT - NE PAS INTERAGIR]\n'+id+'\n'+'Q'.repeat(120);
 let probes=0;
 const session={
  async call(method){
   if(method==='tabs.list')return {tabs:[
     {id:13,url:'https://chatgpt.com/c/abcde1234567',title:'Personal conversation'},
     {id:14,url:'https://chatgpt.com/',title:'ChatGPT'}]};
   if(method==='page.evaluate'){
    probes++;return {value:{ok:false,error:'draft_mismatch'}};
   }
   throw Error('unexpected '+method);
  },
  async withTabLease(_browser,_id,run){return run(this)},close(){}
 };
 const cap=createChatgptTurnCapability({sessionFactory:async()=>session});
 await assert.rejects(cap.execute({action:'clear_owned_draft',tab_id:13,
   expected_continuation_id:id,expected_prompt:expected}),/owned_draft_requires_unmarked_root/);
 assert.equal(probes,0);
 await assert.rejects(cap.execute({action:'clear_owned_draft',tab_id:14,
   expected_continuation_id:id,expected_prompt:expected}),/draft_mismatch/);
 assert.equal(probes,1);
});
