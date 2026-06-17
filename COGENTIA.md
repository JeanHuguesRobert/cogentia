---
title: "Cogentia"
description: "Knowledge production under AI conditions, in five distinctive moves"
layout: default
nav_order: 0
last_modified_at: 2026-06-09
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0"
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/COGENTIA.md
last_stamped_at: 2026-06-01
date: "2026-05-13"
status: "published identity document — v2 CLI consolidation"
---

# Cogentia
<!-- BEGIN_AUTO: trails -->
> 🧭 **Trail: From Method to Machine**
> ⬅️ Previous: [Pipeline](research/pipeline.md) | ➡️ Next: [Democratic AI Safety](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/democratic_ai_safety.md)
<!-- END_AUTO: trails -->
## Orientation

Statut : document source d'identité pour Cogentia.

Fonction dans le corpus : expliquer ce qu'est Cogentia comme protocole, CLI, brique logicielle et méthode publique de production de connaissance.

À lire avant : [Carte globale du Corpus](https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/research/corpus-map.md) et [Discours de la seconde méthode](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md).

À lire après : [The Cogentia Commons Living Corpus](research/cogentia_commons_living_corpus.md), [Agent-Resumable CLI](research/agent_resumable_cli.md), [Cognitive Packets](research/cognitive_packets.md).

Dépend de : la seconde méthode, le principe que le corpus est sa propre preuve, et l'exigence de décisions humaines traçables.

Continuation : maintenir ce document comme point d'identité stable pendant que `scripts/cogentia.js`, les continuations et les produits dérivés évoluent.

Dernière consolidation : 2026-06-09 — ajout de la fiche d'orientation.

> *Cogito ergo sum.*
> *Cogentia ergo scimus.*

---

Cogentia is a framework for **distributed knowledge production under AI conditions**.

Not a product. Not a SaaS. Not a vendor.
A *protocol* + an *operational CLI* + a *brique inside the inseme platform* + a *spec set published in the open* — four surfaces of one commitment.

The commitment, in five distinctive moves:

---

## 1. The corpus is its own evidence

*Rule 4 of the [second method](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md).*

Cogentia does not claim the method works. It runs the method on its own published corpus, in public, with every commit timestamped and every objection recorded. The corpus is the demonstration. The git history is the proof.

In operation, the current `scripts/cogentia.js` v2 surface lets agents query and inspect documents, detect index gaps, plan/apply/verify generated corpus views, packetize GitHub issues, and check git drift. Earlier command names such as `scan` and `corpus-status` are part of the tool's design history; the current stable entry points are `docs`, `corpus`, `state`, `issues`, `git`, and `continuation`. This document is itself in the corpus it describes — fork it, object to it, propose a Revision: the protocol applies to itself before it applies to anyone else.

GitHub Issues serve as the Commons’ procedural memory in tension: they record objections, continuations, missing sources and proposed transformations before these are ready to become commits. They do not replace the corpus; they protect unfinished work from disappearing before it can be reviewed, transformed or deliberately rejected.

→ [`research/cogentia_commons_mvp_spec.md`](research/cogentia_commons_mvp_spec.md) §11 acceptance test; [`research/corpus-status.md`](research/corpus-status.md) for the live view.

---

## 2. Permissive action, accountable record

*The architectural disposition of the Commons.*

Any modification is **almost always authorized** — because it is (a) reversible, (b) traced in a signed Event log, and (c) attributable to a specific human actor who bears the consequences of its abuse.

Where most systems filter at entry, Cogentia opens the door and watches the floor. Four rungs of accountability (informational tag → contribution Mark → cooldown → temporary ban) replace precondition gates. The deterrent is reversal cost, not gatekeeping. Permanent exclusion is not a v1 mechanism — a system designed for unwelcome objections cannot afford an irreversible-exclusion primitive.

→ [`research/cogentia_commons_mvp_spec.md`](research/cogentia_commons_mvp_spec.md) §1.1, §4.5.

---

## 3. Skin in the game, at the action layer

*A precise distinction, not a generic appeal.*

The second method rejects skin-in-the-game as a *governance* boundary — it would exclude the stateless, the destitute, the dying. Political equality is *mortality under governance*, not *stake in outcome*. That refusal applies at DHITL Layer 3.

Within Layer 4 (cognitive infrastructure, where Cogentia lives), skin-in-the-game is appropriate and adopted: every action is signed; every signature is the actor staking their reputation. Recursive: a moderator who issues a frivolous ban signs the ban; their issuance carries reputational cost too. Accountability is symmetric — it does not flow only downward.

→ [`marenostrum/DHITL.md`](https://github.com/JeanHuguesRobert/marenostrum/blob/main/DHITL.md) for the five-layer scheme; [`research/cogentia_commons_mvp_spec.md`](research/cogentia_commons_mvp_spec.md) §1.1 for the carve-out.

---

## 4. Provider-neutral Continuation

*A typed protocol object, not a prompt.*

A Continuation in Cogentia is the explicit object created when deterministic tooling reaches a judgment boundary. The fuller `cogentia.continuation.v1` research pattern carried `task`, `context`, `alternatives`, `expected_result_schema`, constraints, resume metadata, and failed-branch history. The current `scripts/cogentia.js` v2 object is deliberately smaller: `id`, `status`, `kind`, `title`, `question`, `subject`, `context`, `expected_response`, `resume`, and resolution/history metadata. The invariant is unchanged: the tool exposes missing judgment instead of hiding it inside an embedded provider.

The soundness test is binding:

> *Can Claude be replaced by a human, or by another AI agent, or by a shell script, without modifying `cogentia.js`?*
>
> *If yes, the protocol is sound. If no, the protocol is contaminated.*

No vendor-typed fields. Agents are replaceable; the reasoning trace is not.

Consolidation note, 2026-06-09: the identity claim is stable, but the operational CLI has been narrowed since the earlier v0.10/v1 documentation. Treat current behavior as the v2 CLI plus open continuation paths, not as the whole historical command surface.

→ [`scripts/cogentia.js continuation ...`](scripts/cogentia.js); [`inseme/packages/cop-core/Architecture.md`](https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/Architecture.md) §2.7 (COP inheritance).

---

## 5. Admit and flag, don't silence

*Burton conversion (Rule 2), applied as invitation, not as gate.*

An objection that reads as a feeling of certainty — *"this seems unrealistic," "this is too ambitious"* — is **admitted to the record** with a permanent `un-falsifiable` Mark, attributed to its author. In parallel, the platform asks the canonical question: *what would settle this?* — *what calculation, citation, prediction, or measurement?* If the author converts, the converted form enters the record alongside the original. If they do not, both remain visible.

Feelings are not silenced. Claims are not erased. What changes is the *distinction* between them.

→ [`research/cogentia_commons_substantive_plugins.md`](research/cogentia_commons_substantive_plugins.md) §1 (the `falsifiability_conversion` plugin); [`research/cogentia_commons_mvp_spec.md`](research/cogentia_commons_mvp_spec.md) §7 step 4.

---

## What Cogentia is NOT

- **Not a product.** It is a protocol, a CLI, a brique, and a spec set — published in the open under CC BY-SA 4.0 / MIT.
- **Not provider-locked.** Move 4's replaceability test is binding. No vendor-typed fields anywhere in the data model.
- **Not anti-AI.** Artificial agents participate in knowledge. Living persons alone govern. (*Cogentia ergo scimus* — the corpus, human and artificial, proves knowledge to anyone who looks; governed, always, by the living alone.)
- **Not consensus-driven.** An unrefuted objection is a discovery. A refuted objection advances understanding. Neither is wasted, neither requires majority agreement.
- **Not erasure-based.** No permanent exclusion of persons. No overwriting of contributions. Reversal happens by appending — by *Revision* with `responds_to` edges — not by deletion. The git history is the audit; the audit is the record.

---

## The recursive closure

Cogentia Commons accepts every objection as a first-class contribution.
Therefore objections to Cogentia itself — including objections to these five moves — are first-class contributions.
Therefore the framework's faith commitment is structurally falsifiable in the only way a normative axiom can be: **by collective democratic challenge.**

This is *tighter* than the [`second_method.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md)'s admission of a "circular guarantee." It converts the circle into a feedback loop.

The framework exists to be argued against, in the form it itself defined.

---

> *Knowledge by contestation, not by consensus.*
> *Accountability by attribution, not by gatekeeping.*
> *Continuation by replaceable agents, signed by living humans.*
>
> *Cogentia ergo scimus.*

---

*Premier commit : 2026-05-13 — Corte. Jour ordinaire.*
*Fork. Object in falsifiable form. Propose Revisions. The protocol applies to itself first.*

*— Jean Hugues Noël Robert, baron Mariani*
*Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica*
<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Discours de la seconde méthode](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md)
- [Rendre capable — noyau doctrinal provisoire](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/noyau_doctrinal_rendre_capable.md)
- [Test du critère Rossignol](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/test_critere_rossignol.md)
- [Agent-Resumable CLI](research/agent_resumable_cli.md)
- [AGENTS.md — Cogentia methodology shortcut](AGENTS.md)
- [Cogentia](README.md)
- [cogentia.js - Tutorial and Near-Specification](research/cogentia_js_tutorial.md)
- [Cognitive Packet Switching](research/cognitive_packet_switching.md)
- [Pipeline](research/pipeline.md)
- [Research Index — Cogentia](research/index.md)
- [The Cogentia Commons Living Corpus](research/cogentia_commons_living_corpus.md)
- [Trail: From Method to Machine](research/trails/from_method_to_machine.md)
- [Carte globale du Corpus](https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/research/corpus-map.md)
- [Documents - All Tracked Repos](https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/research/documents.md)
- [DHITL, Democratic Humans In The Loop](https://github.com/JeanHuguesRobert/marenostrum/blob/main/DHITL.md)
<!-- END_AUTO: backlinks -->
