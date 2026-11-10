#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createMcpCore } from './lib/cogentia-mcp-core.js';
const core=createMcpCore({COGENTIA_MCP_VIEW:'public'});
const rpc=(method,params={})=>core.handleJsonRpc({jsonrpc:'2.0',id:1,method,params});
const tools=(await rpc('tools/list')).result.tools;
const tool=tools.find(t=>t.name==='cogentia_idual_calibration');
assert.ok(tool,'calibration tool is discoverable');
assert.equal(tool._meta.ui.resourceUri,'ui://cogentia/idual-calibration-v1');
assert.equal(tool.annotations.readOnlyHint,true);
const resources=(await rpc('resources/list')).result.resources;
assert.ok(resources.some(r=>r.uri===tool._meta.ui.resourceUri));
const readResult=(await rpc('resources/read',{uri:tool._meta.ui.resourceUri})).result;
const resource=readResult.contents[0];
assert.equal(resource.mimeType,'text/html;profile=mcp-app');
assert.deepEqual(resource._meta.ui.csp.connectDomains,[]);
for(const fragment of ['ui/initialize','ui/notifications/initialized','ui/message',
    'ui/resource-teardown','Demander la séquence',"Noter l'observation",
    'idual.calibration.observation.v1','idual.sequence.request.v1',
    'cool_white','pastel_colors']) assert.ok(resource.text.includes(fragment),fragment);
assert.ok(!resource.text.includes('fetch('),'no browser-side direct network dispatch');
const response=(await rpc('tools/call',{name:tool.name,arguments:{}})).result;
assert.equal(response.structuredContent.data.kind,'cogentia.idual_calibration.v1');
assert.equal(response.structuredContent.data.hardware_dispatch,false);
assert.equal(response.structuredContent.data.physical_effect,false);
assert.equal(response.structuredContent.data.mode,'conversation_mediated');
console.log('iDual MCP calibration app: discovery/resource/tool/interactive-message contract PASS');
