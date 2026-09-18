import { categorizeAmbiguity } from "./triage.js";

export const CLASSIFICATION_VERSION = "1";

export const DOCUMENT_ROLES = new Set([
  "source",
  "derived",
  "trail",
  "index",
  "operational",
  "template",
  "example",
  "alias",
  "archive",
  "unknown",
]);

export function isGeneratedNavigationDoc(d) {
  const rel = typeof d === "string" ? d : d?.rel || "";
  return /^research\/(corpus-status|documents)\.md$/i.test(rel);
}

export function kind(rule, kindValue, confidence, reason, role = "") {
  return { rule, kind: kindValue, confidence, reason, role };
}

export function weakestConfidence(values) {
  const order = { strong: 3, medium: 2, weak: 1 };
  return values.reduce((min, value) => (order[value] < order[min] ? value : min), "strong");
}

export function normalizedDocumentRole(value) {
  const v = String(value || "").trim().toLowerCase();
  return DOCUMENT_ROLES.has(v) ? v : "";
}

export function legacyFreeTextRole(value) {
  if (!value) return "";
  return normalizedDocumentRole(value) ? "" : String(value);
}

export function explicitDocumentRole(fm) {
  if (!fm || typeof fm !== "object") return "";
  if (fm.document_role && !legacyFreeTextRole(fm.document_role)) return fm.document_role;
  if (fm.corpus_role && !legacyFreeTextRole(fm.corpus_role)) return fm.corpus_role;
  if (fm.role && normalizedDocumentRole(fm.role)) return fm.role;
  return "";
}

export function inferDataPortabilityKind(doc, text) {
  if (/\bspec\b|specification/.test(text)) return kind("spec", "spec", "medium", "Data portability specification keyword.");
  if (/architecture/.test(text)) return kind("architecture", "architecture", "medium", "Data portability architecture keyword.");
  return kind("data-portability", "data-portability", "medium", "Cogentia Personal data portability path.");
}

export function inferDocsKind(doc, text) {
  if (doc?.repo === "FractaVolta" || doc?.repo === "acorsica.org") return kind("website-page", "website-page", "strong", "Website docs path.");
  if (/tutorial|guide|navigation|knowledge mesh|context server/.test(text)) return kind("guide", "guide", "medium", "Guide keyword in docs path.");
  return kind("documentation", "documentation", "medium", "Docs path.");
}

export function inferLifecycleState(doc, kindInfo) {
  const fm = doc?.frontmatter || {};
  const text = `${String(fm.status || "")} ${String(doc?.title || "")}`.toLowerCase();
  if (doc?.role === "alias" || kindInfo?.kind === "redirect-alias") return { state: "moved", rule: "alias" };
  if (kindInfo?.kind === "generated-view") return { state: "generated", rule: "generated-view" };
  if (/generated automatically/.test(text)) return { state: "generated", rule: "status" };
  if (/deprecated|abandoned|obsolete/.test(text)) return { state: "deprecated", rule: "status" };
  if (/draft|v0\.|working|work in progress|provisoire/.test(text)) return { state: "working", rule: "status" };
  if (/published|stable|stabilized|stabilised/.test(text)) return { state: "stable", rule: "status" };
  return { state: "active", rule: "default" };
}

export function inferDocumentKind(doc) {
  const r = (doc?.rel || "").replace(/\\/g, "/");
  const rLower = r.toLowerCase();
  const title = String(doc?.title || "").toLowerCase();
  const fm = doc?.frontmatter || {};
  const text = `${title} ${rLower} ${String(fm.type || "")} ${String(fm.status || "")} ${String(fm.document_role || "")} ${String(fm.corpus_role || "")}`;

  if (doc?.role === "alias" || fm.redirect_to || fm.canonical_document) {
    return kind("redirect-alias", "alias-redirect", "strong", "Alias or redirect metadata is present.");
  }
  // cogentia#179 regression fixture: .cogentia/issues/** is an issue packet
  if (String(fm.document_kind || "").toLowerCase() === "issue_packet" || /(^|\/)\.cogentia\/issues\//i.test(r)) {
    return kind("issue-packet", "issue_packet", "strong", "Issue packet path or explicit kind.", "source");
  }
  if (isGeneratedNavigationDoc(doc)) {
    return kind("generated-view", "generated-navigation", "strong", "Generated corpus navigation path.");
  }
  if (/^research\/index\.md$/i.test(r)) return kind("research-index", "research-index", "strong", "Repository research index.");
  if (/^research\/concepts\.md$/i.test(r)) return kind("concept-index", "concept-index", "strong", "Repository concept index.");
  if (/^research\/documents\.md$/i.test(r)) return kind("document-catalog", "document-catalog", "strong", "Consolidated document catalog.");
  if (r === "README.md") return kind("readme", "navigation", "strong", "Repository README.");
  if (r === "AGENTS.md" || r.endsWith("/AGENTS.md")) return kind("agent-mandate", "agent-mandate", "strong", "Agent mandate file.");
  if (rLower === "resume-session.md" || rLower.endsWith("/session_resume.md")) return kind("continuation-resume", "continuation-packet", "strong", "Explicit session-resume filename.", "operational");
  if (rLower.startsWith("scripts/ops/") && rLower.endsWith(".md")) return kind("ops-runbook", "runbook", "strong", "Operational script documentation path.", "operational");
  if (rLower.startsWith("skills/") && rLower.endsWith("/skill.md")) return kind("skill-procedure", "documentation", "strong", "Skill procedure file.", "operational");
  if (rLower.startsWith("skills/") && rLower.includes("/references/")) return kind("skill-reference", "documentation", "strong", "Skill reference path.", "operational");
  if (doc?.repo === "ubikia" && rLower.startsWith("artifacts/audible/") && rLower.endsWith("/adaptation-request.md")) return kind("audible-adaptation-request", "adaptation-request", "strong", "Audible adaptation request artifact.", "derived");
  if (doc?.repo === "ubikia" && rLower.startsWith("artifacts/audible/") && /\/spoken(?:\.[^.]+)*\.md$/i.test(rLower)) return kind("audible-spoken-script", "spoken-script", "strong", "Audible spoken-script artifact.", "derived");
  if (doc?.repo === "ubikia" && rLower.startsWith("artifacts/audible/") && rLower.endsWith("/youtube-description.md")) return kind("audible-publication-copy", "publication-copy", "strong", "Audible publication-copy artifact.", "derived");
  if (doc?.repo === "JeanHuguesRobert" && rLower.startsWith(".ubikia/products/") && /\/spoken(?:\.[^/]+)?(?:\/.*)?\.md$/i.test(rLower)) return kind("audible-spoken-script", "spoken-script", "strong", "Ubikia product spoken-script artifact.", "derived");
  if (doc?.repo === "ubikia" && rLower.startsWith("publications/")) return kind("public-essay", "public-essay", "strong", "Ubikia publication path.", "source");
  if (doc?.repo === "JeanHuguesRobert" && rLower === "twin/agent_john_learnings_fr.md") return kind("agent-john-doctrine", "doctrine-note", "strong", "Named Agent John learning doctrine.", "source");
  if (r.startsWith("research/trails/")) return kind("trail", "trail", "strong", "Curated trail path.");
  if (r.includes("/templates/")) return kind("template", "template", "strong", "Template path.");
  if (rLower.startsWith("examples/") || rLower.includes("/examples/") || rLower.includes("/example_") || rLower.includes("fictitious_")) return kind("example", "example", "strong", "Example path or filename.", "example");
  if (r === "COGENTIA.md") return kind("identity-document", "identity-document", "strong", "Framework identity document.");
  if (/^identity\/intent_kernel\.md$/i.test(r)) return kind("intent-kernel", "identity-document", "strong", "Operational intent kernel path.");
  if (r.startsWith("cogentia_personal/data_portability/")) return inferDataPortabilityKind(doc, text);
  if (r.startsWith("prompts/")) return kind("prompt", "prompt", "strong", "Prompt path.");
  if (r.startsWith("interaction_packets/") || r.startsWith("continuations/")) return kind("continuation-packet", "continuation-packet", "strong", "Continuation or interaction packet path.");
  if (r.startsWith("profiles/")) return kind("profile", "profile", "strong", "Profile path.");
  if (r.startsWith("packages/") || r.startsWith("apps/")) return kind("software-doc", "software-doc", "strong", "Software package or application path.");
  if (r.startsWith("docs/")) return inferDocsKind(doc, text);
  if (r.startsWith("chapitres/")) return kind("book-chapter", "book-chapter", "strong", "Book chapter path.");
  if (r.startsWith("annexes/")) return kind("book-annex", "book-annex", "strong", "Book annex path.");
  if (r.startsWith("dossier-de-soumission/")) return kind("submission-material", "submission-material", "strong", "Submission dossier path.");
  if (explicitDocumentRole(fm) === "index" && /index|map|start here|carte/.test(text)) return kind("explicit-index", "navigation", "medium", "Explicit index role with map/index keyword.");
  if (/^index\.md$/i.test(r)) return kind("root-index", "navigation", "medium", "Root index document.");
  if (/^statut\.md$/i.test(r)) return kind("repository-status", "operational-note", "medium", "Repository status document.");
  if (/^context\.md$/i.test(r)) return kind("context-note", "context-note", "medium", "Root context document.");
  if (/^projects?\.md$/i.test(r)) return kind("project-map", "project-map", "medium", "Root project map.");
  if (/^timeline\.md$/i.test(r)) return kind("timeline", "timeline", "medium", "Root timeline document.");
  if (String(fm.document_kind || "").toLowerCase() === "adr") return kind("adr", "adr", "strong", "Explicit ADR kind.", "source");
  if (String(fm.document_kind || "").toLowerCase() === "methodological-bridge") return kind("methodological-bridge", "methodological-bridge", "strong", "Explicit methodological bridge kind.", "source");
  if (String(fm.document_kind || "").toLowerCase() === "media-subsystem-index") return kind("media-subsystem-index", "media-subsystem-index", "strong", "Explicit media subsystem index kind.", "index");
  if (/possibilism|concept/.test(text)) return kind("concept-note", "concept-note", "medium", "Concept keyword.");
  if (/charte|charter/.test(text)) return kind("charter", "charter", "medium", "Charter keyword.", "source");
  if (/introduction/.test(text)) return kind("introduction", "introduction", "medium", "Introduction keyword.");
  if (/auteur|author|à propos/.test(text)) return kind("profile", "profile", "medium", "Author/profile keyword.");
  if (/extrait|excerpt/.test(text)) return kind("book-excerpt", "book-excerpt", "medium", "Excerpt keyword.");
  if (/expérimentation|experimentation|experiment/.test(text)) return kind("experiment-log", "experiment-log", "medium", "Experiment keyword.");
  if (/(^|\/)cas_|case study|case_stud|cas edf|retour d.exp[ée]rience/.test(text)) return kind("case-study", "case-study", "medium", "Case-study keyword.");
  if (doc?.role === "derived") return kind("derived-product", "derived-product", "strong", "Derived role.");
  if (doc?.repo === "gouvernance" || doc?.repo === "institut-mariani" || doc?.repo === "marianivillage") {
    return kind("institutional-document", "institutional-document", "medium", "Institutional repository.");
  }
  if (/tutorial|guide|walkthrough/.test(text)) return kind("tutorial", "tutorial", "medium", "Tutorial or guide keyword.");
  if (/working[- ]note|note de travail|process note|note de process/.test(text)) return kind("working-note", "working-note", "medium", "Working-note keyword.");
  if (/\bspec\b|specification/.test(text)) return kind("spec", "spec", "medium", "Specification keyword.");
  if (/protocol|protocole/.test(text)) return kind("protocol", "protocol", "medium", "Protocol keyword.");
  if (/architecture/.test(text)) return kind("architecture", "architecture", "medium", "Architecture keyword.");
  if (/dashboard|tableau de bord/.test(text)) return kind("dashboard", "dashboard", "medium", "Dashboard keyword.", "operational");
  if (/journal/.test(text) || r.includes("/journal/")) return kind("journal", "journal", "medium", "Journal path or keyword.");
  if (doc?.role === "operational") return kind("operational-note", "operational-note", "medium", "Operational role.");
  if (doc?.role === "source" && r.startsWith("research/")) {
    return kind("research-paper", "research-paper", "medium", "Source document under research/.");
  }
  if (doc?.role === "source") return kind("source-document", "source-document", "weak", "Source role without stronger kind signal.");
  return kind("unknown", "unknown", "weak", "No deterministic kind rule matched.");
}

export function classificationEquivalent(field, actual, expected) {
  const a = String(actual || "").trim().toLowerCase();
  const e = String(expected || "").trim().toLowerCase();
  if (!a || !e) return true;
  if (a === e) return true;
  if (field === "document_role") {
    if (a.includes(e) || e.includes(a)) return true;
    if (e === "alias" && a.includes("alias")) return true;
    if (e === "source" && (a.includes("source") || a.includes("souverain") || a.includes("sovereign"))) return true;
    if (e === "operational" && a.includes("operational")) return true;
  }
  if (field === "lifecycle_state") {
    if (a.includes(e) || e.includes(a)) return true;
    if (e === "working" && /draft|working|v0|provisoire/.test(a)) return true;
  }
  if (field === "document_kind") return a === e || a.includes(e) || e.includes(a);
  return false;
}

export function classifyDocumentForFrontmatter(doc) {
  const fm = doc?.frontmatter || {};
  const kind = inferDocumentKind(doc);
  let inferredRole = kind.role || (kind.kind === "redirect-alias" ? "alias" : (doc?.role === "archive" ? "operational" : doc?.role));
  let roleConfidence = kind.role ? kind.confidence : (doc?.role_confidence || "medium");
  if ((!inferredRole || inferredRole === "unknown") && kind.kind === "identity-document") {
    inferredRole = "operational";
    roleConfidence = kind.confidence;
  }
  const explicitRole = explicitDocumentRole(fm);
  const explicitKind = String(fm.document_kind || "").trim();
  const explicitLifecycle = String(fm.lifecycle_state || "").trim();
  const role = explicitRole || inferredRole;
  const lifecycle = inferLifecycleState(doc, kind);
  const visibility = doc?.visibility?.level || "public";
  const usesExplicitMetadata = Boolean(explicitKind || explicitLifecycle);
  const rule = usesExplicitMetadata ? "explicit-metadata" : kind.rule;
  const confidence = weakestConfidence([roleConfidence, kind.confidence]);
  const legacyDocumentRole = legacyFreeTextRole(fm.document_role);
  const legacyCorpusRole = legacyFreeTextRole(fm.corpus_role);
  const legacyRole = legacyFreeTextRole(fm.role);
  const desired = {
    document_role: role,
    document_kind: explicitKind || kind.kind,
    visibility,
    lifecycle_state: explicitLifecycle || lifecycle.state,
    classification_source: "cogentia.js",
    classification_version: CLASSIFICATION_VERSION,
    classification_rule: rule,
    classification_confidence: confidence,
  };
  if (legacyDocumentRole) desired.legacy_document_role = legacyDocumentRole;
  if (legacyCorpusRole) desired.legacy_corpus_role = legacyCorpusRole;
  if (legacyRole) desired.legacy_role = legacyRole;
  const explicit = {
    document_role: explicitDocumentRole(fm),
    document_kind: fm.document_kind || "",
    visibility: fm.visibility || fm.privacy_level || fm.confidentiality || "",
    lifecycle_state: fm.lifecycle_state || "",
  };
  const conflicts = [];
  for (const [key, actual] of Object.entries(explicit)) {
    if (!actual) continue;
    if (!classificationEquivalent(key, actual, desired[key])) {
      conflicts.push({
        field: key,
        explicit: String(actual),
        inferred: desired[key],
        rule,
      });
    }
  }
  return {
    repo: doc?.repo,
    path: doc?.rel,
    title: doc?.title,
    role: doc?.role,
    document_role: desired.document_role,
    document_kind: desired.document_kind,
    visibility: desired.visibility,
    lifecycle_state: desired.lifecycle_state,
    rule,
    confidence,
    desired,
    explicit,
    conflicts,
    reason: kind.reason,
    ambiguity_category: confidence === "weak" ? categorizeAmbiguity({ reason: kind.reason, rule, role: doc?.role, confidence }) : null,
  };
}
