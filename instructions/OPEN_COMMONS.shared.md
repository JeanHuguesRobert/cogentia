---
title: Open Commons Default — Shared Agent Rule
status: active
version: 1
date: 2026-08-19
document_role: operational
document_kind: agent-instructions
visibility: public
lifecycle_state: active
---

# Open Commons Default

The non-commercial Cogentia corpus is intended to produce and preserve digital commons.

## Default rule

Software, specifications, reusable technical artifacts, and public-interest datasets produced inside the non-commercial corpus SHOULD remain openly reusable. Software intended as part of the commons SHOULD use an OSI-approved Open Source license. Public-interest datasets intended as part of the commons SHOULD use an explicit Open Data license appropriate to the data and its provenance.

Agents MUST NOT silently introduce mechanisms that make an intended common materially less open, including:

- `private: true` or equivalent package/publication restrictions when the package is intended to be public;
- proprietary, source-available-only, non-commercial-only, or otherwise non-OSI software licensing where Open Source is the stated intent;
- closed publication defaults for artifacts intended to be public;
- restrictions that prevent lawful reuse of datasets intended as Open Data;
- use of non-commercial infrastructure to subsidize an explicitly commercial deployment when that infrastructure was granted for non-commercial/open-source purposes.

A package-manager `private` flag may still be legitimate when it is deliberately used only as a technical safeguard against registry publication and does not contradict the project's publication intent. The agent MUST establish that intent rather than assume it. When the repository or project is explicitly intended to be publishable/open, do not set the flag by default.

## Separation of openness, privacy, and resources

Open Source and Open Data do not mean that personal, confidential, security-sensitive, or legally restricted material becomes public. Privacy and data-protection constraints remain independent and take precedence for protected material.

Likewise, an Open Source license may permit commercial reuse of software without granting any right to consume compute, energy, bandwidth, storage, credits, APIs, or other scarce resources financed for non-commercial purposes. Commercial deployments must bring or finance their own execution resources unless an explicit mandate says otherwise.

## Licensing changes

Changing an existing license, adding a new repository-wide license, relicensing contributed material, or changing the legal status of a dataset remains a consequential act requiring explicit human validation. Agents may audit, identify inconsistencies, and propose a migration without silently relicensing existing material.

## Stigmergic origin

This rule was added after `private: true` was unintentionally introduced into public Inseme applications/packages (Olé Olé and Cyrnea), revealing that coding agents could infer a conventional monorepo privacy default contrary to the corpus's Open Commons intent.

Prevention rule: determine publication/openness intent from corpus doctrine before introducing privacy, licensing, or publication restrictions; for narrow corrections, verify that the final diff contains no unrelated changes.
