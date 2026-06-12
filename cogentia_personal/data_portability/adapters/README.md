# Cogentia Personal Data Portability — Adapters

## Purpose

Adapters translate provider-specific or format-specific exports into stable Cogentia Personal data portability structures.

Adapters must remain separate from:

- the generic core;
- private personal registers;
- real personal data.

## Adapter types

Two adapter families are expected:

1. generic format adapters;
2. provider-specific adapters.

## Generic format adapters

Generic adapters handle broad technical formats without assuming a specific provider.

Initial generic adapters:

```text
generic_zip
generic_json
generic_html
```

These adapters should be conservative and should mark uncertainty explicitly.

## Provider-specific adapters

Provider adapters may later handle exports from platforms such as Meta, Google, OpenAI, GitHub, LinkedIn, Substack, or others.

They should be added only when the provider export format has been inspected and mapped.

## Rules

Adapters must:

- preserve raw-source integrity;
- avoid publishing real private data;
- produce explicit mappings;
- document uncertainty;
- generate processing reports;
- avoid importing large media files into Git by default;
- convert provider-specific structures into generic Cogentia Personal traces.

## Suggested adapter layout

```text
adapters/
  README.md
  generic_zip/
    README.md
    mapping.yaml
  generic_json/
    README.md
    mapping.yaml
  generic_html/
    README.md
    mapping.yaml
```

## Confidence levels

Suggested adapter confidence levels:

- experimental;
- partial;
- usable;
- verified;
- obsolete.

## Final rule

An adapter is a translator, not a source of truth.

The raw export remains the source.
