#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createMcpCore} from './lib/cogentia-mcp-core.js';
for (const view of ['public','full']) {
 const core=createMcpCore({COGENTIA_MCP_VIEW:view});
 const rpc=(method,params={})=>core.handleJsonRpc({jsonrpc:'2.0',id:1,method,params});
 const tools=(await rpc('tools/list')).result.tools;
 const tool=tools.find(t=>t.name==='cogentia_cop_approval_preview');
 assert.ok(tool);
 assert.equal(tool._meta.ui.resourceUri,'ui://cogentia/cop-approval-preview-v1');
 assert.equal(tool.annotations?.readOnlyHint,true);
 const read=(await rpc('resources/read',{uri:tool._meta.ui.resourceUri})).result;
 assert.equal(read.ttlMs,0);
 assert.equal(read.cacheScope,'private');
 assert.equal(read.contents[0].mimeType,'text/html;profile=mcp-app');
 assert.match(read.contents[0].text,/appInfo:/);
 assert.match(read.contents[0].text,/Aucune autorisation émise/);
 assert.doesNotMatch(read.contents[0].text,/ui\/call-tool|fetch\(|XMLHttpRequest/);
 const result=(await rpc('tools/call',{name:tool.name,arguments:{}})).result;
 assert.equal(result.structuredContent.data.authorizes,false);
 assert.equal(result.structuredContent.data.grants_authority,false);
 assert.equal(result.structuredContent.data.execution,false);
}
console.log('COP approval preview read-only/no-issuer test: PASS');
