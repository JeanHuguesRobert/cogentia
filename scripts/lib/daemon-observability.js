import fs from "node:fs";

export function readPackageVersion(packageJsonUrl) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonUrl, "utf8"));
    return String(packageJson.version || "unknown");
  } catch {
    return "unknown";
  }
}

export function createDaemonIdentity({
  service,
  version = "unknown",
  entrypoint = process.argv[1] || "unknown",
  timestamp = new Date().toISOString(),
  pid = process.pid,
  parentPid = process.ppid,
  runtimeVersion = process.version,
  platform = process.platform,
  arch = process.arch,
  ...details
}) {
  if (!service) throw new Error("service is required");

  return {
    schema: "cogentia.daemon.identity.v1",
    event: "daemon_started",
    timestamp,
    service,
    version,
    pid,
    parent_pid: parentPid,
    runtime: "node",
    runtime_version: runtimeVersion,
    platform,
    arch,
    entrypoint,
    ...details,
  };
}

export function createChildProcessEvent({
  service,
  version = "unknown",
  command,
  purpose,
  childPid = null,
  timestamp = new Date().toISOString(),
  parentPid = process.pid,
  windowsHide = false,
}) {
  if (!service) throw new Error("service is required");
  if (!command) throw new Error("command is required");

  return {
    schema: "cogentia.daemon.child-process.v1",
    event: "child_process_started",
    timestamp,
    service,
    version,
    parent_pid: parentPid,
    child_pid: childPid,
    command,
    purpose: purpose || "unspecified",
    windows_hide: Boolean(windowsHide),
  };
}
