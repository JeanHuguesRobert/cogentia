---
title: "MultiMCP programmable composition — JavaScript and Alan reality slice"
author: "Cogentia / Institut Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-11-24"
last_modified_at: "2026-11-24"
status: working-paper
document_role: operational
document_kind: implementation-note
visibility: public
lifecycle_state: active
update_policy: UP-DEFAULT-REVIEWED
license: CC BY-SA 4.0
language: en
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: main
  origin_date: "2026-11-24"
  derived_from:
    - ../research/locality_principle.md
    - ../research/fractacognition_principles.md
review:
  status: unreviewed
  reviewed_by: []
---

# MultiMCP programmable composition — working prototype

## Ownership and reuse

This implementation reuses Cogentia #80 (typed capabilities), #233
(situated discovery), #36 (Alan), #336 (continuations), Inseme #186
(distributed compositions) and Cogentia #342 (mediated capabilities).
No new global registry, scheduler, model router, or work ledger.

- **scripts/lib/multimcp-program.mjs** exposes search, describe and
  execute over injected MCP connections. The connections supply
  their own tool descriptions through tools/list and execute through
  tools/call. Each provider retains its own authority.
- **scripts/lib/multimcp-program-worker.mjs** runs inside a Linux
  Bubblewrap process with its own filesystem and network namespace.
  The host only mounts Node, its shared libraries and the child's single
  source file. Node's permission model additionally disables filesystem
  writes, network, spawning, workers and the inspector; environment variables
  are deliberately reduced to PATH and LANG. Every tool request returns
  to the separate host process for admission.
- **scripts/lib/multimcp-cop-bridge.mjs** composes this existing runtime with
  the canonical COP Task pilot, COPScheduler and COPJobScheduler. It uses a
  host-supplied source journal and verified dispatch-authority resolver; it
  creates no competing ledger or scheduler.
- **scripts/lib/multimcp-mcp-surface.mjs** supplies the opt-in
  multimcp_search, multimcp_describe and multimcp_program_execute MCP tool
  descriptions. The execution tool can only return a Task created via COP;
  it cannot fall through to an unjournaled synchronous invocation.
- **scripts/lib/mcp-tasks-adapter-compose.mjs** composes existing and
  program-specific MCP Tasks adapters by their packet-owned creation
  events, without synthesizing authority or task identities.
- **scripts/lib/multimcp-service-runtime.mjs** connects that surface
  to the existing HTTP Cogentia Core and uses the pre-existing local
  committed COP SQLite source. It never creates a store, secret or mandate.
- **Alan v0.2** uses its existing parser and state machine. Its tool
  suspension is fulfilled by the very same MCP host invocation, and
  the resulting step is returned to the interpreter with the original
  suspension correlation. No parallel Alan evaluator is created.
- **Ritornu** source now declares the two genuinely informational tools
  ritornu_health and ritornu_boundaries as read-only by MCP annotations,
  avoiding an exception list maintained by MultiMCP.

The provider names (cogentia, ritornu) scope one execution and are not
a global catalog. Actual discovery of providers remains situated in the
hosting Fractanet locality.

## Current interface

The host creates a runtime with a providers map of actual MCP core/client
connections and an optional authorizeCall callback (reusing the existing
authority chain). The runtime supplies three methods:

- search({query,provider,limit}): inspect supplier-provided descriptions.
- describe({provider,name}): return a supplier-provided exact tool schema.
- execute({language,code,inputs,context,timeoutMs,maxCalls}): run a
  program against the same per-call authorized capabilities.

JavaScript programs invoke tools PROVIDER.TOOL(args) through the tools
namespace. Alan programs declare MCP externals PROVIDER.TOOL and use
their existing caller-mediated suspension and resume contracts; their
output type for the initial test is a record containing value:any.
Inox can join the same contract as its execution engine matures,
without altering the concurrent l9 work-in-progress.

## Reality Tests and limits

Catalog discovery reports every tool the source MCP advertises, regardless
of its current admissibility. The described source annotations are retained:
readOnlyHint=true identifies a candidate for the current read-only executor;
all other tools are classified governed_effect. The host checks admissibility
at invocation; a missing/unsigned mandate never makes the capability
disappear from discovery. A synthetic ChatGPT delegate is tested as an
effectful (non-read-only) capability: it is visible but NOT callable by the
current read-only program executor. ChatGPT's actual CPS dispatcher requires
its own signed provider permission, budget, submission receipt and correlated
MCP result; discovery alone authorizes none of those acts.

The executable test exercises the actual Cogentia and Ritornu MCP cores
without any separate registry. It verifies both languages, multiple
sequential and parallel calls, full source-owned discovery, per-call admission,
budget refusal, unsupported languages and a worker deadline. The
existing Alan and Ritornu tests are validated independently. The same
catalog boundary also describes a synthetic mediated ChatGPT provider,
deliberately limited to a declared delegation capability without executing
it; it does not export ChatGPT's private tool catalog.
Both JavaScript and Alan have bounded program deadlines; a late response
from a provider is not treated as a completed program. A late authorization
response cannot trigger a new tool dispatch after the program deadline.
An explicit intrusion test attempts to escape node:vm through the tool
stub's host-realm constructor; kernel network and filesystem namespaces,
the minimal process environment, and Node permissions deny access to
the host's source files, network services and credentials.

The COP bridge has end-to-end tests for both languages using genuine
Cogentia and Ritornu MCP tools, a local committed COP/FractaLog source,
autonomous scheduled dispatch, durable Task results, restart without
duplicate execution, separate verified dispatch and per-capability
admission, and skipping foreign-tool packets in the same source store.

### Optional HTTP composition and observed tests

The HTTP source service now constructs the MultiMCP runtime only when the
literal flag COGENTIA_MCP_MULTIMCP_ENABLED=1 is present. Without it, all
MultiMCP extras are absent, and no COP file is opened for that feature.

When enabled, it requires the already existing values
COGENTIA_MCP_TASKS_COP_DATABASE, COGENTIA_MCP_LOCAL_INSTANCE_REF,
COGENTIA_MCP_LOCAL_STORE_ID, COGENTIA_MCP_JHN_MUTATE=1 and
COGENTIA_MCP_JHN_TOKEN. The SQLite file must already be a committed COP
source with cop_events and cop_topic_commitments. Its source provider
is the local Cogentia MCP core, excluding its own MultiMCP tools to
prevent recursive catalog discovery; additional local providers may be
injected by the host. The JHN credential authenticates the caller;
this demonstration does not claim a signed COP mandate for write
operations, and execution is limited to supplier-declared read-only tools.

The two informational tools are discoverable to anonymous callers.
Execution is advertised only to JHN-attested callers when a durable
Task adapter exists, and per-request checks revalidate the identity.
A caller cannot read another caller's Task simply by guessing its id.
Each program's capability invocation is individually checked at dispatch.

The regular MCP Tasks adapter and the MultiMCP adapter share the same
COP source file and are composed into the Core's one Tasks interface.
Their own creation events distinguish Task families during recovery.
No second scheduler or catalog is introduced.

The tests include:
- source-level tool discovery and a complete Task cycle through the
  actual Cogentia MCP Core;
- a temporary real HTTP MCP process, a local COP journal, unavailable
  external daemon, a completed JavaScript program, and result retrieval
  after process restart;
- concurrent support for ordinary pattern-list Tasks and MultiMCP
  program Tasks, both verified after restart in the same journal;
- rejection of anonymous Task reads, invalid Tasks and missing
  activation prerequisites.

**Status: tested in source and a temporary local HTTP process. The
live mcp-cogentia.service has not been upgraded or enabled.**

**Status: local, Linux-only execution prototype.** Linux Bubblewrap provides mount and network namespace
isolation, and Node --permission supplies additional capability
restrictions. node:vm is not treated as the isolation boundary. Execution
fails rather than silently removing isolation when Bubblewrap is
unavailable. The host still controls the actual MCP operation; a deadline
cannot revoke a provider call that was already dispatched. Authoritative
admission remains the responsibility of the host's existing COP authority
chain, not the tool annotation.

Programs can now be attached to canonical packet-local COP Task persistence
**internally** through the bridge. A production MCP surface, actual actor
and mandate resolver, sharing of source histories among tool families,
and cross-instance deployment remain separate integration steps. Alan's
current same-process interpreter is governed by the host and its own bounds;
only JavaScript executes inside Bubblewrap. Inox is not yet enabled.
Do not invent another task store or scheduler.

## Governed effect continuations (Alan / COP / CPS)

Alan now has an explicit internal stepAlan pathway in the existing
MultiMCP execution engine. It runs read-only calls through the ordinary
host admission checks and returns a serialized native Alan suspension
when encountering a non-read-only capability. It never invokes that
provider merely because its tool appeared in MCP discovery.

The existing createCopMcpTasksPilot recognizes this suspension as an
input_required Event in the same Task Packet local FractaLog history.
It retains Alan's complete saved state and Side positional slots, plus
the source MCP name and input arguments. Generic MCP tasks/update
cannot pretend to satisfy this externally governed checkpoint.

The host-only acceptVerifiedExternalResult checks the trusted
result verifier, journals a causal receipt in the same Packet and wakes
the existing COPScheduler. It uses one claim per continuation stage,
so a crash after a claim cannot silently repeat an uncertain effect.
Multi-stage jobs are identified in the scheduler by their Packet AND
their current resume stage; this is an in-memory projection, not a
new scheduler or identity authority. Alan resume() validates the code
hash, checkpoint digest, saved slots and response schema.

For ChatGPT, multimcp-cps-return.js projects a stage-specific
CPS assignment reference from the Task Packet and Alan slot ordinal.
The canonical CPS assignment API already exists in
chatgpt-cps-assignment.js; it checks the current signed John mandate,
reserves the existing COP budget and claims its OWN CPS continuation.
The MultiMCP verifier observes the separate CPS source journal,
requiring a correlated declared continuation, source history commitments,
a browser dispatch receipt, recognized and accepted result events in
their canonical order, scheduler wake, completed handler receipt and
actual execution budget settlement. It derives the answer from the
accepted result Event, NEVER from the invoker's candidate text.

createMultiMcpServiceRuntime accepts an optional host-supplied
cpsStore (which may be in a different logical locality), and exposes
internal pendingCps({taskId,auth}) and
acceptCanonicalCpsReturn({taskId,auth,continuation_id}). These APIs
reuse the already resolved caller and existing Packet histories; they
do not register another MCP tool or create a broker, browser session,
central ledger, mandate or scheduler. Without a supplied canonical
CPS source the external return remains unresolvable, not silently
accepted.

Reality Tests:
- The first program executes a read-only MCP call, suspends on
  chatgpt.delegate, restarts the process, rejects forged
  tasks/update and an unverified return, then resumes with a
  verified fixture receipt; the already acquired slot is not replayed.
- A two-step Alan program proves that consecutive governed suspensions
  retain ordered slots, one total call budget and distinct scheduling
  stages without duplicate provider dispatch.
- A verifier fixture uses the real signed John root issuance and
  CPS assignment to show that a click, candidate answer, incomplete
  correlation or unsettled budget do not complete the suspension.
  Only synthetic test receipts emulate the browser return.
- Two independent SQLite COP localities demonstrate a complete
  local Task to signed CPS assignment to accepted receipt to Task
  resumption, with cryptographic source commitment audits in each.
  There is no live ChatGPT submission in these tests.

Integration frontier: connect the already-running CPS result ingress/wake
in its owner service to the internal acceptCanonicalCpsReturn callback
after receipt evaluation, using the actual currently signed
MandateDeclaration and provider permissions. No browser or provider
effect is enabled by this source publication. The service MCP remains
opt-in; JavaScript does not yet have a durable Side-style suspension
equivalent, while Alan does.

ChatGPT is a mediated capability rather than a direct export of the
private catalog of its connected tools. Cogentia #342 owns mediated
capabilities; #335 owns the OpenAI-compatible ChatGPT provider, and
#330 owns the correlated governed MCP return. This prototype does
not invoke the consumer-browser path.
