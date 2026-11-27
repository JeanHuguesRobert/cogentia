// 2026-11-27 — GPT-6.2 under JHR. Exercise projections in isolation.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { emitStaticProjection } from "./lib/navigation.js";

const base = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-projection-test-"));
try {
  const root = path.join(base, "registry");
  fs.mkdirSync(root);
  const repos = [
    { name: "cogentia", path: "../cogentia", branch: "main", visibility: "public" },
    { name: "barons-Mariani", path: "../barons-Mariani", branch: "main", visibility: "public" },
    { name: "Inox", path: "../Inox", branch: "master", visibility: "public" },
    { name: "private-fixture", path: "../private-fixture", branch: "main", visibility: "private" },
  ];
  for (const repo of repos) {
    const dir = path.resolve(root, repo.path, "research");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.md"), "# Fixture");
  }
  fs.writeFileSync(path.join(base, "cogentia", "research", "informational_gravity.md"), "COGENTIA_CANONICAL_SENTINEL");
  fs.writeFileSync(path.join(base, "barons-Mariani", "research", "potentics.md"), "POTENTICS_CANONICAL_SENTINEL");
  // Wrong-root copies must not shadow canonical sources.
  fs.mkdirSync(path.join(root, "research"));
  fs.writeFileSync(path.join(root, "research", "potentics.md"), "WRONG_ROOT_SENTINEL");
  const result = emitStaticProjection({ registryRoot: root, repos }, [], { fanOut: true });
  assert.equal(result.ok, true);
  assert.equal(result.repos_listed, 3);
  const index = fs.readFileSync(result.llms_path, "utf8");
  const full = fs.readFileSync(result.llms_full_path, "utf8");
  assert.match(index, /Inox\/blob\/master\/research\/index\.md/);
  assert.doesNotMatch(index, /private-fixture|Inox\/blob\/main/);
  assert.match(full, /COGENTIA_CANONICAL_SENTINEL/);
  assert.match(full, /POTENTICS_CANONICAL_SENTINEL/);
  assert.doesNotMatch(full, /WRONG_ROOT_SENTINEL/);
  assert.equal(fs.readFileSync(path.join(base, "Inox", "llms.txt"), "utf8"), index);
  assert.equal(fs.existsSync(path.join(base, "private-fixture", "llms.txt")), false);
  console.log("Static projection: canonical sources, branches, isolation and privacy PASS");
} finally {
  fs.rmSync(base, { recursive: true, force: true });
}
