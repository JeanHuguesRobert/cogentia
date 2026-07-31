---
title: "Conversations gouvernées et effets durables"
subtitle: "Contrat de modélisation pour Cogentia, COP, Inseme et les agents mandatés"
author: "Jean Hugues Noël Robert"
date: "2026-07-31"
version: "0.1-source"
status: "working-paper"
document_role: "source"
document_kind: "protocol-and-governance-model"
language: "fr"
license: "CC BY-SA 4.0"
visibility: "public"
lifecycle_state: "working"
canonical_path: "cogentia/research/conversations_gouvernees_effets_durables.md"
related_documents:
  - "research/ia_pour_tous_ia_pour_chacun.md"
  - "research/cognitive_packets.md"
  - "research/pipeline.md"
  - "prompts/conversation_closure.md"
external_related_documents:
  - "barons-Mariani/research/traceabilite_des_actes.md"
  - "barons-Mariani/research/test_critere_rossignol.md"
---

# Conversations gouvernées et effets durables

## Objet

Une conversation n'est pas seulement un flux de messages. C'est une suite située d'interactions entre des parties, des mandants, des mandataires, des agents et des référents du réel.

Son intérêt de gouvernance apparaît lorsqu'elle permet de dégager une intention, de préparer une décision, de produire un engagement, de constater un résultat ou de créer une mémoire opposable dans le régime interne considéré.

Le modèle minimal distingue deux objets fondamentaux :

1. **Conversation** — ensemble ordonné d'interactions et d'énoncés ;
2. **Effet** — changement durable, ou prétendu durable, produit, préparé, reconnu ou contesté.

Les documents, mandats, décisions, publications, contrats, votes, déploiements et corrections sont des types d'effets. Ils ne doivent pas être confondus avec les énoncés qui les préparent ou les décrivent.

## Invariants

- Un énoncé n'est pas un acte.
- Une intention inférée n'est pas une autorisation.
- Un agent peut assister, jamais acquérir par lui-même une voix souveraine.
- Un effet engageant exige un répondant humain ou institutionnel identifiable.
- Les seules voix politiques sont celles des êtres humains vivants.
- Une trace doit être proportionnée : traces fortes pour les actes engageants ; pas de bureaucratie de chaque micro-événement.
- Tout effet durable doit pouvoir être corrigé, contesté, révoqué ou déclaré remplacé selon son régime.
- Le réel n'est pas une personne juridique : il est le référent extérieur qui résiste, mesure, contredit et fait apparaître les effets.

## 1. La conversation comme contexte de transformation

Une conversation peut contenir :

- des observations ;
- des hypothèses ;
- des demandes ;
- des intentions ;
- des objections ;
- des propositions ;
- des validations ;
- des instructions ;
- des engagements ;
- des comptes rendus ;
- des rectifications.

Elle est un contexte de production et d'interprétation. Elle ne confère pas, par elle-même, le droit de poser un acte au nom d'autrui.

Une même conversation peut relever de plusieurs relations : personne et assistant ; mandant et mandataire ; donneur d'ordre et prestataire ; collectif et représentant ; agent principal et sous-agent ; jumeaux numériques personnels ou collectifs.

## 2. L'effet durable

Un effet est une modification du monde social, documentaire, technique ou matériel. Il peut être :

- **revendiqué** : un acteur affirme qu'il a eu lieu ;
- **reconnu** : le régime concerné l'admet ;
- **contesté** : sa réalité, son sens ou sa validité est disputé ;
- **révoqué** : son autorité ou son mandat est retiré ;
- **remplacé** : une version ou décision ultérieure prévaut ;
- **observé** : un retour du réel en atteste ou en contredit une conséquence ;
- **vérifié** : une procédure ou une mesure suffisante le confirme.

Ces statuts doivent rester distincts de l'état épistémique d'une assertion :

- assertée ;
- inférée ;
- observée ;
- vérifiée.

## 3. Acte engageant

Un acte engageant est un effet qui lie une responsabilité : politique, institutionnelle, juridique, technique, financière, morale ou documentaire.

Il ne peut être stabilisé qu'avec :

- un auteur ou système opérant ;
- un mandat ou une autre source d'autorité ;
- un périmètre ;
- une validation adaptée au risque ;
- un répondant ;
- une voie de recours, correction ou révocation ;
- une trace des effets attendus et, quand c'est possible, observés.

Cette qualification ne prétend pas remplacer les qualifications du droit. Elle définit un régime interne de gouvernance et de traçabilité.

## 4. Le réel : retour non négociable

Le réel est une partie au sens méthodologique, mais non une partie contractante ou politique.

Il intervient par :

- une mesure ;
- une contrainte physique ;
- une ressource consommée ;
- un vivant affecté ;
- un résultat effectivement obtenu ;
- un échec ;
- une contradiction ;
- une attestation extérieure.

Le **critère Rossignol** fournit le test pratique : un dispositif ou une chaîne procédurale doit pouvoir se fermer sur un point d'incarnation modeste, mesurable et vérifiable. Pour une infrastructure locale, cela peut être de l'eau réellement disponible dans une auge, de l'énergie effectivement produite et utilisée, ou un service effectivement rendu.

Ce retour limite la dérive vers un système auto-référentiel où les simulations, récits et indicateurs seraient confondus avec les effets.

## 5. Temps et causalité opérationnelle

Dans ce modèle, le temps est le processus par lequel des effets se propagent à une vitesse non infinie.

Un système doit pouvoir distinguer, lorsqu'ils diffèrent :

- le moment où l'acte est émis ;
- le moment où il est reçu ;
- le moment où il devient effectif ;
- le moment où son effet est observé ;
- le moment où il est enregistré ;
- son échéance éventuelle.

Cette distinction rend possibles l'imputabilité, la correction et la reprise sans prétendre épuiser une théorie physique du temps.

## 6. Schéma portable minimal

```yaml
governed_conversation:
  id: "gc-YYYYMMDD-001"
  relation:
    kind: "personal_assistance | mandate | service | collective_governance"
    parties:
      - id: "person:principal"
        role: "principal"
      - id: "ai_agent:assistant"
        role: "assistant"
    real_referents:
      - "measured_outcome:identifier"
  interactions:
    - id: "utterance-001"
      author: "person:principal"
      type: "request | observation | proposal | validation"
      epistemic_status: "asserted | inferred | observed | verified"
  effects:
    - id: "effect-001"
      kind: "decision | publication | deployment | mandate | correction"
      status: "claimed | recognized | contested | revoked | superseded"
      authority: "mandate-or-rule-reference"
      accountable: "person-or-human-institution"
      expected_effects:
        - "short description"
      observed_effects:
        - "measurement-or-attestation"
      review:
        challenge: "process"
        correction: "process"
        revocation: "process-or-not-applicable"
```

Le champ `real_referents` ne personnifie pas le réel et ne lui attribue aucun droit de vote. Il relie le registre symbolique à ce qui peut être constaté hors de lui.

## 7. Conditions minimales d'implémentation

Une implémentation COP, Cogentia ou Inseme compatible devrait :

1. séparer messages, inférences, validations et effets ;
2. attacher les effets engageants à un mandat, un périmètre et un répondant ;
3. conserver les versions, contestations, révocations et remplacements ;
4. tracer la chaîne humain-agent-outil sans faire de l'agent un souverain ;
5. exposer un statut de preuve pour les assertions et les résultats ;
6. permettre l'export et la reprise dans des formats ouverts ;
7. pouvoir lier certains effets à des observations ou mesures du réel ;
8. appliquer une politique de rétention et de visibilité respectueuse des personnes concernées ;
9. réserver les décisions politiques aux humains vivants.

## 8. Premiers cas de test

- Conversation Jean Hugues / Agent JHN : une demande devient-elle brouillon, décision validée ou publication ?
- Conversation Agent JHN / sous-agent : le sous-agent reste-t-il dans son mandat et son budget ?
- Conversation d'une commune avec son assistance : quelles propositions sont consultatives, quelles décisions sont imputables à l'élu ou à l'instance ?
- Rossignol Node : la trace de la chaîne énergie-eau-action se ferme-t-elle sur une mesure réelle ?
- Consultation publique : l'avis est-il distinct de la décision, et l'écart est-il motivé ?

## Continuation

- dériver un schéma JSON ou YAML formel et ses identifiants stables ;
- préciser les liens avec les événements COP et les Cognitive Packets ;
- développer des tests de mandat, de révocation, de remplacement et de retour du réel ;
- définir les politiques de confidentialité pour les conversations personnelles ;
- produire des produits déclinés : note civique, guide d'implémentation et charte de pilote territorial.
