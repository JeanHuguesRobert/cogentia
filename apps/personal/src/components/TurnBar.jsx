import { useEffect, useState } from "react"
import { describePrompt, describeResponse, jumpToTurn } from "../lib/turns.js"

export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

function ClockLine({ line }) {
  if (!line) return null
  return (
    <p className="font-body text-xs text-dim" data-clock={line.key || line.label}>
      {line.label} le {line.absolute}
      {line.relative ? ` · ${line.relative}` : ""}
      {line.offset ? <span className="block text-muted mt-1" data-clock-offset="true">{line.offset}</span> : null}
    </p>
  )
}

export function TurnClocks({ turn, now }) {
  const prompt = describePrompt(turn?.prompt, now)
  const response = describeResponse(turn?.response, now)
  if (!prompt && response.length === 0) return null
  return (
    <div className="space-y-1 mb-4" data-turn-clocks="true">
      <ClockLine line={prompt && { ...prompt, key: prompt.label === "Prompt copié" ? "prompt-copied" : "prompt-produced" }} />
      {response.map((line) => <ClockLine key={line.key} line={line} />)}
    </div>
  )
}

export function TurnBar({ log, onJump }) {
  return (
    <div className="flex flex-wrap gap-2 mb-4" aria-label="Tours">
      {log.turns.map((turn) => (
        <button
          key={turn.number}
          type="button"
          aria-pressed={turn.number === log.cursor.turn}
          onClick={() => onJump(jumpToTurn(log, turn.number))}
          className={`px-3 py-1.5 rounded-lg border text-xs ${turn.number === log.cursor.turn ? "border-signal bg-signal/10 text-bright" : "border-border text-dim"}`}
        >
          Tour {turn.number}
        </button>
      ))}
    </div>
  )
}

export function StepNav({ onBack, backDisabled, onForward, forwardDisabled, forwardLabel }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        className="btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={backDisabled}
        onClick={onBack}
      >
        ← Retour
      </button>
      <button
        type="button"
        className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={forwardDisabled}
        onClick={onForward}
        data-forward="true"
      >
        {forwardLabel}
      </button>
    </div>
  )
}

export function forwardLabel(kind, target) {
  if (kind === "parse") return "Afficher mon miroir →"
  if (kind === "skip") return "Suite · passer l’interrogation →"
  if (kind === "paste") return "J’ai la réponse →"
  if (kind === "review") return "Suite →"
  if (kind === "next-turn") return `Suite · tour ${target.turn} →`
  return "Suite →"
}
