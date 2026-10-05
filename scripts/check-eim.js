#!/usr/bin/env node

/**
 * Test runner and checker for Effectivity Interaction Matrix (EIM).
 * Validates all concrete EIM profiles in research/eim_examples/ and verifies semantic invariants.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateEimFile,
  validateEimRow,
  validateEimDocument,
  VALID_RESPONSE_STATES,
  VALID_EVIDENCE_STATES,
  VALID_PRIORITY_MODES,
  VALID_CAPACITY_DIRECTIONS,
} from "./lib/eim-validator.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const examplesDir = path.join(root, "research", "eim_examples");

console.log("=== Checking EIM Profiles and Examples ===");

// 1. Check all example files
const exampleFiles = [
  "2026-10-02-prefecture-p1-p18.yaml",
  "2026-10-02-capable-campaign.yaml",
  "2026-10-02-ta-d1-d10.yaml",
  "eim-twin-observation-example.yaml",
  "eim-non-legal-contribution.yaml",
];

let totalRows = 0;

for (const file of exampleFiles) {
  const filePath = path.join(examplesDir, file);
  assert(fs.existsSync(filePath), `Example file missing: ${file}`);
  const result = validateEimFile(filePath);
  assert(result.valid, `File validation failed for ${file}: ${result.errors.join("; ")}`);
  assert(result.rowCount > 0, `File ${file} has no rows`);
  assert.equal(result.validRowsCount, result.rowCount, `Not all rows are valid in ${file}`);
  totalRows += result.rowCount;
  console.log(`[PASS] ${file} (${result.profile}, ${result.rowCount} rows)`);
}

console.log(`\nVerified ${exampleFiles.length} profiles and ${totalRows} total rows.`);

// 2. Unit and Invariant Tests
console.log("\n=== Checking EIM Semantic Invariants & Schema Enforcement ===");

// Missing required field
{
  const invalidRow = {
    id: "TEST-01",
    subject_entity: "Subject",
    counterparty_entity: "Counterparty",
    // missing request
    response_state: "YES",
    evidence_status: "ESTABLISHED",
    effect_on_capacity: "Test effect",
  };
  const res = validateEimRow(invalidRow);
  assert.equal(res.valid, false);
  assert(res.errors.some((e) => e.includes('missing required field "request"')));
  console.log("[PASS] Invariant: missing required fields are rejected");
}

// Invalid enum values
{
  const invalidEnumRow = {
    id: "TEST-02",
    subject_entity: "Subject",
    counterparty_entity: "Counterparty",
    request: "Test request",
    response_state: "INVALID_STATE",
    evidence_status: "ESTABLISHED",
    effect_on_capacity: "Test effect",
  };
  const res = validateEimRow(invalidEnumRow);
  assert.equal(res.valid, false);
  assert(res.errors.some((e) => e.includes("invalid response_state")));
  console.log("[PASS] Invariant: invalid enum values are rejected");
}

// Role separation invariant warning
{
  const collapsedRolesRow = {
    id: "TEST-03",
    subject_entity: "Subject",
    counterparty_entity: "Single Authority",
    request: "Test request",
    response_state: "PENDING",
    evidence_status: "ESTABLISHED",
    effect_on_capacity: "Test effect",
    information_holder: "Authority X",
    decision_authority: "Authority X",
    transmitter: "Authority X",
    controller_or_reviewer: "Authority X",
  };
  const res = validateEimRow(collapsedRolesRow);
  assert.equal(res.valid, true);
  assert(res.warnings.some((w) => w.includes("procedural roles collapsed")));
  console.log("[PASS] Invariant: warning triggered on collapsed procedural roles");
}

// Silence rule invariant warning (silence != inferred refusal)
{
  const silenceRefusalRow = {
    id: "TEST-04",
    subject_entity: "Subject",
    counterparty_entity: "Counterparty",
    request: "Test request",
    response_state: "SILENCE",
    response_summary: "Le silence de deux mois vaut refus implicite",
    evidence_status: "ESTABLISHED",
    effect_on_capacity: "Delays decision",
  };
  const res = validateEimRow(silenceRefusalRow);
  assert.equal(res.valid, true);
  assert(res.warnings.some((w) => w.includes("response_state is SILENCE but response_summary infers refusal")));
  console.log("[PASS] Invariant: warning triggered on silence conflated with imputed refusal");
}

// Historical availability invariant warning
{
  const retroactiveEvidenceRow = {
    id: "TEST-05",
    subject_entity: "Subject",
    counterparty_entity: "Counterparty",
    request: "Test request",
    response_state: "YES",
    evidence_status: "ESTABLISHED",
    effect_on_capacity: "Test effect",
    evidence_available_now: true,
    evidence_available_at_relevant_time: false,
    // historical_availability_status missing
  };
  const res = validateEimRow(retroactiveEvidenceRow);
  assert.equal(res.valid, true);
  assert(res.warnings.some((w) => w.includes("declare historical_availability_status to prevent retro-projection")));
  console.log("[PASS] Invariant: warning triggered when contemporary evidence lacks historical availability status");
}

console.log("\nAll EIM profile checks and invariant assertions passed successfully.\n");
