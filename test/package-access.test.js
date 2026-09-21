import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { checkPackageAccess } from "../scripts/check-package-access.js";

const repoRoot = path.resolve(import.meta.dirname, "..");
const cli = path.join(repoRoot, "scripts", "check-package-access.js");

function fixture(manifest, packages = []) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-package-access-"));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify(manifest));
  for (const packageName of packages) {
    const packageDirectory = path.join(root, "node_modules", packageName);
    fs.mkdirSync(packageDirectory, { recursive: true });
    fs.writeFileSync(path.join(packageDirectory, "package.json"), JSON.stringify({ name: packageName }));
  }
  return root;
}

test("package access accepts declared direct dependencies, including scoped packages", () => {
  const root = fixture({
    name: "fixture",
    dependencies: { dotenv: "1.0.0", "@scope/tool": "1.0.0" },
    devDependencies: { eslint: "1.0.0" },
  }, ["dotenv", "@scope/tool", "eslint"]);
  try {
    const report = checkPackageAccess(root);
    assert.equal(report.ok, true);
    assert.deepEqual(report.summary, { total: 3, accessible: 3, missing: 0, unreadable: 0 });
    assert.equal(report.dependencies.find(({ name }) => name === "@scope/tool").status, "accessible");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("package access distinguishes a missing declared dependency", () => {
  const root = fixture({
    name: "fixture",
    dependencies: { present: "1.0.0", absent: "1.0.0" },
  }, ["present"]);
  try {
    const report = checkPackageAccess(root);
    assert.equal(report.ok, false);
    assert.deepEqual(report.summary, { total: 2, accessible: 1, missing: 1, unreadable: 0 });
    assert.deepEqual(report.dependencies.find(({ name }) => name === "absent"), {
      name: "absent",
      kind: "dependencies",
      status: "missing",
      package_path: path.join("node_modules", "absent", "package.json"),
      error_code: "ENOENT",
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("package access CLI emits a machine-readable report and a failing status", () => {
  const root = fixture({ name: "fixture", dependencies: { absent: "1.0.0" } });
  try {
    const result = spawnSync(process.execPath, [cli, "--root", root, "--json"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    assert.equal(result.status, 1, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout).summary, {
      total: 1, accessible: 0, missing: 1, unreadable: 0,
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
