# Cogentia Continuity Tools

> Local tools for tracing interactions, reconstructing archives, and producing AI continuation packets.  
> Outils locaux pour tracer les interactions, reconstruire les archives et produire des paquets de continuation pour agents IA.

**Status:** concept note / MVP architecture  
**Repository:** `JeanHuguesRobert/cogentia`  
**Date:** 2026-05-29  
**License:** CC BY 4.0 for documentation; code license to be decided separately.

---

## 1. Purpose

The **Cogentia Continuity Tools** are a proposed set of local, open, auditable tools designed to preserve and reconstruct documentary continuity across time.

They address three temporal layers:

```text
past documented
  -> archive reconstruction, old emails, historical traces, evidence of precedence

present traceable
  -> interaction tracking, replies, silences, follow-ups, institutional copies

future continuable
  -> continuation packets, next actions, review loops, versioned corpus
```

The common idea is **traceability**.

These tools are not merely about storing documents. They are about preserving the conditions under which actions, relations, decisions, silences and responsibilities remain understandable, reviewable, contestable and continuable.

---

## 2. Conceptual background

This note is grounded in several documents and concepts from the Cogentia / Institut Mariani corpus:

- **Symmetric traceability** — `JeanHuguesRobert/cogentia/research/tracabilite_symetrique_capture_relationnelle.md`
- **Interaction Packets** — structured documentary units for requests, answers, silences, relances, refusals, corrections and evidence.
- **Autonomie de Capacité** — a theoretical right has little value if one lacks the practical capacity to exercise, document, transmit and defend it.
- **Documents autoporteurs** — documents should be understandable and evaluable without depending entirely on a portal, account or private memory.
- **Cogentia** — cognitive continuity requires documentary and evidentiary continuity.
- **Procedural stabilization** — as developed in `JeanHuguesRobert/barons-Mariani/research/ubik_reality_dislocation_academic.md`.

Core chain:

```text
Autonomie de Capacité
    requires
Traceability of acts
    requires
Open or exportable channels
    enable
Interaction Packets
    feed
Versioned living corpus
    enables
Cogentia / cognitive continuity
    supports
Direct democracy, anti-capture and institutional accountability
```

---

## 3. The core problem: continuity under capture

Modern interactions increasingly take place through proprietary portals, internal messaging systems, tickets, apps, chatbots and `no-reply` addresses.

These tools may be justified by security, spam control, authentication, workflow management or confidentiality. But when they fail to provide an equivalent or superior trace, they create a structural asymmetry.

The party controlling the channel may also control:

- the trace;
- the status;
- the pace;
- the history;
- the proof;
- the possibility of reply;
- the possibility of external review.

This is the problem identified as **capture relationnelle par architecture de canal**.

Formula:

> Filtering, yes. Capturing, no.

Or, in French:

> Filtrer, oui. Capturer, non.

---

## 4. Principle: symmetric traceability

The continuity tools implement the principle of **symmetric traceability**.

They do not treat email archives and interaction logs as passive memory, but as procedural conditions for capacity, contestation, review and continuation.

A trace should be:

- complete enough;
- dated;
- exportable;
- intelligible;
- verifiable;
- locally conservable;
- transmissible to a legitimate third party;
- usable for follow-up, mediation, appeal, audit or litigation.

Operational rule:

```text
No capacity without trace.
No contestation without opposable memory.
No continuation without exportable context.
```

French version:

```text
Pas de capacité sans trace.
Pas de contestation sans mémoire opposable.
Pas de continuation sans contexte exportable.
```

---

## 5. Two complementary tools

### 5.1 Interaction tracker

The interaction tracker documents present and future relations.

Its role is to track:

- requests;
- replies;
- silences;
- relances;
- copies;
- refusals;
- corrections;
- status changes;
- next actions;
- relevant third parties.

It produces **Interaction Packets** suitable for human review, institutional transmission, public transparency or AI-assisted continuation.

### 5.2 Mailarch / IMAP continuation agent

`mailarch` is a proposed local IMAP archival explorer.

Its role is to reconstruct past relations from existing mailboxes without giving an AI agent direct access to the mailbox.

It should:

- connect locally to any IMAP-compatible mailbox;
- index headers first;
- search by period, keyword, address, folder and thread;
- fetch message bodies only when explicitly requested;
- redact sensitive data by default;
- produce continuation packets for AI agents;
- reintegrate validated results into a versioned corpus.

It is not a Yahoo-specific tool. Yahoo Mail is only one possible provider.

Potential providers:

- Yahoo Mail;
- Gmail;
- Outlook / Microsoft 365;
- iCloud Mail;
- Gandi;
- OVH;
- Infomaniak;
- self-hosted or associative IMAP servers.

---

## 6. Inversion of control by continuation

The key design principle is **inversion of control by continuation**.

The AI agent should not control the mailbox.

Instead:

```text
local deterministic tool
  -> selects, redacts and packages context
  -> sends a continuation packet to an AI agent
  -> receives a structured analysis
  -> reintegrates the validated result into the corpus
```

Bad model:

```text
AI agent -> full mailbox access -> opaque analysis
```

Good model:

```text
local tool -> controlled packet -> AI continuation -> human validation -> corpus
```

This preserves:

- local control;
- privacy;
- verifiability;
- reproducibility;
- human judgment;
- multi-agent comparison;
- return to corpus.

---

## 7. Continuation packet format

A continuation packet may be written in Markdown with YAML front matter.

Example:

```markdown
---
type: cogentia.mail.continuation
id: yahoo_origin_001
created_at: 2026-05-29
source_account: yahoo
scope: headers_plus_selected_excerpts
privacy: redacted
objective: reconstruct_pre_gmail_history
---

# Continuation — Yahoo origins 001

## Objective

Reconstruct traces before 2006-08-11 concerning:

- C.O.R.S.I.C.A.
- Minesteggio
- Casa Mariani
- scout hospitality
- wiki / metawiki
- Virteal
- Baron Mariani

## Candidate messages

### Message 1

- Date:
- Subject:
- From:
- To:
- Folder:
- Local reference:
- Excerpt:

## Question for the agent

Do these messages establish a documentary continuity prior to Gmail?

Answer by distinguishing:

1. certain trace;
2. indirect trace;
3. cautious interpretation;
4. possible integration into the corpus.
```

---

## 8. Minimal Interaction Packet

```yaml
interaction_id: "YYYY-MM-DD-XXX"
date: "YYYY-MM-DD"
organism: "..."
channel: "portal / email / phone / desk / app"
subject: "..."
request_summary: "..."
evidence:
  - "copy saved"
  - "screenshot"
  - "acknowledgement"
  - "email thread"
status: "pending / answered / silent / refused / corrected"
next_action: "..."
interpretation_level: "fact / hypothesis / analysis / public claim"
```

This packet should be simple enough for everyday use, but structured enough to be reviewed by:

- a human;
- an association;
- a lawyer;
- a journalist;
- an elected representative;
- an auditor;
- an AI agent acting under mandate.

---

## 9. Proposed repository structure

```text
tools/
  continuity/
    README.md
    interaction_tracker.md
    mailarch.md
    continuation_packets.md
    privacy_model.md
    examples/
      interaction_packet.example.yaml
      mail_continuation.example.md
      ai_response.example.md
```

Future code may live under:

```text
tools/
  continuity/
    mailarch/
      src/
      tests/
      README.md
```

or, if the tool becomes mature enough, in a dedicated repository:

```text
JeanHuguesRobert/cogentia-mailarch
```

For now, `JeanHuguesRobert/cogentia` is the right home, because the tool is not merely technical. It is an operational expression of Cogentia.

---

## 10. MVP scope for `mailarch`

The first MVP should do very little, but do it cleanly:

1. configure one IMAP account;
2. list folders;
3. index headers only;
4. store metadata in SQLite;
5. search locally;
6. fetch selected messages only;
7. redact by default;
8. build Markdown/YAML continuation packets;
9. allow manual reintegration of AI responses.

Suggested CLI:

```bash
mailarch init --account yahoo
mailarch folders
mailarch index --headers-only
mailarch stats
mailarch search --before 2006-08-11 --keywords "Minesteggio,Casa Mariani,wiki,Virteal,C.O.R.S.I.C.A"
mailarch fetch --result-set yahoo_origin_001 --bodies
mailarch packet --result-set yahoo_origin_001 --format continuation --redact
mailarch integrate --response responses/yahoo_origin_001.md
```

---

## 11. Privacy model

Default rules:

### Keep

- dates;
- subjects;
- public institutional names;
- public domains;
- user-owned addresses when intentionally disclosed;
- short relevant excerpts;
- documentary categories.

### Redact by default

- third-party private email addresses;
- phone numbers;
- private postal addresses;
- banking details;
- passwords;
- tokens;
- private URLs;
- family-sensitive material;
- irrelevant personal details;
- full attachments unless explicitly selected.

Principle:

> The AI receives only the minimum context required to continue the reasoning.

---

## 12. Relation to procedural stabilization

The continuity tools are an operational implementation of procedural stabilization.

They address the **Ubik effect** at the level of documentary life: emails, interactions, archives, decisions, reminders, silences, continuations and source corpora.

Their purpose is not to replace judgment with automation, but to preserve the conditions under which judgment remains possible:

- provenance;
- traceability;
- versioning;
- review;
- correction;
- return to corpus.

In this sense:

```text
Ubik gives the diagnosis.
Symmetric traceability gives the normative criterion.
Cogentia continuity tools provide the operational layer.
```

---

## 13. Demonstrator use case

The first demonstrator may be:

> Reconstructing the latent history of the Institut Mariani from old mail archives.

This use case involves:

- Yahoo Mail archives before Gmail;
- Gmail traces from 2006 onward;
- Minesteggio / Casa Mariani;
- scout hospitality;
- wiki / metawiki;
- Virteal;
- SimpliWiki;
- C.O.R.S.I.C.A.;
- later Institut Mariani structuration.

However, this should remain a demonstrator, not the only purpose of the tool.

The generic purpose is broader:

> help individuals and collectives reconstruct, preserve and continue their documentary life without surrendering it to proprietary systems or opaque agents.

---

## 14. Development continuation

Next steps:

1. create `mailarch.md` with a technical MVP specification;
2. create `interaction_tracker.md` with the present/future interaction model;
3. create `continuation_packets.md` with packet schemas;
4. create `privacy_model.md`;
5. add examples;
6. decide code language and license;
7. implement a minimal local Python CLI;
8. test first on a non-sensitive mailbox or small exported subset;
9. only then connect to Yahoo Mail via IMAP.

---

## 15. Closing formula

A relation is not traceable merely because someone stores logs somewhere.

It is traceable when the party who needs to act, contest, remember, transmit or continue has access to a usable, portable and intelligible trace.

The goal of the continuity tools is therefore simple:

> transform dispersed interactions into opposable memory, and opposable memory into continuable capacity.
