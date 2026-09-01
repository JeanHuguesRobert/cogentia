---
title: "Archéologie & Fondations — Runner Rossignol 24h & Veille Corse Sénatoriales 2026"
status: published
corpus_role: source
document_role: research-paper
document_kind: technical-note
lifecycle_state: active
date: "2026-09-01"
author: "Jean Hugues Noël Robert, baron Mariani (assistant agentique)"
keywords:
  - Rossignol
  - Issue #141
  - Issue #140
  - Issue #139
  - Issue #123
  - Veille Territoriale Corse
  - Sénatoriales 2026
  - Autonomie de Capacité
  - Cognitive Packets
  - Convergence Checkpoint
summary: >
  Note d'archéologie technique et doctrinale pour l'implémentation de la veille Rossignol (Issue #141 / #140).
  Recensement exhaustif des briques existantes dans Cogentia et Inseme, alignement COP-native,
  et cadrage des flux d'intelligence territoriale corse indispensables pour la campagne sénatoriale du 27 septembre 2026.
---

# Archéologie & Fondations — Runner Rossignol 24h & Veille Corse (Issue #141)

## 1. Contexte et mandat expérimental

Cette note répond aux exigences de l'**Issue #141** de Cogentia (*Implement #140 Rossignol — minimal COP-native 24h Intelligence Watch runner*), inscrite dans le cadre programmatique de l'**Issue #140** (évaluation de charge et calibration EuroHPC) et de l'**Issue #139** (carte de financement et d'accès aux capacités de calcul 2026).

La consigne impérative de l'Issue #141 stipule :
> **1. Start with archaeology** : Avant d'écrire du code, inspecter les dépôts existants et identifier ce qui peut déjà être réutilisé (...). Ne pas créer d'abstractions parallèles quand une primitive COP/Cogentia existante porte déjà la sémantique.

Une exigence politique et stratégique prioritaire s'y superpose : **l'intégration et l'exploitation des données territoriales de Corse cruciales pour la campagne sénatoriale du 27 septembre 2026** (scrutin des grands électeurs / maires ruraux).

---

## 2. Inventaire archéologique des primitives réutilisables

| Domaine architectural | Fichiers / Modules existants | Rôle sémantique réutilisé | Statut de réutilisation |
|---|---|---|---|
| **COP Packet Accounting** | `scripts/lib/cop-surface-accounting.js`<br>`inseme/packages/cop-kernel/src/accounting/packetAccounting.js` | Comptabilisation native des jetons, temps d'exécution, mandats, cascade upstream/downstream, réservations budgétaires sans registre parallèle. | Directement importé et branché sur la boucle de mesure. |
| **Capsules de Paquets Cognitifs** | `scripts/lib/packet-capsule.js`<br>`research/documents_as_cognitive_packets.md` | Schémas `PACKET_CAPSULE_SCHEMA` (`cogentia.packet_capsule/v1`) et `CONTINUATION_CAPSULE_SCHEMA`, hash SHA-256 de contenu, clôture vérifiée `Closed(p, h, E)`. | Utilisé pour encapsuler chaque événement candidat extrait des flux. |
| **Journal durable & Continuations (F2a/F3)** | `scripts/lib/continuation-frontier-f2a.js`<br>`.cogentia/continuations/` | Protocole `cogentia.f2a_fact/v1`, journal de faits append-only `createDurableFactLog`, points de choix (`CHOICE_POINT_MODE_OR`/`AND`), frontier de continuation. | Enregistrement append-only des faits observés durant le run 24h. |
| **Convergence & Décorrélation (#123)** | `scripts/run-decorrelated-reviews.js`<br>`docs/multi-agent-decorrelated-review-master-plan.md` | Branches exploratoires isolées, préservation de l'absence d'exposition mutuelle (`mutual_exposure: none`), refus du faux consensus ("Ant Mill"), préservation des discriminants non résolus. | Patron canonique pour la divergence 3-branches et le Convergence Checkpoint. |
| **Cycle de Sommeil Préemptible (#124)** | `scripts/run-corpus-sleep-cycle.js`<br>`scripts/lib/corpus-sleep-cycle/index.js` | Consolidation bornée en fin de cycle, détection de contradictions et hypothèses modifiées, file de revue append-only (`SleepCycleReviewQueue`), zéro mutation automatique non gouvernée. | Réutilisation pour la phase de clôture diurne / nocturne (Sleep Phase). |
| **Routage & Modèles IA** | `scripts/lib/ai-router-client.js`<br>`scripts/lib/cogentia-core.js`<br>Launchers locaux (`claude-anthropic.bat`, `grok.bat`, `kimi.bat`) | Niveaux de modèles configurables (`small`, `medium`, `strong`, `strongest_available`), bascule résiliente API / batch local. | Allocation paramétrable des modèles pour chaque continuation. |
| **Frontières de Confidentialité** | `scripts/lib/privacy-views.js` | Cloisonnement strict entre corpus public (`PUBLIC_VIEW`) et mémoire personnelle / privée (`PRIVATE_VIEW`). | Garantie souveraine : la veille publique ne dégénère jamais en surveillance personnelle. |
| **Mémoire de Campagne Sénatoriale** | `research/campaign/2026_senatoriales_memory.md`<br>`research/strategy/2026-07-04_trajectory_to_2026-09-27.md` | Structure vivante de campagne (27 septembre 2026), principes doctrinaux (*Autonomie de Capacité*, *Pas de pouvoir sans contrôle*, *Transparence anti-capture*), registre des grands électeurs. | Récepteur direct des flux de veille filtrés et des paquets de campagne. |
| **Doctrine Foncier & Résident Rural** | `paese/résident-rural.md` | Statut du Résident Rural, Bail Réel Solidaire (BRS), SCIC, gestion de l'indivision et biens sans maître à droit constant, non-lucrativité foncière. | Grille d'évaluation des annonces foncières et politiques du logement en Corse. |
| **Énergie Territoriale & FractaVolta** | `FractaVolta/`<br>`research/acorsica-institut-mariani.md` | Autoconsommation collective villageoise, batteries seconde vie, micro-réseaux ruraux, PPE Corse, souveraineté énergétique. | Grille d'évaluation des flux énergétiques insulaires. |

---

## 3. Contraintes architecturales COP-Native

Le runner Rossignol préserve la chaîne canonique COP :

```text
Sources publiques territoriales & IA
        ↓
Collecte avec traçabilité & provenance
        ↓
Triage économique & déduplication (hash SHA-256)
        ↓
Veille Corse (Focus Sénat) + Veille IA (Focus Cogentia)
        ↓
Événements candidats qualifiés
        ↓
Encapsulation en Paquets Cognitifs & Continuations
        ↓
Branches d'exploration indépendantes (3 perspectives étanches)
        ↓
Convergence Checkpoint (Accords / Désaccords / Discriminants)
        ↓
Cycle de Sommeil borné (Consolidation & signalement d'incohérences)
        ↓
Traces, Reçus COP et Journal de Mesure de Charge
```

---

## 4. Spécification des Flux de Veille Corse pour la Campagne Sénatoriale

Pour l'élection sénatoriale du **27 septembre 2026**, le collège électoral est constitué des **grands électeurs** : maires des 360 communes de Corse (dont l'immense majorité sont des communes rurales de montagne ou de l'intérieur), délégués municipaux, conseillers territoriaux de l'Assemblée de Corse, et parlementaires.

La veille Corse Rossignol est donc calibrée sur 6 axes thématiques décisifs :

### Axe 1 : Autonomie institutionnelle & Décentralisation communale
- **Enjeux** : Réforme constitutionnelle (Article 72-5), processus de Beauvau, transfert de compétences législatives et réglementaires.
- **Question discriminante pour le Sénat** : *Cette autonomie transfère-t-elle des pouvoirs réels d'action et d'ingénierie aux communes (Autonomie de Capacité), ou concentre-t-elle la bureaucratie à Ajaccio tout en asphyxiant les budgets communaux (Autonomie de papier) ?*
- **Sources publiques surveillées** : Journal Officiel, compte-rendus de l'Assemblée de Corse, amendements et rapports de la commission des lois du Sénat, déclarations des élus insulaires.

### Axe 2 : Énergie, Réseau insulaire & FractaVolta
- **Enjeux** : Programmation Pluriannuelle de l'Énergie (PPE Corse), vulnérabilité du réseau non interconnecté (ZNI), tarifs d'électricité pour les collectivités locales, retards de raccordement solaire.
- **Offre politique au maire** : Micro-réseaux villageois, autoconsommation collective, batteries de seconde vie, réduction directe de la facture communale.
- **Sources publiques surveillées** : CRE (Commission de Régulation de l'Énergie), EDF Corse / RTE, AUE (Agence d'Urbanisme et de l'Énergie de la Corse).

### Axe 3 : Foncier, Logement & Statut du Résident Rural
- **Enjeux** : Flambée spéculative littorale, désertification des villages intérieurs, blocage des successions et indivisions, biens sans maître, fiscalité de transmission.
- **Offre politique au maire** : Déploiement à droit constant du *Statut du Résident Rural* (`paese/résident-rural.md`) via BRS rural, SCIC communales et portage non lucratif.
- **Sources publiques surveillées** : Safer Corse, EPF (Établissement Public Foncier de Corse), GIRTEC (indivisions), publications INSEE Corse.

### Axe 4 : Eau, Déchets & Continuité des Services Publics Ruraux
- **Enjeux** : Crises de sécheresse récurrentes, restrictions d'irrigation agricole, saturation des centres d'enfouissement et surcoût exorbitant de l'exportation des déchets (Syvadec), fermetures des services publics de proximité.
- **Offre politique au maire** : Soutien direct à l'ingénierie communale de l'eau, tarification équitable et traitement territorialisé des déchets.
- **Sources publiques surveillées** : OEHC (Office d'Équipement Hydraulique de la Corse), Syvadec, ARS Corse, Préfecture de Haute-Corse et Corse-du-Sud.

### Axe 5 : Transparence anti-capture, Marchés publics & Contrôle (#1755)
- **Enjeux** : Régularité de la commande publique, contrôle des fonds territoriaux, transparence des subventions communales, impartialité administrative.
- **Principe directeur** : *Pas de pouvoir sans contrôle*.
- **Sources publiques surveillées** : Chambre Régionale des Comptes (CRC Corse), Tribunal Administratif de Bastia, BODACC / marchés publics de Corse.

### Axe 6 : Souveraineté Cognitive Territoriale (CCDT & IA pour chacun)
- **Enjeux** : Permettre aux petites communes rurales d'analyser les dossiers complexes de subvention, les normes d'urbanisme (PLU, PADDUC) et les appels d'offres sans dépendre de cabinets privés onéreux.
- **Principe directeur** : Démocratisation de l'IA pour les sujets souverains.

---

## 5. Modèle de Mesure de Charge (Issue #140)

Le journal d'exécution capture systématiquement l'enveloppe de mesure `work_measurement` définie dans #140 :
- Horodatage et catégorie (`corsica`, `ai`, `exploration`, `convergence`, `sleep`) ;
- Nombre d'éléments ingérés et filtrés ;
- Jetons d'entrée et de sortie ;
- Classe de modèle (`small`, `medium`, `strong`, `strongest_available`) ;
- Temps d'horloge (wall time) et temps CPU/GPU ;
- Nombre de branches exploratoires et indicateur d'étanchéité (`independent_source_lineages`) ;
- Paquets et continuations générés ou réveillés ;
- Tests de réalité (`reality_tests`) produits.

Cette modélisation empirique servira de base de calcul pour dimensionner la demande d'allocation EuroHPC 90 jours.
