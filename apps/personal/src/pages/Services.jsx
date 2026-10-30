import { Link } from 'react-router-dom'

const SERVICES = [
  { title: 'Que savent mes IA de moi ?', description: 'Interrogez votre propre IA, examinez ses déclarations, corrigez et exportez.', href: '/snapshot', tag: 'KYS · Existant' },
  { title: 'Comprendre mes droits au RSA', description: 'Un premier accompagnement avec votre IA personnelle, à vérifier auprès des services officiels.', href: '/rights', tag: 'Serenia · Expérimental' },
]
const PLANNED = ['Prime d’activité', 'Aides au logement', 'AAH', 'ASPA']

export default function Services() {
  return <div className="max-w-5xl mx-auto px-4 py-12 md:py-20 space-y-10">
    <header className="space-y-4">
      <p className="font-mono text-signal text-xs tracking-widest uppercase">KYS Services · IA pour Tous / IA pour Chacun</p>
      <h1 className="font-display text-3xl md:text-5xl font-bold text-bright">Des services utiles, avec votre propre IA</h1>
      <p className="text-dim text-lg">Des méthodes et ressources d’intérêt commun, que vous pouvez utiliser avec votre assistant personnel. Aucun compte Cogentia n’est requis pour commencer.</p>
      <p className="text-sm text-muted">Vos échanges avec votre IA dépendent de son fournisseur. Un service KYS n'obtient aucun mandat d'agir à votre place par sa seule utilisation.</p>
    </header>
    <section aria-labelledby="available-title" className="space-y-4">
      <h2 id="available-title" className="font-display text-2xl font-semibold text-bright">Parcours disponibles</h2>
      <div className="grid md:grid-cols-2 gap-4">{SERVICES.map(service => <article className="card space-y-3" key={service.href}>
        <p className="font-mono text-xs text-signal">{service.tag}</p>
        <h3 className="font-semibold text-xl text-bright">{service.title}</h3>
        <p className="text-sm text-dim">{service.description}</p>
        <Link className="btn-primary inline-flex" to={service.href}>Découvrir ce parcours →</Link>
      </article>)}</div>
    </section>
    <section aria-labelledby="planned-title" className="space-y-3">
      <h2 id="planned-title" className="font-display text-2xl font-semibold text-bright">Autres droits envisagés</h2>
      <p className="text-sm text-dim">Ces services sont en projet et ne sont pas encore disponibles.</p>
      <div className="flex flex-wrap gap-2">{PLANNED.map(name => <span key={name} className="border border-slate-700 rounded px-3 py-2 text-sm text-dim">{name} · En projet</span>)}</div>
      <Link className="btn-ghost inline-flex" to="/waitlist?source=kys-services">Être informé de l’ouverture du pilote →</Link>
    </section>
    <section className="card space-y-2">
      <h2 className="font-display text-xl font-semibold text-bright">Une approche sous mandat</h2>
      <p className="text-sm text-dim">Les connaissances et méthodes sont partagées ; vos informations personnelles et vos décisions restent sous votre contrôle. Aucun paiement ni transaction marchande n’est proposé.</p>
      <a className="text-signal underline text-sm" href={`${import.meta.env.BASE_URL}kys-services.json`} target="_blank" rel="noreferrer">Consulter le catalogue public au format JSON</a>
    </section>
  </div>
}
