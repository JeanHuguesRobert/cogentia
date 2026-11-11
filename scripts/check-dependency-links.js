#!/usr/bin/env node
/**
 * Read-only installed-dependency health check.
 * Detects Windows junctions that exist as directory entries but cannot be traversed.
 * Does not install packages, change links, fetch or execute dependency code.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function inspectDependencyLinks(root = process.cwd()) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const groups = [
    ["dependency", manifest.dependencies || {}],
    ["devDependency", manifest.devDependencies || {}],
  ];
  const results = [];
  for (const [kind, deps] of groups) {
    for (const name of Object.keys(deps).sort()) {
      const location = path.join(root, "node_modules", ...name.split("/"));
      let status = "ok", link = false, error = null;
      try {
        const entry = fs.lstatSync(location);
        link = entry.isSymbolicLink();
        // For NTFS junctions fs.statSync follows the reparse point, unlike lstatSync.
        const actual = fs.statSync(location);
        if (!actual.isDirectory()) status = "not_directory";
        else if (!fs.existsSync(path.join(location, "package.json"))) status = "untraversable_or_missing_manifest";
      } catch (e) {
        status = e.code === "ENOENT" ? "missing_or_broken" : "inaccessible";
        error = e.code || "unknown";
      }
      results.push({ name, kind, status, link, ...(error ? { error } : {}) });
    }
  }
  const failures = results.filter(item => item.status !== "ok");
  return {
    schema: "cogentia.dependency-links-health/v1",
    root: path.resolve(root),
    manager: manifest.packageManager || null,
    ok: failures.length === 0,
    checked: results.length,
    failures: failures.length,
    results,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const i = process.argv.indexOf("--root");
    const root = i < 0 ? process.cwd() : process.argv[i + 1];
    if (!root) throw new Error("Missing --root argument");
    const result = inspectDependencyLinks(root);
    if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`Dependency links: ${result.checked} checked, ${result.failures} failures (${result.root})`);
      for (const item of result.results.filter(x=>x.status!=="ok")) console.log(`  ${item.name}: ${item.status} ${item.error||""}`);
    }
    if (!result.ok) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 2; }
}
