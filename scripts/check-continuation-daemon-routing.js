#!/usr/bin/env node
/** Isolated real HTTP-daemon acceptance test for inseme#111 (no deployment). */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { registerResolver } from "./lib/resolver-registry.js";
import { rerouteContinuation } from "./lib/continuation-routing.js";
const scripts = path.dirname(fileURLToPath(import.meta.url));
const root = fs.mkdtempSync(path.join(os.tmpdir(), "inseme-111-http-"));
const registry = path.join(root, ".cogentia.json");
const token = "test-only-admin-token-111";
fs.writeFileSync(registry, JSON.stringify({ repos: [] }));
const env = { ...process.env, COGENTIA_REGISTRY: registry,
  COGENTIA_ADMIN_TOKEN: token, COGENTIA_DAEMON_VIEW: "",
  COGENTIA_MCP_ALLOW_MUTATE: "0", COGENTIA_EMBED_MCP: "0" };
let child;
try {
  registerResolver(root, "router-a", ["tool_use"]);
  registerResolver(root, "judge-b", ["Judgement"]);
  const emitted = JSON.parse(execFileSync(process.execPath,
    [path.join(scripts,"cogentia.js"),"continuation","emit","--kind","judgment",
      "--question","Synthetic private HTTP routing fixture",
      "--required-capabilities","Judgement","--json"],
    {cwd:root,env,encoding:"utf8",timeout:15000})).continuation;
  const hop = rerouteContinuation(root, emitted, {
    from:"router-a",to:"judge-b",reason:"Synthetic routing proposal",admissible:()=>true});
  assert.equal(hop.status,"proposed");
  const listener = net.createServer();
  listener.listen(0,"127.0.0.1");
  await once(listener,"listening");
  const port = listener.address().port;
  listener.close();
  await once(listener,"close");
  child=spawn(process.execPath,[path.join(scripts,"cogentia.js"),"daemon",
    "--host","127.0.0.1","--port",String(port)],
    {cwd:root,env,stdio:["ignore","pipe","pipe"]});
  let stderr="";
  child.stderr.on("data",d=>stderr+=d);
  const base = "http://127.0.0.1:"+port;
  let live=false;
  for (let i=0;i<55;i++) {
    if(child.exitCode!==null) throw new Error("daemon failed: "+stderr);
    try {
      const r=await fetch(base+"/service-info",{signal:AbortSignal.timeout(500)});
      if(r.ok){live=true;break;}
    } catch {}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.equal(live,true,"fixture daemon must respond");
  const candidate = await fetch(base+"/api/cli/continuation/next-preview?resolver_id=judge-b");
  assert.equal(candidate.status,200);
  const preview=await candidate.json();
  assert.equal(preview.continuation.id,emitted.id);
  assert.equal(preview.cop_admission,"not_checked");
  assert.equal(preview.claimed,false);
  const route=base+"/api/cli/continuation/routing-history?id="+emitted.id;
  const denied=await fetch(route);
  assert.equal(denied.status,403,"public caller must not see routing actors");
  const loopbackOnly=await fetch(route+"&view=full");
  assert.equal(loopbackOnly.status,403,"loopback alone is not private authorization");
  const privileged=await fetch(route+"&view=full",{headers:{
    Authorization:"Bearer "+token}});
  assert.equal(privileged.status,200);
  const history=await privileged.json();
  assert.equal(history.history[0].status,"proposed");
  assert.equal(history.history[0].to,"judge-b");
  console.log(JSON.stringify({ok:true,http_preview:200,public_routing:403,
    unverified_loopback:403,authenticated_private_routing:200,
    cop_admission:preview.cop_admission,claimed:false},null,2));
} finally {
  if (child && child.exitCode===null) {
    child.kill("SIGTERM");
    await Promise.race([once(child,"exit").catch(()=>{}),
      new Promise(resolve=>setTimeout(resolve,2000))]);
    if(child.exitCode===null) child.kill("SIGKILL");
  }
  fs.rmSync(root,{recursive:true,force:true});
}
