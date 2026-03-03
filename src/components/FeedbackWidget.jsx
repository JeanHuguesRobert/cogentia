import { useState } from 'react'
import { supabase } from '../supabaseClient'

const LABELS = {
  1: 'Pas du tout moi',
  2: 'Peu ressemblant',
  3: 'Partiellement',
  4: 'Plutôt fidèle',
  5: 'C\'est exactement moi',
}

export default function FeedbackWidget({ analysisId, indicators }) {
  const [step,       setStep]       = useState('rating')
  const [rating,     setRating]     = useState(null)
  const [hovered,    setHovered]    = useState(null)
  const [contested,  setContested]  = useState([])
  const [comment,    setComment]    = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState(null)

  const toggleContested = (rank) =>
    setContested(prev =>
      prev.includes(rank) ? prev.filter(r => r !== rank) : [...prev, rank]
    )

  const handleRating = (r) => { setRating(r); setStep('details') }

  const handleSubmit = async () => {
    setSubmitting(true); setError(null)
    const { error: err } = await supabase.from('feedback').insert({
      analysis_id:     analysisId,
      resemblance:     rating,
      contested_ranks: contested.length > 0 ? contested : null,
      comment:         comment.trim() || null,
    })
    if (err) {
      if (err.code === '23505') { setStep('done'); return }
      setError('Erreur lors de l\'envoi — réessaie.'); setSubmitting(false); return
    }
    setStep('done')
  }

  if (step === 'done') return (
    <div className="card border-signal/30 animate-fade-in">
      <div className="flex items-center gap-3">
        <span className="font-mono text-signal text-lg">✦</span>
        <div>
          <p className="font-body text-sm text-bright">Merci pour ton retour.</p>
          <p className="font-mono text-xs text-muted mt-0.5">
            Il contribue à la validation psychométrique de Cogentia.
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="card space-y-6">
      <div>
        <p className="font-mono text-signal text-xs tracking-widest uppercase mb-1">Validation</p>
        <h3 className="font-display text-lg font-semibold text-bright">Ce profil te ressemble-t-il ?</h3>
        <p className="font-body text-xs text-muted mt-1">
          Ton retour aide à mesurer la fiabilité réelle du protocole Cogentia.
        </p>
      </div>

      {/* Échelle 1–5 */}
      <div className="flex items-center gap-2">
        {[1,2,3,4,5].map(n => (
          <button
            key={n}
            onClick={() => handleRating(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(null)}
            className="transition-transform duration-100 hover:scale-110 active:scale-95"
            title={LABELS[n]}
          >
            <span className={`text-2xl transition-colors duration-100 ${
              n <= (hovered ?? rating ?? 0) ? 'text-signal' : 'text-border'
            }`}>◆</span>
          </button>
        ))}
        {(hovered || rating) && (
          <span className="font-body text-xs text-dim ml-2 animate-fade-in">
            {LABELS[hovered ?? rating]}
          </span>
        )}
      </div>

      {/* Détails */}
      {step === 'details' && rating !== null && (
        <div className="space-y-5 animate-slide-up">

          {rating <= 3 && indicators.filter(i => i.score !== null).length > 0 && (
            <div>
              <p className="label mb-3">Quels indicateurs te semblent inexacts ? (optionnel)</p>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {indicators.filter(i => i.score !== null).map(ind => (
                  <button
                    key={ind.rank}
                    onClick={() => toggleContested(ind.rank)}
                    className={`px-2.5 py-1 rounded text-xs font-body transition-colors duration-150 border ${
                      contested.includes(ind.rank)
                        ? 'bg-pulse/20 border-pulse text-bright'
                        : 'bg-transparent border-border text-muted hover:border-dim hover:text-dim'
                    }`}
                  >
                    {ind.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="label">Commentaire libre (optionnel)</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value.slice(0, 500))}
              placeholder="Ce qui m'a surpris, ce qui sonne juste, ce qui semble hors sujet…"
              rows={3}
              className="input resize-none text-xs"
            />
            <p className="font-mono text-xs text-muted mt-1 text-right">{comment.length}/500</p>
          </div>

          {error && <p className="font-mono text-red-400 text-xs">{error}</p>}

          <div className="flex items-center gap-3">
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary text-sm disabled:opacity-40">
              {submitting ? 'Envoi…' : 'Envoyer mon retour'}
            </button>
            <button onClick={() => setStep('done')} className="btn-ghost text-xs">Passer</button>
          </div>
        </div>
      )}
    </div>
  )
}
