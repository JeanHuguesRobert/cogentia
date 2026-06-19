---
title: "Open Knowledge Format and Cogentia"
description: "Alignment note after Google's publication of Open Knowledge Format v0.1: what Cogentia already shares, where it differs, and what cogentia.js should consider next."
date: 2026-06-19
source_date: 2026-06-12
status: "working-note v0.1"
document_role: "source"
type: "Research Note"
tags: [okf, open-knowledge-format, corpus, interoperability, frontmatter, agents]
license: CC BY-SA 4.0
creator: Jean Hugues Noël Robert, baron Mariani
affiliation: Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/open_knowledge_format_alignment.md
document_kind: "working-note"
visibility: "public"
lifecycle_state: "working"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "working-note"
classification_confidence: "medium"
---

# Open Knowledge Format and Cogentia

Google Cloud published **Open Knowledge Format** (OKF) v0.1 on 2026-06-12. The public article presents OKF as an open, vendor-neutral way to share knowledge for humans and agents. The primary specification is in the `GoogleCloudPlatform/knowledge-catalog` repository.

This matters to Cogentia because OKF validates, from an independent industrial actor, several choices already present in the Cogentia corpus:

- Markdown as the human-readable body format;
- YAML frontmatter for machine-readable metadata;
- git repositories as a practical distribution and review mechanism;
- `index.md` as progressive disclosure for humans and agents;
- ordinary Markdown links as graph edges;
- permissive consumption: tolerate unknown fields, unknown types, and partial or evolving bundles.

## Source Links

- Google Cloud article: [How the Open Knowledge Format can improve data sharing](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing)
- OKF repository: [GoogleCloudPlatform/knowledge-catalog](https://github.com/GoogleCloudPlatform/knowledge-catalog)
- OKF v0.1 specification: [`okf/SPEC.md`](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
- OKF README and proof-of-concept tooling: [`okf/README.md`](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/README.md)

## What OKF Says

OKF defines a knowledge bundle as a directory tree of Markdown files. A normal concept document has YAML frontmatter and a Markdown body. `index.md` files provide directory-level navigation. `log.md` files may record update history. Links between documents are interpreted as directed graph edges, with relationship semantics carried by prose rather than by a central ontology.

The minimal required field for a concept document is:

```yaml
type: <Type name>
```

Recommended fields are:

```yaml
title: <display name>
description: <one-line summary>
resource: <canonical URI for described asset>
tags: [<tag>, <tag>]
timestamp: <ISO 8601 datetime>
```

Producers may add arbitrary extra fields. Consumers should preserve unknown fields and should not reject bundles because of missing optional metadata, unknown types, broken links, or absent indexes.

## Direct Alignment With Cogentia

Cogentia already behaves like an OKF-shaped knowledge system in most operational respects.

| OKF element | Cogentia analogue | Status |
|---|---|---|
| Bundle directory | Registered repository or corpus subdirectory | Already present |
| Concept document | Markdown research/source/derived document | Already present |
| YAML frontmatter | Cogentia frontmatter schema | Already present |
| `index.md` progressive disclosure | Per-repo `research/index.md`, README navigation, trails | Already present |
| Markdown links as graph edges | Backlinks, corpus graph, trails, document catalog | Already present |
| Git distribution | Multi-repository corpus | Already present |
| Permissive consumer | `cogentia.js` role inference and generated views | Already present |
| Bundle-level catalog | `research/documents.md`, per-repo corpus status | Already present, but not OKF-native |

This is an important convergence. Cogentia should not treat OKF as a replacement. It should treat OKF as an interoperability profile that can make Cogentia bundles easier for external tools and agents to consume.

## Differences To Preserve

Cogentia is broader than OKF. OKF is intentionally minimal; Cogentia carries governance, privacy, ownership, continuation, derivation, mandate, trails, backlink, public/private, and multi-repository corpus semantics.

The following differences should remain explicit:

- **Document roles.** Cogentia distinguishes source, derived, operational, alias, template, example, and generated views. OKF only requires `type`.
- **Visibility policy.** Cogentia has public/private boundaries and must prevent public-to-private leakage. OKF does not specify privacy policy.
- **Continuations.** Cogentia has resumable human/agent work packets. OKF is a knowledge representation format, not a continuation protocol.
- **Generated views.** Cogentia manages backlinks, trails, documents, and corpus-status blocks. OKF indexes are simpler.
- **Multi-repo ownership.** Cogentia tracks owners, mandates, private repositories, and organization repositories. OKF treats distribution units more generically.

These are not contradictions. They suggest a layered model:

```text
OKF-compatible surface
  -> Cogentia corpus semantics
    -> continuations, privacy, mandate, ownership, derivation, trails
```

## Practical Mapping

A Cogentia document can become OKF-friendly without losing Cogentia semantics by adding or normalizing a small compatibility layer:

```yaml
type: Research Note
title: Open Knowledge Format and Cogentia
description: Alignment note between OKF v0.1 and Cogentia.
tags: [okf, corpus, interoperability]

document_role: source
visibility: public
corpus_scope: multi_repo
```

For many existing documents, Cogentia already has `title`, `description`, `date`, `status`, `license`, and role-like fields. The main gap is that OKF requires `type`, while Cogentia currently infers role from frontmatter, path, and index context.

## Suggested `cogentia.js` Features

These are intentionally small and reversible.

1. **`okf check`**

   Report whether a repo, subdirectory, or configured corpus can be consumed as an OKF bundle:

   - every non-reserved Markdown file has parseable frontmatter;
   - every concept-like document has non-empty `type` or a computable type;
   - `index.md` and `log.md` are treated according to OKF reserved-name rules;
   - broken links are reported as warnings, not hard failures.

2. **`okf export`**

   Produce an OKF-compatible projection of the Cogentia corpus without mutating source documents:

   - one bundle per repository by default;
   - optional global bundle from selected public repositories;
   - generated `index.md` files using document titles and descriptions;
   - generated `log.md` from git history or corpus events where practical;
   - source frontmatter preserved, with computed `type` added when absent.

3. **`okf frontmatter plan`**

   Propose minimal frontmatter patches that would make selected documents more OKF-friendly:

   - add `type` where missing;
   - map Cogentia `document_role` to a human-readable OKF `type`;
   - preserve all existing fields.

4. **`okf bundle graph`**

   Reuse Cogentia backlinks/trails/link scanning to emit a graph summary compatible with OKF visualizers or external agent consumers.

## Caution

OKF's `index.md` convention is not identical to Cogentia's current `research/index.md` convention. OKF says directory `index.md` files normally have no frontmatter, except a root index may declare `okf_version`. Cogentia uses frontmatter on repository research indexes for Jekyll and corpus metadata.

Therefore, Cogentia should prefer **projection/export** before in-place mutation. The source corpus can remain Cogentia-native while exposing an OKF-compatible view.

## Indexes, Moved Documents, and Zero-Loss Migration

The practical rule is: **Cogentia source documents remain the source of truth; OKF views are compatible projections.** A migration toward OKF should not erase Cogentia semantics. When OKF has no field for a Cogentia concept, the field should be preserved as a Cogentia extension, not dropped.

This is especially important for `index.md` and moved documents:

- Cogentia `research/index.md` files may keep their frontmatter because they serve the corpus, the website, and human/agent navigation.
- An OKF export may generate stricter `index.md` files for external consumers, including an `okf_version` root index when useful.
- Source documents that historically lived at repository root but are research papers should move to `research/` when that makes the corpus easier to browse.
- The old path should remain as a minimal alias/redirect document with `document_role: alias`, `redirect_to`, `canonical_document`, and `moved_at`.
- Canonical links in README files, research indexes, website data, and generated views should point to the new `research/` path.
- Corpus Browser and future Cogentia Commons views should hide alias stubs by default, but expose them when a reader follows an old link or asks for migration history.

This is the corpus equivalent of HTTP `301 Moved Permanently`: old links keep working, canonical navigation improves, and no semantic content is lost.

## Immediate Conclusion

OKF is strong external confirmation that Cogentia's basic substrate is right: Markdown, YAML, git, links, indexes, and tolerant agents.

The next pragmatic step is not a large rewrite. It is to add an OKF compatibility layer to `cogentia.js`, starting with `okf check` and `okf export`, so public portions of the corpus can be shared with tools that understand OKF while retaining Cogentia's richer governance and continuation model.
