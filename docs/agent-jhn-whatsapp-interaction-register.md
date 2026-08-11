---
document_role: operational
document_kind: operational-note
visibility: public
lifecycle_state: active
title: Agent JHN WhatsApp — registry placement (Occam)
related_issue: https://github.com/JeanHuguesRobert/cogentia/issues/75
update_policy: UP-DEFAULT-REVIEWED
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
---

# WhatsApp placement: use `registre-mariani`

## Correction (Occam)

An earlier workspace path under `C:\tweesic\.local\` was a **wrong extra entity**.

Corpus rule: *do not create a new container if an existing one is sufficient*  
(`research/ideas_to_explore_as_issues.md` — Occam discipline).

| Need | Sufficient existing container |
|------|-------------------------------|
| Generic adapter, schema, tests | `cogentia` |
| Private registry, living interaction memory | **`JeanHuguesRobert/registre-mariani`** (already the controlled private registry precedent) |

`registre-mariani` already holds private `interaction_packets/` (including mail). WhatsApp curated memory belongs there, not in a new ad-hoc tree.

## Canonical paths

```text
Method (public):
  cogentia/scripts/lib/agent-jhn-whatsapp/
  cogentia/trace/schemas/whatsapp-artifact.schema.json

Private runtime (gitignored secrets):
  registre-mariani/runtime/agent-jhn-whatsapp/

Private curated register:
  registre-mariani/interaction_packets/packets/
  registre-mariani/interaction_packets/mail_trace.md  # mail today
  # optional later: whatsapp_trace.md sibling — only if a table earns its keep
```

## Two planes (unchanged doctrine)

```text
runtime/          = session, raw bodies, technical outbox   → not committed
interaction_packets/ = curated packets + tables             → versioned in private repo
```

Private repo ≠ “commit session keys”. Secrets stay ignored even in `registre-mariani`.

## After a self-chat experiment

1. Technical proof stays under `runtime/agent-jhn-whatsapp/`.
2. If the experiment is worth institutional memory: one YAML packet under `interaction_packets/packets/YYYY/`.
3. No automatic dump of every message into git.
