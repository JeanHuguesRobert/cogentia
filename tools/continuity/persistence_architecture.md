---
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0"
---
# Persistence Architecture for Cogentia Continuity Tools

> GitHub as operational memory, but not as a conceptual dependency.  
> GitHub comme mémoire opérationnelle, mais non comme dépendance conceptuelle.

**Status:** concept note / architecture layer  
**Repository:** `JeanHuguesRobert/cogentia`  
**Parent note:** `tools/continuity/README.md`  
**Date:** 2026-05-29  
**License:** CC BY 4.0 for documentation; code license to be decided separately.

---

## 1. Purpose

The Cogentia continuity tools require a persistence layer.

In the current working practice, **GitHub acts as an operational memory**:

- documents are versioned;
- changes are attributable;
- histories are reviewable;
- branches and commits provide temporal structure;
- Markdown makes documents readable by humans and agents;
- issues, pull requests and discussions can support review;
- public repositories can serve as transparent corpora.

However, GitHub is not the essence of the architecture.

The general idea must remain valid with other persistence infrastructures, including private, local, institutional, distributed or encrypted systems.

Core distinction:

```text
Conceptual layer
  -> traceability, continuation, review, return to corpus

Persistence layer
  -> GitHub, GitLab, local Git, filesystem, database, vault, DMS, encrypted store, personal data pod
```

The architecture should therefore be **persistence-agnostic**.

---

## 2. GitHub as default operational memory

GitHub is currently valuable because it combines several useful properties:

```text
Git
  -> versioning, diffs, branches, commits

Markdown
  -> human-readable documents, AI-readable context, low friction

Repository structure
  -> stable paths, links, corpus organization

Public visibility
  -> transparency, review, reuse, forkability

Issues / PRs / Discussions
  -> interaction traces, objections, proposed changes, review loops
```

This makes GitHub an effective operational memory for open research and public doctrine.

In the Cogentia continuity tools, GitHub can play several roles:

- corpus storage;
- versioned archive of validated outputs;
- public demonstration layer;
- continuation target;
- review substrate;
- documentation platform;
- bridge between humans and AI agents.

Formula:

> GitHub is not merely a code forge. In this architecture, it is a versioned operational memory.

---

## 3. But GitHub must not be mandatory

The same architecture must be able to work with other persistence backends.

Possible backends:

| Backend | Typical use | Public? | Strength | Risk |
|---|---|---:|---|---|
| GitHub public repo | open corpus, public doctrine | yes | transparency, versioning | privacy exposure |
| GitHub private repo | controlled corpus | no / limited | Git workflow, access control | platform dependency |
| GitLab / Forgejo / Gitea | self-hosted or alternative Git forge | variable | sovereignty | admin burden |
| local Git repository | personal or offline archive | no | control, portability | weaker collaboration |
| encrypted filesystem | sensitive archive | no | confidentiality | harder review |
| SQLite / DuckDB | structured local index | no | fast search, low friction | less readable directly |
| document management system | institutional archive | variable | governance | capture / lock-in |
| personal data vault | private continuity | no / selective | user control | immature ecosystem |
| IPFS / distributed storage | resilient publication | variable | persistence | privacy and governance complexity |

The correct design is not:

```text
Cogentia continuity tools require GitHub.
```

It is:

```text
Cogentia continuity tools require a traceable persistence substrate.
GitHub is one practical implementation.
```

---

## 4. Minimal persistence contract

Any backend should satisfy a minimal contract.

### 4.1 Addressability

Each object should have a stable identifier:

```yaml
object_id: "interaction:2026-05-29-parliamentary-mail"
path: "interaction_packets/2026/05/..."
uri: "..."
```

### 4.2 Versioning

The system should preserve versions or at least a revision history:

```yaml
revision_id: "commit / hash / timestamp / version"
previous_revision: "..."
changed_at: "2026-05-29T10:00:00+02:00"
changed_by: "human / agent / tool"
```

### 4.3 Provenance

The system should record where an item came from:

```yaml
source:
  type: "email / portal / phone_note / document / continuation"
  channel: "gmail / yahoo-imap / github / manual"
  captured_by: "local tool / human / agent"
  captured_at: "..."
```

### 4.4 Integrity

The system should support integrity checks where needed:

```yaml
hash:
  algorithm: "sha256"
  value: "..."
```

### 4.5 Exportability

The object should be exportable in open or documented formats:

- Markdown;
- YAML;
- JSON;
- `.eml`;
- `.mbox`;
- `.pdf/A`;
- plain text;
- signed archive when necessary.

### 4.6 Access control

The system should distinguish:

```text
private archive
  -> sensitive source material

controlled dossier
  -> shareable with a mandated third party

semi-public note
  -> redacted, contextualized, reviewable

public corpus
  -> deliberately published material
```

### 4.7 Return to corpus

AI or human review should produce outputs that can be reintegrated into the persistence layer:

```text
source trace
  -> continuation packet
  -> AI / human analysis
  -> validation
  -> corpus integration
  -> possible correction
```

---

## 5. Persistence-agnostic object model

A continuity object should be independent from its storage backend.

Example:

```yaml
type: cogentia.continuity.object
version: 0.1
id: "interaction:2026-05-29-example"
status: "draft / validated / published / superseded"
visibility: "private / shared / public"
created_at: "2026-05-29T10:00:00+02:00"
updated_at: "2026-05-29T10:15:00+02:00"
created_by: "Jean Hugues Robert"
source:
  channel: "email"
  account: "gmail"
  local_ref: "gmail:message-id-or-local-id"
  evidence_level: "strong / medium / weak / index-only"
persistence:
  backend: "github / local-git / sqlite / encrypted-store"
  location: "tools/continuity/examples/..."
  revision: "commit-or-hash"
privacy:
  contains_personal_data: true
  redaction_status: "raw / redacted / public-safe"
  publication_allowed: false
continuation:
  packet_id: "..."
  next_action: "..."
  agent_review: "pending / completed / rejected"
```

The same object can be stored in GitHub, local Git, SQLite or an encrypted vault, provided the persistence contract is respected.

---

## 6. Privacy problem

The privacy problem is central and difficult.

Traceability can protect individuals against institutional opacity. But excessive or careless traceability can also expose:

- private correspondence;
- third-party personal data;
- family material;
- medical, legal, financial or administrative information;
- political opinions;
- sensitive metadata;
- social graphs;
- weak signals that become identifying when aggregated.

Therefore:

> Traceability must not become generalized exposure.

Or:

> The right to trace must be separated from the obligation to publish.

---

## 7. Privacy tiers

The architecture should distinguish several levels.

```text
Tier 0 — Raw private source
  complete original data, local or encrypted only

Tier 1 — Indexed private metadata
  headers, dates, subjects, local refs, limited search fields

Tier 2 — Controlled working packet
  selected excerpts, redacted by default, sent to an agent or reviewer

Tier 3 — Shareable dossier
  curated evidence, context, minimal personal data, legitimate recipient

Tier 4 — Public corpus
  redacted, contextualized, ethically publishable, versioned
```

The same underlying event may exist at several tiers.

Example:

```text
raw Yahoo email
  -> private IMAP archive
  -> indexed header in SQLite
  -> redacted continuation packet
  -> validated chronology fragment
  -> public historical note
```

---

## 8. Redaction as transformation, not deletion

Redaction should be treated as a documented transformation.

A redacted object should preserve a link to the raw object without exposing it.

Example:

```yaml
redaction:
  source_object_id: "email:yahoo:INBOX:12345"
  redacted_object_id: "packet:yahoo_origin_001:msg_01"
  redacted_fields:
    - third_party_email
    - phone_number
    - private_address
  reason: "public or AI-facing packet"
  reversible_by: "local owner only"
```

This enables review without pretending that the redacted packet is the whole truth.

---

## 9. Backend abstraction

A software implementation should separate:

```text
continuity logic
  -> objects, packets, provenance, redaction, review, continuation

storage adapters
  -> GitHub, local Git, SQLite, filesystem, encrypted vault, DMS
```

Possible interface:

```python
class PersistenceBackend:
    def put_object(self, obj): ...
    def get_object(self, object_id): ...
    def list_versions(self, object_id): ...
    def diff(self, object_id, rev_a, rev_b): ...
    def export(self, object_id, format): ...
    def set_visibility(self, object_id, visibility): ...
```

GitHub would then be only one adapter:

```text
PersistenceBackend
  -> GitHubBackend
  -> LocalGitBackend
  -> SQLiteBackend
  -> EncryptedFilesystemBackend
  -> DMSBackend
```

---

## 10. Relation to GitHub

For the current corpus, GitHub remains the default because it is immediately useful and already integrated into the working method.

But the architecture should consistently avoid GitHub-specific assumptions such as:

- every object has a public URL;
- every revision is a Git commit;
- every reader can access the repository;
- every trace can be safely stored in Markdown;
- every corpus should be public;
- every contribution should be a pull request.

Better abstraction:

```text
public GitHub corpus
  = one publication and review layer
  != the whole continuity system
```

---

## 11. Operational memory

An operational memory is not just storage.

It must support:

- recalling;
- comparing;
- proving;
- correcting;
- continuing;
- transmitting;
- delegating;
- reviewing;
- publishing when appropriate.

GitHub currently provides many of these properties for public work.

But a private encrypted archive, a local Git repository, or a structured database may provide them better for sensitive material.

The continuity architecture should therefore permit a layered model:

```text
raw private memory
  -> local / encrypted / controlled

working memory
  -> local Git / SQLite / private repo

public memory
  -> GitHub / website / publication / public corpus
```

---

## 12. Connection with AI agents

AI agents should interact with the persistence layer through controlled packets, not through unrestricted access.

Preferred flow:

```text
private persistence
  -> selection
  -> redaction
  -> continuation packet
  -> AI analysis
  -> human validation
  -> persistence update
  -> optional public publication
```

The agent receives context, not sovereignty.

Formula:

> The agent should continue the work, not capture the archive.

---

## 13. Publication principle

Not every trace should be public.

The architecture should help decide what belongs where:

| Level | Purpose | Example |
|---|---|---|
| Private | preserve source truth | raw mailbox, legal documents |
| Controlled | enable assistance | lawyer packet, agent continuation |
| Semi-public | document a process | redacted chronology, audit note |
| Public | contribute to corpus | doctrine, methods, examples, non-sensitive cases |

Public GitHub should host:

- concepts;
- schemas;
- examples;
- redacted cases;
- validated public notes;
- open-source code.

It should not host raw private archives.

---

## 14. Design rule

The continuity system should be designed around a strict rule:

> Publish the method by default. Publish the data only by deliberate, reviewed exception.

French version:

> Publier la méthode par défaut. Publier les données seulement par exception délibérée et revue.

---

## 15. Continuation

Next work:

1. define the generic continuity object schema;
2. define privacy tiers formally;
3. specify a GitHub backend;
4. specify a local filesystem / SQLite backend;
5. specify an encrypted vault backend;
6. define redaction metadata;
7. connect this note with `mailarch.md`, `interaction_tracker.md` and `privacy_model.md`;
8. produce examples where the same object is represented in private, controlled and public forms.

---

## 16. Closing formula

GitHub is an excellent operational memory for public corpus work.

But Cogentia continuity must remain more general:

> not GitHub-centered, but traceability-centered;  
> not publication-centered, but capacity-centered;  
> not archive-centered, but continuation-centered.
