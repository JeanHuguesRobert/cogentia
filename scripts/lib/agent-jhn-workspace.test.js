import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { resolveCallerAuth } from "./cogentia-mcp-auth.js";
import { createAgentJhnWorkspaceCapabilities } from "./agent-jhn-workspace.js";
import { createCapabilityRegistry, createGovernedHarness } from "./agent-jhn-whatsapp/governed-harness.js";
import { runJohnRequest } from "./john-run.js";

function temporaryGitWorktree(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-jhn-workspace-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  execFileSync("git", ["init", "-b", "agent-jhn-test"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "test@example.invalid"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Agent JHN test"], { cwd: root });
  fs.writeFileSync(path.join(root, "notes.txt"), "initial\n");
  execFileSync("git", ["add", "notes.txt"], { cwd: root });
  execFileSync("git", ["commit", "-m", "initial"], { cwd: root, stdio: "ignore" });
  return root;
}

function jhnAuth() {
  return resolveCallerAuth({
    COGENTIA_MCP_JHN_MUTATE: "1",
    COGENTIA_MCP_JHN_TOKEN: "test-token",
  }, {
    meta: { "cogentia.actor": "agent:jhn", "cogentia.mandate_ref": "mandate:test" },
    headers: { authorization: "Bearer test-token" },
  });
}

test("workspace reader stays inside the assigned worktree and returns a content hash", async (t) => {
  const root = temporaryGitWorktree(t);
  const [read] = createAgentJhnWorkspaceCapabilities({ root, branch: "agent-jhn-test", authContext: jhnAuth() });
  const result = await read.execute({ path: "notes.txt" });
  assert.equal(result.content, "initial\n");
  assert.match(result.sha256, /^sha256:[a-f0-9]{64}$/);
  await assert.rejects(() => read.execute({ path: "../outside.txt" }), (error) => error.code === "workspace_path_invalid");
  await assert.rejects(() => read.execute({ path: ".env" }), (error) => error.code === "workspace_path_restricted");
});

test("workspace write rejects untrusted auth, stale hashes and a different branch", async (t) => {
  const root = temporaryGitWorktree(t);
  const [, write] = createAgentJhnWorkspaceCapabilities({
    root,
    branch: "agent-jhn-test",
    authContext: { auth: "jhn", allowMutate: true, actor: "agent:jhn", mandate_ref: "mandate:test" },
    budget_reservation_id: "budget:test",
  });
  await assert.rejects(
    () => write.execute({ path: "notes.txt", content: "changed\n", expected_sha256: "sha256:stale" }),
    (error) => error.code === "workspace_write_authority_required",
  );

  const [, trustedWrite] = createAgentJhnWorkspaceCapabilities({
    root,
    branch: "agent-jhn-test",
    authContext: jhnAuth(),
    budget_reservation_id: "budget:test",
  });
  await assert.rejects(
    () => trustedWrite.execute({ path: "notes.txt", content: "changed\n", expected_sha256: "sha256:stale" }),
    (error) => error.code === "workspace_precondition_failed",
  );
  assert.equal(fs.readFileSync(path.join(root, "notes.txt"), "utf8"), "initial\n");

  const [, wrongBranchWrite] = createAgentJhnWorkspaceCapabilities({
    root,
    branch: "another-branch",
    authContext: jhnAuth(),
    budget_reservation_id: "budget:test",
  });
  await assert.rejects(
    () => wrongBranchWrite.execute({ path: "notes.txt", content: "changed\n", expected_sha256: "sha256:stale" }),
    (error) => error.code === "workspace_branch_mismatch",
  );
});

test("governed harness enforces the configured internal effect count", async () => {
  let executions = 0;
  let next = 0;
  const harness = createGovernedHarness({
    registry: createCapabilityRegistry([{
      name: "workspace.write",
      risk: "internal_recoverable",
      execute: async () => { executions += 1; return { ok: true }; },
    }]),
    reasoner: {
      nextStep: async () => {
        next += 1;
        return { kind: "capability_call", capability: "workspace.write", input: { path: "notes.txt" } };
      },
    },
  });
  const result = await harness.run({}, { allowedCapabilities: ["workspace.write"] }, {
    maxSteps: 4,
    maxCapabilityCalls: 3,
    maxInternalEffects: 1,
  });
  assert.equal(result.stopReason, "internal_effect_budget");
  assert.equal(result.internalEffects, 1);
  assert.equal(executions, 1);
});

test("John records a redacted write request and links its COP receipt", async () => {
  const request = {
    version: "john.request.v1",
    request_id: "jhn-write-accounting-test",
    principal: { id: "principal:jhn" },
    mandate: { id: "mandate:test", version: "1" },
    budget: { id: "budget:test" },
    execution_budget: {
      max_steps: 3, max_tool_calls: 2, max_subagents: 0,
      max_elapsed_ms: 5000, max_external_effects: 0, max_internal_effects: 1,
    },
    exposure: "bounded",
    capability: "john.converse",
    input: { prompt: "edit the file" },
    handler: { id: "test.reasoner", kind: "governed_reasoner", allowed_capabilities: ["workspace.write"] },
  };
  let step = 0;
  const events = await runJohnRequest(request, {
    allowedCapabilities: ["workspace.write"],
    maxInternalEffects: 1,
    capabilities: [{
      name: "workspace.write", risk: "internal_recoverable",
      execute: async () => ({
        ok: true, accounting_complete: true, authorization_id: "sea_test",
        effect_receipt: { ok: true, status: "success", operation: "workspace.write", sha: "sha256:next", id: "notes.txt" },
        cop_spend: { ok: true, durable: true, packet_id: "urn:cop:packet:effect:test", spend_id: "effect:sea_test" },
      }),
    }],
    reasoner: { nextStep: async () => {
      step += 1;
      return step === 1
        ? { kind: "capability_call", capability: "workspace.write", input: { path: "notes.txt", expected_sha256: "sha256:old", content: "private file content" } }
        : { kind: "answer", answer: "Updated notes.txt." };
    } },
  });
  const requested = events.find((event) => event.type === "john.tool.requested");
  const receipt = events.find((event) => event.type === "john.tool.receipt");
  const settled = events.find((event) => event.type === "john.accounting.settled");
  assert.equal(requested.data.input.content, undefined);
  assert.equal(requested.data.input.content_bytes, Buffer.byteLength("private file content"));
  assert.equal(receipt.data.authorization_id, "sea_test");
  assert.equal(receipt.data.cop_spend.packet_id, "urn:cop:packet:effect:test");
  assert.equal(settled.data.internal_effects, 1);
});
