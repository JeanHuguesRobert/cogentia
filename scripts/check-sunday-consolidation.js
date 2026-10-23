// File: scripts/test-sunday-consolidation.js
// Description: Automated test for Sunday Corpus Consolidation Runner (Issue #70).
// Verifies dual privacy domains: public digest vs private digest.

import fs from "node:fs";
import os from "node:os";
import path from "path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runWeeklyConsolidation } from "./lib/cogentia-core.js";
import { validateFrontmatterText } from "./lib/frontmatter-validator.js";

async function runSundayConsolidationTest() {
  console.log("🚀 Testing Sunday Corpus Consolidation Pipeline (Issue #70)...\n");

  const fixtureBase = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-consolidation-"));
  const fixtureRoot = path.join(fixtureBase, "cogentia");
  fs.mkdirSync(fixtureRoot, { recursive: true });
  for (const name of [
    "FractaVolta", "marenostrum", "barons-Mariani", "inseme", "Inox",
    "registre-mariani", "ubikia", "JeanHuguesRobert", "StructEnv",
  ]) {
    fs.mkdirSync(path.join(fixtureBase, name), { recursive: true });
  }

  let result;
  try {
    result = await runWeeklyConsolidation({
      root: fixtureRoot,
      now: "2026-09-20T17:42:14.761Z",
      fanOut: false,
    });
  console.log("Consolidation Result Summary:", JSON.stringify({
    ok: result.ok,
    sprint_tag: result.sprint_tag,
    timestamp: result.timestamp,
    privacy: result.privacy,
    packets_scanned: result.packets_scanned,
  }, null, 2));

  if (!result.ok) {
    throw new Error("❌ Sunday Consolidation failed!");
  }
  if (result.sprint_tag !== "2026-W38") {
    throw new Error(`Expected deterministic W38 fixture, got ${result.sprint_tag}`);
  }

  const publicDigest = result.privacy?.public?.digest_path || result.digest_path;
  const privateDigest = result.privacy?.private?.digest_path || result.full_digest_path;
  const publicLlms = result.privacy?.public?.llms_path;
  const privateLlms = result.privacy?.private?.llms_path;

  for (const [label, p] of [
    ["public digest", publicDigest],
    ["private digest", privateDigest],
    ["public llms", publicLlms],
    ["private llms", privateLlms],
  ]) {
    if (!p || !fs.existsSync(p)) {
      throw new Error(`❌ Missing ${label}: ${p}`);
    }
  }

  const publicText = fs.readFileSync(publicDigest, "utf8");
  const privateText = fs.readFileSync(privateDigest, "utf8");
  const publicLlmsText = fs.readFileSync(publicLlms, "utf8");
  const privateLlmsText = fs.readFileSync(privateLlms, "utf8");

  if (!fs.existsSync(path.join(fixtureRoot, "docs", "registry.json"))) {
    throw new Error("Registry must be written under the supplied root, independently of process.cwd()");
  }
  if (fs.existsSync(path.join(fixtureBase, "FractaVolta", "llms.txt"))) {
    throw new Error("fanOut: false must preserve sibling repository files");
  }

  // A fresh run must report observations, not replay historical milestones
  // or attribute mechanically generated prose to an unverified human author.
  for (const text of [publicText, privateText]) {
    const metadata = validateFrontmatterText(text, { strictRole: true });
    if (!metadata.valid) throw new Error(`Invalid generated metadata: ${metadata.errors.join("; ")}`);
    if (/18 tools|80 MB RAM|COP Accounting Simulator|When Cognition Became Traffic/.test(text)) {
      throw new Error("Digest repeats historical milestones or priorities without current evidence");
    }
    if (!text.includes("author: unknown\n") || !text.includes("generated_by: scripts/lib/consolidation.js\n")) {
      throw new Error("Digest must identify mechanical generation without inventing human authorship");
    }
    if (!text.includes("**0 recent commit entries**") || !text.includes("not verified by this pipeline")) {
      throw new Error("Empty fixture must report bounded observations and verification limits");
    }
  }

  if (publicText.length < 500) {
    throw new Error("Expected public weekly digest size > 500 bytes");
  }
  if (privateText.length < 500) {
    throw new Error("Expected private weekly digest size > 500 bytes");
  }
  if (!publicText.startsWith("---\n") || !/\nvisibility: public\n/.test(publicText)) {
    throw new Error("❌ Public digest must carry complete public frontmatter");
  }

  // Privacy invariants
  if (/registre-mariani/i.test(publicText)) {
    throw new Error("❌ Public digest must not name registre-mariani");
  }
  if (/-\s+\*\*\[registre-mariani\]\*\*/i.test(publicLlmsText)) {
    throw new Error("❌ Public llms.txt must not list registre-mariani as a repository entry");
  }
  if (!/-\s+\*\*\[registre-mariani\]\*\*/i.test(privateLlmsText)) {
    throw new Error("❌ Private llms projection must list registre-mariani");
  }
  if (!publicLlmsText.includes("Privacy view: **public**")) {
    throw new Error("❌ Public llms.txt missing privacy view banner");
  }
  if (!privateLlmsText.includes("Privacy view: **private**")) {
    throw new Error("❌ Private llms projection missing privacy view banner");
  }
  if (publicText.includes("High-Signal Downloads Ingest") && publicText.includes("📄 `")) {
    throw new Error("❌ Public digest must not list local download filenames");
  }
  if (!privateLlms.includes(`${path.sep}.cogentia${path.sep}projections`) && !privateLlms.includes("/.cogentia/projections") && !privateLlms.includes(".cogentia\\projections") && !privateLlms.includes(".cogentia/projections")) {
    throw new Error(`❌ Private llms must live under .cogentia/projections, got: ${privateLlms}`);
  }

  // Leaked projections cleaned from private repo root
  const privateRepoLlms = path.resolve(fixtureRoot, "..", "registre-mariani", "llms.txt");
  if (fs.existsSync(privateRepoLlms)) {
    const leaked = fs.readFileSync(privateRepoLlms, "utf8");
    if (leaked.includes("Generated by cogentia.js")) {
      throw new Error("❌ registre-mariani/llms.txt still contains cogentia-generated public leak");
    }
  }

  const trackedOutputs = [publicDigest, privateDigest, publicLlms, privateLlms,
    result.privacy.public.llms_full_path, result.privacy.private.llms_full_path,
    path.join(fixtureRoot, "docs", "registry.json"),
    result.consolidation_packet, result.scheduled_next_packet];
  const snapshot = trackedOutputs.map(file => [file, fs.readFileSync(file, "utf8"), fs.statSync(file).mtimeMs]);
  const repeat = await runWeeklyConsolidation({ root: fixtureRoot, now: "2026-09-20T18:00:00.000Z", fanOut: false });
  if (!repeat.skipped) throw new Error("Complete same-week run must skip");
  for (const [file, bytes, mtime] of snapshot) {
    if (fs.readFileSync(file, "utf8") !== bytes || fs.statSync(file).mtimeMs !== mtime) {
      throw new Error(`Repeat run rewrote ${file}`);
    }
  }
  for (const missing of [privateDigest, result.privacy.private.llms_full_path, result.scheduled_next_packet]) {
    fs.unlinkSync(missing);
    const recovered = await runWeeklyConsolidation({ root: fixtureRoot, now: "2026-09-20T18:00:00.000Z", fanOut: false });
    if (recovered.skipped || !fs.existsSync(missing)) throw new Error(`Partial output was not recovered: ${missing}`);
  }
  fs.writeFileSync(result.consolidation_packet, "{broken");
  const recoveredPacket = await runWeeklyConsolidation({ root: fixtureRoot, now: "2026-09-20T18:00:00.000Z", fanOut: false });
  if (recoveredPacket.skipped || JSON.parse(fs.readFileSync(result.consolidation_packet)).status !== "completed") {
    throw new Error("Malformed completion packet must not mask incomplete work");
  }
  const forced = await runWeeklyConsolidation({ root: fixtureRoot, now: "2026-09-20T19:00:00.000Z", force: true, fanOut: false });
  if (forced.skipped || !fs.readFileSync(publicDigest, "utf8").includes("2026-09-20T19:00:00.000Z")) {
    throw new Error("Force must regenerate a complete week");
  }
  const fanOut = await runWeeklyConsolidation({ root: fixtureRoot, now: "2026-09-20T20:00:00.000Z" });
  if (fanOut.skipped || !fs.existsSync(path.join(fixtureBase, "FractaVolta", "llms.txt"))) {
    throw new Error("Requesting missing sibling projections must regenerate them");
  }

  // Execute the service's real CLI arguments in the isolated fixture so a
  // typo such as `corpus consolidate` cannot silently return to the timer.
  const service = fs.readFileSync(new URL("../systemd/cogentia-consolidation.service", import.meta.url), "utf8");
  const serviceCommand = service.match(/^ExecStart=(.+)$/m)?.[1].trim().split(/\s+/);
  if (!serviceCommand || serviceCommand.length < 3) throw new Error("Missing service command");
  const cli = fileURLToPath(new URL("./cogentia.js", import.meta.url));
  const invocation = spawnSync(process.execPath, [cli, ...serviceCommand.slice(2), "--at", "2026-09-20T21:00:00.000Z", "--force", "--json"], {
    cwd: fixtureRoot,
    encoding: "utf8",
    timeout: 30000,
    env: { ...process.env, COGENTIA_REGISTRY: path.join(fixtureRoot, ".cogentia.json") },
  });
  if (invocation.status !== 0 || !fs.readFileSync(publicDigest, "utf8").includes("2026-09-20T21:00:00.000Z")) {
    throw new Error(`Service command did not generate a weekly digest: ${invocation.stderr}`);
  }

  console.log(`\n✓ Public digest:  ${publicDigest} (${fs.statSync(publicDigest).size} bytes)`);
  console.log(`✓ Private digest: ${privateDigest} (${fs.statSync(privateDigest).size} bytes)`);
  console.log(`✓ Public llms:    ${publicLlms}`);
  console.log(`✓ Private llms:   ${privateLlms}`);

  console.log("==========================================================================");
  console.log("✅ SUNDAY CORPUS CONSOLIDATION DUAL-PRIVACY VERIFICATION PASSED (100%)");
  console.log("==========================================================================");
  } finally {
    fs.rmSync(fixtureBase, { recursive: true, force: true });
  }
}

runSundayConsolidationTest().catch(err => {
  console.error("❌ Sunday Consolidation Test Failed:", err);
  process.exit(1);
});
