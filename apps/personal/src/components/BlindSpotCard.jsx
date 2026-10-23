import { useState } from 'react'

export const BLIND_SPOT_PROMPT = "Quelle vérité utile m'échappe ?"
export const BLIND_SPOT_VARIANT = "Dis-moi, sans me ménager, ce que j'ignore et que je gagnerais à connaître."
export const BLIND_SPOT_FOLLOW_UP = "Quelle observation étaye cette piste ? Distingue ce que tu sais que j'ignore, ce que tu soupçonnes et ce que tu ne peux pas observer. Quel bénéfice concret et quel test pourraient confirmer ou réfuter cette hypothèse ?"

export default function BlindSpotCard() {
  const [status, setStatus] = useState('')
  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text)
      setStatus('Copié ✓')
    } catch {
      setStatus('Copie indisponible : sélectionnez le texte ci-dessus pour le copier.')
    }
  }
  return (
    <section className="card border-amber-400/40 space-y-4 mt-12" aria-labelledby="blind-spot-title" data-output-category="blind-spot-hypothesis">
      <p className="font-mono text-xs text-amber-300">Exploration facultative · hypothèse à tester</p>
      <h2 id="blind-spot-title" className="font-display text-2xl font-semibold text-bright">{BLIND_SPOT_PROMPT}</h2>
      <button type="button" className="btn-primary" onClick={() => copy(BLIND_SPOT_PROMPT)}>Copier la question</button>
      <p role="status" className="text-sm text-dim">{status}</p>
      <p className="text-sm text-dim">Posez-la à votre IA habituelle. Sa réponse propose une piste : elle ne prouve pas ce que vous ignorez. Ce n’est ni une extraction de mémoire, ni un diagnostic.</p>
      <details className="space-y-3">
        <summary className="cursor-pointer text-bright">Après la réponse : vérifier une piste (facultatif)</summary>
        <p className="text-sm text-dim">{BLIND_SPOT_FOLLOW_UP}</p>
        <button type="button" className="btn-ghost" onClick={() => copy(BLIND_SPOT_FOLLOW_UP)}>Copier la vérification</button>
        <p className="text-sm text-dim">Exemple entièrement fictif : « Vous pourriez gagner du temps en testant une liste de vérification. » Comparez deux tâches similaires avec et sans liste ; si rien ne s’améliore, abandonnez la piste. Cela ne démontre pas que vous ignoriez cet outil.</p>
      </details>
      <details className="space-y-3">
        <summary className="cursor-pointer text-bright">Autre formulation (facultatif)</summary>
        <p className="text-sm text-dim">{BLIND_SPOT_VARIANT}</p>
        <button type="button" className="btn-ghost" onClick={() => copy(BLIND_SPOT_VARIANT)}>Copier la variante</button>
      </details>
    </section>
  )
}
