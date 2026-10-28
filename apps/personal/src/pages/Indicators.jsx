import { Link } from 'react-router-dom'
import promptSource from '../../../../research/kys-prompt.md?raw'

const categoryNames = {
  'Cognitive Architecture': 'Architecture cognitive',
  'Social Interface': 'Interface sociale',
  'Semiotics & Language': 'Sémiotique et langage',
  'Axiology & Arbitration': 'Axiologie et arbitrage',
  'Flow Dynamics': 'Dynamique des échanges',
  'Derived Scores': 'Indices dérivés',
  'Cogentia+': 'Cogentia+',
}

const indicators = [...promptSource.matchAll(/\{\s*"rank":\s*(\d+),\s*"category":\s*"([^"]+)",\s*"name":\s*"([^"]+)"/g)]
  .map(([, rank, category, name]) => ({ rank: Number(rank), category, name }))
  .filter(({ rank }) => rank >= 1 && rank <= 73)

const presentations = [
  ['Big Five · OCEAN', 'Cinq grandes dimensions descriptives : ouverture, conscienciosité, extraversion, agréabilité et stabilité émotionnelle.'],
  ['MBTI · 16 types', 'Quatre préférences résumées en lettres. Les dimensions peuvent être proches du centre et ne définissent pas une identité fixe.'],
  ['DISC', 'Une lecture des tendances comportementales autour de la décision, de l’influence, de la stabilité et de la précision.'],
  ['Ennéagramme · 9 types', 'Une typologie de développement personnel. Les scores doivent rester des pistes de réflexion, pas des motivations établies.'],
]

export default function Indicators() {
  const groups = indicators.reduce((result, indicator) => {
    ;(result[indicator.category] ||= []).push(indicator)
    return result
  }, {})
  return (
    <div className="max-w-5xl mx-auto px-4 py-12 md:py-20 space-y-14">
      <header className="max-w-3xl space-y-5">
        <p className="font-mono text-signal text-xs tracking-widest uppercase">Explorer le modèle Cogentia</p>
        <h1 className="font-display text-3xl md:text-5xl font-bold text-bright">73 indicateurs, plusieurs façons de lire un portrait</h1>
        <p className="text-dim leading-relaxed">Le modèle propose 73 estimations à partir des réponses d’un agent conversationnel. Elles ne proviennent pas d’un test standardisé ni d’un échantillon représentatif validé : un percentile affiché dans un ancien résultat ne doit pas être interprété comme une norme psychométrique établie.</p>
        <Link className="btn-primary" to="/snapshot">Commencer par le miroir de mon agent →</Link>
      </header>

      <section className="space-y-5" aria-labelledby="indicator-list-title">
        <div><h2 id="indicator-list-title" className="font-display text-2xl font-semibold text-bright">Les 73 indicateurs du modèle</h2><p className="text-sm text-dim mt-2">La liste et les catégories proviennent du prompt Cogentia version 1. L’agent formule des estimations; elles ne mesurent pas une capacité clinique.</p></div>
        <div className="grid sm:grid-cols-2 gap-4">
          {Object.entries(groups).map(([category, items]) => (
            <details key={category} className="card group">
              <summary className="cursor-pointer font-display font-semibold text-bright">{categoryNames[category] || category}<span className="font-mono text-xs text-dim ml-2">{items.length}</span></summary>
              <ol className="mt-4 space-y-2 list-decimal pl-5 text-sm text-dim">
                {items.map(({ rank, name }) => <li key={rank}>{name}</li>)}
              </ol>
            </details>
          ))}
        </div>
        <p className="text-xs text-muted">{indicators.length} indicateurs trouvés dans la source. Les sept scores dérivés font partie de cette liste; leur présence ne les rend pas indépendants des autres estimations.</p>
      </section>

      <section className="space-y-5" aria-labelledby="presentations-title">
        <div><h2 id="presentations-title" className="font-display text-2xl font-semibold text-bright">Des présentations familières</h2><p className="text-sm text-dim mt-2">Les anciennes analyses pouvaient proposer quatre lectures typologiques en plus du détail Cogentia. Elles sont des cadres de présentation différents des mêmes estimations, pas quatre validations indépendantes.</p></div>
        <div className="grid sm:grid-cols-2 gap-4">{presentations.map(([title, description]) => <article key={title} className="card"><h3 className="font-display text-lg font-semibold text-bright mb-2">{title}</h3><p className="text-sm text-dim leading-relaxed">{description}</p></article>)}</div>
        <p className="text-xs text-muted">Les anciens écrans de résultat et les formules de conversion sont encore dans le dépôt, mais leur collecte et leur stockage dépendaient des services Supabase et Netlify. Le parcours anonyme actuel ne calcule pas encore ces présentations. Cette page rétablit l’exploration du modèle sans simuler un résultat personnel.</p>
      </section>

      <section className="card space-y-4">
        <h2 className="font-display text-xl font-semibold text-bright">Le parcours disponible aujourd’hui</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-dim"><li>Choisissez un agent et copiez son prompt.</li><li>Collez sa réponse pour voir ses affirmations dans un portrait lisible.</li><li>Examinez, corrigez et comparez les réponses localement.</li></ol>
        <div className="flex flex-wrap gap-3"><Link className="btn-primary" to="/snapshot">Interroger mon agent</Link><Link className="btn-ghost" to="/mirror">Ouvrir le miroir</Link></div>
      </section>
    </div>
  )
}
