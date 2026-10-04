import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LearnedContextPasteForm,
  immediatePasteText,
} from '../components/AgentClaimMirror.js'
import { StepNav, TurnBar, TurnClocks, forwardLabel, useNow } from '../components/TurnBar.jsx'
import { mirrorLearnedContext } from '../lib/learned-context-ingest.js'
import { extractJson, normalizeSnapshot } from '../lib/kys-snapshot.js'
import {
  agentStampFromData,
  canGoBack,
  forwardIntent,
  goBack,
  goForward,
  loadBrowserTurnLog,
  recordParsedResponse,
  saveBrowserTurnLog,
  updateResponseText,
} from '../lib/turns.js'

export default function LearnedContextMirrorPage() {
  const navigate = useNavigate()
  const now = useNow()
  const [log, setLog] = useState(() => loadBrowserTurnLog())
  const [pending, setPending] = useState(false)
  const [failure, setFailure] = useState(null)
  const [mirror, setMirror] = useState(null)
  const turn = log.turns.find((item) => item.number === log.cursor.turn) || log.turns[0]
  const [text, setText] = useState(turn.response.text || '')
  const view = { ...log, cursor: { turn: turn.number, step: 2 } }
  const intent = forwardIntent(view)

  useEffect(() => {
    saveBrowserTurnLog(log)
  }, [log])

  async function reveal(next = text) {
    setPending(true)
    setFailure(null)
    try {
      const model = await mirrorLearnedContext(next)
      setMirror(model)
      let snapshot = null
      let agentStamp = null
      try {
        const data = extractJson(next)
        agentStamp = agentStampFromData(data)
        snapshot = normalizeSnapshot(data, turn.provider)
      } catch {
        snapshot = null
      }
      setLog((current) => {
        const active = current.turns.find((item) => item.number === turn.number) || current.turns[0]
        return recordParsedResponse(current, active.number, {
          text: next,
          pastedAt: new Date().toISOString(),
          agentStamp,
          snapshot,
          keepReviews: Boolean(active.snapshot) && active.response.parsed_text === next,
          advance: false,
        })
      })
    } catch (error) {
      setMirror(null)
      setFailure(error instanceof Error ? error.message : 'Lecture impossible')
    } finally {
      setPending(false)
    }
  }

  useEffect(() => {
    if (text.trim()) reveal(text)
    // The stored reply is shown again when this page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onText(value) {
    setText(value)
    setLog((current) => updateResponseText(current, turn.number, value))
  }

  function onBack() {
    saveBrowserTurnLog(goBack(view))
    navigate('/snapshot')
  }

  async function onForward() {
    if (intent.kind === 'parse' || intent.kind === 'none') {
      await reveal(text)
      return
    }
    saveBrowserTurnLog(goForward(view))
    navigate('/snapshot')
  }

  return (
    <div data-turn={turn.number} data-step="2">
      <div className="max-w-3xl mx-auto px-4 pt-10">
        <TurnBar log={log} onJump={(next) => {
          saveBrowserTurnLog(next)
          navigate('/snapshot')
        }} />
        <p className="font-mono text-signal text-xs tracking-widest uppercase mb-3">Tour {turn.number} · réponse</p>
        <TurnClocks turn={turn} now={now} />
      </div>
      <LearnedContextPasteForm
        text={text}
        onText={onText}
        onReveal={() => reveal(text)}
        onPaste={(event) => {
          const pasted = immediatePasteText(text, event.clipboardData?.getData('text') ?? '')
          if (!pasted) return
          event.preventDefault()
          onText(pasted)
          reveal(pasted)
        }}
        mirror={mirror}
        pending={pending}
        failure={failure}
      />
      <div className="max-w-3xl mx-auto px-4 pb-10">
        <StepNav
          onBack={onBack}
          backDisabled={!canGoBack(view)}
          onForward={onForward}
          forwardDisabled={false}
          forwardLabel={intent.kind === 'review' || intent.kind === 'skip' ? forwardLabel(intent.kind, intent.target) : 'Afficher le miroir →'}
        />
      </div>
    </div>
  )
}
