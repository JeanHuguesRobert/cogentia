import test from 'node:test';
import assert from 'node:assert/strict';
import {createMcpCore} from '../lib/cogentia-mcp-core.js';
const env={COGENTIA_MCP_VIEW:'public',
  COGENTIA_MCP_JHN_MUTATE:'1',COGENTIA_MCP_JHN_TOKEN:'synthetic-token'};
test('hosted-instance directory is private and JHN-attested discoverable',async()=>{
  const core=createMcpCore(env);
  const list=async headers=>(await core.handleJsonRpc({
    jsonrpc:'2.0',id:2,method:'tools/list',params:{}},{headers})).result.tools.map(x=>x.name);
  assert.equal((await list({})).includes('cogentia_instances_directory'),false);
  assert.equal((await list({authorization:'Bearer synthetic-token',
    'x-cogentia-actor':'agent:jhn'})).includes('cogentia_instances_directory'),true);
  const refused=await core.handleJsonRpc({jsonrpc:'2.0',id:3,method:'tools/call',
    params:{name:'cogentia_instances_directory',arguments:{slug:'alice-demo'}}},{headers:{}});
  assert.equal(refused.result.isError,true);
});
