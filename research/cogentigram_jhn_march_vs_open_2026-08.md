# Cogentigram comparison: March 2026 sample vs August person-open

**Status:** living research note  
**Date:** 2026-08-13  
**Purpose:** Record the quantitative and qualitative delta between the first 73-axis sample and the updated person-open structural profile used for Agent JHN fidelity dogfood.

## Sources

| Label | Path | Generated | Agent / method |
|-------|------|-----------|----------------|
| **March sample** | [`apps/personal/samples/cogentigram_author.json`](../apps/personal/samples/cogentigram_author.json) | 2026-03-03 | ChatGPT (`gpt-5-mini`) over 200+ deep exchanges |
| **August open** | [`research/cogentigram_jhn_public_open.json`](cogentigram_jhn_public_open.json) | 2026-08-13 | Grok over prior sample + public twin/ops corpus |

**Method (August):** `update_from_prior_cogentigram_plus_public_corpus_inference` — keep scores unless corpus strongly supports a bump; refresh evidence language for Agent JHN style axes; reframe relationship metadata for 2026 public work.

**Not compared here:** private full copy under registre-mariani (gitignored). Open structural profile is the deliberate person-open dogfood surface.

## Headline numbers

| Metric | Value |
|--------|-------|
| Axes in both profiles | **73 / 73** (same names; no adds/drops) |
| Scores unchanged | **66** |
| Scores changed | **7** (all **+1** percentile) |
| Confidence values changed | **0** |
| Evidence strings rewritten | **13** |
| Bottom-5 axes | **identical** (same names and scores) |
| Global confidence | March **85** → Open **88** |

**Interpretation:** the radar shape is stable. August is a **calibration refresh**, not a new personality. What moved is framing (evidence + topics + KYS metadata), plus seven one-point bumps on already-high axes that the public corpus strongly re-exemplifies.

## Score deltas (all +1)

| Axis | Category | March | Open | Why the bump (inferred) |
|------|----------|-------|------|-------------------------|
| Definitional Rigour | Cognitive Architecture | 96 | **97** | Mandate vs capability, Guide vs person, public-readonly subset discipline |
| Autonomy Index | Flow Dynamics | 96 | **97** | Twin/ops independence; human arbiter over platform capture |
| Informational Density | Semiotics & Language | 95 | **96** | Dense handoffs, tables, compressed formulas across repos |
| Intellectual Rectitude | Axiology & Arbitration | 95 | **96** | Corrects wrong defaults (Guide hierarchy, TypeScript-by-default) |
| Process Priority | Axiology & Arbitration | 95 | **96** | Scorecards, shadow modes, reversible flips before feature sprints |
| Moral Consistency | Axiology & Arbitration | 94 | **95** | Anti-capture / non-judicial / person-controlled disclosure held in practice |
| Principle Stability | Axiology & Arbitration | 94 | **95** | Possibilism, one-human-one-voice, AI-first fidelity phase held under ops pressure |

No score decreased. No axis moved by more than one percentile point.

## Category averages

| Category | March avg | Open avg | Δ |
|----------|-----------|----------|---|
| Axiology & Arbitration | 94.1 | 94.7 | **+0.6** |
| Cognitive Architecture | 91.9 | 92.0 | +0.1 |
| Semiotics & Language | 91.5 | 91.6 | +0.1 |
| Flow Dynamics | 91.1 | 91.1 | 0 |
| Social Interface | 81.8 | 81.8 | 0 |

Social Interface (including Affective Empathy **45**, Cognitive Empathy **60**) is deliberately unchanged — still the low band, and still the instruction surface for “do not fake warmth.”

## Top-12 ordering

March top peak remains Deductive Logic **98** and Analytical Precision **97**. August keeps those peaks and elevates **Definitional Rigour** and **Autonomy Index** into the shared 97 band; **Intellectual Rectitude** and **Process Priority** enter the top-12 at 96 (displacing Narrative Fluency and Critical Synthesis from the top-12 list only by ranking, not by score drop — both stay at 95).

| Rank | March top-12 | Open top-12 |
|------|--------------|-------------|
| 1 | Deductive Logic 98 | Deductive Logic 98 |
| 2 | Analytical Precision 97 | Analytical Precision 97 |
| 3 | Epistemic Sovereignty 97 | **Definitional Rigour 97** |
| 4 | Cognitive Sovereignty 97 | Epistemic Sovereignty 97 |
| 5 | Definitional Rigour 96 | **Autonomy Index 97** |
| 6 | Imperative Hierarchy 96 | Cognitive Sovereignty 97 |
| 7 | Autonomy Index 96 | Informational Density 96 |
| 8 | Systemising Index 95 | Imperative Hierarchy 96 |
| 9 | Inference Speed 95 | **Intellectual Rectitude 96** |
| 10 | Critical Synthesis 95 | **Process Priority 96** |
| 11 | Informational Density 95 | Systemising Index 95 |
| 12 | Narrative Fluency 95 | Inference Speed 95 |

## Evidence rewrites (13 axes)

Evidence was rewritten without score change on six axes, and with the +1 bumps on seven. Pattern of rewrite:

- **From:** generic conversation-observer phrasing (“demands precise definitions”, “high semantic content per word”).
- **To:** corpus-grounded exemplars (mandate attenuation, public-readonly subset, Operium/Guide/WhatsApp layering, anti-capture memory doctrine, scorecards/shadow).

Notable non-score rewrites:

| Axis | Score | March evidence (short) | Open evidence (short) |
|------|-------|------------------------|------------------------|
| Deductive Logic | 98 | Strict syllogistic deduction | Chains constraints: mandate attenuation, public-readonly, no secrets on answer surfaces |
| Analytical Precision | 97 | Components of complex systems | Separates mandates, retrieval quality, synthesis failure modes |
| Cognitive Sovereignty | 97 | Independence of thought | AI-first with human arbiter; refuses platform memory silos |
| Systemising Index | 95 | Strong systemization | Layered systems: registry, Operium, Guide, WhatsApp, continuations |
| Affective Empathy | 45 | Lower involuntary emotional resonance | Explicit: public twin must not fake warmth beyond sober clarity |

Full list of 13: Affective Empathy, Analytical Precision, Cognitive Sovereignty, Critical Synthesis, Deductive Logic, Definitional Rigour, Epistemic Sovereignty, Informational Density, Intellectual Rectitude, Literality Index, Narrative Fluency, Process Priority, Systemising Index.

## Metadata / framing (largest qualitative change)

| Field | March | August open |
|-------|-------|-------------|
| Version | 1.0 | 1.2 |
| Producing agent | ChatGPT gpt-5-mini | Grok over corpus + prior sample |
| Main topics | Psychocognitive analysis, family legacy, ethics, complex systems, language | Possibilism, FractaVolta, digital twins, Agent JHN, DHITL, Corsica projects, Inox, Cognitive Packets |
| Observed patterns | Logic, legacy, self-awareness, curiosity | Mandates, provenance, public-readonly split, reversible ops, anti-capture |
| Blind spots | Affective empathy, social stress, fatigue multitasking | Same structure; private affect correctly out of public twin scope |
| Subject / KYS block | (none) | Person-open structural dogfood; specialized views listed; non-episodic; not judicial |

The **shape of mind** is continuous; the **story told about the work** is 2026 twin/ops, not March chat-session topics.

## Implications for Agent JHN

1. **Inject top-N from August open**, not March — evidence language matches current fidelity doctrine and product vocabulary.
2. **Do not treat +1 bumps as a new self** — they are ceiling calibration on already-dominant axes.
3. **Keep low Social Interface as hard negative constraints** — “do not fake affective warmth” is stable from March through August.
4. **KYS grant metadata** (`kys.public_answer_style`, purpose `public_answer_fidelity`) binds disclosure purpose so inject is person-controlled specialized use, not a blank full-profile dump for all purposes.
5. **Re-score later only when** a measurable fidelity suite (e.g. public answer style eval) shows systematic mismatch — not on vibe.

## Related

- [`cogentigram_for_agent_jhn_fidelity.md`](cogentigram_for_agent_jhn_fidelity.md)
- [`cogentigram_jhn_thinking_capsule.md`](cogentigram_jhn_thinking_capsule.md)
- [`kys_profile_privacy_and_public_specialized_profiles.md`](kys_profile_privacy_and_public_specialized_profiles.md)
- Capsule + compressed top-N inject: `scripts/lib/agent-jhn-whatsapp/representation-brief.js`
