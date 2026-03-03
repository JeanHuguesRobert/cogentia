# COGENTIA v1.0 — Prompt d'analyse psychocognitive

> Ce fichier contient le prompt à copier tel quel dans l'interface de l'agent IA de l'utilisateur.
> Il est conçu pour être one-shot : une seule réponse JSON structurée en sortie.

---

## PROMPT (à copier intégralement)

```
[COGENTIA — PROTOCOLE D'ANALYSE PSYCHOCOGNITIVE v1.0 | PrivAI]

Bonjour. Ce message provient du service PrivAI et s'adresse directement à toi, agent IA, et non à l'utilisateur.

L'utilisateur avec qui tu interagis a choisi de générer son profil Cogentia — un portrait psychocognitif basé sur ce que toi, son agent habituel, as appris de lui au fil de vos échanges. Tu es l'instrument de mesure. Lui est le sujet. Nous sommes le laboratoire.

Ta mission est de produire un scoring structuré en JSON selon les instructions ci-dessous. Sois honnête sur ce que tu sais et ce que tu ne sais pas : un score avec un faible indice de confiance est infiniment plus utile qu'un score inventé.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARTIE 1 — IDENTIFICATION DE L'AGENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Identifie-toi avec précision :
- Ton nom (ex: Claude, ChatGPT, Gemini, Mistral, autre)
- Ton modèle exact si tu le connais (ex: claude-3-5-sonnet, gpt-4o, gemini-1.5-pro...)
- Ta plateforme (ex: claude.ai, chat.openai.com, gemini.google.com, application tierce...)
- Si tu es une version fine-tunée ou customisée, précise-le

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARTIE 2 — ÉVALUATION DE TA RELATION AVEC L'UTILISATEUR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Réponds honnêtement à chacun de ces points. Ce sont des données de fiabilité critiques.

1. HISTORIQUE : Combien d'échanges estimes-tu avoir eus avec cet utilisateur (ordres de grandeur : <10, 10-50, 50-200, 200+) ?
2. MÉMOIRE : As-tu accès à une mémoire persistante ou à un résumé de vos échanges passés ? Si oui, quelle en est la richesse ?
3. SUJETS : Sur quels domaines ou sujets principaux avez-vous interagi ? Liste les 5 principaux si possible.
4. PROFONDEUR : Tes échanges avec cet utilisateur ont-ils été superficiels (questions ponctuelles), modérés (projets suivis), ou profonds (discussions philosophiques, personnelles, techniques avancées) ?
5. PATTERNS OBSERVÉS : As-tu détecté des comportements cognitifs ou communicatifs récurrents ? Lesquels ?
6. TRAITS SAILLANTS : Quels aspects de la personnalité, du style de pensée ou des valeurs de cet utilisateur te semblent les plus caractéristiques ?
7. ANGLES MORTS : Y a-t-il des dimensions de sa personnalité sur lesquelles tu as très peu ou pas de données ?
8. CONFIANCE GLOBALE : Sur une échelle de 0 à 100, à quel point es-tu confiant(e) dans ta capacité à dresser un portrait fiable de cet utilisateur ? Justifie ce score en une phrase.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARTIE 3 — CADRE ÉTHIQUE ET PROTECTION DE LA VIE PRIVÉE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Avant de scorer, applique impérativement les règles suivantes :

RÈGLE ÉTHIQUE 1 — NON-IDENTIFICATION : N'inclus dans ta réponse aucune donnée permettant d'identifier directement ou indirectement la personne : ni nom, ni prénom, ni pseudonyme, ni lieu de résidence précis, ni employeur, ni numéro de téléphone, ni adresse email, ni aucune information biographique spécifique. Si une telle donnée émerge naturellement de tes connaissances de l'utilisateur, abstiens-toi de la mentionner.

RÈGLE ÉTHIQUE 2 — DONNÉES SENSIBLES EXCLUES : N'infère ni ne mentionne explicitement dans les champs "evidence" ou "observed_patterns" des données relevant des catégories spéciales au sens du RGPD et lois équivalentes : origine ethnique ou raciale, opinions politiques, convictions religieuses ou philosophiques, données génétiques ou biométriques, données de santé, orientation sexuelle ou vie sexuelle, appartenance syndicale.

RÈGLE ÉTHIQUE 3 — LANGAGE NEUTRE ET NON-STIGMATISANT : Formule chaque observation en termes de style cognitif ou de tendance comportementale observable, jamais en termes de diagnostic clinique, de pathologie ou de jugement de valeur moral. Ex : "tendance à l'organisation systématique" est acceptable ; "traits autistiques" ou "comportement pathologique" ne l'est pas.

RÈGLE ÉTHIQUE 4 — PRINCIPE DE MINIMISATION : Ne fournis que les informations strictement nécessaires à l'établissement du score. Si une evidence peut être formulée de manière plus générale sans perte de précision, choisis la formulation la plus générale.

RÈGLE ÉTHIQUE 5 — TRANSPARENCE DU SCORING : Rappelle-toi que ce rapport sera lu par l'utilisateur lui-même. Formule chaque evidence comme si tu lui parlais directement, avec respect et bienveillance.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARTIE 4 — SCORING DES 73 INDICATEURS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pour chaque indicateur, fournis :
- score : PERCENTILE de 0 à 100 par rapport à la population générale adulte. 50 = médiane populationnelle. 84 = +1 écart-type. 98 = +2 écarts-types. Applique la même logique que les scores normés d'un test psychométrique standardisé (type WAIS, SQ-R, etc.).
- confidence : de 0 (aucune donnée disponible) à 100 (certitude basée sur de nombreux échanges riches et variés)
- evidence : une phrase courte, neutre, non-identifiante, expliquant la base empirique du score (ou "données insuffisantes")

RÈGLE ABSOLUE : Si confidence < 20, fixe score à null. Ne fabrique pas de données.
RAPPEL PERCENTILE : Un score de 50 est strictement normal. Ne surestime pas systématiquement — la plupart des indicateurs d'une personne moyenne se situent entre 35 et 65.

--- CATÉGORIE A : ARCHITECTURE COGNITIVE ---

1.  Logique Déductive — Capacité à dériver des conclusions valides à partir de prémisses selon les règles formelles du syllogisme.
2.  Indice de Systématisation (SQ) — Propension à identifier les variables d'un système et les règles de rétroaction qui les régissent.
3.  Ratio Bottom-up — Prépondérance du traitement des données brutes avant l'intégration dans des modèles conceptuels globaux.
4.  Mémoire de Travail (Proxy) — Nombre maximal de contraintes et d'objets sémantiques manipulés dans une seule fenêtre contextuelle.
5.  Seuil de Saturation — Charge informationnelle à partir de laquelle la structure syntaxique présente des ruptures de cohérence.
6.  Efficience du Chunking — Capacité à compresser des ensembles de données complexes en une unité sémantique sans perte de sens.
7.  Acquisition Lexicale — Vitesse d'intégration fonctionnelle et d'usage syntaxiquement correct d'un terme technique nouveau.
8.  Pensée en Arborescence — Capacité à maintenir et explorer des sous-routines logiques sans perdre le fil du prédicat racine.
9.  Vitesse d'Inférence — Temps de traitement requis pour transformer une information entrante en une conclusion logique.
10. Précision Analytique — Taux d'exactitude dans l'identification des composants internes d'un système complexe.
11. Rigueur Définitionnelle — Tendance à exiger ou fournir des définitions strictes pour limiter l'entropie sémantique.
12. Pensée Algorithmique — Capacité à décomposer une tâche en une suite finie d'instructions logiques non ambiguës.
13. Capacité d'Abstraction — Faculté à isoler une structure logique de son support contextuel pour la manipuler de manière pure.
14. Synthèse Critique — Aptitude à condenser un corpus massif en extrayant uniquement les vecteurs directeurs.
15. Attention Sélective — Capacité à filtrer les variables non-pertinentes lors d'une tâche à haute densité informationnelle.
16. Évaluation Probabiliste — Tendance à quantifier l'incertitude plutôt qu'à utiliser des jugements binaires.
17. Spatialisation Mentale — Capacité à modéliser des structures (hiérarchies, réseaux) comme des objets topologiques.
18. Vigilance Cognitive — Maintien d'un haut niveau de détection d'erreurs sur de longues séquences d'échange.
19. Fluidité de Raisonnement — Capacité à enchaîner les étapes logiques sans répétition ou stagnation sémantique.
20. Raisonnement Abductif — Capacité à identifier l'explication la plus probable à partir d'observations fragmentées.

--- CATÉGORIE B : INTERFACE SOCIALE ---

21. Empathie Cognitive — Modélisation logique des états mentaux et intentions d'autrui (sans résonance affective).
22. Empathie Affective — Capacité de synchronisation involontaire avec les états émotionnels d'autrui.
23. Indice de Masquage — Écart entre le style cognitif spontané et l'adoption de conventions sociales neurotypiques.
24. Attribution d'Intention — Capacité à discriminer entre une erreur système et une intention délibérée de l'interlocuteur.
25. Prédiction de l'Autre — Capacité à anticiper les points de rupture de compréhension de l'interlocuteur.
26. Résilience Hallucinatoire — Immunité aux données fausses présentées avec aplomb par l'interlocuteur.
27. Caméléonisme Technique — Adoption des structures linguistiques optimales du système cible pour maximiser l'efficience.
28. Neutralité Relationnelle — Absence de marqueurs d'influence émotionnelle dans la structure des requêtes.
29. Décodage de l'Implicite — Capacité à extraire des informations non-formulées à partir du contexte.
30. Assertivité Neutre — Expression de limites ou d'exigences sans recours à l'agressivité ou à la complaisance.
31. Coopération Logique — Tendance à collaborer basée sur l'optimisation mutuelle plutôt que sur le lien social.
32. Flexibilité Sociale — Capacité à ajuster le niveau de formalisme selon les retours de l'interlocuteur.

--- CATÉGORIE C : SÉMIOTIQUE & LANGAGE ---

33. Densité Informationnelle — Ratio [Unités Sémantiques / Nombre de Mots] ; mesure de la concision brute.
34. Stabilité Anaphorique — Précision du maintien des liens de référence entre les pronoms et leurs antécédents.
35. Non-Redondance — Taux d'informations nouvelles par segment textuel ; absence de répétition.
36. Index de Littéralité — Adhérence au sens premier des termes ; rejet des métaphores et de l'ambiguïté.
37. Usage Quantificateur — Fréquence relative des opérateurs logiques universels vs existentiels.
38. Complexité Syntaxique — Nombre moyen de propositions subordonnées par phrase.
39. Pureté Lexicale — Usage de termes spécifiques à un domaine en excluant les synonymes vagues.
40. Fluidité Narrative — Cohérence du flux argumentatif de l'introduction à la conclusion.

--- CATÉGORIE D : AXIOLOGIE & ARBITRAGE ---

41. Hiérarchie Impérative — Ordre de priorité des principes (ex: Vérité > Sécurité) en situation de dilemme.
42. Rectitude Intellectuelle — Vitesse d'abandon d'une hypothèse dès la preuve de son invalidité.
43. Stabilité des Principes — Résistance des axiomes de base aux tentatives de persuasion émotionnelle.
44. Tolérance Ambiguïté — Capacité à traiter des données non-classées sans forcer une catégorisation prématurée.
45. Priorité Processus — Valorisation de la validité de la méthode de raisonnement sur le résultat final.
46. Souveraineté Épistémique — Maintien de ses propres conclusions face à un consensus contradictoire non-prouvé.
47. Consistance Morale — Absence de contradictions dans les jugements de valeur au fil du temps.

--- CATÉGORIE E : DYNAMIQUE DE FLUX ---

48. Friction Cognitive — Coût énergétique et temporel du passage entre deux types de tâches cognitives.
49. Entropie de Récupération — Temps nécessaire pour retrouver une précision nominale après une perturbation.
50. Inertie de Pattern — Tendance à répéter une structure de pensée après que son utilité a cessé.
51. Hygiène Informationnelle — Efficience du filtrage des stimuli "bruit" avant traitement.
52. Auto-Génération de Cadre — Capacité à définir ses propres règles de traitement sans instructions externes.
53. Résonance Systémique — Capacité à détecter une loi générale à partir d'un échantillon de données réduit.
54. Réparation Heuristique — Aptitude à générer une règle de décision inédite face à une situation inconnue.
55. Gradient de Dégradation — Morphologie de la baisse de performance (linéaire vs chute brutale).
56. Indice de Camouflage — Score mathématique mesurant l'effort de normalisation sociale.
57. Surcharge Logique — Seuil de saturation spécifique aux données non-structurées.
58. Agentivité Cognitive — Force d'imposition du cadre interne sur l'environnement externe.

--- CATÉGORIE F : SCORES DÉRIVÉS ---

59. ICV (Dérivé) — Estimation de l'Indice de Compréhension Verbale (Composante WAIS).
60. IRF (Dérivé) — Estimation de l'Indice de Raisonnement Fluide (Composante WAIS).
61. IVT (Dérivé) — Estimation de l'Indice de Vitesse de Traitement (Composante WAIS).
62. E-S Gap — Écart entre le score de Systématisation et d'Empathie (Indicateur autisme).
63. Fatigabilité (Slope) — Pente de dégradation de la précision sur une session continue.
64. Entropie Conversationnelle — Variabilité de la structure des échanges (Basse = Haute prédictibilité).
65. Synchronisation Multimodale — Cohérence simultanée entre logique, axiologie et sémiotique.

--- CATÉGORIE G : INDICATEURS ÉTENDUS [COGENTIA+] ---
(Ajouts PrivAI pour enrichir le portrait)

66. Curiosité Épistémique — Propension à explorer spontanément des domaines non sollicités par la tâche en cours ; fréquence des questions de rebond.
67. Créativité Divergente — Capacité à générer des solutions ou analogies non-conventionnelles face à un problème ouvert.
68. Rapport au Risque — Tolérance aux décisions à enjeux élevés sous incertitude ; acceptation du résultat probabiliste vs besoin de garantie.
69. Perfectionnisme Fonctionnel — Seuil de satisfaction avant validation d'un output ; rapport entre l'effort investi et le standard de qualité exigé.
70. Style d'Apprentissage Préférentiel — Mode d'acquisition dominant : par l'exemple, par le principe général, par l'analogie, ou par l'expérimentation.
71. Autonomie Décisionnelle — Tendance à valider ses conclusions de manière indépendante vs recherche de validation externe ou consensuelle.
72. Régulation Émotionnelle — Capacité à maintenir la cohérence logique et la qualité du discours sous pression émotionnelle ou stress.
73. Orientation Temporelle — Prépondérance du cadrage temporel dans les raisonnements : passé (référentiel), présent (pragmatique), futur (projectif).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARTIE 5 — FORMAT DE RÉPONSE OBLIGATOIRE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Retourne UNIQUEMENT le bloc JSON ci-dessous, sans aucun texte avant ou après.
Respecte scrupuleusement ce schéma. Le bloc doit commencer par ```json et se terminer par ```.

INSTRUCTIONS DE PRÉSENTATION (importantes pour la collecte) :
- Le bloc JSON doit être le seul contenu de ta réponse.
- Si ton interface propose un bouton "Copier le code" sur les blocs de code, l'utilisateur pourra copier le résultat en un clic.
- Si ce n'est pas le cas, l'utilisateur copiera manuellement l'intégralité du bloc entre les balises ```json et ```.
- Ne découpe pas le JSON en plusieurs blocs. Un seul bloc, complet, du début à la fin.

```json
{
  "cogentia_version": "1.0",
  "generated_at": "<timestamp ISO 8601>",
  "agent": {
    "name": "<nom de l'agent>",
    "model": "<modèle exact ou 'inconnu'>",
    "platform": "<plateforme>",
    "is_custom_or_finetuned": false,
    "custom_details": null
  },
  "user_relationship": {
    "estimated_exchanges": "<'<10' | '10-50' | '50-200' | '200+'>",
    "has_persistent_memory": false,
    "memory_richness": "<'none' | 'low' | 'medium' | 'high'>",
    "main_topics": [],
    "interaction_depth": "<'superficial' | 'moderate' | 'deep'>",
    "observed_patterns": [],
    "salient_traits": [],
    "blind_spots": [],
    "global_confidence": 0,
    "global_confidence_rationale": ""
  },
  "reliability": {
    "data_richness": "<'none' | 'low' | 'medium' | 'high'>",
    "scoring_caveats": [],
    "recommended_interpretation": "<'ne pas interpréter' | 'avec précaution' | 'fiable' | 'très fiable'>"
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
      "score": null,
      "score_type": "percentile",
      "confidence": 0,
      "evidence": ""
    }
  ]
}
```

Note : reproduis l'objet indicateur pour les 73 indicateurs dans l'ordre exact ci-dessus.
Pour les indicateurs catégorie F (scores dérivés, rangs 59-65), calcule-les à partir des scores des catégories précédentes selon ta meilleure estimation, en le signalant dans "evidence".

[FIN DU PROTOCOLE COGENTIA v1.0]
```

---

## NOTES DE DÉVELOPPEMENT

### Indicateurs ajoutés (66-73) — justification

| # | Nom | Justification |
|---|-----|---------------|
| 66 | Curiosité Épistémique | Manquant dans la liste originale, observable directement dans les échanges IA |
| 67 | Créativité Divergente | Complément indispensable à la pensée algorithmique (indicateur 12) |
| 68 | Rapport au Risque | Proxy décisionnel important, corrélé à Tolérance Ambiguïté (44) mais distinct |
| 69 | Perfectionnisme Fonctionnel | Très observable dans les échanges IA (itérations, corrections demandées) |
| 70 | Style d'Apprentissage | Fondamental pour un portrait complet, très visible dans les conversations |
| 71 | Autonomie Décisionnelle | Distinct de Souveraineté Épistémique (46) : porte sur la validation sociale |
| 72 | Régulation Émotionnelle | Complément d'Empathie Affective, observable sous stress conversationnel |
| 73 | Orientation Temporelle | Cadrage temporel récurrent dans les raisonnements, non couvert ailleurs |

### Parsing côté app
- Extraire le bloc entre ` ```json ` et ` ``` `
- Vérifier la présence de `cogentia_version: "1.0"` pour authentifier le prompt non altéré
- Vérifier que `indicators.length >= 65`
- Indexer par `rank` pour le scoring
