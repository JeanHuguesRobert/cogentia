#!/usr/bin/env node

import assert from "node:assert/strict";
import { buildIssueGraph, renderIssueGraph } from "./lib/issue-graph.js";

const packets = [
  {
    repository: "JeanHuguesRobert/cogentia",
    issue: 18,
    title: "COP reference runtime hardening",
    status: "open",
    state_reason: "",
    labels: ["cop", "runtime"],
    url: "https://github.com/JeanHuguesRobert/cogentia/issues/18",
    updated_at: "2026-07-18T08:00:00Z",
    target_documents: ["docs/corpus-graph-contract.md", "research/cop_reference_runtime_plan.md"],
  },
  {
    repository: "JeanHuguesRobert/cogentia",
    issue: 42,
    title: "Missing issue graph facade",
    status: "open",
    state_reason: "",
    labels: ["graph"],
    url: "https://github.com/JeanHuguesRobert/cogentia/issues/42",
    updated_at: "2026-07-18T09:00:00Z",
    target_documents: ["docs/missing-spec.md"],
  },
];

const graph = buildIssueGraph(packets, {
  generatedAt: "2026-07-18T10:00:00Z",
  resolveTarget(ref) {
    if (ref === "docs/corpus-graph-contract.md") {
      return {
        resolved: true,
        node: {
          id: "artifact_corpus_graph_contract",
          kind: "artifact",
          label: "cogentia/docs/corpus-graph-contract.md",
          status: "resolved",
          repository: "JeanHuguesRobert/cogentia",
          path: "docs/corpus-graph-contract.md",
          url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/corpus-graph-contract.md",
        },
      };
    }
    return { resolved: false };
  },
});

assert.equal(graph.schema, "cogentia.issue-graph.v1");
assert.equal(graph.summary.repositories, 1);
assert.equal(graph.summary.issues, 2);
assert.equal(graph.summary.resolved_targets, 1);
assert.equal(graph.summary.unresolved_targets, 2);
assert.ok(graph.nodes.some(node => node.kind === "repository"));
assert.ok(graph.nodes.some(node => node.kind === "issue"));
assert.ok(graph.nodes.some(node => node.kind === "artifact"));
assert.ok(graph.edges.some(edge => edge.kind === "has_issue"));
assert.ok(graph.edges.some(edge => edge.kind === "tracks_issue"));
assert.ok(graph.unresolved_targets.some(target => target.ref === "docs/missing-spec.md"));

const text = renderIssueGraph(graph);
assert.match(text, /# Issue Graph/);
assert.match(text, /mermaid/);
assert.match(text, /Unresolved Targets/);
assert.match(text, /docs\/missing-spec\.md/);

console.log(JSON.stringify({ ok: true, nodes: graph.nodes.length, edges: graph.edges.length }, null, 2));
