/**
 * smart-extractive-synthesizer.js — High-fidelity local extractive synthesis
 *
 * Extracts and ranks the most informative sentences from retrieved corpus chunks,
 * assembling a clean, coherent answer with deep-linked source citations.
 */

import { formatSourceMarkdownLink } from "./source-deep-links.js";

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9_]+/)
    .filter(t => t.length > 2);
}

function extractKeySentences(text, queryTokens) {
  if (!text || typeof text !== "string") return [];
  // Split into sentences
  const rawSentences = text
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-ß0-9«"'])/g)
    .map(s => s.trim().replace(/^[-*#\s>]+/, ""))
    .filter(s => s.length >= 25 && s.length <= 400);

  const querySet = new Set(queryTokens);
  const scored = [];

  for (const s of rawSentences) {
    if (s.startsWith("http") || s.includes("```") || s.includes("---")) continue;
    const tokens = tokenize(s);
    let matchCount = 0;
    for (const t of tokens) {
      if (querySet.has(t)) matchCount++;
    }
    // Boost sentences that define concepts or have strong informative density
    let boost = 0;
    if (/(?:est|sont|désigne|permet|repose|consiste|définit|is|means|refers to|stands for)/i.test(s)) boost += 1.5;
    if (/(?:commune|pilote|agriculteur|solaire|énergie|paquet|autonomie|corse|possibilis)/i.test(s)) boost += 1.0;

    const score = matchCount * 2.0 + boost;
    if (score > 0 || scored.length < 2) {
      scored.push({ text: s, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map(item => item.text);
}

export function synthesizeSmartExtractiveAnswer({
  question = "",
  excerpts = [],
  sources = [],
  locale = "fr",
}) {
  const isFr = String(locale || "fr").toLowerCase().startsWith("fr");
  const queryTokens = tokenize(question);

  const fidelityPreamble = isFr
    ? "Rappel de surface (lecture seule publique) : je ne suis pas Jean Hugues Noël Robert ; je m'appuie sur le corpus public, sans secrets ni données privées (y compris registre-mariani privé) ; je ne prends pas d'engagements légaux ou commerciaux."
    : "Surface reminder (public read-only): I am not Jean Hugues Noël Robert; I use the public corpus only — no secrets or private data (including private registre-mariani); I cannot make legal or commercial commitments.";

  // Collect best sentences across all excerpts
  const selectedSentences = [];
  const seenSentences = new Set();

  for (const excerpt of excerpts) {
    const rawText = typeof excerpt === "string" ? excerpt : excerpt?.text || "";
    const keySentences = extractKeySentences(rawText, queryTokens);
    for (const s of keySentences) {
      const normalized = s.toLowerCase().slice(0, 60);
      if (!seenSentences.has(normalized)) {
        seenSentences.add(normalized);
        selectedSentences.push(s);
        if (selectedSentences.length >= 4) break;
      }
    }
    if (selectedSentences.length >= 4) break;
  }

  // Build the synthesized narrative text
  const narrativeBlock = selectedSentences.length > 0
    ? selectedSentences.join(" ")
    : (isFr
        ? "Le corpus public contient plusieurs références documentaires vérifiables sur ce sujet :"
        : "The public corpus contains verifiable documentary references on this topic:");

  // Build formatted deep-linked citations
  const citationLines = [];
  const maxSources = Math.min(sources.length, 6);

  for (let i = 0; i < maxSources; i++) {
    const s = sources[i];
    const sourceId = s.source_id || s.id || `source-${i + 1}`;
    const title = s.title || s.path || sourceId;
    const link = formatSourceMarkdownLink(sourceId, title, s.github_url);
    citationLines.push(`${i + 1}. ${link}`);
  }

  const sections = [
    fidelityPreamble,
    narrativeBlock,
  ];

  if (citationLines.length > 0) {
    sections.push(isFr ? "Sources et preuves documentaires à consulter :" : "Sources and documentary evidence to inspect:");
    sections.push(citationLines.join("\n"));
  }

  return sections.join("\n\n");
}
