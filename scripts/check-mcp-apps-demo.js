#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createMcpCore } from './lib/cogentia-mcp-core.js';
const c = createMcpCore({COGENTIA_MCP_VIEW:'public'});
const rpc=(method,params={})=>c.handleJsonRpc({jsonrpc:'2.0',id:1,method,params});
const tools=(await rpc('tools/list')).result.tools;
const demo=tools.find(t=>t.name==='cogentia_mcp_apps_demo');
assert.equal(demo._meta.ui.resourceUri,'ui://cogentia/fractatest-demo-v3');
assert.deepEqual(demo._meta.ui.visibility,['model','app']);
assert.equal(demo.annotations.readOnlyHint,true);
const resource=(await rpc('resources/read',{uri:demo._meta.ui.resourceUri})).result.contents[0];
assert.equal(resource.mimeType,'text/html;profile=mcp-app');
assert.match(resource.text,/<button id="toggle"/);
assert.match(resource.text, /method:'ui\/initialize'/);
assert.match(resource.text, /method:'ui\/notifications\/initialized'/);
assert.deepEqual(resource._meta.ui.csp.connectDomains,[]);
for (const legacyUri of ['ui://cogentia/fractatest-demo-v2','ui://cogentia/fractatest-demo-v1']) {
  const legacy=(await rpc('resources/read',{uri:legacyUri})).result.contents[0];
  assert.equal(legacy.uri,legacyUri);
  assert.equal(legacy.mimeType,'text/html;profile=mcp-app');
  assert.match(legacy.text,/fractatest-init-v3/);
  assert.match(legacy.text,/appInfo:/);
  assert.doesNotMatch(legacy.text,/clientInfo:/);
  assert.ok((await rpc('resources/list')).result.resources.some(r=>r.uri===legacyUri));
}

const call=(await rpc('tools/call',{name:demo.name,arguments:{}})).result;
assert.equal(call.structuredContent.data.mode,'read_only');
assert.equal(call.structuredContent.data.ok,true);
console.log('MCP Apps local protocol smoke: PASS (tool, ui metadata, resource/read, text fallback, read-only result)');
