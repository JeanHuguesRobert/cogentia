/**
 * Packet Capsule Core Engine (cogentia / JHN Architecture).
 *
 * Implements self-contained, portable, content-addressed Cognitive Packet Capsules
 * per research/documents_as_cognitive_packets.md and
 * research/cognitive_packet_closure_and_packet_native_semantics.md.
 *
 * Present today:
 * - Capsule schema / metadata (including declared closure: state + environment name)
 * - Content-addressed hashing and checksum / payload integrity
 * - pack / verify / unpack mechanics
 *
 * Not implemented: Closed(p,h,E) evaluation (dependency closure, HandlerProfile
 * compatibility, environment satisfiability, materializability).
 * Declared closure metadata != verified Packet Closure.
 * Integrity != closure != handler admissibility != authorization != runnable-now.
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export const PACKET_CAPSULE_SCHEMA = "cogentia.packet_capsule/v1";

export function packDocumentToCapsule(docPath, options = {}) {
  if (!fs.existsSync(docPath)) {
    throw new Error(`Source document not found: ${docPath}`);
  }

  const rawContent = fs.readFileSync(docPath, "utf8");
  const fileName = path.basename(docPath);
  const relativePath = options.relativePath || fileName;
  const sourceRepo = options.sourceRepo || "unknown";

  const sha256 = createHash("sha256").update(rawContent).digest("hex");
  const packetId = options.packetId || `CPKT-${Date.now()}-${sha256.slice(0, 8)}`;

  const capsuleHeader = [
    "---",
    `schema: "${PACKET_CAPSULE_SCHEMA}"`,
    `packet_id: "${packetId}"`,
    `created_at: "${new Date().toISOString()}"`,
    `source_repo: "${sourceRepo}"`,
    `source_path: "${relativePath}"`,
    `content_sha256: "${sha256}"`,
    "closure:",
    `  state: "${options.closureState || "closed"}"`,
    `  admissible_environment: "${options.admissibleEnvironment || "cogentia-v3-runtime"}"`,
    "---",
    "",
  ].join("\n");

  const capsuleBody = [
    `# Packet Capsule: ${packetId}`,
    "",
    "> [!NOTE]",
    `> This is a self-contained Cognitive Packet Capsule bundled from \`${sourceRepo}/${relativePath}\`.`,
    "> Verified by the Cogentia Packet Capsule Engine.",
    "",
    "## Encapsulated Payload",
    "",
    "\`\`\`markdown",
    rawContent,
    "\`\`\`",
    "",
  ].join("\n");

  const fullCapsule = capsuleHeader + capsuleBody;
  const capsuleSha256 = createHash("sha256").update(fullCapsule).digest("hex");

  return {
    ok: true,
    packet_id: packetId,
    schema: PACKET_CAPSULE_SCHEMA,
    source_path: relativePath,
    source_repo: sourceRepo,
    content_sha256: sha256,
    capsule_sha256: capsuleSha256,
    capsule_text: fullCapsule,
  };
}

export function verifyCapsule(capsuleText) {
  if (typeof capsuleText !== "string" || !capsuleText.trim()) {
    return { ok: false, error: "empty_capsule" };
  }

  const match = capsuleText.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { ok: false, error: "missing_frontmatter" };
  }

  const frontmatter = match[1];
  const body = match[2];

  // Extract metadata
  const schemaMatch = frontmatter.match(/schema:\s*["']?([^"'\r\n]+)["']?/);
  const packetIdMatch = frontmatter.match(/packet_id:\s*["']?([^"'\r\n]+)["']?/);
  const shaMatch = frontmatter.match(/content_sha256:\s*["']?([^"'\r\n]+)["']?/);
  const sourcePathMatch = frontmatter.match(/source_path:\s*["']?([^"'\r\n]+)["']?/);
  const sourceRepoMatch = frontmatter.match(/source_repo:\s*["']?([^"'\r\n]+)["']?/);

  if (!schemaMatch || schemaMatch[1] !== PACKET_CAPSULE_SCHEMA) {
    return { ok: false, error: "invalid_or_unsupported_schema", expected: PACKET_CAPSULE_SCHEMA };
  }

  const packetId = packetIdMatch ? packetIdMatch[1] : null;
  const expectedSha = shaMatch ? shaMatch[1] : null;
  const sourcePath = sourcePathMatch ? sourcePathMatch[1] : null;
  const sourceRepo = sourceRepoMatch ? sourceRepoMatch[1] : null;

  // Extract payload
  const payloadMatch = body.match(/## Encapsulated Payload\r?\n\r?\n```markdown\r?\n([\s\S]*?)\r?\n```/);
  if (!payloadMatch) {
    return { ok: false, error: "missing_payload_block" };
  }

  const payload = payloadMatch[1];
  const computedSha = createHash("sha256").update(payload).digest("hex");

  const shaMatchResult = expectedSha === computedSha;

  return {
    ok: shaMatchResult,
    packet_id: packetId,
    source_path: sourcePath,
    source_repo: sourceRepo,
    expected_sha: expectedSha,
    computed_sha: computedSha,
    valid_checksum: shaMatchResult,
    payload,
    error: shaMatchResult ? null : "checksum_mismatch",
  };
}

export function unpackCapsule(capsuleText, targetDir, options = {}) {
  const verification = verifyCapsule(capsuleText);
  if (!verification.ok) {
    return verification;
  }

  const targetPath = path.join(targetDir, verification.source_path || "unpacked_document.md");

  if (options.dryRun) {
    return {
      ok: true,
      dry_run: true,
      packet_id: verification.packet_id,
      target_path: targetPath,
      bytes: Buffer.byteLength(verification.payload, "utf8"),
    };
  }

  const parentDir = path.dirname(targetPath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  fs.writeFileSync(targetPath, verification.payload, "utf8");

  return {
    ok: true,
    packet_id: verification.packet_id,
    target_path: targetPath,
    written: true,
    bytes: Buffer.byteLength(verification.payload, "utf8"),
  };
}
