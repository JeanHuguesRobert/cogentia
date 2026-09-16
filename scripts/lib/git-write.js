/**
 * Cogentia-owned local git commit/push adapter for #171 Phase C.
 * Default transport is dry-run. Local transport runs git in a given cwd.
 */
import { execFileSync } from "node:child_process";
import { executeAuthorizedEffect } from "./side-effect-authorization.js";

export const GIT_PREPARE_KIND = "cogentia.git_prepare/v1";
export const GIT_WRITE_OPERATIONS = new Set(["commit", "push"]);

export function createGitDryRunTransport() {
  const written = [];
  return {
    kind: "dry-run",
    written,
    async write(payload) {
      const receipt = {
        ok: true,
        transport: "dry-run",
        id: `dry_git_${Date.now()}`,
        operation: payload.operation,
      };
      written.push({ payload, receipt });
      return receipt;
    },
  };
}

export function createGitLocalTransport({ cwd } = {}) {
  return {
    kind: "local",
    cwd,
    async write(payload) {
      const dir = payload.cwd || cwd;
      if (!dir) {
        const err = new Error("git cwd required");
        err.error_class = "invalid_git_write";
        throw err;
      }
      if (payload.operation === "commit") {
        const args = ["commit", "-m", payload.message];
        if (Array.isArray(payload.files) && payload.files.length) {
          execFileSync("git", ["add", "--", ...payload.files], { cwd: dir, encoding: "utf8" });
        }
        const out = execFileSync("git", args, { cwd: dir, encoding: "utf8" });
        return { ok: true, transport: "local", operation: "commit", stdout: String(out).slice(0, 2000) };
      }
      if (payload.operation === "push") {
        const remote = payload.remote || "origin";
        const branch = payload.branch || "HEAD";
        const out = execFileSync("git", ["push", remote, branch], { cwd: dir, encoding: "utf8" });
        return { ok: true, transport: "local", operation: "push", stdout: String(out).slice(0, 2000) };
      }
      const err = new Error(`unsupported git operation ${payload.operation}`);
      err.error_class = "invalid_git_write";
      throw err;
    },
  };
}

export function prepareGitWrite({
  operation,
  cwd,
  message,
  files,
  remote,
  branch,
} = {}) {
  const op = String(operation || "").trim();
  if (!GIT_WRITE_OPERATIONS.has(op)) {
    const err = new Error(`unsupported git write operation: ${op || "(empty)"}`);
    err.error_class = "invalid_git_write";
    throw err;
  }
  if (op === "commit" && !String(message || "").trim()) {
    const err = new Error("commit requires message");
    err.error_class = "invalid_git_write";
    throw err;
  }
  const fileList = Array.isArray(files) ? files.map(String).sort() : [];
  const payload = {
    operation: op,
    cwd: cwd ? String(cwd) : null,
    message: op === "commit" ? String(message) : null,
    files: fileList,
    remote: op === "push" ? String(remote || "origin") : null,
    branch: op === "push" ? String(branch || "HEAD") : null,
  };
  return {
    kind: GIT_PREPARE_KIND,
    action_class: op === "push" ? "git.push" : "git.commit",
    target: {
      cwd: payload.cwd,
      remote: payload.remote,
      branch: payload.branch,
    },
    payload,
    exposed_mutation: { ...payload },
    phase: "EXPOSE",
    note: "This is not a git mutation. A side_effect_authorization bound to this payload is required to execute.",
  };
}

export async function executeGitWrite({
  prepared,
  authorization,
  transport,
} = {}) {
  if (!prepared || (prepared.action_class !== "git.commit" && prepared.action_class !== "git.push")) {
    const err = new Error("prepared git.commit or git.push envelope required");
    err.error_class = "invalid_git_write";
    throw err;
  }
  const tx = transport || createGitDryRunTransport();
  return executeAuthorizedEffect({
    action_class: prepared.action_class,
    target: prepared.target,
    payload: prepared.payload,
    authorization,
    run: () => tx.write(prepared.payload),
  });
}
