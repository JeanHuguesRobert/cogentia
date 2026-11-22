import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import dimensionsRegistry from '../../../../research/cogentigram_dimensions.json'
import promptDocument from '../../../../research/kys_capture_prompt_v2.md?raw'
import {
  buildCogentigramPrompt, parseLocalCogentigram, cogentigramCoverage,
  storeLocalCogentigram, restoreLocalCogentigram, clearLocalCogentigram,
} from '../lib/cogentigram-open.js'


const collectionPrompt = buildCogentigramPrompt(promptDocument, dimensionsRegistry)
const dimensions = dimensionsRegistry.dimensions

export default function Indicators() {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const [response, setResponse] = useState('')
  const [portrait, setPortrait] = useState(null)
  const [responseError, setResponseError] = useState('')
  const [expanded, setExpanded] = useState('')
  const [saved, setSaved] = useState(false)
  const [storedCopy, setStoredCopy] = useState(false)
  const [storageError, setStorageError] = useState('')

  // Reading a previously saved capture is allowed; new data are only stored
  // by an explicit click on the save button.
  useEffect(() => {
    try {
      const savedCapture = restoreLocalCogentigram(window.localStorage)
      if (savedCapture) {
        setResponse(savedCapture.rawText)
        setPortrait(savedCapture.data)
        setSaved(true)
        setStoredCopy(true)
      }
    } catch (error) {
      setStorageError('La copie locale ne peut pas être restaurée : ' + error.message)
    }
  }, [])
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
      setPortrait(parseLocalCogentigram(response).data)
      setSaved(false)
      setResponseError('')
    } catch (e) {
      setPortrait(null)
      setResponseError('Impossible de lire ce JSON : ' + e.message)
    }
  }
  const saveCapture = () => {
    try {
      const result = storeLocalCogentigram(window.localStorage, response)
      setPortrait(result.data)
      setSaved(true)
      setStoredCopy(true)
      setStorageError('')
    } catch (error) {
      setStorageError('Enregistrement local impossible : ' + error.message)
    }
  }
  const clearCapture = () => {
    try {
      clearLocalCogentigram(window.localStorage)
      setSaved(false)
      setStoredCopy(false)
      setStorageError('')
      // Clearing the saved item does not silently erase the open editing draft.
    } catch (error) {
      setStorageError('Suppression locale impossible : ' + error.message)
    }
  }
  const exportCapture = () => {
    if (!portrait) return
    const source = response
    const blob = new Blob([source], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cogentigram-capture.json'
    document.body.append(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }
  const groups = Object.groupBy
    ? Object.groupBy(dimensions, d => d.category)
    : dimensions.reduce((r, d) => { (r[d.category] ||= []).push(d); return r }, {})
  const measured = portrait?.indicators || []
  const coverage = portrait ? cogentigramCoverage(portrait, dimensionsRegistry) : null
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
          sa réponse localement sur cette page, sans l'envoyer à Cogentia. Le prompt
          inclut réellement la définition des {dimensions.length} dimensions du registre.
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
          value={response} onChange={e=>{setResponse(e.target.value);setPortrait(null);setSaved(false);setResponseError('')}} placeholder="Collez le JSON complet, version 2.0 ou archive 1.0."/>
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
          <p className="text-sm text-dim" role="status">
            {coverage.present}/{coverage.total} dimensions du registre présentes ;
            {' '}{coverage.documented} documentées, {coverage.unknown} explicitement inconnues.
            {coverage.missing.length > 0 && ` ${coverage.missing.length} absentes de la capture.`}
            {coverage.emergent.length > 0 && ` ${coverage.emergent.length} dimensions nouvelles proposées.`}
          </p>
          {coverage.missing.length > 0 && <details className="text-xs text-muted">
            <summary>Dimensions absentes</summary>
            <p className="mt-2">{coverage.missing.join(', ')}</p>
          </details>}
          <div className="flex flex-wrap gap-3">
            <button className="btn-ghost" type="button" onClick={exportCapture}>Exporter la réponse originale</button>
            <button className="btn-ghost" type="button" onClick={saveCapture}>
              {saved ? 'Réenregistrer dans ce navigateur' : 'Conserver dans ce navigateur'}
            </button>
            {storedCopy && <button className="btn-ghost" type="button" onClick={clearCapture}>Effacer la copie locale</button>}
          </div>
          {storedCopy && !saved && <p className="text-xs text-muted">
            Une copie antérieure reste enregistrée ; la réponse affichée n'a pas remplacé cette copie.
          </p>}
          <p className="text-xs text-muted">La copie n'est enregistrée dans ce navigateur que sur demande.
            Aucun serveur Cogentia ne reçoit cette réponse depuis cette page.</p>
          {storageError && <p role="alert" className="text-red-300 text-xs">{storageError}</p>}
          {Object.entries(measurementGroups).map(([category, rows])=>(
            <div key={category} className="space-y-3">
              <h3 className="font-semibold">{category} · {rows.length}</h3>
              {rows.map((item, idx)=>(
                <div key={item.id || idx} className="border-t border-line/50 pt-3">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-medium text-bright">{item.id || '—'} — {item.name}</span>
                    <span className="text-dim shrink-0">{item.measurement?.kind === 'unknown' ? 'Inconnu' :
                      item.score == null ? 'Qualitatif' : `Est. IA : ${item.score}/100`}</span>
                  </div>
                  {item.evidence && <p className="text-xs text-dim mt-1">
                    {typeof item.evidence === 'string' ? item.evidence : JSON.stringify(item.evidence)}
                  </p>}
                  {item.measurement?.context && <p className="text-xs text-muted mt-1">Contexte : {item.measurement.context}</p>}
                  {item.measurement?.contexts?.map((c,i)=><p key={i} className="text-xs text-muted mt-1">{c.domain} : {c.observation}</p>)}
                  {Array.isArray(item.counter_evidence) && item.counter_evidence.length > 0 &&
                    <p className="text-xs text-muted mt-1">Contre-preuves : {item.counter_evidence.join(' ; ')}</p>}
                  {item.provenance && <p className="text-xs text-muted mt-1">Source : {item.provenance}</p>}
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
