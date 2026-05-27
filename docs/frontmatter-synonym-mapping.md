# Frontmatter Synonym Mapping — v0.1

Ce document liste les synonymes observés dans le corpus et les règles d’équivalence associées.

## Principes

- Les synonymes sont **tolérés** tant qu’une règle d’équivalence est documentée ici.
- Il n’y a **pas de date limite** d’utilisation des formes anciennes (sauf décision explicite de dépréciation).
- Quand un synonyme sera déprécié, il sera marqué `deprecated` dans ce document.

## Mapping des synonymes

### Core

| Clés observées              | Nom canonique recommandé | Règle d’équivalence |
|-----------------------------|---------------------------|---------------------|
| `author`, `authors`         | `author` ou `creator`     | Voir règle détaillée ci-dessous |
| `creator`                   | `creator`                 | À utiliser pour production majoritairement mécanique |
| `date`, `created`           | `date`                    | Date sémantique principale du document |
| `last_modified_at`, `updated`, `last_updated` | `last_modified_at` | Date de dernière modification réelle |
| `license`, `spdx-license-identifier` | `license`          | `license` est la forme préférée |
| `tags`, `keywords`          | `tags`                    | Équivalents |

**Règle author / creator** (importante) :
- Utiliser `author` quand il existe un auteur humain identifiable (respect du Droit d’Auteur français).
- Utiliser `creator` quand la production est majoritairement ou entièrement mécanique (pas d’auteur humain immédiat).

### Provenance documentaire

| Clés observées                     | Nom canonique recommandé | Règle |
|------------------------------------|---------------------------|-------|
| `source_document`, `derived_from`, `predecessor` | `source_document` | `source_document` = document source principal. Les autres sont dans `additional_sources`. |

### Champs legacy (à supprimer progressivement)

| Clés obsolètes                          | Action |
|-----------------------------------------|--------|
| `repository`, `path`, `intended_path`, `canonical_path`, `canonical_slug`, `repository_candidate` | Supprimer lors de la migration. Remplacer par `canonical_url`. |

## Notes

- Ce document sera mis à jour au fur et à mesure de la migration et des décisions de dépréciation.
- La tolérance aux synonymes est volontaire pour préserver la personnalité des auteurs et éviter une uniformisation trop rigide.