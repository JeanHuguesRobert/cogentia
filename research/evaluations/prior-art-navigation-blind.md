---
title: "Reality Test — Navigation d’antériorité du Corpus"
status: "experiment — baseline measured"
date: "2026-11-17"
last_modified_at: "2026-11-17"
language: fr
document_role: "evaluation"
document_kind: "reality-test"
visibility: public
update_policy: UP-DEFAULT-REVIEWED
---

# Reality Test : navigation d’antériorité à l’aveugle

## Objet et protocole

Mesurer ce que les outils actuels savent retrouver sans titres canoniques fournis.
Deux fichiers disjoints figent les 10 questions et leurs références attendues. Le banc
d’essai n’ouvre les références qu’après les 10 requêtes d’orientation et de recherche.
Les 8 cas positifs ont des passages sources vérifiés ; les 2 contrôles sont
**indéterminés**, jamais déclarés nouveaux par défaut.
Le banc utilise corpus.orient réel, la recherche FTS publique réelle et un recentrage
lexical limité à trois termes, sans modèle d’inférence.

Fichiers : `scripts/fixtures/prior-art-navigation-questions.json` (questions)
et `scripts/fixtures/prior-art-navigation-gold.json` (références).

## Résultats du premier passage valide — 17 novembre 2026

Sur **8 antériorités préenregistrées** :

- Orientation, première source : **0/8**.
- Orientation, huit premières sources : **0/8**.
- Recherche lexicale brute : **0/8**.
- Recherche lexicale simplifiée : **0/8**.
- Union des trois méthodes, huit sources par méthode : **0/8**.
- Passages correspondant aux preuves préenregistrées : **0/8**.
- Contrôles sans antériorité présumée : **2**, sans conclusion de nouveauté.
- **Raisonneur autonome LLM : non exécuté (0/10)** ; le routeur IA disponible
  sur Fracta2 signalait une indisponibilité.

Ces mesures portent strictement sur les **références désignées avant le test** ;
elles ne signifient pas que tous les documents proposés étaient inutiles.
Les passages attendus existent et les dix requêtes d’orientation/recherche ont
effectivement réussi. Un premier passage dont les dépendances Node manquaient
a été déclaré invalide et non retenu ; le runner rejette désormais ces faux scores.

### Détail des questions

| Nº | Besoin cognitif | Statut | Référence préenregistrée retrouvée ? |
|---:|---|---|---|
| 1 | Circuit cognitif absent | Documenté | Non |
| 2 | Livraison différée | Documenté | Non |
| 3 | Localité du calcul | Documenté | Non |
| 4 | Écritures concurrentes | Documenté | Non |
| 5 | Capacité et autorité | Documenté | Non |
| 6 | Enveloppe et charge utile | Documenté | Non |
| 7 | Édition gelée | Documenté | Non |
| 8 | Identité multistockage | Documenté | Non |
| 9 | Réveil ultrasonique | Indéterminé | Sans objet |
| 10 | Pas quotidiens | Indéterminé | Sans objet |

## Erreurs significatives

1. Une demande sur la reprise d’un travail après extinction de son exécuteur
   dirige vers le principe d’effectivité, non vers CPS.
2. Une question sur l’autorisation d’une capacité technique conduit vers
   Capable, confondant capacité politique et capacité instrumentale.
3. Le FTS conjonctif ne retrouve pas les passages dont les mots diffèrent
   de ceux de la paraphrase française ; le recentrage lexical simpliste
   n’y remédie pas.
4. Un **faux négatif possible du barème strict** : la question sur l’édition
   gelée atteint bien le document canonique `barons-Mariani/research/livre_vivant.md`,
   qui dit « Geler l’édition, jamais la projection suivante ». Il n’était pas
   dans les références attendues. Ne pas modifier les réponses de référence
   après observation pour améliorer artificiellement le score.
5. Les 10 requêtes ont pris environ 69 secondes, ce qui justifie de
   surveiller également les temps de navigation et les expirations.

## Limites — ce que ce Reality Test NE démontre PAS

- Aucun raisonneur LLM autonome vierge n’a été testé.
- La qualité et la fidélité des réponses finales ne sont pas mesurées.
- Les faux diagnostics de nouveauté ne sont pas mesurés. Ne pas retrouver
  une source ne permet pas d’affirmer une nouveauté.
- Aucune comparaison avec des embeddings locaux ou gratuits n’a été effectuée.

## Suite expérimentale

Conserver le premier passage comme baseline immuable. Tester ensuite une
stratégie de guidage par domaine et recherche documentaire élargie (variantes
bilingues, concepts proches, ou embeddings réellement sans coût marginal).
Comparer sur les dix mêmes questions, **sans modifier leur référence initiale** ;
ajouter un jeu inédit pour éviter un surapprentissage.

Lorsque le fournisseur de jugement LLM est disponible dans un budget admis,
mesurer séparément ses décisions existant / indéterminé / candidat nouveau,
les citations réellement vérifiées et les coûts COP.

## Reproduction

```bash
python3 scripts/test-eval-prior-art-navigation.py
python3 scripts/ops/eval-prior-art-navigation.py --output /absolute/path/prior-art-navigation-baseline.json
```

Le service local doit répondre sur `127.0.0.1:8790`. Les sorties détaillées
sont conservées hors Git sur Fracta2 dans
`~/.local/state/cogentia/evaluations/prior-art-navigation-baseline.json`.

## Empreintes du protocole initial

- Questions SHA-256 : `09d52399decb404eb92fc48849e3752eba7b0d6c6d9886132dc5dc73a6e56c36`
- Références SHA-256 : `a24b0fe6187b6b66c8b9e3480eeb7991f1aba29463de5b5c7d1ea8c7d5aedb96`
- Révision évaluée : `a2d7e1263385b6444fea0ba9279d96bf0e824f95`
