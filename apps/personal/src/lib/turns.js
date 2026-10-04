import { verdictToStance } from "../../../../scripts/lib/agent-acquired-context-review.js"
import { clearContinuityStorage, ENROLMENT_PREFS_KEY } from "../../../../scripts/lib/progressive-enrolment.js"

export const TURN_LOG_KEY = "kys_turn_log_v1"
export const DRAFT_KEY = "kys_snapshot_draft_v1"

const STAMP_KEYS = ["answered_at", "stamped_at", "generated_at", "timestamp"]
const STAMP_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]
const CATEGORY_KEYS = ["known", "inferred", "recurring_topics", "working_style", "unknowns"]

function emptyTurn(number, role, nowIso) {
  return {
    number,
    provider: "ChatGPT",
    prompt: {
      role,
      text: "",
      produced_at: nowIso,
      copied_at: null,
      copied_text: "",
    },
    response: {
      text: "",
      pasted_at: null,
      agent_stamped_at: null,
      parsed_text: "",
      for_prompt: null,
    },
    snapshot: null,
    reviews: {},
    correction_offered: false,
  }
}

export function emptyLog(nowIso) {
  return {
    schema_version: "kys-turn-log.v0",
    cursor: { turn: 1, step: 1 },
    turns: [emptyTurn(1, "initial", nowIso)],
  }
}

export function turnOf(log, number = log?.cursor?.turn) {
  return log?.turns?.find((turn) => turn.number === number) || null
}

function mapTurn(log, number, mapper) {
  return {
    ...log,
    turns: log.turns.map((turn) => (turn.number === number ? mapper(turn) : turn)),
  }
}

export function setCursor(log, turn, step) {
  return { ...log, cursor: { turn, step } }
}

function claimKey(category, claim) {
  return `${category}\n${String(claim || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("fr")}`
}

function reviewsByClaim(reviews, snapshot) {
  const byKey = new Map()
  if (!snapshot || !reviews) return byKey
  for (const category of CATEGORY_KEYS) {
    for (const item of snapshot[category] || []) {
      if (!item?.id || !reviews[item.id] || byKey.has(claimKey(category, item.claim))) continue
      byKey.set(claimKey(category, item.claim), reviews[item.id])
    }
  }
  return byKey
}

function carryReviews(sources, nextSnapshot) {
  const byKey = new Map()
  for (const source of sources) {
    if (!source) continue
    for (const [key, review] of reviewsByClaim(source.reviews, source.snapshot)) {
      if (!byKey.has(key)) byKey.set(key, review)
    }
  }
  const next = {}
  if (!nextSnapshot) return next
  for (const category of CATEGORY_KEYS) {
    for (const item of nextSnapshot[category] || []) {
      if (!item?.id) continue
      const review = byKey.get(claimKey(category, item.claim))
      if (review) next[item.id] = { ...review }
    }
  }
  return next
}

export function replyIsCurrent(turn) {
  if (!turn?.snapshot || turn.response.text !== turn.response.parsed_text) return false
  if (turn.response.for_prompt == null) return true
  return turn.response.for_prompt === (turn.prompt?.text || "")
}

export function replyIsStale(turn) {
  return Boolean(turn?.snapshot)
    && turn.response.text === turn.response.parsed_text
    && turn.response.text.trim() !== ""
    && turn.response.for_prompt != null
    && turn.response.for_prompt !== (turn.prompt?.text || "")
}

function furthestStep(turn) {
  if (replyIsCurrent(turn)) return 3
  if (turn.response.text.trim()) return 2
  return 1
}

function sanitize(log, nowIso) {
  if (!log || log.schema_version !== "kys-turn-log.v0" || !Array.isArray(log.turns) || log.turns.length === 0) {
    return emptyLog(nowIso)
  }
  const cursorTurn = turnOf(log) || log.turns[0]
  let step = log.cursor?.step
  if (step !== 1 && step !== 2 && step !== 3) step = furthestStep(cursorTurn)
  if (step === 3 && !cursorTurn.snapshot) step = cursorTurn.response.text.trim() ? 2 : 1
  return setCursor(log, cursorTurn.number, step)
}

export function loadTurnLog(storage, nowIso) {
  try {
    const saved = JSON.parse(storage.getItem(TURN_LOG_KEY) || "null")
    if (saved) return sanitize(saved, nowIso)
  } catch {
    // A broken local log starts a fresh tour.
  }
  const log = emptyLog(nowIso)
  try {
    const draft = JSON.parse(storage.getItem(DRAFT_KEY) || "null")
    if (draft?.snapshot) {
      log.turns[0].snapshot = draft.snapshot
      log.turns[0].reviews = draft.reviews || {}
      log.turns[0].response.parsed_text = ""
      return setCursor(log, 1, 3)
    }
  } catch {
    // The older draft is optional.
  }
  return log
}

export function saveTurnLog(storage, log) {
  storage.setItem(TURN_LOG_KEY, JSON.stringify(log))
  const latest = [...log.turns].reverse().find((turn) => turn.snapshot)
  if (latest) {
    storage.setItem(DRAFT_KEY, JSON.stringify({ snapshot: latest.snapshot, reviews: latest.reviews || {} }))
  }
}

export function loadBrowserTurnLog() {
  return loadTurnLog(window.localStorage, new Date().toISOString())
}

export function saveBrowserTurnLog(log) {
  saveTurnLog(window.localStorage, log)
}

export function loadBrowserEnrolmentPreferences() {
  try {
    return JSON.parse(window.localStorage.getItem(ENROLMENT_PREFS_KEY) || "{}") || {}
  } catch {
    return {}
  }
}

export function saveBrowserEnrolmentPreferences(prefs) {
  try {
    window.localStorage.setItem(ENROLMENT_PREFS_KEY, JSON.stringify(prefs || {}))
  } catch {}
}

export function purgeBrowserContinuityData() {
  clearContinuityStorage(window.localStorage)
}

export function agentStampFromData(data) {
  if (!data || typeof data !== "object") return null
  for (const key of STAMP_KEYS) {
    if (typeof data[key] === "string" && data[key].trim()) return data[key].trim()
  }
  return null
}

export function parseStamp(value) {
  const match = STAMP_RE.exec(String(value ?? "").trim())
  if (!match) return null
  const parts = {
    y: Number(match[1]),
    mo: Number(match[2]),
    d: Number(match[3]),
    h: Number(match[4]),
    mi: Number(match[5]),
    s: Number(match[6] || 0),
  }
  if (parts.mo < 1 || parts.mo > 12 || parts.h > 23 || parts.mi > 59 || parts.s > 60) return null
  const zone = match[7]
  if (!zone) return { ...parts, offsetMinutes: null, instant: null }
  let offsetMinutes = 0
  if (zone !== "Z") {
    const z = /^([+-])(\d{2}):?(\d{2})$/.exec(zone)
    if (!z) return null
    offsetMinutes = (z[1] === "-" ? -1 : 1) * (Number(z[2]) * 60 + Number(z[3]))
  }
  const instant = Date.UTC(parts.y, parts.mo - 1, parts.d, parts.h, parts.mi, parts.s) - offsetMinutes * 60000
  return { ...parts, offsetMinutes, instant }
}

export function formatClockFace(parts) {
  const hh = String(parts.h).padStart(2, "0")
  const mm = String(parts.mi).padStart(2, "0")
  return `${parts.d} ${MONTHS[parts.mo - 1]} ${parts.y}, ${hh}:${mm}`
}

export function formatDual(iso, now) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const absolute = new Intl.DateTimeFormat("fr", { dateStyle: "medium", timeStyle: "short" }).format(date)
  const relative = formatRelative(date, now instanceof Date ? now : new Date(now))
  return { absolute, relative }
}

function formatRelative(date, now) {
  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" })
  const delta = date.getTime() - now.getTime()
  const abs = Math.abs(delta)
  const units = [
    ["year", 365 * 24 * 3600e3],
    ["month", 30 * 24 * 3600e3],
    ["week", 7 * 24 * 3600e3],
    ["day", 24 * 3600e3],
    ["hour", 3600e3],
    ["minute", 60e3],
    ["second", 1e3],
  ]
  for (const [unit, size] of units) {
    if (abs >= size || unit === "second") return rtf.format(Math.round(delta / size), unit)
  }
  return rtf.format(0, "second")
}

export function relateClocks(stamp, localIso, zoneOffsetMinutes = null) {
  const parsed = parseStamp(stamp)
  const local = new Date(localIso)
  if (!parsed || Number.isNaN(local.getTime())) return { kind: "absent" }
  const here = zoneOffsetMinutes == null ? -local.getTimezoneOffset() : zoneOffsetMinutes
  if (parsed.offsetMinutes != null) {
    return {
      kind: "indicated",
      shiftMinutes: parsed.offsetMinutes - here,
      instant: new Date(parsed.instant).toISOString(),
    }
  }
  const agentClock = Date.UTC(parsed.y, parsed.mo - 1, parsed.d, parsed.h, parsed.mi, parsed.s)
  const localClock = Date.UTC(
    local.getFullYear(),
    local.getMonth(),
    local.getDate(),
    local.getHours(),
    local.getMinutes(),
    local.getSeconds(),
  )
  const deltaMin = Math.round((agentClock - localClock) / 60000)
  const shiftHours = Math.round(deltaMin / 60)
  const residual = deltaMin - shiftHours * 60
  if (shiftHours === 0) {
    const asLocal = new Date(parsed.y, parsed.mo - 1, parsed.d, parsed.h, parsed.mi, parsed.s)
    return { kind: "same-zone", shiftMinutes: 0, instant: asLocal.toISOString() }
  }
  if (Math.abs(residual) < 10) {
    return {
      kind: "estimated",
      shiftMinutes: shiftHours * 60,
      residualMinutes: residual,
      instant: new Date(local.getTime() + residual * 60000).toISOString(),
    }
  }
  return { kind: "uncompared", clock: parsed }
}

function magnitude(minutes) {
  const abs = Math.abs(minutes)
  const hours = Math.floor(abs / 60)
  const mins = abs % 60
  const parts = []
  if (hours) parts.push(`${hours} heure${hours > 1 ? "s" : ""}`)
  if (mins) parts.push(`${mins} minute${mins > 1 ? "s" : ""}`)
  return parts.join(" ") || "0 minute"
}

export function offsetSentence(relation) {
  if (!relation || relation.kind === "absent") return ""
  if (relation.kind === "indicated") {
    if (relation.shiftMinutes === 0) return "Même fuseau que cette page."
    const direction = relation.shiftMinutes > 0 ? "en avance de" : "en retard de"
    return `Décalage indiqué : l'agent est ${direction} ${magnitude(relation.shiftMinutes)} sur cette page.`
  }
  if (relation.kind === "same-zone") return "Pas de décalage d'heure détecté. Les minutes restent comparables."
  if (relation.kind === "estimated") {
    const direction = relation.shiftMinutes > 0 ? "en avance de" : "en retard de"
    const residual = Math.abs(relation.residualMinutes)
    const minutes = residual === 0
      ? "Les minutes concordent."
      : `Les minutes concordent à ${residual} minute${residual > 1 ? "s" : ""} près.`
    return `Décalage estimé : l'agent est ${direction} ${magnitude(relation.shiftMinutes)}. ${minutes}`
  }
  return "Pas de décalage horaire indiqué. L'heure affichée est celle écrite par l'agent."
}

export function describePrompt(prompt, now) {
  if (!prompt) return null
  const copied = Boolean(prompt.copied_at) && (prompt.copied_text || "") === (prompt.text || "")
  const at = copied ? prompt.copied_at : prompt.produced_at
  if (!at) return null
  const dual = formatDual(at, now)
  if (!dual) return null
  return { label: copied ? "Prompt copié" : "Prompt produit", ...dual }
}

export function describeResponse(response, now, zoneOffsetMinutes = null) {
  if (!response) return []
  const lines = []
  if (response.agent_stamped_at) {
    const relation = relateClocks(response.agent_stamped_at, response.pasted_at || now.toISOString(), zoneOffsetMinutes)
    if (relation.instant) {
      const dual = formatDual(relation.instant, now)
      lines.push({
        key: "agent",
        label: "Réponse de l'agent",
        absolute: dual?.absolute || "",
        relative: dual?.relative || "",
        offset: offsetSentence(relation),
      })
    } else if (relation.kind === "uncompared") {
      lines.push({
        key: "agent",
        label: "Réponse de l'agent",
        absolute: formatClockFace(relation.clock),
        relative: "",
        offset: offsetSentence(relation),
      })
    }
  }
  if (response.pasted_at) {
    const dual = formatDual(response.pasted_at, now)
    if (dual) lines.push({ key: "pasted", label: "Réponse collée", ...dual, offset: "" })
  }
  return lines
}

export function updatePromptText(log, number, text, at) {
  return mapTurn(log, number, (turn) => {
    if (turn.prompt.text === text) return turn
    return {
      ...turn,
      prompt: {
        ...turn.prompt,
        text,
        produced_at: at,
        copied_at: turn.prompt.copied_text === text ? turn.prompt.copied_at : null,
      },
    }
  })
}

export function setTurnProvider(log, number, provider, text, at) {
  return updatePromptText(
    mapTurn(log, number, (turn) => ({ ...turn, provider })),
    number,
    text,
    at,
  )
}

export function recordPromptCopy(log, number, text, at) {
  return mapTurn(log, number, (turn) => ({
    ...turn,
    prompt: {
      ...turn.prompt,
      text,
      copied_text: text,
      copied_at: at,
      produced_at: turn.prompt.produced_at || at,
    },
  }))
}

export function markCorrectionOffered(log, number) {
  return mapTurn(log, number, (turn) => ({ ...turn, correction_offered: true }))
}

export function reviseNextPrompt(log, after, text, at) {
  const existing = turnOf(log, after + 1)
  if (!existing || existing.prompt.text === text) return log
  return mapTurn(log, after + 1, (turn) => ({
    ...turn,
    prompt: {
      ...turn.prompt,
      text,
      produced_at: at,
    },
  }))
}

export function leaveMirror(log) {
  if (log.cursor?.step === 2) return goBack(log)
  return log
}

export function ensureNextTurn(log, { after, text, producedAt, copiedAt }) {
  const number = after + 1
  const provider = turnOf(log, after)?.provider || "ChatGPT"
  const existing = turnOf(log, number)
  if (!existing) {
    const created = emptyTurn(number, "correction", producedAt)
    created.provider = provider
    created.prompt = {
      role: "correction",
      text,
      produced_at: producedAt,
      copied_at: copiedAt,
      copied_text: text,
    }
    return { ...log, turns: [...log.turns, created] }
  }
  return mapTurn(log, number, (turn) => ({
    ...turn,
    provider,
    prompt: {
      ...turn.prompt,
      role: "correction",
      text,
      produced_at: turn.prompt.text === text ? turn.prompt.produced_at : producedAt,
      copied_at: copiedAt,
      copied_text: text,
    },
  }))
}

export function updateResponseText(log, number, text) {
  return mapTurn(log, number, (turn) => ({
    ...turn,
    response: { ...turn.response, text },
  }))
}

export function recordParsedResponse(log, number, { text, pastedAt, agentStamp, snapshot, keepReviews, advance }) {
  const next = mapTurn(log, number, (turn) => {
    const previous = turnOf(log, number - 1)
    const reviews = snapshot && !keepReviews
      ? carryReviews([
        { reviews: turn.reviews, snapshot: turn.snapshot },
        previous ? { reviews: previous.reviews, snapshot: previous.snapshot } : null,
      ], snapshot)
      : turn.reviews
    return {
      ...turn,
      response: {
        text,
        pasted_at: turn.response.text === text && turn.response.pasted_at ? turn.response.pasted_at : pastedAt,
        agent_stamped_at: agentStamp || null,
        parsed_text: snapshot ? text : turn.response.parsed_text,
        for_prompt: snapshot ? (turn.prompt.text || "") : turn.response.for_prompt,
      },
      snapshot: snapshot || turn.snapshot,
      reviews,
    }
  })
  if (!advance || !snapshot) return next
  return setCursor(next, number, 3)
}

export function updateTurnReview(log, number, id, patch, captureId = null) {
  return mapTurn(log, number, (turn) => {
    if (patch === null) {
      const nextReviews = { ...turn.reviews }
      delete nextReviews[id]
      return { ...turn, reviews: nextReviews }
    }
    const current = turn.reviews?.[id] || {}
    const updated = { ...current, ...patch }
    if (captureId) {
      updated.capture_id = captureId
      updated.item_id = id
      if (!updated.stance && updated.verdict) {
        updated.stance = verdictToStance(updated.verdict)
      }
      if (!updated.annotated_at) {
        updated.annotated_at = new Date().toISOString()
      }
    }
    return {
      ...turn,
      reviews: {
        ...turn.reviews,
        [id]: updated,
      },
    }
  })
}

export function forwardIntent(log) {
  const step = log.cursor.step
  const current = turnOf(log)
  if (!current) return { kind: "none", target: null }
  if (step === 2 && (replyIsStale(current) || !current.snapshot || current.response.text !== current.response.parsed_text)) {
    return { kind: "parse", target: null }
  }
  if (step === 1) {
    if (replyIsCurrent(current)) return { kind: "skip", target: { turn: current.number, step: 3 } }
    if (replyIsStale(current)) return { kind: "stale", target: { turn: current.number, step: 2 } }
    return { kind: "paste", target: { turn: current.number, step: 2 } }
  }
  if (step === 2 && current.snapshot) {
    return { kind: "review", target: { turn: current.number, step: 3 } }
  }
  const next = turnOf(log, current.number + 1)
  if (!next) return { kind: "none", target: null }
  if (replyIsStale(next)) return { kind: "stale", target: { turn: next.number, step: 2 } }
  if (replyIsCurrent(next)) return { kind: "skip", target: { turn: next.number, step: 3 } }
  if (next.response.text.trim()) return { kind: "pasted", target: { turn: next.number, step: 2 } }
  return { kind: "next-turn", target: { turn: next.number, step: 1 } }
}

export function goForward(log) {
  const intent = forwardIntent(log)
  if (!intent.target) return log
  return setCursor(log, intent.target.turn, intent.target.step)
}

export function canGoBack(log) {
  return log.cursor.turn > 1 || log.cursor.step > 1
}

export function goBack(log) {
  const { turn, step } = log.cursor
  if (step > 1) return setCursor(log, turn, step - 1)
  if (turn > 1) return setCursor(log, turn - 1, 3)
  return log
}

export function jumpToTurn(log, number) {
  const turn = turnOf(log, number)
  if (!turn) return log
  return setCursor(log, number, furthestStep(turn))
}
