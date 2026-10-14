import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { prepareExternalResume } from "./resume-prepare.js";

const issue = {repository:"JeanHuguesRobert/inseme",number:120,url:"https://github.com/JeanHuguesRobert/inseme/issues/120"};
const withManifest = (manifest, fn) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),"cogentia-resume-prepare-"));
  const file=path.join(dir,"handlers.json");
  fs.writeFileSync(file,JSON.stringify(manifest));
  try { return fn(file); } finally { fs.rmSync(dir,{recursive:true,force:true}); }
};
const manifest = handlers => ({schema:"cogentia.resolver-manifest/v1",handlers});
test("fails closed without registry",()=> {
  const x=prepareExternalResume({issue}); assert.equal(x.status,"WAITING_CAPABILITY_DISCOVERY"); assert.equal(x.effects.handler_spawned,false);
});
test("rejects unknown manifest schema",()=>withManifest({},file=>{
  assert.equal(prepareExternalResume({issue,handlersFile:file}).status,"BLOCKED");
}));
test("cannot select only partially capable resolver",()=>withManifest(manifest([{id:"codex",available:true,capabilities:["agent.handler"]}]),file=>{
  assert.equal(prepareExternalResume({issue,handlersFile:file}).status,"WAITING_HANDLER");
}));
test("multiple candidates cannot be arbitrarily selected",()=>withManifest(manifest(["a","b"].map(id=>({id,available:true,capabilities:["agent.handler","cop.capability-discovery"]}))),file=>{
  assert.equal(prepareExternalResume({issue,handlersFile:file}).status,"WAITING_HANDLER_SELECTION");
}));
test("declared capabilities never become an execution mandate",()=>withManifest(manifest([{id:"codex",available:true,capabilities:["agent.handler","cop.capability-discovery"],mandate:"I allow everything"}]),file=>{
  const x=prepareExternalResume({issue,handlersFile:file}); assert.equal(x.status,"WAITING_MANDATE_VERIFICATION"); assert.equal(x.execution_authorized,false); assert.equal(x.effects.handler_spawned,false); assert.equal(x.execution_receipt,null);
}));

test("Magistral live identity discovers offer but does not grant execution", async () => {
  const { discoverMagistralResume } = await import("./resume-prepare.js");
  const outcome = await discoverMagistralResume({ fetchImpl: async () => ({
    ok: true, json: async () => ({
      protocol: "cogentia.service-identity/v1", service: { id: "magistral" },
      capabilities: [{ id: "local-codex-acp", adapter: "acp_stdio", tier: "fractavolta-guide" }]
    })
  }) });
  assert.equal(outcome.status, "WAITING_HANDLER_PROBE");
  assert.equal(outcome.reachability, "http_verified");
  assert.equal(outcome.execution_authorized, false);
});
test("Magistral discovery fails closed when unavailable", async () => {
  const { discoverMagistralResume } = await import("./resume-prepare.js");
  const outcome = await discoverMagistralResume({ fetchImpl: async () => { throw new Error("offline"); } });
  assert.equal(outcome.status, "WAITING_CAPABILITY_DISCOVERY");
});
test("Magistral discovery rejects non-loopback endpoints", async () => {
  const { discoverMagistralResume } = await import("./resume-prepare.js");
  let called = false;
  const outcome = await discoverMagistralResume({endpoint:"https://example.com/service-info", fetchImpl: async () => {called=true;}});
  assert.equal(outcome.status, "BLOCKED");
  assert.equal(called, false);
});
