#!/usr/bin/env node

import assert from "node:assert/strict";
import { checkSemanticMutation, MUTATION_STATUS } from "./lib/semantic-mutation-checker.js";

console.log("Running Semantic Mutation Type Checker regression test suite...");

// ---------------------------------------------------------------------
// Fixture 1: JHN Architecture before & after commit ac3bb1c (Regression 1)
// ---------------------------------------------------------------------
const jhnArchitectureBefore = `---
title: "JHN Architecture"
subtitle: "Normative definition of a packet/continuation computational architecture"
author: "Jean Hugues Noël Robert, baron Mariani"
date: "2026-08-14"
version: "0.2"
document_role: "source"
document_kind: "architecture-specification"
update_policy: "UP-DESIRED-PRESENT"
---
# JHN Architecture
Normative specification content.
`;

const jhnArchitectureAccidentalMutation = `---
title: "JHN Architecture"
author: "Jean Hugues Noël Robert, baron Mariani"
date: "2026-08-25"
version: "0.3"
document_role: "source"
document_kind: "working-note"
update_policy: "UP-DEFAULT-REVIEWED"
---
# JHN Architecture
Working note with 800 lines of explanatory rationale.
`;

const result1 = checkSemanticMutation(jhnArchitectureBefore, jhnArchitectureAccidentalMutation, {
  filePath: "research/jhn_architecture.md",
});

assert.equal(result1.status, MUTATION_STATUS.BLOCK, "Regression 1 must BLOCK on silent document_kind mutation and policy weakening");
assert.equal(result1.ok, false);
assert.ok(result1.blocks.some(b => b.code === "MUTATION_BLOCKED_PROTECTED_KIND"), "Must report MUTATION_BLOCKED_PROTECTED_KIND");
assert.ok(result1.blocks.some(b => b.code === "MUTATION_BLOCKED_POLICY_WEAKENING"), "Must report MUTATION_BLOCKED_POLICY_WEAKENING");
console.log("  ✓ Regression 1 passed: Blocked silent document_kind and policy mutation (ac3bb1c incident)");

// ---------------------------------------------------------------------
// Fixture 2: Learning Computer version 0.5 vs changelog v0.8 (Regression 2)
// ---------------------------------------------------------------------
const learningComputerMismatched = `---
title: "The Network is the Learning Computer"
author: "Jean Hugues Noël Robert, baron Mariani"
date: "2026-08-15"
version: 0.5
update_policy: "UP-ARCHAEOLOGY-LIVING"
changelog:
  - "v0.1 (2026-08-15) — initial"
  - "v0.5 (2026-08-21) — intent routing"
  - "v0.7 (2026-08-25) — packet semantics"
  - "v0.8 (2026-08-25) — absorbed rationale from JHN architecture"
---
# The Network is the Learning Computer
`;

const result2 = checkSemanticMutation("", learningComputerMismatched, {
  filePath: "research/the_network_is_the_learning_computer.md",
});

assert.equal(result2.status, MUTATION_STATUS.BLOCK, "Regression 2 must BLOCK on version vs changelog contradiction");
assert.equal(result2.ok, false);
assert.ok(result2.blocks.some(b => b.code === "INCONSISTENCY_VERSION_CHANGELOG_MISMATCH"), "Must report INCONSISTENCY_VERSION_CHANGELOG_MISMATCH");
console.log("  ✓ Regression 2 passed: Blocked version 0.5 vs changelog v0.8 contradiction");

// ---------------------------------------------------------------------
// Fixture 3: Repaired canonical state (f01c2c5 / current repaired state)
// ---------------------------------------------------------------------
const jhnRepaired = `---
title: "JHN Architecture"
author: "Jean Hugues Noël Robert, baron Mariani"
date: "2026-08-14"
version: "0.3"
document_role: "source"
document_kind: "architecture-specification"
update_policy: "UP-DESIRED-PRESENT"
changelog:
  - "v0.1 (2026-08-14) — initial"
  - "v0.2 (2026-08-14) — review"
  - "v0.3 (2026-08-25) — refactored into short normative conformance specification"
---
# JHN Architecture
Normative specification invariants.
`;

const result3 = checkSemanticMutation(jhnArchitectureBefore, jhnRepaired, {
  filePath: "research/jhn_architecture.md",
});

assert.equal(result3.status, MUTATION_STATUS.PASS, "Repaired JHN Architecture state must PASS");
assert.equal(result3.ok, true);
assert.equal(result3.blocks.length, 0);
console.log("  ✓ Passing case passed: Repaired canonical state cleanly validated (f01c2c5)");

// ---------------------------------------------------------------------
// Fixture 4: Learning Computer repaired state (v0.8 and chronological changelog)
// ---------------------------------------------------------------------
const learningComputerRepaired = `---
title: "The Network is the Learning Computer"
author: "Jean Hugues Noël Robert, baron Mariani"
date: "2026-08-15"
version: "0.8"
update_policy: "UP-ARCHAEOLOGY-LIVING"
changelog:
  - "v0.1 (2026-08-15) — initial"
  - "v0.2 (2026-08-15) — self-contained"
  - "v0.3 (2026-08-15) — renamed"
  - "v0.4 (2026-08-17) — physarum"
  - "v0.5 (2026-08-21) — intent"
  - "v0.6 (2026-08-22) — potentics"
  - "v0.7 (2026-08-25) — closure"
  - "v0.8 (2026-08-25) — rationale"
---
# The Network is the Learning Computer
`;

const result4 = checkSemanticMutation("", learningComputerRepaired, {
  filePath: "research/the_network_is_the_learning_computer.md",
});

assert.equal(result4.status, MUTATION_STATUS.PASS, "Repaired Learning Computer v0.8 state must PASS");
assert.equal(result4.ok, true);
assert.equal(result4.blocks.length, 0);
console.log("  ✓ Passing case passed: Learning Computer v0.8 cleanly validated");

// ---------------------------------------------------------------------
// Fixture 5: Desired Present Narrative Bloat (Warning)
// ---------------------------------------------------------------------
const jhnWithNarrativeBloat = `---
title: "JHN Architecture"
author: "Jean Hugues Noël Robert, baron Mariani"
date: "2026-08-14"
version: "0.3"
document_role: "source"
document_kind: "architecture-specification"
update_policy: "UP-DESIRED-PRESENT"
---
# JHN Architecture
## Definition
Invariants.

## Prior Art
Extensive narrative on Scheme call/cc in 1986.
`;

const result5 = checkSemanticMutation(jhnArchitectureBefore, jhnWithNarrativeBloat, {
  filePath: "research/jhn_architecture.md",
});

assert.equal(result5.status, MUTATION_STATUS.WARN, "Explanatory bloat in UP-DESIRED-PRESENT must WARN");
assert.ok(result5.warnings.some(w => w.code === "TENDENCY_DESIRED_PRESENT_NARRATIVE_BLOAT"));
console.log("  ✓ Warning tendency passed: Detected explanatory section in UP-DESIRED-PRESENT");

// ---------------------------------------------------------------------
// Fixture 6: Changelog Disorder (Warning)
// ---------------------------------------------------------------------
const learningComputerDisordered = `---
title: "The Network is the Learning Computer"
author: "Jean Hugues Noël Robert, baron Mariani"
date: "2026-08-15"
version: "0.8"
update_policy: "UP-ARCHAEOLOGY-LIVING"
changelog:
  - "v0.1 (2026-08-15) — initial"
  - "v0.8 (2026-08-25) — absorbed rationale"
  - "v0.7 (2026-08-25) — closure"
---
# The Network is the Learning Computer
`;

const result6 = checkSemanticMutation("", learningComputerDisordered, {
  filePath: "research/the_network_is_the_learning_computer.md",
});

assert.equal(result6.status, MUTATION_STATUS.WARN, "Changelog disorder must produce a WARN");
assert.ok(result6.warnings.some(w => w.code === "INCONSISTENCY_CHANGELOG_ORDER"));
console.log("  ✓ Warning tendency passed: Detected disordered changelog entries");

console.log("\nAll Semantic Mutation Type Checker tests passed successfully!\n");
