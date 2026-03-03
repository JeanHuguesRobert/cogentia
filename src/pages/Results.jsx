import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import FeedbackWidget    from '../components/FeedbackWidget'
import PresentationPanel from '../components/PresentationPanel'
import { supabase } from '../supabaseClient'

// ─── Config ──────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Architecture Cognitive',
  'Interface Sociale',
  'Sémiotique & Langage',
  'Axiologie & Arbitrage',
  'Dynamique de Flux',
  'Scores Dérivés',
  'Cogentia+',
]

// Catégories affichées dans le radar (les dérivés sont calculés, pas mesurés)
const RADAR_CATEGORIES = CATEGORIES.filter(c => c !== 'Scores Dérivés')

const RELIABILITY = {
  'ne pas interpréter': { color: 'text-red-400',    bg: 'border-red-900/50 bg-red-950/20',    icon: '⚠' },
  'avec précaution':    { color: 'text-yellow-400',  bg: 'border-yellow-900/50 bg-yellow-950/20', icon: '◎' },
  'fiable':             { color: 'text-green-400',   bg: 'border-green-900/50 bg-green-950/20',  icon: '✓' },
  'très fiable':        { color: 'text-signal',      bg: 'border-signal/30 bg-signal/5',         icon: '✦' },
}

// ─── SVG Radar Chart ─────────────────────────────────────────────────────────

function polarToXY(angle, radius, cx, cy) {
  const rad = (angle - 90) * (Math.PI / 180)
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  }
}

function RadarChart({ data, size = 280 }) {
  const cx = size / 2
  const cy = size / 2
  const maxR = size / 2 - 36
  const n = data.length
  if (n < 3) return null

  const rings = [25, 50, 75, 100]
  const angles = data.map((_, i) => (360 / n) * i)

  // Polygone utilisateur
  const userPoints = data.map((d, i) => {
    const r = ((d.score ?? 50) / 100) * maxR
    return polarToXY(angles[i], r, cx, cy)
  })

  // Polygone référence (médiane pop = 50e percentile)
  const medianPoints = data.map((_, i) => polarToXY(angles[i], maxR * 0.5, cx, cy))

  const toPath = pts => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      <defs>
        <radialGradient id="radarGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#4f7cff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#4f7cff" stopOpacity="0.04" />
        </radialGradient>
      </defs>

      {/* Grille circulaire */}
      {rings.map(pct => (
        <circle
          key={pct}
          cx={cx} cy={cy}
          r={(pct / 100) * maxR}
          fill="none"
          stroke="#1e2535"
          strokeWidth="1"
        />
      ))}

      {/* Axes */}
      {data.map((d, i) => {
        const outer = polarToXY(angles[i], maxR, cx, cy)
        return <line key={i} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="#1e2535" strokeWidth="1" />
      })}

      {/* Médiane populationnelle */}
      <path
        d={toPath(medianPoints)}
        fill="none"
        stroke="#3a4460"
        strokeWidth="1"
        strokeDasharray="4 3"
      />

      {/* Polygone utilisateur */}
      <path d={toPath(userPoints)} fill="url(#radarGrad)" stroke="#4f7cff" strokeWidth="1.5" />

      {/* Points sur les axes */}
      {userPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#4f7cff" />
      ))}

      {/* Labels */}
      {data.map((d, i) => {
        const labelR = maxR + 22
        const pos = polarToXY(angles[i], labelR, cx, cy)
        const anchor = pos.x < cx - 4 ? 'end' : pos.x > cx + 4 ? 'start' : 'middle'
        // Abréviation du nom de catégorie
        const short = d.name
          .replace('Architecture Cognitive', 'Cognition')
          .replace('Interface Sociale', 'Social')
          .replace('Sémiotique & Langage', 'Langage')
          .replace('Axiologie & Arbitrage', 'Axiologie')
          .replace('Dynamique de Flux', 'Flux')
          .replace('Cogentia+', 'Cogentia+')
        return (
          <text
            key={i}
            x={pos.x} y={pos.y}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize="10"
            fontFamily="IBM Plex Mono, monospace"
            fill={d.score !== null ? '#8892a4' : '#3a4460'}
          >
            {short}
          </text>
        )
      })}

      {/* Score central */}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="20" fontFamily="Syne, sans-serif" fontWeight="700" fill="#e8ecf5">
        {Math.round(data.filter(d => d.score !== null).reduce((s, d) => s + d.score, 0) / Math.max(data.filter(d => d.score !== null).length, 1))}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="8" fontFamily="IBM Plex Mono, monospace" fill="#3a4460">
        MOY. PERCENTILE
      </text>
    </svg>
  )
}

// ─── Barre percentile ────────────────────────────────────────────────────────

function PercentileBar({ score, confidence }) {
  if (score === null) return <span className="font-mono text-muted text-xs">données insuffisantes</span>

  const dimmed = confidence < 40
  // Couleur selon zone percentile
  const barColor = score >= 84 ? 'bg-signal'
                 : score >= 60 ? 'bg-blue-400'
                 : score >= 40 ? 'bg-muted'
                 : 'bg-pulse'

  return (
    <div className={`flex items-center gap-3 ${dimmed ? 'opacity-40' : ''}`} title={`Confidence : ${confidence}%`}>
      {/* Marqueur médiane */}
      <div className="relative flex-1 h-1.5 bg-border rounded-full overflow-visible">
        {/* Ligne médiane à 50 */}
        <div className="absolute top-1/2 left-1/2 -translate-y-1/2 w-px h-3 bg-muted/50 z-10" />
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="font-mono text-xs text-bright w-7 text-right shrink-0 tabular-nums">
        {score}
      </span>
      {dimmed && <span className="font-mono text-xs text-muted" title="Confiance faible">~</span>}
    </div>
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
        <PercentileBar score={ind.score} confidence={ind.confidence} />
      </div>
      {open && ind.evidence && (
        <div className="px-2 pb-2 animate-fade-in">
          <p className="font-body text-xs text-dim leading-relaxed border-l-2 border-border pl-3 ml-1">
            {ind.evidence}
          </p>
          <p className="font-mono text-xs text-muted mt-1 pl-3 ml-1">
            confiance : {ind.confidence}/100
          </p>
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
  const [activeTab,  setActiveTab]  = useState(CATEGORIES[0])

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

  const byCategory = Object.fromEntries(
    CATEGORIES.map(cat => [cat, indicators.filter(i => i.category === cat)])
  )

  const categoryAvg = cat => {
    const items = byCategory[cat]?.filter(i => i.score !== null) ?? []
    if (!items.length) return null
    return Math.round(items.reduce((s, i) => s + i.score, 0) / items.length)
  }

  const radarData = RADAR_CATEGORIES.map(cat => ({
    name:  cat,
    score: categoryAvg(cat),
  }))

  // Top 5 scores les plus élevés (avec score non-null)
  const topIndicators = [...indicators]
    .filter(i => i.score !== null && i.confidence >= 40)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

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
              "L'agent dispose d'un historique suffisant. Ce profil est une représentation fiable de tes tendances cognitives."}
            {analysis.reliability_recommendation === 'très fiable' &&
              "L'agent te connaît très bien. Ce profil a une forte valeur psychométrique."}
            {analysis.rel_global_confidence_rationale && (
              <span className="block mt-1 text-muted">{analysis.rel_global_confidence_rationale}</span>
            )}
          </p>
        </div>
      </div>

      {/* ── Vue globale : radar + top traits ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">

        {/* Radar */}
        <div className="card flex flex-col items-center gap-4">
          <p className="label self-start">Vue globale par catégorie</p>
          <RadarChart data={radarData} size={260} />
          <p className="font-mono text-xs text-muted text-center">
            Tiret = médiane populationnelle (50e percentile)
          </p>
        </div>

        {/* Top traits */}
        <div className="card flex flex-col gap-4">
          <p className="label">Traits dominants</p>
          {topIndicators.length === 0 ? (
            <p className="font-body text-xs text-muted">Données insuffisantes</p>
          ) : (
            <div className="space-y-4 flex-1">
              {topIndicators.map((ind, i) => (
                <div key={ind.rank} className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-xs text-bright truncate">{ind.name}</p>
                    <p className="font-mono text-xs text-muted">{ind.category}</p>
                  </div>
                  <span className="font-mono text-sm font-bold text-signal shrink-0">
                    {ind.score}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Scores dérivés synthétiques */}
          {byCategory['Scores Dérivés']?.filter(i => i.score !== null).length > 0 && (
            <div className="border-t border-border pt-4 space-y-2">
              <p className="label">Indices dérivés</p>
              {byCategory['Scores Dérivés'].filter(i => i.score !== null).map(ind => (
                <div key={ind.rank} className="flex items-center justify-between">
                  <span className="font-mono text-xs text-dim">{ind.name}</span>
                  <span className={`font-mono text-xs font-semibold ${ind.score >= 84 ? 'text-signal' : ind.score >= 50 ? 'text-bright' : 'text-pulse'}`}>
                    {ind.score}e
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Détail par catégorie (onglets) ──────────────────────────── */}
      <div>
        <p className="label mb-4">Détail des 73 indicateurs</p>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-6 border-b border-border pb-3">
          {CATEGORIES.map(cat => {
            const avg = categoryAvg(cat)
            return (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-3 py-1.5 rounded text-xs font-body transition-colors duration-150 ${
                  activeTab === cat
                    ? 'bg-panel text-bright border border-border'
                    : 'text-muted hover:text-dim'
                }`}
              >
                {cat.replace('Architecture Cognitive', 'Architecture')
                    .replace('Sémiotique & Langage', 'Sémiotique')
                    .replace('Axiologie & Arbitrage', 'Axiologie')
                    .replace('Dynamique de Flux', 'Flux')}
                {avg !== null && (
                  <span className="ml-1.5 font-mono text-signal">{avg}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Contenu de l'onglet */}
        <div className="card animate-fade-in" key={activeTab}>
          {/* Légende */}
          <div className="flex items-center gap-6 mb-6 pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-px bg-signal" />
              <span className="font-mono text-xs text-muted">toi</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-px bg-muted border-dashed border-t border-muted" />
              <span className="font-mono text-xs text-muted">médiane pop.</span>
            </div>
            <span className="font-mono text-xs text-muted ml-auto">
              {byCategory[activeTab]?.filter(i => i.score !== null).length ?? 0}/
              {byCategory[activeTab]?.length ?? 0} scorés
            </span>
          </div>

          {/* Indicateurs */}
          <div className="divide-y divide-border -mx-2">
            {(byCategory[activeTab] ?? []).map(ind => (
              <IndicatorRow key={ind.rank} ind={ind} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Modes de présentation ──────────────────────────────────────── */}
      <div className="mt-12">
        <PresentationPanel analysisId={id} analysis={analysis} />
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
