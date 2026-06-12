# Generic ZIP Adapter

## Purpose

The generic ZIP adapter inspects ZIP archives or extracted ZIP directories without assuming a specific provider.

It is useful when a provider export has not yet received a dedicated adapter.

## Status

Draft.

Confidence level:

```text
experimental
```

## Inputs

The adapter may receive:

- path to a ZIP archive;
- path to an extracted directory;
- provider label, if known;
- export date