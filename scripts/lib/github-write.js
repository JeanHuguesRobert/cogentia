/**
 * Cogentia-owned GitHub write adapter for #171 Phase C.
 * Default transport is dry-run and does not call GitHub.
 */
import { executeAuthorizedEffect } from "./side-effect-authorization.js";

export const GITHUB_PREPARE_KIND = "cogentia.github_prepare/v1";

export const GITHUB_WRITE_OPERATIONS = new Set([
  "add_issue_comment",
  "issue_write",
]);

export function createGithubDryRunTransport() {
  const written = [];
  return {
    kind: "dry-run",
    written,
    async write(payload) {
      const receipt = {
        ok: true,
        transport: "dry-run",
        id: `dry_gh_${Date.now()}`,
        operation: payload.operation,
        owner: payload.owner,
        repo: payload.repo,
      };
      written.push({ payload, receipt });
      return receipt;
    },
  };
}

export function prepareGithubWrite({
  operation,
  owner,
  repo,
  issue_number,
  method,
  title,
  body,
  state,
} = {}) {
  const op = String(operation || "").trim();
  if (!GITHUB_WRITE_OPERATIONS.has(op)) {
    const err = new Error(`unsupported github write operation: ${op || "(empty)"}`);
    err.error_class = "invalid_github_write";
    throw err;
  }
  if (!owner || !repo) {
    const err = new Error("owner and repo are required");
    err.error_class = "invalid_github_write";
    throw err;
  }
  if (op === "add_issue_comment") {
    if (issue_number == null || typeof body !== "string" || !body) {
      const err = new Error("add_issue_comment requires issue_number and body");
      err.error_class = "invalid_github_write";
      throw err;
    }
  }
  if (op === "issue_write") {
    const m = String(method || "").trim();
    if (m !== "create" && m !== "update") {
      const err = new Error("issue_write requires method create or update");
      err.error_class = "invalid_github_write";
      throw err;
    }
  }
  const payload = {
    operation: op,
    owner: String(owner),
    repo: String(repo),
    issue_number: issue_number ?? null,
    method: method || null,
    title: title || null,
    body: body ?? null,
    state: state || null,
  };
  return {
    kind: GITHUB_PREPARE_KIND,
    action_class: "github.write",
    target: {
      owner: payload.owner,
      repo: payload.repo,
      issue_number: payload.issue_number,
    },
    payload,
    exposed_mutation: { ...payload },
    phase: "EXPOSE",
    note: "This is not a GitHub write. A side_effect_authorization bound to this payload is required to execute.",
  };
}

export async function executeGithubWrite({
  prepared,
  authorization,
  transport,
} = {}) {
  if (!prepared || prepared.action_class !== "github.write") {
    const err = new Error("prepared github.write envelope required");
    err.error_class = "invalid_github_write";
    throw err;
  }
  const tx = transport || createGithubDryRunTransport();
  return executeAuthorizedEffect({
    action_class: "github.write",
    target: prepared.target,
    payload: prepared.payload,
    authorization,
    run: () => tx.write(prepared.payload),
  });
}
