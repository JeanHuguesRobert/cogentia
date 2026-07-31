// File: scripts/test-digital-twin-engine.js
// Description: Test suite for Generic Digital Twin Engine & Instance Binding Loader.

import {
  loadDigitalTwinInstance,
  formatInstanceOutboundDisclosure,
  evaluateInstancePolicy,
  DEFAULT_INSTANCE_MANIFESTS
} from "./lib/digital-twin-engine.js";

async function runTest() {
  console.log("==========================================================================");
  console.log("       TESTING GENERIC DIGITAL TWIN ENGINE & INSTANCE BINDING           ");
  console.log("==========================================================================");

  // 1. Test JHN Personal Instance Manifest Loading
  console.log("\n[Test 1] Loading JHN Personal Instance ('jhn-personal')...");
  const jhnInstance = await loadDigitalTwinInstance({ instanceId: "jhn-personal" });
  console.log("  Bot Name:", jhnInstance.bot_name);
  console.log("  Class:", jhnInstance.class);
  console.log("  Principal Repo (SoT):", jhnInstance.principal_repo);
  console.log("  Disclosure Tag:", jhnInstance.disclosure_tag);

  if (jhnInstance.principal_repo !== "JeanHuguesRobert/JeanHuguesRobert") {
    throw new Error(`❌ FAIL: JHN Personal Instance must point to Principal Repo 'JeanHuguesRobert/JeanHuguesRobert', got '${jhnInstance.principal_repo}'`);
  }
  console.log("  ✓ PASS: JHN Personal Instance correctly bound to Principal SoT 'JeanHuguesRobert/JeanHuguesRobert'");

  // 2. Test Pertitellu Collective Instance Manifest Loading
  console.log("\n[Test 2] Loading Pertitellu Collective Instance ('pertitellu-corte')...");
  const pertitelluInstance = await loadDigitalTwinInstance({ instanceId: "pertitellu-corte" });
  console.log("  Bot Name:", pertitelluInstance.bot_name);
  console.log("  Class:", pertitelluInstance.class);
  console.log("  Principal Repo (SoT):", pertitelluInstance.principal_repo);
  console.log("  Disclosure Tag:", pertitelluInstance.disclosure_tag);

  if (pertitelluInstance.principal_repo !== "JeanHuguesRobert/pertitellu") {
    throw new Error(`❌ FAIL: Pertitellu Collective Instance must point to 'JeanHuguesRobert/pertitellu', got '${pertitelluInstance.principal_repo}'`);
  }
  console.log("  ✓ PASS: Pertitellu Collective Instance bound to 'JeanHuguesRobert/pertitellu'");

  // 3. Test Outbound Disclosure Formatting
  console.log("\n[Test 3] Testing Outbound Disclosure Formatting...");
  const rawMsg = "Ceci est une réponse synthétisée par Cogentia.";
  const jhnFormatted = formatInstanceOutboundDisclosure(jhnInstance, rawMsg);
  console.log("  JHN Outbound:\n" + jhnFormatted);

  if (!jhnFormatted.includes("— agent-jhn-experimental")) {
    throw new Error("❌ FAIL: JHN outbound message missing disclosure tag!");
  }
  console.log("  ✓ PASS: Outbound disclosure formatting verified.");

  // 4. Test Policy Evaluation
  console.log("\n[Test 4] Testing Policy Evaluation...");
  const selfCheck = evaluateInstancePolicy(jhnInstance, { isSelf: true, channel: "whatsapp" });
  console.log("  JHN Self-Chat Allowed:", selfCheck.allowed);

  const thirdPartyCheck = evaluateInstancePolicy(jhnInstance, { isSelf: false, channel: "whatsapp" });
  console.log("  JHN Third-Party Rejected:", !thirdPartyCheck.allowed, `(${thirdPartyCheck.code})`);

  if (!selfCheck.allowed || thirdPartyCheck.allowed) {
    throw new Error("❌ FAIL: Policy evaluation logic mismatch!");
  }
  console.log("  ✓ PASS: Policy evaluation logic verified.");

  // 5. Test Universal External Surface Contract
  console.log("\n[Test 5] Testing Universal External Surface Contract (Readonly, Zero Guarantees)...");
  if (!jhnInstance.external_surface_contract || !jhnInstance.external_surface_contract.readonly) {
    throw new Error("❌ FAIL: JHN Instance missing Readonly External Surface Contract!");
  }
  if (jhnInstance.external_surface_contract.legal_engagement !== false) {
    throw new Error("❌ FAIL: External surface must have legal_engagement = false!");
  }
  console.log("  Contract Rule:", jhnInstance.external_surface_contract.contract_rule);
  console.log("  ✓ PASS: Universal External Surface Contract (Readonly, Zero-Guarantees, Zero-Engagement) verified.");

  console.log("\n==========================================================================");
  console.log("✓ ALL DIGITAL TWIN ENGINE TESTS PASSED (100% SUCCESS)");
  console.log("==========================================================================");
}

runTest().catch((err) => {
  console.error("❌ TEST FAILURE:", err);
  process.exit(1);
});
