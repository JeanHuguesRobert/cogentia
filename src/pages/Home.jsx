import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Home() {
  const [prompt,  setPrompt]  = useState(null)   // null = chargement
  const [version,         setVersion]         = useState(null)
  const [promptVersionId, setPromptVersionId] = useState(null)
  const [copied,  setCopied]  = useState(false)
  const [error,   setError]   = useState(null)
  const navigate = useNavigate()

  // ─── Charge le prompt actif depuis Supabase ────────────────────────────────
  useEffect(() => {
    supabase
      .from('prompt_versions')
      .select('id, content, version')
      .eq('is_active', true)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setError('Impossible de charger le prompt. Réessaie dans un instant.')
          return
        }
        setPrompt(data.content)
        setVersion(data.version)
        setPromptVersionId(data.id)
      })
  }, [])

  // ─── Copie dans le presse-papier ──────────────────────────────────────────
  const handleCopy = async () => {
    if (!prompt) return
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback : zone de texte temporaire
      const ta = document.createElement('textarea')
      ta.value = prompt
      ta.style.position = 'fixed'
      ta.style.opacity  = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const isLoading = prompt === null && !error

  return (
    <div className="max-w-2xl mx-auto px-6 py-24 animate-fade-in">

      {/* Eyebrow */}
      <p className="font-mono text-signal text-xs tracking-widest uppercase mb-6">
        Protocole Cogentia{version ? ` v${version}` : ''}
      </p>

      {/* Headline */}
      <h1 className="font-display text-4xl font-bold text-bright leading-tight mb-4">
        Connais-toi<br />toi-même.
      </h1>

      <p className="font-body text-dim text-base leading-relaxed mb-12 max-w-lg">
        Ton agent IA te connaît mieux que tu ne le crois. Génère ton profil psychocognitif
        certifié en trois étapes — aucune installation, aucun compte requis.
      </p>

      {/* Steps */}
      <ol className="space-y-6 mb-12">
        {[
          { n: '01', text: 'Copie le prompt Cogentia ci-dessous.' },
          { n: '02', text: 'Colle-le dans ton agent IA habituel (ChatGPT, Claude, Gemini…).' },
          { n: '03', text: 'Reviens ici et partage le lien de la conversation.' },
        ].map(({ n, text }) => (
          <li key={n} className="flex items-start gap-4">
            <span className="font-mono text-signal text-sm mt-0.5 shrink-0">{n}</span>
            <span className="font-body text-dim text-sm leading-relaxed">{text}</span>
          </li>
        ))}
      </ol>

      {/* Erreur */}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg border border-red-900/50 bg-red-950/20">
          <p className="font-mono text-red-400 text-xs">{error}</p>
        </div>
      )}

      {/* CTA */}
      <div className="flex flex-col sm:flex-row items-start gap-3">
        <button
          onClick={handleCopy}
          disabled={isLoading || !!error}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="animate-pulse-slow">Chargement du prompt…</span>
          ) : copied ? (
            <>
              <span className="text-green-300">✓</span>
              Prompt copié
            </>
          ) : (
            <>
              <span>⎘</span>
              Copier le prompt
            </>
          )}
        </button>

        {copied && (
          <button
            onClick={() => navigate('/submit', { state: { promptVersionId } })}
            className="btn-ghost animate-fade-in"
          >
            J'ai collé le prompt →
          </button>
        )}
      </div>

      {/* Preview du prompt (accessible mais discret) */}
      {prompt && !copied && (
        <details className="mt-10 group">
          <summary className="font-mono text-xs text-muted cursor-pointer hover:text-dim transition-colors list-none">
            ↓ Aperçu du prompt
          </summary>
          <pre className="mt-3 p-4 rounded-lg bg-panel border border-border text-xs font-mono text-muted
                          overflow-auto max-h-48 whitespace-pre-wrap leading-relaxed">
            {prompt.slice(0, 600)}…
          </pre>
        </details>
      )}

      {/* Disclaimer */}
      <p className="font-mono text-muted text-xs mt-10 leading-relaxed max-w-md">
        Aucune donnée identifiante n'est collectée. Le scoring est réalisé par ton agent IA,
        pas par nos serveurs. Conforme RGPD.
      </p>

    </div>
  )
}
