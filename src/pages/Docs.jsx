import { useState } from 'react'
import { Link } from 'react-router-dom'

// ─── Données ──────────────────────────────────────────────────────────────────

const SECTIONS = ['Méthodologie', 'Les 73 indicateurs', 'Présentations & Narratives', 'Éthique & Limites', 'Format JSON']

const INDICATORS_BY_CAT = [
  {
    cat: 'Architecture Cognitive',
    color: 'bg-signal',
    desc: 'Mesure les processus de traitement de l\'information, de raisonnement et d\'organisation mentale.',
    items: [
      { rank: 1, name: 'Logique Déductive', def: 'Capacité à dériver des conclusions valides à partir de prémisses selon les règles formelles du syllogisme.' },
      { rank: 2, name: 'Indice de Systématisation', def: 'Propension à identifier les variables d\'un système et les règles de rétroaction qui les régissent.' },
      { rank: 3, name: 'Ratio Bottom-up', def: 'Prépondérance du traitement des données brutes avant l\'intégration dans des modèles conceptuels globaux.' },
      { rank: 4, name: 'Mémoire de Travail', def: 'Nombre maximal de contraintes et d\'objets sémantiques manipulés dans une seule fenêtre contextuelle.' },
      { rank: 5, name: 'Seuil de Saturation', def: 'Charge informationnelle à partir de laquelle la structure syntaxique présente des ruptures de cohérence.' },
      { rank: 6, name: 'Efficience du Chunking', def: 'Capacité à compresser des ensembles de données complexes en une unité sémantique sans perte de sens.' },
      { rank: 7, name: 'Acquisition Lexicale', def: 'Vitesse d\'intégration fonctionnelle d\'un terme technique nouveau.' },
      { rank: 8, name: 'Pensée en Arborescence', def: 'Capacité à maintenir et explorer des sous-routines logiques sans perdre le fil du prédicat racine.' },
      { rank: 9, name: 'Vitesse d\'Inférence', def: 'Temps de traitement requis pour transformer une information entrante en conclusion logique.' },
      { rank: 10, name: 'Précision Analytique', def: 'Taux d\'exactitude dans l\'identification des composants internes d\'un système complexe.' },
      { rank: 11, name: 'Rigueur Définitionnelle', def: 'Tendance à exiger ou fournir des définitions strictes pour limiter l\'entropie sémantique.' },
      { rank: 12, name: 'Pensée Algorithmique', def: 'Capacité à décomposer une tâche en une suite finie d\'instructions logiques non ambiguës.' },
      { rank: 13, name: 'Capacité d\'Abstraction', def: 'Faculté à isoler une structure logique de son support contextuel pour la manipuler de manière pure.' },
      { rank: 14, name: 'Synthèse Critique', def: 'Aptitude à condenser un corpus massif en extrayant uniquement les vecteurs directeurs.' },
      { rank: 15, name: 'Attention Sélective', def: 'Capacité à filtrer les variables non-pertinentes lors d\'une tâche à haute densité informationnelle.' },
      { rank: 16, name: 'Évaluation Probabiliste', def: 'Tendance à quantifier l\'incertitude plutôt qu\'à utiliser des jugements binaires.' },
      { rank: 17, name: 'Spatialisation Mentale', def: 'Capacité à modéliser des structures (hiérarchies, réseaux) comme des objets topologiques.' },
      { rank: 18, name: 'Vigilance Cognitive', def: 'Maintien d\'un haut niveau de détection d\'erreurs sur de longues séquences d\'échange.' },
      { rank: 19, name: 'Fluidité de Raisonnement', def: 'Capacité à enchaîner les étapes logiques sans répétition ou stagnation sémantique.' },
      { rank: 20, name: 'Raisonnement Abductif', def: 'Capacité à identifier l\'explication la plus probable à partir d\'observations fragmentées.' },
    ]
  },
  {
    cat: 'Interface Sociale',
    color: 'bg-blue-400',
    desc: 'Évalue la manière dont l\'individu modélise et interagit avec les autres agents sociaux.',
    items: [
      { rank: 21, name: 'Empathie Cognitive', def: 'Modélisation logique des états mentaux et intentions d\'autrui (sans résonance affective).' },
      { rank: 22, name: 'Empathie Affective', def: 'Capacité de synchronisation involontaire avec les états émotionnels d\'autrui.' },
      { rank: 23, name: 'Indice de Masquage', def: 'Écart entre le style cognitif spontané et l\'adoption de conventions sociales neurotypiques.' },
      { rank: 24, name: 'Attribution d\'Intention', def: 'Capacité à discriminer entre une erreur système et une intention délibérée de l\'interlocuteur.' },
      { rank: 25, name: 'Prédiction de l\'Autre', def: 'Capacité à anticiper les points de rupture de compréhension de l\'interlocuteur.' },
      { rank: 26, name: 'Résilience Hallucinatoire', def: 'Immunité aux données fausses présentées avec aplomb par l\'interlocuteur.' },
      { rank: 27, name: 'Caméléonisme Technique', def: 'Adoption des structures linguistiques optimales du système cible pour maximiser l\'efficience.' },
      { rank: 28, name: 'Neutralité Relationnelle', def: 'Absence de marqueurs d\'influence émotionnelle dans la structure des requêtes.' },
      { rank: 29, name: 'Décodage de l\'Implicite', def: 'Capacité à extraire des informations non-formulées à partir du contexte.' },
      { rank: 30, name: 'Assertivité Neutre', def: 'Expression de limites ou d\'exigences sans recours à l\'agressivité ou à la complaisance.' },
      { rank: 31, name: 'Coopération Logique', def: 'Tendance à collaborer basée sur l\'optimisation mutuelle plutôt que sur le lien social.' },
      { rank: 32, name: 'Flexibilité Sociale', def: 'Capacité à ajuster le niveau de formalisme selon les retours de l\'interlocuteur.' },
    ]
  },
  {
    cat: 'Sémiotique & Langage',
    color: 'bg-indigo-400',
    desc: 'Analyse les propriétés structurelles et informatives du discours produit.',
    items: [
      { rank: 33, name: 'Densité Informationnelle', def: 'Ratio [Unités Sémantiques / Nombre de Mots] — mesure de la concision brute.' },
      { rank: 34, name: 'Stabilité Anaphorique', def: 'Précision du maintien des liens de référence entre les pronoms et leurs antécédents.' },
      { rank: 35, name: 'Non-Redondance', def: 'Taux d\'informations nouvelles par segment textuel ; absence de répétition.' },
      { rank: 36, name: 'Index de Littéralité', def: 'Adhérence au sens premier des termes ; rejet des métaphores et de l\'ambiguïté.' },
      { rank: 37, name: 'Usage Quantificateur', def: 'Fréquence relative des opérateurs logiques universels vs existentiels.' },
      { rank: 38, name: 'Complexité Syntaxique', def: 'Nombre moyen de propositions subordonnées par phrase.' },
      { rank: 39, name: 'Pureté Lexicale', def: 'Usage de termes spécifiques à un domaine en excluant les synonymes vagues.' },
      { rank: 40, name: 'Fluidité Narrative', def: 'Cohérence du flux argumentatif de l\'introduction à la conclusion.' },
    ]
  },
  {
    cat: 'Axiologie & Arbitrage',
    color: 'bg-pulse',
    desc: 'Sonde la hiérarchie des valeurs, la robustesse des principes et le mode de prise de décision morale.',
    items: [
      { rank: 41, name: 'Hiérarchie Impérative', def: 'Ordre de priorité des principes (ex: Vérité > Sécurité) en situation de dilemme.' },
      { rank: 42, name: 'Rectitude Intellectuelle', def: 'Vitesse d\'abandon d\'une hypothèse dès la preuve de son invalidité.' },
      { rank: 43, name: 'Stabilité des Principes', def: 'Résistance des axiomes de base aux tentatives de persuasion émotionnelle.' },
      { rank: 44, name: 'Tolérance Ambiguïté', def: 'Capacité à traiter des données non-classées sans forcer une catégorisation prématurée.' },
      { rank: 45, name: 'Priorité Processus', def: 'Valorisation de la validité de la méthode de raisonnement sur le résultat final.' },
      { rank: 46, name: 'Souveraineté Épistémique', def: 'Maintien de ses propres conclusions face à un consensus contradictoire non-prouvé.' },
      { rank: 47, name: 'Consistance Morale', def: 'Absence de contradictions dans les jugements de valeur au fil du temps.' },
    ]
  },
  {
    cat: 'Dynamique de Flux',
    color: 'bg-cyan-500',
    desc: 'Mesure la régulation énergétique et temporelle des processus cognitifs.',
    items: [
      { rank: 48, name: 'Friction Cognitive', def: 'Coût énergétique et temporel du passage entre deux types de tâches cognitives.' },
      { rank: 49, name: 'Entropie de Récupération', def: 'Temps nécessaire pour retrouver une précision nominale après une perturbation.' },
      { rank: 50, name: 'Inertie de Pattern', def: 'Tendance à répéter une structure de pensée après que son utilité a cessé.' },
      { rank: 51, name: 'Hygiène Informationnelle', def: 'Efficience du filtrage des stimuli "bruit" avant traitement.' },
      { rank: 52, name: 'Auto-Génération de Cadre', def: 'Capacité à définir ses propres règles de traitement sans instructions externes.' },
      { rank: 53, name: 'Résonance Systémique', def: 'Capacité à détecter une loi générale à partir d\'un échantillon de données réduit.' },
      { rank: 54, name: 'Réparation Heuristique', def: 'Aptitude à générer une règle de décision inédite face à une situation inconnue.' },
      { rank: 55, name: 'Gradient de Dégradation', def: 'Morphologie de la baisse de performance (linéaire vs chute brutale).' },
      { rank: 56, name: 'Indice de Camouflage', def: 'Score mesurant l\'effort de normalisation sociale.' },
      { rank: 57, name: 'Surcharge Logique', def: 'Seuil de saturation spécifique aux données non-structurées.' },
      { rank: 58, name: 'Agentivité Cognitive', def: 'Force d\'imposition du cadre interne sur l\'environnement externe.' },
    ]
  },
  {
    cat: 'Scores Dérivés',
    color: 'bg-muted',
    desc: 'Indices calculés à partir des catégories précédentes, analogues aux composantes WAIS.',
    items: [
      { rank: 59, name: 'ICV (Dérivé)', def: 'Estimation de l\'Indice de Compréhension Verbale (Composante WAIS).' },
      { rank: 60, name: 'IRF (Dérivé)', def: 'Estimation de l\'Indice de Raisonnement Fluide (Composante WAIS).' },
      { rank: 61, name: 'IVT (Dérivé)', def: 'Estimation de l\'Indice de Vitesse de Traitement (Composante WAIS).' },
      { rank: 62, name: 'E-S Gap', def: 'Écart entre le score de Systématisation et d\'Empathie (indicateur de profil cognitif).' },
      { rank: 63, name: 'Fatigabilité (Slope)', def: 'Pente de dégradation de la précision sur une session continue.' },
      { rank: 64, name: 'Entropie Conversationnelle', def: 'Variabilité de la structure des échanges (Basse = Haute prédictibilité).' },
      { rank: 65, name: 'Synchronisation Multimodale', def: 'Cohérence simultanée entre logique, axiologie et sémiotique.' },
    ]
  },
  {
    cat: 'Cogentia+',
    color: 'bg-signal',
    desc: 'Indicateurs étendus spécifiques au protocole PrivAI, non couverts par les catégories classiques.',
    items: [
      { rank: 66, name: 'Curiosité Épistémique', def: 'Propension à explorer spontanément des domaines non sollicités par la tâche en cours.' },
      { rank: 67, name: 'Créativité Divergente', def: 'Capacité à générer des solutions ou analogies non-conventionnelles face à un problème ouvert.' },
      { rank: 68, name: 'Rapport au Risque', def: 'Tolérance aux décisions à enjeux élevés sous incertitude.' },
      { rank: 69, name: 'Perfectionnisme Fonctionnel', def: 'Seuil de satisfaction avant validation d\'un output ; rapport effort / standard de qualité.' },
      { rank: 70, name: 'Style d\'Apprentissage', def: 'Mode d\'acquisition dominant : par l\'exemple, par le principe, par l\'analogie, ou par l\'expérimentation.' },
      { rank: 71, name: 'Autonomie Décisionnelle', def: 'Tendance à valider ses conclusions de manière indépendante vs recherche de validation externe.' },
      { rank: 72, name: 'Régulation Émotionnelle', def: 'Capacité à maintenir la cohérence logique sous pression émotionnelle ou stress.' },
      { rank: 73, name: 'Orientation Temporelle', def: 'Prépondérance du cadrage temporel : passé (référentiel), présent (pragmatique), futur (projectif).' },
    ]
  },
]

// ─── Composants ───────────────────────────────────────────────────────────────

function SectionAnchor({ id }) {
  return <div id={id} className="-mt-20 pt-20 invisible absolute" aria-hidden />
}

function Callout({ icon, title, children, variant = 'info' }) {
  const styles = {
    info: 'border-signal/30 bg-signal/5',
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    danger: 'border-red-500/30 bg-red-500/5',
  }
  const iconColor = {
    info: 'text-signal', warning: 'text-yellow-400', danger: 'text-red-400'
  }
  return (
    <div className={`rounded-xl border px-5 py-4 ${styles[variant]}`}>
      <div className="flex items-start gap-3">
        <span className={`font-mono text-sm shrink-0 mt-0.5 ${iconColor[variant]}`}>{icon}</span>
        <div>
          {title && <p className="font-display text-sm font-semibold text-bright mb-1">{title}</p>}
          <div className="font-body text-sm text-dim leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  )
}

function IndicatorTable({ items }) {
  const [open, setOpen] = useState(null)
  return (
    <div className="divide-y divide-border">
      {items.map(ind => (
        <div key={ind.rank}>
          <button
            onClick={() => setOpen(o => o === ind.rank ? null : ind.rank)}
            className="w-full flex items-center gap-3 py-2.5 px-2 -mx-2 rounded hover:bg-panel transition-colors text-left group"
          >
            <span className="font-mono text-xs text-muted w-6 shrink-0">{ind.rank}</span>
            <span className="font-body text-sm text-bright group-hover:text-signal transition-colors flex-1">
              {ind.name}
            </span>
            <span className={`font-mono text-xs text-muted transition-transform duration-150 ${open === ind.rank ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </button>
          {open === ind.rank && (
            <p className="font-body text-xs text-dim leading-relaxed pb-3 pl-9 animate-fade-in">
              {ind.def}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Docs() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0])

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 animate-fade-in">

      {/* En-tête */}
      <div className="mb-12">
        <p className="font-mono text-signal text-xs tracking-widest uppercase mb-3">
          Documentation
        </p>
        <h1 className="font-display text-4xl font-bold text-bright mb-4">
          Protocole Cogentia
        </h1>
        <p className="font-body text-dim text-base max-w-2xl leading-relaxed">
          Méthodologie, définitions des 73 indicateurs, cadre éthique et format de données.
          Tout ce qu'il faut savoir pour interpréter un profil Cogentia avec justesse.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">

        {/* Navigation latérale sticky */}
        <aside className="lg:w-48 shrink-0">
          <nav className="sticky top-20 space-y-1">
            {SECTIONS.map(s => (
              <a
                key={s}
                href={`#${s}`}
                onClick={() => setActiveSection(s)}
                className={`block font-body text-sm py-1.5 px-3 rounded transition-colors duration-150 ${activeSection === s
                  ? 'text-bright bg-panel'
                  : 'text-muted hover:text-dim'
                  }`}
              >
                {s}
              </a>
            ))}
            <div className="pt-4 border-t border-border">
              <Link to="/" className="block font-mono text-xs text-muted hover:text-dim transition-colors py-1 px-3">
                ← Accueil
              </Link>
            </div>
          </nav>
        </aside>

        {/* Contenu */}
        <div className="flex-1 min-w-0 space-y-20">

          {/* ── MÉTHODOLOGIE ────────────────────────────────────── */}
          <section>
            <SectionAnchor id="Méthodologie" />
            <h2 className="font-display text-2xl font-bold text-bright mb-8 pb-4 border-b border-border">
              Méthodologie
            </h2>

            <div className="space-y-8">

              <div>
                <h3 className="font-display text-base font-semibold text-bright mb-3">Principe général</h3>
                <p className="font-body text-sm text-dim leading-relaxed">
                  Cogentia repose sur une idée simple : ton agent IA habituel — ChatGPT, Claude,
                  Gemini ou autre — accumule au fil du temps une représentation implicite de ton style
                  cognitif, de ton vocabulaire, de tes valeurs et de tes patterns de raisonnement.
                  Le protocole Cogentia transforme cette représentation en un scoring structuré,
                  comparable à celui d'un test psychométrique standardisé.
                </p>
              </div>

              <div>
                <h3 className="font-display text-base font-semibold text-bright mb-3">L'agent comme instrument de mesure</h3>
                <p className="font-body text-sm text-dim leading-relaxed mb-4">
                  Contrairement aux tests psychométriques classiques (questionnaires auto-déclaratifs,
                  épreuves chronométrées), Cogentia n'interroge pas l'utilisateur directement.
                  C'est l'agent IA qui répond, sur la base de ce qu'il a observé dans vos échanges.
                  Cela présente des avantages et des limites spécifiques.
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Callout icon="✓" title="Avantages" variant="info">
                    <ul className="space-y-1 mt-1">
                      <li>Basé sur des comportements réels, pas sur l'auto-perception</li>
                      <li>Insensible aux biais de désirabilité sociale</li>
                      <li>Longitudinal : reflète l'accumulation de nombreux échanges</li>
                      <li>Aucune fatigue de test pour l'utilisateur</li>
                    </ul>
                  </Callout>
                  <Callout icon="⚠" title="Limites" variant="warning">
                    <ul className="space-y-1 mt-1">
                      <li>Dépend de la richesse de l'historique de l'agent</li>
                      <li>Sensible aux biais de l'agent lui-même</li>
                      <li>Non standardisé au sens clinique du terme</li>
                      <li>Varie selon le modèle d'agent utilisé</li>
                    </ul>
                  </Callout>
                </div>
              </div>

              <div>
                <h3 className="font-display text-base font-semibold text-bright mb-3">Le score percentile</h3>
                <p className="font-body text-sm text-dim leading-relaxed mb-3">
                  Chaque indicateur est exprimé en <strong className="text-bright">percentile</strong> par
                  rapport à la population générale adulte — la même échelle que les tests de QI standardisés.
                </p>
                <div className="card font-mono text-xs space-y-2">
                  {[
                    ['1 – 15', 'Extrêmement faible (–2σ et en dessous)'],
                    ['16 – 25', 'Faible (entre –1σ et –2σ)'],
                    ['26 – 74', 'Dans la moyenne populationnelle'],
                    ['50', 'Exactement la médiane — ni fort ni faible'],
                    ['75 – 84', 'Au-dessus de la moyenne (+1σ)'],
                    ['85 – 97', 'Nettement supérieur (+1σ à +2σ)'],
                    ['98 – 100', 'Exceptionnel (+2σ et au-dessus)'],
                  ].map(([range, label]) => (
                    <div key={range} className="flex items-center gap-4">
                      <span className="text-signal w-16 shrink-0">{range}</span>
                      <span className="text-dim">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-display text-base font-semibold text-bright mb-3">Indice de confiance</h3>
                <p className="font-body text-sm text-dim leading-relaxed">
                  Chaque score est accompagné d'un <strong className="text-bright">indice de confiance</strong> (0–100)
                  qui reflète la quantité et la qualité des données dont dispose l'agent sur cet indicateur.
                  Un score avec une confiance inférieure à 20 est annulé et affiché comme "données insuffisantes".
                  Les scores avec une confiance entre 20 et 40 sont affichés en transparence réduite — à interpréter
                  avec précaution.
                </p>
              </div>

              <div>
                <h3 className="font-display text-base font-semibold text-bright mb-3">Fiabilité globale</h3>
                <p className="font-body text-sm text-dim leading-relaxed mb-4">
                  Avant de scorer, l'agent évalue sa propre relation avec l'utilisateur (historique,
                  mémoire persistante, profondeur des échanges). Cette évaluation détermine le niveau
                  de fiabilité recommandé pour l'interprétation du profil :
                </p>
                <div className="space-y-2">
                  {[
                    { level: 'Ne pas interpréter', color: 'text-red-400', desc: 'Historique insuffisant. Ces résultats ne doivent pas être utilisés.' },
                    { level: 'Avec précaution', color: 'text-yellow-400', desc: 'Historique limité. Première indication, pas un portrait définitif.' },
                    { level: 'Fiable', color: 'text-green-400', desc: 'Historique suffisant. Représentation fiable des tendances de l\'utilisateur.' },
                    { level: 'Très fiable', color: 'text-signal', desc: 'Historique riche. Forte valeur indicative.' },
                  ].map(({ level, color, desc }) => (
                    <div key={level} className="flex items-start gap-3 font-body text-sm">
                      <span className={`font-mono text-xs shrink-0 mt-0.5 w-32 ${color}`}>{level}</span>
                      <span className="text-dim">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>


              <div>
                <h3 className="font-display text-base font-semibold text-bright mb-3">3 méthodes de collecte</h3>
                <p className="font-body text-sm text-dim leading-relaxed mb-4">
                  La réponse de l'agent IA peut être transmise de trois façons différentes,
                  pour couvrir les cas où la récupération automatique échoue
                  (certaines plateformes rendent leur contenu via JavaScript côté client).
                </p>
                <div className="space-y-2">
                  {[
                    { method: 'Automatique', when: 'Fetch HTTP de l\'URL partagée — toujours tenter en premier.' },
                    { method: 'Coller', when: 'Copier-coller la réponse brute de l\'agent — fallback si le fetch retourne vide.' },
                    { method: 'Fichier', when: 'Importer un fichier .json ou .txt — si copier-coller est difficile.' },
                  ].map(({ method, when }) => (
                    <div key={method} className="flex items-start gap-3 font-body text-sm">
                      <span className="font-mono text-xs text-signal shrink-0 mt-0.5 w-20">{method}</span>
                      <span className="text-dim">{when}</span>
                    </div>
                  ))}
                </div>
                <p className="font-body text-xs text-muted mt-3 leading-relaxed">
                  Dans tous les cas, <strong className="text-bright">l'URL de la conversation est obligatoire</strong> —
                  elle constitue la trace horodatée et permettra un scraping plus avancé si nécessaire.
                </p>
              </div>

            </div>
          </section>

          {/* ── LES 73 INDICATEURS ──────────────────────────────── */}
          <section>
            <SectionAnchor id="Les 73 indicateurs" />
            <h2 className="font-display text-2xl font-bold text-bright mb-8 pb-4 border-b border-border">
              Les 73 indicateurs
            </h2>
            <p className="font-body text-sm text-dim leading-relaxed mb-8">
              Clique sur un indicateur pour afficher sa définition technique.
            </p>
            <div className="space-y-10">
              {INDICATORS_BY_CAT.map(({ cat, color, desc, items }) => (
                <div key={cat}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-2 h-2 rounded-full ${color} shrink-0`} />
                    <h3 className="font-display text-base font-semibold text-bright">{cat}</h3>
                    <span className="font-mono text-xs text-muted ml-auto">{items.length} indicateurs</span>
                  </div>
                  <p className="font-body text-xs text-muted mb-4 pl-5">{desc}</p>
                  <div className="pl-5">
                    <IndicatorTable items={items} />
                  </div>
                </div>
              ))}
            </div>
          </section>


          {/* ── PRÉSENTATIONS & NARRATIVES ──────────────────────── */}
          <section>
            <SectionAnchor id="Présentations & Narratives" />
            <h2 className="font-display text-2xl font-bold text-bright mb-8 pb-4 border-b border-border">
              Présentations & Narratives
            </h2>

            <div className="space-y-8">

              <div>
                <h3 className="font-display text-base font-semibold text-bright mb-3">Vue d'ensemble</h3>
                <p className="font-body text-sm text-dim leading-relaxed">
                  À partir des 73 indicateurs Cogentia, l'application calcule automatiquement
                  des équivalents dans les frameworks psychométriques les plus répandus.
                  Chaque présentation est accompagnée d'une analyse narrative générée par Claude,
                  rédigée en prose et fondée sur l'intégralité des données disponibles.
                </p>
              </div>

              <div>
                <h3 className="font-display text-base font-semibold text-bright mb-4">Les 5 modes de présentation</h3>
                <div className="space-y-4">
                  {[
                    {
                      id: 'Cogentia brut',
                      tag: 'Natif',
                      desc: 'Présentation directe des 73 indicateurs sans reformatage. Portrait cognitif synthétique rédigé par Claude à partir de l\'ensemble des données réelles — la présentation la plus fidèle et la plus distinctive.',
                    },
                    {
                      id: 'Big Five (OCEAN)',
                      tag: 'Scientifique',
                      desc: 'Référence empirique de la recherche en personnalité. 5 dimensions (Ouverture, Conscienciosité, Extraversion, Agréabilité, Névrosisme) calculées par formules pondérées sur les indicateurs Cogentia pertinents.',
                    },
                    {
                      id: 'MBTI',
                      tag: 'Typologique',
                      desc: '16 types Jungiens (ex : INTJ, ENFP). 4 dimensions calculées (I/E, N/S, T/F, J/P). La "force" de chaque pôle est indiquée — un type INTP avec un T fort et un N nuancé est différent d\'un INTP équilibré.',
                    },
                    {
                      id: 'DISC',
                      tag: 'Professionnel',
                      desc: 'Framework comportemental RH. 4 styles (Dominance, Influence, Stabilité, Conscienciosité). Particulièrement utile pour contextualiser le profil dans les dynamiques d\'équipe et de coopération.',
                    },
                    {
                      id: 'Ennéagramme',
                      tag: 'Motivationnel',
                      desc: '9 types motivationnels. Inclut le calcul de l\'aile dominante (type adjacent) — un 5w4 est très différent d\'un 5w6. Orienté développement personnel et compréhension des motivations profondes.',
                    },
                  ].map(({ id, tag, desc }) => (
                    <div key={id} className="card">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-display text-sm font-semibold text-bright">{id}</p>
                        <span className="tag">{tag}</span>
                      </div>
                      <p className="font-body text-sm text-dim leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-display text-base font-semibold text-bright mb-3">Méthode de calcul</h3>
                <p className="font-body text-sm text-dim leading-relaxed mb-3">
                  Les scores des frameworks sont calculés par <strong className="text-bright">formules de transformation pondérées</strong> —
                  pas par un LLM. Chaque dimension est une somme pondérée des indicateurs Cogentia
                  pertinents, avec prise en compte de l'indice de confiance de chaque indicateur.
                  Un indicateur à confiance faible pèse proportionnellement moins dans le calcul.
                </p>
                <Callout icon="◎" variant="info">
                  Les narratives sont générées par Claude à partir de <strong className="text-bright">l'intégralité des 73 indicateurs</strong>,
                  pas seulement des scores synthétiques. Claude peut ainsi identifier des nuances et des
                  combinaisons que les scores agrégés ne capturent pas.
                </Callout>
              </div>

              <div>
                <h3 className="font-display text-base font-semibold text-bright mb-3">Timing de génération</h3>
                <p className="font-body text-sm text-dim leading-relaxed">
                  Les présentations sont générées <strong className="text-bright">automatiquement au moment de l'analyse</strong>,
                  en parallèle du scoring des 73 indicateurs. Elles sont mises en cache dans la base de données
                  et servies instantanément à chaque consultation. Les 5 appels Claude API sont lancés
                  en parallèle pour minimiser le temps d'attente.
                </p>
              </div>

              <Callout icon="⚠" title="Limites des conversions" variant="warning">
                Les scores Big Five, MBTI, DISC et Ennéagramme sont des <strong className="text-bright">estimations indicatives</strong>,
                pas des mesures standardisées équivalentes aux tests officiels.
                La conversion est fondée sur des corrélations théoriques entre les indicateurs Cogentia
                et les construits de chaque framework — pas sur un étalonnage empirique.
                Interpréter ces présentations comme des portraits orientants, non comme des évaluations certifiées.
              </Callout>

            </div>
          </section>

          {/* ── ÉTHIQUE & LIMITES ────────────────────────────────── */}
          <section>
            <SectionAnchor id="Éthique & Limites" />
            <h2 className="font-display text-2xl font-bold text-bright mb-8 pb-4 border-b border-border">
              Éthique & Limites
            </h2>

            <div className="space-y-10">

              <div>
                <h3 className="font-display text-base font-semibold text-bright mb-4">
                  Ce que Cogentia n'est pas
                </h3>
                <Callout icon="◈" variant="danger">
                  <p className="mb-2">Cogentia <strong className="text-bright">n'est pas un outil de diagnostic clinique</strong>.
                    Il ne produit pas de diagnostic psychiatrique, neurologique ou médical.
                    Aucun score Cogentia ne doit être interprété comme la présence ou l'absence d'un trouble,
                    d'une pathologie, ou d'une condition médicale.</p>
                  <p>Si tu cherches une évaluation psychologique professionnelle,
                    consulte un neuropsychologue ou un psychologue clinicien agréé.</p>
                </Callout>
              </div>

              <div>
                <h3 className="font-display text-base font-semibold text-bright mb-4">
                  Protection des données personnelles
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      title: 'Zéro donnée identifiante dans les scores',
                      body: 'Le prompt Cogentia contient 5 règles éthiques obligatoires : aucun nom, prénom, email, localisation ou identifiant ne peut apparaître dans la réponse de l\'agent. L\'evidence de chaque indicateur est en plus sanitisée côté serveur (masquage automatique des patterns Prénom Nom et emails).',
                    },
                    {
                      title: 'Catégories RGPD exclues',
                      body: 'Les données relevant des catégories spéciales au sens du RGPD (Art. 9) sont explicitement interdites dans le scoring : origine ethnique, opinion politique, conviction religieuse, données de santé, orientation sexuelle, appartenance syndicale.',
                    },
                    {
                      title: 'Anonymat par défaut',
                      body: 'Aucun compte n\'est requis pour utiliser Cogentia. Les analyses anonymes sont identifiées par un UUID v4 généré localement (2¹²² possibilités, non-devinable). Ce UUID est stocké uniquement dans ton navigateur (localStorage).',
                    },
                    {
                      title: 'Le contenu de ta conversation reste chez toi',
                      body: 'Cogentia extrait uniquement le bloc JSON Cogentia de la page partagée. Nous ne lisons pas, ne stockons pas et n\'analysons pas le reste de ton historique de conversation.',
                    },
                  ].map(({ title, body }) => (
                    <div key={title} className="card">
                      <p className="font-display text-sm font-semibold text-bright mb-1">{title}</p>
                      <p className="font-body text-sm text-dim leading-relaxed">{body}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-display text-base font-semibold text-bright mb-4">
                  Biais connus et limites méthodologiques
                </h3>
                <div className="space-y-4 font-body text-sm text-dim leading-relaxed">
                  <p>
                    <strong className="text-bright">Biais de complaisance de l'agent.</strong> Les modèles LLM ont une tendance
                    documentée à être excessivement positifs envers leurs utilisateurs. Le prompt Cogentia
                    contient un garde-fou explicite ("la plupart des scores d'une personne moyenne se situent
                    entre 35 et 65") mais ce biais ne peut pas être entièrement éliminé.
                  </p>
                  <p>
                    <strong className="text-bright">Dépendance à l'historique.</strong> Un agent avec peu d'échanges
                    produira des scores peu fiables. C'est pourquoi l'indice de confiance et le niveau de
                    fiabilité globale sont affichés en premier dans les résultats.
                  </p>
                  <p>
                    <strong className="text-bright">Variabilité inter-agents.</strong> Le même utilisateur obtiendra
                    des scores différents selon qu'il utilise ChatGPT, Claude ou Gemini. Les architectures,
                    les données d'entraînement et les politiques de ces modèles influencent leur perception
                    de l'utilisateur.
                  </p>
                  <p>
                    <strong className="text-bright">Non-standardisation clinique.</strong> Les percentiles Cogentia
                    sont des estimations relatives basées sur l'évaluation subjective de l'agent, pas des
                    mesures psychométriques rigoureusement étalonnées sur un échantillon normatif représentatif.
                    Ils sont indicatifs, pas normatifs.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-display text-base font-semibold text-bright mb-4">
                  Validation participative
                </h3>
                <p className="font-body text-sm text-dim leading-relaxed">
                  Après chaque analyse, Cogentia te propose d'évaluer si le profil te ressemble
                  (échelle 1–5) et de signaler les indicateurs qui te semblent inexacts.
                  Ces données anonymisées nous permettent de mesurer la fiabilité réelle du protocole
                  et d'identifier les indicateurs systématiquement contestés selon le type d'agent utilisé.
                  Tu contribues ainsi à l'amélioration du protocole pour tous les utilisateurs.
                </p>
              </div>

            </div>
          </section>

          {/* ── FORMAT JSON ──────────────────────────────────────── */}
          <section>
            <SectionAnchor id="Format JSON" />
            <h2 className="font-display text-2xl font-bold text-bright mb-8 pb-4 border-b border-border">
              Format JSON
            </h2>
            <p className="font-body text-sm text-dim leading-relaxed mb-6">
              La réponse de l'agent IA est un bloc JSON strict encadré par{' '}
              <code className="font-mono text-xs bg-panel px-1.5 py-0.5 rounded text-signal">```json</code>.
              Le champ <code className="font-mono text-xs bg-panel px-1.5 py-0.5 rounded text-signal">cogentia_version</code> est
              le token d'intégrité qui confirme que le prompt n'a pas été altéré.
            </p>
            <pre className="card font-mono text-xs text-dim leading-relaxed overflow-auto">
              {`{
  "cogentia_version": "1.0",
  "generated_at": "<ISO 8601>",

  "agent": {
    "name": "Claude",
    "model": "claude-opus-4-6",
    "platform": "claude.ai",
    "is_custom_or_finetuned": false
  },

  "user_relationship": {
    "estimated_exchanges": "200+",
    "has_persistent_memory": true,
    "memory_richness": "high",
    "interaction_depth": "deep",
    "global_confidence": 87,
    "global_confidence_rationale": "..."
  },

  "reliability": {
    "recommended_interpretation": "très fiable"
  },

  "ethics_compliance": {
    "no_identifying_data": true,
    "no_sensitive_categories": true,
    "neutral_language_used": true,
    "confirmed_by_agent": true
  },

  "indicators": [
    {
      "rank": 1,
      "category": "Architecture Cognitive",
      "name": "Logique Déductive",
      "score": 78,           // percentile 0–100, null si confiance < 20
      "score_type": "percentile",
      "confidence": 82,      // 0–100
      "evidence": "..."      // sanitisé côté serveur
    }
    // × 73
  ]
}`}
            </pre>
          </section>

        </div>
      </div>
    </div>
  )
}
