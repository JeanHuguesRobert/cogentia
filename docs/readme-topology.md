---
title: "README Topology and Maintenance"
author: "Jean Hugues Noel Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0"
date: "2026-09-20"
status: "stable — active"
document_role: operational
document_kind: documentation
visibility: public
lifecycle_state: active
update_policy: UP-DEFAULT-REVIEWED
language: en
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: e5889682873610dbd2dd291e5d62f6e99ce8f6ee
  origin_date: "2026-09-20"
  derived_from:
    - "research/locality_principle.md"
    - "research/cogentia_commons_living_corpus.md"
    - "research/pipeline.md"
review:
  status: unreviewed
  reviewed_by: []
---

# README Topology and Maintenance

## Purpose

A README is an entry point at the scale of the directory that owns it. It is
not merely a file convention: on GitHub it is often the first public surface
of a repository or subsystem. The corpus is fractal, so a meaningful subtree
may have its own README, documents, scripts, and maintenance needs.

This guide defines how those entry points compose without duplicating each
other, and how their mechanical navigation remains separate from curated
prose.

## Locality rule

Apply the **Minimum Sufficient Locality** to README content: keep the local
explanation, commands, and maintenance facts with the directory they describe;
cross a directory or repository boundary through explicit, inspectable links.
In short: **localize knowledge; distribute references**. A nested README is
therefore not a smaller copy of its parent, but the smallest entry point that
can make its own locality intelligible.

## Why README topology is a locality pattern

A root README cannot remain a useful entry point by carrying every command,
decision, and operational detail of every subtree. That centralization makes
the root difficult to maintain and obscures which facts actually govern a
given component. Conversely, a subtree needs enough nearby context that a
reader can understand, operate, or extend it without silently reconstructing
the entire repository.

A nested README establishes that smallest sufficient boundary. Its local
explanation owns facts that change with the directory; its parent owns facts
that govern the repository as a whole. Links make the crossing explicit: a
reader can move upward for shared context or outward to a canonical source
without duplicating either one.

This is not a rule that every directory needs a README. Add one when the
directory has a distinct responsibility, audience, interface, or maintenance
cycle. The test is practical: can the local README make its scope intelligible
with explicit references, while the root stays concise and does not become a
central copy of all local knowledge?

## Scope by directory boundary

| Location | The README explains |
|---|---|
| Repository root | The repository's purpose, audience, principal entry points, supported ways to run it, and current status. |
| Subsystem directory | The subsystem's role, boundaries, dependencies, local conventions, and entry points. |
| Module or content directory | What belongs in that directory, its local structure, and its canonical documents or API. |
| Technical directory | Nearby operational instructions only when they cannot be inferred safely from the parent or code. |

Nested READMEs complement their parent. They must not restate the repository
overview, global installation guide, or unrelated policy. When a parent README
exists, link to it near the beginning of the nested README. Link outward to
canonical source documents rather than copying substantive doctrine locally.

## A maintained README

Curated README text is a derived product requiring judgment. Before changing
it, verify each material claim against the appropriate source:

| Claim type | Evidence to inspect |
|---|---|
| Purpose, audience, and public status | Canonical source documents and current repository ownership. |
| Installation and commands | `package.json`, scripts, workflow files, and a proportionate local execution. |
| Architecture and boundaries | The code, interface contracts, and local operational mandate. |
| Links and navigation | Existing files and the rendered relative path. |

Do not turn an absent or unverified claim into a positive statement. If a
claim needs a human decision, preserve that boundary rather than fabricating
an update. Profile READMEs and other public identity pages remain curated
derived products; they are never mechanically rewritten.

## Opt-in generated local navigation

Cogentia can refresh a list of Markdown documents below a README only when the
README explicitly contains this managed block:

```md
<!-- BEGIN_AUTO: readme_index -->
<!-- END_AUTO: readme_index -->
```

The generator changes only the contents of that block. It does not create the
marker, select a README's editorial structure, or replace hand-written prose.
This makes a nested README locally navigable while preserving its authorial
voice and public commitments.

Use the ordinary corpus cycle to preview and validate the mechanical changes:

```powershell
node scripts/cogentia.js corpus plan --json
node scripts/cogentia.js corpus apply
node scripts/cogentia.js corpus verify --strict
```

Use `--no-readmes` when a planned corpus operation must deliberately exclude
all README index refreshes. Review the plan before applying it, especially
where a README is publicly rendered.

## Practical audit sequence

1. Inventory root and nested READMEs, treating each as a directory boundary.
2. Classify each one as current, mechanically refreshable, editorially stale,
   or obsolete.
3. Repair broken commands and factual errors before improving wording or
   presentation.
4. Add the opt-in index block only where a local document list makes the
   directory easier to enter.
5. Review rendered links and run the repository's relevant validation before
   committing a coherent, small batch.

The source doctrine is the [Locality Principle](../research/locality_principle.md).
The source doctrine for the corpus's fractal structure is
[`research/cogentia_commons_living_corpus.md`](../research/cogentia_commons_living_corpus.md).
The pipeline boundary between generated navigation and curated README prose is
specified in [`research/pipeline.md`](../research/pipeline.md#414-readme-maintenance).
