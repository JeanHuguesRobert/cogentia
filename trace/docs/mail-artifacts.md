---
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "operational-note"
classification_confidence: "medium"
title: "Cogentia Trace — Mail artifacts and private registry"
author: "Jean Hugues Noël Robert, baron Mariani"
date: "2026-07-27"
status: "draft"
document_role: "operational"
document_kind: "operational-note"
visibility: "public"
lifecycle_state: "working"
provenance:
  origin_type: "conversation-checkpoint"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_ref: "Gmail and Twin JHN bidirectional channel"
  origin_date: "2026-07-27"
  derived_from:
    - "trace/schemas/event.schema.json"
    - "FractaVolta/research/fractalog.md"
review:
  status: "unreviewed"
  reviewed_by: []
update_policy: "UP-DEFAULT-REVIEWED"
---

# Cogentia Trace — Mail artifacts and private registry

## Object

This note defines two trace artifacts:

```text
email_received
email_sent
```

Their public schema is
[`../schemas/mail-artifact.schema.json`](../schemas/mail-artifact.schema.json).
The schema contains no message body and no secret.

The conceptual convergence between actor mailboxes, governed agent mailboxes
and email-carried Cognitive Packets is preserved in
[`../../research/mailboxes_at_two_scales.md`](../../research/mailboxes_at_two_scales.md).

## Identity model

Three identifiers must not be confused:

| Identifier | Meaning | Reliability |
|---|---|---|
| `message_id` | Sender-provided RFC 5322 correlation header | Useful, but neither unique nor trusted |
| `artifact_id` | SHA-256 content address of the exact preserved message bytes | Stable while those bytes are preserved |
| `occurrence_id` | One observed receive or send occurrence | Stable reference to the registered event |

The raw bytes are authoritative for `artifact_id`. No newline conversion,
decoding, MIME rewriting or header normalization may occur before hashing.

An `email_sent` occurrence proves only the transport stage recorded in
`transport.stage`. Submission acceptance, relay attempt and remote SMTP
acceptance are different assertions. None proves human reading.

An `email_received` occurrence similarly distinguishes SMTP acceptance from
mailbox storage.

## Registry placement

The canonical occurrence registry must remain private and outside Git:

```text
/var/lib/cogentia/state/mail/
├── registry/
│   └── events.jsonl
├── artifacts/
│   └── sha256/
│       └── ab/
│           └── abcdef...0123.eml
└── checkpoints/
    └── roots.jsonl
```

- `events.jsonl` is append-only and contains schema-valid occurrence records.
- `artifacts/sha256/` is a content-addressed store for exact RFC 5322 bytes.
- `checkpoints/roots.jsonl` records periodic hash-chain or Merkle checkpoints.
- permissions must restrict all three paths to the Twin mail trace service and
  the human operator;
- raw messages and addressing metadata are private by default.

Stalwart remains the mail transport and mailbox authority. Its database, queue
and logs are evidence sources, not the sole durable trace registry.

Git contains only:

- this policy;
- the public JSON Schema;
- fictive, non-personal examples;
- code that can rebuild projections.

## Derived index

A searchable index may be built at:

```text
/var/lib/cogentia/cache/mail-index.sqlite
```

That database is reconstructible and is not an authority. It may contain
redacted or minimized projections rather than raw message bodies.

## Durability

The private registry needs:

1. append-only writes with one writer or atomic serialization;
2. a hash link from each entry to the preceding entry;
3. regular sealed checkpoints;
4. encrypted off-box backup of both registry and raw artifacts;
5. restore verification that recomputes artifact hashes and the entry chain;
6. corrections as new entries, never silent edits.

A future FractaLog profile may replace the simple JSONL chain without changing
the mail-artifact schema.

## Privacy and retention

Hashing does not anonymize an email. Addresses, subjects, headers and message
content remain personal data.

The retention policy must therefore distinguish:

- raw message retention;
- addressing and transport metadata retention;
- mandate evidence retention;
- cryptographic checkpoint retention.

A deletion or redaction must itself be traced. The policy may destroy private
content when required while retaining a non-reversible integrity checkpoint
and the authorized destruction event.

## Minimal reference

A decision or action may reference an occurrence without copying the email:

```text
source: urn:cogentia:mail-occurrence:...
message: urn:cogentia:mail:sha256:...
mandate: mandat-...
```

The reference is meaningful only if the private registry can later resolve it
for an authorized auditor.
