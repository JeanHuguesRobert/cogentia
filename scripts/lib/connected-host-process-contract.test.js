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
