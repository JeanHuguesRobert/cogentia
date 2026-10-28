import { Link } from 'react-router-dom'
import BlindSpotCard from '../components/BlindSpotCard'

const STEPS = [
  ['1', 'Satisfaire sa curiosité', 'Demandez à votre agent ce qu’il croit savoir de vous et regardez ce qu’il répond.'],
  ['2', 'Comprendre et apprendre', 'Distinguez souvenirs, déductions et erreurs possibles; voyez aussi ce qui aiderait à mieux travailler avec lui.'],
  ['3', 'Prendre la main, pas à pas', 'Corrigez son portrait, formulez vos limites et gardez une copie portable de ce que vous choisissez.'],
]

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16 md:py-28 animate-slide-up">
      <section className="max-w-3xl">
        <p className="font-mono text-signal text-xs tracking-widest uppercase mb-5">Cogentia · KYS Snapshot · Know Your Self</p>
        <h1 className="font-display text-4xl md:text-6xl font-bold text-bright leading-tight mb-6">
          Curieux de ce que votre IA croit savoir de vous ?
        </h1>
        <p className="font-body text-lg text-dim leading-relaxed mb-8">
          Un agent peut retenir des éléments, en déduire d’autres et aussi se tromper. KYS rend visible ce qu’il dit savoir de vous, pour que vous puissiez le comprendre, le corriger et choisir comment vous en servir. Ces réponses ne définissent pas qui vous êtes.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <Link className="btn-primary justify-center" to="/snapshot">Interroger mon agent →</Link>
          <Link className="btn-ghost justify-center" to="/mirror">Coller une réponse</Link>
          <Link className="btn-ghost justify-center" to="/waitlist?source=home">Suivre l’ouverture du futur pilote</Link>
          <span className="font-body text-xs text-muted">Sans compte · sans connexion à votre agent · sans conversation brute</span>
        </div>
      </section>

      <section className="mt-12 card space-y-4" aria-labelledby="why-title">
        <p className="font-mono text-signal text-xs tracking-widest uppercase">Pourquoi rendre cela visible ?</p>
        <h2 id="why-title" className="font-display text-2xl font-semibold text-bright">La curiosité peut ouvrir un chemin vers plus de maîtrise</h2>
        <p className="font-body text-sm text-dim leading-relaxed">Face à la mémoire d’un agent, on peut craindre d’être surveillé, ne pas mesurer tout ce qu’il a retenu ou déduit, ou vouloir apprendre à mieux travailler avec lui. Ces questions méritent mieux qu’une confiance aveugle ou qu’une inquiétude sans prise.</p>
        <p className="font-body text-sm text-dim leading-relaxed">Cogentia vous aide à examiner les affirmations de votre agent, à distinguer ses souvenirs de ses suppositions et à garder la main sur ce que vous confirmez ou corrigez. Le parcours actuel montre ce que l’agent accepte de formuler : il ne vérifie pas les journaux internes du fournisseur et ne peut pas prouver qu’aucune donnée n’est conservée ailleurs.</p>
        <p className="font-body text-sm text-dim leading-relaxed">C’est une première condition pour envisager un futur <strong className="text-bright">Cogentia Personal Digital Twin</strong> utile et digne d’une confiance lucide : un jumeau que l’on comprend, que l’on peut contester et dont on peut gouverner les usages.</p>
        <p className="font-body text-xs text-muted leading-relaxed">PrivAI porte l’ambition d’un cadre fiduciaire et de garanties vérifiables. Une éventuelle vérification ou certification dépendrait de la création et de la légitimité d’un tel organisme; aucune certification PrivAI n’est proposée aujourd’hui.</p>
        <Link className="btn-ghost inline-flex" to="/more">Découvrir le projet et ses sources →</Link>
      </section>

      <section className="mt-6 grid md:grid-cols-2 gap-4" aria-label="Gains et risques à connaître">
        <article className="card space-y-3">
          <h2 className="font-display text-xl font-semibold text-bright">Ce que vous pouvez y gagner</h2>
          <p className="font-body text-sm text-dim leading-relaxed">Mieux comprendre les souvenirs et les déductions de votre agent, corriger ce qui vous semble faux, exprimer vos préférences plus clairement et découvrir comment obtenir une aide qui vous convient mieux.</p>
        </article>
        <article className="card space-y-3">
          <h2 className="font-display text-xl font-semibold text-bright">Le risque à garder en vue</h2>
          <p className="font-body text-sm text-dim leading-relaxed">Un profil peut être inexact et devenir sensible par les usages qu’on en fait. Une plateforme qui détient des données et des profils peut avoir intérêt à les exploiter pour segmenter, personnaliser ou orienter des services. Les déclarations d’un agent ne permettent ni de confirmer ni d’écarter ces usages.</p>
          <p className="font-body text-xs text-muted leading-relaxed">Cogentia ne mène pas d’audit des plateformes. Ici, vous examinez le portrait formulé par votre agent; vous gardez le prompt et sa réponse sous votre contrôle dans ce parcours.</p>
        </article>
      </section>

      <section className="mt-10 card border-signal/30 space-y-4">
        <p className="font-mono text-signal text-xs tracking-widest uppercase">Explorer aussi</p>
        <h2 className="font-display text-2xl font-semibold text-bright">73 indicateurs et des lectures familières</h2>
        <p className="text-sm text-dim leading-relaxed">Découvrez les dimensions du modèle et les présentations autrefois proposées : Big Five, MBTI, DISC et Ennéagramme. Elles restent des lectures estimatives, sans certification psychométrique.</p>
        <Link className="btn-ghost" to="/indicators">Explorer les indicateurs et les présentations →</Link>
      </section>

      <BlindSpotCard />

      <section className="grid md:grid-cols-3 gap-4 mt-20">
        {STEPS.map(([number, title, description]) => (
          <article key={number} className="card">
            <span className="font-mono text-signal text-xs">ÉTAPE {number}</span>
            <h2 className="font-display text-xl font-semibold text-bright mt-4 mb-2">{title}</h2>
            <p className="font-body text-sm text-dim leading-relaxed">{description}</p>
          </article>
        ))}
      </section>

      <section className="mt-12 card border-signal/20 bg-panel/30">
        <h2 className="font-display text-xl font-semibold text-bright mb-3">Ce que KYS ne prétend pas faire</h2>
        <p className="font-body text-sm text-dim leading-relaxed max-w-3xl">
          KYS ne produit ni diagnostic, ni vérité psychométrique, ni définition définitive de votre personne. Il montre un instantané de la représentation formulée par un agent dans un contexte donné, puis vous permet de la corriger.
        </p>
      </section>

      <p className="font-body text-xs text-muted leading-relaxed mt-8 max-w-3xl">
        Le résultat initial est un KYS Snapshot personnel. Il ne constitue pas un KYS Profile certifié. Les futurs profils limités et finalisés seront gouvernés dans le cadre fiduciaire non lucratif de PrivAI.
      </p>
    </div>
  )
}
