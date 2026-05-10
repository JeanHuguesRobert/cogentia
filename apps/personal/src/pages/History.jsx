import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { getSessionId } from '../lib/anonymousSession'

const STATUS_LABELS = {
  pending:  { label: 'En attente',   cls: 'text-muted' },
  fetching: { label: 'Récupération', cls: 'text-yellow-400' },
  parsing:  { label: 'Parsing',      cls: 'text-yellow-400' },
  scoring:  { label: 'Scoring',      cls: 'text-yellow-400' },
  complete: { label: 'Terminée',     cls: 'text-green-400' },
  error:    { label: 'Erreur',       cls: 'text-red-400' },
}

export default function History() {
  const { user }  = useAuth()
  const [analyses, setAnalyses] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      if (user) {
        // Utilisateur connecté : filtre SQL par user_id
        const { data } = await supabase
          .from('analyses_summary')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)
        setAnalyses(data ?? [])
      } else {
        // Anonyme : filtre SQL par anonymous_session_id (exposé dans la vue)
        const sessionId = getSessionId()
        if (!sessionId) { setLoading(false); return }

        const { data } = await supabase
          .from('analyses_summary')
          .select('*')
          .eq('anonymous_session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(50)
        setAnalyses(data ?? [])
      }
      setLoading(false)
    }
    load()
  }, [user])

  if (loading) return (
    <div className="max-w-2xl mx-auto px-6 py-24 text-center">
      <p className="font-mono text-muted text-sm animate-pulse-slow">Chargement…</p>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-6 py-16 animate-fade-in">

      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="font-mono text-signal text-xs tracking-widest uppercase mb-2">
            Historique
          </p>
          <h1 className="font-display text-3xl font-bold text-bright">
            Mes analyses
          </h1>
        </div>
        {!user && (
          <Link to="/auth" className="btn-ghost text-xs">
            Se connecter pour sauvegarder →
          </Link>
        )}
      </div>

      {analyses.length === 0 ? (
        <div className="card text-center py-16">
          <p className="font-body text-dim text-sm mb-4">Aucune analyse pour l'instant.</p>
          <Link to="/" className="btn-primary">Démarrer →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {analyses.map(a => {
            const { label, cls } = STATUS_LABELS[a.status] ?? STATUS_LABELS.error
            return (
              <Link
                key={a.id}
                to={`/results/${a.id}`}
                className="card flex items-center justify-between hover:border-signal transition-colors duration-150 group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-body text-sm text-bright group-hover:text-signal transition-colors">
                      {a.agent_name ?? 'Agent inconnu'}
                    </span>
                    {a.agent_model && (
                      <span className="tag">{a.agent_model}</span>
                    )}
                  </div>
                  <p className="font-mono text-xs text-muted">
                    {new Date(a.created_at).toLocaleString('fr-FR')}
                    {a.total_indicators > 0 && (
                      <> · {a.scored_indicators}/{a.total_indicators} indicateurs</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {a.rel_global_confidence != null && (
                    <span className="font-mono text-xs text-dim hidden sm:inline">
                      {a.rel_global_confidence} % confiance
                    </span>
                  )}
                  <span className={`font-mono text-xs ${cls}`}>{label}</span>
                  <span className="text-muted group-hover:text-signal transition-colors">→</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

    </div>
  )
}
