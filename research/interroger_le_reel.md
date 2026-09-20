---
title: "Interroger le Réel"
subtitle: "Méthode opérationnelle de sonde, trace, observation et correction"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-09-16"
last_modified_at: "2026-09-21"
version: "0.4"
status: "working-method"
language: "fr"
license: "CC BY-SA 4.0"
document_role: "source"
document_kind: "methodological-note"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-DEFAULT-REVIEWED"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/interroger_le_reel.md"
language_peer: "research/interrogating_reality.md"
related_documents:
  - "interrogating_reality.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/principe_rossignol.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/triangulation_du_reel.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/traceabilite_des_actes.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/fable_experimentale.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/realite_operationnelle_et_reflexivite.md"
  - "../interaction_packets/architecture.md"
  - "reality_probe_selection.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/serendipity_as_epistemic_force.md"
  - "https://github.com/JeanHuguesRobert/inseme/blob/main/research/interactions_registry_and_multichannel_messaging.md"
provenance:
  origin_type: "method extraction from Corpus practice"
  origin_date: "2026-09-16"
  derived_from:
    - "Principle Rossignol"
    - "Triangulation du Réel"
    - "Traçabilité des actes"
    - "Fable expérimentale"
    - "Interaction Packets"
review:
  status: "unreviewed"
  reviewed_by: []
---

# Interroger le Réel

## Parité linguistique

Ce document et [Interrogating Reality](interrogating_reality.md) sont des **pairs linguistiques co-souverains**.

Aucun des deux n'est, au sens doctrinal, un produit dérivé de l'autre. Chacun porte `document_role: source`, possède sa propre adresse canonique et dispose de la même autorité pour la méthode. Ils ont vocation à rester en **verrouillage sémantique**.

L'artefact anglais a été initialement produit à partir de l'artefact français déjà existant. Cette direction historique de production ne crée **aucune direction d'autorité**.

> **L'histoire de la traduction relève de la provenance, pas de la hiérarchie.**

Si les deux pairs linguistiques divergent substantiellement, cette divergence constitue une dette de synchronisation à résoudre explicitement. Un agent NE DOIT PAS privilégier silencieusement une langue parce qu'elle a été écrite la première, qu'elle est plus facile à retrouver ou qu'elle est plus proche de sa langue de travail par défaut.

Le pair anglais est particulièrement utile aux agents IA parce qu'il supprime une étape implicite et répétée de traduction lors de la recherche et du raisonnement. Cela peut réduire la dérive terminologique, préserver un vocabulaire opérationnel stable entre prompts et outils, améliorer la recherche interlangue et rendre les citations reproductibles entre agents. Cette utilité opérationnelle ne rend pas l'anglais sémantiquement supérieur.

## Objet

**Interroger le Réel** est une méthode de passage de l'incertitude à une observation traçable lorsqu'une information manquante peut raisonnablement être obtenue par une interaction avec le monde, un acteur, une institution ou un système.

Formule canonique :

> **Ne pas demander au modèle de compléter le Réel lorsqu'il est possible de demander au Réel de répondre.**

La méthode ne suppose pas que toute réponse soit vraie ni que tout silence ait une signification causale. Elle organise une boucle corrigible : poser une question suffisamment précise, produire la sonde la plus légère capable d'obtenir une réponse informative, conserver la trace, qualifier l'observation, puis réviser l'état de connaissance.

```text
état de connaissance K(t)
        ↓
question falsifiable / discriminante
        ↓
sonde minimale
        ↓
interaction avec le Réel
        ↓
trace brute
        ↓
observation(s) qualifiée(s)
        ↓
K(t+1)
        ↓
continuer | trianguler | arrêter
```

## 1. Position dans le Corpus

La méthode n'est pas une doctrine isolée. Elle opérationnalise plusieurs principes existants :

- **Rossignol** : construire un point où le Réel peut répondre autrement que prévu ;
- **Triangulation du Réel** : confronter plusieurs voies d'accès et plusieurs hypothèses concurrentes ;
- **Traçabilité des actes** : conserver l'acte, sa réponse et les traces négatives sans transformer l'anomalie en explication ;
- **Fable expérimentale** : transformer une intuition en hypothèse puis en expérience modeste, réversible et documentée ;
- **Interaction Packets** : donner une forme durable et réutilisable à l'interaction et à son suivi.

`Interroger le Réel` décrit donc surtout **le cycle actif d'acquisition** qui relie ces briques.

## 2. Deux régimes : observation passive et sonde active

### 2.1 Observation passive

Lorsque la trace existe déjà :

```text
chercher
→ retrouver
→ vérifier provenance et date
→ comparer
→ qualifier
```

Exemples : document public, décision, registre, statistique, courrier déjà reçu, historique Git.

### 2.2 Sonde active

Lorsque l'information manque mais qu'un acteur ou un système peut raisonnablement répondre :

```text
question
→ cible capable de répondre
→ canal proportionné
→ demande minimale
→ réponse / absence qualifiée
```

Exemples : demander la copie d'un document cité mais non publié, demander si un document existe encore, vérifier qui le détient, demander une précision factuelle bornée.

## 3. Prior : écrire ce que l'on sait avant de sonder

Une sonde utile commence par un **prior explicite**. Il peut être très court :

```yaml
prior:
  statement: "Le rapport public mentionne une contribution écrite mais ne la reproduit pas."
  evidence_ref: "source publique"
  confidence: "forte"
  unknown: "La contribution complète est-elle encore disponible et communicable ?"
```

Le prior évite de reformuler après coup l'état initial pour le faire coïncider avec la réponse reçue.

## 4. Bonne sonde

Une sonde est bonne lorsqu'elle est :

- **ciblée** : elle pose une question identifiable ;
- **informative** : plusieurs réponses possibles modifieraient réellement la carte ;
- **proportionnée** : coût et nuisance faibles au regard de l'information recherchée ;
- **non suggestive lorsque possible** : elle ne force pas la réponse attendue et évite, lorsque cela importe, de révéler inutilement les catégories ou discriminants internes de l’enquête ;
- **traçable** : cible, date, canal, contenu et réponse peuvent être retrouvés ;
- **réversible / corrigible** : une erreur de formulation peut être rectifiée sans dommage disproportionné ;
- **simple** : la sophistication de l'enquête ne doit pas contaminer la simplicité de l'expérience.

> **La sophistication de l'enquête doit rester derrière la simplicité de la sonde.**

## 5. Unité minimale de sonde

Une campagne peut représenter chaque sonde par un petit objet :

```yaml
probe:
  id: probe:...
  campaign: ...
  question: ...
  prior_claim: ...
  prior_evidence: ...
  target: ...
  channel: email | form | phone | public-record | other
  status: planned | drafted | sent | answered | closed
  sent_at: null
  response_due_at: null
  parent_probe: null
  interactions: []
  observations: []
  next_action: null
```

Ce schéma est conceptuel : lorsqu'un Interaction Packet existant suffit, ne pas créer un format concurrent. La sonde peut être une projection ou une extension légère du registre d'interactions.

## 6. Taxonomie minimale des réponses

Une interaction peut produire une ou plusieurs observations distinctes :

```text
document_received
existence_confirmed
existence_unknown
possession_confirmed
possession_denied
communication_refused
partial_response
redirected
clarification_received
contradiction_detected
silence_observed
delivery_failed
```

Éviter les raccourcis : une réponse peut confirmer l'existence d'un document tout en refusant sa communication ; une redirection peut être utile sans répondre au fond ; un document reçu peut contredire le prior.

## 7. Discipline du silence

Le silence est une observation bornée :

```text
aucune réponse observée
après telle demande
adressée à telle cible
sur tel canal
pendant telle durée
```

Il ne signifie pas automatiquement :

```text
refus
absence du document
mauvaise volonté
dissimulation
faute
coordination
```

Formule :

> **Silence observé ≠ cause du silence établie.**

Une trace négative peut néanmoins justifier une continuation : relance unique, autre canal, autre détenteur, demande plus précise, ou clôture.

## 8. Hypothèses concurrentes et escalade

Après une anomalie, conserver plusieurs explications tant que les traces ne les discriminent pas. Échelle pratique :

```text
bruit / erreur matérielle
→ incompréhension
→ mauvais canal / mauvais détenteur
→ désorganisation / cloisonnement
→ inertie
→ négligence / incitation systémique
→ comportement délibéré
→ coordination entre acteurs
```

Ce n'est pas une séquence obligatoire : une preuve directe peut établir immédiatement un niveau fort. À défaut, la sonde suivante doit chercher à **réduire l'espace des explications**, non à confirmer l'hypothèse préférée.

## 9. Parallélisme et proportionnalité

Il n'existe pas de plafond universel arbitraire au nombre de sondes parallèles.

```text
capacité d'enquête
→ autorise le parallélisme

proportionnalité
→ limite la nuisance par cible et par canal
```

Règle :

> **La proportionnalité limite la nuisance, pas la connaissance.**

Plusieurs détenteurs indépendants peuvent donc être interrogés en parallèle lorsque cela augmente la valeur discriminante. En revanche, multiplier les relances identiques vers la même personne sans information nouvelle dégrade la méthode.

Une politique locale peut par exemple limiter le nombre de relances sans réponse ou imposer l'arrêt après un refus explicite.

## 10. De la réponse à la connaissance

Ne pas copier directement la formulation de l'interlocuteur dans la carte comme vérité canonique.

```text
réponse brute
→ trace
→ faits directement observables
→ observations qualifiées
→ questions ouvertes
→ hypothèses concurrentes
→ triangulation
→ mise à jour de la carte
```

Une déclaration d'un détenteur est une trace de ce qu'il déclare ; un document transmis peut établir davantage ; une absence dans ses archives n'établit pas nécessairement une inexistence historique.

## 11. Relation avec Interaction Packets

Les Interaction Packets sont le support naturel des sondes lorsque l'interaction est conséquente ou doit être suivie.

```text
probe
  ↓
interaction packet
  ├── demande
  ├── canal / ids externes
  ├── réponse(s)
  ├── pièces / références
  ├── disclosure
  └── follow-up
       ↓
observation(s)
       ↓
Twin / Atlas / dossier / autre projection
```

Méthode et traces restent séparées : la méthode générique vit dans Cogentia ; les traces vivantes restent avec le sujet ou le dossier auquel elles appartiennent.

## 12. Test minimal avant émission

Avant une sonde externe, demander :

```text
1. Quelle information exacte manque ?
2. Quelle trace publique établit le prior ?
3. Cette cible est-elle capable de répondre ?
4. Quelle est la question la plus petite qui discrimine réellement ?
5. Quelles réponses possibles changeront la carte ?
6. Comment enregistrerai-je une réponse partielle, un refus ou un silence sans surinterpréter ?
7. Une autre cible indépendante permet-elle une triangulation peu coûteuse ?
8. La formulation révèle-t-elle la réponse, l’événement, la catégorie ou le discriminant que je cherche précisément à observer ?
9. Puis-je retirer de l’information sans rendre la demande inintelligible ?
10. Une première sonde plus ouverte préserverait-elle une réponse plus indépendante ou une découverte non anticipée ?
```

## 13. Exemple abstrait

```text
Trace publique : "contribution écrite X" citée mais non annexée
        ↓
Inconnu : texte complet disponible ?
        ↓
Sonde A : demander au secrétariat qui l'a reçue
Sonde B : demander à l'auteur qui l'a produite
        ↓
A répond "non conservée" ; B transmet le document
        ↓
Observations :
- possession institutionnelle non établie / déclarée absente
- existence et contenu établis par la copie source de l'auteur
        ↓
Carte corrigée
```

La divergence entre A et B n'est pas un échec : elle produit précisément une information que la recherche passive ne donnait pas.

## 14. Formules canoniques

> **Ne pas demander au modèle de compléter le Réel lorsqu'il est possible de demander au Réel de répondre.**

> **La réponse du Réel est une observation avant d'être une explication.**

> **Tracer l'anomalie n'est pas expliquer sa cause.**

> **Une bonne sonde réduit l'espace des hypothèses ; elle ne sert pas à faire avouer au Réel ce que l'on croyait déjà.**

> **La proportionnalité limite la nuisance, pas la connaissance.**

## 15. Transformer sans rompre la chaîne de preuve

La sonde n'est utile que si la connaissance produite reste reliée à ce qui l'a produite. La méthode adopte donc un invariant de **non-perte traçable** :

> **Une transformation peut simplifier, projeter, agréger ou reformater l'information ; elle ne doit pas faire disparaître silencieusement ce qu'elle ne comprend pas.**

```text
Réel
 ↓
trace brute
 ↓
Packet
 ↓
projection
 ↓
analyse
 ↓
conclusion provisoire
```

Chaque étage doit permettre de revenir vers les traces qui ont produit l'étage suivant.

Deux exigences sont distinctes :

1. **non-perte sémantique** : l'information non projetée survit aux transformations et aux écritures sur une vue simplifiée ;
2. **non-perte historique** : les états antérieurs pertinents restent adressables ou reconstructibles.

Une transformation peut donc être localement destructive sans l'être globalement, si elle conserve une référence durable vers l'objet plus riche dont elle dérive.

Cette règle rejoint le pattern [Packet-Backed Projection](../patterns/packet-backed-projection/PATTERN.md) : les colonnes SQL, résumés, vues publiques, Atlas ou états de Twin peuvent être des projections plus pauvres que leur source, sans que leur pauvreté devienne une destruction d'information.

Pour une transformation importante, conserver lorsque pertinent :

```text
input_ref
input_hash
transformation
transformation_version
output_ref
output_hash
performed_at
actor / agent
```

Formule opérationnelle pour les agents :

> **Un agent peut produire une vue plus simple ; il ne doit jamais confondre simplification et effacement de la source.**

## 16. Première campagne de dogfood

Première application structurée : reconstitution du corpus préparatoire public/non publié relatif aux travaux parlementaires sur l'évolution institutionnelle de la Corse (2024-2026), en particulier les contributions écrites, questionnaires et documents de travail cités mais non intégralement publiés.

Le dossier de campagne vit avec son sujet territorial dans `barons-Mariani/research/autonomia/`, tandis que la méthode reste ici dans Cogentia.

## 17. Blindage épistémique et ouverture à la sérendipité

Une sonde peut être grammaticalement neutre tout en restant cognitivement suggestive.

Le risque ne se limite pas à la **suggestion de réponse**. Un enquêteur peut laisser fuir des éléments de sa carte interne dans la sonde elle-même et ainsi structurer l'observation obtenue. Les formes pertinentes comprennent :

~~~text
fuite de réponse
    suggérer la réponse attendue

fuite d'événement
    suggérer qu'un événement déterminé a eu lieu

fuite de catégorie
    imposer les catégories propres de l'enquêteur

fuite causale
    introduire une relation causale supposée

fuite de saillance
    révéler, par la formulation, l'ordre, le contraste ou la répétition,
    ce que l'enquêteur considère comme important
~~~

Terme de travail :

> **Fuite épistémique** : projection, dans une sonde adressée au Réel, d'éléments de la représentation interne de l'enquêteur susceptibles de structurer la réponse observée.

Cela étend l'exigence précédente selon laquelle une bonne sonde doit être non suggestive. Une question peut éviter toute formulation explicitement orientée tout en révélant encore l'ontologie, la chronologie, le cadre causal ou le discriminant que l'enquêteur espère retrouver.

### 17.1 Carte riche, sonde sobre

L'enquêteur peut et doit souvent conserver un prior privé riche :

~~~text
traces connues
chronologies candidates
hypothèses concurrentes
discriminants attendus
contre-hypothèses
inconnues
~~~

Cette richesse n'a pas à être exportée dans la sonde.

> **La Carte peut être riche ; la sonde doit rester sobre.**

Formule compacte :

> **Connaître richement. Interroger sobrement. Comparer après.**

Le prior n'est pas abandonné. Il est figé avant la sonde et utilisé **après** la réponse pour évaluer quels éléments sont apparus indépendamment.

### 17.2 Masquer le discriminant sans falsifier le Réel

Lorsque la connaissance de l'intention de l'enquêteur peut modifier la réponse, il peut être utile de **masquer le discriminant**.

Les techniques admissibles peuvent notamment comprendre :

- le rappel libre avant toute question ciblée ;
- plusieurs thèmes contextuels véridiques et comparables ;
- une variation contrôlée de l'ordre des questions ;
- des questions symétriques dont la formulation ne singularise pas l'hypothèse cible ;
- des contrôles positifs ou négatifs peu coûteux lorsqu'ils ont une véritable valeur épistémique.

On peut parler de **blindage de la sonde** ou de **bruit contextuel contrôlé**. Cela ne doit pas reposer sur des faits inventés, de faux souvenirs ou des prémisses trompeuses.

> **Masquer le discriminant ; ne pas falsifier le Réel.**

Une doctrine distincte de protection de la vie privée peut permettre à un répondant privé, dans des circonstances bornées, de protéger une frontière privée légitime par l'opacité défensive, voire par une tromperie défensive. Cela n'autorise **pas** l'enquêteur à injecter de faux faits, de faux souvenirs ou des prémisses trompeuses dans une sonde adressée au Réel. Les rôles et les devoirs sont différents :

~~~text
répondant protégeant une frontière privée légitime
    → éthique de la vie privée

enquêteur cherchant à obtenir une preuve
    → discipline d'intégrité de la sonde
~~~

Le premier point concerne ce qu'une personne peut légitimement retenir ou protéger. Le second concerne la contamination éventuelle de l'observation par l'enquêteur.

Le but n'est pas de manipuler le répondant vers une réponse préférée. Il est de réduire la quantité d'information que la sonde révèle elle-même sur ce que l'enquêteur cherche à observer.

### 17.3 Du rappel libre à la reconnaissance explicite

Pour les sondes adressées à une source humaine, une progression utile est :

~~~text
P0 — rappel libre
     cadrage minimal par l'enquêteur
     possibilité maximale de rappel spontané

P1 — thèmes larges et équilibrés
     bruit contextuel contrôlé

P2 — questions discriminantes ciblées
     espace des Possibles plus étroit

P3 — reconnaissance explicite
     « Vous souvenez-vous de X ? »
     forte discrimination ciblée,
     mais contamination connue
~~~

Les éléments obtenus à chaque étage doivent conserver la provenance de leur mode d'élucidation.

Un fait rappelé spontanément à P0 n'est pas épistémiquement équivalent à un fait seulement reconnu après suggestion explicite à P3.

### 17.4 Ouverture à la sérendipité

Une sonde trop étroitement optimisée pour une question connue peut empêcher de découvrir que cette question était elle-même incomplète, mal cadrée ou dirigée vers le mauvais objet.

Une sonde peut donc préserver une **ouverture à la sérendipité** : assez de liberté pour que le Réel produise une observation de grande valeur qui n'avait été ni demandée ni anticipée.

~~~text
ouverture faible
    sonde fermée oui/non
    forte discrimination ciblée
    peu de place pour les inconnues inconnues

ouverture moyenne
    domaine borné, réponse ouverte

ouverture forte
    description libre / rappel libre
    contrôle plus faible, plus forte possibilité d'attracteurs inattendus
~~~

L'ouverture utile dépend du coût, du risque, de l'attention humaine, du risque de contamination et de la valeur attendue d'une découverte non planifiée.

Invariant :

> **Ne pas concevoir une sonde si étroitement que le Réel ne puisse répondre qu'aux questions que nous savons déjà poser.**

### 17.5 Double rendement

Après traitement d'une sonde, distinguer :

~~~text
rendement_ciblé
    ce qui a été appris sur l'incertitude qui motivait la sonde

rendement_sérendipitaire
    ce qui a été appris sans avoir été recherché
~~~

Une observation sérendipitaire n'est pas automatiquement importante ni vraie. C'est un **candidat attracteur non interrogé** à qualifier, tracer et, lorsqu'il est utile, soumettre à sa propre sonde adressée au Réel.

### 17.6 Audit de fuite épistémique

Avant d'émettre une sonde conséquente vers une source humaine, demander :

~~~text
- Ai-je révélé la réponse que j'espère obtenir ?
- Ai-je révélé un événement dont je cherche précisément à vérifier l'existence ?
- Ai-je imposé mes propres catégories analytiques à la source ?
- La formulation, l'ordre ou le contraste révèlent-ils le véritable discriminant ?
- Puis-je retirer de l'information sans rendre la demande inintelligible ?
- Un rappel libre ou une première sonde plus large produirait-il une observation plus indépendante ?
- L'ouverture est-elle suffisante pour permettre au Réel de faire surgir quelque chose que je n'avais pas anticipé ?
~~~

Formule compacte :

> **Connaître richement. Interroger sobrement. Masquer le discriminant lorsque nécessaire. Préserver une ouverture à la surprise. Comparer après.**

La réponse du Réel doit pouvoir non seulement confirmer ou rejeter la Carte actuelle, mais aussi révéler ce que cette Carte ne contenait pas.

