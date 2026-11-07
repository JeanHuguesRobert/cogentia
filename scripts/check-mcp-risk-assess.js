#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createMcpCore} from './lib/cogentia-mcp-core.js';
const core=createMcpCore({COGENTIA_MCP_VIEW:'public'});
const rpc=(method,params={})=>core.handleJsonRpc({jsonrpc:'2.0',id:1,method,params});
const tools=(await rpc('tools/list')).result.tools;
const tool=tools.find(x=>x.name==='cogentia_risk_assess');
assert.equal(tool.annotations.readOnlyHint,true);
assert.ok(tool.inputSchema.required.includes('ruin_possible'));
const input={objective:'MCP adapter restart',mandate_ref:'mandate:maintenance',expected_gain:'useful',exposure:'bounded',recovery:'verified',independent_recovery:true,ruin_possible:false,uncertain_tail:false,durable_capacity_loss:false,third_party_commitment:false,critical_control_change:false};
const result=await rpc('tools/call',{name:'cogentia_risk_assess',arguments:input});
assert.equal(result.result.structuredContent.data.control,'B');
assert.equal(result.result.structuredContent.data.grants_authority,false);
const nuanced=await rpc('tools/call',{name:'cogentia_risk_assess',arguments:{...input,cognitive_judgment:{position:'very_high',rationale:'Near external dependency threshold'}}});
assert.equal(nuanced.result.structuredContent.data.nuance.label,'B++');
assert.equal(nuanced.result.structuredContent.data.control,'B');
const ruin=await rpc('tools/call',{name:'cogentia_risk_assess',arguments:{...input,ruin_possible:true,expected_gain:'essential'}});
assert.equal(ruin.result.structuredContent.data.control,'C');
console.log('MCP risk advisory smoke: PASS (advertised, read-only, B/C, no authority)');
