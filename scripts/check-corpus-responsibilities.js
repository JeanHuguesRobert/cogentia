#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import {
  buildResponsibilityGraph,
  checkResponsibilityGraph,
  routeResponsibility,
} from "./corpus-responsibilities.js";

const root = path.resolve(process.env.COGENTIA_CORPUS_ROOT || path.join(process.cwd(), ".."));
const regressionFile = path.join(process.cwd(), "scripts", "responsibility-routing-regressions.yaml");
const regressions = yaml.load(fs.readFileSync(regressionFile, "utf8"));

const requiredRepos = new Set((regressions.cases || []).map(test => test.expected?.repo).filter(Boolean));
const missingRepos = [...requiredRepos].filter(repo => !fs.existsSync(path.join(root, repo)));
if (missingRepos.length) {
  console.log(JSON.stringify({
    ok: true,
    status: "skipped",
    reason: "incomplete multi-repository workspace",
    root,
    missing_repositories: missingRepos,
  }, null, 2));
  process.exit(0);
}

const graph = buildResponsibilityGraph(root);
const check = checkResponsibilityGraph(graph);
const failures = [];
if (!check.ok) failures.push({ id: "graph-check", issues: check.issues });

for (const test of regressions.cases || []) {
  const result = routeResponsibility(graph, test.query.subject, test.query.relation);
  if (!result.ok) {
    failures.push({ id: test.id, reason: result.status, matches: result.matches || [] });
    continue;
  }
  const actual = { repo: result.match.repo, path: result.match.path || null };
  const expected = { repo: test.expected.repo, path: test.expected.path || null };
  if (actual.repo !== expected.repo || actual.path !== expected.path) {
    failures.push({ id: test.id, reason: "wrong-route", expected, actual });
  }
}

const report = {
  ok: failures.length === 0,
  status: failures.length === 0 ? "passed" : "failed",
  root,
  cases: (regressions.cases || []).length,
  claims: graph.claims.length,
  responsibility_files: graph.files.length,
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
