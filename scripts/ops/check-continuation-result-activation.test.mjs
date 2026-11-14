import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspect} from './check-continuation-result-activation.mjs';

const base={
 env:'COGENTIA_MCP_JUDGMENT_RESULT_ENABLED=1 COGENTIA_MCP_JUDGMENT_RESULT_PERMITTED_CHANNELS=local-fixture:mcp COGENTIA_MCP_JHN_MUTATE=1 COGENTIA_MCP_JHN_TOKEN=demo-only',
 unitActive:true,startedAfterSource:true,
 mandateStatus:{verified:true,budget:true},anonymousToolVisible:false,
};

test('all readiness gates must pass independently',()=>{
 const ok=inspect(base);assert.equal(ok.ready,true);assert.ok(Object.values(ok.checks).every(x=>x.ok));
 const withoutToken=inspect({...base,env:base.env.replace(' COGENTIA_MCP_JHN_TOKEN=demo-only','')});
 assert.equal(withoutToken.ready,false);
 assert.equal(withoutToken.checks.jhn_authenticated_mutate_configured.ok,false);
 const withoutChannel=inspect({...base,env:base.env.replace(' COGENTIA_MCP_JUDGMENT_RESULT_PERMITTED_CHANNELS=local-fixture:mcp','')});
 assert.equal(withoutChannel.ready,false);
 assert.equal(withoutChannel.checks.allowed_channels_configured.ok,false);
});
test('signed mandate, runtime, tool and budget are separate independent gates',()=>{
 for(const [key,value] of [['mandateStatus',{verified:false,budget:true}],['mandateStatus',{verified:true,budget:false}],
 ['unitActive',false],['startedAfterSource',false],['toolContractRegistered',false]]){
   const state=inspect({...base,[key]:value});
   assert.equal(state.ready,false, key);
 }
});
test('diagnostic never includes credential values',()=>{
 const report=inspect(base);
 assert.equal(JSON.stringify(report).includes('demo-only'),false);
 assert.equal(JSON.stringify(report).includes('local-fixture'),false);
});

test('anonymous catalog omission is expected and never blocks a correctly gated tool',()=>{
 const state=inspect({...base,anonymousToolVisible:false});
 assert.equal(state.ready,true);
 assert.equal(state.discovery.anonymous_public_tool_visible,false);
 assert.equal(state.discovery.authenticated_jhn_tool_visible,'not_checked');
});
