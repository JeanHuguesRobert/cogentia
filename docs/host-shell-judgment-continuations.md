# Shell jobs: bounded concurrency and inversion of control

## Existing architecture
The native Unix provider is behind the semantic `host.process.run` capability, the host router, the EXPOSE/grant path and COP accounting. MCP is a facade, not a new authority.

The provider now uses a FIFO queue, serial execution by default (`maxConcurrent=1`), configurable parallel execution, and bounded pending work (`maxQueued=32`). This is per provider instance, not a distributed lock. Jobs must still carry an independently validated mandate and one-use authorization.

## Judgment handoff (design contract, not yet implemented end to end)
A shell job needing a discretionary decision **must suspend** rather than prompting for input or continuing with a default answer.

1. The job emits a typed Cogentia continuation using the existing `cogentia.js continuation emit` / core continuation mechanism. It carries the question, alternatives, contextual evidence, originating job ID, mandate, deadline and a deduplication key.
2. The job returns a structured `needs_judgment` outcome containing the continuation ID, **without consuming a decision**. Its current invocation ends; it does not leave an interactive shell blocked waiting for ChatGPT.
3. The ChatGPT client, using Cogentia Private, invokes `cogentia_continuation_inspect`, judges the request within its mandate and calls `cogentia_continuation_resolve`. Unknown authority, third-party commitments and high-risk effects must be escalated to the human Principal rather than silently authorized.
4. A new, separately authorized shell invocation resumes the durable workflow by reference to that resolved continuation. It validates the decision, provenance and freshness before applying it. Do **not** replay the original command blindly.
5. A cancelled, expired or unresolved continuation must never become permission to proceed. Every judgment and subsequent effect is traced via existing COP mechanisms.

This preserves the existing `cogentia.continuation.v2` protocol, separates the worker from the judge, and allows the resolver to be ChatGPT instead of Codex. The worker must not forge or resolve its own judgment.

## Remaining implementation
- Bind an actual shell job ID and durable resume pointer to a typed continuation.
- Surface `needs_judgment` as a first-class host capability result rather than parsing arbitrary output text.
- Test shell emit -> ChatGPT inspect -> resolve -> independently authorized resume, including cancellation, duplicate delivery and crash recovery.
- Establish per-node capacity and fair scheduling across clients; the current queue lives in one provider process.
- Ensure execution authorizations are reserved atomically before concurrent side effects to avoid concurrent replay races.
