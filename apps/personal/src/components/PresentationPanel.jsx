import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

// ─── Config modes ─────────────────────────────────────────────────────────────

const MODES = [
  { id: 'raw',       label: 'Cogentia',      tag: 'Brut',        color: 'text-signal' },
  { id: 'big_five',  label: 'Big Five',      tag: 'OCEAN',       color: 'text-blue-400' },
  { id: 'mbti',      label: 'MBTI',          tag: '16 types',    color: 'text-indigo-400' },
  { id: 'disc',      label: 'DISC',          tag: 'RH',          color: 'text-cyan-400' },
  { id: 'enneagram', label: 'Ennéagramme',   tag: '9 types',     color: 'text-pulse' },
]

// ─── Sous-composants de visualisation ────────────────────────────────────────

function ScoreBar({ value, label, color = 'bg-signal', max = 100 }) {
  if (value === null || value === undefined) return (
    <div className="flex items-center gap-3">
      <span className="font-body text-xs text-bright w-28 shrink-0">{label}</span>
      <span className="font-mono text-xs text-muted">N/D</span>
    </div>
  )
  return (
    <div className="flex items-center gap-3">
      <span className="font-body text-xs text-bright w-28 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
      <span className="font-mono text-xs text-bright w-8 text-right tabular-nums shrink-0">
        {value}
      </span>
    </div>
  )
}

function BigFiveView({ scores }) {
  const colors = {
    O: 'bg-blue-400', C: 'bg-signal', E: 'bg-cyan-400',
    A: 'bg-green-400', N: 'bg-pulse',
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="font-mono text-lg font-bold text-bright">{scores.profile}</span>
      </div>
      <div className="space-y-3">
        {Object.entries(scores.dimensions).map(([key, dim]) => (
          <ScoreBar
            key={key}
            label={`${key} — ${dim.name}`}
            value={dim.score}
            color={colors[key]}
          />
        ))}
      </div>
      <p className="font-mono text-xs text-muted pt-2 border-t border-border">
        Score percentile · 50 = médiane pop. · 84 = +1σ
      </p>
    </div>
  )
}

function MBTIView({ scores }) {
  const { type, description, dimensions } = scores
  const typeColors = {
    I: 'text-indigo-400', E: 'text-cyan-400',
    N: 'text-blue-400',   S: 'text-green-400',
    T: 'text-signal',     F: 'text-pulse',
    J: 'text-bright',     P: 'text-yellow-400',
  }
  return (
    <div className="space-y-4">
      {/* Type badge */}
      <div className="flex items-baseline gap-3">
        <div className="font-display text-5xl font-extrabold tracking-widest">
          {type.split('').map((c, i) => (
            <span key={i} className={typeColors[c] ?? 'text-muted'}>{c}</span>
          ))}
        </div>
      </div>
      <p className="font-body text-sm text-dim">{description}</p>
      {/* Dimensions */}
      <div className="space-y-3 pt-2">
        {Object.entries(dimensions).map(([key, dim]) => (
          <div key={key} className="flex items-center gap-3">
            <span className="font-body text-xs text-bright w-28 shrink-0">{dim.label}</span>
            <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
              {dim.score !== null && (
                <div
                  className="h-full bg-indigo-400 rounded-full transition-all duration-700"
                  style={{ width: `${dim.score}%` }}
                />
              )}
            </div>
            <span className={`font-mono text-sm font-bold w-6 text-center ${
              typeColors[dim.pole] ?? 'text-muted'
            }`}>
              {dim.pole}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DISCView({ scores }) {
  const { dominant, description, scores: s } = scores
  const colors = { D: 'bg-red-500', I: 'bg-yellow-400', S: 'bg-green-400', C: 'bg-blue-400' }
  const labels = {
    D: 'Dominance',
    I: 'Influence',
    S: 'Stabilité',
    C: 'Conscienciosité',
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className={`font-display text-5xl font-extrabold ${
          colors[dominant]?.replace('bg-', 'text-') ?? 'text-bright'
        }`}>
          {dominant}
        </span>
        <div>
          <p className="font-display text-base font-semibold text-bright">{labels[dominant]}</p>
          <p className="font-body text-xs text-dim">{description}</p>
        </div>
      </div>
      <div className="space-y-3 pt-2">
        {Object.entries(s).map(([key, val]) => (
          <ScoreBar
            key={key}
            label={`${key} — ${labels[key]}`}
            value={val}
            color={colors[key] ?? 'bg-signal'}
          />
        ))}
      </div>
    </div>
  )
}

function EnneagramView({ scores }) {
  const { dominant, description, scores: s } = scores
  const typeNames = {
    1:'Réformateur', 2:'Aidant', 3:'Battant', 4:'Individualiste',
    5:'Investigateur', 6:'Loyaliste', 7:'Enthousiaste', 8:'Challenger', 9:'Médiateur',
  }
  const sorted = Object.entries(s)
    .filter(([, v]) => v !== null)
    .sort(([, a], [, b]) => b - a)

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3">
        <span className="font-display text-5xl font-extrabold text-pulse">{dominant}</span>
        <div>
          <p className="font-display text-base font-semibold text-bright">
            Type {dominant} — {typeNames[dominant]}
          </p>
          <p className="font-body text-xs text-dim">{description}</p>
        </div>
      </div>
      <div className="space-y-2 pt-2">
        {sorted.map(([key, val]) => (
          <ScoreBar
            key={key}
            label={`Type ${key} — ${typeNames[key]}`}
            value={val}
            color={parseInt(key) === dominant ? 'bg-pulse' : 'bg-muted'}
          />
        ))}
      </div>
    </div>
  )
}

function RawView({ analysis }) {
  return (
    <div className="space-y-3">
      <p className="font-body text-xs text-dim leading-relaxed">
        Présentation directe des données Cogentia sans reformatage dans un framework externe.
        Les 73 indicateurs sont présentés dans la section principale de cette page.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Agent',      value: analysis?.agent_name  ?? '—' },
          { label: 'Confiance',  value: analysis?.rel_global_confidence != null ? `${analysis.rel_global_confidence} %` : '—' },
          { label: 'Profondeur', value: analysis?.rel_interaction_depth ?? '—' },
          { label: 'Fiabilité',  value: analysis?.reliability_recommendation ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} className="card py-3 text-center">
            <p className="label mb-1">{label}</p>
            <p className="font-mono text-xs text-bright">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Panel principal ──────────────────────────────────────────────────────────

export default function PresentationPanel({ analysisId, analysis }) {
  const [activeMode,     setActiveMode]     = useState('raw')
  const [presentations,  setPresentations]  = useState({})
  const [loading,        setLoading]        = useState(true)

  useEffect(() => {
    supabase
      .from('presentations')
      .select('type, scores, narrative')
      .eq('analysis_id', analysisId)
      .then(({ data }) => {
        const map = {}
        for (const p of data ?? []) map[p.type] = p
        setPresentations(map)
        setLoading(false)
      })
  }, [analysisId])

  const current = presentations[activeMode]
  const scores  = current?.scores

  const renderScores = () => {
    if (!scores) return null
    switch (activeMode) {
      case 'big_five':   return <BigFiveView   scores={scores} />
      case 'mbti':       return <MBTIView       scores={scores} />
      case 'disc':       return <DISCView       scores={scores} />
      case 'enneagram':  return <EnneagramView  scores={scores} />
      case 'raw':        return <RawView        analysis={analysis} />
      default:           return null
    }
  }

  return (
    <div className="space-y-6">

      {/* En-tête */}
      <div>
        <p className="font-mono text-signal text-xs tracking-widest uppercase mb-1">
          Modes de présentation
        </p>
        <h3 className="font-display text-lg font-semibold text-bright">
          Ton profil vu par d'autres frameworks
        </h3>
        <p className="font-body text-xs text-muted mt-1">
          Calculés à partir de tes 73 indicateurs Cogentia. Indicatifs — voir la{' '}
          <a href="/docs#Éthique & Limites" className="text-signal hover:underline">documentation</a>.
        </p>
      </div>

      {/* Onglets modes */}
      <div className="flex flex-wrap gap-1">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setActiveMode(m.id)}
            className={`px-3 py-1.5 rounded text-xs font-body transition-colors duration-150 border ${
              activeMode === m.id
                ? 'bg-panel border-border text-bright'
                : 'border-transparent text-muted hover:text-dim'
            }`}
          >
            {m.label}
            <span className={`ml-1.5 font-mono text-xs ${
              activeMode === m.id ? m.color : 'text-muted'
            }`}>
              {m.tag}
            </span>
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div className="card animate-fade-in" key={activeMode}>
        {loading ? (
          <p className="font-mono text-muted text-xs animate-pulse-slow">
            Génération des présentations en cours…
          </p>
        ) : !current ? (
          <p className="font-mono text-muted text-xs">
            Présentation non disponible — données insuffisantes.
          </p>
        ) : (
          <div className="space-y-6">
            {/* Visualisation scores */}
            {renderScores()}

            {/* Narrative IA */}
            {current.narrative && (
              <div className="border-t border-border pt-5">
                <p className="label mb-2">Analyse narrative</p>
                <p className="font-body text-sm text-dim leading-relaxed">
                  {current.narrative}
                </p>
                <p className="font-mono text-xs text-muted mt-3">
                  Généré par Claude · Indicatif, non clinique
                </p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
