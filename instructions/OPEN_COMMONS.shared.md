---
title: Open Commons Default — Shared Agent Rule
status: active
version: 2
date: 2026-08-19
document_role: operational
document_kind: agent-instructions
visibility: public
lifecycle_state: active
---

# Open Commons Default

The non-commercial Cogentia corpus is intended to produce and preserve digital commons.

## Scope

This default applies across repositories controlled by Jean Hugues Robert in the following GitHub owner spaces when the repository or artifact is intended to be public and reusable:

- `JeanHuguesRobert/*`;
- `acorsica/*` (C.O.R.S.I.C.A.);
- `virteal/*`.

Private, restricted, confidential, security-sensitive, personal-data, or third-party-controlled material is excluded from this default even when it is technically reachable by an agent. Repository visibility is evidence, not a license classification: a public repository may contain material that is public to read but not intended as Open Data, while a private repository is never made open merely by this rule.

Known explicit private/restricted overlay at adoption time: `JeanHuguesRobert/registre-mariani`.

## Default rule

Software, specifications, reusable technical artifacts, and public-interest datasets produced inside the non-commercial corpus SHOULD remain openly reusable.

- **Software default:** MIT License, unless an existing compatible license, third-party provenance, or explicit human decision requires another OSI-approved license.
- **Open Data default:** Licence Ouverte 2.0 / Etalab for datasets intentionally classified and published as Open Data, subject to provenance and upstream licensing constraints.
- **Commercial reuse:** permitted by default. Openness is not implemented by prohibiting commercial use.
- **Responsibility:** downstream reusers remain responsible for their transformations, interpretations, combinations, publication, and operational use of reused data or software.

Agents MUST NOT silently introduce mechanisms that make an intended common materially less open, including:

- `private: true` or equivalent package/publication restrictions when the package is intended to be public;
- proprietary, source-available-only, non-commercial-only, or otherwise non-OSI software licensing where Open Source is the stated intent;
- closed publication defaults for artifacts intended to be public;
- restrictions that prevent lawful reuse of datasets intended as Open Data;
- use of non-commercial infrastructure to subsidize an explicitly commercial deployment when that infrastructure was granted for non-commercial/open-source purposes.

A package-manager `private` flag may still be legitimate when it is deliberately used only as a technical safeguard against registry publication and does not contradict the project's publication intent. The agent MUST establish that intent rather than assume it. When the repository or project is explicitly intended to be publishable/open, do not set the flag by default.

## Democratization by capacity, not discriminatory licensing

The corpus seeks effective democratization of access to software, data, and AI capabilities, especially for natural persons and non-profit organisations. This preference SHOULD be implemented through capability rather than discriminatory licensing: free public access, documentation, simple exports, open APIs, reusable tools, reference deployments, community support, and where available non-commercial compute or service quotas.

Commercial actors may reuse the same Open Source software and Open Data, but commercial deployments SHOULD bring or finance their own scarce execution resources unless an explicit mandate provides otherwise.

The preferred protection of the commons is exemplary effectiveness and reproducibility: make the open implementation easy to inspect, copy, deploy, improve, and replace. Canonical heuristic: **people copy what works well**.

## Separation of openness, privacy, and resources

Open Source and Open Data do not mean that personal, confidential, security-sensitive, or legally restricted material becomes public. Privacy and data-protection constraints remain independent and take precedence for protected material.

Public visibility alone does not classify information as Open Data. A dataset must be intentionally classified for public reuse, with provenance and licensing checked before an Open Data license is asserted.

Likewise, an Open Source license may permit commercial reuse of software without granting any right to consume compute, energy, bandwidth, storage, credits, APIs, or other scarce resources financed for non-commercial purposes. Commercial deployments must bring or finance their own execution resources unless an explicit mandate says otherwise.

## Existing licences and provenance

Do not overwrite existing licences mechanically. Legacy repositories, imported components, forks, vendored code, datasets from external producers, and contributed material may carry existing rights or obligations that take precedence over this default.

For each repository or artifact, preserve provenance and classify at least:

- original software controlled by the corpus;
- third-party or historically licensed software;
- intentionally published Open Data;
- public content that is not Open Data;
- personal/restricted material;
- mixed or uncertain material requiring review.

## Licensing changes

Changing an existing license, adding a new repository-wide license, relicensing contributed material, or changing the legal status of a dataset remains a consequential act requiring explicit human validation. Agents may audit, identify inconsistencies, and propose a migration without silently relicensing existing material.

## Stigmergic origin

This rule was added after `private: true` was unintentionally introduced into public Inseme applications/packages (Olé Olé and Cyrnea), revealing that coding agents could infer a conventional monorepo privacy default contrary to the corpus's Open Commons intent.

It was extended on 2026-08-19 after explicit human decisions to use MIT as the default software licence, Licence Ouverte 2.0 / Etalab as the default for intentionally published Open Data, to permit commercial reuse while placing responsibility on the reuser, and to apply the doctrine across the `JeanHuguesRobert`, `acorsica`, and `virteal` GitHub owner spaces while preserving private/restricted boundaries.

Prevention rule: determine publication/openness intent from corpus doctrine before introducing privacy, licensing, or publication restrictions; for narrow corrections, verify that the final diff contains no unrelated changes.
