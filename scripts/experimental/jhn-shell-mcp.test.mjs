import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function port() {
  const srv = net.createServer(); srv.listen(0, '127.0.0.1'); await once(srv, 'listening');
  const p = srv.address().port; await new Promise(r=>srv.close(r)); return p;
}
test('temporary MCP supports expanded normal limits and refuses unauthenticated calls', {timeout:10000}, async () => {
  const p = await port(); const dir=await mkdtemp(join(tmpdir(),'jhn-mcp-test-'));
  const token='integration-test-token-0123456789abcdef';
  const child=spawn(process.execPath,[new URL('./jhn-shell-mcp.mjs',import.meta.url).pathname],{
    env:{...process.env,JHN_SHELL_MCP_TOKEN:token,JHN_SHELL_MCP_PORT:String(p),JHN_SHELL_MCP_AUDIT:join(dir,'audit.jsonl')}, stdio:['ignore','pipe','pipe']
  });
  const url=`http://127.0.0.1:${p}/mcp`;
  async function call(body, auth=token) {
    const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${auth}`},body:JSON.stringify(body)});
    return {status:r.status,data:await r.json()};
  }
  try {
    for(let i=0;i<70;i++) {
      if(child.exitCode!==null) throw new Error('server exited');
      try { const r=await call({jsonrpc:'2.0',id:1,method:'ping'}); if(r.status===200) break; } catch {}
      await new Promise(r=>setTimeout(r,25));
    }
    assert.equal((await call({jsonrpc:'2.0',id:1,method:'ping'},'invalid')).status,401);
    const command='printf OK'+' '.repeat(10000);
    const r=await call({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'shell_exec',arguments:{command}}});
    assert.equal(r.status,200); assert.equal(JSON.parse(r.data.result.content[0].text).stdout,'OK');
    const list=await call({jsonrpc:'2.0',id:3,method:'tools/list'});
    assert.equal(list.data.result.tools[0].inputSchema.properties.command.maxLength,32768);
    const audit=await readFile(join(dir,'audit.jsonl'),'utf8');
    assert.match(audit,/"event":"started"/); assert.match(audit,/"event":"finished"/);
  } finally {child.kill('SIGTERM'); await rm(dir,{recursive:true,force:true});}
});
