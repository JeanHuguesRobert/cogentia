# Cogentia Commons: A Platform Architecture for Collaborative Possibility Exploration Under Scientific Constraint

**Working Paper — April 2026**

*Jean Hugues Robert, baron Mariani, Institut Mariani, 1 cours Paoli, F-20250 Corte, Corsica*

jhr@baronsmariani.org

---

## Abstract

Cogentia Commons is proposed as a public-by-default infrastructure for collaborative exploration of ideas, theories, projects, and research programs under explicit scientific constraints. The platform does not claim to determine truth; rather, it organizes disciplined conjecture, critique, revision, and synthesis through persistent epistemic traceability. The system operationalizes *thesis kernels*, *epistemic status tagging*, *multi-agent critique loops*, and recognition signals structurally decoupled from validity claims. We define a minimal platform architecture, discuss governance mechanisms and anticipated failure modes, and propose an empirical evaluation plan.

The core procedural claim: *the platform distributes the conditions of exploration; it does not democratize truth.*

Cogentia Commons constitutes **Layer 4 (Cognitive Infrastructure)** of the Democratic Humans in the Loop (DHITL) framework for distributed AI governance. It operationalizes the individual Cogentia signature — the persistent reasoning trace formalized in the companion paper *Cogentia and Cogentigrams* (Robert, 2026a) — in collaborative, multi-agent settings. Together, they form the cognitive and epistemic substrate of a larger infrastructure sovereignty argument.

---

## 1. Introduction

Scientific and civic epistemic systems share a structural failure mode: they systematically reject ideas that are too uncertain for canonical publication, yet too consequential for unstructured public discourse. Peer review imposes an implicit threshold — a claim must already be substantially developed, well-cited, and low-risk before it can enter the archive. Public discourse, in the opposite direction, lacks the mechanisms that would discipline speculation, track revision, or distinguish productive failure from noise.

This gap is not merely a technical inconvenience. It has epistemological consequences. Many of the most important ideas in the history of knowledge — Wegener's continental drift, Semmelweis's germ hypothesis, early network neutrality arguments — spent years or decades in exactly this limbo: too heterodox for publication, too rigorous for dismissal, unsupported by collaborative infrastructure that could have accelerated their development or made their refutation traceable.

The emergence of large language models introduces a new structural variable. LLMs can generate technically coherent outputs at scale, traversing large conceptual spaces rapidly. They can function as structured critique agents, literature reviewers, and hypothesis generators. They also introduce novel failure modes: hallucination, citation fabrication, stylistic mimicry masking conceptual vacuity. Any infrastructure designed to host exploratory reasoning must address both the affordances and the risks.

Cogentia Commons is proposed as an answer to this gap. It is an infrastructure for disciplined epistemic exploration — not a truth-determination mechanism, but a structured container for productive uncertainty.

The motivating philosophy is **Possibilism**: the systematic, joyful exploration of what is potentially possible, valuing the structure of discovery regardless of whether a particular pathway is ultimately confirmed. Possibilism does not privilege confirmed outcomes. It privileges the integrity of the exploration process.

### 1.1 Institutional Antecedent

C.O.R.S.I.C.A. — *Corse Organisant la Réunion Sur Internet de Compétences Autonomes*, founded in Corte in 1995 — constitutes a direct institutional predecessor to Cogentia Commons. Founded before the term "open source" was coined (February 1998), C.O.R.S.I.C.A. operated on the premise that geographically distributed cognitive capacities could be organized through networked coordination into collectively productive outcomes. Cogentia Commons extends this premise into the epistemic domain, adding formal traceability, AI-mediated critique, and commons governance.

---

## 2. Conceptual Background

### 2.1 Possibilism and the Adjacent Possible

The concept of the *adjacent possible* (Kauffman, 1996; Johnson, 2010) describes the set of configurations reachable from any given state through minimal perturbation. In biological systems, it demarcates what can evolve without catastrophic discontinuity; in epistemic systems, it demarcates what can be coherently conjectured from current knowledge states.

Possibilism treats the exploration of the adjacent possible not as a secondary activity but as the primary epistemic activity of rational agents under genuine uncertainty. The goal is not to find truth faster; it is to map the reachable space more faithfully — including dead ends, refuted pathways, and temporarily abandoned conjectures — with as much fidelity as confirmed routes.

### 2.2 Commons Governance

Elinor Ostrom's analysis of common-pool resource governance (Ostrom, 1990) identified conditions under which shared resources can be managed without privatization or centralized control. The key mechanisms — bounded membership, graduated sanctions, collective choice rules, nested governance — translate into the epistemic domain as bounded communities of inquiry with defined entry criteria, graduated credibility signals, participatory rule revision, and multi-level deliberation.

Knowledge commons — epistemic resources held and governed collectively — have been theorized by Hess and Ostrom (2007). Cogentia Commons proposes a formal instantiation of an epistemic knowledge commons for exploratory, pre-canonical scientific reasoning.

### 2.3 Correctability and Epistemic Traceability

Popperian falsificationism (Popper, 1959) established that scientific progress depends less on verification than on structured exposure to refutation. Cogentia Commons operationalizes this principle at the infrastructure level: every claim, premise, and revision is addressable, auditable, and permanently linked to the objections that prompted it. An accepted objection does not erase its target; it forks a revision branch, leaving the original claim visible alongside its critique.

This property — *epistemic traceability* — is the structural core of the platform. It transforms "being wrong" from a reputational event into a navigational event.

### 2.4 Personal Cogentia and the Cogentigram

The companion paper *Cogentia and Cogentigrams* (Robert, 2026a) formalizes **Cogentia** as the persistent structural signature of an entity inferred through repeated AI-mediated interaction — stable cognitive, behavioral, and stylistic tendencies captured along defined psychometric axes. Its measurable representation, the **Cogentigram**, enables longitudinal analysis of reasoning patterns under uncertainty and privacy-preserving disclosure under the KYS (Know Your Self) licensing framework, governed by PrivAI under MIT license.

Cogentia Commons is the collaborative extension of this individual framework. Where a Cogentigram tracks an individual's reasoning trace, the Cogentia Graph tracks the collective trace of an exploratory community — the network of theses, objections, revisions, and syntheses that constitute the group's epistemic work.

### 2.5 DHITL Layer 4: Cognitive Infrastructure

The Democratic Humans in the Loop (DHITL) framework (Robert, 2026b) proposes a five-layer architecture for distributed AI governance:

1. **Physical/Energy Layer** — computational substrate and energy sovereignty
2. **Economic Layer** — incentive structures and resource allocation
3. **Political Layer** — democratic control mechanisms
4. **Cognitive Layer** — epistemic infrastructure for collective reasoning
5. **Technical Layer** — AI model governance and safety mechanisms

Cogentia Commons constitutes **Layer 4**, the cognitive infrastructure layer. It provides the structured epistemic substrate through which democratic human oversight of AI systems becomes operationally possible — not as a rhetorical commitment but as a functioning system with persistent records, revision histories, and multi-agent critique. Without this layer, democratic oversight of AI remains aspirational; with it, oversight becomes architecturally embedded.

---

## 3. Problem Statement

### 3.1 Over-filtering by Canonical Institutions

Academic publishing, grant funding, and peer review operate as collectively optimal filters for a world of relative certainty and slow-moving knowledge. They are poorly adapted to the epistemic needs of genuinely novel inquiry, where the most interesting claims are precisely those that cannot yet provide the citation infrastructure that review processes require.

The institutional response to this problem — preprints, working papers, grey literature — provides access without structure. A preprint is epistemically inert: it contains no formal objection tracking, no revision branching, no differentiation between foundational premises and derivative claims. It is a static document delivered into an environment without structured critique infrastructure.

### 3.2 Public Discourse Failures

Public discourse conflates opinion and knowledge, lacks persistent critique records, and generates no actionable revision signals. Engagement metrics — likes, shares, retweets — are systematically uncorrelated with epistemic quality. Popular reasoning errors persist indefinitely because the infrastructure required to trace their refutation does not exist.

### 3.3 LLM Affordances and Risks

Large language models introduce three affordances for epistemic infrastructure: (a) low-cost structured critique at scale, (b) rapid traversal of argument space, and (c) accessible formalization of informal reasoning. They simultaneously introduce three risks: (a) hallucination and citation fabrication requiring structural safeguards, (b) stylistic fluency masking conceptual incoherence, and (c) potential for synthetic social proof — AI-generated recognition signals that mimic genuine engagement.

Cogentia Commons must be designed to exploit the affordances while architecturally mitigating the risks.

### 3.4 Publication Stasis

Static documents, whether in preprint form or canonical publication, cannot respond to objections structurally. A reader who identifies a flawed premise in a published paper can write a comment, a letter to the editor, or a reply paper — each of which produces a new static document. No existing architecture creates a persistent, addressable link between the original claim and its refutation in a way that is visible to future readers traversing the argument.

---

## 4. Platform Theory

### 4.1 Thesis Kernel

A **Thesis Kernel** is the minimal structured representation of an exploratory claim: a core assertion, its epistemic status, its key premises, the constraints it must satisfy to be non-trivially interesting, and the conditions under which the author commits to revising it. The Thesis Kernel is not a paper; it is the spine of a living document.

Epistemic status indicators include: *conjecture*, *working hypothesis*, *empirically grounded*, *formally demonstrated*, *contested*, *refuted*, *abandoned*, *superseded*. These labels are applied by the author but contested by the community, producing a negotiated epistemic status record.

### 4.2 Cogentia Graph

The **Cogentia Graph** is the directed network of Thesis Kernels, premises, objections, revisions, and syntheses. Each node is addressable; each edge carries type information (*supports*, *contradicts*, *qualifies*, *extends*, *refutes*). The graph constitutes the collective reasoning trace of the platform's epistemic community.

Navigation through the Cogentia Graph is the primary use mode: a researcher entering the system can traverse argument paths, identify the strongest extant objections to a claim, locate the most recent revision, and assess confidence at any node given the current critique record.

### 4.3 Multi-Agent Critique Loop

The platform supports three classes of critique agents: human reviewers, domain-specific AI agents, and a structural coherence agent. Human reviewers provide substantive domain expertise. AI agents provide structural analysis — logical consistency, citation validity, premise redundancy, argument completeness. The structural coherence agent identifies circular dependencies, undefined terms, and axiom proliferation.

Critically, critique agents cannot determine truth. They can assess structural properties: consistency, coverage, citation validity, response to extant objections. This distinction — between structural quality and truth — is architecturally enforced.

### 4.4 Epistemic Status Layer

The Epistemic Status Layer provides system-wide metadata on the current confidence state of every node in the Cogentia Graph. Status propagates: a refuted foundational premise automatically propagates a status flag to all downstream claims that depend on it. This propagation is visible but not deterministic — it signals that review is warranted, not that downstream claims are automatically invalid.

### 4.5 Recognition Commons

Donations, endorsements, and citations function as recognition signals decoupled from validity claims. The system enforces this separation structurally: a Thesis Kernel with ten thousand endorsements and no accepted objections is treated identically to one with ten endorsements and no accepted objections for purposes of status computation. Popularity is recorded but not weighted in epistemic assessment.

This design prevents the conflation of recognition and correctness — a failure mode endemic to social platforms and, arguably, to citation-weighted academic metrics.

### 4.6 Governance Architecture

Participation rights are structured as a knowledge commons with anti-capture provisions. Core mechanisms: open contribution with identity verification, graduated access to critique tools based on contribution history, transparent rule revision through documented deliberation, and institutional non-exclusivity — no single organization may hold disproportionate moderation authority.

---

## 5. Architecture

### 5.1 Entity Model

The platform's entity model comprises the following core types:

**User** — verified identity, CogentiaProfile link, contribution history, reputation score.

**CogentiaProfile** — the user's Cogentigram, updated longitudinally from platform interactions; governed by the KYS license framework established in Robert (2026a).

**Thesis** — Thesis Kernel with epistemic status, version history, and dependency links.

**Premise** — atomic supporting claim, separately addressable and separately critique-able.

**Reference** — cited source with machine-verified DOI or URI, freshness timestamp, and citation context.

**Constraint** — explicitly stated condition that the Thesis must satisfy; used by critique agents as evaluation criteria.

**Claim** — derivative assertion downstream of one or more Theses.

**Objection** — structured challenge to a Thesis, Premise, or Claim; linked to the target node; carries an author, a timestamp, and a resolution status.

**Revision** — a new version of a Thesis or Premise, created in response to an Objection; linked to both the original and the triggering Objection.

**AgentReview** — structured output of a critique agent run; includes agent type, version, scope, and findings.

**Artifact** — associated document, dataset, or code; linked to the Thesis or Claim it supports.

**DonationSignal** — recognition event; recorded but structurally separated from epistemic status computation.

**ReputationScore** — contribution-weighted metric; computed from accepted objections, revision quality, and peer endorsement; does not affect status propagation.

**DeliberationThread** — governance discussion record; linked to platform rule proposals or contested moderation decisions.

### 5.2 Technical Constraints

The platform must support: persistent addressability of all nodes (stable URIs); cryptographic timestamping of revisions; open API access for external critique agents; federated authentication without centralized identity storage; and public archival export in standard formats.

The system must explicitly reject: algorithmic ranking of Thesis Kernels by engagement metrics; opaque moderation; proprietary lock-in of the Cogentia Graph.

---

## 6. The Recursive First Use Case

*"The first object explored by Cogentia Commons is Cogentia Commons itself."*

This is not a rhetorical device. It is an architectural commitment.

The working paper you are reading constitutes version v0.3 of a Thesis Kernel whose core claim is the proposition that exploratory epistemic infrastructure of the kind described here is both feasible and necessary. The platform, once instantiated, will host this paper — and its objections, revisions, and critique history — as its inaugural Cogentia Graph node.

The recursive structure has several consequences. First, it forces the designers to submit their own work to the same critique-and-revision process the platform is designed to enable. If a section of this paper is structurally incoherent, that incoherence will be documented and linked to the revision that corrects it, permanently. Second, it provides a concrete bootstrapping object that is inherently interesting to potential early users: a platform that argues, in real time, for its own existence and tracks the objections to that argument. Third, it instantiates Possibilism as a lived practice rather than a stated value — the exploration is genuine because the outcome, including the possibility that the platform design is fundamentally flawed, is genuinely open.

**Objection on record** (v0.1, internal review): *"The recursive structure creates an infinite regress: the paper about the platform is a Thesis Kernel on the platform, which requires the platform, which requires the paper."*

**Response** (v0.2): The regress is arrested by temporal sequencing. The paper exists prior to the platform and is migrated to it upon instantiation. The recursive structure becomes active, not constitutive. The paper does not require the platform to exist; it anticipates it.

**Remaining open question**: Whether the bootstrapping threshold — the minimum viable community size for the critique loop to generate genuine epistemic signal — can be reached without prior institutional sponsorship. This is the primary empirical uncertainty of the project.

---

## 7. Risks and Failure Modes

### 7.1 Epistemic Populism

The most dangerous failure mode: the recognition commons becomes a de facto voting mechanism, and recognition signals (donations, endorsements) colonize the epistemic status layer despite architectural separation. Mitigation: enforcement of separation at the data model level, with public audit of any proposed change to weighting logic.

### 7.2 Gaming

Users optimize for accepted objections rather than genuine critique; AI agents generate trivially accepted objections to accumulate reputation points. Mitigation: objection quality assessment by human reviewers for high-stakes nodes; graduated trust for AI-generated objections; detection of objection pattern anomalies.

### 7.3 Plutocratic Capture

High-donation users or institutions gain disproportionate influence through funding governance structures. Mitigation: Ostrovian anti-capture rules; donation caps per governance cycle; public reporting of funding flows.

### 7.4 Hallucination Contamination

AI critique agents introduce fabricated citations or logically incoherent objections at scale. Mitigation: citation verification against live DOI databases before objection publication; AI objections carry mandatory provenance flags visible to all readers.

### 7.5 Privacy Confusion

Users do not understand that their CogentiaProfile is being updated through platform interaction. Mitigation: mandatory KYS consent at onboarding; real-time Cogentigram access; clear structural distinction between epistemic trace (public) and cognitive profile (private by default under PrivAI governance).

### 7.6 Cultic Closure

The platform community converges on a shared set of axioms and ceases to generate genuine critique. Mitigation: structural incentives for cross-community objection; invited external reviewer program; periodic adversarial audits.

### 7.7 Over-modeling

The entity model becomes so complex that contribution cost exceeds contribution benefit, and researchers abandon the platform for static publishing. Mitigation: minimal contribution path (Thesis Kernel only, single-step premise extraction); full complexity is optional, not required.

---

## 8. Evaluation Plan

### 8.1 Artifact Quality

Compare the structural quality of Thesis Kernels pre- and post-critique loop completion, using: precision of claims, resolution of identified objections, reference validity, and self-assessed confidence calibration.

### 8.2 Critique Uptake

Track the fraction of published objections that are acknowledged, addressed, and resolved; the latency from objection publication to revision; and the fraction of revisions that generate new objections, as a revision quality signal.

### 8.3 Reference Diversity

Measure the distribution of cited sources across disciplines, institutional affiliations, and geographical origins; flag citation monocultures as a potential indicator of cultic closure (§7.6).

### 8.4 Correction Latency

Time from identifiable structural error to accepted revision across node types; compare to latency in equivalent static publication processes.

### 8.5 Researcher-Centered Usability

Qualitative studies with researchers at different career stages; focus on: contribution barrier perception, trust in AI critique agents, understanding of epistemic status propagation, and long-term engagement drivers.

---

## 9. Relation to DHITL Infrastructure

Cogentia Commons is not a standalone platform. It is the cognitive substrate of a larger infrastructure sovereignty architecture.

The DHITL framework (Robert, 2026b) argues that AI safety cannot be reduced to model-level technical properties; it requires distributing the conditions of human oversight across five functional layers. Layer 4 — Cognitive Infrastructure — is the layer at which collective human reasoning about AI systems becomes structurally organized. Without it, democratic oversight of AI remains a rhetorical aspiration. Cogentia Commons instantiates it as working infrastructure.

The implication is directional: Cogentia Commons is designed to host, among other Thesis Kernels, the ongoing collaborative development of AI governance arguments themselves — including DHITL. The infrastructure is designed to be used for its own governance argument. The recursive structure extends from the platform's internal design to the broader governance project of which it is part.

This positions Cogentia Commons not as a neutral epistemic tool but as a tool with a normative orientation: it exists to strengthen the collective cognitive capacity of democratic communities to reason about systems that could otherwise outpace their oversight capacity.

---

## 10. Conclusion

Cogentia Commons should be interpreted as exploratory infrastructure, not truth arbitration. Its purpose is to make the exploration of uncertain ideas tractable, traceable, and collectively productive — not to accelerate convergence on predetermined conclusions.

The system distributes the conditions of exploration. It does not democratize truth, because truth is not distributed by infrastructure. Exploration is.

Three claims warrant emphasis as the platform moves from design to instantiation:

First, the separation between recognition and validity is not merely a design preference; it is the central epistemic commitment of the architecture. Any proposal to weight recognition signals in status computation should be treated as a governance crisis, not a feature request.

Second, the recursive first use case is not a demonstration. It is the operational test of whether the platform can survive its own critique process. If Cogentia Commons cannot coherently argue for its own existence under the same constraints it imposes on other Thesis Kernels, the design is defective.

Third, Possibilism — the motivating philosophy — entails that failure is a legitimate outcome. If the platform's bootstrapping threshold cannot be reached, or if a fundamental architectural flaw is identified through the critique process, the epistemically correct response is to document the failure faithfully and revise accordingly. The platform is not a bet on a particular outcome. It is a bet on the value of rigorous exploration.

*Donations signal recognition, not validity.*

---

## References

Hess, C., & Ostrom, E. (Eds.). (2007). *Understanding knowledge as a commons: From theory to practice*. MIT Press.

Johnson, S. (2010). *Where good ideas come from: The natural history of innovation*. Riverhead Books.

Kauffman, S. (1996). *At home in the universe: The search for the laws of self-organization and complexity*. Oxford University Press.

Ostrom, E. (1990). *Governing the commons: The evolution of institutions for collective action*. Cambridge University Press.

Popper, K. R. (1959). *The logic of scientific discovery*. Hutchinson.

Robert, J. H. (2026a). *Cogentia and Cogentigrams: A framework for structured representation of persistent cognitive signatures in AI systems*. Cogentia/PrivAI, MIT License. https://github.com/JeanHuguesRobert/cogentia

Robert, J. H. (2026b). *Democratic Humans in the Loop: Why Infrastructure Is All You Need for AI Safety* (DHITL). MareNostrum Repository. https://github.com/JeanHuguesRobert/marenostrum

---

*This paper is version v0.3 of a living document. Objections, revisions, and critique records will be hosted at the Cogentia Commons platform upon instantiation. The paper itself constitutes the inaugural Thesis Kernel of the system it describes.*

*Jean Hugues Robert — Institut Mariani, 1 cours Paoli, F-20250 Corte, Corsica. jhr@baronsmariani.org*
