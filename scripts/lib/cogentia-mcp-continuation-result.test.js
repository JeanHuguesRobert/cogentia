import test from "node:test";
import assert from "node:assert/strict";
import { createMcpCore } from "./cogentia-mcp-core.js";
import { resolveCallerAuth } from "./cogentia-mcp-auth.js";
import { createSqliteCopEventStore } from "../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js";
import { createSqliteMcpResultReceiptStore } from "../../../inseme/packages/cop-core/src/sqlite-mcp-result-receipt-store.js";
import { EventStorePacketClaimCoordinator } from "../../../inseme/packages/cop-kernel/src/packetCoordination.js";
import { hashPayload } from "../../../inseme/packages/cop-core/src/cop-event-envelope.js";

const TOOL = "cogentia_continuation_result_submit";
const packetRef = "packet:mcp:tool-test";
const result = () => ({
  protocol: "cogentia.step_result/v1", continuation_id: "ctn_mcp",
  challenge: "challenge", status: "answered", result: { answer: "A" },
});
function submission() {
  const step_result = result();
  return {
    protocol: "cop.continuation-result-submit/v0", continuation_id: "ctn_mcp",
    attempt_id: "attempt_one", execution_binding_ref: "binding_one",
    continuation_version: "1", idempotency_key: "candidate:one",
    step_result, result_digest: hashPayload(step_result),
  };
}
const testEnv = {
  COGENTIA_MCP_JHN_MUTATE: "1", COGENTIA_MCP_JHN_TOKEN: "test-only-token",
};
const trustedAuth = resolveCallerAuth(testEnv, {
  headers: { authorization: "Bearer test-only-token" },
  meta: {
    "cogentia.actor": "agent:jhn",
    "cogentia.mandate_ref": "mandate:fixture",
  },
});

test("MCP result tool is discoverable only with mutate authority and fails closed without host", async () => {
  const publicCore = createMcpCore({ COGENTIA_MCP_VIEW: "public" });
  assert.equal(publicCore.tools.some(t => t.name === TOOL), false);
  await assert.rejects(publicCore.callTool(TOOL, submission()),
    /tier_forbidden/);
  const fullCore = createMcpCore({
    COGENTIA_MCP_VIEW: "full", COGENTIA_ADMIN_TOKEN: "test",
    COGENTIA_MCP_ALLOW_MUTATE: "1",
  });
  assert.equal(fullCore.tools.some(t => t.name === TOOL), true);
  assert.deepEqual(await fullCore.callTool(TOOL, submission()),
    { ok: false, reason: "authenticated_result_caller_required" });
  assert.deepEqual(await fullCore.callTool(TOOL, submission(), {
    auth: trustedAuth,
  }), { ok: false, reason: "governed_result_ingress_not_configured" });
});
test("MCP tool submits one fenced COP observation and retries after ACK loss", async () => {
  const store = createSqliteCopEventStore(":memory:");
  try {
    const coordinator = new EventStorePacketClaimCoordinator({ store });
    const grant = await coordinator.tryClaim({
      packetRef, handlerRef: trustedAuth.actor, ttlMs: 60000,
    });
    assert.equal(grant.ok, true);
    const authority = {
      authenticated_actor: trustedAuth.actor,
      receipt_read_authorized: true, channel_permitted: true,
      mandate_valid: true, budget_admitted: true, claim_valid: true,
      continuation: {
        continuation_id: "ctn_mcp", packet_ref: packetRef, version: 1,
        attempt_id: "attempt_one", execution_binding_ref: "binding_one",
        lifecycle: "suspended",
      },
      claim: {
        packet_ref: packetRef, claim_id: grant.claim.claim_id,
        handler_ref: grant.claim.handler_ref, epoch: grant.claim.epoch,
        expected_generation: coordinator.inspect(packetRef).generation,
      },
    };
    const core = createMcpCore({
      COGENTIA_MCP_VIEW: "full", COGENTIA_ADMIN_TOKEN: "test",
      COGENTIA_MCP_ALLOW_MUTATE: "1",
    }, {
      mcpContinuationResultHost: async ({ auth }) => ({
        admit: async () => auth?.actor === trustedAuth.actor ? authority : null,
        store: createSqliteMcpResultReceiptStore(store),
      }),
    });
    const a = await core.callTool(TOOL, submission(), { auth: trustedAuth });
    assert.equal(a.ok, true);
    assert.equal(a.duplicate, false);
    assert.equal(a.candidate_status, "observed");
    assert.equal(store.listTopic("continuation:ctn_mcp").length, 1);
    // Real MCP JSON-RPC tools/call path with independently attested transport.
    const rpcCore = createMcpCore(testEnv, {
      mcpContinuationResultHost: async ({ auth }) => ({
        admit: async () => auth?.actor === trustedAuth.actor ? authority : null,
        store: createSqliteMcpResultReceiptStore(store),
      }),
    });
    const rpc = await rpcCore.handleJsonRpc({
      jsonrpc: "2.0", id: 44, method: "tools/call",
      params: {
        name: TOOL, arguments: submission(),
        _meta: {
          "cogentia.actor": trustedAuth.actor,
          "cogentia.mandate_ref": "mandate:fixture",
        },
      },
    }, { headers: { authorization: "Bearer test-only-token" } });
    assert.equal(rpc.result.isError, undefined);
    assert.equal(rpc.result.structuredContent.data.ok, true);
    assert.equal(rpc.result.structuredContent.data.duplicate, true);
    const b = await core.callTool(TOOL, submission(), { auth: trustedAuth });
    assert.equal(b.ok, true);
    assert.equal(b.duplicate, true);
    assert.equal(b.receipt_ref, a.receipt_ref);
    authority.claim_valid = false;
    authority.mandate_valid = false;
    authority.budget_admitted = false;
    authority.continuation.lifecycle = "resolved";
    const c = await core.callTool(TOOL, submission(), { auth: trustedAuth });
    assert.equal(c.ok, true);
    assert.equal(c.duplicate, true);
    assert.equal(store.listTopic("continuation:ctn_mcp").length, 1);
    const changed = submission();
    changed.step_result.result.answer = "conflicting";
    changed.result_digest = hashPayload(changed.step_result);
    const denied = await core.callTool(TOOL, changed, { auth: trustedAuth });
    assert.equal(denied.reason, "idempotency_conflict");
  } finally {
    store.close();
  }
});
