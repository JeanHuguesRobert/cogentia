import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { getOrCreateSessionId } from '../lib/anonymousSession'

const SUPPORTED = [
  { host: 'chat.openai.com',   label: 'ChatGPT' },
  { host: 'claude.ai',         label: 'Claude'  },
  { host: 'gemini.google.com', label: 'Gemini'  },
]

function detectPlatform(url) {
  try {
    const { hostname } = new URL(url)
    return SUPPORTED.find(s => hostname.includes(s.host))?.label ?? 'Autre'
  } catch { return null }
}

// ─── Onglets méthode ──────────────────────────────────────────────────────────
const METHODS = [
  { id: 'auto',  label: 'Automatique', desc: 'On récupère la conversation depuis l\'URL.' },
  { id: 'paste', label: 'Coller',      desc: 'Tu colles directement la réponse JSON de ton agent.' },
  { id: 'file',  label: 'Fichier',     desc: 'Tu importes un fichier .json ou .txt.' },
]

export default function Submit() {
  const { user }    = useAuth()
  const navigate    = useNavigate()
  const { state }   = useLocation()
  const promptVersionId = state?.promptVersionId ?? null

  const [method,   setMethod]   = useState('auto')
  const [url,      setUrl]      = useState('')
  const [platform, setPlatform] = useState(null)
  const [pasted,   setPasted]   = useState('')
  const [file,     setFile]     = useState(null)
  const [status,   setStatus]   = useState('idle')
  const [error,    setError]    = useState(null)

  const handleUrlChange = (e) => {
    setUrl(e.target.value)
    setPlatform(detectPlatform(e.target.value))
  }

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 512 * 1024) { setError('Fichier trop volumineux (max 512 Ko)'); return }
    setFile(f)
    setError(null)
  }

  // Extrait le JSON depuis un texte brut (même logique que le backend)
  const extractJson = (text) => {
    const m = text.match(/```json\s*(\{[\s\S]*?"cogentia_version"[\s\S]*?\})\s*```/)
    if (m) return m[1]
    const m2 = text.match(/(\{[\s\S]*?"cogentia_version"[\s\S]*?\})/)
    if (m2) return m2[1]
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!url.trim()) { setError('L\'URL de la conversation est requise dans tous les cas.'); return }
    setStatus('loading'); setError(null)

    let rawJson = null

    // Méthode paste : extraction côté client avant envoi
    if (method === 'paste') {
      rawJson = extractJson(pasted)
      if (!rawJson) {
        setStatus('idle')
        setError('Aucun bloc JSON Cogentia détecté dans le texte collé. Vérifie que la réponse de ton agent est complète.')
        return
      }
    }

    // Méthode fichier : lecture du fichier
    if (method === 'file') {
      if (!file) { setStatus('idle'); setError('Sélectionne un fichier.'); return }
      try {
        const text = await file.text()
        rawJson = extractJson(text)
        if (!rawJson) {
          setStatus('idle')
          setError('Aucun bloc JSON Cogentia trouvé dans le fichier.')
          return
        }
      } catch {
        setStatus('idle'); setError('Impossible de lire le fichier.'); return
      }
    }

    // Création de l'analyse en base
    const { data, error: dbError } = await supabase
      .from('analyses')
      .insert({
        conversation_url:     url.trim(),
        prompt_version_id:    promptVersionId,
        status:               'pending',
        collection_method:    method,
        user_id:              user?.id ?? null,
        anonymous_session_id: user ? null : getOrCreateSessionId(),
      })
      .select('id')
      .single()

    if (dbError) { setStatus('error'); setError(dbError.message); return }

    // Déclenchement du traitement (fire & forget)
    // Si rawJson est fourni, la fonction Netlify saute l'étape fetch
    fetch('/api/process-analysis', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ analysisId: data.id, rawJson }),
    }).catch(console.error)

    navigate(`/results/${data.id}`)
  }

  const urlOk = url.trim().length > 0

  return (
    <div className="max-w-xl mx-auto px-6 py-24 animate-slide-up">

      <p className="font-mono text-signal text-xs tracking-widest uppercase mb-6">Étape 02 / 03</p>
      <h1 className="font-display text-3xl font-bold text-bright mb-3">Soumettre les résultats</h1>
      <p className="font-body text-dim text-sm mb-10">
        Colle toujours le lien de la conversation — il sert de trace horodatée.
        Choisis ensuite comment transmettre la réponse de ton agent.
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* URL — toujours requis */}
        <div>
          <label className="label">URL de la conversation <span className="text-signal">*</span></label>
          <input
            type="url"
            className="input"
            placeholder="https://chat.openai.com/share/…"
            value={url}
            onChange={handleUrlChange}
            required
          />
          {platform && (
            <p className="font-mono text-xs text-signal mt-2 animate-fade-in">✓ {platform} détecté</p>
          )}
          {url && !platform && (
            <p className="font-mono text-xs text-muted mt-2">Plateforme non reconnue — l'analyse reste possible</p>
          )}
        </div>

        {/* Méthode de collecte */}
        <div>
          <label className="label">Méthode de collecte du résultat</label>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {METHODS.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => { setMethod(m.id); setError(null) }}
                className={`px-3 py-2.5 rounded-lg text-xs font-body text-left border transition-colors duration-150 ${
                  method === m.id
                    ? 'border-signal bg-signal/10 text-bright'
                    : 'border-border text-muted hover:border-dim hover:text-dim'
                }`}
              >
                <span className="block font-semibold mb-0.5">{m.label}</span>
                <span className="block text-muted text-xs leading-snug">{m.desc}</span>
              </button>
            ))}
          </div>

          {/* Méthode auto */}
          {method === 'auto' && (
            <div className="card bg-panel/50 animate-fade-in">
              <p className="font-body text-xs text-dim leading-relaxed">
                On tente de récupérer automatiquement la réponse depuis l'URL.
                Si la page nécessite JavaScript pour s'afficher, le fetch peut échouer —
                dans ce cas, reviens ici et utilise <strong className="text-bright">Coller</strong> ou <strong className="text-bright">Fichier</strong>.
              </p>
            </div>
          )}

          {/* Méthode paste */}
          {method === 'paste' && (
            <div className="space-y-2 animate-fade-in">
              <label className="label">
                Colle ici la réponse complète de ton agent
                <span className="text-muted normal-case font-body ml-2">(le bloc JSON sera extrait automatiquement)</span>
              </label>
              <textarea
                value={pasted}
                onChange={e => setPasted(e.target.value)}
                placeholder={'```json\n{\n  "cogentia_version": "1.0",\n  ...\n}\n```'}
                rows={10}
                className="input resize-y font-mono text-xs"
                required={method === 'paste'}
              />
              {pasted.includes('cogentia_version') && (
                <p className="font-mono text-xs text-signal animate-fade-in">✓ Bloc Cogentia détecté</p>
              )}
            </div>
          )}

          {/* Méthode fichier */}
          {method === 'file' && (
            <div className="animate-fade-in">
              <label className="label">Fichier .json ou .txt exporté depuis ton agent</label>
              <label className={`
                flex flex-col items-center justify-center gap-2
                border-2 border-dashed rounded-lg p-8 cursor-pointer
                transition-colors duration-150
                ${file ? 'border-signal/50 bg-signal/5' : 'border-border hover:border-dim'}
              `}>
                <input
                  type="file"
                  accept=".json,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {file ? (
                  <>
                    <span className="font-mono text-signal text-lg">✓</span>
                    <span className="font-body text-sm text-bright">{file.name}</span>
                    <span className="font-mono text-xs text-muted">{(file.size / 1024).toFixed(1)} Ko</span>
                  </>
                ) : (
                  <>
                    <span className="font-mono text-muted text-2xl">↑</span>
                    <span className="font-body text-sm text-dim">Clique ou glisse un fichier ici</span>
                    <span className="font-mono text-xs text-muted">.json · .txt · max 512 Ko</span>
                  </>
                )}
              </label>
            </div>
          )}
        </div>

        {error && <p className="font-mono text-red-400 text-xs">{error}</p>}

        <button
          type="submit"
          disabled={status === 'loading' || !urlOk}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? 'Envoi en cours…' : 'Analyser →'}
        </button>

      </form>

      {/* Plateformes supportées */}
      <div className="mt-14 pt-8 border-t border-border">
        <p className="label mb-3">Plateformes supportées (collecte auto)</p>
        <div className="flex gap-2 flex-wrap">
          {SUPPORTED.map(s => <span key={s.host} className="tag">{s.label}</span>)}
          <span className="tag text-muted">+ autres (paste/fichier)</span>
        </div>
      </div>

    </div>
  )
}
