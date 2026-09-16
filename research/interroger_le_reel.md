---
title: "Interroger le Réel"
subtitle: "Méthode opérationnelle de sonde, trace, observation et correction"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-09-16"
version: "0.1"
status: "working-method"
language: "fr"
license: "CC BY-SA 4.0"
document_role: "source"
document_kind: "methodological-note"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-DEFAULT-REVIEWED"
related_documents:
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/principe_rossignol.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/triangulation_du_reel.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/traceabilite_des_actes.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/fable_experimentale.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/realite_operationnelle_et_reflexivite.md"
  - "../interaction_packets/architecture.md"
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
- **non suggestive lorsque possible** : elle ne force pas la réponse attendue ;
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

## 15. Première campagne de dogfood

Première application structurée : reconstitution du corpus préparatoire public/non publié relatif aux travaux parlementaires sur l'évolution institutionnelle de la Corse (2024-2026), en particulier les contributions écrites, questionnaires et documents de travail cités mais non intégralement publiés.

Le dossier de campagne vit avec son sujet territorial dans `barons-Mariani/research/autonomia/`, tandis que la méthode reste ici dans Cogentia.
