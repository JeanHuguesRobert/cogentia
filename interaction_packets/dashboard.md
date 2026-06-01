---
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0"
title: "Jean Hugues Robert — Tableau de bord Interaction Packets"
date: "2026-05-27"
status: "draft — auto-filled (frontmatter cleanup)"
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/interaction_packets/dashboard.md
last_stamped_at: 2026-06-01
---
# Jean Hugues Robert — Tableau de bord Interaction Packets

## Objet

Ce tableau de bord suit certaines interactions d’intérêt général initiées par Jean Hugues Robert dans le cadre de ses activités ouvertes, bénévoles et non lucratives.

Il ne s’agit pas d’une simple présentation générique de la méthode Interaction Packets.

Il s’agit du tableau de bord public actuel des interactions tracées.

## Méthode

Chaque interaction peut être documentée sous forme :

- d’entrée dans un registre Markdown ;
- de paquet interactionnel YAML ;
- de note publique lisible ;
- de correction lorsque l’interprétation initiale était incomplète ou erronée.

L’objectif est de tracer :

- demandes ;
- réponses ;
- refus ;
- délais ;
- silences ;
- relances ;
- corrections.

## Registre actuel

Registre principal :

- [mail_trace.md](./mail_trace.md)

## Cas actuellement tracés

| ID | Date | Sujet | Interlocuteur | Statut | Divulgation | Paquet |
|---|---:|---|---|---|---|---|
| 2026-05-04-001 | 2026-05-04 | Session MareNostrum | Université de Corse | Réponse reçue : négative | D2 | [YAML](./packets/2026/2026-05-04-session_marenostrum.yaml) |

## Cas 2026-05-04-001 — MareNostrum / Université de Corse

### Demande

Une proposition a été envoyée à l’Université de Corse dans le contexte d’ICOME.

Le sujet était MareNostrum :

- énergie solaire insulaire ;
- souveraineté computationnelle ;
- inférence IA ;
- coopération méditerranéenne.

Après le refus d’intégrer MareNostrum au programme officiel de la conférence, une demande plus légère a été formulée :

- mise à disposition d’une salle ;
- un soir des 8, 9 ou 10 juin ;
- table ronde informelle ;
- hors programme officiel ;
- durée d’environ 90 minutes ;
- sans demande de budget ;
- avec participation possible de personnes présentes à ICOME si elles le souhaitaient.

### Résultat

Une réponse négative a été reçue le 2026-05-05.

La réponse indiquait que :

- la proposition de session spéciale avait déjà reçu une réponse négative ;
- la demande de salle pour une table ronde informelle hors programme officiel était également refusée.

### Correction

Ce cas avait initialement été interprété comme `Aucune réponse détectée`.

L’inspection du fil a montré qu’une réponse avait bien été reçue.

Le registre a été corrigé en conséquence.

Cette correction est méthodologiquement importante : le système doit tracer les faits, et non simplement confirmer des impressions.

## Couche interprétative

Ce cas peut illustrer une difficulté plus générale à établir des coopérations locales autour d’initiatives ouvertes, bénévoles et d’intérêt général en Corse.

Il ne démontre pas, à lui seul, une thèse générale.

Il constitue un cas documenté parmi d’autres, destiné à être accumulé, comparé et corrigé dans le temps.

## Documents liés

- [Présentation Interaction Packets](./overview.md)
- [Package réutilisable](./PACKAGE.md)
- [Pipeline Mail Trace](./mail_trace_pipeline.md)
- [Prompt d’extraction](./prompts/extract_interaction_packet.md)

## Vocabulaire des statuts

Statuts observables recommandés :

- `envoyé`
- `réponse_reçue`
- `réponse_reçue_négative`
- `réponse_reçue_positive`
- `aucune_réponse_detectée`
- `relance_envoyée`
- `redirigé`
- `clos`
- `corrigé`

## Règle

Les faits d’abord.

Les interprétations ensuite.

Les corrections doivent rester visibles lorsqu’elles sont importantes.


<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Mail Trace Pipeline](mail_trace_pipeline.md)
- [Mail Trace Register](mail_trace.md)
- [Interaction Packets — readable overview](overview.md)
- [Interaction Packets — public-use package](PACKAGE.md)
- [Extract Interaction Packet](prompts/extract_interaction_packet.md)

<!-- END_AUTO: backlinks -->
