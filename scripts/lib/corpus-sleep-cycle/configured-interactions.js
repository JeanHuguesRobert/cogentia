// Optional scheduled mission. Private runtime state never lives in source repos.
import fs from "node:fs";
import path from "node:path";
import { createInteractionSourceAdapter, privateWrite } from "./interaction-source-adapter.js";
import { runMonteCarloAudit } from "./sleep-cycle-engine.js";

export async function runConfiguredInteractions(options = {}) {
  const configFile = options.configFile || process.env.COGENTIA_INTERACTION_CONFIG;
  if (!configFile) return { status: "SKIPPED", code: "NOT_CONFIGURED", phase: "interaction_evidence" };
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configFile, "utf8"));
    if (!config.authorized || !path.isAbsolute(config.stateRoot)) throw new Error();
    fs.mkdirSync(config.stateRoot, { recursive: true, mode: 0o700 });
    const stat = fs.lstatSync(config.stateRoot);
    if (!stat.isDirectory() || stat.isSymbolicLink() || (process.platform !== "win32" && ((stat.mode & 0o077) || stat.uid !== process.getuid()))) throw new Error();
  } catch {
    return { schema: "cogentia.interaction-receipt/v1", status: "BLOCKED_SECURITY", code: "INTERACTION_CONFIG_OR_PRIVATE_STORAGE_UNAVAILABLE", phase: "interaction_evidence" };
  }
  const root = config.stateRoot;
  const checkpointFile = path.join(root, "mission-checkpoint.json");
  try {
    const adapter = createInteractionSourceAdapter(config, { stateRoot: root, gmailReader: options.gmailReader, env: options.env || process.env });
    const checkpoint = fs.existsSync(checkpointFile) ? JSON.parse(fs.readFileSync(checkpointFile, "utf8")) : null;
    const result = await runMonteCarloAudit({
      root, mission: "interaction_evidence", adapter, checkpoint,
      now: adapter.savedWindow?.through || options.now || new Date().toISOString(),
      from: adapter.savedWindow?.from || config.from || "1970-01-01T00:00:00Z",
      view: "private", privateAuthorized: true,
      maxCases: config.maxCases || 10,
      maxWallTimeMs: options.maxWallTimeMs || 90000,
      readTimeoutMs: config.readTimeoutMs || 80000,
      force: options.force, shouldPreempt: options.shouldPreempt,
      minePatterns: true,
    });
    const observed = adapter.counts();
    if (result.status === "PREEMPTED") privateWrite(checkpointFile, result.checkpoint);
    else if (["COMPLETED", "PARTIAL"].includes(result.status) && result.checkpoint && ["PUBLIC_SNAPSHOT_RECONCILED", "SOURCE_COVERAGE_LIMITED"].includes(result.code)) {
      adapter.complete();
      if (fs.existsSync(checkpointFile)) fs.unlinkSync(checkpointFile);
    }
    // Public service logs receive only a typed receipt, never private aliases,
    // source mappings, case records or the private continuation contents.
    const summary = { schema: "cogentia.interaction-receipt/v1", status: result.status, code: result.code || result.reason,
      phase: "interaction_evidence", processed: result.processed || 0, observation_scope: "gmail_all_mail_metadata_and_local_registers", source_mutations: 0 };
    Object.assign(summary, observed);
    privateWrite(path.join(root, "last-receipt.json"), summary);
    return summary;
  } catch {
    const receipt = { schema: "cogentia.interaction-receipt/v1", status: "PARTIAL", code: "INTERACTION_PHASE_FAILED", phase: "interaction_evidence", source_mutations: 0 };
    privateWrite(path.join(root, "last-receipt.json"), receipt);
    return receipt;
  }
}
