import test from "node:test";
import assert from "node:assert/strict";
import { createMcpJudgmentResultRuntime } from "./cogentia-mcp-judgment-result-runtime.js";

test("result host is disabled by default and does not open or create a COP store", () => {
  const disabled = createMcpJudgmentResultRuntime({});
  assert.equal(disabled.enabled, false);
  assert.deepEqual(disabled.extras, {});
  disabled.close();
});
test("enabling result host without canonical authority refuses startup", () => {
  assert.throws(
    () => createMcpJudgmentResultRuntime({
      COGENTIA_MCP_JUDGMENT_RESULT_ENABLED: "1",
    }), /judgment_result_authority_unconfigured/);
  assert.throws(
    () => createMcpJudgmentResultRuntime({
      COGENTIA_MCP_JUDGMENT_RESULT_ENABLED: "1",
      COGENTIA_JHN_CANONICAL_STORE_PATH: "/tmp/untrusted-cop.sqlite",
      COGENTIA_JHN_ISSUER_AUTHORIZED_KEYS: "/tmp/no-key",
    }), /judgment_result_canonical_store_unavailable/);
});
