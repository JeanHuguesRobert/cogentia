/**
 * Scenario: anonymous mutate denied; Agent JHN (+ subagent) with token may mutate.
 * Live emit requires daemon; attestation checks always run.
 */
import {
  createMcpCore,
  MUTATE_TOOLS,
} from "../../../scripts/lib/cogentia-mcp-core.js";
import { ACTOR_META_KEY, JHN_TOKEN_META_KEY, MANDATE_META_KEY } from "../../../scripts/lib/cogentia-mcp-auth.js";

const TOKEN = process.env.COGENTIA_MCP_JHN_TOKEN || "sandbox-jhn-token";

function envBase() {
  return {
    COGENTIA_DAEMON_URL: process.env.COGENTIA_DAEMON_URL || "http://127.0.0.1:8790",
    COGENTIA_MCP_VIEW: "public",
    COGENTIA_MCP_JHN_MUTATE: "1",
    COGENTIA_MCP_JHN_TOKEN: TOKEN,
  };
}

export async function run() {
  const core = createMcpCore(envBase());

  // Anonymous: mutate tools hidden
  const anonList = await core.handleJsonRpc({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {},
  });
  const anonNames = (anonList.result?.tools || []).map((t) => t.name);
  const anonHidden = [...MUTATE_TOOLS].every((n) => !anonNames.includes(n));

  const anonEmit = await core.handleJsonRpc({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "cogentia_continuation_emit",
      arguments: { question: "anon should fail" },
    },
  });
  const anonDenied =
    anonEmit.result?.isError === true &&
    anonEmit.result?.structuredContent?.error_class === "tier_forbidden";

  // JHN direct
  const jhnList = await core.handleJsonRpc(
    {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/list",
      params: {
        _meta: {
          [ACTOR_META_KEY]: "agent:jhn",
          [JHN_TOKEN_META_KEY]: TOKEN,
          [MANDATE_META_KEY]: "mandate:jhn:sandbox",
        },
      },
    },
    {
      headers: {
        authorization: `Bearer ${TOKEN}`,
        "x-cogentia-actor": "agent:jhn",
      },
    }
  );
  const jhnNames = (jhnList.result?.tools || []).map((t) => t.name);
  const jhnSeesMutate = [...MUTATE_TOOLS].every((n) => jhnNames.includes(n));
  const jhnAuth = jhnList.result?._cogentia?.auth;

  // Subagent under JHN
  const subList = await core.handleJsonRpc(
    {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/list",
      params: {
        _meta: {
          [ACTOR_META_KEY]: "agent:jhn.subagent:elf-1",
          [JHN_TOKEN_META_KEY]: TOKEN,
        },
      },
    },
    { headers: { authorization: `Bearer ${TOKEN}`, "x-cogentia-actor": "agent:jhn.subagent:elf-1" } }
  );
  const subSees = (subList.result?.tools || []).some((t) => t.name === "cogentia_continuation_emit");

  // Wrong actor with valid token
  const badActor = await core.handleJsonRpc(
    {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        name: "cogentia_continuation_emit",
        arguments: { question: "should fail" },
        _meta: {
          [ACTOR_META_KEY]: "agent:random",
          [JHN_TOKEN_META_KEY]: TOKEN,
        },
      },
    },
    { headers: { authorization: `Bearer ${TOKEN}`, "x-cogentia-actor": "agent:random" } }
  );
  const badActorDenied = badActor.result?.isError === true;

  // Optional live emit (daemon)
  let liveEmit = { attempted: false };
  try {
    const emit = await core.handleJsonRpc(
      {
        jsonrpc: "2.0",
        id: 6,
        method: "tools/call",
        params: {
          name: "cogentia_continuation_emit",
          arguments: {
            question: "Sandbox JHN attestation probe — safe to cancel",
            kind: "judgment",
            subject: "sandbox-jhn",
          },
          _meta: {
            [ACTOR_META_KEY]: "agent:jhn",
            [JHN_TOKEN_META_KEY]: TOKEN,
            [MANDATE_META_KEY]: "mandate:jhn:sandbox",
          },
        },
      },
      { headers: { authorization: `Bearer ${TOKEN}`, "x-cogentia-actor": "agent:jhn" } }
    );
    liveEmit = {
      attempted: true,
      ok: emit.result?.isError !== true && emit.result?.structuredContent?.ok === true,
      error_class: emit.result?.structuredContent?.error_class || null,
      continuation_id: emit.result?.structuredContent?.continuation?.id || null,
      auth: emit.result?.structuredContent?.data?.auth || null,
    };
  } catch (error) {
    liveEmit = { attempted: true, ok: false, error: error.message };
  }

  const ok = anonHidden && anonDenied && jhnSeesMutate && subSees && badActorDenied && jhnAuth === "jhn";

  return {
    ok,
    anon_mutate_hidden: anonHidden,
    anon_emit_denied: anonDenied,
    jhn_sees_mutate_tools: jhnSeesMutate,
    jhn_list_auth: jhnAuth,
    subagent_sees_emit: subSees,
    bad_actor_denied: badActorDenied,
    live_emit: liveEmit,
    note: "Write path is token+actor gated; skills still do not grant authority.",
  };
}
