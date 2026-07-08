import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const DEFAULT_AGENT_GATEWAY_ENV_FILES = [
  process.env.COGENTIA_ATTRACTOR_ENV_FILE,
  process.env.AGENT_GATEWAY_ATTRACTOR_ENV_FILE,
  process.env.AGENT_GATEWAY_ENV_FILE,
  path.join(os.homedir(), ".cogentia", "secrets", "attractor-i7-thinkpad-jhr.env"),
  path.join(os.homedir(), ".cogentia", "secrets", "agent-gateway-blackboard.env"),
  path.join(os.homedir(), ".cogentia", "secrets", "agent-gateway.env"),
  path.join(os.homedir(), "srv", "cogentia", "secrets", "agent-gateway.env"),
  path.join(os.homedir(), "srv", "cogentia", "secrets", "agent-gateway-blackboard.env"),
].filter(Boolean);

export function loadAgentGatewayEnv(files = DEFAULT_AGENT_GATEWAY_ENV_FILES, env = process.env) {
  for (const file of files) {
    if (!file) continue;
    const resolved = path.resolve(String(file));
    if (!fs.existsSync(resolved)) continue;
    const content = fs.readFileSync(resolved, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;
      const key = match[1];
      if (env[key] != null) continue;
      env[key] = unquoteEnvValue(match[2]);
    }
  }
  return env;
}

export function unquoteEnvValue(value) {
  const trimmed = String(value || "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function parseBooleanEnv(value, fallback) {
  if (value == null || value === "") return fallback;
  const clean = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(clean)) return true;
  if (["0", "false", "no", "off"].includes(clean)) return false;
  return fallback;
}