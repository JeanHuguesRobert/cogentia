import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const CONSENT_VERSION = '2026-10-28-v2'
const STORAGE_KEY = 'cogentia.waitlist.recovery.v1'
const WAITLIST_MODE = import.meta.env.VITE_WAITLIST_MODE === 'true'
const CONTROLLER = import.meta.env.VITE_WAITLIST_CONTROLLER?.trim() || 'CORSE ORGANISANT LA REUNION SUR INTERNET DE COMPETENCES AUTONOMES (C.O.R.S.I.C.A.)'
const CONTACT = import.meta.env.VITE_WAITLIST_PRIVACY_CONTACT?.trim()
const CONTACT_ADDRESS = import.meta.env.VITE_WAITLIST_PRIVACY_ADDRESS?.trim() || '1 cours Paoli, F-20250 Corte'
const RETENTION = import.meta.env.VITE_WAITLIST_RETENTION?.trim() || 'Au plus tard trois ans après la dernière action effectuée par vous dans la liste (inscription, consultation du rang ou réponse reçue).'
const PROCESSING_INFO = import.meta.env.VITE_WAITLIST_PROCESSING_INFO?.trim()
const CONTACT_IS_EMAIL = Boolean(CONTACT && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(CONTACT))
const CONTACT_READY = CONTACT_IS_EMAIL || Boolean(CONTACT_ADDRESS)
const READY = WAITLIST_MODE && Boolean(supabase && CONTROLLER && CONTACT_READY && RETENTION && PROCESSING_INFO)

function hex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

async function createRecoverySecret() {
  const existing = localStorage.getItem(STORAGE_KEY)
  if (existing) return { secret: existing, hash: await hashRecoverySecret(existing) }
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const secret = hex(bytes)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  const hash = hex(new Uint8Array(digest))
  localStorage.setItem(STORAGE_KEY, secret)
  return { secret, hash }
}

async function hashRecoverySecret(secret) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return hex(new Uint8Array(digest))
}

function getAttribution(search) {
  const params = new URLSearchParams(search)
  const clean = (value) => {
    const candidate = value?.trim()
    return candidate && /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(candidate) ? candidate : null
  }
  return {
    source: clean(params.get('source') || params.get('utm_source')) || 'direct',
    campaign: clean(params.get('utm_campaign')),
  }
}

function RightsContact() {
  return (
    <span>
      {CONTACT_IS_EMAIL && <><a className="text-signal underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>; </>}
      {CONTACT_ADDRESS}
    </span>
  )
}

export default function Waitlist() {
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [consented, setConsented] = useState(false)
  const [position, setPosition] = useState(null)
  const [status, setStatus] = useState('idle')

  const handleWithdrawal = async () => {
    const secret = localStorage.getItem(STORAGE_KEY)
    if (!secret || !READY) return
    setStatus('loading')
    try {
      const tokenHash = await hashRecoverySecret(secret)
      const { data, error } = await supabase.rpc('leave_waitlist', { p_token_hash: tokenHash })
      if (error) throw error
      if (data) localStorage.removeItem(STORAGE_KEY)
      setPosition(null)
      setStatus(data ? 'withdrawn' : 'idle')
    } catch {
      setStatus('error')
    }
  }

  useEffect(() => {
    const secret = localStorage.getItem(STORAGE_KEY)
    if (!READY || !secret) return
    const { source, campaign } = getAttribution(location.search)
    hashRecoverySecret(secret)
      .then(tokenHash => supabase.rpc('get_waitlist_position', {
        p_token_hash: tokenHash,
        p_source: source,
        p_campaign: campaign,
      }))
      .then(({ data, error }) => {
        if (error) throw error
        if (data !== null && data !== undefined) {
          setPosition(data)
          setStatus('known')
        }
      })
      .catch(() => {})
  }, [location.search])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!READY || !consented || status === 'loading') return
    setStatus('loading')
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const { secret, hash } = await createRecoverySecret()
      const { source, campaign } = getAttribution(location.search)
      const { data, error } = await supabase.rpc('join_waitlist', {
        p_email: normalizedEmail,
        p_token_hash: hash,
        p_consent_version: CONSENT_VERSION,
        p_source: source,
        p_campaign: campaign,
      })
      if (error) throw error
      if (data?.status === 'joined' || data?.status === 'known' || data?.status === 'reconsented') {
        setPosition(data.position)
        setStatus('success')
      } else {
        setStatus('duplicate')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-14 md:py-20 animate-slide-up space-y-8">
      <header className="space-y-4">
        <p className="font-mono text-signal text-xs tracking-widest uppercase">Cogentia · liste d’attente</p>
        <h1 className="font-display text-3xl md:text-5xl font-bold text-bright">Être informé de l’ouverture du pilote</h1>
        <p className="font-body text-lg text-dim leading-relaxed">Laissez une adresse email pour demander une place dans la file et recevoir un message lorsque le pilote Cogentia Personal ouvrira. Une seule adresse est nécessaire. Nous ne vérifions pas qu’elle fonctionne et nous n’envoyons pas de message de confirmation.</p>
      </header>

      {READY ? (
        <section className="card space-y-5" aria-labelledby="waitlist-form-title">
          <h2 id="waitlist-form-title" className="font-display text-xl font-semibold text-bright">Demander mon inscription</h2>
          {status === 'success' || status === 'known' ? (
            <div role="status" className="space-y-2">
              <p className="text-bright">Votre rang chronologique actuel est <strong>#{position}</strong>.</p>
              <p className="text-sm text-dim">Ce rang est conservé sur cet appareil. Si vous effacez ses données ou changez d’appareil, nous ne pourrons pas le retrouver sans vérifier l’adresse email — vérification que nous ne faisons pas. Le rang peut évoluer si des inscriptions sont retirées.</p>
              <p className="text-sm text-dim">Aucun paiement ni mécanisme de contribution n’est proposé à ce stade. La file suit l’ordre chronologique des inscriptions.</p>
              <button type="button" className="text-sm text-signal underline" onClick={handleWithdrawal} disabled={status === 'loading'}>Retirer mon inscription depuis cet appareil</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm text-bright">Adresse email</span>
                <input className="input w-full" type="email" autoComplete="email" maxLength={320} required value={email} onChange={event => setEmail(event.target.value)} placeholder="vous@exemple.fr" />
                <span className="block text-xs text-muted">Seule la syntaxe est vérifiée. Une erreur de saisie peut empêcher de vous joindre à l’ouverture.</span>
              </label>

              <div className="rounded border border-slate-700 p-4 text-sm text-dim space-y-2" aria-label="Information sur les données personnelles">
                <p><strong className="text-bright">Responsable :</strong> {CONTROLLER}</p>
                <p><strong className="text-bright">Utilisation :</strong> gérer la liste, comprendre par quelle source ou campagne les inscriptions arrivent, mesurer les consultations de rang et vous envoyer un message d’information sur l’ouverture du pilote. Pas de lettre d’information ni d’autres offres.</p>
                <p><strong className="text-bright">Base :</strong> votre consentement, retirable à tout moment auprès de <RightsContact />.</p>
                <p><strong className="text-bright">Destinataires et transferts :</strong> {PROCESSING_INFO}</p>
                <p><strong className="text-bright">Conservation :</strong> {RETENTION}</p>
                <p><strong className="text-bright">Données utilisées :</strong> adresse email, date et version de votre accord, date d’inscription, source et campagne si indiquées dans le lien, consultations du rang, et dates/états des emails envoyés ou reçus. Le contenu des messages n’est pas enregistré ici. L’empreinte du secret de rang est conservée; le secret lui-même reste sur cet appareil.</p>
                <p>Vous pouvez demander l’accès, la rectification, l’effacement, la limitation ou la portabilité de vos données auprès de <RightsContact />. Vous pouvez aussi retirer votre accord à tout moment. Le rang affiché est consultable sur cet appareil grâce à un secret local.</p>
                <p>Cette adresse et votre accord sont nécessaires pour rejoindre la liste; sans eux, aucune inscription ni notification d’ouverture n’est possible. Vous pouvez aussi déposer une réclamation auprès de la <a className="text-signal underline" href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noreferrer">CNIL</a>.</p>
              </div>

              <label className="flex gap-3 items-start text-sm text-dim">
                <input className="mt-1 accent-signal" type="checkbox" checked={consented} onChange={event => setConsented(event.target.checked)} required />
                <span>Je consens à l’utilisation de cette adresse pour gérer mon inscription, mesurer la provenance et l’activité de la liste, et recevoir un message lorsque le pilote ouvrira. Je comprends qu’aucune vérification de l’adresse ni aucun message de confirmation ne sont prévus.</span>
              </label>

              <button className="btn-primary disabled:opacity-50" type="submit" disabled={!consented || status === 'loading'}>
                {status === 'loading' ? 'Inscription…' : 'Rejoindre la file d’attente'}
              </button>
              {status === 'duplicate' && <p role="status" className="text-sm text-dim">La demande n’a pas créé une nouvelle inscription. Pour protéger les adresses déjà enregistrées, le rang n’est pas communiqué dans ce cas.</p>}
              {status === 'error' && <p role="alert" className="text-sm text-red-300">L’inscription n’a pas abouti. Vous pouvez réessayer depuis cet appareil.</p>}
            </form>
          )}
        </section>
      ) : (
        <section className="card border-yellow-700/50 space-y-3" role="status">
          <h2 className="font-display text-xl font-semibold text-bright">La collecte n’est pas encore ouverte</h2>
          <p className="text-sm text-dim leading-relaxed">Le formulaire ne sera activé qu’après configuration du responsable de traitement, du contact pour exercer vos droits, des destinataires et de la durée de conservation, ainsi que de la base de données. Aucun email n’est collecté ici pour l’instant.</p>
        </section>
      )}

      <section className="space-y-3 text-sm text-dim">
        <h2 className="font-display text-xl font-semibold text-bright">Comment le rang est calculé</h2>
        <p>Le rang correspond à l’ordre chronologique des demandes enregistrées. Il n’est pas une promesse d’accès garanti. Une éventuelle campagne de financement participatif et ses effets sur les invitations restent à définir; aucune contribution ne modifie la file aujourd’hui.</p>
      </section>
      <Link className="text-sm text-signal hover:text-bright" to="/more">Comprendre le projet et ses objectifs →</Link>
      {status === 'withdrawn' && <p role="status" className="text-sm text-dim">Votre inscription a été supprimée.</p>}
    </div>
  )
}
