function slug(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function issueNodeId(repository, number) {
  return `issue_${slug(repository)}_${Number(number) || 0}`;
}

function repoNodeId(repository) {
  return `repo_${slug(repository)}`;
}

function artifactNodeId(ref) {
  return `artifact_${slug(ref)}`;
}

function normalizeLabel(text, limit = 80) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean || "(untitled)";
  return `${clean.slice(0, limit - 1).trimEnd()}…`;
}

function defaultResolveTarget(ref) {
  return {
    resolved: false,
    node: {
      id: artifactNodeId(ref),
      kind: "artifact",
      label: ref,
      status: "unresolved",
      ref,
    },
  };
}

export function buildIssueGraph(packets, options = {}) {
  const resolveTarget = options.resolveTarget || defaultResolveTarget;
  const generatedAt = options.generatedAt || new Date().toISOString();
  const nodes = new Map();
  const edges = new Map();
  const repositories = new Map();
  const issues = [];
  const unresolvedTargets = [];
  const resolvedTargets = [];

  for (const packet of packets || []) {
    const repository = String(packet.repository || "").trim();
    if (!repository) continue;
    const repoId = repoNodeId(repository);
    if (!nodes.has(repoId)) {
      nodes.set(repoId, {
        id: repoId,
        kind: "repository",
        label: repository,
        repository,
      });
    }
    repositories.set(repository, (repositories.get(repository) || 0) + 1);

    const issueId = issueNodeId(repository, packet.issue);
    const issueNode = {
      id: issueId,
      kind: "issue",
      label: `#${Number(packet.issue) || 0} ${normalizeLabel(packet.title)}`,
      repository,
      issue: Number(packet.issue) || 0,
      title: packet.title || "",
      status: packet.status || "open",
      state_reason: packet.state_reason || "",
      url: packet.url || "",
      updated_at: packet.updated_at || "",
      closed_at: packet.closed_at || "",
      labels: Array.isArray(packet.labels) ? [...packet.labels] : [],
    };
    nodes.set(issueId, issueNode);
    addEdge(edges, repoId, issueId, "has_issue");

    const targets = [];
    for (const ref of packet.target_documents || []) {
      const resolved = resolveTarget(ref, packet);
      const node = resolved?.node || defaultResolveTarget(ref).node;
      nodes.set(node.id, node);
      addEdge(edges, issueId, node.id, "tracks_issue");
      const target = {
        ref,
        resolved: Boolean(resolved?.resolved),
        node_id: node.id,
        node_kind: node.kind || "artifact",
        label: node.label || ref,
        status: node.status || (resolved?.resolved ? "resolved" : "unresolved"),
        repository: node.repository || "",
        path: node.path || "",
        url: node.url || "",
      };
      targets.push(target);
      if (target.resolved) resolvedTargets.push(target);
      else unresolvedTargets.push(target);
    }

    issues.push({
      id: issueId,
      repository,
      issue: Number(packet.issue) || 0,
      title: packet.title || "",
      status: packet.status || "open",
      state_reason: packet.state_reason || "",
      url: packet.url || "",
      labels: Array.isArray(packet.labels) ? [...packet.labels] : [],
      target_documents: Array.isArray(packet.target_documents) ? [...packet.target_documents] : [],
      targets,
    });
  }

  return {
    schema: "cogentia.issue-graph.v1",
    generated_at: generatedAt,
    repositories: [...repositories.entries()].map(([repository, count]) => ({ repository, issues: count }))
      .sort((a, b) => a.repository.localeCompare(b.repository)),
    issues: issues.sort((a, b) => a.repository.localeCompare(b.repository) || a.issue - b.issue),
    nodes: [...nodes.values()].sort(compareNodes),
    edges: [...edges.values()].sort(compareEdges),
    summary: {
      repositories: repositories.size,
      issues: issues.length,
      issue_nodes: issues.length,
      target_documents: resolvedTargets.length + unresolvedTargets.length,
      resolved_targets: resolvedTargets.length,
      unresolved_targets: unresolvedTargets.length,
      edges: edges.size,
    },
    unresolved_targets: unresolvedTargets,
    resolved_targets: resolvedTargets,
  };
}

export function renderIssueGraph(report) {
  const lines = [
    "---",
    `title: ${JSON.stringify("Issue Graph")}`,
    `date: ${JSON.stringify(report.generated_at || new Date().toISOString())}`,
    "---",
    "",
    "# Issue Graph",
    "",
    `Repositories: ${report.summary?.repositories || 0}`,
    `Issues: ${report.summary?.issues || 0}`,
    `Resolved targets: ${report.summary?.resolved_targets || 0}`,
    `Unresolved targets: ${report.summary?.unresolved_targets || 0}`,
    "",
    "```mermaid",
    "graph LR",
  ];
  for (const node of report.nodes || []) {
    lines.push(`  ${node.id}["${escapeMermaidLabel(node.label || node.id)}"]`);
  }
  for (const edge of report.edges || []) {
    lines.push(`  ${edge.from} -->|${escapeMermaidLabel(edge.kind || edge.label || "")}| ${edge.to}`);
  }
  for (const node of report.nodes || []) {
    if (node.url) lines.push(`  click ${node.id} "${escapeMermaidLabel(node.url)}" "${escapeMermaidLabel(node.label || node.id)}"`);
  }
  lines.push("```");
  if (report.unresolved_targets?.length) {
    lines.push("");
    lines.push("## Unresolved Targets");
    lines.push("");
    lines.push("| Reference | Issue | Status |");
    lines.push("|---|---|---|");
    for (const target of report.unresolved_targets) {
      lines.push(`| ${escapeTableCell(target.ref)} | ${escapeTableCell(target.repository || "")}#${target.issue || ""} | ${escapeTableCell(target.status || "unresolved")} |`);
    }
  }
  return lines.join("\n");
}

function addEdge(edges, from, to, kind) {
  const key = `${from}\t${kind}\t${to}`;
  if (!edges.has(key)) edges.set(key, { from, kind, to });
}

function compareNodes(a, b) {
  const rank = kind => ({ repository: 0, issue: 1, artifact: 2 }[kind] ?? 9);
  return rank(a.kind) - rank(b.kind)
    || String(a.repository || "").localeCompare(String(b.repository || ""))
    || String(a.label || "").localeCompare(String(b.label || ""));
}

function compareEdges(a, b) {
  return String(a.from).localeCompare(String(b.from))
    || String(a.kind).localeCompare(String(b.kind))
    || String(a.to).localeCompare(String(b.to));
}

function escapeMermaidLabel(value) {
  return String(value ?? "").replace(/"/g, "'");
}

function escapeTableCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}
