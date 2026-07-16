import { Link } from 'react-router-dom'

const STEPS = [
  ['1', 'Interrogez votre agent', 'Copiez un prompt court dans ChatGPT, Claude, Gemini, Mistral ou un autre agent.'],
  ['2', 'Examinez son portrait', 'Distinguez ce qu’il pense savoir, ce qu’il suppose et ce qu’il reconnaît ignorer.'],
  ['3', 'Gardez le dernier mot', 'Confirmez, nuancez, rejetez ou marquez un élément comme ne devant pas être conservé.'],
]

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16 md:py-28 animate-slide-up">
      <section className="max-w-3xl">
        <p className="font-mono text-signal text-xs tracking-widest uppercase mb-5">KYS Snapshot · Know Your Self</p>
        <h1 className="font-display text-4xl md:text-6xl font-bold text-bright leading-tight mb-6">
          Voyez ce que votre IA croit savoir de vous.
        </h1>
        <p className="font-body text-lg text-dim leading-relaxed mb-8">
          Votre agent s’est déjà construit une représentation de vos préférences, de vos sujets et de votre manière de travailler. KYS la rend visible, contestable et portable.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <Link className="btn-primary justify-center" to="/snapshot">Interroger mon agent →</Link>
          <span className="font-body text-xs text-muted">Sans compte · sans connexion à votre agent · sans conversation brute</span>
        </div>
      </section>

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
