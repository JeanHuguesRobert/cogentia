/** Bounded read/write capability for an explicitly assigned Agent JHN worktree. */
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  buildHostFsWritePayload,
  executeAuthorizedEffect,
  mintMandateDerivedGrant,
} from "./side-effect-authorization.js";
import { isResolvedCallerAuth } from "./cogentia-mcp-auth.js";

const ABSENT = "absent";

export function createAgentJhnWorkspaceCapabilities({
  root,
  branch,
  authContext,
  budget_reservation_id = null,
  account_id = null,
  treatment_id = null,
  max_bytes = 64 * 1024,
} = {}) {
  const workspaceRoot = fs.realpathSync(root || "");
  const expectedBranch = String(branch || "").trim();
  if (!expectedBranch) throw new Error("COGENTIA_JHN_WORKSPACE_WRITE_BRANCH is required");
  const maxBytes = boundedInteger(max_bytes, 64 * 1024, 1, 256 * 1024);
  const lastWrittenHash = new Map();

  return [
    {
      name: "workspace.read",
      kind: "tool",
      risk: "read_only",
      resultVisibility: "reasoner",
      costUnits: 1,
      description: "Read a regular file inside the assigned Agent JHN worktree.",
      inputSchema: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
        additionalProperties: false,
      },
      async execute(input = {}) {
        const file = resolveWorkspaceFile(workspaceRoot, input.path);
        const content = fs.readFileSync(file, "utf8");
        if (Buffer.byteLength(content, "utf8") > maxBytes) throw failure("workspace_file_too_large");
        return { path: relativePath(workspaceRoot, file), content, sha256: sha256(content) };
      },
    },
    {
      name: "workspace.write",
      kind: "tool",
      risk: "internal_recoverable",
      resultVisibility: "private",
      costUnits: 2,
      description: "Replace one file in the assigned worktree after a content-hash check.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
          expected_sha256: { type: "string", description: `sha256:… from workspace.read, or ${ABSENT} for a new file` },
        },
        required: ["path", "content", "expected_sha256"],
        additionalProperties: false,
      },
      async execute(input = {}) {
        assertJhnWorkspaceAuthority(authContext);
        if (typeof input.content !== "string") throw failure("workspace_content_required");
        const contentBytes = Buffer.byteLength(input.content, "utf8");
        if (contentBytes > maxBytes) throw failure("workspace_file_too_large");
        const file = resolveWorkspaceFile(workspaceRoot, input.path, { allowMissing: true });
        assertAssignedBranch(workspaceRoot, expectedBranch);

        const previous = readCurrentFile(file);
        const previousHash = previous == null ? ABSENT : sha256(previous);
        const expectedHash = String(input.expected_sha256 || "");
        if (expectedHash !== previousHash) throw failure("workspace_precondition_failed");
        assertNoUnownedChanges(workspaceRoot, file, previousHash, lastWrittenHash);

        const relative = relativePath(workspaceRoot, file);
        const nextHash = sha256(input.content);
        const payload = buildHostFsWritePayload({
          path: file,
          content: input.content,
          target: "node:agent-jhn-workspace",
          options: { expected_sha256: previousHash },
        });
        const prepared = {
          action_class: "host.fs.write",
          target: { node: "node:agent-jhn-workspace", path: file },
          payload,
          action_request_id: `workspace-write:${randomUUID()}`,
        };
        const authorization = mintMandateDerivedGrant({
          auth_context: authContext,
          action_class: prepared.action_class,
          target: prepared.target,
          payload: prepared.payload,
          mandate_ref: authContext.mandate_ref,
          budget_reservation_id,
          account_id,
          treatment_id,
          recovery_ref: `git-worktree:${expectedBranch}:${relative}:${previousHash}`,
          expose_packet_id: `urn:cop:packet:expose:${prepared.action_request_id}`,
        });

        const executed = await executeAuthorizedEffect({
          action_class: prepared.action_class,
          target: prepared.target,
          payload: prepared.payload,
          authorization,
          run: async () => {
            const latest = readCurrentFile(file);
            if ((latest == null ? ABSENT : sha256(latest)) !== previousHash) {
              throw failure("workspace_precondition_failed");
            }
            atomicReplace(file, input.content, previous);
            lastWrittenHash.set(file, nextHash);
            return {
              ok: true,
              status: "success",
              transport: "local-worktree",
              operation: "workspace.write",
              sha: nextHash,
              id: relative,
            };
          },
        });
        return {
          ok: executed.ok,
          authorization_id: executed.authorization_id,
          effect_receipt: executed.result,
          cop_spend: executed.verification?.cop_spend || null,
          accounting_complete: executed.accounting_complete === true,
        };
      },
    },
  ];
}

export function redactWorkspaceWriteInput(input = {}) {
  const content = typeof input.content === "string" ? input.content : "";
  return {
    path: typeof input.path === "string" ? input.path : null,
    expected_sha256: typeof input.expected_sha256 === "string" ? input.expected_sha256 : null,
    content_bytes: Buffer.byteLength(content, "utf8"),
    content_sha256: sha256(content),
  };
}

function assertJhnWorkspaceAuthority(authContext) {
  if (!isResolvedJhnAuth(authContext)
      || !authContext.actor || !authContext.mandate_ref) {
    throw failure("workspace_write_authority_required");
  }
}

function isResolvedJhnAuth(authContext) {
  return isResolvedCallerAuth(authContext)
    && authContext.auth === "jhn" && authContext.allowMutate === true;
}

function assertAssignedBranch(root, expectedBranch) {
  const gitRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: root, encoding: "utf8" }).trim();
  const currentBranch = execFileSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8" }).trim();
  if (path.resolve(gitRoot) !== path.resolve(root) || currentBranch !== expectedBranch
      || new Set(["main", "master", "production"]).has(currentBranch.toLowerCase())) {
    throw failure("workspace_branch_mismatch");
  }
}

function assertNoUnownedChanges(root, file, previousHash, lastWrittenHash) {
  const priorRunHash = lastWrittenHash.get(file);
  if (priorRunHash && priorRunHash === previousHash) return;
  const relative = relativePath(root, file);
  const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=all", "--", relative], {
    cwd: root,
    encoding: "utf8",
  });
  if (status.trim()) throw failure("workspace_target_has_existing_changes");
}

function resolveWorkspaceFile(root, requested, { allowMissing = false } = {}) {
  const raw = String(requested || "");
  if (!raw || path.isAbsolute(raw) || raw.includes("\\")) throw failure("workspace_path_invalid");
  const segments = raw.split("/");
  if (segments.some((part) => !part || part === "." || part === ".." || part === ".git")) {
    throw failure("workspace_path_invalid");
  }
  if (segments.some((part) => /^\.env(?:\.|$)/i.test(part)
      || new Set([".ssh", ".aws", "secrets", "credentials", "node_modules", ".cogentia"]).has(part.toLowerCase()))) {
    throw failure("workspace_path_restricted");
  }
  const file = path.resolve(root, ...segments);
  if (!isInside(root, file)) throw failure("workspace_path_outside_root");
  const parent = path.dirname(file);
  let realParent;
  try { realParent = fs.realpathSync(parent); } catch { throw failure("workspace_parent_missing"); }
  if (!isInside(root, realParent)) throw failure("workspace_path_outside_root");
  if (fs.existsSync(file)) {
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() || !stat.isFile()) throw failure("workspace_target_not_regular_file");
    if (!isInside(root, fs.realpathSync(file))) throw failure("workspace_path_outside_root");
  } else if (!allowMissing) {
    throw failure("workspace_file_missing");
  }
  return file;
}

function readCurrentFile(file) {
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, "utf8");
}

function atomicReplace(file, content, previous) {
  const mode = previous == null ? 0o600 : fs.statSync(file).mode & 0o777;
  const temp = path.join(path.dirname(file), `.jhn-write-${randomUUID()}.tmp`);
  try {
    fs.writeFileSync(temp, content, { encoding: "utf8", mode, flag: "wx" });
    fs.renameSync(temp, file);
  } finally {
    try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch { /* preserve the original write error */ }
  }
}

function relativePath(root, file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function isInside(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function boundedInteger(value, fallback, minimum, maximum) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.max(minimum, Math.min(number, maximum)) : fallback;
}

function failure(code) {
  const error = new Error(code);
  error.error_class = code;
  error.code = code;
  return error;
}
