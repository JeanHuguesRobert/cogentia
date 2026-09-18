import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  grantSideEffectAuthorization,
  resetAuthorizationStore,
  classifyAction,
} from "./lib/side-effect-authorization.js";
import {
  prepareGitWrite,
  executeGitWrite,
  createGitDryRunTransport,
  createGitLocalTransport,
} from "./lib/git-write.js";
import { createMcpCore } from "./lib/cogentia-mcp-core.js";

resetAuthorizationStore();
assert.equal(classifyAction("git.commit"), "effectful");
assert.equal(classifyAction("git.push"), "effectful");
assert.equal(classifyAction("git.status"), "read_only");

const prepared = prepareGitWrite({
  operation: "commit",
  cwd: "/tmp/repo",
  message: "exact commit message",
  files: ["a.js", "b.js"],
});
assert.equal(prepared.phase, "EXPOSE");
assert.equal(prepared.action_class, "git.commit");

const transport = createGitDryRunTransport();
await assert.rejects(
  () => executeGitWrite({ prepared, authorization: null, transport }),
  (e) => e.error_class === "authorization_missing"
);
assert.equal(transport.written.length, 0);

const auth = grantSideEffectAuthorization({
  principal: "principal:test",
  action_class: "git.commit",
  target: prepared.target,
  payload: prepared.payload,
});
const written = await executeGitWrite({ prepared, authorization: auth, transport });
assert.equal(written.ok, true);
assert.equal(transport.written.length, 1);
await assert.rejects(
  () => executeGitWrite({ prepared, authorization: auth, transport }),
  (e) => e.error_class === "authorization_replay"
);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-git-171-"));
try {
  execFileSync("git", ["init", "-b", "main"], { cwd: dir });
  execFileSync("git", ["config", "user.email", "test@cogentia.local"], { cwd: dir });
  execFileSync("git", ["config", "user.name", "Cogentia Test"], { cwd: dir });
  fs.writeFileSync(path.join(dir, "note.txt"), "hello\n");
  const localPrep = prepareGitWrite({
    operation: "commit",
    cwd: dir,
    message: "test: local grant commit",
    files: ["note.txt"],
  });
  await assert.rejects(
    () => executeGitWrite({
      prepared: localPrep,
      authorization: null,
      transport: createGitLocalTransport({ cwd: dir }),
    }),
    (e) => e.error_class === "authorization_missing"
  );
  let logBefore = "";
  try {
    logBefore = execFileSync("git", ["log", "-1", "--oneline"], { cwd: dir, encoding: "utf8" }).trim();
  } catch {
    logBefore = "";
  }
  assert.equal(logBefore.includes("test: local grant commit"), false);

  resetAuthorizationStore();
  const localAuth = grantSideEffectAuthorization({
    principal: "principal:test",
    action_class: "git.commit",
    target: localPrep.target,
    payload: localPrep.payload,
  });
  const localResult = await executeGitWrite({
    prepared: localPrep,
    authorization: localAuth,
    transport: createGitLocalTransport({ cwd: dir }),
  });
  assert.equal(localResult.ok, true);
  const logAfter = execFileSync("git", ["log", "-1", "--format=%s"], { cwd: dir, encoding: "utf8" }).trim();
  assert.equal(logAfter, "test: local grant commit");
} finally {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
}

resetAuthorizationStore();
const tx2 = createGitDryRunTransport();
const core = createMcpCore(
  {
    COGENTIA_MCP_VIEW: "full",
    COGENTIA_ADMIN_TOKEN: "admin-test",
    COGENTIA_MCP_ALLOW_MUTATE: "1",
  },
  { gitTransport: tx2 }
);
const exposed = await core.callTool("cogentia_git_prepare", {
  operation: "push",
  cwd: "/tmp/repo",
  remote: "origin",
  branch: "main",
});
await assert.rejects(
  () => core.callTool("cogentia_git_write", { prepared: exposed, side_effect_authorization: null }),
  (e) => e.error_class === "authorization_missing"
);
const token = grantSideEffectAuthorization({
  principal: "principal:test",
  action_class: "git.push",
  target: exposed.target,
  payload: exposed.payload,
});
const viaMcp = await core.callTool("cogentia_git_write", {
  prepared: exposed,
  side_effect_authorization: token,
});
assert.equal(viaMcp.ok, true);
assert.equal(tx2.written.length, 1);

console.log(JSON.stringify({ ok: true, test: "git_write" }));
