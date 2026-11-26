import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {WebSocket} from 'ws';
import {createNavigationGateway} from '../ops/navigation-assistant-gateway.js';
import {createGatewaySession} from './navigation-assistant/gateway-session.js';
import {createHostedBrowserCapabilities} from './hosted-browser-capabilities.js';
import {bindBrowserWorkerContext} from './browser-worker-context.js';

// Actual local gateway and RPC clients; simulated extension and page contexts.
// No production browser, no authority minting, no untrusted script execution.
const source=readFileSync(new URL('../fixtures/browser-worker-probe.js',import.meta.url),'utf8');
const pageUrl='https://worker-fixture.invalid/probe';
const browserId='worker-fixture';
const makePage=(id,storage=new Map())=>{
  const context=vm.createContext({location:{href:pageUrl},host:{
    load:()=>JSON.parse(storage.get('checkpoint')||'null'),
    save:s=>storage.set('checkpoint',JSON.stringify(s))
  },workerId:id});
  vm.runInContext(source,context);
  vm.runInContext(`
    globalThis.worker=createWorker({id:workerId,host,programs:{
      demo({pc,locals,workerLocals,event}) {
        if(pc===0){
          locals.count=(locals.count||0)+1;
          workerLocals.started=(workerLocals.started||0)+1;
          return {status:'waiting',pc:1};
        }
        if(pc===1&&event?.type==='resume')
          return {status:'done',value:locals.count+event.increment};
        return {status:'waiting',pc:1};
      }
    }});
  `,context);
  return {context,storage};
};

test('worker lifecycle, rediscovery, reload, URL pin and tab lease through existing RPC',async()=>{
  const gate=createNavigationGateway({instance:'worker-context-fixture'});
  await gate.listen(0,['127.0.0.1']);
  const base='ws://127.0.0.1:'+gate._bound[0].address().port;
  const pages=new Map([[41,makePage('worker-A')],[42,makePage('worker-B')]]);
  let ext,owner,other,evalCalls=0;
  try {
    ext=new WebSocket(base+'/extension');
    await new Promise((resolve,reject)=>{ext.once('open',resolve);ext.once('error',reject)});
    ext.send(JSON.stringify({jsonrpc:'2.0',id:1,method:'browser.register',params:{browser_instance_id:browserId}}));
    await new Promise(resolve=>ext.once('message',resolve));
    ext.on('message',raw=>{
      const req=JSON.parse(String(raw));
      const reply=result=>ext.send(JSON.stringify({jsonrpc:'2.0',id:req.id,result}));
      const reject=message=>ext.send(JSON.stringify({jsonrpc:'2.0',id:req.id,error:{code:-32602,message}}));
      if(req.method==='tabs.list')return reply({tabs:[...pages.keys()].reverse().map(id=>({id,url:pageUrl,title:'fixture'}))});
      if(req.method!=='page.evaluate')return reject('unknown fixture operation');
      const p=pages.get(req.params.tabId);
      if(!p||req.params.expectedUrl!==pageUrl)return reject('fixture target mismatch');
      evalCalls++;
      try {
        const value=vm.runInContext(req.params.code,p.context,{timeout:100});
        reply({value,tab:{id:req.params.tabId,url:pageUrl}});
      }catch(e){reject(e.message)}
    });
    const caps=createHostedBrowserCapabilities({gateway:base+'/assistant',browserInstanceId:browserId});
    const inspect=caps.find(c=>c.name==='browser.hosted.inspect');
    const evaluate=caps.find(c=>c.name==='browser.hosted.evaluate');
    const ev=async(tab_id,code)=>(await evaluate.execute({tab_id,expected_url:pageUrl,code})).value;
    const find=async id=>{
      const {tabs}=await inspect.execute({action:'tabs',include_url:true});
      const matches=[];
      for(const tab of tabs.filter(t=>t.url===pageUrl))if(await ev(tab.id,'worker.id')===id)matches.push(tab.id);
      if(matches.length!==1)throw Error('worker identity absent or ambiguous');
      return matches[0];
    };
    assert.equal(await find('worker-A'),41);
    assert.equal(await find('worker-B'),42);
    await ev(41,'worker.assign({id:"task-1",program:"demo",locals:{count:10}})');
    const waiting=await ev(41,'worker.step()');
    assert.equal(waiting.task.status,'waiting');
    assert.equal(waiting.task.locals.count,11);
    assert.deepEqual(await ev(41,'worker.step()'),waiting);
    assert.equal((await ev(42,'worker.snapshot()')).task,null);
    // Simulate document replacement: new VM, same tab-local checkpoint.
    pages.set(41,makePage('worker-A',pages.get(41).storage));
    assert.deepEqual(await ev(41,'worker.snapshot()'),waiting);
    assert.equal((await ev(41,'worker.step({type:"resume",increment:5})')).lastResult.value,16);
    await ev(41,'worker.assign({id:"task-2",program:"demo"})');
    assert.equal((await ev(41,'worker.step()')).locals.started,2);
    assert.equal((await ev(41,'worker.step({type:"resume",increment:2})')).lastResult.value,3);
    await assert.rejects(()=>ev(41,'worker.assign({id:"task-1",program:"demo"})'));
    // Simulate a duplicated sessionStorage: ambiguity must never select a tab.
    pages.set(43,makePage('worker-A',new Map(pages.get(41).storage)));
    await assert.rejects(()=>find('worker-A'),/ambiguous/);
    pages.delete(43);
    // A session-bound lease protects the same physical tab from another peer.
    owner=await createGatewaySession(base+'/assistant');
    other=await createGatewaySession(base+'/assistant');
    const target={browser_instance_id:browserId,tabId:41,expectedUrl:pageUrl,code:'worker.id'};
    await owner.withTabLease(browserId,41,async session=>{
      const count=evalCalls;
      await assert.rejects(()=>other.call('page.evaluate',target),e=>e.code===-32026);
      assert.equal(evalCalls,count);
      assert.equal((await session.call('page.evaluate',target)).value,'worker-A');
    });
    assert.equal((await other.call('page.evaluate',target)).value,'worker-A');
    const count=evalCalls;
    await assert.rejects(()=>other.call('page.evaluate',{...target,expectedUrl:'https://wrong.invalid/'}));
    assert.equal(evalCalls,count);
    // Reuse the adapter from an explicitly scoped fixture session.
    const adapter=bindBrowserWorkerContext({session:owner,browserId,expectedUrl:pageUrl,workerId:'worker-A'});
    const locator=await adapter.locate();
    assert.deepEqual(locator,{browserId,tabId:41,workerId:'worker-A'});
    assert.equal((await adapter.invoke({tabId:locator.tabId,method:'snapshot'})).id,'worker-A');
    // Physical incarnation changes while the logical identity/checkpoint remains.
    pages.set(44,makePage('worker-A',pages.get(41).storage));
    pages.set(41,makePage('replacement'));
    await assert.rejects(()=>adapter.invoke({tabId:locator.tabId,method:'assign',args:[{id:'wrong',program:'demo'}]}));
    assert.equal((await ev(41,'worker.snapshot()')).task,null);
    assert.equal((await adapter.locate()).tabId,44);
    await adapter.invoke({tabId:44,method:'assign',args:[{id:'task-3',program:'demo'}]});
    const step=await adapter.invoke({tabId:44,method:'step'});
    assert.equal(step.task.status,'waiting');assert.equal(step.locals.started,3);
    await assert.rejects(()=>adapter.invoke({tabId:44,method:'constructor'}),/invalid/);
    pages.set(45,makePage('worker-A',new Map(pages.get(44).storage)));
    await assert.rejects(()=>adapter.locate(),/ambiguous/);
  } finally { owner?.close();other?.close();ext?.close();await gate.close(); }
});
