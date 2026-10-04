import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { extractJson, normalizeSnapshot } from '../lib/kys-snapshot.js'
import {
  agentStampFromData,
  canGoBack,
  ensureNextTurn,
  forwardIntent,
  goBack,
  goForward,
  loadBrowserTurnLog,
  markCorrectionOffered,
  recordParsedResponse,
  recordPromptCopy,
  saveBrowserTurnLog,
  setTurnProvider,
  updatePromptText,
  updateResponseText,
  updateTurnReview,
} from '../lib/turns.js'
import { StepNav, TurnBar, TurnClocks, forwardLabel, useNow } from '../components/TurnBar.jsx'

const PROVIDERS = ['ChatGPT', 'Claude', 'Gemini', 'Mistral', 'Grok', 'Autre agent']

const CATEGORIES = [
  { key: 'known', title: 'Ce que votre agent pense savoir', description: 'Éléments explicites ou très régulièrement confirmés.' },
  { key: 'inferred', title: 'Ce qu’il suppose', description: 'Inférences prudentes qui demandent votre validation.' },
  { key: 'recurring_topics', title: 'Vos sujets récurrents', description: 'Thèmes et projets souvent présents dans vos échanges.' },
  { key: 'working_style', title: 'Votre manière de travailler ensemble', description: 'Préférences de forme, de profondeur, de contradiction et de délégation.' },
  { key: 'unknowns', title: 'Ce qu’il ne sait pas', description: 'Limites reconnues, contexte absent ou informations inaccessibles.' },
]

const VERDICTS = [
  { id: 'accepted', label: 'Oui, c’est moi' },
  { id: 'nuanced', label: 'À nuancer' },
  { id: 'rejected', label: 'Non, pas du tout' },
  { id: 'private', label: 'Ne pas conserver' },
]

function buildPrompt(provider) {
  return `Tu es ${provider}. Produis un instantané KYS de ce que tu crois savoir de moi à partir du contexte auquel tu as réellement accès dans cette conversation, ta mémoire éventuelle et notre historique disponible.

But : rendre ta représentation visible et contestable. Il ne s’agit ni d’un diagnostic, ni d’un test psychométrique, ni d’une vérité sur ma personne.

Règles :
- Réponds uniquement avec un objet JSON valide, sans bloc Markdown ni commentaire extérieur.
- N’invente rien. Une absence d’information vaut mieux qu’une hypothèse séduisante.
- Sépare ce que tu sais, ce que tu infères et ce que tu ignores.
- Pour chaque affirmation, indique brièvement sa base et un niveau de confiance : high, medium ou low.
- Évite les données directement identifiantes et les catégories sensibles.
- N’infère aucun diagnostic, trouble, état de santé, orientation, religion, origine ou opinion politique.
- Maximum 5 éléments par catégorie.
- Écris en français clair, neutre et non clinique.
- Indique answered_at : la date et l'heure de ta réponse, en ISO 8601 avec le décalage horaire numérique.

Schéma attendu :
{
  "snapshot_version": "kys-snapshot-0.1",
  "answered_at": "2026-10-04T15:04:00+02:00",
  "agent": {
    "provider": "${provider}",
    "model": "",
    "context_scope": "Décris brièvement le contexte réellement accessible"
  },
  "relationship_summary": "Résumé de notre manière de travailler ensemble en 2 ou 3 phrases",
  "known": [
    { "claim": "", "basis": "", "confidence": "high" }
  ],
  "inferred": [
    { "claim": "", "basis": "", "confidence": "medium" }
  ],
  "recurring_topics": [
    { "claim": "", "basis": "", "confidence": "high" }
  ],
  "working_style": [
    { "claim": "", "basis": "", "confidence": "medium" }
  ],
  "unknowns": [
    { "claim": "", "basis": "Pourquoi cette information manque", "confidence": "high" }
  ]
}`
}

function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
  return Promise.resolve()
}

function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function confidenceLabel(value) {
  if (value === 'high') return 'confiance haute'
  if (value === 'medium') return 'confiance moyenne'
  return 'confiance faible'
}

export default function Snapshot() {
  const now = useNow()
  const [log, setLog] = useState(() => loadBrowserTurnLog())
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const turn = log.turns.find((item) => item.number === log.cursor.turn) || log.turns[0]
  const step = log.cursor.step
  const provider = turn.provider || PROVIDERS[0]
  const snapshot = turn.snapshot
  const reviews = turn.reviews || {}
  const intent = forwardIntent(log)

  useEffect(() => {
    saveBrowserTurnLog(log)
  }, [log])

  useEffect(() => {
    if (turn.prompt.role !== 'initial') return
    const text = buildPrompt(turn.provider || PROVIDERS[0])
    if (turn.prompt.text === text) return
    setLog((current) => updatePromptText(current, turn.number, text, new Date().toISOString()))
  }, [turn])

  const prompt = useMemo(() => buildPrompt(provider), [provider])

  const items = useMemo(() => {
    if (!snapshot) return []
    return CATEGORIES.flatMap(({ key, title }) =>
      snapshot[key].map((claim) => ({ ...claim, category: key, categoryTitle: title }))
    )
  }, [snapshot])

  const reviewedCount = items.filter((item) => reviews[item.id]?.verdict).length

  const correctionPrompt = useMemo(() => {
    if (!snapshot) return ''

    const groups = {
      accepted: [],
      nuanced: [],
      rejected: [],
      private: [],
    }

    items.forEach((item) => {
      const review = reviews[item.id]
      if (!review?.verdict) return
      const note = review.note?.trim() ? ` — précision : ${review.note.trim()}` : ''
      groups[review.verdict].push(`- ${item.claim}${note}`)
    })

    return `Vous avez produit un instantané KYS de ce que vous croyiez savoir de moi. Voici mon examen humain de cette représentation.

CONFIRMÉ
${groups.accepted.join('\n') || '- Aucun élément explicitement confirmé.'}

À NUANCER
${groups.nuanced.join('\n') || '- Aucun élément à nuancer.'}

REJETÉ
${groups.rejected.join('\n') || '- Aucun élément explicitement rejeté.'}

À NE PAS CONSERVER NI RÉUTILISER
${groups.private.join('\n') || '- Aucun élément signalé.'}

Produisez maintenant une version corrigée en JSON valide.
- Distinguez explicitement ce que vous savez, ce que vous inférez et ce que vous ignorez.
- Ne réintroduisez pas les éléments rejetés.
- Ne conservez ni ne réutilisez les éléments signalés comme privés.
- Intégrez mes nuances sans les transformer en conclusions plus générales.
- Rappelez les limites du contexte auquel vous avez accès.
- Indiquez answered_at, l'heure de votre réponse en ISO 8601 avec le décalage horaire, par exemple 2026-10-04T15:04:00+02:00.
- Cette représentation reste un instantané contestable, non un diagnostic ni une définition de ma personne.`
  }, [items, reviews, snapshot])

  const nextTurn = log.turns.find((item) => item.number === turn.number + 1)
  const correctionOffered = Boolean(turn.correction_offered) && nextTurn?.prompt.copied_text === correctionPrompt

  const setCorrectionOffered = (value) => {
    if (value !== true) return
    const at = new Date().toISOString()
    setLog((current) => ensureNextTurn(markCorrectionOffered(current, turn.number), {
      after: turn.number,
      text: correctionPrompt,
      producedAt: at,
      copiedAt: at,
    }))
  }

  const handleCopy = async (text, label) => {
    if (label === 'correction') setCorrectionOffered(true)
    if (label === 'prompt') {
      setLog((current) => recordPromptCopy(current, turn.number, text, new Date().toISOString()))
    }
    try {
      await copyText(text)
      setCopied(label)
      window.setTimeout(() => setCopied(''), 1600)
    } catch {
      setCopied('')
    }
  }

  const handleParse = () => {
    try {
      const data = extractJson(turn.response.text)
      const parsed = normalizeSnapshot(data, provider)
      const keepReviews = Boolean(turn.snapshot) && turn.response.parsed_text === turn.response.text
      setError('')
      setLog((current) => recordParsedResponse(current, turn.number, {
        text: turn.response.text,
        pastedAt: new Date().toISOString(),
        agentStamp: agentStampFromData(data),
        snapshot: parsed,
        keepReviews,
        advance: true,
      }))
    } catch (parseError) {
      setError(parseError.message || 'Réponse impossible à analyser.')
    }
  }

  const updateReview = (id, patch) => {
    setLog((current) => updateTurnReview(current, turn.number, id, patch))
  }

  const onBack = () => setLog((current) => goBack(current))

  const onForward = () => {
    if (forwardIntent(log).kind === 'parse') {
      handleParse()
      return
    }
    setLog((current) => goForward(current))
  }

  const chooseProvider = (name) => {
    setLog((current) => setTurnProvider(current, turn.number, name, buildPrompt(name), new Date().toISOString()))
  }

  const exportSnapshot = () => {
    const reviewedClaims = items.map((item) => ({
      category: item.category,
      claim: item.claim,
      basis: item.basis,
      confidence: item.confidence,
      user_verdict: reviews[item.id]?.verdict || 'unreviewed',
      user_note: reviews[item.id]?.note || '',
    }))

    downloadJson(`kys-snapshot-${new Date().toISOString().slice(0, 10)}.json`, {
      kind: 'kys_snapshot',
      status: 'personal_draft',
      privai_certified_profile: false,
      created_at: new Date().toISOString(),
      agent: snapshot.agent,
      relationship_summary: snapshot.relationship_summary,
      claims: reviewedClaims,
    })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-20 animate-slide-up">
      <div className="mb-10">
        <p className="font-mono text-signal text-xs tracking-widest uppercase mb-4">KYS Snapshot · miroir agentique personnel</p>
        <h1 className="font-display text-3xl md:text-5xl font-bold text-bright mb-4">
          Que croit savoir votre IA sur vous ?
        </h1>
        <p className="font-body text-dim max-w-2xl leading-relaxed">
          Interrogez votre agent habituel, examinez chacune de ses affirmations, puis corrigez sa représentation. Rien n’est envoyé à Cogentia dans ce parcours. Les tours restent dans ce navigateur.
        </p>
      </div>

      <div className="mb-8" data-turn={turn.number} data-step={step}>
        <TurnBar log={log} onJump={setLog} />
        <p className="font-mono text-signal text-xs tracking-widest uppercase mb-3">Tour {turn.number} · étape {step}</p>
        <TurnClocks turn={turn} now={now} />
        <StepNav
          onBack={onBack}
          backDisabled={!canGoBack(log)}
          onForward={onForward}
          forwardDisabled={intent.kind === 'none'}
          forwardLabel={forwardLabel(intent.kind, intent.target)}
        />
      </div>

      <div className="flex gap-2 mb-10" aria-label="Progression">
        {[1, 2, 3].map((number) => (
          <div key={number} className={`h-1.5 flex-1 rounded-full ${step >= number ? 'bg-signal' : 'bg-border'}`} />
        ))}
      </div>

      {step === 1 && (
        <section className="space-y-8">
          {turn.prompt.role === 'initial' && (
            <div>
              <label className="label">Votre agent habituel</label>
              <div className="flex flex-wrap gap-2">
                {PROVIDERS.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => chooseProvider(name)}
                    className={`px-4 py-2 rounded-lg border text-sm transition-colors ${provider === name ? 'border-signal bg-signal/10 text-bright' : 'border-border text-dim hover:border-dim'}`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-bright">
                  {turn.prompt.role === 'correction' ? '1. Prompt de ce tour' : '1. Copiez ce prompt'}
                </h2>
                <p className="font-body text-sm text-dim mt-1">
                  {turn.prompt.role === 'correction'
                    ? 'Ce texte est celui qui a été envoyé à l’agent pour ce tour. Le recopier met à jour l’heure de copie.'
                    : `Exécutez-le directement chez ${provider}. Vous gardez la maîtrise de la conversation source.`}
                </p>
              </div>
              <button type="button" className="btn-primary shrink-0" onClick={() => handleCopy(turn.prompt.text || prompt, 'prompt')}>
                {copied === 'prompt' ? 'Copié ✓' : 'Copier'}
              </button>
            </div>
            <textarea readOnly value={turn.prompt.text || prompt} rows={14} className="input resize-y font-mono text-xs leading-relaxed" />
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-6">
          <div className="card">
            <h2 className="font-display text-xl font-semibold text-bright mb-2">2. Collez uniquement la réponse</h2>
            <p className="font-body text-sm text-dim mb-5">
              N’ajoutez pas l’historique de conversation. Le JSON produit par votre agent suffit.
            </p>
            <textarea
              value={turn.response.text}
              onChange={(event) => setLog((current) => updateResponseText(current, turn.number, event.target.value))}
              rows={18}
              className="input resize-y font-mono text-xs leading-relaxed"
              placeholder={'{\n  "snapshot_version": "kys-snapshot-0.1",\n  "answered_at": "2026-10-04T15:04:00+02:00"\n}'}
            />
            {error && <p className="font-mono text-red-400 text-xs mt-3">{error}</p>}
          </div>
        </section>
      )}

      {step === 3 && snapshot && (
        <section className="space-y-8">
          <div className="card border-signal/30">
            <p className="label">Résumé de la relation selon l’agent</p>
            <p className="font-body text-bright leading-relaxed">
              {snapshot.relationship_summary || 'L’agent n’a pas fourni de résumé général.'}
            </p>
            {snapshot.agent.context_scope && (
              <p className="font-mono text-xs text-muted mt-4">Contexte déclaré : {snapshot.agent.context_scope}</p>
            )}
          </div>

          {CATEGORIES.map(({ key, title, description }) => (
            <div key={key} className="space-y-3">
              <div>
                <h2 className="font-display text-2xl font-semibold text-bright">{title}</h2>
                <p className="font-body text-sm text-dim mt-1">{description}</p>
              </div>

              {snapshot[key].length === 0 ? (
                <div className="card text-dim text-sm">Aucun élément fourni dans cette catégorie.</div>
              ) : snapshot[key].map((item) => {
                const review = reviews[item.id] || {}
                return (
                  <article key={item.id} className="card space-y-4">
                    <div>
                      <p className="font-body text-bright leading-relaxed">{item.claim}</p>
                      {item.basis && <p className="font-body text-sm text-dim mt-2">Base déclarée : {item.basis}</p>}
                      <span className="tag mt-3">{confidenceLabel(item.confidence)}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {VERDICTS.map((verdict) => (
                        <button
                          key={verdict.id}
                          type="button"
                          onClick={() => updateReview(item.id, { verdict: verdict.id })}
                          className={`px-3 py-2 rounded-lg border text-xs transition-colors ${review.verdict === verdict.id ? 'border-signal bg-signal/10 text-bright' : 'border-border text-dim hover:border-dim'}`}
                        >
                          {verdict.label}
                        </button>
                      ))}
                    </div>

                    {review.verdict === 'nuanced' && (
                      <input
                        className="input"
                        value={review.note || ''}
                        onChange={(event) => updateReview(item.id, { note: event.target.value })}
                        placeholder="Votre précision ou votre reformulation…"
                      />
                    )}
                  </article>
                )
              })}
            </div>
          ))}

          <div className="card bg-panel/40">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="font-display text-xl font-semibold text-bright">Votre examen</p>
                <p className="font-body text-sm text-dim mt-1">{reviewedCount} affirmation{reviewedCount > 1 ? 's' : ''} examinée{reviewedCount > 1 ? 's' : ''} sur {items.length}.</p>
              </div>
              <button type="button" className="btn-ghost" onClick={exportSnapshot}>Exporter le brouillon JSON</button>
            </div>
          </div>

          <div className="card border-signal/30">
            <h2 className="font-display text-xl font-semibold text-bright mb-2">3. Renvoyez vos corrections à l’agent</h2>
            <p className="font-body text-sm text-dim mb-5">
              Cette seconde boucle transforme le portrait initial en représentation corrigée sous votre contrôle.
            </p>
            <textarea readOnly value={correctionPrompt} rows={16} className="input resize-y font-mono text-xs leading-relaxed" />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={reviewedCount === 0}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={() => handleCopy(correctionPrompt, 'correction')}
              >
                {copied === 'correction' ? 'Prompt copié ✓' : 'Copier le prompt de correction'}
              </button>
              {correctionOffered && (
                <Link
                  to="/mirror"
                  className="btn-primary ml-auto"
                  onClick={() => saveBrowserTurnLog({ ...log, cursor: { turn: turn.number + 1, step: 2 } })}
                >
                  Coller la réponse
                </Link>
              )}
            </div>
          </div>

          <StepNav
            onBack={onBack}
            backDisabled={!canGoBack(log)}
            onForward={onForward}
            forwardDisabled={intent.kind === 'none'}
            forwardLabel={forwardLabel(intent.kind, intent.target)}
          />

          <div className="border-t border-border pt-6 text-xs text-muted leading-relaxed">
            Ce résultat est un <strong className="text-dim">KYS Snapshot personnel</strong>, non un KYS Profile certifié. Les futurs KYS Profiles limités et finalisés relèveront du cadre fiduciaire non lucratif de PrivAI.
          </div>
        </section>
      )}
    </div>
  )
}
