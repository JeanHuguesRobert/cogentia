import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Auth() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode,     setMode]     = useState('signin') // 'signin' | 'signup'
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [status,   setStatus]   = useState('idle')  // 'idle' | 'loading' | 'error' | 'success'
  const [message,  setMessage]  = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('loading')
    setMessage(null)

    const fn = mode === 'signup' ? signUp : signIn
    const { error } = await fn(email, password)

    if (error) {
      setStatus('error')
      setMessage(error.message)
      return
    }

    setStatus('success')
    navigate('/history')
  }

  return (
    <div className="max-w-sm mx-auto px-6 py-24 animate-slide-up">

      <p className="font-mono text-signal text-xs tracking-widest uppercase mb-6">
        Compte PrivAI
      </p>

      <h1 className="font-display text-3xl font-bold text-bright mb-2">
        {mode === 'signup' ? 'Créer un compte' : 'Connexion'}
      </h1>
      <p className="font-body text-dim text-sm mb-10">
        {mode === 'signup'
          ? 'Tes analyses anonymes seront automatiquement rattachées.'
          : 'Retrouve tes profils Cogentia.'
        }
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">

        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            placeholder="toi@exemple.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label className="label">Mot de passe</label>
          <input
            type="password"
            className="input"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={8}
          />
        </div>

        {message && (
          <p className={`font-mono text-xs ${status === 'error' ? 'text-red-400' : 'text-green-400'}`}>
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="btn-primary w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {status === 'loading'
            ? 'Chargement…'
            : mode === 'signup' ? 'Créer le compte' : 'Se connecter'
          }
        </button>

      </form>

      <button
        onClick={() => { setMode(m => m === 'signup' ? 'signin' : 'signup'); setMessage(null) }}
        className="mt-6 font-body text-xs text-muted hover:text-dim transition-colors"
      >
        {mode === 'signup'
          ? 'Déjà un compte ? Se connecter'
          : 'Pas encore de compte ? S\'inscrire'
        }
      </button>

    </div>
  )
}
