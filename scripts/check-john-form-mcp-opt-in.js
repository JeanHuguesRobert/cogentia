#!/usr/bin/env node
/** Current production COP store lacks a form signature: MCP MUST refuse. */
import assert from 'node:assert/strict';
import {createMcpCore} from './lib/cogentia-mcp-core.js';
import {createSqliteCopEventStore} from '../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
const fixtureDir=mkdtempSync(join(tmpdir(),'john-form-no-issuer-'));
const storePath=join(fixtureDir,'cop.sqlite');
const store=createSqliteCopEventStore(storePath);store.close();
const cap='browser.form.fill',token='form-negative-fixture';
const request={version:'john.request.v1',request_id:'form-not-yet-issued-20261106',principal:{id:'principal:jhn'},mandate:{id:'mandate:chatgpt-corpus-coding',version:'v1'},budget:{id:'budget:mandate:jhn:form-assist'},execution_budget:{max_steps:4,max_tool_calls:1,max_subagents:0,max_elapsed_ms:9000,max_internal_effects:1,max_external_effects:0},exposure:'bounded',capability:cap,input:{prompt:'Fill non-secret test field; no form submit',arguments:{tab_id:1,field_index:0,expected_url:'https://example.org/fixture',text:'TEST_ONLY'}},handler:{id:'capability.once.bounded',kind:'capability_once_bounded',allowed_capabilities:[cap]}};
async function call(enabled){
 const core=createMcpCore({COGENTIA_MCP_VIEW:'public',COGENTIA_MCP_JHN_MUTATE:'1',COGENTIA_MCP_JHN_TOKEN:token,COGENTIA_JHN_HOSTED_BROWSER_ENABLED:'1',COGENTIA_JHN_CANONICAL_FORM_ENABLED:enabled?'1':'0',COGENTIA_JHN_CANONICAL_STORE_PATH:storePath,COGENTIA_JHN_ISSUER_AUTHORIZED_KEYS:'/home/ubuntu/.ssh/authorized_keys'});
 const result=await core.handleJsonRpc({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'cogentia_john_run',_meta:{'cogentia.actor':'agent:jhn','cogentia.mandate_ref':'mandate:chatgpt-corpus-coding'},arguments:{request}}},{headers:{authorization:'Bearer '+token},meta:{'cogentia.actor':'agent:jhn','cogentia.mandate_ref':'mandate:chatgpt-corpus-coding'}});
 return result?.result?.structuredContent?.data;
}
const disabled=await call(false),missing=await call(true);
rmSync(fixtureDir,{recursive:true,force:true});
assert.equal(disabled?.ok,false);assert.equal(disabled.failure.code,'canonical_form_not_enabled');
assert.equal(missing?.ok,false);assert.equal(missing.failure.code,'issuer_provenance_unverified');
console.log(JSON.stringify({disabled:disabled.failure.code,unissued:missing.failure.code,execution_denied:true}));
