import schema from "../../../../schemas/agent-acquired-context.v0.schema.json" with { type: "json" };
import { parseReplyDocument } from "../../../../scripts/lib/agent-acquired-context-parse.js";
import { ingestAgentAcquiredContextWith } from "../../../../scripts/lib/agent-acquired-context-ingest-pure.js";
import { validateAgentAcquiredContextDocument } from "../../../../scripts/lib/agent-acquired-context-validate.js";
import { buildAgentAcquiredContextMirror } from "../../../../scripts/lib/agent-acquired-context-mirror.js";
import {
  buildMirrorFromKysSnapshot,
  looksLikeKysSnapshot,
} from "../../../../scripts/lib/kys-snapshot-mirror.js";

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function ingestLearnedContext(text) {
  const exact = String(text ?? "");
  const parsed = parseReplyDocument(exact);
  const prepared = new Map();
  prepared.set(exact, `sha256:${await sha256Hex(exact)}`);
  const body = parsed.ok ? parsed.data?.raw_response?.body : undefined;
  if (typeof body === "string" && !prepared.has(body)) {
    prepared.set(body, `sha256:${await sha256Hex(body)}`);
  }

  const sha256Prefixed = (value) => {
    const found = prepared.get(String(value));
    if (!found) throw new Error("SHA-256 was requested for text that was not prepared");
    return found;
  };

  return ingestAgentAcquiredContextWith(exact, {
    schema,
    sha256Prefixed,
    parseReplyDocument,
    validateAgentAcquiredContext: (data, activeSchema = schema) => (
      validateAgentAcquiredContextDocument(data, activeSchema, sha256Prefixed)
    ),
  });
}

export async function mirrorLearnedContext(text) {
  const exact = String(text ?? "");
  const parsed = parseReplyDocument(exact);
  if (parsed.ok && looksLikeKysSnapshot(parsed.data)) {
    return buildMirrorFromKysSnapshot(parsed.data, {
      sha256: `sha256:${await sha256Hex(exact)}`,
      media_type: "text/plain",
      text: exact,
    });
  }
  return buildAgentAcquiredContextMirror(await ingestLearnedContext(exact));
}
