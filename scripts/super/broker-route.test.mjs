import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cop-route-'));
const grantFile=path.join(dir,'grants.json');
const sock=path.join(dir,'broker.sock');
process.env.COGENTIA_SEA_STORE_PATH=grantFile;
process.env.COGENTIA_SUPER_AUDIT=path.join(dir,'audit.log');
const {handle}=await import('./broker.mjs');
const {createSuperCopClient}=await import('../lib/super-cop-client.js');
const {createHostCapabilityRouter}=await import('../lib/host-capability-router.js');
const {setAuthorizationStore,mintSideEffectGrantFromPrepared}=await import('../lib/side-effect-authorization.js');
const {createFileStore}=await import('../lib/side-effect-store.js');
const {prepareHostProcessRun}=await import('../lib/host-process-prepare.js');
setAuthorizationStore(createFileStore(grantFile));
test('MCP router -> COP grant -> broker -> COP reservation -> receipt',async()=>{
  const server=net.createServer(conn=>{
    let buffer='';
    conn.on('data',async chunk=>{
      buffer+=chunk;
      if(!buffer.includes('\n'))return;
      const req=JSON.parse(buffer.slice(0,buffer.indexOf('\n')));
      const result=await handle(req);
      conn.end(JSON.stringify(result)+'\n');
    });
  });
  await new Promise(resolve=>server.listen(sock,resolve));
  const router=createHostCapabilityRouter({providerName:'unix-process',cacheKey:'cop-end-to-end',
    privilegedExecutor:createSuperCopClient({socket:sock})});
  const script='printf ROUTE_COP_OK',target='node:fracta2';
  const prepared=prepareHostProcessRun({command:script,target,provider:'unix-process',execution_mode:'super'});
  const grant=mintSideEffectGrantFromPrepared(prepared,{principal:'principal:test',actor:'agent:test',
    mandate_ref:'mandate:test',confirm:prepared.payload_hash});
  const args={command:script,execution_mode:'super'};
  const ctx={actor:'agent:test',principal:'principal:test',mandate:'mandate:test',
    target,provider:'unix-process',authorization:grant,
    auth:{lockers:{private:{write:true},public:{write:true}}}};
  try{
    const result=await router.invoke('host.process.run',args,ctx);
    assert.equal(result.ok,true);
    assert.equal(result.stdout,'ROUTE_COP_OK');
    assert.equal(result.trace.authorization_id,grant.authorization_id);
    assert.ok(JSON.parse(fs.readFileSync(grantFile)).grants[grant.authorization_id].consumed_at);
    await assert.rejects(router.invoke('host.process.run',args,ctx),
      error=>error.error_class==='authorization_replay');
  }finally{
    await router.stop();
    await new Promise(resolve=>server.close(resolve));
  }
});
test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
