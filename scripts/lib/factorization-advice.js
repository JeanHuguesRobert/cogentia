// Read-only projection of documentary relations and SleepCycle duplication signals.
// It does not assert semantic equivalence or decide editorial authority.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import * as yaml from "js-yaml";

const digest = value => createHash("sha256").update(value).digest("hex");
const normalized = value => value.replace(/\r\n/g, "\n").trim();
const body = value => value.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "");
function documentMetadata(value) {
  const match = value.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!match) return { status: "absent", frontmatter: {} };
  try {
    const parsed = yaml.load(match[1]);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? { status: "parsed", frontmatter: parsed }
      : { status: "invalid", frontmatter: {} };
  } catch { return { status: "invalid", frontmatter: {} }; }
}
function normalizeDeclaredPath(sourcePath, reference) {
  if (typeof reference !== "string" || !reference.trim()) return null;
  const repo = sourcePath.split("/")[0];
  const ref = reference.replaceAll("\\", "/");
  if (/^[a-z][a-z0-9+.-]*:/i.test(ref)) return ref;
  const normalized = path.posix.normalize(ref.startsWith("./") || ref.startsWith("../")
    ? path.posix.join(path.posix.dirname(sourcePath), ref)
    : path.posix.join(repo, ref));
  return normalized.startsWith(repo + "/") ? normalized : null;
}
function declaredRelations(aPath, bPath, aMeta, bMeta) {
  const edges = [];
  const records = [[aPath, bPath, aMeta], [bPath, aPath, bMeta]];
  for (const [source, target, metadata] of records) {
    const m = metadata.frontmatter;
    const peer = Array.isArray(m.language_peer) ? m.language_peer : [m.language_peer];
    if (peer.some(ref => normalizeDeclaredPath(source, ref) === target)) {
      edges.push({ subject: source, predicate: "language_peer", object: target, provenance: "source_frontmatter" });
    }
    const primary = m.source_document ?? m.derived_from;
    const sources = Array.isArray(primary) ? primary : [primary];
    if (sources.some(ref => normalizeDeclaredPath(source, ref) === target)) {
      edges.push({ subject: source, predicate: "source_document", object: target, provenance: "source_frontmatter" });
    }
  }
  return edges;
}
function resolvePublicFile(root, locator) {
  if (typeof locator !== "string" || !/^[A-Za-z0-9_.-]+\/(?!\.)(?!.*(?:^|\/)\.\.\/)[A-Za-z0-9_./-]+\.md$/.test(locator)) return null;
  const full = path.resolve(root, locator);
  if (!full.startsWith(path.resolve(root) + path.sep)) return null;
  try {
    const stat = fs.statSync(full);
    if (!stat.isFile()) return null;
    const real = fs.realpathSync(full);
    if (!real.startsWith(fs.realpathSync(root) + path.sep)) return null;
    return full;
  } catch { return null; }
}
export function adviseFactorization(signal, { corpusRoot, readFile = fs.readFileSync } = {}) {
  if (signal?.signal_kind !== "duplication") return { status: "unsupported_signal", signal_id: signal?.id || null };
  const a = signal.doc_a?.path, b = signal.doc_b?.path;
  const fa = resolvePublicFile(corpusRoot, a), fb = resolvePublicFile(corpusRoot, b);
  const base = {
    protocol: "cogentia.factorization_advice.v0",
    signal_id: signal.id,
    source_signal: { kind: signal.signal_kind, method: signal.method, review_status: signal.review_status || "unknown" },
    pair: [a, b],
    effect: "advisory_only"
  };
  if (!fa || !fb) return { ...base, status: "source_unavailable", recommendation: "inspect_sources", evidence: { resolved: [Boolean(fa), Boolean(fb)] } };
  const aa = readFile(fa, "utf8"), bb = readFile(fb, "utf8");
  const hashA = digest(aa), hashB = digest(bb);
  const bodyA = digest(normalized(body(aa))), bodyB = digest(normalized(body(bb)));
  const metaA = documentMetadata(aa), metaB = documentMetadata(bb);
  const declared = declaredRelations(a, b, metaA, metaB);
  const peerReciprocal = declared.filter(e => e.predicate === "language_peer").length === 2;
  const sameFull = hashA === hashB;
  const sameBody = bodyA === bodyB;
  const projects = [a, b].map(s => s.match(/^([^/]+)\/apps\/([^/]+)\//)?.[2] || null);
  const distinctApps = projects[0] && projects[1] && projects[0] !== projects[1];
  let recommendation = "preserve_and_review";
  let reason = "The detected overlap does not prove full-document identity or safe substitution.";
  if (peerReciprocal) {
    recommendation = "preserve_co_sovereign_language_peers";
    reason = "Reciprocal language_peer declarations establish separate co-sovereign source artifacts; textual overlap does not justify fusion.";
  } else if (declared.some(e => e.predicate === "source_document")) {
    recommendation = "preserve_declared_derivation";
    reason = "A declared source_document relation establishes lineage, not duplicate authority or safe substitution.";
  } else if (sameBody && distinctApps) {
    recommendation = "consider_shared_source_with_independent_projections";
    reason = "The document bodies match but serve distinct applications; retain both published endpoints and consider a conventional shared build source.";
  } else if (sameBody) {
    recommendation = "inspect_identity_and_authority";
    reason = "Document bodies match; confirm whether these are distinct legitimate records before factorizing.";
  }
  return {
    ...base, status: "analyzed",
    evidence: { same_full_bytes: sameFull, same_normalized_body: sameBody, sha256: [hashA, hashB], distinct_applications: Boolean(distinctApps), application_ids: projects, scope: "document" },
    relation: { kind: sameBody ? "content_equivalence" : "partial_overlap_candidate", semantic_equivalence: "unverified", authority: "not_inferred", declared_relations: declared },
    metadata: { parse_status: [metaA.status, metaB.status], document_role: [metaA.frontmatter.document_role || null, metaB.frontmatter.document_role || null], visibility: [metaA.frontmatter.visibility || null, metaB.frontmatter.visibility || null] },
    recommendation, reason,
    locality: { preserve_public_endpoints: true, cache_and_build: "reuse_existing_mechanisms" },
    validation: ["Confirm the deployment/build wiring and independent site requirements", "Review content semantics before any source consolidation"]
  };
}
export function adviseFromQueue({ corpusRoot, queueFile, limit = 10, signals = null } = {}) {
  const selected = signals || fs.readFileSync(queueFile, "utf8").split("\n").filter(Boolean).map(line => JSON.parse(line));
  return selected
    .filter(s => s.signal_kind === "duplication")
    .slice(0, limit)
    .map(s => adviseFactorization(s, { corpusRoot }));
}
