import { Link } from 'react-router-dom'

const SOURCES = [
  {
    title: 'Pourquoi un jumeau numérique personnel ?',
    level: 'Document de vision · lecture exigeante',
    description: 'Le texte fondateur expose la question de fond : qui peut comprendre, corriger, déplacer et gouverner le modèle numérique construit à votre sujet ? Il décrit une ambition, pas un service déjà disponible.',
    href: 'https://github.com/JeanHuguesRobert/cogentia/blob/main/research/cogentia-digital-twin.md',
  },
  {
    title: 'Comment construire la confiance dans le temps ?',
    level: 'Modèle de recherche · technique',
    description: 'Un jumeau ne devient pas fiable par déclaration. Le document explore les corrections, les retours de la personne, la traçabilité, les limites d’action et la possibilité de changer de fournisseur.',
    href: 'https://github.com/JeanHuguesRobert/cogentia/blob/main/research/digital_twin_trust_model.md',
  },
  {
    title: 'Explorer le Corpus public Cogentia',
    level: 'Sources, propositions et historique',
    description: 'Le dépôt permet de retrouver les documents à leur source, de suivre leurs évolutions et de distinguer les recherches en cours des fonctions déjà présentes dans l’application.',
    href: 'https://github.com/JeanHuguesRobert/cogentia',
  },
]

export default function More() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-14 md:py-20 animate-slide-up space-y-12">
      <header className="max-w-3xl space-y-5">
        <p className="font-mono text-signal text-xs tracking-widest uppercase">Aller plus loin</p>
        <h1 className="font-display text-3xl md:text-5xl font-bold text-bright">Vous êtes venu par curiosité. Explorez à votre rythme.</h1>
        <p className="font-body text-lg text-dim leading-relaxed">Pas besoin d’être spécialiste pour se demander ce qu’un agent a retenu, ce qu’il suppose ou comment mieux travailler avec lui. Voici quelques chemins pour comprendre le projet, ses limites et son ambition.</p>
        <div className="flex flex-wrap gap-3">
          <Link className="btn-primary" to="/snapshot">Commencer avec mon agent →</Link>
          <Link className="btn-ghost" to="/indicators">Voir les 73 indicateurs</Link>
          <Link className="btn-ghost" to="/waitlist?source=more">Être informé de l’ouverture du pilote</Link>
        </div>
      </header>

      <section className="card space-y-4">
        <h2 className="font-display text-2xl font-semibold text-bright">Le point de départ : rendre la relation compréhensible</h2>
        <p className="font-body text-sm text-dim leading-relaxed">Un agent peut réutiliser des informations que vous lui avez données, en tirer des conclusions ou se tromper. Un profil personnel peut aussi devenir utile à la personne — ou servir des intérêts qui ne sont pas les siens. Il est raisonnable de vouloir savoir ce qui est affirmé, sur quelles bases, et ce qui reste hors de votre contrôle.</p>
        <p className="font-body text-sm text-dim leading-relaxed">Cogentia vous permet d’examiner ce que votre agent formule à votre sujet et de corriger votre propre copie. Cette expérience ne vérifie pas les journaux internes d’une plateforme et ne prouve pas l’absence de profilage en arrière-plan : elle constitue un premier moyen de poser les questions et de reprendre prise sur la relation.</p>
      </section>

      <section className="grid md:grid-cols-2 gap-4" aria-label="Projet actuel et ambition future">
        <article className="card space-y-3">
          <p className="font-mono text-signal text-xs tracking-widest uppercase">Aujourd’hui</p>
          <h2 className="font-display text-xl font-semibold text-bright">Un miroir à examiner</h2>
          <p className="font-body text-sm text-dim leading-relaxed">Le KYS Snapshot est une expérience personnelle et provisoire. Elle aide à lire les affirmations d’un agent, à les discuter et à conserver localement vos corrections. Ce n’est ni un diagnostic ni une certification.</p>
          <Link className="inline-flex text-sm text-signal hover:text-bright" to="/about">Comprendre le fonctionnement →</Link>
        </article>
        <article className="card space-y-3">
          <p className="font-mono text-signal text-xs tracking-widest uppercase">À terme · ambition</p>
          <h2 className="font-display text-xl font-semibold text-bright">Un jumeau au service de la personne</h2>
          <p className="font-body text-sm text-dim leading-relaxed">Cogentia vise un futur Personal Digital Twin que la personne puisse comprendre, corriger, limiter, déplacer et révoquer. Ce futur service et ses garanties restent à construire. PrivAI est une ambition de gouvernance, pas un organisme de certification opérationnel aujourd’hui.</p>
        </article>
      </section>

      <section className="space-y-5" aria-labelledby="who-title">
        <div>
          <p className="font-mono text-signal text-xs tracking-widest uppercase">Qui sommes-nous ?</p>
          <h2 id="who-title" className="font-display text-2xl font-semibold text-bright mt-2">Un projet de recherche et de logiciels documenté en public</h2>
        </div>
        <p className="font-body text-sm text-dim leading-relaxed">Cogentia développe des méthodes et des outils pour rendre les connaissances produites par les IA plus lisibles, discutables et gouvernables. Son Corpus public rassemble les sources, les hypothèses, les objections et les évolutions du projet. Il ne faut pas confondre cette ambition avec les fonctions déjà disponibles dans le KYS Snapshot.</p>
        <p className="font-body text-sm text-dim leading-relaxed">Cogentia est aussi présenté dans l’écosystème plus large de FractaVolta. FractaVolta traite d’infrastructures d’énergie, de calcul et de cognition; son site s’adresse notamment aux partenaires, aux opérateurs et aux chercheurs. Le contexte institutionnel explique les liens entre FractaVolta, l’Institut Mariani et C.O.R.S.I.C.A.</p>
        <a className="btn-ghost inline-flex" href="https://fractavolta.com/institutional-context" target="_blank" rel="noreferrer">Lire le contexte institutionnel de FractaVolta ↗</a>
      </section>

      <section className="space-y-5" aria-labelledby="sources-title">
        <div>
          <p className="font-mono text-signal text-xs tracking-widest uppercase">Pour les curieux qui veulent les sources</p>
          <h2 id="sources-title" className="font-display text-2xl font-semibold text-bright mt-2">Du plus accessible au plus technique</h2>
          <p className="font-body text-sm text-dim mt-2">Les documents du Corpus sont souvent écrits pour être précis et réutilisables par des chercheurs ou des agents. Chaque lien vous indique ce que vous allez trouver.</p>
        </div>
        <div className="grid gap-4">
          {SOURCES.map(({ title, level, description, href }) => (
            <article className="card space-y-2" key={href}>
              <p className="font-mono text-xs text-signal">{level}</p>
              <h3 className="font-display text-lg font-semibold text-bright">{title}</h3>
              <p className="font-body text-sm text-dim leading-relaxed">{description}</p>
              <a className="inline-flex text-sm text-signal hover:text-bright" href={href} target="_blank" rel="noreferrer">Ouvrir la source ↗</a>
            </article>
          ))}
        </div>
      </section>

      <p className="font-body text-xs text-muted leading-relaxed">Les liens de cette page mènent à des sources publiques. Une proposition de recherche, une page de présentation ou une fonction dans le logiciel n’ont pas le même statut : vérifiez ce que chaque document dit avoir déjà été réalisé.</p>
    </div>
  )
}
