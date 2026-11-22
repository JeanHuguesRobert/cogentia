import { useState } from 'react'
import { Link } from 'react-router-dom'
import dimensionsRegistry from '../../../../research/cogentigram_dimensions.json'
import promptDocument from '../../../../research/kys_capture_prompt_v2.md?raw'

const collectionPrompt = promptDocument.split(/\n---\n\nTu es mon agent conversationnel habituel\./)[1]
  ? 'Tu es mon agent conversationnel habituel.' + promptDocument.split(/\n---\n\nTu es mon agent conversationnel habituel\./)[1]
  : promptDocument
const dimensions = dimensionsRegistry.dimensions

const readJson = (response) => {
  const input = response.trim()
  const candidate = input.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1] ?? input
  const parsed = JSON.parse(candidate)
  if (!['1.0', '2.0'].includes(parsed.cogentia_version)
      || !Array.isArray(parsed.indicators)
      || parsed.indicators.length === 0) {
    throw new Error('La version ou la liste des dimensions est absente.')
  }
  const seen = new Set()
  parsed.indicators.forEach((item, i) => {
    const id = item.id || (parsed.cogentia_version === '1.0' ? `COG-${String(item.rank ?? i+1).padStart(3,'0')}` : '')
    if (!id || seen.has(id)) throw new Error('Identifiant manquant ou répété : ' + id)
    seen.add(id)
  })
  return parsed
}

export default function Indicators() {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const [response, setResponse] = useState('')
  const [portrait, setPortrait] = useState(null)
  const [responseError, setResponseError] = useState('')
  const [expanded, setExpanded] = useState('')
  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(collectionPrompt)
      setCopied(true)
      setCopyError(false)
    } catch {
      setCopied(false)
      setCopyError(true)
    }
  }
  const showPortrait = () => {
    try {
      setPortrait(readJson(response))
      setResponseError('')
    } catch (e) {
      setPortrait(null)
      setResponseError('Impossible de lire ce JSON : ' + e.message)
    }
  }
  const groups = Object.groupBy
    ? Object.groupBy(dimensions, d => d.category)
    : dimensions.reduce((r, d) => { (r[d.category] ||= []).push(d); return r }, {})
  const measured = portrait?.indicators || []
  const measurementGroups = measured.reduce((r, d) => {
    (r[d.category || 'Non classé'] ||= []).push(d)
    return r
  }, {})

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 md:py-20 space-y-12">
      <header className="max-w-3xl space-y-5">
        <p className="font-mono text-signal text-xs tracking-widest uppercase">Cogentigram · KYS</p>
        <h1 className="font-display text-3xl md:text-5xl font-bold text-bright">
          {dimensions.length} dimensions de premier rang, et un modèle ouvert
        </h1>
        <p className="text-sm text-dim leading-relaxed">
          Le nombre n'est pas un plafond : toute dimension distincte, documentée et pertinente peut
          rejoindre le registre. Les sept dimensions REP, ENG et OPS ont le même statut que les autres.
          Les anciennes captures demeurent des archives, pas la frontière de ce que nous pouvons apprendre.
        </p>
        <a href="#collect" className="btn-primary">Examiner le protocole de capture</a>
      </header>

      <section id="collect" className="card space-y-4 scroll-mt-24">
        <p className="font-mono text-signal text-xs uppercase">Protocole expérimental v2 · Dimensions ouvertes</p>
        <h2 className="font-display text-2xl font-semibold text-bright">Interroger votre agent habituel</h2>
        <p className="text-sm text-dim">
          Copiez le prompt dans l'agent disposant de votre historique. Il doit distinguer observations,
          hypothèses, contradictions et inconnus, sans fabriquer de percentiles. Vous pouvez examiner
          sa réponse localement sur cette page, sans l'envoyer à Cogentia.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary" onClick={copyPrompt}>
            {copied ? 'Prompt copié ✓' : 'Copier le prompt complet'}
          </button>
          {copyError && <span role="status" className="text-sm text-dim">
            La copie automatique a échoué. Le texte est accessible ci-dessous.
          </span>}
        </div>
        <details className="rounded-xl border border-line/50 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-bright">
            Afficher et copier manuellement le prompt
          </summary>
          <textarea aria-label="Prompt Cogentigram ouvert" className="mt-4 w-full min-h-[26rem] rounded-lg bg-base p-4 font-mono text-xs leading-relaxed text-dim"
            value={collectionPrompt} readOnly onFocus={e=>e.currentTarget.select()} />
        </details>
      </section>

      <section className="card space-y-4">
        <h2 className="font-display text-2xl font-semibold text-bright">Lire la réponse dans ce navigateur</h2>
        <label htmlFor="cogentigram-response" className="text-sm font-medium text-bright">Réponse complète de votre agent</label>
        <textarea id="cogentigram-response" className="input min-h-48 w-full resize-y font-mono text-xs"
          value={response} onChange={e=>setResponse(e.target.value)} placeholder="Collez le JSON complet, version 2.0 ou archive 1.0."/>
        {responseError && <p role="alert" className="text-red-300 text-sm">{responseError}</p>}
        <button type="button" className="btn-primary" onClick={showPortrait} disabled={!response.trim()}>
          Afficher les dimensions observées
        </button>
      </section>

      {portrait && (
        <section className="card space-y-5" aria-label="Portrait de l'agent">
          <h2 className="font-display text-2xl font-semibold text-bright">
            {measured.length} dimensions rapportées par {portrait.agent?.name || 'l’agent'}
          </h2>
          <p className="text-xs text-muted">Ce que l'agent affirme, non une mesure psychométrique certifiée.
            Une absence de score numérique ne supprime ni la dimension ni les éléments de preuve.</p>
          {Object.entries(measurementGroups).map(([category, rows])=>(
            <div key={category} className="space-y-3">
              <h3 className="font-semibold">{category} · {rows.length}</h3>
              {rows.map((item, idx)=>(
                <div key={item.id || idx} className="border-t border-line/50 pt-3">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-medium text-bright">{item.id || '—'} — {item.name}</span>
                    <span className="text-dim shrink-0">{item.score == null ? 'Qualitatif' : `Est. IA : ${item.score}/100`}</span>
                  </div>
                  {item.evidence && <p className="text-xs text-dim mt-1">
                    {typeof item.evidence === 'string' ? item.evidence : JSON.stringify(item.evidence)}
                  </p>}
                  {item.measurement?.context && <p className="text-xs text-muted mt-1">Contexte : {item.measurement.context}</p>}
                  {item.measurement?.contexts?.map((c,i)=><p key={i} className="text-xs text-muted mt-1">{c.domain} : {c.observation}</p>)}
                </div>
              ))}
            </div>
          ))}
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold text-bright">Registre actuel des dimensions</h2>
        <p className="text-sm text-dim">Chaque entrée possède un identifiant stable et une définition.
          Les catégories servent uniquement à naviguer et peuvent évoluer.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {Object.entries(groups).map(([category, items])=>(
            <div key={category} className="card">
              <button type="button" className="w-full text-left font-semibold text-bright" onClick={()=>setExpanded(expanded===category?'':category)}>
                {category} <span className="text-xs text-dim">{items.length}</span>
              </button>
              {expanded===category && (
                <div className="space-y-3 mt-4">
                  {items.map(item=><div key={item.id} className="text-sm border-t border-line/50 pt-2">
                    <p className="font-medium">{item.id} — {item.name}</p>
                    <p className="text-xs text-muted">{item.definition}</p>
                  </div>)}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="text-xs text-muted space-y-2">
        <p>Les vues Big Five, MBTI, DISC et Ennéagramme de l'ancien parcours constituent des projections historiques,
          et non des validations indépendantes de ce registre ouvert.</p>
        <Link className="btn-ghost inline-flex" to="/snapshot">Ouvrir aussi le miroir KYS</Link>
      </section>
    </div>
  )
}
