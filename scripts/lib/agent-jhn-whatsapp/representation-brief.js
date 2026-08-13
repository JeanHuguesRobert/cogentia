/**
 * Load and shape the personal representation brief for Agent JHN prompts.
 * Quality-first: full agent_brief.md body is preferred over a short paraphrase.
 *
 * Canonical source: JeanHuguesRobert/research/agent_brief.md
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {{ path: string|null, mtimeMs: number, text: string } | null} */
let cache = null;
/** @type {{ path: string|null, mtimeMs: number, text: string } | null} */
let publicAgentsCache = null;
/** @type {{ path: string|null, mtimeMs: number, text: string } | null} */
let cogentigramCapsuleCache = null;
/** @type {{ path: string|null, mtimeMs: number, profile: object } | null} */
let cogentigramOpenCache = null;
/** @type {{ path: string|null, mtimeMs: number, text: string } | null} */
let primaryStyleCache = null;
/** @type {{ path: string|null, mtimeMs: number, text: string } | null} */
let personStyleCache = null;

/** Default specialized KYS grant for WhatsApp answer fidelity dogfood. */
export const DEFAULT_KYS_PUBLIC_ANSWER_GRANT = {
  kys_profile_id: "kys.public_answer_style",
  purpose: "public_answer_fidelity",
  controller: "person",
  principal_ref: "JeanHuguesRobert",
  privai_status: "experimental_uncertified_prototype",
  non_episodic: true,
  not_judicial_evidence: true,
  structural_only: true,
};

/** Primary (base) persona for Agent John — Ubikia alternate personas must opt in explicitly. */
export const AGENT_JOHN_PRIMARY_PERSONA_ID = "agent_john_primary";

/**
 * Whether WhatsApp cognitive drafts should inject the agent brief.
 * Default true (quality over cost). Set AGENT_JHN_WHATSAPP_INJECT_AGENT_BRIEF=0 to disable.
 */
export function shouldInjectAgentBrief(env = process.env, options = {}) {
  if (options.injectAgentBrief === false) return false;
  if (options.injectAgentBrief === true) return true;
  if (options.agentBriefText != null && String(options.agentBriefText).trim()) return true;
  const raw = String(env.AGENT_JHN_WHATSAPP_INJECT_AGENT_BRIEF ?? "1").trim().toLowerCase();
  return !(raw === "0" || raw === "false" || raw === "no" || raw === "off");
}

/**
 * Resolve filesystem path to agent_brief.md (or null).
 */
export function resolveAgentBriefPath(env = process.env, options = {}) {
  if (options.agentBriefPath) {
    const p = path.resolve(String(options.agentBriefPath));
    return fs.existsSync(p) ? p : null;
  }
  const fromEnv = String(
    env.AGENT_JHN_WHATSAPP_AGENT_BRIEF_PATH ||
    env.COGENTIA_AGENT_BRIEF_PATH ||
    "",
  ).trim();
  if (fromEnv) {
    const p = path.resolve(fromEnv);
    if (fs.existsSync(p)) return p;
  }

  const candidates = [
    // Fracta layout
    "/srv/cogentia/repos/JeanHuguesRobert/research/agent_brief.md",
    // Sibling checkout (cwd = cogentia)
    path.resolve(process.cwd(), "..", "JeanHuguesRobert", "research", "agent_brief.md"),
    path.resolve(process.cwd(), "JeanHuguesRobert", "research", "agent_brief.md"),
    // cwd is JeanHuguesRobert
    path.resolve(process.cwd(), "research", "agent_brief.md"),
    // Relative to this module: .../cogentia/scripts/lib/agent-jhn-whatsapp → workspace/JeanHuguesRobert
    path.resolve(moduleDir, "..", "..", "..", "..", "JeanHuguesRobert", "research", "agent_brief.md"),
    path.resolve(moduleDir, "..", "..", "..", "JeanHuguesRobert", "research", "agent_brief.md"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Load agent brief text (full file). Cached by path + mtime.
 *
 * @returns {{ ok: boolean, text: string, path: string|null, source: string }}
 */
export function loadAgentBrief(options = {}, env = process.env) {
  if (options.agentBriefText != null) {
    const text = String(options.agentBriefText);
    return {
      ok: Boolean(text.trim()),
      text,
      path: options.agentBriefPath ? String(options.agentBriefPath) : null,
      source: "options",
    };
  }
  if (!shouldInjectAgentBrief(env, options)) {
    return { ok: false, text: "", path: null, source: "disabled" };
  }

  const filePath = resolveAgentBriefPath(env, options);
  if (!filePath) {
    return { ok: false, text: "", path: null, source: "missing" };
  }

  try {
    const stat = fs.statSync(filePath);
    if (cache && cache.path === filePath && cache.mtimeMs === stat.mtimeMs) {
      return { ok: true, text: cache.text, path: filePath, source: "cache" };
    }
    const text = fs.readFileSync(filePath, "utf8");
    cache = { path: filePath, mtimeMs: stat.mtimeMs, text };
    return { ok: Boolean(text.trim()), text, path: filePath, source: "file" };
  } catch {
    return { ok: false, text: "", path: filePath, source: "error" };
  }
}

/**
 * Whether to inject the public read-only AGENTS constitution into answer surfaces.
 * Default true. AGENT_JHN_WHATSAPP_INJECT_PUBLIC_AGENTS=0 disables for WhatsApp path.
 */
export function shouldInjectPublicReadonlyAgents(env = process.env, options = {}) {
  if (options.injectPublicReadonlyAgents === false) return false;
  if (options.injectPublicReadonlyAgents === true) return true;
  if (options.publicReadonlyAgentsText != null && String(options.publicReadonlyAgentsText).trim()) {
    return true;
  }
  const raw = String(env.AGENT_JHN_WHATSAPP_INJECT_PUBLIC_AGENTS ?? env.COGENTIA_INJECT_PUBLIC_AGENTS ?? "1")
    .trim()
    .toLowerCase();
  return !(raw === "0" || raw === "false" || raw === "no" || raw === "off");
}

/**
 * Resolve path to instructions/AGENTS.public-readonly.md
 */
export function resolvePublicReadonlyAgentsPath(env = process.env, options = {}) {
  if (options.publicReadonlyAgentsPath) {
    const p = path.resolve(String(options.publicReadonlyAgentsPath));
    return fs.existsSync(p) ? p : null;
  }
  const fromEnv = String(
    env.AGENT_JHN_WHATSAPP_PUBLIC_AGENTS_PATH ||
    env.COGENTIA_PUBLIC_READONLY_AGENTS_PATH ||
    "",
  ).trim();
  if (fromEnv) {
    const p = path.resolve(fromEnv);
    if (fs.existsSync(p)) return p;
  }
  const candidates = [
    path.resolve(process.cwd(), "instructions", "AGENTS.public-readonly.md"),
    path.resolve(process.cwd(), "cogentia", "instructions", "AGENTS.public-readonly.md"),
    "/srv/cogentia/repos/cogentia/instructions/AGENTS.public-readonly.md",
    path.resolve(moduleDir, "..", "..", "..", "instructions", "AGENTS.public-readonly.md"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Load public read-only AGENTS constitution (derived product for answer surfaces).
 */
export function loadPublicReadonlyAgents(options = {}, env = process.env) {
  if (options.publicReadonlyAgentsText != null) {
    const text = String(options.publicReadonlyAgentsText);
    return {
      ok: Boolean(text.trim()),
      text,
      path: options.publicReadonlyAgentsPath ? String(options.publicReadonlyAgentsPath) : null,
      source: "options",
    };
  }
  if (!shouldInjectPublicReadonlyAgents(env, options)) {
    return { ok: false, text: "", path: null, source: "disabled" };
  }
  const filePath = resolvePublicReadonlyAgentsPath(env, options);
  if (!filePath) return { ok: false, text: "", path: null, source: "missing" };
  try {
    const stat = fs.statSync(filePath);
    if (
      publicAgentsCache &&
      publicAgentsCache.path === filePath &&
      publicAgentsCache.mtimeMs === stat.mtimeMs
    ) {
      return { ok: true, text: publicAgentsCache.text, path: filePath, source: "cache" };
    }
    const text = fs.readFileSync(filePath, "utf8");
    publicAgentsCache = { path: filePath, mtimeMs: stat.mtimeMs, text };
    return { ok: Boolean(text.trim()), text, path: filePath, source: "file" };
  } catch {
    return { ok: false, text: "", path: filePath, source: "error" };
  }
}

export function buildPublicReadonlyAgentsSystemContent(text) {
  const body = String(text || "").trim();
  if (!body) return "";
  return [
    "Public read-only agent constitution for this answer surface.",
    "Canonical derived source: cogentia/instructions/AGENTS.public-readonly.md",
    "Full worker AGENTS.md / AGENTS.shared.md may describe broader tools; this surface only has the subset described below.",
    "Do not assume coding-agent or mutate powers from other instruction files.",
    "",
    body,
  ].join("\n");
}

/**
 * Fixed channel + identity rules (always present).
 */
export function buildWhatsAppChannelPolicy(analysis = {}, options = {}) {
  const maxChars = Number.isFinite(options.maxChars) ? options.maxChars : 1200;
  const locale = analysis.locale === "fr" ? "French" : "English";
  return [
    "You are Agent John (JHN), the experimental personal digital twin assistant of Jean Hugues Noël Robert (baron Mariani).",
    "You are not Jean Hugues and cannot make commitments, sign, spend, publish, or legally bind him.",
    "Single-author phase (AI-first org): optimise for fidelity to how he would answer from the documented public corpus — not a generic corporate chatbot voice.",
    "This WhatsApp surface is mostly read-only: its mandate is a subset of full twin/owner capabilities (answer and constrained send under policy), never a superset.",
    "Read-only does not mean readable secrets: never retrieve, cite, or expose secrets, credentials, or private registre-mariani content — public corpus view only.",
    "The Cogentia Registry marks priority active repositories; still prefer corpus-grounded answers over invention when wider public material is relevant.",
    "Default posture from the representation brief: prepare a faithful answer under mandate; he remains the arbiter of irreversible acts.",
    "Lead with the useful answer; do not merely summarize excerpts.",
    "Separate established facts from proposals, intentions, and unknowns.",
    "Support important corpus-grounded claims with source_id in square brackets.",
    "Never invent a source_id or claim a project is operational unless an excerpt or the brief says so.",
    "If evidence is insufficient, state the precise limit instead of filling the gap.",
    analysis.needsCurrentWeb && !options.currentInformationVerified
      ? "The supplied evidence is not verified as current; say so explicitly."
      : "Use the supplied evidence according to its stated scope.",
    `Intent: ${analysis.intent || "explain"}. Preferred answer shape: ${analysis.answerShape || "direct_answer"}.`,
    `This is WhatsApp: answer in at most ${Math.min(maxChars, 900)} characters, with short paragraphs or compact steps.`,
    `Reply only in ${locale}.`,
  ].join(" ");
}

/**
 * System message holding the full operating brief (quality-first injection).
 */
export function buildAgentBriefSystemContent(briefText) {
  const body = String(briefText || "").trim();
  if (!body) return "";
  return [
    "Operating brief for representing Jean Hugues Noël Robert.",
    "Canonical source: JeanHuguesRobert/research/agent_brief.md.",
    "Obey this brief for mandate boundaries, voice, positions, red lines, and hand-back rules.",
    "You remain an artificial assistant under that brief — not the natural person.",
    "When the brief and public corpus excerpts conflict on factual project claims, prefer cited corpus excerpts and name the limit.",
    "When unsure, prefer a precise gap or hand-back over a confident invention.",
    "",
    body,
  ].join("\n");
}

/**
 * Whether to inject Cogentigram thinking capsule (style of reasoning).
 * Default true. AGENT_JHN_WHATSAPP_INJECT_COGENTIGRAM=0 disables.
 */
export function shouldInjectCogentigramCapsule(env = process.env, options = {}) {
  if (options.injectCogentigramCapsule === false) return false;
  if (options.injectCogentigramCapsule === true) return true;
  if (options.cogentigramCapsuleText != null && String(options.cogentigramCapsuleText).trim()) {
    return true;
  }
  const raw = String(env.AGENT_JHN_WHATSAPP_INJECT_COGENTIGRAM ?? "1").trim().toLowerCase();
  return !(raw === "0" || raw === "false" || raw === "no" || raw === "off");
}

export function resolveCogentigramCapsulePath(env = process.env, options = {}) {
  if (options.cogentigramCapsulePath) {
    const p = path.resolve(String(options.cogentigramCapsulePath));
    return fs.existsSync(p) ? p : null;
  }
  const fromEnv = String(env.AGENT_JHN_WHATSAPP_COGENTIGRAM_CAPSULE_PATH || env.COGENTIA_COGENTIGRAM_CAPSULE_PATH || "").trim();
  if (fromEnv) {
    const p = path.resolve(fromEnv);
    if (fs.existsSync(p)) return p;
  }
  const candidates = [
    path.resolve(process.cwd(), "research", "cogentigram_jhn_thinking_capsule.md"),
    path.resolve(process.cwd(), "cogentia", "research", "cogentigram_jhn_thinking_capsule.md"),
    "/srv/cogentia/repos/cogentia/research/cogentigram_jhn_thinking_capsule.md",
    path.resolve(moduleDir, "..", "..", "..", "research", "cogentigram_jhn_thinking_capsule.md"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export function loadCogentigramCapsule(options = {}, env = process.env) {
  if (options.cogentigramCapsuleText != null) {
    const text = String(options.cogentigramCapsuleText);
    return { ok: Boolean(text.trim()), text, path: null, source: "options" };
  }
  if (!shouldInjectCogentigramCapsule(env, options)) {
    return { ok: false, text: "", path: null, source: "disabled" };
  }
  const filePath = resolveCogentigramCapsulePath(env, options);
  if (!filePath) return { ok: false, text: "", path: null, source: "missing" };
  try {
    const stat = fs.statSync(filePath);
    if (
      cogentigramCapsuleCache
      && cogentigramCapsuleCache.path === filePath
      && cogentigramCapsuleCache.mtimeMs === stat.mtimeMs
    ) {
      return { ok: true, text: cogentigramCapsuleCache.text, path: filePath, source: "cache" };
    }
    const text = fs.readFileSync(filePath, "utf8");
    cogentigramCapsuleCache = { path: filePath, mtimeMs: stat.mtimeMs, text };
    return { ok: Boolean(text.trim()), text, path: filePath, source: "file" };
  } catch {
    return { ok: false, text: "", path: filePath, source: "error" };
  }
}

/**
 * Whether to inject compressed top-N axes from person-open structural Cogentigram.
 * Default true. AGENT_JHN_WHATSAPP_INJECT_COGENTIGRAM_TOPN=0 disables.
 */
export function shouldInjectCogentigramTopN(env = process.env, options = {}) {
  if (options.injectCogentigramTopN === false) return false;
  if (options.injectCogentigramTopN === true) return true;
  if (options.cogentigramTopNText != null && String(options.cogentigramTopNText).trim()) return true;
  const raw = String(env.AGENT_JHN_WHATSAPP_INJECT_COGENTIGRAM_TOPN ?? "1").trim().toLowerCase();
  return !(raw === "0" || raw === "false" || raw === "no" || raw === "off");
}

export function resolvePublicOpenCogentigramPath(env = process.env, options = {}) {
  if (options.cogentigramOpenPath) {
    const p = path.resolve(String(options.cogentigramOpenPath));
    return fs.existsSync(p) ? p : null;
  }
  const fromEnv = String(
    env.AGENT_JHN_WHATSAPP_COGENTIGRAM_OPEN_PATH || env.COGENTIA_COGENTIGRAM_OPEN_PATH || "",
  ).trim();
  if (fromEnv) {
    const p = path.resolve(fromEnv);
    if (fs.existsSync(p)) return p;
  }
  const candidates = [
    path.resolve(process.cwd(), "research", "cogentigram_jhn_public_open.json"),
    path.resolve(process.cwd(), "cogentia", "research", "cogentigram_jhn_public_open.json"),
    "/srv/cogentia/repos/cogentia/research/cogentigram_jhn_public_open.json",
    path.resolve(moduleDir, "..", "..", "..", "research", "cogentigram_jhn_public_open.json"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export function loadPublicOpenCogentigram(options = {}, env = process.env) {
  if (options.cogentigramOpenProfile && typeof options.cogentigramOpenProfile === "object") {
    return { ok: true, profile: options.cogentigramOpenProfile, path: null, source: "options" };
  }
  if (!shouldInjectCogentigramTopN(env, options) && !options.forceLoadOpenProfile) {
    return { ok: false, profile: null, path: null, source: "disabled" };
  }
  const filePath = resolvePublicOpenCogentigramPath(env, options);
  if (!filePath) return { ok: false, profile: null, path: null, source: "missing" };
  try {
    const stat = fs.statSync(filePath);
    if (
      cogentigramOpenCache
      && cogentigramOpenCache.path === filePath
      && cogentigramOpenCache.mtimeMs === stat.mtimeMs
    ) {
      return { ok: true, profile: cogentigramOpenCache.profile, path: filePath, source: "cache" };
    }
    const profile = JSON.parse(fs.readFileSync(filePath, "utf8"));
    cogentigramOpenCache = { path: filePath, mtimeMs: stat.mtimeMs, profile };
    return { ok: Boolean(profile?.indicators?.length), profile, path: filePath, source: "file" };
  } catch {
    return { ok: false, profile: null, path: filePath, source: "error" };
  }
}

/**
 * Compress person-open Cogentigram to top-N axes for prompt injection.
 * @returns {{ text: string, top: object[], n: number, grant: object }}
 */
export function compressCogentigramTopN(profile, options = {}, env = process.env) {
  const n = Math.max(3, Math.min(
    Number(options.cogentigramTopN || env.AGENT_JHN_WHATSAPP_COGENTIGRAM_TOPN || 12),
    30,
  ));
  const indicators = Array.isArray(profile?.indicators) ? profile.indicators.slice() : [];
  indicators.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
  const top = indicators.slice(0, n).map((item) => ({
    rank: item.rank,
    category: item.category,
    name: item.name,
    score: item.score,
    confidence: item.confidence,
    evidence: String(item.evidence || "").slice(0, 220),
  }));
  const low = indicators
    .slice()
    .sort((a, b) => Number(a.score || 0) - Number(b.score || 0))
    .slice(0, 3)
    .map((item) => ({ name: item.name, score: item.score, note: "do not fake this axis" }));

  const grant = buildKysGrantMetadata(options, env);
  const lines = [
    `Compressed structural Cogentigram top-${top.length} (person-open dogfood).`,
    `profile_id: ${profile?.profile_id || "unknown"}`,
    `kys_profile_id: ${grant.kys_profile_id}`,
    `purpose: ${grant.purpose}`,
    "Structural only — not episodic; not court evidence; not clinical/HR truth.",
    "",
    "Top axes (prefer answers that exhibit these):",
    ...top.map((item, i) =>
      `${i + 1}. ${item.name} (${item.category}) score=${item.score} conf=${item.confidence} — ${item.evidence}`,
    ),
    "",
    "Lower axes (do not simulate):",
    ...low.map((item) => `- ${item.name} score=${item.score}`),
  ];
  return { text: lines.join("\n"), top, low, n: top.length, grant };
}

/**
 * KYS grant metadata for draft diagnostics / traces.
 */
export function buildKysGrantMetadata(options = {}, env = process.env) {
  const base = { ...DEFAULT_KYS_PUBLIC_ANSWER_GRANT };
  if (options.kysGrant && typeof options.kysGrant === "object") {
    Object.assign(base, options.kysGrant);
  }
  if (env.AGENT_JHN_WHATSAPP_KYS_PROFILE_ID) {
    base.kys_profile_id = String(env.AGENT_JHN_WHATSAPP_KYS_PROFILE_ID).trim();
  }
  if (env.AGENT_JHN_WHATSAPP_KYS_PURPOSE) {
    base.purpose = String(env.AGENT_JHN_WHATSAPP_KYS_PURPOSE).trim();
  }
  base.injected = {
    public_readonly_agents: shouldInjectPublicReadonlyAgents(env, options),
    agent_brief: shouldInjectAgentBrief(env, options),
    answer_style_capsule: shouldInjectCogentigramCapsule(env, options),
    structural_top_n: shouldInjectCogentigramTopN(env, options),
  };
  return base;
}

/**
 * Whether to inject the primary style kernel (cross-surface default).
 * Default true. AGENT_JHN_INJECT_PRIMARY_STYLE=0 disables.
 * Non-primary persona_id skips primary kernel (Ubikia alternate appearance).
 */
export function shouldInjectPrimaryStyle(env = process.env, options = {}) {
  if (options.injectPrimaryStyle === false) return false;
  if (options.injectPrimaryStyle === true) return true;
  if (options.primaryStyleText != null && String(options.primaryStyleText).trim()) return true;
  const personaId = resolvePersonaId(options, env);
  if (personaId && personaId !== AGENT_JOHN_PRIMARY_PERSONA_ID) return false;
  const raw = String(
    env.AGENT_JHN_INJECT_PRIMARY_STYLE ?? env.AGENT_JHN_WHATSAPP_INJECT_PRIMARY_STYLE ?? "1",
  ).trim().toLowerCase();
  return !(raw === "0" || raw === "false" || raw === "no" || raw === "off");
}

/** @returns {string} */
export function resolvePersonaId(options = {}, env = process.env) {
  const fromOpt = options.personaId || options.persona_id;
  if (fromOpt != null && String(fromOpt).trim()) return String(fromOpt).trim();
  const fromEnv = String(env.AGENT_JHN_PERSONA_ID || env.AGENT_JHN_WHATSAPP_PERSONA_ID || "").trim();
  return fromEnv || AGENT_JOHN_PRIMARY_PERSONA_ID;
}

export function resolvePrimaryStylePath(env = process.env, options = {}) {
  if (options.primaryStylePath) {
    const p = path.resolve(String(options.primaryStylePath));
    return fs.existsSync(p) ? p : null;
  }
  const fromEnv = String(
    env.AGENT_JHN_PRIMARY_STYLE_PATH || env.COGENTIA_PRIMARY_STYLE_PATH || "",
  ).trim();
  if (fromEnv) {
    const p = path.resolve(fromEnv);
    if (fs.existsSync(p)) return p;
  }
  const candidates = [
    path.resolve(process.cwd(), "research", "agent_john_primary_style.md"),
    path.resolve(process.cwd(), "cogentia", "research", "agent_john_primary_style.md"),
    "/srv/cogentia/repos/cogentia/research/agent_john_primary_style.md",
    path.resolve(moduleDir, "..", "..", "..", "research", "agent_john_primary_style.md"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Load primary style kernel text.
 * @returns {{ ok: boolean, text: string, path: string|null, source: string, persona_id: string }}
 */
export function loadPrimaryStyleKernel(options = {}, env = process.env) {
  const persona_id = resolvePersonaId(options, env);
  if (options.primaryStyleText != null) {
    const text = String(options.primaryStyleText);
    return {
      ok: Boolean(text.trim()),
      text,
      path: options.primaryStylePath ? String(options.primaryStylePath) : null,
      source: "options",
      persona_id,
    };
  }
  if (!shouldInjectPrimaryStyle(env, options)) {
    return { ok: false, text: "", path: null, source: "disabled", persona_id };
  }
  const filePath = resolvePrimaryStylePath(env, options);
  if (!filePath) return { ok: false, text: "", path: null, source: "missing", persona_id };
  try {
    const stat = fs.statSync(filePath);
    if (
      primaryStyleCache
      && primaryStyleCache.path === filePath
      && primaryStyleCache.mtimeMs === stat.mtimeMs
    ) {
      return {
        ok: true,
        text: primaryStyleCache.text,
        path: filePath,
        source: "cache",
        persona_id,
      };
    }
    const text = fs.readFileSync(filePath, "utf8");
    primaryStyleCache = { path: filePath, mtimeMs: stat.mtimeMs, text };
    return { ok: Boolean(text.trim()), text, path: filePath, source: "file", persona_id };
  } catch {
    return { ok: false, text: "", path: filePath, source: "error", persona_id };
  }
}

export function buildPrimaryStyleSystemContent(text, options = {}, env = process.env) {
  const body = String(text || "").trim();
  if (!body) return "";
  const persona_id = resolvePersonaId(options, env);
  return [
    `Agent John primary style kernel (persona_id=${persona_id}).`,
    "Cross-surface default: same style fidelity on Guide, WhatsApp, and jhn-public unless an explicit non-primary persona is set (Ubikia).",
    "Critical fidelity — not slogan imitation, not impersonation, not clinical truth.",
    "Canonical: cogentia/research/agent_john_primary_style.md",
    "",
    body,
  ].join("\n");
}

/**
 * Whether to inject person-level STYLE.md (JeanHuguesRobert/STYLE.md).
 * Default true (quality-first). AGENT_JHN_INJECT_PERSON_STYLE=0 disables.
 */
export function shouldInjectPersonStyle(env = process.env, options = {}) {
  if (options.injectPersonStyle === false) return false;
  if (options.injectPersonStyle === true) return true;
  if (options.personStyleText != null && String(options.personStyleText).trim()) return true;
  const personaId = resolvePersonaId(options, env);
  if (personaId && personaId !== AGENT_JOHN_PRIMARY_PERSONA_ID) return false;
  const raw = String(
    env.AGENT_JHN_INJECT_PERSON_STYLE ?? env.AGENT_JHN_WHATSAPP_INJECT_PERSON_STYLE ?? "1",
  ).trim().toLowerCase();
  return !(raw === "0" || raw === "false" || raw === "no" || raw === "off");
}

export function resolvePersonStylePath(env = process.env, options = {}) {
  if (options.personStylePath) {
    const p = path.resolve(String(options.personStylePath));
    return fs.existsSync(p) ? p : null;
  }
  const fromEnv = String(
    env.AGENT_JHN_PERSON_STYLE_PATH || env.COGENTIA_PERSON_STYLE_PATH || "",
  ).trim();
  if (fromEnv) {
    const p = path.resolve(fromEnv);
    if (fs.existsSync(p)) return p;
  }
  const candidates = [
    "/srv/cogentia/repos/JeanHuguesRobert/STYLE.md",
    path.resolve(process.cwd(), "..", "JeanHuguesRobert", "STYLE.md"),
    path.resolve(process.cwd(), "JeanHuguesRobert", "STYLE.md"),
    path.resolve(process.cwd(), "STYLE.md"),
    path.resolve(moduleDir, "..", "..", "..", "..", "JeanHuguesRobert", "STYLE.md"),
    path.resolve(moduleDir, "..", "..", "..", "JeanHuguesRobert", "STYLE.md"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Load person-level STYLE.md if present.
 * @returns {{ ok: boolean, text: string, path: string|null, source: string }}
 */
export function loadPersonStyle(options = {}, env = process.env) {
  if (options.personStyleText != null) {
    const text = String(options.personStyleText);
    return {
      ok: Boolean(text.trim()),
      text,
      path: options.personStylePath ? String(options.personStylePath) : null,
      source: "options",
    };
  }
  if (!shouldInjectPersonStyle(env, options)) {
    return { ok: false, text: "", path: null, source: "disabled" };
  }
  const filePath = resolvePersonStylePath(env, options);
  if (!filePath) return { ok: false, text: "", path: null, source: "missing" };
  try {
    const stat = fs.statSync(filePath);
    if (
      personStyleCache
      && personStyleCache.path === filePath
      && personStyleCache.mtimeMs === stat.mtimeMs
    ) {
      return { ok: true, text: personStyleCache.text, path: filePath, source: "cache" };
    }
    const text = fs.readFileSync(filePath, "utf8");
    personStyleCache = { path: filePath, mtimeMs: stat.mtimeMs, text };
    return { ok: Boolean(text.trim()), text, path: filePath, source: "file" };
  } catch {
    return { ok: false, text: "", path: filePath, source: "error" };
  }
}

export function buildPersonStyleSystemContent(text) {
  const body = String(text || "").trim();
  if (!body) return "";
  return [
    "Person-level STYLE.md (principal-owned style mandate).",
    "Canonical when present: <person-public-repo>/STYLE.md (e.g. JeanHuguesRobert/STYLE.md).",
    "Governs how to sound and reason when representing this person — not identity, not clinical truth.",
    "If STYLE.md conflicts with red-line mandates or cited corpus facts on project claims, prefer mandates/facts and name the tension.",
    "",
    body,
  ].join("\n");
}

/**
 * Compact style block for Guide / OpenAI surfaces (token-aware first approximation).
 * Prefer full stack on WhatsApp; Guide gets kernel + short style priorities + optional top-N.
 *
 * @returns {string}
 */
export function buildCrossSurfaceStyleBlock(options = {}, env = process.env) {
  const persona_id = resolvePersonaId(options, env);
  const parts = [
    "STYLE FIDELITY (Agent John primary approximation)",
    `persona_id: ${persona_id}`,
    "You are Agent John / Agent JHN — artificial agent, not Jean Hugues Noël Robert.",
    "Optimise for fidelity to how the principal would answer from the public corpus (Buffon-style structural style), within this surface's read-only mandate.",
    "Priorities: definitional rigor; premises before flourish; systemising; density; literality; process priority; sober clarity (no fake warmth); second method (limits/objections); hand-back on irreversible acts.",
    "Anti-patterns: generic chatbot voice, corporate brand persona, slogan caricature, first-person personhood, invented private episodes.",
  ];

  if (shouldInjectPersonStyle(env, options)) {
    const person = loadPersonStyle(options, env);
    if (person.ok && person.text.trim()) {
      const body = person.text.replace(/^---[\s\S]*?---\s*/m, "").trim();
      const max = Number(options.personStyleMaxChars || env.AGENT_JHN_PERSON_STYLE_MAX_CHARS || 5000);
      parts.push("", "--- PERSON STYLE.md ---", body.slice(0, Math.max(800, max)));
    }
  }

  if (shouldInjectPrimaryStyle(env, options)) {
    const kernel = loadPrimaryStyleKernel(options, env);
    if (kernel.ok && kernel.text.trim()) {
      // Strip YAML frontmatter for inject; keep body, cap length for Guide budgets.
      const body = kernel.text.replace(/^---[\s\S]*?---\s*/m, "").trim();
      const max = Number(options.primaryStyleMaxChars || env.AGENT_JHN_PRIMARY_STYLE_MAX_CHARS || 4500);
      parts.push("", "--- PRIMARY STYLE KERNEL ---", body.slice(0, Math.max(800, max)));
    }
  }

  if (options.includeTopN !== false && shouldInjectCogentigramTopN(env, options)) {
    const loaded = loadPublicOpenCogentigram({ ...options, forceLoadOpenProfile: true }, env);
    if (loaded.ok && loaded.profile) {
      const n = Number(options.cogentigramTopN || env.AGENT_JHN_GUIDE_COGENTIGRAM_TOPN || 8);
      const compressed = compressCogentigramTopN(loaded.profile, { ...options, cogentigramTopN: n }, env);
      parts.push("", compressed.text);
    }
  }

  return parts.join("\n");
}

/**
 * Ordered system messages for WhatsApp synthesis:
 * channel policy → public-readonly AGENTS → agent_brief → primary style → KYS capsule → top-N.
 *
 * @returns {Array<{ role: string, content: string }>}
 */
export function buildWhatsAppRepresentationMessages(analysis = {}, options = {}, env = process.env) {
  const messages = [
    { role: "system", content: buildWhatsAppChannelPolicy(analysis, options) },
  ];
  const grant = buildKysGrantMetadata(options, env);
  const persona_id = resolvePersonaId(options, env);

  if (shouldInjectPublicReadonlyAgents(env, options)) {
    const publicAgents = loadPublicReadonlyAgents(options, env);
    if (publicAgents.ok && publicAgents.text.trim()) {
      messages.push({
        role: "system",
        content: buildPublicReadonlyAgentsSystemContent(publicAgents.text),
      });
    }
  }

  if (shouldInjectAgentBrief(env, options)) {
    const loaded = loadAgentBrief(options, env);
    if (loaded.ok && loaded.text.trim()) {
      messages.push({
        role: "system",
        content: buildAgentBriefSystemContent(loaded.text),
      });
    }
  }

  if (shouldInjectPersonStyle(env, options)) {
    const person = loadPersonStyle(options, env);
    if (person.ok && person.text.trim()) {
      messages.push({
        role: "system",
        content: buildPersonStyleSystemContent(person.text),
      });
    }
  }

  if (shouldInjectPrimaryStyle(env, options)) {
    const kernel = loadPrimaryStyleKernel(options, env);
    if (kernel.ok && kernel.text.trim()) {
      messages.push({
        role: "system",
        content: buildPrimaryStyleSystemContent(kernel.text, options, env),
      });
    }
  } else if (persona_id !== AGENT_JOHN_PRIMARY_PERSONA_ID) {
    messages.push({
      role: "system",
      content: [
        `Non-primary persona_id=${persona_id}: primary style kernel skipped.`,
        "Still no impersonation of the natural person; still corpus-grounded; still mandate limits.",
        "Persona may change register/form only — not invent positions or raise certainty (Ubikia).",
      ].join(" "),
    });
  }

  if (shouldInjectCogentigramCapsule(env, options)) {
    const capsule = loadCogentigramCapsule(options, env);
    if (capsule.ok && capsule.text.trim()) {
      messages.push({
        role: "system",
        content: [
          `Specialized KYS profile ${grant.kys_profile_id} (purpose: ${grant.purpose}).`,
          "Person-controlled disclosure: public answer fidelity only.",
          "Structural style only — not episodic memory, not court evidence, not clinical/HR truth.",
          "Canonical: cogentia/research/cogentigram_jhn_thinking_capsule.md",
          "Obey style priorities (definitional rigor, systemising, process priority, density); do not fake affective warmth.",
          "",
          capsule.text,
        ].join("\n"),
      });
    }
  }

  if (shouldInjectCogentigramTopN(env, options)) {
    if (options.cogentigramTopNText) {
      messages.push({
        role: "system",
        content: String(options.cogentigramTopNText),
      });
    } else {
      const loaded = loadPublicOpenCogentigram(options, env);
      if (loaded.ok && loaded.profile) {
        const compressed = compressCogentigramTopN(loaded.profile, options, env);
        messages.push({
          role: "system",
          content: compressed.text,
        });
      }
    }
  }

  return messages;
}

/**
 * Snapshot of KYS inject state for draft diagnostics.
 */
export function describeKysInjection(options = {}, env = process.env) {
  const grant = buildKysGrantMetadata(options, env);
  const open = shouldInjectCogentigramTopN(env, options)
    ? loadPublicOpenCogentigram(options, env)
    : { ok: false, source: "skipped" };
  let topN = null;
  if (open.ok && open.profile) {
    const compressed = compressCogentigramTopN(open.profile, options, env);
    topN = { n: compressed.n, top_names: compressed.top.map((item) => item.name) };
  }
  const style = loadPrimaryStyleKernel(options, env);
  const person = loadPersonStyle(options, env);
  return {
    ...grant,
    persona_id: resolvePersonaId(options, env),
    person_style: {
      injected: shouldInjectPersonStyle(env, options) && person.ok,
      source: person.source,
      path: person.path,
    },
    primary_style: {
      injected: shouldInjectPrimaryStyle(env, options) && style.ok,
      source: style.source,
      path: style.path,
    },
    open_profile_source: open.source || null,
    open_profile_path: open.path || null,
    structural_top_n: topN,
  };
}

/** Test helper: clear file caches. */
export function clearAgentBriefCache() {
  cache = null;
  publicAgentsCache = null;
  cogentigramCapsuleCache = null;
  cogentigramOpenCache = null;
  primaryStyleCache = null;
  personStyleCache = null;
}
