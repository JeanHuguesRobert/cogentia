#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import {
  computeGitBlobSha,
  validatePossibleMatrixFile,
} from "./lib/possible-matrix-validator.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "scripts", "cogentia.js");

function baseMatrix(blobSha) {
  return {
    schema_version: "cogentia.possible-matrix.v0",
    kind: "longitudinal_possible_matrix",
    matrix_id: "test.possibles.v0",
    subject: { id: "person:test", label: "Test Person" },
    source_projection: {
      document: "source.md",
      blob_sha: blobSha,
      projection_status: "working_derived_projection",
    },
    dynamic_vocabulary: {
      dynamics: ["capacity", "open", "maintain", "friction", "close", "reopen", "load", "unknown"],
      scope_delta: ["narrow", "same", "expand", "unknown"],
    },
    possible_registry: [
      { id: "p:root", label: "Root Possible" },
      { id: "p:child", label: "Child Possible", parent_ids: ["p:root"] },
    ],
    events: [
      {
        id: "test-2026-001",
        sequence: 1,
        when: { value: "2026-09-09", precision: "day" },
        domain: ["test"],
        observation: "A possible is opened.",
        dynamics: ["open"],
        possible_ids: ["p:root"],
        observed_outcome: "Root becomes reachable.",
        causal: { status: "not_claimed" },
        evidence: [{
          ref: "fixture:1",
          source_class: "primary_artifact",
          epistemic_status: ["trace", "fact"],
          supports: ["fixture event"],
          visibility: "public",
        }],
        descendant_possible_ids: ["p:child"],
      },
      {
        id: "test-2026-002",
        sequence: 2,
        when: { value: "2026-09", precision: "month" },
        domain: ["test"],
        observation: "The branch is maintained.",
        dynamics: ["maintain"],
        possible_ids: ["p:child"],
        observed_outcome: "Child remains reachable.",
        causal: { status: "supported", counterevidence: [] },
        evidence: [{
          ref: "fixture:2",
          source_class: "institutional_record",
          epistemic_status: ["trace", "fact"],
          supports: ["maintenance"],
          visibility: "public",
        }],
      },
    ],
  };
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "possible-matrix-test-"));
try {
  const source = path.join(tmp, "source.md");
  const matrix = path.join(tmp, "matrix.yaml");
  fs.writeFileSync(source, "# Source\n", "utf8");

  const valid = baseMatrix(computeGitBlobSha(source));
  fs.writeFileSync(matrix, yaml.dump(valid, { noRefs: true, lineWidth: 120 }), "utf8");

  const report = validatePossibleMatrixFile(matrix);
  assert.equal(report.ok, true, report.errors.join("; "));
  assert.equal(report.counts.events, 2);
  assert.equal(report.counts.possibles, 2);
  assert.equal(report.graph.ok, true);
  assert.equal(report.projection.status, "verified");

  const missingRequired = structuredClone(valid);
  delete missingRequired.matrix_id;
  fs.writeFileSync(matrix, yaml.dump(missingRequired, { noRefs: true }), "utf8");
  assert.equal(validatePossibleMatrixFile(matrix).ok, false);
  assert.ok(validatePossibleMatrixFile(matrix).errors.some((error) => error.includes("matrix_id")));

  fs.writeFileSync(matrix, "events: [unclosed\n", "utf8");
  const badYaml = validatePossibleMatrixFile(matrix);
  assert.equal(badYaml.ok, false);
  assert.ok(badYaml.errors.some((error) => error.includes("YAML parse error")));

  const badRef = structuredClone(valid);
  badRef.events[0].possible_ids = ["p:missing"];
  fs.writeFileSync(matrix, yaml.dump(badRef, { noRefs: true }), "utf8");
  assert.ok(validatePossibleMatrixFile(matrix).errors.some((error) => error.includes("unresolved possible id p:missing")));

  const badSequence = structuredClone(valid);
  badSequence.events[1].sequence = 7;
  fs.writeFileSync(matrix, yaml.dump(badSequence, { noRefs: true }), "utf8");
  assert.ok(validatePossibleMatrixFile(matrix).errors.some((error) => error.includes("sequence must be 2")));

  const badCycle = structuredClone(valid);
  badCycle.possible_registry[0].parent_ids = ["p:child"];
  fs.writeFileSync(matrix, yaml.dump(badCycle, { noRefs: true }), "utf8");
  assert.ok(validatePossibleMatrixFile(matrix).errors.some((error) => error.includes("possible graph cycle")));

  const badBlob = structuredClone(valid);
  badBlob.source_projection.blob_sha = "0".repeat(40);
  fs.writeFileSync(matrix, yaml.dump(badBlob, { noRefs: true }), "utf8");
  const blobReport = validatePossibleMatrixFile(matrix);
  assert.equal(blobReport.projection.status, "source_blob_mismatch");
  assert.equal(blobReport.ok, false);

  fs.writeFileSync(matrix, yaml.dump(valid, { noRefs: true }), "utf8");
  const stdout = execFileSync(process.execPath, [cli, "possible-matrix", "validate", matrix, "--json"], {
    cwd: root,
    encoding: "utf8",
  });
  const parsed = JSON.parse(stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.counts.events, 2);

  const siblingRealityCase = path.resolve(
    root,
    "..",
    "barons-Mariani",
    "memory",
    "marie-louise",
    "possible_matrix.yaml",
  );
  if (fs.existsSync(siblingRealityCase)) {
    const realityReport = validatePossibleMatrixFile(siblingRealityCase);
    assert.equal(
      realityReport.ok,
      true,
      `Marie-Louise Reality Case must validate: ${realityReport.errors.join("; ")}`,
    );
    assert.equal(realityReport.counts.events, 26);
    assert.equal(realityReport.projection.status, "verified");
  }

  const invalidCli = structuredClone(valid);
  invalidCli.events[0].possible_ids = ["p:nope"];
  fs.writeFileSync(matrix, yaml.dump(invalidCli, { noRefs: true }), "utf8");
  assert.throws(
    () => execFileSync(process.execPath, [cli, "possible-matrix", "validate", matrix, "--json"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
    /Command failed/,
  );

  console.log("possible-matrix validator tests passed");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
