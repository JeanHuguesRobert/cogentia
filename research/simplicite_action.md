---
title: "Simplicité d'action"
subtitle: "KISS, Small is beautiful, Worse is better — éthique de l'action contre la sur-ingénierie et l'analysis paralysis"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-05-30"
status: "working-note — méthodologique v0.1"
version: "0.1"
license: "CC BY-SA 4.0"
ai_assisted_by:
  - "Claude — articulation, 2026-05-30"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/simplicite_action.md"
---

# Simplicité d'action

## KISS, Small is beautiful, Worse is better — une éthique de l'action contre la sur-ingénierie

## Objet

Le corpus Cogentia est traversé par une exigence rarement énoncée mais constamment exercée : faire **le geste juste, au bon moment, à la bonne échelle**. Cette note rassemble brièvement quelques formules anglo-saxonnes utiles pour la nommer, et la rattache à un principe pratique : *les pieds restent sur le sol*.

---

## 1. Quatre formules à garder en tête

### Le rasoir d'Occam — *entia non sunt multiplicanda praeter necessitatem*

Guillaume d'Ockham, XIVᵉ siècle. *Les entités ne doivent pas être multipliées au-delà du nécessaire.* Principe explicatif d'abord (théories), méthodologique ensuite : entre deux artefacts de pouvoir explicatif équivalent, préférer le moins encombré. C'est l'ancêtre philosophique des trois formules suivantes — KISS, Small is beautiful, Worse is better en sont des reformulations situées (ingénierie, échelle, livraison).

### KISS — *Keep It Simple, Stupid*

Lockheed (Kelly Johnson), années 1960. Pas un appel à la stupidité : un système simple est plus testable, plus réparable, plus transmissible. Avant d'ajouter, demander : *est-ce que cela mérite d'exister ?*

### Small is beautiful

E. F. Schumacher, 1973. Critique de l'échelle pour elle-même. Un petit dispositif qui fonctionne, qui peut être compris, modifié, dupliqué par ses utilisateurs, est souvent supérieur à un grand qui n'est compris que par ses constructeurs. Lien direct avec la doctrine **Autonomie de Capacité** : ce qu'on peut maîtriser à petite échelle conditionne ce qu'on peut faire à grande.

### Worse is better

Richard Gabriel, 1991. Provocation utile : un système simple, déployé tôt, avec des angles morts assumés, gagne contre un système élégant qui n'est jamais livré. Le critère n'est pas la perfection de l'objet, mais la **valeur effectivement délivrée** dans un délai utile. Cousin opérationnel de KISS, version *shipping* de *Small is beautiful*.

---

## 2. Anti-patterns que ces formules nomment

- **Sur-ingénierie** : tuyaux et abstractions construits pour un futur qui n'arrivera pas. Voir [`persistence_backends.md`](persistence_backends.md) : on documente le seam, on ne le code pas.
- **Over-analysis / analysis paralysis** : tourner autour du choix au lieu de produire un artefact réfutable. À chaque tour de table sans geste, le coût est l'information qu'on aurait obtenue *en agissant*.
- **Les pieds qui décollent du sol** : élégance auto-satisfaite, métaphores filées trop loin, modèles qui n'ont plus de prise sur le réel. *Pipeline.md* §8 le formule en clin d'œil — *« A pipeline document explaining its own pipeline may become an elegant donkey staring at its reflection. »*
- **Prématuration de la décision** : décider avant que la situation ait livré assez d'information ; *à chaque jour suffit sa peine* (Mark Twain).

---

## 3. Cohérence avec le reste du corpus

Cette note ne contredit pas la rigueur formelle qu'exige le reste du corpus (traçabilité, niveaux de preuve, frontmatter Level-2, audit, continuations) : elle en est le **complément**.

> **Rigueur sur la trace, simplicité sur le geste.**

La rigueur de la trace est ce qui *réduit l'angoisse de l'irrévocable* — donc ce qui *autorise* la simplicité du geste. Un acte tracé est un acte révocable ; un acte révocable n'a pas besoin d'être parfait avant d'être posé.

```text
trace rigoureuse  →  réversibilité possible  →  geste simple  →  expérimentation tôt
                                              ↘  artefact réfutable
                                              ↘  apprentissage rapide
                                              ↘  pieds au sol
```

---

## 4. Quelques règles opératoires

Pour le code, le corpus, et les démarches publiques :

1. **Livrer un artefact tournant avant d'avoir tout résolu.** *Worse is better* en pratique.
2. **Coder le besoin réel, marquer le besoin futur en doc.** Identifier les seams, ne pas les implémenter prématurément. Cf [`persistence_backends.md`](persistence_backends.md).
3. **Bornir le temps de réflexion.** Au-delà, produire un geste réfutable et apprendre par son retour.
4. **Préférer la petite échelle qui marche à la grande échelle qui ne marche pas.** Schumacher.
5. **Une formule simple sur le bureau vaut mieux qu'une théorie élégante dans un classeur.** Brevet 1873 contre traité non-publié.
6. **Tracer pour pouvoir défaire**, plutôt que sur-spécifier pour ne pas avoir à défaire.

---

## Continuation

```yaml
continuation:
  status: "working-note posée comme rappel méthodologique"
  references_internes:
    - "cogentia/research/persistence_backends.md (différer ce qui n'est pas exigé maintenant)"
    - "cogentia/research/pipeline.md §8 Objection 3 (anti-self-admiration)"
    - "cogentia/research/derived_products.md §6.7 (mécanique vs jugement)"
    - "barons-Mariani/research/methode_terrains_feconds.md (dépolariser avant d'agir)"
  triggers_a_relire:
    - "ajout d'une couche d'abstraction non immédiatement nécessaire"
    - "blocage sur un choix de design sans artefact tournant"
    - "réunion qui dépasse l'enveloppe-réflexion sans produire de geste"
  formules_courtes:
    - "Rigueur sur la trace, simplicité sur le geste."
    - "Worse is better — qui ship gagne."
    - "Les pieds au sol."
```


<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Corpus Status — cogentia](corpus-status.md)
- [Research Index — Cogentia](index.md)

<!-- END_AUTO: backlinks -->
