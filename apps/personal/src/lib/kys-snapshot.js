import { agentStampFromData } from "./turns.js"

const CATEGORY_KEYS = ["known", "inferred", "recurring_topics", "working_style", "unknowns"]

export function extractJson(text) {
  const trimmed = String(text ?? "").trim()
  if (!trimmed) throw new Error("Collez d’abord la réponse de votre agent.")

  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")

  try {
    return JSON.parse(withoutFence)
  } catch {
    // Continue with the first balanced object.
  }

  const start = trimmed.indexOf("{")
  if (start === -1) throw new Error("Aucun objet JSON détecté dans la réponse.")

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < trimmed.length; index += 1) {
    const char = trimmed[index]
    if (inString) {
      if (escaped) escaped = false
      else if (char === "\\") escaped = true
      else if (char === "\"") inString = false
      continue
    }
    if (char === "\"") inString = true
    else if (char === "{") depth += 1
    else if (char === "}") {
      depth -= 1
      if (depth === 0) return JSON.parse(trimmed.slice(start, index + 1))
    }
  }

  throw new Error("Le JSON semble incomplet. Vérifiez que la réponse a été copiée en entier.")
}

function normalizeClaim(item, index, category) {
  if (typeof item === "string") {
    return { id: `${category}-${index}`, claim: item, basis: "", confidence: "low" }
  }
  return {
    id: item?.id || `${category}-${index}`,
    claim: String(item?.claim || item?.text || "").trim(),
    basis: String(item?.basis || item?.evidence || "").trim(),
    confidence: ["high", "medium", "low"].includes(item?.confidence) ? item.confidence : "low",
  }
}

export function normalizeSnapshot(data, provider) {
  const normalized = {
    snapshot_version: data?.snapshot_version || "kys-snapshot-0.1",
    answered_at: agentStampFromData(data) || "",
    agent: {
      provider: data?.agent?.provider || provider,
      model: data?.agent?.model || "",
      context_scope: data?.agent?.context_scope || "",
    },
    relationship_summary: String(data?.relationship_summary || "").trim(),
  }

  CATEGORY_KEYS.forEach((key) => {
    normalized[key] = Array.isArray(data?.[key])
      ? data[key].map((item, index) => normalizeClaim(item, index, key)).filter((item) => item.claim)
      : []
  })

  const count = CATEGORY_KEYS.reduce((sum, key) => sum + normalized[key].length, 0)
  if (count === 0) throw new Error("Le JSON ne contient aucune affirmation exploitable.")
  return normalized
}
