---
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0"
title: "Frontmatter Schema — v0.1 (Corpus)"
date: "2026-05-27"
status: "working-paper — auto-filled (frontmatter cleanup)"
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/frontmatter-schema.md
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
# Frontmatter Schema — v0.1 (Corpus)

Ce document définit le schéma de métadonnées (frontmatter) utilisé dans le corpus multi-dépôts.

## Philosophie

- **Champs plats** par défaut (lisibilité + simplicité).
- Mélange assumé de **formel** et de **natural language** (surtout pour les agents IA).
- **Règles d’équivalence** plutôt qu’interdiction des synonymes (esprit TIMTOWTDI : "There Is More Than One Way").
- Priorité à la **traçabilité**, la **portabilité** et la **protection de la vie privée**.
- Le schéma doit rester **évolutif** et **pragmatique**. On évite l’usine à gaz : on préfère des règles claires d’équivalence à une rigidité excessive.

## Règles générales

- Tous les documents de fond (research, specs, notes importantes) doivent avoir un frontmatter.
- Every tracked corpus document must carry minimum traceability metadata, regardless of repository or directory. Missing information must be declared explicitly (`unknown`, `unreviewed`, or `[]`), never filled by assumption.
- Les valeurs par défaut sont à privilégier pour alléger l’écriture.
- Les synonymes sont tolérés **si et seulement si** une règle d’équivalence est documentée dans [`frontmatter-synonym-mapping.md`](frontmatter-synonym-mapping.md).
- `privacy` est `public` par défaut. On ne le précise que si on sort de ce régime.
- Un document **entièrement automatisé** (aucun contributeur humain) doit être identifiable facilement via le champ `generated_by`.

---

## Schéma des champs (v0.1)

### 1. Core (obligatoires sur tout document suivi)

| Champ                | Type                  | Défaut                              | Obligatoire ? | Notes |
|----------------------|-----------------------|-------------------------------------|---------------|-------|
| `title`              | string                | —                                   | Oui           | — |
| `subtitle`           | string                | —                                   | Non           | — |
| `description`        | string                | —                                   | Recommandé    | Résumé court |
| `author`             | string                | —                                        | Oui      | Auteur humain connu, sinon `unknown` |
| `creator`            | string                | "Jean Hugues Noël Robert, baron Mariani" | Non      | À utiliser quand la production est majoritairement ou entièrement mécanique. Règle d’équivalence : `author` et `creator` ne sont pas automatiquement équivalents. |
| `affiliation`        | string                | "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica" | Oui | — |
| `date`               | string (ISO 8601)     | —                                   | Oui           | Date sémantique principale, sinon `unknown` |
| `last_modified_at`   | string (ISO 8601)     | —                                   | Non           | Date de dernière modification réelle |
| `license`            | string                | "CC BY-SA 4.0"                      | Oui           | — |
| `language`           | string                | "fr"                                | Oui           | — |

### 2. Provenance & Traçabilité (obligatoires sur tout document suivi)

| Champ                    | Type                    | Défaut | Notes |
|--------------------------|-------------------------|--------|-------|
| `canonical_url`          | string                  | —      | Obligatoire sur les documents de fond |
| `last_stamped_at`        | string (ISO 8601)       | —      | Généré automatiquement |
| `version`                | string                  | —      | — |
| `status`                 | string ou liste         | —      | Liste cadrée + complément libre. Voir règles ci-dessous. |
| `methodology`            | string ou array         | —      | Implémentation de méthode (ex: "Cogentia Commons"). La "seconde méthode" est implicite. |
| `generated_by`           | string ou liste         | —      | Liste ordonnée par importance décroissante. Un seul champ. |
| `ai_assisted_by`         | array                   | —      | Liste des IA ayant participé |
| `reviewed_by`            | array                   | —      | — |
| `human_arbitration_by`   | string                  | —      | Personne ayant fait l’arbitrage final |
| `version_history`        | array                   | —      | — |

### 2 bis. Minimum provenance (required)

Each document must also declare a `provenance` block and a `review` block:

```yaml
provenance:
  origin_type: "repository" # repository, external-repository, generated, conversation, unknown
  origin_repository: "owner/repository" # or unknown
  origin_ref: "<immutable commit, tag, or URL>" # or unknown
  origin_date: "YYYY-MM-DD" # or unknown
  derived_from: []
review:
  status: "unreviewed"
  reviewed_by: []
```

`origin_ref` must be immutable or externally verifiable. A current branch name alone is not
sufficient. For generated documents, also record `generated_by` and the input documents. For
historical or unattributed material, use `unknown` explicitly and preserve the uncertainty.

### 3. Provenance documentaire

| Champ                    | Type          | Défaut | Notes |
|--------------------------|---------------|--------|-------|
| `source_document`        | string        | —      | **Document source principal** (quand il existe clairement) |
| `additional_sources`     | array         | —      | Documents sources complémentaires (si pertinent) |
| `derived_from`           | string        | —      | **Règle d’équivalence** : synonyme toléré de `source_document` |

**Règle importante** :
- On ne met `source_document` que s’il existe un document source **clair et identifiable**.
- S’il n’y a pas de document source souverain clair (cas fréquent en transdisciplinarité), on ne force pas ce champ. On met alors des références dans le corps du document.
- On ne spécifie pas de "type" (souverain / symétrique) dans le frontmatter : c’est redondant et subjectif.

### 4. Navigation & Publication (Jekyll)

Champs standards Jekyll (`layout`, `permalink`, `nav_order`, `parent`, `has_children`, etc.) restent autorisés.

### 5. Sémantique & Traçabilité future (préparation Solid / Linked Data)

| Champ            | Type   | Notes |
|------------------|--------|-------|
| `webid`          | string | Prévu pour plus tard (pointeur GitHub acceptable actuellement) |
| `rights`         | string | Plus fin que `license` si nécessaire |
| `tags`           | array  | — |
| `related_documents` | array | — |
| `related_projects`  | array | — |
| `document_role`  | string | Exemples : `source`, `symmetric-derived`, `synthesis`, `operational-note`, `translation` |

---

## Règles spécifiques

### Règle sur `status`

- Le champ `status` repose sur une **liste cadrée** de valeurs de base.
- Un document peut avoir **plusieurs statuts simultanément**.
- On peut ajouter un **complément qualificatif** en langage naturel (après un tiret ou sous forme de phrase).
- Valeurs de base officielles (pour l’instant) :
  - `draft`
  - `working-paper`
  - `stable`
  - `under-review`
  - `deprecated`
  - `superceded`

Exemples acceptés :
- `status: "working-paper"`
- `status: "working-paper, superceded"`
- `status: "working-paper — version revue après objections du 27/05"`
- `status: ["working-paper", "under-review"]`

### Règle sur `generated_by`

- Le champ `generated_by` est **une seule liste** (ou une chaîne si un seul agent).
- La liste est **ordonnée par importance décroissante** : l’agent le plus impliqué en premier, les moins impliqués à la fin.
- On met ce qu’on peut de plus précis (agent + rôle quand c’est utile).
- Si le document est **entièrement automatisé** (aucun agent humain), cela doit être facilement visible (par exemple en commençant la liste par un agent IA ou en le précisant clairement).

Exemple :
```yaml
generated_by:
  - "Jean Hugues Noël Robert"
  - "Claude 4.3 (rédaction + structuration)"
  - "Grok 4.3 (revue critique)"
```

Exemple entièrement automatisé :
```yaml
generated_by: "Claude 4.3 (génération automatique complète)"
```

### Règle sur les synonymes et la tolérance aux styles

- Les synonymes sont **tolérés** tant qu’une règle d’équivalence claire est documentée dans [`frontmatter-synonym-mapping.md`](frontmatter-synonym-mapping.md).
- Il n’y a **pas de date limite** d’utilisation des formes alternatives (sauf décision explicite de dépréciation, qui sera alors marquée `deprecated` dans le fichier de mapping).
- Le « style » fait partie de la personnalité de l’auteur (humain ou agent). On n’essaie pas d’uniformiser de façon excessive.

Règles d’équivalence principales (voir le fichier de mapping pour la liste complète) :
- `author` / `authors` ↔ `creator` (avec la règle Droit d’Auteur expliquée dans le mapping)
- `date` / `created` → équivalents
- `last_modified_at` / `updated` → équivalents
- `source_document` / `derived_from` → `source_document` préféré
- `tags` / `keywords` → `tags` préféré

### Règle sur les extensions

- Les champs d’extension doivent commencer par le préfixe `x-` (ex: `x-my-experiment`, `x-internal-note`).
- Ces champs sont libres.
- Philosophie : **flexible à l’entrée, strict à la sortie** (inspiré des principes IETF).

**Conseil pratique issu des ingestions 2026** :
- Quand un même champ expérimental apparaît sur plusieurs fichiers d’un même dépôt (ex: `address`, `type`, `branch`, `source_file`), le passer rapidement en `x-` pour ne pas polluer le schéma principal.
- Les clusters récurrents observés :
  - Projets "packet" / description de réseau → `address`, `email`, `website`, `keywords`
  - Travail politique / source material → `type`, `branch`, `source_file`, dates de création spécifiques
- On ne force pas tout de suite une normalisation sémantique. On préfixe d’abord pour garder la lisibilité.

D’autres synonymes pourront être ajoutés à condition qu’une règle d’équivalence soit documentée dans ce fichier.

### Règle sur la vie privée

- Par défaut, tout document est considéré **public**.
- Il n’est **pas nécessaire** d’ajouter `privacy: public`.
- D’autres valeurs ne seront introduites que lorsque le besoin apparaîtra.

---

## Champs à supprimer (lors de la migration)

Ces champs sont considérés comme legacy et ne doivent plus être utilisés dans les nouveaux documents :

- `repository`
- `path`
- `intended_path`
- `canonical_path`
- `canonical_slug`
- `repository_candidate`

---

## Notes

- Ce schéma est conçu pour être **lisible par des humains et des agents IA**.
- Il cherche un équilibre entre structure formelle et expressivité en langage naturel.
- Il est explicitement conçu pour rester **évolutif** sans rupture trop douloureuse.

### Accélérer l’ingestion de nouveaux dépôts

Pour aller plus vite quand on ramène un nouveau dépôt :

- Commencer par identifier les fichiers structurels ([`index.md`](../research/index.md), [`concepts.md`](../research/concepts.md), [`corpus-status.md`](../research/corpus-status.md)) → leur appliquer un traitement léger et cohérent (souvent `creator` + champs de base + `working-paper`).
- Ne pas chercher à tout normaliser sémantiquement dès le premier passage. Première passe = suppression legacy + préfixage `x-` des clusters expérimentaux qui reviennent.
- Utiliser les patterns documentés dans [`frontmatter-synonym-mapping.md`](frontmatter-synonym-mapping.md) (section "Patterns observés lors de l’ingestion").

L’objectif est que chaque nouveau dépôt ingéré rende les suivants un peu plus mécaniques.

---

*Version : 0.1 — Brouillon de travail*
<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Frontmatter Migration — v0.1](frontmatter-migration-v0.1.md)
- [Research Index — Cogentia](../research/index.md)
<!-- END_AUTO: backlinks -->
