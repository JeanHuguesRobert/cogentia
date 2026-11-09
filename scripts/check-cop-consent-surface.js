#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createMcpCore} from './lib/cogentia-mcp-core.js';
import {copReviewPacket} from './lib/cop-consent-packet.js';
const proposal={kind:'cop.mandate-amendment.proposal/v1',mandate_ref:'mandate:jhn:fixture',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',previous_version:'v1',new_version:'v2',reason:'Synthetic test only',scope:{allowed_actions:['corpus.read']}};
for(const view of ['public','full']){
 const core=createMcpCore({COGENTIA_MCP_VIEW:view,...(view==='full'?{COGENTIA_ADMIN_TOKEN:'fixture-admin'}:{})});
 const rpc=(method,params={})=>core.handleJsonRpc({jsonrpc:'2.0',id:1,method,params});
 const tools=(await rpc('tools/list')).result.tools;
 const entry=tools.find(x=>x.name==='cogentia_cop_consent_review');
 if(view==='public'){assert.equal(entry,undefined);continue;}
 assert.ok(entry,'private view should expose review');
 assert.equal(entry._meta.ui.resourceUri,'ui://cogentia/cop-consent-review-v1');
 assert.equal(entry.annotations?.readOnlyHint,true);
 const res=(await rpc('resources/read',{uri:entry._meta.ui.resourceUri})).result;
 assert.equal(res.contents[0].mimeType,'text/html;profile=mcp-app');
 assert.equal(res.cacheScope,'private');
 assert.match(res.contents[0].text,/ui\/message/);
 assert.match(res.contents[0].text,/confirmation indépendante/);
 assert.doesNotMatch(res.contents[0].text,/fetch\(|XMLHttpRequest|service_role/);
 const response=(await rpc('tools/call',{name:entry.name,arguments:{proposal}})).result;
 const payload=response.structuredContent.data;
 assert.equal(payload.ok,true);assert.equal(payload.source_verified,false);
 assert.equal(payload.grants_mandate_authority,false);
 assert.equal(payload.payload_hash,copReviewPacket(proposal).payload_hash);
 assert.deepEqual(payload.proposal,proposal);
 const bad=(await rpc('tools/call',{name:entry.name,arguments:{proposal:{...proposal,principal_ref:'principal:other'}}}));
 assert.ok(bad.result?.isError||bad.error,'bad principal must fail');
}
console.log('COP consent MCP App: private discovery / resource / review / denial PASS');
