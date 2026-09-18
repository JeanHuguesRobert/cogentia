---
title: "CPKT-2026-009 — reprise après clôture technique : Interroger le Réel, projections et sondes autonomie"
author: "Jean Hugues Noël Robert, baron Mariani"
date: "2026-09-18"
status: "continuation"
language: "fr"
license: "CC BY-SA 4.0"
document_role: "operational"
document_kind: "continuation-handoff"
visibility: "public"
lifecycle_state: "active"
update_policy: "UP-DEFAULT-REVIEWED"
provenance:
  origin_type: "conversation handoff"
  origin_date: "2026-09-18"
related_documents:
  - "research/interroger_le_reel.md"
  - "patterns/packet-backed-projection/PATTERN.md"
  - "interaction_packets/architecture.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/autonomia/campagne_sondes_corpus_preparatoire_2024_2026.md"
---

# CPKT-2026-009 — reprise après clôture technique

## Pourquoi ce Packet existe

La conversation de travail doit être interrompue pour une raison technique et reprise dans une nouvelle conversation distincte. Ce document est le point de reprise destiné à éviter de reconstruire l'état intellectuel et opérationnel depuis zéro.

Il ne remplace pas les sources : il indique quoi relire et quels invariants ne pas perdre.

## État stabilisé

### 1. Interaction Registry

Architecture existante : méthode générique dans Cogentia, traces vivantes avec leur sujet/identité. Les Interaction Packets ne doivent pas devenir un second silo central.

Références principales :
- interaction_packets/architecture.md
- Inseme #36 : Interaction Registry + multichannel messaging as Personal Twin service
- Cogentia #84 : multichannel fields + adapter-ready method
- Inseme #76 : projection SQL différée pour volume élevé et sondes actives

### 2. Packet-Backed Projection

Le pattern existe dans patterns/packet-backed-projection/PATTERN.md et est désormais explicitement chargé par AGENTS.md lors des évolutions SQL sémantiques.

Formule centrale :

> **Les colonnes SQL sont l'index matérialisé des propriétés actuellement utiles ; le Packet est l'objet informationnel plus riche dont cette projection dérive.**

Écriture réciproque :

- project : Packet → Columns
- inflate : Columns → PartialPacket
- recompose : Packet × PartialPacket → Packet

Invariant attendu :

project(recompose(packet, columns)) = columns

Le code courant n'a besoin de comprendre que les propriétés qu'il utilise ; son ignorance du reste ne doit jamais devenir une destruction d'information.

Distinguer NULL, absence et suppression explicite.

### 3. Traceabilité à travers les transformations

La réflexion a généralisé le pattern :

> **Transformer sans rompre la chaîne de preuve.**

Deux non-pertes :
- sémantique : les propriétés non projetées survivent ;
- historique : les états antérieurs pertinents restent adressables/reconstructibles.

Une transformation peut être localement destructive si elle n'est pas globalement destructive et garde une référence durable vers la source plus riche.

Chaîne type :

Reality → raw trace → Packet → projection → transformation → next projection → render.

Quand pertinent, garder input_ref/input_hash, transformation/version, output_ref/output_hash, performed_at, actor/agent.

### 4. Interroger le Réel

Document : research/interroger_le_reel.md, passé à v0.2 le 18 septembre 2026.

Formule :

> **Ne pas demander au modèle de compléter le Réel lorsqu'il est possible de demander au Réel de répondre.**

Cycle :

état de connaissance → question falsifiable → sonde minimale → interaction → trace brute → observations qualifiées → mise à jour.

Une bonne sonde réduit l'espace des hypothèses ; elle ne cherche pas à confirmer l'hypothèse préférée.

Silence observé ≠ refus ≠ dissimulation ≠ absence du document.

La capacité d'enquête autorise le parallélisme ; la proportionnalité limite la nuisance, pas la connaissance.

### 5. Première campagne de dogfood : autonomie Corse

Document créé :
barons-Mariani/research/autonomia/campagne_sondes_corpus_preparatoire_2024_2026.md

Sondes initiales :
- P01 : mission Josende / projet de rapport non adopté et contributions destinées aux annexes ;
- P02 : rapport AN n°1466 / Régions de France + questionnaire et réponses Collectivité de Corse ;
- P03 : rapport AN n°2865 / quatre contributions écrites, avec C.O.R.S.I.C.A. comme témoin de contrôle ;
- P04 : groupe de travail AN 2024 interrompu par dissolution ;
- P05 : Beauvau, à raffiner pièce par pièce avant toute demande large.

Statuts documentaires :
PUBLIC-INTÉGRAL / PUBLIC-PARTIEL / ATTESTÉ-NON-PUBLIÉ / RETROUVÉ-HORS-PARLEMENT / ZONE-NOIRE.

ZONE-NOIRE ne doit pas être interprété causalement.

## Autorisation et courriels

Dans la conversation source, Jean Hugues Robert a explicitement autorisé les écritures GitHub nécessaires à cette stabilisation et demandé le présent document de reprise.

Pour les courriels liés aux sondes : **ne créer que des drafts Gmail, jamais envoyer sans nouvelle instruction explicite d'envoi.**

drafted ≠ sent.

## Prochaine action logique dans la nouvelle conversation

1. Relire ce Packet, research/interroger_le_reel.md et le registre de campagne autonomie.
2. Vérifier sur sources publiques exactes les priors de P01–P04 avant toute formulation externe.
3. Identifier les canaux/adresses officiels.
4. Préparer une première petite vague de drafts Gmail, probablement en commençant par les pièces dont l'existence est explicitement attestée dans les rapports publics.
5. Enregistrer chaque draft comme état prepared/drafted, pas sent.
6. Après envoi humain ultérieur et réponses éventuelles, créer les observations descriptives avant interprétation.
7. Revenir ensuite au pattern général pour voir si le registre de sondes doit devenir une projection SQL ; ne pas précipiter cette étape tant que la friction réelle ne le justifie pas.

## Invariants à ne pas rouvrir sans raison

- méthode générique dans Cogentia ; traces avec leur sujet ;
- SQL = projection opérationnelle, pas vérité unique ;
- préserver les champs inconnus lors des write-backs ;
- conserver provenance et historique utile ;
- observation ≠ explication ;
- silence ≠ cause ;
- une réponse contradictoire est un résultat utile ;
- aucune sophistication interne ne doit rendre la sonde externe inutilement complexe ;
- aucun email de cette campagne ne doit être envoyé automatiquement.

## Prompt minimal de reprise

« Lis Cogentia research/CPKT-2026-009_interroger_reel_projection_sondes_autonomie_handoff.md et reprends exactement au prochain pas logique, en vérifiant les sources publiques avant les faits politiques et en ne créant que des drafts pour les emails. »
