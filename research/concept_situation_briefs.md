---
title: "Concept Situation Briefs"
subtitle: "A Derived Product Category for Locating Ideas in Origin, Lineage, Neighborhood, Current Relevance, and Use"
version: "1.0"
status: "published source document"
date: "2026-06-01"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0"
language: "en"
repository: "JeanHuguesRobert/cogentia"
intended_path: "research/concept_situation_briefs.md"
tags:
  - cogentia
  - derived-products
  - concept-situation-brief
  - concept-brief
  - idea-genealogy
  - comparative-analysis
  - source-documents
  - corpus-method
related_projects:
  - "Cogentia"
  - "Cogentia Commons"
  - "Cognitive Packets"
  - "Cognitive Packet Switching"
  - "Ubikia"
derived_products_created:
  - "research/derived_products/concept_situation_brief_cognitive_packet_switching.md"
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/concept_situation_briefs.md
last_stamped_at: 2026-06-01
document_role: "source"
document_kind: "concept-note"
visibility: "public"
lifecycle_state: "stable"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "concept-note"
classification_confidence: "medium"
---

# Concept Situation Briefs

## A Derived Product Category for Locating Ideas in Origin, Lineage, Neighborhood, Current Relevance, and Use

**Jean Hugues Noël Robert, baron Mariani**  
Institut Mariani / C.O.R.S.I.C.A.  
1 cours Paoli, F-20250 Corte, Corsica

*Published source document — v1.0 — June 2026*

---

## Executive Summary

A **Concept Situation Brief** is a derived product that situates an idea.

It does not merely summarize the idea. It locates it across several dimensions:

- its origin in an author, corpus, conversation, project, or source document;
- the problem it tries to solve;
- the history of ideas it mobilizes;
- comparable, neighboring, competing, or prior ideas;
- the current relevance of the subject;
- the idea's distinctive difference;
- plausible uses, criticisms, and next transformations.

The purpose is to make an idea intellectually and operationally legible without forcing the reader to absorb the entire source corpus.

A Concept Situation Brief is therefore a **situating derivative**: it places an idea in a conceptual landscape.

Compact formulation:

> A Concept Situation Brief is a derived product that locates an idea in its origin, lineage, conceptual neighborhood, current relevance, specific difference, uses, and critique space.

---

## 1. Why this product category is needed

A corpus may contain many source documents, fragments, conversations, notes, objections, drafts, and public derivatives.

As the corpus grows, a problem appears:

> A reader may understand the text of an idea but not understand where the idea stands.

They may ask:

- Where does this idea come from?
- Is it central or peripheral in the corpus?
- Which previous ideas does it mobilize?
- Which external traditions does it resemble?
- Is it original, recombinatory, or merely renamed prior art?
- What is happening now that makes it relevant?
- What are the closest competing ideas?
- What would count as a fair criticism?
- What should this idea become next?

A Concept Situation Brief answers these questions in a bounded format.

---

## 2. Definition

A **Concept Situation Brief** is a derived product that analyzes an idea by situating it in five contexts:

1. **Internal origin** — where the idea appears in the author's corpus;
2. **Genealogy** — which prior concepts, traditions, or technical patterns it mobilizes;
3. **Conceptual neighborhood** — which ideas are close, competing, overlapping, or easily confused with it;
4. **Current relevance** — why the idea matters now;
5. **Operational use** — what the idea can do, what it can become, and what it should not claim.

It is not a full academic paper, not a literature review, not a publicity note, and not a replacement for the source document.

It is a map.

---

## 3. Relation to source documents and derived products

Within the Cogentia method, a source document should remain the sovereign reference for the idea's core claims.

A Concept Situation Brief is a derived product.

Its role is not to replace the source document, but to answer:

> How should this idea be situated for a reader who does not yet know the corpus?

The relationship can be represented as:

```text
source documents
      ↓
concept situation brief
      ↓
public derivatives / technical derivatives / objections / next source documents
```

A Concept Situation Brief may itself generate new packets:

- objection packets;
- prior-art packets;
- bibliography packets;
- implementation packets;
- public explanation packets;
- follow-up source documents.

---

## 4. When to produce a Concept Situation Brief

A Concept Situation Brief is useful when an idea is:

- important enough to travel outside its original context;
- likely to be misunderstood as either too new or not new at all;
- connected to several source documents;
- adjacent to known traditions, standards, or prior art;
- ready for external critique;
- ready to generate public or technical derived products;
- strategically important for the corpus.

It is especially useful after a new source document has been stabilized.

---

## 5. Standard structure

Recommended structure:

```markdown
# Concept Situation Brief — [Idea]

## 1. Short definition
## 2. Origin in the corpus
## 3. Problem addressed
## 4. Internal genealogy
## 5. External genealogy
## 6. Comparable or neighboring ideas
## 7. Current relevance
## 8. Specific difference
## 9. Implementation or use profiles
## 10. Possible criticisms
## 11. Possible uses
## 12. Positioning summary
## 13. Source documents and derived products
```

The structure may be shortened for public use.

---

## 6. Minimal metadata

Recommended frontmatter:

```yaml
title: "Concept Situation Brief — [Idea]"
version: "0.1"
status: "derived product"
date: "YYYY-MM-DD"
source_documents:
  - "path/to/source_document.md"
derived_from:
  - "source concept or conversation"
concept:
  name: "[Idea]"
  aliases:
    - "[Alias]"
audience:
  - "internal corpus"
  - "external technical readers"
  - "public readers"
tags:
  - concept-situation-brief
  - derived-product
```

---

## 7. Core evaluative questions

A good Concept Situation Brief should answer:

| Question | Purpose |
|---|---|
| What is the idea? | Prevent vagueness. |
| Where does it come from? | Establish internal traceability. |
| What problem does it answer? | Prevent decorative conceptualization. |
| Which older ideas does it mobilize? | Avoid false novelty. |
| Which ideas are close to it? | Clarify the conceptual neighborhood. |
| What is happening now that makes it relevant? | Connect the idea to current conditions. |
| What is its specific difference? | Identify what the idea adds. |
| What are the best objections? | Improve robustness. |
| What can it become next? | Prepare transformation and implementation. |

---

## 8. Relation to literature reviews

A Concept Situation Brief is related to a literature review, but it is not the same object.

A literature review usually starts from external sources and surveys a domain.

A Concept Situation Brief starts from a specific idea in a corpus and asks how that idea should be situated.

It may include literature, but it is not literature-first.

It is idea-first.

---

## 9. Relation to prior-art review

A Concept Situation Brief can include prior-art analysis, but it is broader.

Prior-art review asks:

> Has this already been done?

A Concept Situation Brief asks:

> Where does this idea stand, what does it inherit, what is close to it, what does it add, and what should happen next?

Prior art is one component of conceptual situation.

---

## 10. Relation to cognitive packets

A Concept Situation Brief can be interpreted as a higher-order cognitive packet.

It packages the position of an idea, not merely its content.

In envelope/payload terms:

```text
envelope: idea identity, source documents, audience, status, route
payload: definition, genealogy, neighbors, current relevance, uses, objections
```

It is especially useful as a routing object:

- send to a critic;
- send to a reviewer;
- send to a public audience;
- send to a technical implementer;
- send to an agent that generates derived products.

---

## 11. Failure modes

## 11.1 False genealogy

The brief may overstate a lineage or create artificial ancestry.

Mitigation: distinguish verified source, plausible analogy, and speculative connection.

## 11.2 Overclaiming novelty

The brief may present recombination as invention.

Mitigation: explicitly identify prior art and close neighbors.

## 11.3 Concept inflation

The brief may make a modest idea look grander than it is.

Mitigation: include a strong criticism section.

## 11.4 Current-affairs fragility

The "current relevance" section may become stale.

Mitigation: date the brief and cite current sources when necessary.

## 11.5 Corpus self-reference

The brief may become too internal.

Mitigation: include external genealogy and comparable ideas.

---

## 12. Design principles

| Principle | Meaning |
|---|---|
| Situation before promotion | The goal is to locate the idea, not advertise it. |
| Source fidelity | The brief must not distort the source document. |
| External humility | Identify close prior art and comparable ideas. |
| Dated currentness | Current relevance must be dated and revisable. |
| Specific difference | The brief should say what the idea adds, not only what it resembles. |
| Critique readiness | The brief should prepare objections, not hide them. |
| Transformation readiness | The brief should indicate useful next derivatives. |

---

## 13. Naming

Recommended English name:

```text
Concept Situation Brief
```

Short public variant:

```text
Concept Brief
```

French equivalent:

```text
Fiche de situation conceptuelle
```

Recommended file naming:

```text
concept_situation_brief_<slug>.md
```

Example:

```text
concept_situation_brief_cognitive_packet_switching.md
```

---

## 14. Conclusion

A Concept Situation Brief is a useful derived product category for a growing corpus.

It answers a recurring need:

> not only to state an idea, but to situate it.

It makes an idea easier to criticize, compare, publish, implement, and transform.

In the Cogentia method, it should become one of the standard products generated after a significant source document is stabilized.

## 15. Consolidation note, 2026-06-09

The first instance of this category now exists: [Concept Situation Brief — Cognitive Packet Switching](derived_products/concept_situation_brief_cognitive_packet_switching.md). The category is therefore no longer merely planned.

Open continuations:

1. Use the first instance as the review specimen for the product category.
2. Decide whether future briefs should be scheduled by generic `continuation` objects, a restored grouped derived-product scheduler, or the future Web workspace.
3. Keep current-relevance sections explicitly dated, because this derived product category is intentionally exposed to temporal drift.
<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Cogentia](../README.md)
- [Documents - All Tracked Repos](documents.md)
- [Research Index — Cogentia](index.md)
- [Documents - All Tracked Repos](https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/research/documents.md)
<!-- END_AUTO: backlinks -->
