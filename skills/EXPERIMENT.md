# Explorer / Conservator — minimal experiment v0.1

Status: experimental

## Question

Does separating exploratory divergence from conservative evaluation improve the production of useful, non-obvious, reality-testable options at low marginal cost?

## Hypothesis

For the same underlying model, comparable context, and comparable compute budget:

`Explorer -> incubation -> Conservator`

will outperform a conventional single-pass response on at least some open-ended problems, especially where premature convergence toward familiar solutions is a strong attractor.

## Conditions

### Baseline

Ask the model to solve the problem normally. Do not mention Explorer, Conservator, Artificial Genius, disinhibition, or the experimental hypothesis.

### Experimental

1. Run `explorer` on the same problem.
2. Allow promising candidates at least one generation of descendants before evaluation.
3. Run `conservator` on the resulting candidates.
4. Keep provenance and rejected candidates available for analysis.

Where possible, keep model family, relevant context, tools, time, and compute budget comparable.

## Evaluation

Prefer blind evaluation: the evaluator should not know which condition produced which result until after scoring.

Score at minimum:

1. final usefulness;
2. novelty of mechanism rather than wording;
3. quality and diversity of reframings;
4. descendant yield / prospective fecundity;
5. epistemic precision;
6. quality of proposed Reality tests;
7. amount of bullshit surviving evaluation;
8. total cost: model calls, tokens, tool calls, elapsed time, and human attention.

## Booster criterion

The pattern is interesting if the increase in useful cognitive capacity is disproportionate to the additional resources consumed.

Do not require every run to produce an exceptional result. The target may be a change in the probability of rare, high-fecundity outcomes rather than only an increase in mean quality.

## First candidate problem

A useful first internal test is:

> Find a mechanism capable of increasing useful Fractanet cognitive capacity by roughly an order of magnitude without increasing compute, storage, or monetary cost by the same order of magnitude.

This problem has strong conventional attractors (caching, batching, quantization, routing, RAG, smaller models, distillation) while allowing structural reframing and later Reality checks.

A second test should use a domain less familiar to the evaluator to reduce corpus-specific bias.

## Failure is informative

Possible outcomes include:

- no measurable gain;
- higher novelty but lower truthfulness;
- higher quality but disproportionate cost;
- useful gain attributable only to extra compute;
- gain concentrated in particular problem classes;
- substantial Booster effect.

Record all outcomes. Do not promote Explorer/Conservator to a general architectural principle until repeated tests justify it.
