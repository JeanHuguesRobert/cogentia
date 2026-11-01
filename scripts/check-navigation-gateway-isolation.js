#!/usr/bin/env node
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { createNavigationGateway } from './ops/navigation-assistant-gateway.js';
const gateway=createNavigationGateway({instance:'isolation-test'});
await gateway.listen(0,['127.0.0.1']);
const port=gateway._bound[0].address().port;
function connect(path){return new Promise((resolve,reject)=>{const s=new WebSocket(`ws://127.0.0.1:${port}${path}`);s.received=[];s.on('message',x=>s.received.push(JSON.parse(x.toString())));s.once('open',()=>resolve(s));s.once('error',reject);});}
let sockets=[];
try {
 const e1=await connect('/extension');const e2=await connect('/extension');
 const a1=await connect('/assistant');const a2=await connect('/assistant');
 sockets=[e1,e2,a1,a2];
 e1.send(JSON.stringify({jsonrpc:'2.0',method:'browser.register',params:{browser_instance_id:'hosted'}}));
 e2.send(JSON.stringify({jsonrpc:'2.0',method:'browser.register',params:{browser_instance_id:'thinkpad'}}));
 await new Promise(r=>setTimeout(r,25));
 a1.send(JSON.stringify({jsonrpc:'2.0',id:7,method:'tabs.list',params:{browser_instance_id:'hosted'}}));
 await new Promise(r=>setTimeout(r,50));
 const deliveries=[e1,e2].map(s=>s.received.filter(m=>m.method==='tabs.list').length);
 console.log('routing of one request over two extensions:',JSON.stringify(deliveries));
 assert.deepEqual(deliveries,[1,0],'request must reach precisely one extension');
 const wireId=e1.received.find(m=>m.method==='tabs.list')?.id;
 e1.send(JSON.stringify({jsonrpc:'2.0',id:wireId,result:{tabs:[{title:'confidential'}]}}));
 await new Promise(r=>setTimeout(r,50));
 assert.equal(a1.received.filter(m=>m.result?.tabs).length,1);
 assert.equal(a2.received.filter(m=>m.result?.tabs).length,0,'must not leak private result to second assistant');
 assert.equal(a1.received.find(m=>m.result?.tabs)?.id,7);
 // Same original request id across two assistants must not collide on the wire.
 a1.send(JSON.stringify({jsonrpc:'2.0',id:9,method:'tabs.list',params:{browser_instance_id:'thinkpad'}}));
 a2.send(JSON.stringify({jsonrpc:'2.0',id:9,method:'tabs.list',params:{browser_instance_id:'hosted'}}));
 await new Promise(r=>setTimeout(r,35));
 const wireThinkpad=e2.received.filter(m=>m.method==='tabs.list').at(-1).id;
 const wireHosted=e1.received.filter(m=>m.method==='tabs.list').at(-1).id;
 assert.notEqual(wireThinkpad,wireHosted);
 e2.send(JSON.stringify({jsonrpc:'2.0',id:wireThinkpad,result:{tabs:[{title:'thinkpad-only'}]}}));
 e1.send(JSON.stringify({jsonrpc:'2.0',id:wireHosted,result:{tabs:[{title:'hosted-only'}]}}));
 await new Promise(r=>setTimeout(r,35));
 assert.equal(a1.received.find(m=>m.result?.tabs?.[0]?.title==='thinkpad-only')?.id,9);
 assert.equal(a2.received.find(m=>m.result?.tabs?.[0]?.title==='hosted-only')?.id,9);
 assert.equal(a1.received.filter(m=>m.result?.tabs?.[0]?.title==='hosted-only').length,0);
 assert.equal(a2.received.filter(m=>m.result?.tabs?.[0]?.title==='thinkpad-only').length,0);
 // Ambiguous request must fail closed; it must not be broadcast.
 a1.send(JSON.stringify({jsonrpc:'2.0',id:10,method:'tabs.list',params:{}}));
 await new Promise(r=>setTimeout(r,35));
 assert.equal(a1.received.find(m=>m.id===10)?.error?.code,-32023);
 // Any unsolicited response or notification from an extension stays private.
 e2.send(JSON.stringify({jsonrpc:'2.0',id:987654,result:{tabs:[{title:'unsolicited'}]}}));
 e2.send(JSON.stringify({jsonrpc:'2.0',method:'page.event',params:{secret:'private-event'}}));
 await new Promise(r=>setTimeout(r,35));
 for(const a of [a1,a2]) {
   assert.equal(a.received.filter(m=>m.result?.tabs?.[0]?.title==='unsolicited').length,0);
   assert.equal(a.received.filter(m=>m.params?.secret==='private-event').length,0);
 }
 console.log('2 extensions x 2 assistants: isolated');
} finally {for(const s of sockets)s.close();await gateway.close();}
