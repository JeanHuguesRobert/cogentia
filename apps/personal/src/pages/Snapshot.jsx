import { useMemo, useState } from 'react'

const PROVIDERS = ['ChatGPT', 'Claude', 'Gemini', 'Mistral', 'Autre agent']

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

Schéma attendu :
{
  "snapshot_version": "kys-snapshot-0.1",
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

function extractJson(text) {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('Collez d’abord la réponse de votre agent.')

  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')

  try {
    return JSON.parse(withoutFence)
  } catch {
    // Continue avec une extraction équilibrée du premier objet JSON.
  }

  const start = trimmed.indexOf('{')
  if (start === -1) throw new Error('Aucun objet JSON détecté dans la réponse.')

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < trimmed.length; index += 1) {
    const char = trimmed[index]

    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }

    if (char === '"') inString = true
    else if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return JSON.parse(trimmed.slice(start, index + 1))
      }
    }
  }

  throw new Error('Le JSON semble incomplet. Vérifiez que la réponse a été copiée en entier.')
}

function normalizeClaim(item, index, category) {
  if (typeof item === 'string') {
    return { id: `${category}-${index}`, claim: item, basis: '', confidence: 'low' }
  }

  return {
    id: item?.id || `${category}-${index}`,
    claim: String(item?.claim || item?.text || '').trim(),
    basis: String(item?.basis || item?.evidence || '').trim(),
    confidence: ['high', 'medium', 'low'].includes(item?.confidence) ? item.confidence : 'low',
  }
}

function normalizeSnapshot(data, provider) {
  const normalized = {
    snapshot_version: data?.snapshot_version || 'kys-snapshot-0.1',
    agent: {
      provider: data?.agent?.provider || provider,
      model: data?.agent?.model || '',
      context_scope: data?.agent?.context_scope || '',
    },
    relationship_summary: String(data?.relationship_summary || '').trim(),
  }

  CATEGORIES.forEach(({ key }) => {
    normalized[key] = Array.isArray(data?.[key])
      ? data[key].map((item, index) => normalizeClaim(item, index, key)).filter((item) => item.claim)
      : []
  })

  const count = CATEGORIES.reduce((sum, { key }) => sum + normalized[key].length, 0)
  if (count === 0) throw new Error('Le JSON ne contient aucune affirmation exploitable.')

  return normalized
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
  const [provider, setProvider] = useState(PROVIDERS[0])
  const [step, setStep] = useState(1)
  const [pasted, setPasted] = useState('')
  const [snapshot, setSnapshot] = useState(null)
  const [reviews, setReviews] = useState({})
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

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
- Cette représentation reste un instantané contestable, non un diagnostic ni une définition de ma personne.`
  }, [items, reviews, snapshot])

  const handleCopy = async (text, label) => {
    await copyText(text)
    setCopied(label)
    window.setTimeout(() => setCopied(''), 1600)
  }

  const handleParse = () => {
    try {
      const parsed = normalizeSnapshot(extractJson(pasted), provider)
      setSnapshot(parsed)
      setReviews({})
      setError('')
      setStep(3)
      localStorage.setItem('kys_snapshot_draft_v1', JSON.stringify({ snapshot: parsed, reviews: {} }))
    } catch (parseError) {
      setError(parseError.message || 'Réponse impossible à analyser.')
    }
  }

  const updateReview = (id, patch) => {
    setReviews((current) => {
      const next = { ...current, [id]: { ...current[id], ...patch } }
      localStorage.setItem('kys_snapshot_draft_v1', JSON.stringify({ snapshot, reviews: next }))
      return next
    })
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
          Interrogez votre agent habituel, examinez chacune de ses affirmations, puis corrigez sa représentation. Rien n’est envoyé à Cogentia dans ce parcours.
        </p>
      </div>

      <div className="flex gap-2 mb-10" aria-label="Progression">
        {[1, 2, 3].map((number) => (
          <div key={number} className={`h-1.5 flex-1 rounded-full ${step >= number ? 'bg-signal' : 'bg-border'}`} />
        ))}
      </div>

      {step === 1 && (
        <section className="space-y-8">
          <div>
            <label className="label">Votre agent habituel</label>
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setProvider(name)}
                  className={`px-4 py-2 rounded-lg border text-sm transition-colors ${provider === name ? 'border-signal bg-signal/10 text-bright' : 'border-border text-dim hover:border-dim'}`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-bright">1. Copiez ce prompt</h2>
                <p className="font-body text-sm text-dim mt-1">Exécutez-le directement chez {provider}. Vous gardez la maîtrise de la conversation source.</p>
              </div>
              <button type="button" className="btn-primary shrink-0" onClick={() => handleCopy(prompt, 'prompt')}>
                {copied === 'prompt' ? 'Copié ✓' : 'Copier'}
              </button>
            </div>
            <textarea readOnly value={prompt} rows={14} className="input resize-y font-mono text-xs leading-relaxed" />
          </div>

          <div className="flex justify-end">
            <button type="button" className="btn-primary" onClick={() => setStep(2)}>J’ai la réponse →</button>
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
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
              rows={18}
              className="input resize-y font-mono text-xs leading-relaxed"
              placeholder={'{\n  "snapshot_version": "kys-snapshot-0.1",\n  ...\n}'}
            />
            {error && <p className="font-mono text-red-400 text-xs mt-3">{error}</p>}
          </div>

          <div className="flex justify-between gap-3">
            <button type="button" className="btn-ghost" onClick={() => setStep(1)}>← Revenir au prompt</button>
            <button type="button" className="btn-primary" onClick={handleParse}>Afficher mon miroir →</button>
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
            <button
              type="button"
              disabled={reviewedCount === 0}
              className="btn-primary mt-4 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => handleCopy(correctionPrompt, 'correction')}
            >
              {copied === 'correction' ? 'Prompt copié ✓' : 'Copier le prompt de correction'}
            </button>
          </div>

          <div className="border-t border-border pt-6 text-xs text-muted leading-relaxed">
            Ce résultat est un <strong className="text-dim">KYS Snapshot personnel</strong>, non un KYS Profile certifié. Les futurs KYS Profiles limités et finalisés relèveront du cadre fiduciaire non lucratif de PrivAI.
          </div>
        </section>
      )}
    </div>
  )
}
