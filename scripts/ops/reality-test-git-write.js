#!/usr/bin/env node
/**
 * #171 Phase C Reality Test — git.commit without touching origin.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  grantSideEffectAuthorization,
  resetAuthorizationStore,
  authorizationFromUtterance,
} from "../lib/side-effect-authorization.js";
import {
  prepareGitWrite,
  executeGitWrite,
  createGitLocalTransport,
} from "../lib/git-write.js";

resetAuthorizationStore();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-git-rt-"));
const report = { ok: false };

try {
  assert.equal(authorizationFromUtterance("We will commit this.").granted, false);
  execFileSync("git", ["init", "-b", "main"], { cwd: dir });
  execFileSync("git", ["config", "user.email", "test@cogentia.local"], { cwd: dir });
  execFileSync("git", ["config", "user.name", "Cogentia Test"], { cwd: dir });
  fs.writeFileSync(path.join(dir, "fixture.txt"), "reality\n");

  const prepared = prepareGitWrite({
    operation: "commit",
    cwd: dir,
    message: "test: reality git grant",
    files: ["fixture.txt"],
  });
  const transport = createGitLocalTransport({ cwd: dir });
  await assert.rejects(
    () => executeGitWrite({ prepared, authorization: null, transport }),
    (e) => e.error_class === "authorization_missing"
  );

  const authorization = grantSideEffectAuthorization({
    principal: "principal:test",
    action_class: "git.commit",
    target: prepared.target,
    payload: prepared.payload,
  });
  const executed = await executeGitWrite({ prepared, authorization, transport });
  assert.equal(executed.ok, true);
  const subject = execFileSync("git", ["log", "-1", "--format=%s"], { cwd: dir, encoding: "utf8" }).trim();
  assert.equal(subject, "test: reality git grant");

  await assert.rejects(
    () => executeGitWrite({ prepared, authorization, transport }),
    (e) => e.error_class === "authorization_replay"
  );

  report.ok = true;
  report.origin_pushed = false;
  report.commit_subject = subject;
} catch (err) {
  report.error = err.message;
  report.error_class = err.error_class || null;
} finally {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
}

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
