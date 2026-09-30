import assert from "node:assert/strict";
import test from "node:test";
import {
  createChildProcessEvent,
  createDaemonIdentity,
  readPackageVersion,
} from "../scripts/lib/daemon-observability.js";

test("daemon identity exposes stable process provenance", () => {
  const identity = createDaemonIdentity({
    service: "test-daemon",
    version: "1.2.3",
    entrypoint: "scripts/test-daemon.js",
    timestamp: "2026-09-28T12:00:00.000Z",
    pid: 123,
    parentPid: 45,
    runtimeVersion: "v24.5.0",
    platform: "win32",
    arch: "x64",
    listen_port: 8793,
  });

  assert.deepEqual(identity, {
    schema: "cogentia.daemon.identity.v1",
    event: "daemon_started",
    timestamp: "2026-09-28T12:00:00.000Z",
    service: "test-daemon",
    version: "1.2.3",
    pid: 123,
    parent_pid: 45,
    runtime: "node",
    runtime_version: "v24.5.0",
    platform: "win32",
    arch: "x64",
    entrypoint: "scripts/test-daemon.js",
    listen_port: 8793,
  });
});

test("child process event identifies both sides of a hidden launch", () => {
  assert.deepEqual(createChildProcessEvent({
    service: "fractanet-peer-watchdog",
    version: "0.3.0",
    command: "powershell.exe",
    purpose: "desktop_alert",
    childPid: 456,
    timestamp: "2026-09-28T12:00:01.000Z",
    parentPid: 123,
    windowsHide: true,
  }), {
    schema: "cogentia.daemon.child-process.v1",
    event: "child_process_started",
    timestamp: "2026-09-28T12:00:01.000Z",
    service: "fractanet-peer-watchdog",
    version: "0.3.0",
    parent_pid: 123,
    child_pid: 456,
    command: "powershell.exe",
    purpose: "desktop_alert",
    windows_hide: true,
  });
});

test("daemon version comes from the Cogentia package", () => {
  assert.equal(readPackageVersion(new URL("../package.json", import.meta.url)), "0.3.0");
});
