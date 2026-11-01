import test from 'node:test';
import assert from 'node:assert/strict';
import {createSuperSocketExecutor} from './super-socket-executor.js';
const request={command:'id -u', actor:'agent:test',mandate:'mandate:test',target:'node:test',payload_hash:'sha256:test'};
test('credentials must originate from a trusted resolver',async()=>{
  assert.throws(()=>createSuperSocketExecutor(),/trusted_credential_resolver_required/);
  const executor=createSuperSocketExecutor({credentialResolver:async()=>null});
  await assert.rejects(executor.invoke(request),e=>e.error_class==='super_authority_unavailable');
});
test('script and mandate are validated before transport',async()=>{
  let called=false;
  const executor=createSuperSocketExecutor({credentialResolver:async()=>{called=true;return null;}});
  await assert.rejects(executor.invoke({...request,command:''}),e=>e.error_class==='super_authority_unavailable');
  assert.equal(called,false);
});
test('trusted adapter relays one script over the broker protocol',async()=>{
  const {default:net}=await import('node:net');
  const {default:fs}=await import('node:fs');
  const {default:os}=await import('node:os');
  const {default:path}=await import('node:path');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'super-sock-'));
  const socketPath=path.join(dir,'broker.sock');
  let received;
  const server=net.createServer(connection=>{
    let data='';
    connection.on('data',chunk=>{
      data+=chunk.toString();
      if(!data.includes('\n'))return;
      received=JSON.parse(data.slice(0,data.indexOf('\n')));
      connection.end(JSON.stringify({ok:true,stdout:'1001',exit_code:0})+'\n');
    });
  });
  try{
    await new Promise(resolve=>server.listen(socketPath,resolve));
    const adapter=createSuperSocketExecutor({socketPath,credentialResolver:async()=>({
      id:'grant:1',secret:'f'.repeat(64),actor:request.actor,mandate:request.mandate
    })});
    const result=await adapter.invoke(request);
    assert.equal(result.stdout,'1001');
    assert.equal(received.script,request.command);
    assert.equal(received.execution_mode,'super');
    assert.equal(received.mandate,request.mandate);
  }finally{
    await new Promise(resolve=>server.close(resolve));
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
