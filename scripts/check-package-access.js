#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA = "cogentia.package_access.v1";

function usage() {
  return [
    "Usage: node scripts/check-package-access.js [--root <directory>] [--json]",
    "",
    "Checks that direct package dependencies declared by package.json are readable",
    "from the current Node process. It never installs packages or changes permissions.",
  ].join("\n");
}

function parseArgs(args) {
  const options = { root: process.cwd(), json: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--root") {
      options.root = args[++index];
      if (!options.root) throw new Error("--root requires a directory");
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function declaredDependencies(packageJson) {
  const kinds = ["dependencies", "devDependencies", "optionalDependencies"];
  const seen = new Set();
  return kinds.flatMap((kind) => Object.keys(packageJson[kind] || {}).flatMap((name) => {
    if (seen.has(name)) return [];
    seen.add(name);
    return [{ name, kind }];
  }));
}

function checkDependency(root, dependency) {
  const packagePath = path.join(root, "node_modules", dependency.name, "package.json");
  try {
    fs.accessSync(packagePath, fs.constants.R_OK);
    return {
      ...dependency,
      status: "accessible",
      package_path: path.relative(root, packagePath),
    };
  } catch (error) {
    const status = error.code === "ENOENT" ? "missing" : "unreadable";
    return {
      ...dependency,
      status,
      package_path: path.relative(root, packagePath),
      error_code: error.code || "UNKNOWN",
    };
  }
}

export function checkPackageAccess(root) {
  const absoluteRoot = path.resolve(root);
  const manifestPath = path.join(absoluteRoot, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const dependencies = declaredDependencies(packageJson).map((dependency) => checkDependency(absoluteRoot, dependency));
  const summary = {
    total: dependencies.length,
    accessible: dependencies.filter(({ status }) => status === "accessible").length,
    missing: dependencies.filter(({ status }) => status === "missing").length,
    unreadable: dependencies.filter(({ status }) => status === "unreadable").length,
  };
  return {
    schema: SCHEMA,
    ok: summary.missing === 0 && summary.unreadable === 0,
    root: absoluteRoot,
    package: packageJson.name || null,
    dependencies,
    summary,
  };
}

function formatReport(report) {
  const lines = [
    `Package access: ${report.ok ? "ok" : "failed"} (${report.package || "unnamed package"})`,
    `  accessible: ${report.summary.accessible}/${report.summary.total}`,
  ];
  for (const dependency of report.dependencies.filter(({ status }) => status !== "accessible")) {
    lines.push(`  ${dependency.status}: ${dependency.name} (${dependency.kind}, ${dependency.error_code})`);
  }
  return lines.join("\n");
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    console.log(usage());
    return;
  }
  try {
    const report = checkPackageAccess(options.root);
    console.log(options.json ? JSON.stringify(report, null, 2) : formatReport(report));
    if (!report.ok) process.exitCode = 1;
  } catch (error) {
    console.error(`Package access check failed: ${error.message}`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
