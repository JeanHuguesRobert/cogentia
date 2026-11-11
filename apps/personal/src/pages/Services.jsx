import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const CATALOGUE_PATH = 'kys-services.json'
const EXPECTED_CATALOGUE = 'org.cogentia.kys.services.v0.1'
const EXPECTED_SERVICE = 'org.cogentia.kys.service.v0.1'

// Only same-origin, catalogued resources can supply a route; never navigate to
// arbitrary URLs from a downloaded manifest.
function localPath(value, prefix = '/') {
  return typeof value === 'string' && value.startsWith(prefix) &&
    !value.startsWith('//') && !value.includes('..') &&
    !value.includes('?') && !value.includes('#') && !value.includes('\\')
}

async function getJSON(path, signal) {
  const base = import.meta.env.BASE_URL
  const response = await fetch(`${base}${path.replace(/^\//, '')}`, {
    signal,
    credentials: 'omit',
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

export default function Services() {
  const [catalogue, setCatalogue] = useState(null)
  const [services, setServices] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const index = await getJSON(CATALOGUE_PATH, controller.signal)
        if (index.schema !== EXPECTED_CATALOGUE || !Array.isArray(index.services)) {
          throw new Error('Format du catalogue inconnu')
        }
        const entries = await Promise.all(index.services.map(async item => {
          if (!localPath(item.manifest, '/services/')) {
            throw new Error('Chemin de manifeste invalide')
          }
          const service = await getJSON(item.manifest, controller.signal)
          if (service.schema !== EXPECTED_SERVICE || service.id !== item.id ||
              !localPath(service.entry?.web) ||
              service.policy?.account_required !== false ||
              service.policy?.pricing !== 'free') {
            throw new Error('Manifeste de service incohérent')
          }
          return service
        }))
        if (!controller.signal.aborted) {
          setCatalogue(index)
          setServices(entries)
          setError('')
        }
      } catch (reason) {
        if (!controller.signal.aborted) setError('Le catalogue des services est momentanément indisponible. Réessayez ultérieurement.')
      }
    }
    load()
    return () => controller.abort()
  }, [])

  return <div className="max-w-5xl mx-auto px-4 py-12 md:py-20 space-y-10">
    <header className="space-y-4">
      <p className="font-mono text-signal text-xs tracking-widest uppercase">KYS Services · IA pour Tous / IA pour Chacun</p>
      <h1 className="font-display text-3xl md:text-5xl font-bold text-bright">Des services utiles, avec votre propre IA</h1>
      <p className="text-dim text-lg">Des méthodes et ressources d’intérêt commun, utilisables avec votre assistant personnel. Aucun compte Cogentia n’est requis pour commencer.</p>
      <p className="text-sm text-muted">Vos échanges avec votre IA dépendent de son fournisseur. Consulter un service KYS ne constitue pas un mandat d’agir à votre place.</p>
    </header>
    <section aria-labelledby="available-title" className="space-y-4">
      <h2 id="available-title" className="font-display text-2xl font-semibold text-bright">Parcours disponibles</h2>
      {!catalogue && !error && <p role="status" className="text-sm text-dim">Chargement des services…</p>}
      {error && <p role="alert" className="text-sm text-dim">{error}</p>}
      <div className="grid md:grid-cols-2 gap-4">{services.map(service => <article className="card space-y-3" key={service.id}>
        <p className="font-mono text-xs text-signal">{service.display_category} · {service.status === 'experimental' ? 'Expérimental' : service.status}</p>
        <h3 className="font-semibold text-xl text-bright">{service.name}</h3>
        <p className="text-sm text-dim">{service.description}</p>
        <Link className="btn-primary inline-flex" to={service.entry.web}>Découvrir ce parcours →</Link>
      </article>)}</div>
    </section>
    <section aria-labelledby="planned-title" className="space-y-3">
      <h2 id="planned-title" className="font-display text-2xl font-semibold text-bright">Autres droits envisagés</h2>
      <p className="text-sm text-dim">Ces services sont en projet et ne sont pas encore disponibles.</p>
      <div className="grid sm:grid-cols-2 gap-3">{(catalogue?.planned ?? []).map(item => <article key={item.id} className="border border-slate-700 rounded p-3 space-y-1">
        <h3 className="text-sm font-medium text-bright">{item.name} · En projet</h3>
        <p className="text-xs text-dim">{item.description}</p>
      </article>)}</div>
      <Link className="btn-ghost inline-flex" to="/waitlist?source=kys-services">Être informé de l’ouverture du pilote →</Link>
    </section>
    <section className="card space-y-2">
      <h2 className="font-display text-xl font-semibold text-bright">Une approche sous mandat</h2>
      <p className="text-sm text-dim">Les connaissances et méthodes sont partagées ; vos informations personnelles et vos décisions restent sous votre contrôle. Aucun paiement ni transaction marchande n’est proposé.</p>
      <a className="text-signal underline text-sm break-all" href={`${import.meta.env.BASE_URL}${CATALOGUE_PATH}`} target="_blank" rel="noreferrer">Consulter le catalogue public au format JSON</a>
    </section>
  </div>
}
