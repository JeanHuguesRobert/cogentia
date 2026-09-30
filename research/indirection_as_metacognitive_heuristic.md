---
title: "Indirection as a metacognitive design heuristic"
subtitle: "A useful mediation, not an unlimited license to add layers"
description: "Source note on the provenance, scope, and FractaCognition use of the Wheeler/Needham indirection aphorism."
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-09-30"
version: "0.1"
status: "working-paper"
license: "CC BY-SA 4.0"
language: "en"
document_role: "source"
document_kind: "research-note"
document_function: "metacognitive-principles"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-DEFAULT-REVIEWED"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/indirection_as_metacognitive_heuristic.md"
tags:
  - fractacognition
  - metacognition
  - indirection
  - software-design
  - heuristics
related_documents:
  - "research/fractacognition_principles.md"
  - "research/learning_computer_genese_et_architecture.md"
provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_ref: "unknown"
  origin_date: "2026-09-30"
  derived_from:
    - "https://www.arabou.edu.kw/faculties/computer/Documents/ReadingList/ITC/lampson_1992.pdf"
    - "https://www.stroustrup.com/4thPreface.pdf"
review:
  status: "unreviewed"
  reviewed_by: []
---

# Indirection as a metacognitive design heuristic

## Provenance and attribution

Butler Lampson's [Turing lecture of 17 February 1993, slide 41](https://www.arabou.edu.kw/faculties/computer/Documents/ReadingList/ITC/lampson_1992.pdf) states: “Any problem in computer science can be solved with another level of indirection”, and attributes the aphorism to **David Wheeler**. This is a verified primary witness to *Lampson's attribution*, not evidence that Wheeler first coined or published the words.

An earlier printed witness is reported in Wulf, Levin and Harbison, *HYDRA/C.mmp: An Experimental Computer System* (1981), p. 279, attributing a closely related formulation to **Roger Needham**. The [digitized book](https://bitsavers.computerhistory.org/pdf/cmu/hydra_c.mmp/Wulf_HYDRA_Cmmp_An_Experimental_Computer_System_1981.pdf) has been located, but that page was not independently inspected for this note. The oral origin and the exact first formulation therefore remain **unsettled**; do not present a single inventor as established.

Bjarne Stroustrup's [preface to *The C++ Programming Language*, fourth edition](https://www.stroustrup.com/4thPreface.pdf) attributes to Wheeler the familiar counterpoint: excess indirection is itself a problem. That preface witnesses the *later attribution and circulation* of the counterpoint, not its original utterance.

## FractaCognition formulation

> **When two concerns are entangled, consider an explicit mediator that lets each vary without falsifying the other. Add it only if the reduced coupling is observable and exceeds the new layer's cost.**

An indirection is a controlled mapping between a reference and what it denotes or between an intention and its implementation. It is not merely another wrapper, file, class, intermediary, or review stage. Its useful questions are:

1. Which two responsibilities are currently coupled?
2. What mapping or interface would let either side change independently?
3. Who owns that mapping, and how can its current resolution be observed?
4. What new failure, latency, ambiguity, or capture risk does the layer create?
5. Is a simpler correction sufficient instead?

This is a **search heuristic**, not a theorem or a mandate to add structure. Occam remains its counterweight: use the smallest layer that resolves a demonstrated coupling, and remove one that only relocates confusion.

## A live test: the Suicide Corse no. 3 Quarto cover

The same `index.qmd` was asked to be an HTML/EPUB cover and a PDF book chapter. Quarto also generated its own PDF title page, so the PDF repeated the cover after the table of contents and numbered it as a chapter. The candidate indirection is a **format-specific cover boundary**: the HTML/EPUB index remains a web cover; the PDF receives a print-cover template; a narrowly scoped transformation removes only the synthetic cover chapter. This is a design hypothesis until the full PDF, table of contents, chapter numbering, and visual composition have been rendered and checked. It must not be promoted merely because a minimal LaTeX probe looks correct.

The metacognitive lesson is not “always add a layer”. It is to notice when one representation silently carries incompatible responsibilities, propose a mediator, expose its mapping and costs, and let an actual render decide whether it helped.

## Relation to the existing principles

- **Prudence and Humility:** treat the aphorism as a fallible prompt; verify the output and disclose attribution uncertainty.
- **Occam:** no layer without a concrete coupling it removes.
- **Talleyrand:** state the mapping, owner, and invariants that the new boundary otherwise hides.
- **FractaCognition:** propagate a verified local lesson proportionately, without turning a single Quarto workaround into a universal architecture rule.
