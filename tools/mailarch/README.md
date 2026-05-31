# mailarch — Local IMAP Archive Explorer

## Status

MVP specification — local-first companion tool for Cogentia continuity workflows.

Related issue: #11 — MVP mailarch — exploration IMAP locale pour archives Yahoo pré-Gmail.

---

## Object

`mailarch` is a local IMAP exploration tool designed to recover, index, select and export controlled email traces without giving an AI agent direct access to a mailbox.

The first use case is the reconstruction of pre-Gmail or parallel Yahoo Mail archives relevant to the history of C.O.R.S.I.C.A., Institut Mariani, Virteal, SimpliWiki, Minesteggio, Casa Mariani and related early projects.

---

## Core principle

`mailarch` must preserve sovereignty over private data.

```text
local IMAP tool
→ local controlled index
→ explicit human query / selection
→ limited extraction
→ redaction / minimisation
→ Markdown/YAML packet
→ AI agent analysis
→ human validation
→ corpus reintegration
```

Formula:

> The local tool keeps sovereignty over the data; the agent receives a controlled continuation.

---

## Non-goals for v0

- no graphical interface;
- no cloud storage;
- no integrated AI analysis;
- no bulk export by default;
- no email modification;
- no email deletion;
- no email sending;
- no full-body indexing unless explicitly requested;
- no automatic publication of extracted material.

---

## MVP commands

```bash
mailarch init --account yahoo
mailarch folders
mailarch index --headers-only --before 2006-08-11
mailarch search --keywords "C.O.R.S.I.C.A,Institut Mariani,Minesteggio,Casa Mariani,Virteal,SimpliWiki"
mailarch fetch --result-set <id> --limit 20
mailarch packet --result-set <id> --redact
```

### `mailarch init --account yahoo`

Creates a local configuration skeleton.

Expected local files:

```text
.mailarch/config.json      # ignored by git; contains account alias and IMAP settings
.mailarch/index.sqlite     # local index
.mailarch/raw/             # raw .eml files, local only
.mailarch/packets/         # generated packets, reviewed before commit
```

Credentials must never be committed.

### `mailarch folders`

Lists IMAP folders for the configured account.

Read-only.

### `mailarch index --headers-only`

Indexes message metadata only.

Default indexed fields:

```yaml
message_id: string
folder: string
uid: string
internal_date: date
from: string
to: string
cc: string
subject: string
date_header: string
has_attachments: boolean
size: integer
body_indexed: false
body_fetched: false
hash_headers: string
```

The body is not fetched by default.

### `mailarch search`

Searches the local metadata index.

Example:

```bash
mailarch search --keywords "C.O.R.S.I.C.A,Institut Mariani,Minesteggio"
```

The command should produce a result-set id that can be reused by `fetch` and `packet`.

### `mailarch fetch`

Explicitly fetches selected messages.

Examples:

```bash
mailarch fetch --uid <uid> --folder <folder>
mailarch fetch --result-set <id> --limit 20
```

The output should be local `.eml` files with hashes.

### `mailarch packet`

Produces a controlled Markdown/YAML packet from a result set.

Default is redacted.

```bash
mailarch packet --result-set <id> --redact
```

---

## Packet format

Target packet type:

```yaml
type: cogentia.mailarch_packet.v1
account_alias: yahoo
source: imap
selection:
  query: ""
  folders: []
  date_range:
    before: 2006-08-11
messages:
  - uid: ""
    folder: ""
    subject: ""
    from: ""
    date: ""
    message_id: ""
    body_status: redacted|excerpted|full-local-only
    eml_hash: ""
privacy:
  redaction: true
  third_parties_present: true
  publishable: false
agent_task: "Analyse these controlled traces for chronology and corpus reintegration. Do not infer beyond the extracted evidence."
```

Markdown body:

```markdown
## Selection summary

## Retained messages

## Possible chronology points

## Open questions

## Risks of over-interpretation

## Next continuation
```

---

## Privacy and safety rules

Strong defaults:

- credentials stay outside git;
- `.mailarch/config.json` is ignored by git;
- `.mailarch/raw/` is ignored by git;
- raw `.eml` files are local-only by default;
- packets are redacted by default;
- packets are not committed without human review;
- no public export without explicit review;
- third parties are protected by redaction;
- hashes preserve local traceability without publishing raw content.

Recommended `.gitignore` entries:

```gitignore
.mailarch/config.json
.mailarch/raw/
.mailarch/index.sqlite
.mailarch/*.sqlite
```

---

## Suggested implementation strategy

### Language

The MVP baseline is **Node.js**, aligned with `cogentia.js`.

The code should be **ESM-compatible by default**:

```text
package.json: "type": "module"
entrypoint: tools/mailarch/mailarch.js
imports: import ... from ...
no CommonJS-specific design unless explicitly justified
```

Python is no longer the preferred MVP path. It remains acceptable only as a throwaway diagnostic helper, not as the reference implementation.

### Deno compatibility posture

Deno should not drive the MVP, but it must remain visible as a future portability target.

Design rules:

- prefer standard Web / Node-compatible APIs where practical;
- isolate Node-specific filesystem, process and TLS/IMAP details behind small adapter functions;
- avoid global mutable state tied to Node internals;
- keep packet generation pure and runtime-agnostic;
- keep command parsing simple enough to port;
- do not depend on a framework that would make Deno portability structurally difficult.

Doctrinal rule:

> Node.js is the MVP runtime. ESM is the module discipline. Deno remains a portability horizon.

### Dependencies

`cogentia.js` is zero-dependency; `mailarch` may need a minimal IMAP dependency because IMAP is not available in the Node standard library.

Dependency discipline:

- keep dependencies minimal;
- prefer mature, small, maintained libraries;
- isolate third-party IMAP access behind `imap_client.js` or equivalent;
- keep packet formatting, redaction, hashing, search result shaping and CLI orchestration dependency-light;
- document any dependency as replaceable.

If SQLite, Postgres or Supabase requires a dependency, keep the persistence layer swappable:

```text
storage_adapter.js      # common interface
storage_sqlite.js       # local-first MVP backend
storage_ndjson.js       # fallback / test backend
storage_postgres.js     # server / Supabase-compatible backend
storage_supabase.js     # optional Supabase client adapter, if justified
```

### Plural persistence doctrine

`mailarch` is one component in a broader Cogentia persistence ecology.

The system should not have one sacred database. It should allow several persistence regimes, because each regime carries a different style of work, traceability, cost, privacy posture and proof.

```text
GitHub / Git        → public corpus, commits, issues, reviewable history
Email / IMAP        → inherited private memory, chronological traces, raw correspondence
SQLite              → local private indexing and repeatable offline exploration
NDJSON              → minimal fallback, audit-friendly append/read format
Postgres            → structured shared private workspace
Supabase            → Postgres + auth/API/realtime for Netlify/cloud workflows
RAG / vector store  → retrieval layer for semantic navigation, not source of truth
Markdown/YAML       → human-readable packets and corpus artefacts
```

Principle:

> There Is More Than One Way — and the style of persistence shapes the style of thought.

Buffon's formula can be repurposed technically:

> Le style, c'est l'homme — and in software, persistence style is part of the epistemic style of the system.

This plurality is not accidental complexity. It is a resilience and interpretation feature: different persistence layers make different questions possible.

### Persistence adapters

Persistence must be adapter-based. The tool should not confuse the packet model with one storage backend.

Common adapter interface, conceptually:

```js
await storage.init();
await storage.saveMessageHeader(header);
await storage.searchMessages(query);
await storage.saveResultSet(resultSet);
await storage.loadResultSet(id);
await storage.savePacket(packet);
```

Recommended posture:

```text
Local private exploration        → SQLite or NDJSON
Repeatable local archive work    → SQLite
Shared private workspace         → Postgres
Netlify / web-facing workflow    → Supabase / Postgres
Semantic retrieval               → RAG / vector store fed by reviewed packets or indexes
Public corpus publication        → Git + Markdown packets only after review
```

Supabase/Postgres is a natural future target because the broader working style often uses Supabase with Netlify, notably in Inseme-style cloud workflows. It should therefore be anticipated architecturally, but not forced into the local MVP.

RAG is also part of the broader ecosystem, already used in Inseme. In this context, it must be treated as a retrieval projection, not as the canonical archive. The canonical chain remains traceable:

```text
raw source
→ controlled index
→ packet
→ reviewed corpus artefact
→ retrieval projection
```

The key separation is:

```text
IMAP extraction
≠ persistence backend
≠ packet generation
≠ corpus publication
≠ semantic retrieval
```

The first MVP may use SQLite. A later adapter may project the same records into Supabase/Postgres for a Netlify-based dashboard, review queue, or collaborative archive interface. A RAG layer may then index reviewed packets or selected metadata, not uncontrolled private mailboxes.

### Storage

Preferred MVP storage:

```text
SQLite index + local .eml raw store + Markdown/YAML packets
```

Fallback:

```text
NDJSON index + local .eml raw store
```

Future persistence:

```text
Postgres / Supabase adapter for shared review, Netlify workflows, dashboards, or multi-user private archives
RAG / vector-store projection for semantic navigation over reviewed packets and selected metadata
```

SQLite is preferred for the first local MVP because repeated searches over old archives will become common and because it keeps private exploration offline by default.

### Auth

Use local configuration and environment variables.

No credentials in command history when avoidable.

Possible pattern:

```bash
MAILARCH_YAHOO_USER="..."
MAILARCH_YAHOO_APP_PASSWORD="..."
mailarch folders --account yahoo
```

For Yahoo Mail, an app password may be required depending on account security settings.

---

## Relationship to Cogentia

`mailarch` is not an AI agent.

It is a local sovereignty-preserving extractor that emits packets compatible with Cogentia workflows.

Possible future integration:

```bash
node scripts/cogentia.js mailarch packet <packet-id>
```

For the MVP, it can remain a companion tool under:

```text
tools/mailarch/
```

If the tool grows, it can later be extracted into a separate repository.

---

## First operational use case

Goal: recover documentary traces before or around the earliest Gmail archive boundary.

Initial search terms:

```text
C.O.R.S.I.C.A.
CORSICA
Institut Mariani
Minesteggio
Casa Mariani
Virteal
SimpliWiki
Simpli
wiki
Jean Hugues Robert
Mariani
Corte
```

Initial date focus:

```text
before 2006-08-11
```

The first useful output is not a public archive. It is a controlled chronology packet for human review.

---

## Closure criteria for issue #11

Issue #11 can be closed when:

- this README exists;
- a minimal Node.js ESM CLI skeleton exists or a coding-agent-ready specification exists;
- local privacy rules are documented;
- the commands `folders`, `index --headers-only`, `search`, `fetch`, `packet` are specified;
- an example `cogentia.mailarch_packet.v1` packet is provided;
- the relationship with `cogentia.js` is clarified;
- the Deno compatibility posture is documented;
- the persistence-adapter posture is documented, including SQLite, NDJSON, Postgres, Supabase and RAG.

This README satisfies the specification part. The remaining practical step is the CLI skeleton.
