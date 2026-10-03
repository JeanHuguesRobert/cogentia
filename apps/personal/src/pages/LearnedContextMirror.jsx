import { useState } from 'react'
import {
  LearnedContextPasteForm,
  immediatePasteText,
} from '../components/AgentClaimMirror.js'
import { mirrorLearnedContext } from '../lib/learned-context-ingest.js'

export default function LearnedContextMirrorPage() {
  const [text, setText] = useState('')
  const [mirror, setMirror] = useState(null)
  const [pending, setPending] = useState(false)
  const [failure, setFailure] = useState(null)

  async function reveal(next = text) {
    setPending(true)
    setFailure(null)
    try {
      setMirror(await mirrorLearnedContext(next))
    } catch (error) {
      setMirror(null)
      setFailure(error instanceof Error ? error.message : 'Lecture impossible')
    } finally {
      setPending(false)
    }
  }

  return (
    <LearnedContextPasteForm
      text={text}
      onText={setText}
      onReveal={() => reveal(text)}
      onPaste={(event) => {
        const pasted = immediatePasteText(text, event.clipboardData?.getData('text') ?? '')
        if (!pasted) return
        event.preventDefault()
        setText(pasted)
        reveal(pasted)
      }}
      mirror={mirror}
      pending={pending}
      failure={failure}
    />
  )
}
