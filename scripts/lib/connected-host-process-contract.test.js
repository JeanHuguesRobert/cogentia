import test from 'node:test';import assert from 'node:assert/strict';
import {createMcpCore} from './cogentia-mcp-core.js';
import {auditConnectedHostProcessContract as audit} from './connected-host-process-contract.js';
const serverTools=createMcpCore({COGENTIA_MCP_VIEW:'full',COGENTIA_ADMIN_TOKEN:'fixture',COGENTIA_MCP_ALLOW_MUTATE:'1'}).tools;
function connected(name){return {name,inputSchema:{properties:{
 command:{type:'string',maxLength:4096},timeout_ms:{type:'integer',maximum:15000,minimum:1},
 target:{type:'string'},provider:{type:'string'},
 }}}}
test('current connected tool schema drift detected at exact missing super parameter',()=>{
 const r=audit({serverTools,connectedTools:['cogentia_host_process_prepare','cogentia_host_process_run'].map(connected)});
 assert.equal(r.ok,false);
 for(const t of r.tools){
  assert.equal(t.status,'contract_drift');
  assert.ok(t.differences.some(x=>x.field==='execution_mode'&&x.kind==='missing_property'));
  assert.ok(t.differences.some(x=>x.field==='timeout_ms'&&x.property==='maximum'));
 }
});
test('same source schema in both surfaces has no drift',()=>{
 const r=audit({serverTools,connectedTools:serverTools});assert.equal(r.ok,true);
});
import {readFileSync} from 'node:fs';
test('connector publication artifact tracks the canonical server without drift',()=>{
 const artifact=JSON.parse(readFileSync(new URL('../../docs/connectors/cogentia-private-host-process-schema.json',import.meta.url),'utf8'));
 const server=createMcpCore({COGENTIA_MCP_VIEW:'full',COGENTIA_ADMIN_TOKEN:'test-admin',COGENTIA_MCP_ALLOW_MUTATE:'1'});
 const report=audit({serverTools:server.tools,connectedTools:artifact.tools});
 assert.equal(report.ok,true,JSON.stringify(report.tools));
 for(const tool of artifact.tools){
  assert.deepEqual(tool.inputSchema.properties.execution_mode.enum,['normal','super']);
  assert.equal(tool.inputSchema.properties.command.maxLength,32768);
  assert.equal(tool.inputSchema.properties.timeout_ms.maximum,120000);
 }
});
