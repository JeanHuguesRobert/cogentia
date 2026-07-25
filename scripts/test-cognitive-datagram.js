// File: scripts/test-cognitive-datagram.js
// Description: Empirical Rossignol Test for Cognitive Datagram Routing (Issue #69 / #71 / #72).

import fs from "node:fs";
import path from "node:path";
import { appendSerendipityTraceToPacket } from "./lib/packet-attractor-blackboard.js";

async function testCognitiveDatagramRossignol() {
  console.log("🚀 Running Empirical Rossignol Test for Cognitive Datagram Routing...\n");

  // 1. Construct Initial Cognitive Datagram
  const initialPacket = {
    packet_id: "CPKT-2026-W30-POUZIN-001",
    origin_home: "https://jhn.baronsmariani.org/",
    destination: "https://cogentia.fractavolta.com/mcp",
    mandate: {
      mission: "Resolve concept Louis Pouzin Datagram and verify Serendipity Trace",
      budget_units: 50
    },
    payload: {
      teleological_result: {
        status: "completed",
        attractor: "louis_pouzin_datagram_pioneer.md"
      }
    }
  };

  console.log("✓ Step 1: Initial Cognitive Datagram Constructed.");
  console.log("  Origin Home:", initialPacket.origin_home);
  console.log("  Destination:", initialPacket.destination);

  // 2. Append Serendipitous Path Discovery
  const enrichedPacket = appendSerendipityTraceToPacket(initialPacket, {
    unqueried_attractor: "debord_stabilisateur_procedural.md",
    repository: "barons-Mariani",
    reason: "Encountered 1-hop cross-link between Procedural Reality Stabilizers and Pouzin Datagrams during navigation traversal",
    epistemic_value_score: 0.92
  });

  console.log("\n✓ Step 2: Serendipitous Discovery Appended to Datagram Payload.");
  console.log("  Serendipity Entry:", JSON.stringify(enrichedPacket.serendipity_ledger[0], null, 2));

  // 3. Verification of Datagram Integrity
  if (!enrichedPacket.serendipity_ledger || enrichedPacket.serendipity_ledger.length !== 1) {
    throw new Error("❌ Cognitive Datagram failed serendipity ledger verification!");
  }

  if (enrichedPacket.serendipity_ledger[0].epistemic_value_score !== 0.92) {
    throw new Error("❌ Epistemic value score mismatch!");
  }

  console.log("\n==========================================================================");
  console.log("✅ COGNITIVE DATAGRAM ROSSIGNOL TEST PASSED (100% EMPIRICAL GROUNDING)");
  console.log("==========================================================================");
}

testCognitiveDatagramRossignol().catch(err => {
  console.error("❌ Cognitive Datagram Rossignol Test Failed:", err);
  process.exit(1);
});
