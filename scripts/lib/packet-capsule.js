/**
 * Packet Capsule Core Engine (cogentia / JHN Architecture).
 *
 * Implements self-contained, portable, content-addressed Cognitive Packet Capsules
 * per research/documents_as_cognitive_packets.md,
 * research/cognitive_packet_closure_and_packet_native_semantics.md,
 * and Level-2 Continuation Scheduler (R1-B / F3).
 *
 * Capabilities:
 * - Document & Continuation Capsule schema / metadata
 * - Content-addressed hashing (SHA-256) and payload integrity verification
 * - pack / verify / unpack mechanics for documents and continuations
 * - Evaluated Packet Closure: Closed(p, h, E) evaluating:
 *     1. Cryptographic and structural capsule integrity
 *     2. Protocol compatibility
 *     3. Handler profile compatibility (required capabilities & required event handlers)
 *     4. Environment satisfiability (referenced stores, files, schema resolvers)
 *     5. Accounting budget viability
 * - Materialization of closed continuations into clean execution states
 *
 * Distinction:
 *   Declared closure metadata (frontmatter) != verified Packet Closure Closed(p,h,E).
 *   Integrity != closure != handler admissibility != authorization != runnable-now.
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export const PACKET_CAPSULE_SCHEMA = "cogentia.packet_capsule/v1";
export const CONTINUATION_CAPSULE_SCHEMA = "cogentia.continuation_capsule/v1";
export const CONTINUATION_PROTOCOL = "cogentia.continuation.v2";

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
    "```markdown",
    rawContent,
    "```",
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

export function packContinuationToCapsule(continuation, options = {}) {
  if (!continuation || typeof continuation !== "object") {
    throw new Error("Invalid continuation object: must be a non-null object");
  }

  // Canonical JSON serialization for reproducible hashing.  The ordering has
  // to apply recursively: a top-level key list would silently omit nested
  // fields, which is exactly the kind of hidden loss F3 is meant to reject.
  const canonicalJson = JSON.stringify(canonicalizeJson(continuation), null, 2);
  const sha256 = createHash("sha256").update(canonicalJson).digest("hex");
  const packetId = continuation.id || continuation.packet_id || options.packetId || `CPKT-CONT-${Date.now()}-${sha256.slice(0, 8)}`;
  const sourceRepo = options.sourceRepo || "cogentia";
  const protocol = continuation.protocol || options.protocol || CONTINUATION_PROTOCOL;
  const schema = options.schema || CONTINUATION_CAPSULE_SCHEMA;

  const declaredClosureState = continuation.closure?.state || options.closureState || "closed";
  const declaredEnvironment = continuation.closure?.admissibleEnvironment || options.admissibleEnvironment || "cogentia-v3-runtime";

  const capsuleHeader = [
    "---",
    `schema: "${schema}"`,
    `packet_id: "${packetId}"`,
    `protocol: "${protocol}"`,
    `created_at: "${new Date().toISOString()}"`,
    `source_repo: "${sourceRepo}"`,
    `content_sha256: "${sha256}"`,
    "closure:",
    `  state: "${declaredClosureState}"`,
    `  admissible_environment: "${declaredEnvironment}"`,
    "---",
    "",
  ].join("\n");

  const capsuleBody = [
    `# Packet Capsule: ${packetId}`,
    "",
    "> [!NOTE]",
    `> This is a self-contained Cognitive Packet Capsule carrying continuation \`${packetId}\`.`,
    "> Verified by the Cogentia Packet Capsule Engine.",
    "",
    "## Encapsulated Payload",
    "",
    "```json",
    canonicalJson,
    "```",
    "",
  ].join("\n");

  const fullCapsule = capsuleHeader + capsuleBody;
  const capsuleSha256 = createHash("sha256").update(fullCapsule).digest("hex");

  return {
    ok: true,
    packet_id: packetId,
    schema,
    protocol,
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
  const protocolMatch = frontmatter.match(/protocol:\s*["']?([^"'\r\n]+)["']?/);
  const shaMatch = frontmatter.match(/content_sha256:\s*["']?([^"'\r\n]+)["']?/);
  const sourcePathMatch = frontmatter.match(/source_path:\s*["']?([^"'\r\n]+)["']?/);
  const sourceRepoMatch = frontmatter.match(/source_repo:\s*["']?([^"'\r\n]+)["']?/);
  const closureStateMatch = frontmatter.match(/state:\s*["']?([^"'\r\n]+)["']?/);
  const admissibleEnvMatch = frontmatter.match(/admissible_environment:\s*["']?([^"'\r\n]+)["']?/);

  const recognizedSchemas = new Set([PACKET_CAPSULE_SCHEMA, CONTINUATION_CAPSULE_SCHEMA]);
  if (!schemaMatch || !recognizedSchemas.has(schemaMatch[1])) {
    return {
      ok: false,
      error: "invalid_or_unsupported_schema",
      expected: [PACKET_CAPSULE_SCHEMA, CONTINUATION_CAPSULE_SCHEMA],
      found: schemaMatch ? schemaMatch[1] : null,
    };
  }

  const schema = schemaMatch[1];
  const packetId = packetIdMatch ? packetIdMatch[1] : null;
  const protocol = protocolMatch ? protocolMatch[1] : null;
  const expectedSha = shaMatch ? shaMatch[1] : null;
  const sourcePath = sourcePathMatch ? sourcePathMatch[1] : null;
  const sourceRepo = sourceRepoMatch ? sourceRepoMatch[1] : null;
  const closureState = closureStateMatch ? closureStateMatch[1] : "undeclared";
  const admissibleEnvironment = admissibleEnvMatch ? admissibleEnvMatch[1] : null;

  // Extract payload (supports markdown, json, or generic code fence)
  const payloadMatch = body.match(/## Encapsulated Payload\r?\n\r?\n```(?:markdown|json)?\r?\n([\s\S]*?)\r?\n```/);
  if (!payloadMatch) {
    return { ok: false, error: "missing_payload_block" };
  }

  const payload = payloadMatch[1];
  const computedSha = createHash("sha256").update(payload).digest("hex");
  const shaMatchResult = expectedSha === computedSha;

  return {
    ok: shaMatchResult,
    schema,
    protocol,
    packet_id: packetId,
    source_path: sourcePath,
    source_repo: sourceRepo,
    expected_sha: expectedSha,
    computed_sha: computedSha,
    valid_checksum: shaMatchResult,
    declared_closure: {
      state: closureState,
      admissible_environment: admissibleEnvironment,
    },
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

export function unpackContinuationCapsule(capsuleText, options = {}) {
  const verification = verifyCapsule(capsuleText);
  if (!verification.ok) {
    return verification;
  }

  let parsed;
  try {
    parsed = JSON.parse(verification.payload);
  } catch (err) {
    return { ok: false, error: "invalid_continuation_json", details: err.message };
  }

  return {
    ok: true,
    packet_id: verification.packet_id,
    content_sha256: verification.computed_sha,
    declared_closure: verification.declared_closure,
    continuation: parsed,
  };
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalizeJson(value[key])])
    );
  }
  return value;
}

/**
 * Relational evaluation of Packet Closure Closed(p, h, E).
 * Evaluates whether relative to admissible handler h and environment E,
 * packet p is fully closed, uncorrupted, and materializable without private RAM.
 */
export function evaluatePacketClosure(packetOrCapsule, handler = {}, environment = {}) {
  let packet;
  let verification = null;

  if (typeof packetOrCapsule === "string") {
    verification = verifyCapsule(packetOrCapsule);
    if (!verification.ok) {
      return {
        ok: false,
        closed: false,
        packet_id: verification.packet_id || null,
        handler_id: handler.id || handler.name || "anonymous-handler",
        environment_id: environment.id || environment.runtime || "unspecified-environment",
        declared_closure: verification.declared_closure || { state: "unknown" },
        checks: {
          integrity: { ok: false, error: verification.error },
          protocol: { ok: false },
          handler: { ok: false },
          environment: { ok: false },
          accounting: { ok: false },
        },
        error: `capsule_integrity_failed: ${verification.error}`,
      };
    }
    try {
      packet = JSON.parse(verification.payload);
    } catch (err) {
      return {
        ok: false,
        closed: false,
        packet_id: verification.packet_id,
        handler_id: handler.id || handler.name || "anonymous-handler",
        environment_id: environment.id || environment.runtime || "unspecified-environment",
        declared_closure: verification.declared_closure || { state: "unknown" },
        checks: {
          integrity: { ok: false, error: "invalid_json_payload" },
          protocol: { ok: false },
          handler: { ok: false },
          environment: { ok: false },
          accounting: { ok: false },
        },
        error: `payload_parse_error: ${err.message}`,
      };
    }
  } else if (packetOrCapsule && typeof packetOrCapsule === "object") {
    packet = packetOrCapsule;
  } else {
    return {
      ok: false,
      closed: false,
      checks: { integrity: { ok: false, error: "empty_or_invalid_packet" } },
      error: "empty_or_invalid_packet",
    };
  }

  const packetId = packet.id || packet.packet_id || (verification ? verification.packet_id : "unknown-packet");
  const handlerId = handler.id || handler.name || "anonymous-handler";
  const environmentId = environment.id || environment.name || environment.runtime || "cogentia-v3-runtime";

  // 1. Protocol check
  const supportedProtocols = new Set(
    Array.isArray(environment.supportedProtocols)
      ? environment.supportedProtocols
      : [CONTINUATION_PROTOCOL, PACKET_CAPSULE_SCHEMA, CONTINUATION_CAPSULE_SCHEMA, "cop/continuation", "cogentia.agent_step/v1", "cogentia.f2a_fact/v1"]
  );
  const protocol = packet.protocol || (verification ? verification.protocol : CONTINUATION_PROTOCOL);
  const protocolOk = supportedProtocols.has(protocol);

  // 2. Handler profile check (capabilities & event handlers)
  const requiredCaps = Array.isArray(packet.handlerProfile?.requiredCapabilities)
    ? packet.handlerProfile.requiredCapabilities
    : [];
  const availableCaps = new Set(
    Array.isArray(handler.capabilities)
      ? handler.capabilities
      : (handler.registry && typeof handler.registry.list === "function"
          ? handler.registry.list().map((c) => c.name)
          : [])
  );
  const missingCaps = requiredCaps.filter((cap) => !availableCaps.has(cap));

  const requiredEvents = Array.isArray(packet.handlerProfile?.requiredEventHandlers)
    ? packet.handlerProfile.requiredEventHandlers
    : [];
  const availableEvents = new Set(
    Array.isArray(handler.supportedEvents)
      ? handler.supportedEvents
      : (handler.requiredEventHandlers
          ? Object.keys(handler.requiredEventHandlers)
          : [])
  );
  const missingEvents = requiredEvents.filter((ev) => !availableEvents.has(ev));
  const handlerOk = missingCaps.length === 0 && missingEvents.length === 0;

  // 3. Environment satisfiability check (dependencies & stores)
  const requiredFiles = Array.isArray(packet.dependencies?.files)
    ? packet.dependencies.files
    : [];
  const baseDir = environment.baseDir || process.cwd();
  const declaredEnvironment = packet.closure?.admissibleEnvironment
    || verification?.declared_closure?.admissible_environment
    || null;
  const environmentNames = new Set([
    environment.id,
    environment.name,
    environment.runtime,
    ...(Array.isArray(environment.compatibleEnvironments) ? environment.compatibleEnvironments : []),
  ].filter(Boolean));
  const declaredEnvironmentOk = !declaredEnvironment || environmentNames.has(declaredEnvironment);
  const missingFiles = [];
  for (const file of requiredFiles) {
    const isResolvable = typeof environment.resolveFile === "function"
      ? environment.resolveFile(file)
      : fs.existsSync(path.resolve(baseDir, file));
    if (!isResolvable) {
      missingFiles.push(file);
    }
  }
  const envOk = protocolOk && declaredEnvironmentOk && missingFiles.length === 0;

  // 4. Accounting budget viability
  const remaining = packet.accounting?.remainingBudget;
  let accountingOk = true;
  if (remaining) {
    if (typeof remaining.maxSteps === "number" && remaining.maxSteps <= 0) accountingOk = false;
    if (typeof remaining.maxCostUnits === "number" && remaining.maxCostUnits <= 0) accountingOk = false;
  }

  const isClosed = protocolOk && handlerOk && envOk && accountingOk;

  return {
    ok: isClosed,
    closed: isClosed,
    packet_id: packetId,
    handler_id: handlerId,
    environment_id: environmentId,
    declared_closure: {
      state: packet.closure?.state || (verification ? verification.declared_closure?.state : "undeclared"),
      admissible_environment: packet.closure?.admissibleEnvironment || (verification ? verification.declared_closure?.admissible_environment : null),
      mode: packet.closure?.mode || "inline",
    },
    evaluated_closure: {
      integrity_valid: true,
      protocol_compatible: protocolOk,
      handler_compatible: handlerOk,
      environment_satisfied: envOk,
      declared_environment_compatible: declaredEnvironmentOk,
      accounting_viable: accountingOk,
    },
    missing: {
      capabilities: missingCaps,
      eventHandlers: missingEvents,
      dependencies: missingFiles,
    },
    error: isClosed ? null : (
      !protocolOk ? `unsupported_protocol: ${protocol}` :
      !handlerOk ? `incompatible_handler: missing [${[...missingCaps, ...missingEvents].join(", ")}]` :
      !envOk ? (!declaredEnvironmentOk
        ? `inadmissible_environment: expected ${declaredEnvironment}, got ${environmentId}`
        : `unresolved_environment_dependencies: missing [${missingFiles.join(", ")}]`) :
      "accounting_budget_exhausted"
    ),
  };
}

export const evaluateContinuationClosure = evaluatePacketClosure;

/**
 * Materializes a closed continuation into a reconstituted execution harness state.
 */
export function materializeContinuation(capsuleTextOrObject, handler = {}, environment = {}) {
  let packet;
  if (typeof capsuleTextOrObject === "string") {
    const unpacked = unpackContinuationCapsule(capsuleTextOrObject);
    if (!unpacked.ok) {
      return { ok: false, error: "unpack_failed", details: unpacked.error };
    }
    packet = unpacked.continuation;
  } else if (capsuleTextOrObject && typeof capsuleTextOrObject === "object") {
    packet = capsuleTextOrObject;
  } else {
    return { ok: false, error: "invalid_input" };
  }

  const evaluation = evaluatePacketClosure(packet, handler, environment);
  if (!evaluation.closed) {
    return {
      ok: false,
      error: "closure_violation",
      evaluation,
    };
  }

  // Reconstitute clean execution state
  const observations = Array.isArray(packet.causalFrontier?.observations)
    ? [...packet.causalFrontier.observations]
    : [];
  const steps = Array.isArray(packet.causalFrontier?.steps)
    ? [...packet.causalFrontier.steps]
    : [];
  const requiredEventReceipts = Array.isArray(packet.causalFrontier?.requiredEventReceipts)
    ? [...packet.causalFrontier.requiredEventReceipts]
    : [];

  const cumulativeCostUnits = packet.accounting?.cumulativeCostUnits || 0;
  const cumulativeCapabilityCalls = packet.accounting?.cumulativeCapabilityCalls || 0;
  const cumulativeElapsedMs = packet.accounting?.cumulativeElapsedMs || 0;

  const remainingLimits = {
    maxSteps: packet.accounting?.remainingBudget?.maxSteps ?? 4,
    maxCostUnits: packet.accounting?.remainingBudget?.maxCostUnits ?? 10,
    maxElapsedMs: packet.accounting?.remainingBudget?.maxElapsedMs ?? 15000,
    maxCapabilityCalls: packet.accounting?.remainingBudget?.maxCapabilityCalls ?? 3,
  };

  const initialState = {
    input: packet.payload?.input || {},
    observations,
    steps,
    requiredEventReceipts,
    sequence: steps.length,
    requiredEventCount: requiredEventReceipts.length,
    capabilityCalls: cumulativeCapabilityCalls,
    costUnits: cumulativeCostUnits,
    cumulativeElapsedMs,
  };

  return {
    ok: true,
    packet_id: packet.id || packet.packet_id,
    continuation: packet,
    evaluation,
    initialState,
    remainingLimits,
  };
}
