import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import FeedbackWidget    from '../components/FeedbackWidget'
import PresentationPanel from '../components/PresentationPanel'
import { supabase } from '../supabaseClient'

// ─── Config ──────────────────────────────────────────────────────────────────

// Dimension IDs, categories and cardinality are supplied by the capture.
// Display order is not an epistemic rank.
const isQualitative = item =>
  item.score == null && Boolean(item.measurement || item.evidence)

const RELIABILITY = {
  'ne pas interpréter': { color: 'text-red-400',    bg: 'border-red-900/50 bg-red-950/20',    icon: '⚠' },
  'avec précaution':    { color: 'text-yellow-400',  bg: 'border-yellow-900/50 bg-yellow-950/20', icon: '◎' },
  'fiable':             { color: 'text-green-400',   bg: 'border-green-900/50 bg-green-950/20',  icon: '✓' },
  'très fiable':        { color: 'text-signal',      bg: 'border-signal/30 bg-signal/5',         icon: '✦' },
}

// ─── Evidence coverage (not a pseudo-population radar) ────────────────────────

function CategoryCoverage({ groups }) {
  return (
    <div className="w-full space-y-3">
      {groups.map(({ name, items }) => (
        <div key={name} className="flex items-start justify-between gap-3 border-b border-border pb-2">
          <span className="font-body text-xs text-bright">{name}</span>
          <span className="font-mono text-xs text-muted shrink-0">
            {items.filter(i => i.evidence || i.measurement).length}/{items.length} documentés
          </span>
        </div>
      ))}
    </div>
  )
}

function DimensionValue({ ind }) {
  if (ind.score == null) {
    return (
      <span className="text-xs font-body text-signal">
        {isQualitative(ind) ? 'Observation contextuelle' : 'Non évalué'}
      </span>
    )
  }
  const calibrated = ind.score_type === 'population_percentile_calibrated'
  return (
    <span className="font-mono text-xs text-bright" title={calibrated ? 'Percentile étalonné' : 'Estimation numérique non étalonnée'}>
      {calibrated ? 'Percentile' : 'Est. IA'} : {ind.score}/100
    </span>
  )
}

// ─── Carte indicateur ────────────────────────────────────────────────────────

function IndicatorRow({ ind }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="group cursor-pointer"
      onClick={() => setOpen(o => !o)}
    >
      <div className="grid grid-cols-[1fr_2fr] gap-4 items-center py-2 rounded px-2 -mx-2 hover:bg-panel transition-colors">
        <div>
          <p className="font-body text-xs text-bright group-hover:text-signal transition-colors leading-snug">
            {ind.name}
          </p>
        </div>
        <DimensionValue ind={ind} />
      </div>
      {open && (
        <div className="px-2 pb-3 animate-fade-in space-y-2">
          {ind.id && <p className="font-mono text-xs text-muted">Dimension : {ind.id}</p>}
          {ind.evidence && <p className="font-body text-xs text-dim leading-relaxed border-l-2 border-border pl-3 ml-1">
            {typeof ind.evidence === 'string' ? ind.evidence : JSON.stringify(ind.evidence)}
          </p>}
          {ind.measurement?.context && <p className="font-mono text-xs text-muted">
            Contexte : {ind.measurement.context}
          </p>}
          {Array.isArray(ind.measurement?.contexts) && ind.measurement.contexts.map((c, j) => (
            <p key={j} className="font-body text-xs text-dim">
              {c.domain ? c.domain + ' : ' : ''}{c.observation ?? JSON.stringify(c)}
            </p>
          ))}
          {ind.confidence != null && <p className="font-mono text-xs text-muted">
            Confiance déclarée par l'instrument : {ind.confidence}/100
          </p>}
        </div>
      )}
    </div>
  )
}

// ─── Processing screen ───────────────────────────────────────────────────────

function ProcessingScreen({ analysis }) {
  const steps = ['pending', 'fetching', 'parsing', 'scoring']
  const current = steps.indexOf(analysis?.status)

  return (
    <div className="max-w-sm mx-auto px-6 py-24 text-center space-y-8">
      <p className="font-mono text-signal text-xs tracking-widest uppercase animate-pulse-slow">
        Analyse en cours
      </p>
      <div className="space-y-3">
        {[
          { key: 'fetching', label: 'Récupération de la conversation' },
          { key: 'parsing',  label: 'Extraction du JSON Cogentia' },
          { key: 'scoring',  label: 'Enregistrement des scores' },
        ].map(({ key, label }, i) => {
          const stepIdx = steps.indexOf(key)
          const done    = current > stepIdx
          const active  = current === stepIdx
          return (
            <div key={key} className="flex items-center gap-3 text-left">
              <span className={`font-mono text-xs w-4 shrink-0 ${done ? 'text-green-400' : active ? 'text-signal animate-pulse-slow' : 'text-muted'}`}>
                {done ? '✓' : active ? '◎' : '○'}
              </span>
              <span className={`font-body text-xs ${done ? 'text-dim' : active ? 'text-bright' : 'text-muted'}`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
      <button onClick={() => window.location.reload()} className="btn-ghost text-xs">
        Rafraîchir
      </button>
    </div>
  )
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function Results() {
  const { id } = useParams()
  const [analysis,   setAnalysis]   = useState(null)
  const [indicators, setIndicators] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [activeTab,  setActiveTab]  = useState('')

  // Poll toutes les 2s si l'analyse est encore en cours
  useEffect(() => {
    if (!analysis) return
    if (['complete', 'error'].includes(analysis.status)) return
    const t = setTimeout(() => window.location.reload(), 2000)
    return () => clearTimeout(t)
  }, [analysis])

  useEffect(() => {
    async function load() {
      const [{ data: a, error: e1 }, { data: s, error: e2 }] = await Promise.all([
        supabase.from('analyses_summary').select('*').eq('id', id).single(),
        supabase.from('indicator_scores').select('*').eq('analysis_id', id).order('rank'),
      ])
      if (e1 || e2) { setError((e1 || e2).message); setLoading(false); return }
      setAnalysis(a)
      setIndicators(s ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return (
    <div className="max-w-2xl mx-auto px-6 py-24 text-center">
      <p className="font-mono text-muted text-sm animate-pulse-slow">Chargement…</p>
    </div>
  )

  if (error) return (
    <div className="max-w-xl mx-auto px-6 py-24 text-center">
      <p className="font-mono text-red-400 text-sm mb-4">{error}</p>
      <Link to="/" className="btn-ghost">← Recommencer</Link>
    </div>
  )

  if (analysis.status === 'error') return (
    <div className="max-w-xl mx-auto px-6 py-24 text-center space-y-4">
      <p className="font-mono text-red-400 text-xs tracking-widest uppercase">Erreur de traitement</p>
      <p className="font-body text-dim text-sm">{analysis.error_message ?? 'Une erreur est survenue.'}</p>
      <Link to="/submit" className="btn-ghost text-xs">← Réessayer</Link>
    </div>
  )

  if (analysis.status !== 'complete') return <ProcessingScreen analysis={analysis} />

  // ─── Données calculées ────────────────────────────────────────────────────

  const categories = [...new Set(indicators.map(i => i.category || 'Non classé'))]
  const byCategory = Object.fromEntries(
    categories.map(cat => [cat, indicators.filter(i => (i.category || 'Non classé') === cat)])
  )
  const activeCategory = categories.includes(activeTab) ? activeTab : categories[0]
  const coverageGroups = categories.map(name => ({ name, items: byCategory[name] }))
  // A high score does not make a dimension more relevant than evidence without a number.
  const notableIndicators = [...indicators]
    .filter(i => i.evidence || i.measurement)
    .sort((a, b) => Number(isQualitative(b)) - Number(isQualitative(a)))
    .slice(0, 5)
  const legacyProjections = indicators.every(i => i.score_type === 'percentile')

  const rel = RELIABILITY[analysis.reliability_recommendation] ?? RELIABILITY['avec précaution']

  return (
    <div className="max-w-4xl mx-auto px-6 py-16 animate-fade-in">

      {/* ── En-tête ─────────────────────────────────────────────────── */}
      <div className="mb-12">
        <p className="font-mono text-signal text-xs tracking-widest uppercase mb-3">
          Profil Cogentia · {new Date(analysis.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <h1 className="font-display text-4xl font-bold text-bright mb-8">Ton profil</h1>

        {/* Méta-données agent */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Agent',     value: analysis.agent_name  ?? '—' },
            { label: 'Modèle',    value: analysis.agent_model ?? '—' },
            { label: 'Confiance', value: analysis.rel_global_confidence != null ? `${analysis.rel_global_confidence} %` : '—' },
            { label: 'Fiabilité', value: analysis.reliability_recommendation ?? '—', cls: rel.color },
          ].map(({ label, value, cls }) => (
            <div key={label} className="card text-center py-4">
              <p className="label mb-1">{label}</p>
              <p className={`font-mono text-sm font-semibold ${cls ?? 'text-bright'}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Bandeau fiabilité */}
        <div className={`px-4 py-3 rounded-lg border flex items-start gap-3 ${rel.bg}`}>
          <span className={`font-mono text-sm shrink-0 ${rel.color}`}>{rel.icon}</span>
          <p className="font-body text-xs text-dim leading-relaxed">
            {analysis.reliability_recommendation === 'ne pas interpréter' &&
              "L'agent ne dispose pas d'assez d'historique. Ces résultats ne doivent pas être interprétés."}
            {analysis.reliability_recommendation === 'avec précaution' &&
              "L'historique est limité. Interprète ces résultats comme une première indication, pas un portrait définitif."}
            {analysis.reliability_recommendation === 'fiable' &&
              "L'agent déclare disposer d'un historique riche. Ses interprétations restent à confronter aux observations."}
            {analysis.reliability_recommendation === 'très fiable' &&
              "L'agent déclare une bonne couverture de son historique ; cela ne constitue pas un étalonnage psychométrique."}
            {analysis.rel_global_confidence_rationale && (
              <span className="block mt-1 text-muted">{analysis.rel_global_confidence_rationale}</span>
            )}
          </p>
        </div>
      </div>

      {/* ── Vue globale : radar + top traits ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">

        {/* Observable coverage, including unscored dimensions */}
        <div className="card flex flex-col items-center gap-4">
          <p className="label self-start">Couverture par domaine</p>
          <CategoryCoverage groups={coverageGroups} />
          <p className="font-mono text-xs text-muted text-center">
            Les observations qualitatives comptent autant que les évaluations numériques.
          </p>
        </div>

        {/* Top traits */}
        <div className="card flex flex-col gap-4">
          <p className="label">Repères documentés</p>
          {notableIndicators.length === 0 ? (
            <p className="font-body text-xs text-muted">Données insuffisantes</p>
          ) : (
            <div className="space-y-4 flex-1">
              {notableIndicators.map((ind, i) => (
                <div key={ind.id ?? ind.rank} className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-xs text-bright truncate">{ind.name}</p>
                    <p className="font-mono text-xs text-muted">{ind.category}</p>
                  </div>
                  <span className="font-mono text-xs text-signal shrink-0">
                    {ind.score == null ? 'Qualitatif' : 'Évalué'}
                  </span>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ── Détail par catégorie (onglets) ──────────────────────────── */}
      <div>
        <p className="label mb-4">Détail des {indicators.length} dimensions</p>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-6 border-b border-border pb-3">
          {categories.map(cat => {
            return (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-3 py-1.5 rounded text-xs font-body transition-colors duration-150 ${
                  activeCategory === cat
                    ? 'bg-panel text-bright border border-border'
                    : 'text-muted hover:text-dim'
                }`}
              >
                {cat.replace('Architecture Cognitive', 'Architecture')
                    .replace('Sémiotique & Langage', 'Sémiotique')
                    .replace('Axiologie & Arbitrage', 'Axiologie')
                    .replace('Dynamique de Flux', 'Flux')}
                <span className="ml-1.5 font-mono text-muted">{byCategory[cat]?.length ?? 0}</span>
              </button>
            )
          })}
        </div>

        {/* Contenu de l'onglet */}
        <div className="card animate-fade-in" key={activeCategory}>
          <div className="font-mono text-xs text-muted mb-5">
            {byCategory[activeCategory]?.length ?? 0} dimensions, chacune avec sa preuve et ses conditions de validité.
          </div>

          {/* Indicateurs */}
          <div className="divide-y divide-border -mx-2">
            {(byCategory[activeCategory] ?? []).map(ind => (
              <IndicatorRow key={ind.id ?? ind.rank} ind={ind} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Modes de présentation ──────────────────────────────────────── */}
      <div className="mt-12">
        {legacyProjections ? (
          <PresentationPanel analysisId={id} analysis={analysis} />
        ) : (
          <p className="font-body text-xs text-muted">
            Les projections psychométriques héritées ne sont pas calculées à partir du Cogentigram extensible :
            elles nécessitent une correspondance par identifiant et une calibration distincte.
          </p>
        )}
      </div>

      {/* ── Feedback ────────────────────────────────────────────────── */}
      <div className="mt-12">
        <FeedbackWidget analysisId={id} indicators={indicators} />
      </div>

      {/* ── Actions ─────────────────────────────────────────────────── */}
      <div className="mt-6 pt-8 border-t border-border flex flex-wrap gap-3">
        <Link to="/" className="btn-primary">Nouvelle analyse</Link>
        <Link to="/history" className="btn-ghost">Historique</Link>
      </div>

    </div>
  )
}
