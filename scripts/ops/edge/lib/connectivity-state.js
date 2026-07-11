import fs from "node:fs";
import path from "node:path";

export function connectivityStatePath(stateDir) {
  return path.join(path.resolve(stateDir), "connectivity.state.json");
}

export function readConnectivityState(stateDir) {
  const filePath = connectivityStatePath(stateDir);
  if (!fs.existsSync(filePath)) {
    return { fractanet_up: null, updated_at: null };
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return { fractanet_up: null, updated_at: null };
  }
}

export function writeConnectivityState(stateDir, fractanetUp) {
  const filePath = connectivityStatePath(stateDir);
  const payload = {
    fractanet_up: Boolean(fractanetUp),
    updated_at: new Date().toISOString(),
  };
  const tmp = `${filePath}.${process.pid}.tmp`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, filePath);
  return payload;
}