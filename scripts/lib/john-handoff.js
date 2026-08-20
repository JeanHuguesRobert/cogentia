import { execSync } from "node:child_process";
import {
  validateJohnRequest,
  buildCognitivePacketFromJohnRequest,
  runJohnRequest,
  renderJohnEventHuman,
} from "./john-run.js";

/**
 * Safely inspects local git context (commit SHA, branch) without crashing if not in git.
 */
export function getLocalGitContext() {
  try {
    const commit = execSync("git rev-parse HEAD", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    let branch = "unknown";
    try {
      branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch {}
    return { commit, branch, available: true };
  } catch {
    return { commit: null, branch: null, available: false };
  }
}

/**
 * Packs a John request into a sealed, self-contained Cognitive Packet suitable
 * for transport across memory/machine barriers (via file, stream, P2P, or bus).
 */
export function packHandoffPacket(request, { targetNode = null, gitContext = null } = {}) {
  const problems = validateJohnRequest(request);
  if (problems.length > 0) {
    throw new Error(`Invalid John request: ${problems.map((p) => `${p.path}: ${p.message}`).join(", ")}`);
  }

  const git = gitContext || getLocalGitContext();
  const packet = buildCognitivePacketFromJohnRequest(request);

  // Augment envelope for cross-machine handoff
  if (targetNode) {
    packet.envelope.routeTo = targetNode;
  }
  packet.envelope.kind = "john.request.handoff";
  packet.envelope.lineage = {
    ...(packet.envelope.lineage || {}),
    git_commit: git.commit,
    git_branch: git.branch,
    spawn_reason: "inter_machine_handoff",
    sealed_at: new Date().toISOString(),
  };

  return packet;
}

/**
 * Unpacks and inspects a Cognitive Packet without executing it.
 */
export function unpackHandoffPacket(packet) {
  if (!packet || !packet.envelope || !packet.payload) {
    throw new Error("Invalid Cognitive Packet: missing envelope or payload");
  }

  const env = packet.envelope;
  const req = packet.payload.request || packet.payload;

  return {
    packetId: env.id,
    kind: env.packetKind || env.kind,
    intent: env.intent,
    requiredCapability: env.requiredCapability,
    routeTo: env.routeTo || null,
    riskLevel: env.riskLevel || req.exposure || "read_only",
    status: env.status,
    ithaca: env.ithaca || null,
    gitContext: {
      commit: env.lineage?.git_commit || null,
      branch: env.lineage?.git_branch || null,
    },
    budget: req.budget || null,
    executionBudget: req.execution_budget || null,
    principal: req.principal || null,
    mandate: req.mandate || null,
  };
}

/**
 * Runs a received Cognitive Packet on the local machine using local resources/SQLite
 * and produces a sealed Yield Cognitive Packet targeting the sender's Ithaca.
 */
export async function runHandoffPacket(packet, options = {}) {
  const inspection = unpackHandoffPacket(packet);
  const request = packet.payload.request || packet.payload;

  // Execute request locally through John harness
  const events = await runJohnRequest(request, options);

  // Find completion event and build return yield packet
  const completedEvent = events.find((e) => e.type === "john.run.completed");
  const failedEvent = events.find((e) => e.type === "john.run.failed");

  const isSuccess = Boolean(completedEvent);
  const yieldData = isSuccess ? (completedEvent.data?.result?.yield || completedEvent.result?.yield) : null;
  const failureReason = failedEvent ? (failedEvent.data?.code || failedEvent.data?.data?.code) : null;

  const returnPacket = {
    envelope: {
      id: `pkt-yield-${packet.envelope.id}`,
      packetKind: "john.yield.handoff",
      intent: `Yield for: ${inspection.intent}`,
      status: isSuccess ? "solved" : "failed",
      routeTo: packet.envelope.ithaca?.return_target || "origin-caller",
      ithaca: packet.envelope.ithaca,
      lineage: {
        upstream_packet_id: packet.envelope.id,
        solved_by_node: options.nodeId || "local-node",
        solved_at: new Date().toISOString(),
      },
      hops: [
        ...(packet.envelope.hops || []),
        {
          hop_index: (packet.envelope.hops?.length || 0),
          node_id: options.nodeId || "local-node",
          instance_id: "john-handoff-executor",
          route_reason: isSuccess ? "packet-solved" : `packet-failed:${failureReason}`,
          timestamp: new Date().toISOString(),
        },
      ],
      residue: packet.envelope.residue || [],
    },
    yield: yieldData,
    failure: failureReason ? { code: failureReason } : null,
    events,
  };

  return {
    success: isSuccess,
    events,
    returnPacket,
  };
}
