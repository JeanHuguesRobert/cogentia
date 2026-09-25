---
title: "Cartographier les Reality Probes"
subtitle: "Préserver, révéler, discriminer et étendre l'espace explorable"
author: "Jean Hugues Noël Robert, baron Mariani"
date: "2026-09-25"
version: "0.2"
status: "working-method"
language: "fr"
license: "CC BY-SA 4.0"
document_role: "source"
document_kind: "methodological-note"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-DEFAULT-REVIEWED"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/reality_probe_mapping.md"
related_documents:
  - "interroger_le_reel.md"
  - "reality_probe_selection.md"
  - "measured_risk.md"
  - "../interaction_packets/architecture.md"
provenance:
  origin_type: "method extraction from live senatorial Reality Case"
  origin_date: "2026-09-25"
review:
  status: "unreviewed"
  reviewed_by: []
---

# Cartographier les Reality Probes

## Objet

`Interroger le Réel` décrit comment construire et interpréter une sonde.  
`Reality Probe Selection` décrit comment choisir ce qu'il vaut la peine d'apprendre ensuite.

Le présent document ajoute l'étape qui précède souvent la sélection :

> **cartographier l'espace des sondes encore possibles afin de ne pas optimiser prématurément sur une carte incomplète.**

L'unité de travail n'est donc pas seulement la question à poser, mais la **branche de Possible qu'une action vers le Réel peut révéler, fermer, préserver ou rendre nouvellement explorable**.

## 1. Carte des probes

Une **Probe Map** est un graphe reliant au minimum :

```text
inconnues / hypothèses vivantes
        ↓
sources, détenteurs, systèmes ou événements capables de répondre
        ↓
probes admissibles
        ↓
sorties possibles du probe
        ↓
discriminants produits
        ↓
nouveaux probes rendus possibles
        ↓
mise à jour de l'espace du Possible
```

La carte n'est pas un plan figé. Elle évolue après chaque réponse du Réel.

## 2. Pourquoi cartographier avant de sélectionner

Une sélection locale peut être rationnelle tout en étant globalement pauvre si l'enquête ignore :

- qu'une source plus riche existe ;
- qu'un journal technique va être purgé ;
- qu'un événement futur va créer un nouveau droit d'accès ;
- qu'un tiers dispose de pouvoirs d'instruction absents du canal courant ;
- qu'un inventaire pourrait révéler plusieurs sources inconnues ;
- qu'une question trop ciblée détruirait une possibilité de découverte sérendipitaire.

La cartographie sert donc à préserver la **valeur d'option épistémique**.

> **Ne pas seulement maximiser l'information obtenue maintenant ; préserver la capacité future d'en obtenir davantage.**

## 3. Fonctions d'un probe

Un même probe peut remplir plusieurs fonctions.

### 3.1 PRESERVE — préserver

Empêcher qu'une information encore connaissable devienne irréversiblement perdue.

Exemples :

```text
conserver un journal technique
figer un artefact
exporter des en-têtes
préserver une pièce avant expiration d'une durée de rétention
```

### 3.2 REVEAL — révéler la topologie

Découvrir **quelles sources existent**, qui les détient, comment elles sont nommées et comment elles s'articulent.

Exemples :

```text
demander un inventaire
demander la dénomination d'un document
identifier un système source
identifier le détenteur d'une trace
demander quels journaux ou bordereaux existent
```

Ce sont des **probes génératifs** : ils peuvent révéler des probes que l'enquêteur ne savait pas encore devoir formuler.

### 3.3 DISCRIMINATE — discriminer

Séparer des possibles concurrents déjà identifiés.

```text
reçu avant échéance ?
oui / non / indéterminable
```

### 3.4 TRIANGULATE — trianguler

Interroger le même fait depuis des systèmes ou détenteurs indépendants.

```text
trace expéditeur
+ trace destinataire
+ trace du système de transmission
+ trace du dossier reçu
```

Une divergence est une observation, pas un échec.

### 3.5 CHANGE-OBSERVER — changer d'observateur

Introduire un acteur ou un système disposant de capacités d'accès différentes.

Exemples abstraits :

```text
service opérationnel
→ responsable des données
→ autorité d'accès
→ juge / organe d'instruction
```

Le but n'est pas nécessairement l'escalade. Le changement d'observateur peut être choisi pour accéder à une surface du Réel invisible depuis le canal courant.

### 3.6 WAIT / TRIGGER — attendre un changement de phase

Certains probes deviennent possibles seulement après un événement.

```text
publication
scrutin
proclamation
expiration d'un délai
réponse d'une institution
ouverture d'archives
```

Attendre peut donc être un Act rationnel lorsque l'attente préserve davantage d'options qu'une action prématurée.

## 4. Trois rendements au lieu de deux

`Reality Probe Selection` distingue déjà :

```text
targeted_yield
serendipity_yield
```

La cartographie ajoute un troisième rendement :

```text
generative_yield
    nouveaux détenteurs
    nouvelles sources
    nouvelles catégories de trace
    nouveaux probes
    nouvelles branches de continuation
```

Une réponse qui ne résout pas la question initiale peut donc avoir une forte valeur si elle révèle **où regarder ensuite**.

## 5. Source de source

Un document répond souvent à une question.  
Un inventaire, un registre ou un journal de métadonnées peut révéler une collection entière.

Terme de travail :

> **Source de source** : trace qui décrit l'existence, l'identité, la provenance, la circulation ou la localisation d'autres traces.

Exemples :

```text
bordereau de pièces
inventaire
journal de transfert
index de dossier
registre d'événements
métadonnées de conservation
```

Lorsque l'espace documentaire est mal connu, un probe visant une source de source peut avoir une valeur générative supérieure à la demande d'une pièce particulière.

## 6. Sorties d'un probe : ne pas réduire à oui/non

Une Probe Map doit prévoir les sorties pertinentes avant émission :

```text
réponse complète
réponse partielle
existence confirmée
inexistence déclarée
détention niée
redirection
refus de communication
donnée détruite / expirée
donnée encore conservée
silence
échec de livraison
contradiction
nouvelle source révélée
nouvel événement inattendu
```

Chaque sortie doit être reliée à son **next probe**, ou à une condition d'arrêt.

## 7. Canal ≠ proposition

Une réponse absente sur un canal ne résout pas la proposition de fond.

```text
pas de réponse par email
≠
document inexistant

refus par un service
≠
aucun autre détenteur

information absente d'une vue
≠
information absente du système
```

La carte doit donc distinguer :

- **état de la question** ;
- **état du canal** ;
- **état du détenteur** ;
- **état de conservation de la trace**.

## 8. Durée de vie épistémique

Certaines possibilités d'apprendre expirent.

Pour chaque probe, enregistrer lorsque pertinent :

```yaml
time:
  earliest_at: ...
  latest_useful_at: ...
  legal_deadline: ...
  retention_risk: low | medium | high | unknown
  trigger: ...
```

Une donnée à forte valeur mais stable peut attendre.  
Une donnée moyenne susceptible d'être purgée demain peut être prioritaire.

> **La perte irréversible d'une possibilité d'apprendre est un coût épistémique.**

## 9. Valeur d'option et non-fermeture prématurée

Un Act peut produire de l'information tout en fermant d'autres branches.

Exemples génériques :

- révéler trop tôt le discriminant à un témoin ;
- multiplier les relances identiques jusqu'à rigidifier le canal ;
- laisser expirer une voie ou un délai ;
- demander une suppression alors qu'une conservation est nécessaire ;
- figer prématurément une qualification causale.

La carte doit donc conserver :

```yaml
option_effect:
  opens: [...]
  preserves: [...]
  closes: [...]
  risks_closing: [...]
```

## 10. Pas de score universel

La sélection ne doit pas masquer des valeurs hétérogènes derrière un nombre arbitraire.

Comparer au minimum :

```text
pouvoir discriminant
rendement génératif
valeur de préservation
latence
coût
attention humaine
risque / nuisance
fiabilité
réversibilité
deadline / risque d'expiration
aperture sérendipitaire
```

Lorsque plusieurs probes sont admissibles, préférer les relations de dominance claires et conserver les arbitrages humains lorsque les dimensions restent incomparables.

## 11. Schéma minimal d'une Probe Map

```yaml
probe:
  id: RP-...
  unknowns: [...]
  function:
    - preserve
    - reveal
    - discriminate
    - triangulate
    - change_observer
    - wait_trigger
  target: ...
  channel: ...
  action: ...
  prerequisite: ...
  status: candidate | ready | sent | waiting | answered | closed | superseded
  possible_outputs:
    - output: ...
      discriminates: [...]
      next_probes: [...]
  yields:
    targeted: ...
    serendipity_aperture: low | medium | high
    generative: ...
  option_effect:
    opens: [...]
    preserves: [...]
    closes: [...]
  time:
    earliest_at: ...
    latest_useful_at: ...
    legal_deadline: ...
    retention_risk: ...
  cost_risk:
    human_attention: ...
    money: ...
    latency: ...
    nuisance: ...
    reversibility: ...
  evidence_refs: [...]
  interaction_packet: ...
```

Ce schéma est une projection de travail, pas encore un standard d'implémentation.

## 12. Boucle étendue

```text
Carte du Possible K(t)
        ↓
inconnues connues
+ recherche d'inconnues inconnues
        ↓
Probe Map
        ↓
préserver ce qui peut expirer
        ↓
révéler la topologie manquante
        ↓
sélectionner un probe borné
        ↓
le Réel répond
        ↓
rendement ciblé
+ rendement sérendipitaire
+ rendement génératif
        ↓
mettre à jour K(t+1)
        ↓
mettre à jour la Probe Map
        ↓
continuer | changer d'observateur | attendre | arrêter
```

## 13. Batch mode — expansion puis réduction

Lorsque la Probe Map contient plusieurs branches comparables, l'enquête peut être traitée en **batch mode** sans pour autant exécuter en bloc les Acts externes.

Le batch porte sur le **raisonnement et la cartographie**, pas automatiquement sur les interactions avec le Réel.

### PASS A — expansion

Pour chaque probe candidat ou actif, produire le même paquet analytique :

```yaml
probe_batch_item:
  probe_id: ...
  unknowns: [...]
  prior: ...
  trigger_or_action: ...
  outputs:
    - label: ...
      establishes: [...]
      does_not_establish: [...]
      closes: [...]
      opens: [...]
      reveals_sources: [...]
      next_probes: [...]
  expiry:
    retention_risk: ...
    legal_or_operational_deadline: ...
  option_effect:
    preserves: [...]
    risks_closing: [...]
  stop_condition: ...
```

L'expansion doit rester **sémantiquement bornée** : ne pas générer toutes les réponses logiquement imaginables, mais seulement les sorties qui changent réellement la carte, la topologie des sources, une deadline ou la continuation.

### PASS B — réduction

Après expansion de tous les probes :

1. fusionner les sorties équivalentes ;
2. détecter les probes strictement redondants ;
3. distinguer les probes **actifs**, **prêts**, **conditionnels**, **déclenchés par événement** et **fermés** ;
4. détecter les probes dominés par une source déjà disponible ;
5. repérer les inconnues sans probe ;
6. repérer les probes sans pouvoir discriminant ni rendement génératif suffisant ;
7. isoler les éléments soumis à une échéance ou un risque de rétention ;
8. préserver les branches non exécutées dans la carte plutôt que de les supprimer.

### Dominance

La dominance ne doit pas être réduite à un score universel.

Un probe A peut être dit **strictement dominé** par B seulement lorsque, dans le contexte présent, B :

- couvre les mêmes inconnues utiles ;
- ne ferme pas davantage d'options ;
- n'a pas un coût, un risque ou une latence supérieurs de manière pertinente ;
- et fournit au moins autant de discrimination, de préservation ou de rendement génératif.

En cas d'arbitrage entre dimensions hétérogènes, conserver les deux branches et laisser le choix à une décision humaine ou à un Mandate explicite.

### Sorties du batch

Un batch produit idéalement trois vues cohérentes :

```text
vue détaillée par probe
        +
matrice probe × sortie × next_probe
        +
vue réduite des états / triggers / gaps
```

Il doit également produire un **diff de carte** :

```text
nouveaux probes découverts
probes rendus inutiles
inconnues désormais sans probe
deadlines nouvellement visibles
sources de sources nouvellement révélées
```

Formule compacte :

> **Expand first. Reduce second. Execute only after the map has been updated.**

---

## 14. Critère de réussite

Une campagne de probes réussie n'est pas celle qui confirme l'hypothèse initiale.

Elle réussit lorsqu'elle :

- réduit rationnellement l'espace des possibles ;
- découvre des branches qui n'étaient pas cartographiées ;
- préserve les possibilités d'apprendre qui risquaient d'expirer ;
- permet de savoir pourquoi une branche est arrêtée ;
- conserve les contradictions et les réponses négatives ;
- laisse le Corpus dans un état où l'exploration peut reprendre sans reconstruire son histoire.

Formule compacte :

> **Préserver ce qui peut disparaître. Révéler la topologie. Discriminer sans contaminer. Trianguler. Changer d'observateur lorsque nécessaire. Laisser au Réel assez d'ouverture pour produire de nouvelles branches.**
