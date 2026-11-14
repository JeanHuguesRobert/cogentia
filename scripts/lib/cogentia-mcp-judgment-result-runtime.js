/**
 * Opt-in production composition for the existing canonical John COP store.
 * No default-enabled tool execution and no provider-channel permission guessed.
 * The server must already possess a signed mandate, funded budget, durable
 * continuation declaration and valid PacketClaim. This code creates none.
 */
import { readFileSync, realpathSync, statSync } from "node:fs";
import { createSqliteCopEventStore } from
  "../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js";
import { sshFingerprint } from "./john-sshsig-approval.js";
import { createOfflineJohnIssuerVerifier } from "./john-offline-issuer-verifier.js";
import { createCanonicalMcpJudgmentResultHost } from "./cogentia-mcp-judgment-result-host.js";

const PINNED_STORE = "/var/lib/cogentia/cop/john-root-v1.sqlite";
const PINNED_ISSUER = "SHA256:lG9BC3fIjurrBccYLO1w7VQpmc9ZMr8MvM1o3zJ6L3c";
const fail = (code) => {
  throw Object.assign(new Error(code), { error_class: code });
};

export function createMcpJudgmentResultRuntime(env = process.env) {
  if (env.COGENTIA_MCP_JUDGMENT_RESULT_ENABLED !== "1")
    return { enabled: false, extras: {}, close() {} };

  const storePath = String(env.COGENTIA_JHN_CANONICAL_STORE_PATH || "");
  const keyFile = String(env.COGENTIA_JHN_ISSUER_AUTHORIZED_KEYS || "");
  if (!storePath || !keyFile) fail("judgment_result_authority_unconfigured");
  try {
    if (realpathSync(storePath) !== PINNED_STORE || !statSync(storePath).isFile())
      fail("judgment_result_canonical_store_untrusted");
  } catch (e) {
    if (e.error_class) throw e;
    fail("judgment_result_canonical_store_unavailable");
  }
  let sshKey;
  try {
    sshKey = readFileSync(keyFile, "utf8").split("\n").find(line => {
      try { return sshFingerprint(line) === PINNED_ISSUER; }
      catch { return false; }
    });
  } catch { fail("judgment_result_trusted_issuer_unavailable"); }
  if (!sshKey) fail("judgment_result_trusted_issuer_unavailable");

  // This list must be explicitly configured after a provider/channel permission
  // review, and is never populated from MCP request metadata or browser state.
  const allowedChannels = new Set(
    String(env.COGENTIA_MCP_JUDGMENT_RESULT_PERMITTED_CHANNELS || "")
      .split(",").map(s => s.trim()).filter(Boolean)
  );
  if (!allowedChannels.size) fail("judgment_result_channels_not_reviewed");

  const store = createSqliteCopEventStore(storePath);
  try {
    const verifyIssuer = createOfflineJohnIssuerVerifier({
      trustedSshPublicKey: sshKey, expectedSshFingerprint: PINNED_ISSUER,
    });
    const provider = createCanonicalMcpJudgmentResultHost({
      store,
      mandate_ref: "mandate:jhn:john-root",
      budget_id: "budget:mandate:jhn:john-root",
      transport_mandate_label: "mandate:chatgpt-corpus-coding",
      verifyIssuer,
      channelPermission: ({ provider, channel }) =>
        allowedChannels.has(String(provider || "") + ":" + String(channel || "")),
    });
    return {
      enabled: true, extras: { mcpContinuationResultHost: provider },
      close() { store.close(); },
    };
  } catch (e) {
    store.close();
    throw e;
  }
}
