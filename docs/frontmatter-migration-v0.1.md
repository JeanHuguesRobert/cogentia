---
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0"
---
# Frontmatter Migration — v0.1

Ce document décrit le plan de migration des frontmatters existants vers le schéma v0.1.

## Contexte

- Nous sommes les seuls à travailler activement sur ces dépôts.
- Il n’existe pas de "base installée" ni d’utilisateurs externes dépendants de l’ancien format.
- Nous pouvons donc être directs et efficaces dans la migration, sans phases de dépréciation longues.

## Objectif

- Passer à un schéma plus cohérent, sémantiquement plus riche, tout en restant lisible.
- Réduire la dette technique des synonymes et des champs legacy.
- Préparer une future évolution vers des standards plus sémantiques (Dublin Core + Schema.org + esprit Solid).

## Stratégie globale

Migration **directe** en une ou deux passes principales, suivie d’un nettoyage.

Pas de période de double maintenance longue.

## Mapping des synonymes (v0.1)

### Règles d’équivalence

| Ancien / Variante                  | Nom canonique          | Règle |
|------------------------------------|------------------------|-------|
| `author`, `authors`                | `creator`              | Équivalent. Utiliser `creator` dans les nouveaux documents. |
| `date`, `created`                  | `date`                 | Date sémantique principale du document. |
| `last_modified_at`, `updated`, `last_updated` | `last_modified_at` | Date de dernière modification réelle. |
| `source_document`, `derived_from`, `predecessor` | `source_document` | `source_document` = document source principal. `derived_from` toléré comme synonyme. |
| `tags`, `keywords`                 | `tags`                 | Équivalent. |
| `license`, `spdx-license-identifier` | `license`            | `license` est la forme préférée. |
| `repository`, `path`, `intended_path`, `canonical_path`, `canonical_slug` | **Supprimé** | Remplacer par `canonical_url` |

### Champs legacy à supprimer

- `repository`
- `path`
- `intended_path`
- `canonical_path`
- `canonical_slug`
- `repository_candidate`

Ces champs seront supprimés lors de la migration (pas de phase de dépréciation).

## Planning de migration proposé

### Phase 1 — Analyse & Préparation (courte)
- Finaliser le schéma v0.1 et ce document de migration.
- Améliorer l’outil `analyze-frontmatter.js` pour qu’il puisse générer des rapports de migration.

### Phase 2 — Migration en masse (directe)
- Utiliser un script (à développer) qui :
  - Parcourt tous les documents du périmètre large.
  - Applique le mapping des synonymes.
  - Supprime les champs legacy.
  - Ajoute les champs manquants avec valeurs par défaut quand c’est pertinent.
  - Conserve l’ordre et la lisibilité du frontmatter.

- Ordre de migration suggéré :
  1. barons-Mariani (le plus gros et le plus hétérogène)
  2. cogentia
  3. inseme, marenostrum, FractaVolta, Inox

### Phase 3 — Nettoyage & Validation
- Lancer `cogentia frontmatter check` sur l’ensemble du périmètre.
- Corriger les cas particuliers manuellement si besoin.
- Mettre à jour la documentation (ce fichier + [`frontmatter-schema.md`](frontmatter-schema.md)).

## Outil de migration

Un nouvel outil sera développé (probablement une extension de `cogentia frontmatter` ou un script dédié dans `cogentia/scripts/`).

Fonctionnalités visées :
- Mode `--dry-run` (très important)
- Mode `--apply`
- Rapport des changements par dépôt
- Possibilité de faire des passes par dépôt ou par pattern de fichier

---

**Statut** : Brouillon de travail — en cours de discussion.

Prochaines étapes :
- Valider ce plan de migration directe.
- Commencer le développement de l’outil de migration.
- Affiner les règles d’équivalence et les valeurs par défaut.

<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Frontmatter Schema — v0.1 (Corpus)](frontmatter-schema.md)

<!-- END_AUTO: backlinks -->
