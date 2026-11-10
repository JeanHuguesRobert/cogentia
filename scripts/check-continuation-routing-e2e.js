#!/usr/bin/env node
/**
 * inseme#111 / cogentia#305 isolated canonical end-to-end receipt test.
 * No daemon, production registry, provider inference, COP grant, or third-party effect.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { registerResolver, getClaim, releaseClaim } from "./lib/resolver-registry.js";
import { nextContinuation, rerouteContinuation, inspectRouting, recordRoutingOutcome } from "./lib/continuation-routing.js";

const scripts = path.dirname(fileURLToPath(import.meta.url));
const root = fs.mkdtempSync(path.join(os.tmpdir(), "inseme-111-e2e-"));
const registry = path.join(root, ".cogentia.json");
fs.writeFileSync(registry, JSON.stringify({ repos: [] }));
const cli = (...args) => JSON.parse(execFileSync(process.execPath,
  [path.join(scripts, "cogentia.js"), "continuation", ...args, "--json"],
  { cwd: root, env: { ...process.env, COGENTIA_REGISTRY: registry },
    encoding: "utf8", timeout: 15000 }));
const admissible = () => true; // synthetic-only: no real mandate or COP budget is asserted
try {
  registerResolver(root, "router-a", ["tool_use"]);
  registerResolver(root, "judge-b", ["Judgement", "tool_use"]);
  const emitted = cli("emit", "--kind", "judgment",
    "--question", "Synthetic Judgement A cannot handle; B can",
    "--required-capabilities", "Judgement");
  assert.equal(emitted.created, true);
  const id = emitted.continuation.id;
  assert.match(id, /^ctn_[a-f0-9]{8,}$/);
  const origin = emitted.continuation.return_contract.result_ref;
  const read = () => cli("inspect", id).continuation;
  const aProfile = { resolver_id: "router-a", capabilities: ["tool_use"] };
  const bProfile = { resolver_id: "judge-b", capabilities: ["Judgement", "tool_use"] };
  assert.equal(nextContinuation(root, [read()], aProfile, { admissible }).continuation, null);
  const forwarded = rerouteContinuation(root, read(),
    { from: "router-a", to: "judge-b", reason: "requires real Judgement", admissible });
  assert.equal(forwarded.status, "proposed");
  assert.equal(forwarded.event.return_ref, origin);
  const peek = nextContinuation(root, [read()], bProfile, { admissible });
  assert.equal(peek.status, "available");
  assert.equal(getClaim(root,id), null,"preview must not create PacketClaim");
  const claimed = nextContinuation(root, [read()], bProfile, { claim: true, admissible });
  assert.equal(claimed.status, "claimed");
  assert.equal(nextContinuation(root, [read()], bProfile, { claim: true, admissible }).continuation, null);
  const accepted = recordRoutingOutcome(root, read(), { resolverId: "judge-b", phase: "accepted" });
  assert.equal(accepted.status, "accepted");
  assert.equal(recordRoutingOutcome(root, read(), { resolverId: "judge-b", phase: "treated" }).status,
    "resolution_not_observed");
  const resolution = cli("resolve", id, "--decision", "synthetic_answer", "--reason",
    "Fictitious result solely for an isolated test", "--payload-json",
    JSON.stringify({ answer: "synthetic_answer", producer: "judge-b" }));
  assert.equal(resolution.ok, true);
  const fetched = read();
  assert.equal(fetched.status, "resolved");
  assert.equal(fetched.id, id, "return to original identity");
  assert.equal(fetched.resolution.payload.answer, "synthetic_answer");
  assert.equal(fetched.resolution.return_state.result_ref, origin);
  assert.equal(fetched.resolution.return_state.result_available, true);
  assert.equal(fetched.resolution.return_state.delivered, false,
    "durable return slot is not proof of delivery");
  const treated = recordRoutingOutcome(root, fetched, { resolverId: "judge-b", phase: "treated" });
  assert.equal(treated.status, "treated");
  assert.equal(treated.event.receipt_ref, origin);
  assert.equal(treated.event.delivery_confirmed, false);
  assert.deepEqual(inspectRouting(root,id).map(e=>e.status),
    ["proposed","accepted","treated"]);
  assert.equal(getClaim(root,id).resolver_id, "judge-b");
  releaseClaim(root,id); // synthetic reconciliation only; canonical COP settlement not claimed
  assert.equal(getClaim(root,id),null);
  const second = cli("emit", "--kind", "judgment", "--question", "Synthetic second item",
    "--required-capabilities", "Judgement");
  assert.notEqual(second.continuation.id, id);
  assert.equal(nextContinuation(root, [read(), second.continuation], bProfile,
    { admissible }).continuation.id, second.continuation.id,
    "next item selected after first resolution in the same session");
  console.log(JSON.stringify({
    ok:true, continuation_id:id, returned_ref:origin, route:["proposed","accepted","treated"],
    second_id:second.continuation.id, delivery_confirmed:false,
    cop_verified:false, effect:"synthetic_only",
  },null,2));
} finally {
  fs.rmSync(root,{recursive:true,force:true});
}
