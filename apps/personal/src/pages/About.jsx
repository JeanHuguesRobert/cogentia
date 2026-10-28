import { Link } from 'react-router-dom'

const PRINCIPLES = [
  ['Visible', 'L’agent explicite ce qu’il pense savoir, ce qu’il infère et ce qu’il ignore.'],
  ['Contestable', 'Vous pouvez confirmer, nuancer, rejeter ou demander qu’un élément ne soit pas conservé.'],
  ['Portable', 'Le résultat corrigé peut être exporté et réutilisé avec un autre agent.'],
  ['Non clinique', 'Le Snapshot n’est ni un diagnostic, ni un test psychométrique, ni une définition de votre personne.'],
]

export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-14 md:py-20 animate-slide-up space-y-12">
      <header className="max-w-3xl">
        <p className="font-mono text-signal text-xs tracking-widest uppercase mb-4">Comprendre KYS</p>
        <h1 className="font-display text-3xl md:text-5xl font-bold text-bright mb-5">Un miroir de la relation, pas une vérité sur la personne</h1>
        <p className="font-body text-dim leading-relaxed">
          Au fil des conversations, un agent peut retenir des éléments sur vous, en déduire d’autres et se tromper. KYS rend visible ce qu’il accepte d’en dire afin que vous puissiez l’examiner et garder le dernier mot.
        </p>
      </header>

      <section className="card space-y-4">
        <h2 className="font-display text-2xl font-semibold text-bright">Venir par curiosité, repartir avec plus de prise</h2>
        <p className="font-body text-sm text-dim leading-relaxed">On peut vouloir savoir ce que son agent a retenu, craindre d’être surveillé, découvrir qu’il nous connaît mieux — ou moins bien — qu’on le pensait, ou simplement apprendre à mieux s’en servir. Cogentia accueille ces questions sans demander de croire l’agent sur parole.</p>
        <p className="font-body text-sm text-dim leading-relaxed">En examinant souvenirs, déductions et incertitudes, vous pouvez trouver ce qui vous est utile, montrer une erreur et préciser vos attentes. C’est une première prise de contrôle, limitée mais concrète, sur une relation qui peut prendre de l’importance avec le temps.</p>
        <p className="font-body text-sm text-dim leading-relaxed">Il existe aussi un risque plus large : les profils personnels peuvent servir des intérêts qui ne sont pas ceux de la personne concernée. Une plateforme qui manipule des données et des inférences peut avoir des incitations commerciales à segmenter, personnaliser ou orienter l’expérience. C’est un risque de gouvernance à examiner, pas une preuve que telle plateforme a fait tel usage.</p>
        <p className="font-body text-sm text-dim leading-relaxed"><strong className="text-bright">Limite importante :</strong> l’agent décrit ce qu’il sait ou infère dans cette conversation. Cogentia ne lit pas les journaux du fournisseur et ne peut pas établir ce que celui-ci conserve en arrière-plan. Le prompt et votre demande sont envoyés au service d’IA que vous choisissez; le parcours KYS ne transmet pas la conversation brute à Cogentia.</p>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        {PRINCIPLES.map(([title, description]) => (
          <article key={title} className="card">
            <h2 className="font-display text-xl font-semibold text-bright mb-2">{title}</h2>
            <p className="font-body text-sm text-dim leading-relaxed">{description}</p>
          </article>
        ))}
      </section>

      <section className="card space-y-4">
        <h2 className="font-display text-2xl font-semibold text-bright">Ce qui se passe techniquement</h2>
        <ol className="font-body text-sm text-dim leading-relaxed space-y-3 list-decimal pl-5">
          <li>Vous copiez un prompt et l’exécutez chez l’agent que vous utilisez déjà.</li>
          <li>L’agent produit un petit objet JSON structuré, sans transmettre la conversation source à Cogentia.</li>
          <li>Votre navigateur affiche les affirmations et enregistre localement vos décisions.</li>
          <li>Vous pouvez produire un prompt de correction et exporter un brouillon personnel.</li>
        </ol>
        <p className="font-mono text-xs text-muted">Le parcours initial n’utilise ni compte, ni clé API, ni enregistrement Supabase.</p>
      </section>

      <section className="card space-y-4">
        <h2 className="font-display text-2xl font-semibold text-bright">KYS Snapshot et KYS Profile</h2>
        <p className="font-body text-sm text-dim leading-relaxed">
          Le MVP produit un <strong className="text-bright">KYS Snapshot</strong> : une représentation provisoire, personnelle et contestable. Ce brouillon n’est pas certifié et ne donne aucun droit d’usage à un tiers.
        </p>
        <p className="font-body text-sm text-dim leading-relaxed">
          Un futur <strong className="text-bright">KYS Profile</strong> pourrait devenir une projection limitée et finalisée d’un corpus, accompagnée de règles de consentement, de révocation, de contestation et d’audit. Cogentia vise à terme un <strong className="text-bright">Personal Digital Twin</strong> dont la personne comprend et gouverne les capacités. PrivAI porte l’ambition d’un cadre fiduciaire non lucratif pour cette évolution.
        </p>
        <p className="font-body text-sm text-dim leading-relaxed">
          En cas de création et de succès de PrivAI comme organisme de vérification, l’ambition serait de vérifier et, éventuellement, certifier les conditions, limites et garanties attachées à certains usages — pas de certifier qu’un portrait dit vrai. PrivAI n’est pas aujourd’hui un organisme de certification opérationnel.
        </p>
      </section>

      <section className="card border-signal/30">
        <h2 className="font-display text-2xl font-semibold text-bright mb-3">Le critère de réussite</h2>
        <p className="font-body text-bright leading-relaxed mb-5">
          Vous êtes devenu plus capable de comprendre, gouverner, contester, quitter et transmettre la relation construite avec votre agent.
        </p>
        <Link to="/snapshot" className="btn-primary">Créer mon Snapshot →</Link>
      </section>
    </div>
  )
}
