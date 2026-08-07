/**
 * Scenario: tools/call returns packet-shaped envelope with correlation.
 */
import {
  createMcpCore,
  PROTOCOL_VERSION_MODERN,
  MCP_META,
  ENVELOPE_KIND,
} from "../../../scripts/lib/cogentia-mcp-core.js";

export async function run() {
  const core = createMcpCore({
    COGENTIA_DAEMON_URL: process.env.COGENTIA_DAEMON_URL || "http://127.0.0.1:8790",
    COGENTIA_MCP_VIEW: "public",
  });

  // skill_get needs no daemon — always envelope-wrapped via tools/call
  const rpc = await core.handleJsonRpc(
    {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "cogentia_skill_get",
        arguments: { id: "continuation-handling", meta_only: true },
        _meta: {
          [MCP_META.protocolVersion]: PROTOCOL_VERSION_MODERN,
          traceparent: "00-cccccccccccccccccccccccccccccccc-dddddddddddddddd-01",
        },
      },
    },
    { protocolVersionHeader: PROTOCOL_VERSION_MODERN }
  );

  const env = rpc.result?.structuredContent;
  const ok =
    rpc.result?.isError !== true &&
    env?.envelope?.kind === ENVELOPE_KIND &&
    env?.tool === "cogentia_skill_get" &&
    env?.ok === true &&
    env?.correlation?.traceparent?.includes("cccc");

  return {
    ok,
    envelope_kind: env?.envelope?.kind,
    protocol_era: env?.protocol_era,
    skill_hint: env?.skill_hint,
    correlation: env?.correlation,
    transmission: "by_copy",
    session_affinity_required: false,
  };
}
