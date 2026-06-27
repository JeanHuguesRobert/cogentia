---
document_role: "operational"
document_kind: "architecture"
visibility: "public"
lifecycle_state: "active"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "architecture"
classification_confidence: "medium"
---

# Cogentia Trace — Architecture

Cogentia Trace separates four layers that must not be collapsed:

1. raw private preservation;
2. normalized local events;
3. classified and continuable processing;
4. optional public or application-level derived outputs.

## Flow

```text
platform exports
  -> raw private vault
  -> local importer
  -> normalized events
  -> classification checks
  -> continuation if judgment is required
  -> local index / derived packets
```

## Local-first rule

The raw exports remain outside GitHub. GitHub stores only method, schemas, code and fictive examples.

## Initial target

The first importer targets the official ChatGPT/OpenAI export. Gmail and Facebook exports are later extensions because they involve more third-party and legal sensitivity.

## Storage roles

- Local filesystem: raw private sources and working data.
- SQLite/DuckDB: local structured index.
- GitHub: public method, schemas, examples and documentation.
- Supabase: optional later adapter, not part of the MVP.
- RAG/vector search: optional later layer, only after classification.
<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Research Index — Cogentia](../../research/index.md)
<!-- END_AUTO: backlinks -->
