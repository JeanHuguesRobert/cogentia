import { useState } from 'react'
import { Link } from 'react-router-dom'
import promptDocument from '../../../../research/cogentia_prompt_v1.md?raw'

const promptStart = promptDocument.indexOf('## PROMPT (à copier intégralement)')
const promptOpen = promptDocument.indexOf('```', promptStart) + 4
const promptEnd = promptDocument.indexOf('\n[FIN DU PROTOCOLE COGENTIA v1.0]', promptOpen)
const collectionPrompt = promptDocument.slice(promptOpen, promptEnd).trim()

const categoryNames = {
  'Cognitive Architecture': 'Architecture cognitive',
  'Social Interface': 'Interface sociale',
  'Semiotics & Language': 'Sémiotique et langage',
  'Axiology & Arbitration': 'Axiologie et arbitrage',
  'Flow Dynamics': 'Dynamique des échanges',
  'Derived Scores': 'Indices dérivés',
  'Cogentia+': 'Cogentia+',
}

const indicators = [...collectionPrompt.matchAll(/\{\s*"rank":\s*(\d+),\s*"category":\s*"([^"]+)",\s*"name":\s*"([^"]+)"/g)]
  .map(([, rank, category, name]) => ({ rank: Number(rank), category, name }))
  .filter(({ rank }) => rank >= 1 && rank <= 73)

const presentations = [
  ['Big Five · OCEAN', 'Cinq grandes dimensions descriptives : ouverture, conscienciosité, extraversion, agréabilité et stabilité émotionnelle.'],
  ['MBTI · 16 types', 'Quatre préférences résumées en lettres. Les dimensions peuvent être proches du centre et ne définissent pas une identité fixe.'],
  ['DISC', 'Une lecture des tendances comportementales autour de la décision, de l’influence, de la stabilité et de la précision.'],
  ['Ennéagramme · 9 types', 'Une typologie de développement personnel. Les scores doivent rester des pistes de réflexion, pas des motivations établies.'],
]

export default function Indicators() {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const [response, setResponse] = useState('')
  const [portrait, setPortrait] = useState(null)
  const [responseError, setResponseError] = useState('')
  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(collectionPrompt)
      setCopied(true)
      setCopyError(false)
    } catch {
      setCopied(false)
      setCopyError(true)
    }
  }
  const showPortrait = () => {
    try {
      const jsonText = response.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] || response
      const parsed = JSON.parse(jsonText.trim())
      if (parsed.cogentia_version !== '1.0' || !Array.isArray(parsed.indicators) || parsed.indicators.length < 65) {
        throw new Error('Le format Cogentia v1 ou la liste des indicateurs est absent.')
      }
      setPortrait(parsed)
      setResponseError('')
    } catch (error) {
      setPortrait(null)
      setResponseError(`Impossible de lire cette réponse. Collez le bloc JSON complet produit par l’agent. ${error.message}`)
    }
  }
  const groups = indicators.reduce((result, indicator) => {
    ;(result[indicator.category] ||= []).push(indicator)
    return result
  }, {})
  return (
    <div className="max-w-5xl mx-auto px-4 py-12 md:py-20 space-y-14">
      <header className="max-w-3xl space-y-5">
        <p className="font-mono text-signal text-xs tracking-widest uppercase">Explorer le modèle Cogentia</p>
        <h1 className="font-display text-3xl md:text-5xl font-bold text-bright">73 indicateurs, plusieurs façons de lire un portrait</h1>
        <p className="text-dim leading-relaxed">Ces indicateurs servent à explorer ce qu’un agent croit comprendre de votre façon de penser, d’échanger et de décider. L’intérêt n’est pas de vous enfermer dans un type : c’est de pouvoir repérer ce que l’agent a retenu, ce qu’il suppose à tort, et ce qui pourrait vous aider à mieux travailler avec lui.</p>
        <p className="text-sm text-muted leading-relaxed">Ce sont des estimations formulées par un agent, pas un test standardisé ni une mesure psychométrique validée. Cogentia ne peut pas vérifier, avec ce prompt, ce que le fournisseur conserve en arrière-plan ni prouver l’absence de surveillance.</p>
        <a className="btn-primary" href="#collect">Collecter les indicateurs avec mon agent →</a>
      </header>

      <section id="collect" className="card space-y-5 scroll-mt-24" aria-labelledby="collect-title">
        <div className="space-y-2">
          <p className="font-mono text-signal text-xs tracking-widest uppercase">Protocole Cogentia v1 · 73 indicateurs</p>
          <h2 id="collect-title" className="font-display text-2xl font-semibold text-bright">Demandez le portrait à votre agent</h2>
          <p className="text-sm text-dim leading-relaxed">Copiez le prompt ci-dessous et collez-le dans une conversation avec l’agent que vous utilisez déjà. Il lui demande ce qu’il croit savoir de vous et comment il l’estime, en 73 dimensions. Vous pourrez ensuite examiner ses réponses, avec leurs limites, et décider ce qui vous semble utile ou faux.</p>
          <p className="text-xs text-muted leading-relaxed">Votre prompt est envoyé au service d’IA choisi, qui répond selon son accès et son contexte. La réponse que vous ramenez ici est traitée dans cette page, sans transmission automatique à Cogentia. Cela ne révèle pas les données ni les journaux internes du fournisseur.</p>
        </div>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-dim">
          <li>Copiez le protocole complet.</li>
          <li>Collez-le dans une conversation avec votre agent et envoyez-le.</li>
          <li>Revenez ici, collez la réponse de l’agent dans le champ qui apparaîtra juste après la copie, puis affichez votre portrait.</li>
        </ol>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primary" type="button" onClick={copyPrompt}>{copied ? 'Prompt copié ✓' : 'Copier le prompt complet'}</button>
          {copyError && <span role="status" className="text-sm text-dim">La copie automatique a échoué. Ouvrez le prompt ci-dessous et copiez-le manuellement.</span>}
        </div>
        <details className="rounded-xl border border-line/50 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-bright">Afficher le prompt complet pour le copier manuellement</summary>
          <textarea className="mt-4 w-full min-h-[32rem] rounded-lg bg-base p-4 font-mono text-xs leading-relaxed text-dim" aria-label="Prompt complet de collecte des 73 indicateurs" readOnly value={collectionPrompt} onFocus={(event) => event.currentTarget.select()} />
        </details>
      </section>

      <section className="card space-y-4" aria-labelledby="return-title">
        <p className="font-mono text-signal text-xs tracking-widest uppercase">Après la réponse de votre agent</p>
        <h2 id="return-title" className="font-display text-2xl font-semibold text-bright">Revenez ici pour lire le portrait</h2>
        <p className="text-sm text-dim leading-relaxed">Quand votre agent a terminé, copiez sa réponse complète, revenez sur cette page et collez-la ci-dessous. Le portrait est affiché dans ce navigateur; il n’est pas envoyé à un serveur.</p>
        <label htmlFor="agent-response" className="block text-sm font-medium text-bright">Réponse complète de votre agent</label>
        <textarea id="agent-response" value={response} onChange={(event) => setResponse(event.target.value)} placeholder="Collez ici le bloc JSON complet, y compris les balises ```json si elles sont présentes…" className="input min-h-48 w-full resize-y font-mono text-xs leading-relaxed" />
        {responseError && <p role="alert" className="text-sm text-red-300">{responseError}</p>}
        <button className="btn-primary" type="button" onClick={showPortrait} disabled={!response.trim()}>Afficher mon portrait</button>
      </section>

      {portrait && <section className="card space-y-5" aria-labelledby="portrait-title">
        <div>
          <p className="font-mono text-signal text-xs tracking-widest uppercase">Interprétation de votre agent</p>
          <h2 id="portrait-title" className="font-display text-2xl font-semibold text-bright">Votre portrait Cogentia</h2>
          <p className="mt-2 text-sm text-dim">Agent : {portrait.agent?.name || 'non précisé'} · Confiance globale déclarée : {portrait.user_relationship?.global_confidence ?? '—'}/100</p>
        </div>
        <p className="text-xs text-muted">Ces scores sont des estimations produites par un agent, pas des résultats de test validés. Ils restent dans cette page et ce navigateur.</p>
        <ol className="space-y-4">
          {portrait.indicators.slice().sort((a, b) => a.rank - b.rank).map((item) => <li key={item.rank} className="border-t border-line/50 pt-3">
            <div className="flex flex-wrap justify-between gap-2 text-sm"><span className="font-medium text-bright">{item.rank}. {item.name}</span><span className="text-dim">{item.score == null ? 'Non estimé' : `${item.score}${item.score_type === 'percentile' ? 'e percentile estimé' : ''}`} · confiance {item.confidence ?? '—'}/100</span></div>
            {item.score != null && <div className="mt-2 h-1.5 rounded-full bg-line"><div className="h-1.5 rounded-full bg-signal" style={{ width: `${Math.max(0, Math.min(100, Number(item.score) || 0))}%` }} /></div>}
            {item.evidence && <p className="mt-1 text-xs text-dim">{item.evidence}</p>}
          </li>)}
        </ol>
      </section>}

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
        <div><h2 id="presentations-title" className="font-display text-2xl font-semibold text-bright">Des présentations familières</h2><p className="text-sm text-dim mt-2">Big Five, MBTI, DISC et Ennéagramme sont des façons connues d’organiser des observations sur soi. Elles peuvent aider à réfléchir ou à mieux communiquer avec un agent; elles ne constituent pas quatre preuves indépendantes ni des étiquettes définitives.</p></div>
        <div className="grid sm:grid-cols-2 gap-4">{presentations.map(([title, description]) => <article key={title} className="card"><h3 className="font-display text-lg font-semibold text-bright mb-2">{title}</h3><p className="text-sm text-dim leading-relaxed">{description}</p></article>)}</div>
        <p className="text-xs text-muted">Le parcours actuel affiche les estimations Cogentia v1 que vous collez. Il ne convertit pas encore ces scores vers les quatre présentations; nous les montrons ici comme des repères de lecture, pas comme des résultats calculés.</p>
      </section>

      <section className="card space-y-4">
        <h2 className="font-display text-xl font-semibold text-bright">Le parcours disponible aujourd’hui</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-dim"><li>Choisissez un agent et copiez son prompt.</li><li>Collez sa réponse pour voir ses affirmations dans un portrait lisible.</li><li>Examinez, corrigez et comparez les réponses localement.</li></ol>
        <div className="flex flex-wrap gap-3"><Link className="btn-primary" to="/snapshot">Interroger mon agent</Link><Link className="btn-ghost" to="/mirror">Ouvrir le miroir</Link></div>
      </section>
    </div>
  )
}
