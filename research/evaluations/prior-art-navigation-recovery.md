---
title: "Reality Test — Récupération de la navigation conceptuelle"
author: "Cogentia — agent de recherche"
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
license: CC BY-SA 4.0
version: "0.1"
date: "2026-11-17"
last_modified_at: "2026-11-17"
status: "working-paper — empirical verification"
document_role: source
document_kind: reality-test
visibility: public
language: fr
update_policy: UP-DEFAULT-REVIEWED
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/evaluations/prior-art-navigation-recovery.md
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: "issues/122; issues/105"
  origin_date: "2026-11-17"
  derived_from:
    - research/evaluations/prior-art-navigation-blind.md
review:
  status: unreviewed
  reviewed_by: []
---

# Navigation d’antériorité : réparation mesurée

## Mandat et périmètre

Suite de [Cogentia #122](https://github.com/JeanHuguesRobert/cogentia/issues/122)
avec [#105](https://github.com/JeanHuguesRobert/cogentia/issues/105)
pour la récupération documentaire. Les questions et références de la
[baseline initiale](prior-art-navigation-blind.md) restent **inchangées**.
Ce chantier n'utilise aucun LLM, ne crée aucun embedding et n'altère
ni la base d'index ni les sources des autres dépôts.

## Défauts constatés

1. Le classement par similarité lexicale conduisait à des concepts
   périphériques (principe d’effectivité, Capable politique) en réponse
   à des questions techniques exprimées en français.
2. Un résultat de `guideResolve` pouvait prendre la tête de l’orientation
   alors qu'une source plus spécifique avait été trouvée.
3. Des éléments de prose sous `Used in` devenaient de faux chemins
   documentaires, sans fichier correspondant dans l'inventaire public.
4. Une source sous `research/` portant `document_role: operational` était
   classée comme preuve d'implémentation et non comme document à lire.
5. Une source pertinente pouvait être exclue par la politique documentaire :
   `inseme/.cogentiaignore` exclut `packages/magistral/**`, ce qui
   écarte `packages/magistral/docs/object-memory-v0.md` de
   `corpus.orient`. Ceci est une **dette de couverture/politique**, pas
   une raison de supprimer ou contourner cette exclusion.

## Correction minimale

`scripts/lib/corpus-orient-domain-signals.js` fournit une première carte
bilingue **curatée** de huit familles techniques déjà documentées. Elle
requiert au moins deux indices indépendants par famille, trois pour
l'identité du contenu. Une source ne peut être proposée que si elle
figure **déjà** dans l'inventaire autorisé pour la vue demandée.

L'intégration réutilise `corpus.orient` (#122), son graphe et son
`indexSearch`, sans créer de moteur, de base ou de scheduler nouveau.
Lorsqu'une source canonique est déjà suffisamment indiquée, une recherche
FTS générale n'est pas imposée : c'est une récupération progressive
plutôt qu'une recherche coûteuse systématique (#105).

L'ordre de lecture privilégie les références spécifiques corroborées,
sans confondre provenance explicite et pertinence du thème.
La projection transmise au raisonneur conserve cette priorité, mais
marque les propositions `semantic_candidate` et
`unverified_navigation_hints` : **elles ne sont pas des preuves**.
Seuls les chemins attestés dans l'inventaire visible deviennent
des sources de lecture.

## Résultats — 17 novembre 2026

| Mesure documentaire | Baseline antérieure | Correctif candidat |
|---|---:|---:|
| Source désignée dans les 8 premières lectures (jeu initial) | 0/8 | **7/8** |
| Source désignée en première lecture (jeu initial) | non consigné | **6/8** |
| Source désignée dans les 8 premières lectures (second jeu) | non mesuré | **7/8** |
| Source désignée en première lecture (second jeu) | non mesuré | **6/8** |

Les **20 appels réels** au CLI `corpus.orient` ont abouti avec
`COGENTIA_REGISTRY` et `COGENTIA_DATA_DIR` pointant sur Fracta2,
sans nouvelle inférence. Le deuxième jeu contient dix paraphrases
différentes mais **les mêmes huit thèmes et deux contrôles** :
c'est une régression de formulation, **pas une preuve de généralisation
à des domaines inédits**. Les questions du second jeu ont été observées
pendant le développement ; ne pas les appeler un test indépendant aveugle.

Les contrôles indéterminés n'ont pas de référence positive présumée :
une recherche sans résultat ne prouve jamais l'absence d'une idée.
Le score est strict : le document déjà pertinent
`barons-Mariani/research/livre_vivant.md` précède parfois
la source architecturale attendue et n'est pas compté comme celle-ci.

**Le cas non résolu** est l'identité des objets content-addressed
dans la documentation Magistral, hors périmètre de l'inventaire public
selon sa règle `.cogentiaignore`. Ne pas élargir silencieusement
la politique : vérifier si une projection publique indexable ou un
pointeur de navigation explicite serait opportun.

## Ce que cette mesure ne valide pas

- Pas de Judgment LLM autonome, de décision de nouveauté ni de qualité
  des réponses finales : **non testés**.
- Pas de validation FTS complète ni de passages source avec hash :
  les essais de recherche conjointe ont subi des timeouts ; leurs
  métriques restent **non mesurées**, pas égales à zéro.
- Pas de généralisation hors des huit familles curatées.
- Latence à améliorer : les appels CLI indépendants observés prennent
  environ 8 à 12 secondes, avec coût de bootstrap et d’inventaire.
  Cela ne mesure pas la latence d'un démon chaud.
- La source liée à Magistral reste ignorée selon la règle du dépôt :
  ce problème doit être résolu sans compromettre les frontières public/privé.

## Vérification et prochain Reality Test

Le jeu de questions initial et ses références demeurent dans
`scripts/fixtures/prior-art-navigation-{questions,gold}.json` ;
les nouvelles paraphrases se trouvent dans
`scripts/fixtures/prior-art-holdout-{questions,gold}.json`.

Tests de non-régression :

```sh
node --test scripts/lib/corpus-orient-domain-signals.test.js
node scripts/check-corpus-orient.js
node scripts/check-agent-corpus-prior-art.js
python3 scripts/test-eval-prior-art-navigation.py
```

Prochaine expérimentation (#122 / #105) : tester **des domaines jamais vus**
pour mesurer la couverture réellement générale, étudier l'accès sécurisé
aux sources publiques volontairement hors inventaire et réévaluer le FTS
avec des temps d'attente et stratégies de récupération traçables.
Comparer ensuite à une récupération sémantique quand les embeddings
appropriés sont disponibles ; maintenir la séparation stricte entre
source candidate, passage vérifié et Judgment.
