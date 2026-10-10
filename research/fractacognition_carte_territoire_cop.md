---
title: "FractaCognition — Carte, Territoire et co-développement de COP"
date: "2026-10-10"
status: "working hypothesis — corrigible by Reality Tests"
document_role: source
document_kind: research-note
visibility: public
language: fr
related:
  - https://github.com/JeanHuguesRobert/cogentia/issues/32
  - https://github.com/JeanHuguesRobert/barons-Mariani/issues/68
  - https://github.com/JeanHuguesRobert/operium/issues/58
  - https://github.com/JeanHuguesRobert/inseme/issues/120
  - https://github.com/JeanHuguesRobert/inseme/issues/121
---

# FractaCognition : la Carte, le Territoire et les capacités

## Statut et portée

Cette note conserve un résultat conceptuel de dogfooding du 10 octobre 2026. Elle **n'établit pas** que l'architecture générique a été validée en production. Elle rapproche des formalismes antérieurs, énonce une hypothèse de travail falsifiable et indique une expérience minimale. Elle n'amende pas à elle seule la spécification normative COP.

## Hypothèse centrale

FractaCognition désigne ici le processus distribué, réflexif et potentiellement fractal par lequel des acteurs et Cognitive Packets observent, interprètent, agissent, confrontent leurs modèles aux effets et améliorent leurs méthodes **et leurs capacités à rendre capable**.

La cognition peut transformer le monde ou les connaissances ; la métacognition examine comment elle y procède ; FractaCognition permet que ce travail se poursuive et se corrige à plusieurs échelles, par des Handlers remplaçables et des Packets durables. Il ne s'agit pas d'affirmer que toute récursion produit une intelligence supérieure.

## Carte ≠ Territoire

COP est une **Carte** : spécification et modèles de continuité, de routage et de gouvernance. Son code en est une incarnation opérationnelle, également imparfaite. Un Event, un test réussi ou un ExecutionReceipt constitue une *trace* ; il ne constitue pas à lui seul l'effet réel prétendu.

Discipline épistémique minimale, empruntée au gate Carte/Territoire : **proposition → statut épistémique → traces → limites / incertitudes**. Les contradictions alimentent une révision de la Carte, pas une réécriture de l'observation pour préserver le modèle.

Boucle de travail :

```text
Carte / hypothèse → Packet → décision gouvernée → effet dans le Réel
        ↑                                        │
        └── correction ← observation / preuve ←──┘
```

Le sens de la flèche entre trace et fait doit lui-même être soumis à critique : une trace peut être incomplète, trompeuse ou non indépendante.

## Articulation des responsabilités

- **Cognitive Packet** : identité logique, mission, mandat, budget, état et possibilité de continuation ; son histoire n'appartient pas à un Handler.
- **Packet Capsule** : représentation transportable, bornée et suffisante pour une reprise admissible ; elle peut référencer une mémoire durable au lieu de la dupliquer.
- **Hop** : étape de traitement ou de routage, éventuellement réalisée par une composition RAIX. Une livraison n'est pas une admission gouvernée.
- **FractaRouting** : découverte, mobilisation et coordination des capacités, y compris par création de sous-Packets. La progression peut être non linéaire et inter-substrats.
- **FractaAccounting** : attribution et bilan proportionnés des ressources, des effets, des preuves et des résultats, y compris les coûts du contrôle lui-même.
- **Ithaca** : retour et assimilation durables du résultat et de l'expérience du parcours.

Chaque niveau peut créer des Packets de découverte, de vérification ou de gouvernance, sans amplification implicite de mandat ni de budget. Une requête d'autorisation ne vaut pas autorisation.

## Control Plane et Data Plane, génériques et par substrat

Le **Control Plane** gouverne mandat, budget, politiques, admission, coordination, claims, générations et limites d'effets. Le **Data Plane** porte les capsules, communications, transformations, artefacts et observations. Les adaptateurs (transport simulé, GitHub, email, objet physique) exposent leurs capacités et leurs preuves sans imposer leur ontologie au Packet générique.

Il faut distinguer : identité du Packet, incarnation, message/objet transporteur, dépositaire, Handler, mission, événement de livraison et effet vérifié.

Les mêmes invariants doivent pouvoir être testés sur un substrat déterministe, puis sur d'autres substrats ; équivalence **sémantique**, pas identité des octets ou des capacités physiques. Reprendre les vecteurs existants (`inseme/research/cop_packet_kernel/`) avant d'introduire des schémas concurrents.

## Les moyens demeurent subordonnés à la finalité

Un moyen doit contribuer à la finalité, sans s'y substituer, absorber sans justification les ressources utiles ou produire des effets contraires. La traçabilité et l'Accounting sont nécessaires **au niveau suffisant**, non maximal : synthèses et preuves sélectionnées, modes renforcés par exception. Leur coût doit être comptabilisé.

L'échec qui révèle une hypothèse incorrecte peut constituer une réussite de la Machine à Explorer. À l'inverse, une accumulation de Packets, de Hops ou de contrôles n'est pas une preuve d'effectivité.

## Travail expérimental minimal

1. Cartographier les primitives COP *réellement implémentées* : History, Snapshot, Capsule/Closure, admission, routage, mandat, budget, Accounting, effets.
2. Réutiliser les lois du noyau expérimental : filiation causale, non-amplification de mandat, continuation accessible, trace de disposition, retour corrélé.
3. Tester avec deux Handlers simulés un parent et un sous-Packet, refus par incapacité, routage, coût borné, duplication, fencing et reprise à froid.
4. Distinguer soigneusement simulation, exécution observée et effet externe vérifié.
5. Changer ensuite seulement de substrat : GitHub, email puis éventuellement incarnation physique (« Bouteille à la Mer »).
6. Corriger d'abord les bugs, puis proposer une évolution explicite de COP *uniquement si une lacune transversale est observée*.

## Références de départ

- [Cogentia #32 — Carte et Territoire](https://github.com/JeanHuguesRobert/cogentia/issues/32)
- [Gate épistémique — Barons-Mariani #68](https://github.com/JeanHuguesRobert/barons-Mariani/issues/68)
- [Cognitive Packet Switching](https://github.com/JeanHuguesRobert/cogentia/blob/main/research/cognitive_packet_switching.md)
- [The Network is the Learning Computer](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/the_network_is_the_learning_computer.md)
- [Inseme #21 — kernel expérimental](https://github.com/JeanHuguesRobert/inseme/issues/21)
- [Inseme #22 — Bouteille à la Mer](https://github.com/JeanHuguesRobert/inseme/issues/22)
- [Cogentia #213 — incarnations et missions](https://github.com/JeanHuguesRobert/cogentia/issues/213)
- [Operium #58 — transport email et COP Compute](https://github.com/JeanHuguesRobert/operium/issues/58)

**État des preuves :** théorie reliée à des vecteurs expérimentaux et à certains runs Compute observés ; substitution universelle de substrat, routage récursif autonome, Accounting consolidé et reprise email de bout en bout restent à établir.
