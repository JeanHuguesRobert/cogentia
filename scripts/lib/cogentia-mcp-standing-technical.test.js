import test from "node:test";
import assert from "node:assert/strict";
import {createMcpCore,TOOLS,MUTATE_TOOLS} from "./cogentia-mcp-core.js";
import {resolveCallerAuth} from "./cogentia-mcp-auth.js";
import {MUSEUM_DNS,MUSEUM_RELEASE} from "./john-standing-technical-effects.js";

const auth=()=>resolveCallerAuth({COGENTIA_MCP_JHN_MUTATE:"1",
  COGENTIA_MCP_JHN_TOKEN:"fixture-only"},{
    headers:{authorization:"Bearer fixture-only"},
    meta:{"cogentia.actor":"agent:jhn",
      "cogentia.mandate_ref":"mandate:chatgpt-corpus-coding"},
  });
test("semantic tools are gated mutations and expose no arbitrary record or shell",async()=>{
  for(const name of ["cogentia_dns_record_ensure","cogentia_site_static_release"]) {
    assert.equal(MUTATE_TOOLS.has(name),true);
    const contract=TOOLS.find(t=>t.name===name);
    assert.ok(contract);
    assert.deepEqual(contract.inputSchema.required,["site"]);
    assert.deepEqual(contract.inputSchema.properties.site.enum,["museum"]);
    assert.equal(contract.inputSchema.additionalProperties,false);
  }
  let calls=0;
  const core=createMcpCore({COGENTIA_MCP_VIEW:"public"},{
    standingTechnicalEffects:{
      async ensureDns(input){calls++;assert.equal(input.effect,MUSEUM_DNS);
        assert.equal(input.auth.auth,"jhn");return {ok:true,origin:"fixture-dns"};},
      async releaseSite(input){calls++;assert.equal(input.effect,MUSEUM_RELEASE);
        return {ok:true,origin:"fixture-site"};},
    },
  });
  const principal=auth();
  assert.equal((await core.callTool("cogentia_dns_record_ensure",{site:"museum"},{auth:principal})).ok,true);
  assert.equal((await core.callTool("cogentia_site_static_release",{site:"museum"},{auth:principal})).ok,true);
  assert.equal(calls,2);
  for(const [name,bad] of [
    ["cogentia_dns_record_ensure",{site:"foo"}],
    ["cogentia_site_static_release",{site:"museum",revision:"arbitrary"}],
    ["cogentia_dns_record_ensure",{site:"museum",command:"rm -rf /"}],
  ])await assert.rejects(()=>core.callTool(name,bad,{auth:principal}),/outside_registry/);
  assert.equal(calls,2);
  await assert.rejects(()=>core.callTool("cogentia_dns_record_ensure",
    {site:"museum"},{auth:{auth:"none",allowMutate:false}}),/forbidden|requires.*mutate/i);
  assert.equal(calls,2);
});
test("missing verified standing technical runtime never falls back to an ungated provider",async()=>{
  const core=createMcpCore({COGENTIA_MCP_VIEW:"public"},{});
  await assert.rejects(()=>core.callTool("cogentia_dns_record_ensure",
    {site:"museum"},{auth:auth()}),/canonical_standing_technical_runtime_unavailable/);
});
