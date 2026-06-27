---
title: "Persistence Backends"
subtitle: "Cadre minimum suffisant — git + GitHub est *une* infrastructure parmi d'autres"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-05-30"
status: "working-note — trace d'antériorité, pas une roadmap v0.1"
version: "0.1"
license: "CC BY-SA 4.0"
ai_assisted_by:
  - "Claude — articulation, 2026-05-30"
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/persistence_backends.md
last_stamped_at: 2026-06-01
document_role: "source"
document_kind: "working-note"
visibility: "public"
lifecycle_state: "working"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "working-note"
classification_confidence: "medium"
---

# Persistence Backends — cadre minimum suffisant

## Objet

Cogentia est aujourd'hui mis en œuvre sur **git + GitHub**. Ce n'est pas une nécessité doctrinale : git + GitHub est *une* infrastructure de persistance parmi d'autres. Cette note fixe :

1. le **cadre minimum** qu'un backend de persistance doit offrir au corpus ;
2. les **points GitHub-tied** actuels de `cogentia.js`, pour qu'un portage futur sache où chercher.

Pose mark-twain-ienne, assumée : *« J'ai eu beaucoup de problèmes dans ma vie, dont certains se sont produits. »* Ce document **ne déclenche aucun travail d'implémentation**. Il est posé en **marqueur d'antériorité**. *À chaque jour suffit sa peine.*

---

## 1. Les six couches

| Couche | Description | Obligatoire ? |
|---|---|---|
| **A — Contenu versionné** | documents stockés, lus, transformés atomiquement ; chaque version identifiable | oui |
| **B — Coordination** | sync (pull/push), travail parallèle, fork+merge ou équivalent | oui |
| **C — Identité** | auteur par changement, authentification pour écriture | oui |
| **D — Audit local** | `.cogentia/audit.jsonl`, `.cogentia/continuations/*.json` | oui — *déjà* cogentia.js, agnostique |
| **E — Work items** | tickets adressables, open/closed, séparés du contenu | optionnel |
| **F — Close-with-reference** | lier une stabilisation à la fermeture d'un work item (`Closes #N`) | optionnel |

A–D sont **portables de facto** : git + filesystem + `cogentia.js` les fournissent, indépendamment de l'hébergement du remote.

E–F nécessitent un **adapter** : GitHub Issues le fournit nativement ; un git nu ne l'a pas.

---

## 2. Mappings de référence

| | GitHub | Gitea / GitLab | git nu (bare / ssh) | S3 + SQL (hypothétique) |
|---|---|---|---|---|
| A–C | git + GitHub | git + plateforme | git | objets versionnés S3 + audit SQL |
| D | local jsonl | local jsonl | local jsonl | local jsonl |
| E | Issues API | Issues API | **absent** → fallback fichier | table SQL `issues` |
| F | `Closes #N` natif | natif | convention manuelle | trigger SQL |

Le fallback **git nu** pour la couche E peut être un répertoire `.cogentia/issues/<id>.md` avec un champ `state: open | closed` dans le frontmatter — simple, portable, traçable, versionné comme le reste.

---

## 3. Points GitHub-tied dans `cogentia.js` aujourd'hui

À auditer le jour d'un portage. La liste est volontairement courte et bien localisée :

- **`cmdForks`** — REST `GET /repos/{owner}/{repo}/forks`. Lecture seule, non critique.
- **`cmdIssues list / packet / delegate`** — REST `GET /repos/{owner}/{repo}/issues[/{n}]`. Couche E.
- **`cmdIssues close *`** *(à venir)* — `gh issue close` ou REST `PATCH`. Couches E + F.
- **`cmdCheck`** — validation HTTP d'URLs `github.com`. Élargissable.
- **`detectProfileRepoLocation`** — convention `github.com/<user>/<user>`. Convention de nommage seulement, pas de couplage fort.

Le **cœur** de `cogentia.js` (registry, scan, status, refresh, lint, drift, continuations, frontmatter, concepts, trails, backlinks, readme, derived, verify, consolidate) opère sur git + filesystem et n'a *pas* besoin d'adapter — c'est portable tel quel.

---

## 4. Forme d'adapter — esquisse, non-implémentée

Le jour où la couche E doit être servie par autre chose que GitHub, l'adapter minimum à introduire :

```js
// 1. Sélection (par remote URL, .cogentia/persistence.json, ou flag)
detectBackend( repoPath ) → 'github' | 'gitea' | 'gitlab' | 'file' | …

// 2. Surface couche E (lecture)
listIssues(   repo, { state, limit } )
getIssue(     repo, number )

// 3. Surface couche E (écriture, gated par approbation humaine)
closeIssue(   repo, number, { reason, comment, commit_ref? } )
commentIssue( repo, number, body )
```

Le seam est **identifié** par la présente note, pas codé. Quand on franchira ce pont, on saura précisément où ouvrir le code (les ~5 points listés en §3).

---

## 5. Principe

> Cette note n'est pas une roadmap : elle est une marque d'antériorité sur l'idée que git + GitHub n'est *pas* l'infrastructure, mais une *instance*. Le code reste GitHub-tied tant que c'est la situation réelle ; l'abstraction apparaîtra le jour où ce sera une vraie contrainte, pas avant.

Le meilleur moment pour décider, c'est le plus tard possible — quand la décision a accumulé assez d'information pour ne plus être un pari.

> *« À chaque jour suffit sa peine. »* — Matthieu 6:34
>
> *« I've had a lot of worries in my life, most of which never happened. »* — Mark Twain

---

## Continuation

```yaml
continuation:
  status: "open marker — pas de travail planifié"
  triggers_to_implement_adapter:
    - "portage sérieux vers Gitea / GitLab / auto-hébergé"
    - "remplacement de l'issue tracker par autre chose (e.g. file-based, Linear, …)"
    - "backend non-git réellement envisagé (S3 + SQL, IPFS, base content-addressed, …)"
  references_to_revisit:
    - "cogentia/research/pipeline.md §4.13.1 — Issues as continuation packets"
    - "cogentia/scripts/cogentia.js — cmdForks, cmdIssues, cmdCheck, detectProfileRepoLocation"
```
<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Cogentia Commons — Public by Default, Private by Exception](cogentia_commons_visibility_and_private_modes.md)
- [Documents - All Tracked Repos](documents.md)
- [Research Index — Cogentia](index.md)
- [Simplicité d'action](simplicite_action.md)
- [Documents - All Tracked Repos](https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/research/documents.md)
<!-- END_AUTO: backlinks -->
