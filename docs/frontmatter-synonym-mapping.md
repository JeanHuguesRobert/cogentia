---
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0"
title: "Frontmatter Synonym Mapping — v0.1"
date: "2026-05-27"
status: "working-paper — auto-filled (frontmatter cleanup)"
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/frontmatter-synonym-mapping.md
last_stamped_at: 2026-06-01
document_role: "operational"
document_kind: "documentation"
visibility: "public"
lifecycle_state: "working"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "documentation"
classification_confidence: "medium"
---
# Frontmatter Synonym Mapping — v0.1

Ce document liste les synonymes observés dans le corpus et les règles d’équivalence associées.

## Principes

- Les synonymes sont **tolérés** tant qu’une règle d’équivalence est documentée ici.
- Il n’y a **pas de date limite** d’utilisation des formes anciennes (sauf décision explicite de dépréciation).
- Quand un synonyme sera déprécié, il sera marqué `deprecated` dans ce document.

## Mapping des synonymes

### 1. Core Fields

| Clés observées                              | Nom canonique recommandé      | Règle d’équivalence |
|---------------------------------------------|-------------------------------|---------------------|
| `author`, `authors`                         | `author` ou `creator`         | Voir règle détaillée plus bas |
| `creator`                                   | `creator`                     | Production majoritairement mécanique |
| `affiliation`, `affiliations`               | `affiliation`                 | Équivalents |
| `date`, `created`                           | `date`                        | Date sémantique principale du document |
| `last_modified_at`, `updated`, `last_updated` | `last_modified_at`          | Date de dernière modification réelle |
| `license`, `licence`, `spdx-license-identifier` | `license`                  | `license` est la forme préférée |
| `language`, `lang`                          | `language`                    | Équivalents |
| `version`, `input_version`                  | `version`                     | Équivalents |

### 2. Provenance & Process

| Clés observées                              | Nom canonique recommandé      | Règle d’équivalence |
|---------------------------------------------|-------------------------------|---------------------|
| `source_document`, `derived_from`, `predecessor` | `source_document`          | Document source principal |
| `ai_assisted_by`, `chatgpt`, `grok`, `claude`, `gemini`, `agent`, `agent_last` | `ai_assisted_by` | Liste d’agents IA (ordonner par importance si possible) |
| `reviewed_by`, `review_context`             | `reviewed_by`                 | Équivalents pour les relecteurs humains |
| `human_arbitration_by`                      | `human_arbitration_by`        | Personne ayant fait l’arbitrage final |
| `version_history`, `changelog`              | `version_history`             | Historique des versions |

### 3. Navigation & Jekyll

| Clés observées          | Nom canonique | Notes |
|-------------------------|---------------|-------|
| `nav_order`             | `nav_order`   | Standard Jekyll |
| `parent`, `grand_parent`| `parent`      | Hiérarchie de navigation |
| `layout`                | `layout`      | Standard Jekyll |

### 4. Champs legacy / à supprimer

| Clés obsolètes                                      | Action recommandée |
|-----------------------------------------------------|--------------------|
| `repository`, `path`, `intended_path`, `canonical_path`, `canonical_slug`, `repository_candidate` | Supprimer. Remplacer par `canonical_url` si nécessaire |
| `en`, `fr` (liens de traduction)                    | Remplacer par `translations` (array d’objets ou de liens) |

### 5. Règle author / creator (importante)

- **Utiliser `author`** quand il existe un auteur humain identifiable (respect du Droit d’Auteur).
- **Utiliser `creator`** quand la production est majoritairement ou entièrement mécanique (pas d’auteur humain immédiat, ex: génération automatique complète par IA).

Exemple :
- Document écrit principalement par un humain → `author: "Jean Hugues Noël Robert, baron Mariani"`
- Document généré automatiquement par IA sans intervention humaine significative → `creator: "Claude 4.3 (génération automatique)"`

### 6. Champs expérimentaux / spécifiques

De très nombreux champs n’apparaissent qu’une ou deux fois (surtout dans barons-Mariani). Exemples :
- `merge_audit`, `decision_stack`, `vector_clock`, `claimed_ops`, `ghost_ops`, etc.

**Règle** : Ces champs peuvent rester pour l’instant. S’ils se multiplient, on les examinera pour voir s’ils méritent d’être normalisés ou transformés en extensions `x-`.

### 7. Patterns observés lors de l’ingestion de nouveaux dépôts (2026-05)

Lors des passes de migration large (barons-Mariani, cogentia, FractaVolta, etc.), certains clusters de champs expérimentaux sont revenus régulièrement. Voici comment on les a traités pour aller plus vite à l’avenir :

**a. Projets "packet" / description de réseau (FractaVolta style, certains cogentia)**
- Champs fréquents : `address`, `email`, `website`, `keywords`
- Traitement observé : souvent transformés en `x-address`, `x-email`, etc. ou regroupés sous un `x-contact`.
- Conseil pour ingestion : dès qu’on voit plusieurs de ces champs sur des fichiers de description de projet, les passer en `x-` en une passe mécanique.

**b. Travail politique / autonomie de capacité (barons-Mariani / autonomia)**
- Champs fréquents : `type`, `branch`, `source_file`, `date_creation`, `date_derniere_entee`, `institutional_frame`, `public_dashboard`, etc.
- Ces documents sont souvent du "source material", "campaign rhetoric" ou "working stock".
- Traitement observé : beaucoup ont été préfixés en `x-` (surtout `type`, `branch`, `source_file`). Le status est souvent très descriptif et légitime.
- Conseil : ne pas chercher à tout normaliser trop vite. Ces dépôts ont un style propre. Préfixer en `x-` les champs structurels récurrents et garder les statuts riches.

**c. Fichiers structurels du corpus (index.md, concepts.md, corpus-status.md)**
- Ces fichiers apparaissent dans presque tous les dépôts.
- Ils sont souvent maintenus par les outils (générés ou mis à jour automatiquement).
- Traitement observé : on leur met généralement `creator` (plutôt que `author`), `status: working-paper`, license + affiliation, et on les laisse relativement légers.
- Conseil ingestion : repérer rapidement ces 3 types de fichiers et leur appliquer un traitement "maintenance" standardisé.

**d. Règle pratique pour un nouveau dépôt**
1. Lancer `migrate-frontmatter.js --dry-run --broad` (ou équivalent) sur le research/.
2. Regrouper les `unknown_non_x_field_*` par similarité.
3. Pour les clusters qui reviennent sur >3-4 fichiers → proposer un préfixe `x-` commun.
4. Pour les statuts très descriptifs → les garder tels quels (sauf s’ils sont vraiment incohérents).
5. Pour les fichiers `index.md / concepts.md / corpus-status.md` → appliquer le traitement "structural" (creator + champs de base).

## Règles d’équivalence générales

- Les synonymes sont acceptés tant qu’une règle d’équivalence est documentée ici.
- Il n’y a **pas de date limite** d’utilisation des formes anciennes (sauf décision explicite de dépréciation, qui sera alors indiquée avec `deprecated` dans ce document).
- La tolérance aux différents styles est volontaire (personnalité de l’auteur + agents IA).

## Prochaines mises à jour

Ce document sera enrichi après chaque passe de migration ou quand de nouveaux synonymes significatifs apparaîtront.

---

## Checklist pratique : ingérer un nouveau dépôt rapidement

Quand on ajoute un nouveau dépôt au corpus, faire rapidement :

1. Scanner avec l’outil en mode large (`--broad` ou équivalent) pour voir les `unknown_non_x_field_*` et les statuts problématiques.
2. Identifier les 3 types de fichiers structurels ([`index.md`](../research/index.md), [`concepts.md`](../research/concepts.md), [`corpus-status.md`](../research/corpus-status.md)) et leur appliquer le traitement standard "maintenance" (creator + champs de base + working-paper).
3. Regrouper les champs expérimentaux qui reviennent sur plusieurs fichiers :
   - Packet/project description → souvent `x-` (address, email, website, keywords)
   - Travail politique/autonomie → souvent `x-` sur type/branch/source_file + tolérance sur les statuts très descriptifs
4. Ne pas tout normaliser en une passe. Priorité : supprimer les vrais legacy + préfixer les clusters expérimentaux récurrents.
5. Noter ici les nouveaux patterns observés pour les prochaines ingestions.

Objectif : après 2-3 dépôts traités de cette façon, l’ingestion d’un nouveau dépôt doit devenir de plus en plus mécanique sur les 80 % des cas.
<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Documents - All Tracked Repos](../research/documents.md)
- [Frontmatter Schema — v0.1 (Corpus)](frontmatter-schema.md)
- [Research Index — Cogentia](../research/index.md)
<!-- END_AUTO: backlinks -->
