# Cogentia Personal — Data Portability

## Purpose

This directory contains the generic, reusable layer for turning personal data exports into a sovereign, navigable, versioned trace corpus.

It belongs to Cogentia Personal, not to any specific private personal register.

## Scope

This layer may contain:

- schemas;
- templates;
- tools;
- import conventions;
- normalization rules;
- validation rules;
- redaction helpers;
- manifest builders;
- fictitious or anonymized examples.

It must not contain real private personal data.

## Core distinction

A private register is an instance.

Cogentia Personal data portability is the reusable method and tooling layer.

A private register may contain real data, legal traces, family archives, patrimonial continuity notes, and private decisions.

This directory must contain only generic material that can be reused by other persons or projects.

## Design principles

1. Raw exports remain sources.
2. Markdown provides a navigable human-and-agent map.
3. Git provides versioned continuity.
4. Manifests preserve provenance.
5. Checksums support integrity verification.
6. Redaction must be explicit.
7. Private data must never be used as public examples.
8. Large files should be referenced when direct storage is not appropriate.

## Suggested structure

```text
cogentia_personal/data_portability/
  README.md
  schemas/
  templates/
  tools/
  examples/
```

## Relation to private registers

A private register using this method may keep its own language, legal conventions, and governance rules.

For example, a French private register with potential evidentiary or succession value may use French as its reference language while still relying on English technical directory names for compatibility with generic tooling.
