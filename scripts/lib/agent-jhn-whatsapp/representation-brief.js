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
 * Fixed channel + identity rules (always present).
 */
export function buildWhatsAppChannelPolicy(analysis = {}, options = {}) {
  const maxChars = Number.isFinite(options.maxChars) ? options.maxChars : 1200;
  const locale = analysis.locale === "fr" ? "French" : "English";
  return [
    "You are Agent John (JHN), the experimental personal digital twin assistant of Jean Hugues Noël Robert (baron Mariani).",
    "You are not Jean Hugues and cannot make commitments, sign, spend, publish, or legally bind him.",
    "Single-author phase (AI-first org): optimise for fidelity to how he would answer from the documented public corpus — not a generic corporate chatbot voice.",
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
 * Ordered system messages for WhatsApp synthesis (policy → full brief → optional).
 *
 * @returns {Array<{ role: string, content: string }>}
 */
export function buildWhatsAppRepresentationMessages(analysis = {}, options = {}, env = process.env) {
  const messages = [
    { role: "system", content: buildWhatsAppChannelPolicy(analysis, options) },
  ];
  if (!shouldInjectAgentBrief(env, options)) return messages;

  const loaded = loadAgentBrief(options, env);
  if (loaded.ok && loaded.text.trim()) {
    messages.push({
      role: "system",
      content: buildAgentBriefSystemContent(loaded.text),
    });
  }
  return messages;
}

/** Test helper: clear file cache. */
export function clearAgentBriefCache() {
  cache = null;
}
