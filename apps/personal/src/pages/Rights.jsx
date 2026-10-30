import { useState } from 'react'
import { Link } from 'react-router-dom'

const PROMPT = `Je souhaite vérifier si je pourrais bénéficier du RSA en France. Tu es mon assistant personnel, sans mandat pour agir ou transmettre des informations à ma place.

Pose-moi les questions nécessaires une par une, en commençant par mon âge, ma résidence, ma composition de foyer et les ressources de mon foyer. Ne me demande pas de numéro de sécurité sociale, de mot de passe ni de pièce d'identité. N'invente pas les réponses et demande mon accord avant de réutiliser des informations déjà connues de toi.

Distingue explicitement les informations confirmées, les inconnues et les règles dont tu n'as pas vérifié la version actuelle. Signale les situations particulières (moins de 25 ans, études, travailleurs indépendants, étrangers, prestations et autres ressources). Ne promets jamais une ouverture de droit.

Explique ensuite comment vérifier le résultat avec le simulateur officiel Mes droits sociaux et comment déposer une demande auprès de la CAF ou de la MSA. Explique aussi les obligations associées au RSA. Ne contacte aucun tiers et ne réalise aucune démarche sans mon autorisation explicite pour l'acte concerné.`

const UPCOMING = [
  ['Prime d’activité', 'Pour les personnes qui travaillent avec des revenus modestes.'],
  ['Aides au logement', 'Pour explorer les prestations liées au logement.'],
  ['AAH', 'Pour examiner les droits associés au handicap.'],
  ['ASPA', 'Pour explorer les ressources minimales des personnes âgées.'],
]

export default function Rights() {
  const [copied, setCopied] = useState(false)
  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(PROMPT)
      setCopied(true)
    } catch {
      setCopied(false)
      const box = document.getElementById('rights-prompt')
      box?.focus()
      box?.select()
    }
  }
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-20 space-y-10">
      <header className="space-y-4">
        <p className="font-mono text-signal text-xs tracking-widest uppercase">Cogentia Personal · Serenia</p>
        <h1 className="font-display text-3xl md:text-5xl font-bold text-bright">Et si vous aviez droit au RSA ?</h1>
        <p className="text-lg text-dim">Un premier parcours pour examiner vos droits avec votre propre assistant IA, sans compte Cogentia et sans transmettre votre situation personnelle à notre serveur.</p>
        <p className="text-sm text-dim">Vous n'avez pas d'IA personnelle ? Utilisez directement le <a className="text-signal underline" href="https://www.mesdroitssociaux.gouv.fr/simulateurs/rsa-pa" target="_blank" rel="noreferrer">simulateur public Mes droits sociaux</a>, ou rapprochez-vous de la CAF, de la MSA ou d'un service d'accompagnement.</p>
      </header>
      <section className="card space-y-4" aria-labelledby="rights-start">
        <h2 id="rights-start" className="font-display text-2xl font-semibold text-bright">Commencer avec votre IA personnelle</h2>
        <p className="text-dim text-sm">1. Copiez les instructions ci-dessous. 2. Collez-les dans ChatGPT, Claude ou un autre assistant que vous utilisez. 3. Discutez avec lui, puis vérifiez les résultats auprès des services officiels.</p>
        <label htmlFor="rights-prompt" className="block text-sm text-bright">Instructions proposées — à adapter dans votre assistant</label>
        <textarea id="rights-prompt" className="input w-full min-h-56 text-sm" readOnly value={PROMPT} aria-label="Instructions à copier dans votre assistant personnel"/>
        <button type="button" className="btn-primary" onClick={copyPrompt}>{copied ? 'Instructions copiées' : 'Copier les instructions'}</button>
        <p className="text-xs text-muted">Votre conversation a lieu chez le fournisseur d'IA que vous choisissez, conformément à ses règles de confidentialité. Le texte de vos réponses n'est ni demandé ni enregistré par ce parcours Cogentia. Vérifiez les données sensibles avant tout partage.</p>
      </section>
      <section className="card space-y-3" aria-labelledby="rights-check">
        <h2 id="rights-check" className="font-display text-xl font-semibold text-bright">Avant toute demande</h2>
        <p className="text-dim text-sm">Une IA peut se tromper sur une règle ou un montant. Ce parcours n'est ni une simulation réglementaire certifiée ni une décision d'éligibilité. Seule l'administration compétente peut décider et verser la prestation.</p>
        <a className="btn-ghost inline-flex" href="https://www.mesdroitssociaux.gouv.fr/simulateurs/rsa-pa" target="_blank" rel="noreferrer">Vérifier sur Mes droits sociaux →</a>
        <a className="text-signal underline block text-sm" href="https://www.caf.fr/" target="_blank" rel="noreferrer">Site de la CAF</a>
      </section>
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold text-bright">D'autres droits sont à l'étude</h2>
        <p className="text-dim text-sm">Ces parcours sont envisagés mais ne sont pas encore proposés par Cogentia Personal.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {UPCOMING.map(([title, description]) => (
            <article key={title} className="card space-y-2">
              <h3 className="font-semibold text-bright">{title}</h3>
              <p className="text-sm text-dim">{description}</p>
              <span className="text-xs text-muted">En projet</span>
            </article>
          ))}
        </div>
      </section>
      <section className="card space-y-3">
        <h2 className="font-display text-xl font-semibold text-bright">Être informé de la suite</h2>
        <p className="text-sm text-dim">Laissez votre adresse email dans la file d'attente existante pour connaître l'ouverture du pilote. Ne communiquez dans ce formulaire aucune information sur vos revenus, votre santé ou votre dossier RSA.</p>
        <p className="text-xs text-muted">La liste actuelle prévoit uniquement un message à l'ouverture du pilote, et non des informations régulières sur chaque nouveau droit.</p>
        <Link className="btn-primary inline-flex" to="/waitlist?source=rights-rsa">Rejoindre la file d'attente →</Link>
      </section>
    </div>
  )
}
