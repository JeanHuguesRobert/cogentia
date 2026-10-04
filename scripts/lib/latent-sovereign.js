// A latent sovereign document is actual as a text and not yet a source.
// Materialization writes sovereign_status actual and document_role source.
// It does not remove derived_from, and it refuses a file that is not latent.

export const LATENT_SOVEREIGN_STATUS = "latent";
export const ACTUAL_SOVEREIGN_STATUS = "actual";
export const LATENT_SOVEREIGN_KIND = "latent_sovereign_materialization";

export function sovereignStatus(fm) {
  return String(fm?.sovereign_status || "").trim().toLowerCase();
}

export function isLatentSovereign(fm) {
  return sovereignStatus(fm) === LATENT_SOVEREIGN_STATUS;
}

export function explicitRoleIsSource(fm) {
  if (isLatentSovereign(fm)) return false;
  const explicit = String(fm?.document_role || fm?.corpus_role || fm?.role || "").toLowerCase();
  return explicit.includes("source");
}

export function resolutionMaterializes(decision, payload = {}) {
  const text = String(decision || "").trim().toLowerCase();
  if (text === "source" || text === "actual" || text === "materialize") return true;
  if (payload?.materialize === true) return true;
  const patch = payload?.frontmatter_patch;
  return String(patch?.sovereign_status || "").trim().toLowerCase() === ACTUAL_SOVEREIGN_STATUS
    && String(patch?.document_role || "").trim().toLowerCase() === "source";
}

export function applyResolvedCorpusRole(current, resolved) {
  if (!resolved?.role) return { ...current, resolved_via_continuation: null };
  const strong = Boolean(current?.role) && current.role !== "unknown" && current.role_confidence === "strong";
  const materialization = resolved.kind === LATENT_SOVEREIGN_KIND;
  if (strong && !materialization) {
    return { ...current, resolved_via_continuation: null };
  }
  return {
    ...current,
    role: resolved.role,
    role_confidence: "strong",
    resolved_via_continuation: resolved.continuation_id || null,
  };
}

function frontmatterValue(raw, key) {
  const match = String(raw || "").match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
  if (!match) return "";
  return match[1].trim().replace(/^["']|["']$/g, "");
}

function quoteScalar(value) {
  return JSON.stringify(String(value ?? ""));
}

export function materializeLatentSovereignMarkdown(raw) {
  const text = String(raw || "");
  if (frontmatterValue(text, "sovereign_status").toLowerCase() !== LATENT_SOVEREIGN_STATUS) {
    throw new Error("materialize requires sovereign_status: latent");
  }
  const derivedFrom = frontmatterValue(text, "derived_from");
  const patch = {
    sovereign_status: ACTUAL_SOVEREIGN_STATUS,
    document_role: "source",
  };
  const entries = Object.entries(patch);
  let next;
  if (!text.startsWith("---")) {
    const lines = entries.map(([key, value]) => `${key}: ${quoteScalar(value)}`);
    next = `---\n${lines.join("\n")}\n---\n\n${text}`;
  } else {
    const end = text.indexOf("\n---", 3);
    if (end < 0) throw new Error("materialize requires a closed frontmatter block");
    const frontmatter = text.slice(0, end);
    const rest = text.slice(end);
    const seen = new Set();
    const updated = frontmatter.split(/\r?\n/).map(line => {
      const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (!match) return line;
      const found = entries.find(([key]) => key === match[1]);
      if (!found) return line;
      seen.add(found[0]);
      return `${found[0]}: ${quoteScalar(found[1])}`;
    });
    for (const [key, value] of entries) {
      if (!seen.has(key)) updated.push(`${key}: ${quoteScalar(value)}`);
    }
    next = `${updated.join("\n").trimEnd()}${rest}`;
  }
  if (derivedFrom && !next.includes(derivedFrom)) {
    throw new Error("materialize dropped derived_from");
  }
  if (frontmatterValue(next, "sovereign_status") !== ACTUAL_SOVEREIGN_STATUS) {
    throw new Error("materialize did not write sovereign_status: actual");
  }
  if (frontmatterValue(next, "document_role") !== "source") {
    throw new Error("materialize did not write document_role: source");
  }
  return next;
}
