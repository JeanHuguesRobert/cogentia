---
title: "Coding-agent privileged execution and dynamic browser extension architecture retrospective"
author: "Cogentia contributors"
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
date: 2026-11-06
license: CC BY-SA 4.0
language: en
status: working-paper
document_role: source
document_kind: engineering-note
visibility: public
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: "2026-11-06-post-form-assist-architecture-review"
  origin_date: 2026-11-06
  derived_from:
    - docs/navigation-assistant.md
    - research/integration/frederic_unix_super_pilot_closure_2026-11-05.md
review:
  status: unreviewed
  reviewed_by: []
---

# Coding-agent privileged execution and browser extension architecture review

## 1. Shell execution versus privileged authority

The connected Cogential Unix Shell Exec runs real commands on Fracta2 as `ubuntu` (uid 1001). Its `/proc/self/status` reports `NoNewPrivs: 1`, effective capabilities zero. `sudo -n true` fails explicitly due to `no new privileges`. Therefore this **particular shell transport** cannot elevate through sudo, but ordinary source edits, tests, GitHub updates, and unprivileged operations worked throughout.

A separate root-owned `cogentia-super.service` is running, with a root:ubuntu socket mode 0660. The 2026-11-05 Frederic pilot did use `execution_mode:super` via temporary bootstrap MCP and root broker to create a hosted Unix account, with a one-use bound grant and receipt. Its administrative-SSH issuer path was reachable from bootstrap and did NOT prove an independent human issuer security boundary; general COP approval/budget rules must not be inferred from one pilot. The available Cogentia_Private `host_process_prepare`, `side_effect_grant`, `host_process_run` family is also a possible governed route, not an automatic power to mint Principal authorization. The actual grant and issuer path for each privileged systemd/extension operation still requires an independent reality test.

Failure: the assistant treated the normal shell's sudo denial as sufficient reason to ask the Principal to run each root task, **without first discovering/checking the separate super broker that the Corpus already documented**. That violated the shared instructions to discover alternatives and minimize Principal attention. It is NOT established that all those root tasks would have passed actual authority verification, but checking was required.

In contrast, the Principal-side SSHSIG signature for each new mandate was necessary: the RSA private key remained on tweesic, and the Fracta2-shared mesh private key could not establish independent Principal approval.

Going forward report separately `advertised / reachable / authorized / tested` for normal shell, broker-super and independent personal signing. Prepare the exact command and recovery plan, check real authorization and budget, then execute via broker when demonstrably permitted; ask for Principal-side execution only on a real remaining boundary. Never bypass `NoNewPrivs` or counterfeit human-issued grants.

## 2. The original extension is a stable bridge with dynamic client libraries

Commit [`edaf9f3`](https://github.com/JeanHuguesRobert/cogentia/commit/edaf9f3), September 7, 2026, already implemented extension `page.evaluate` through CDP `Runtime.evaluate`, `page.insertText` through CDP `Input.insertText`, `browser-stdlib/navigation.js` and a separate Facebook adapter. `scripts/ops/navigation-assistant-tui.js` loads the stdlib and Facebook / Corse-Matin adapters dynamically from disk and forwards their JavaScript by RPC `page.evaluate`. `window.__cogentiaNavigationAssistant.adapters` is explicitly extensible while the generic API remains frozen. The [original guide](https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/navigation-assistant.md) documents the client-side script interpreter, and [#291](https://github.com/JeanHuguesRobert/cogentia/issues/291#issuecomment-6474435778) independently confirms this intended separation.

On Nov 6 the first form-assist prototype used the existing bridge in two steps: fixed JavaScript focus through `page.evaluate`, then `page.insertText`. The subsequent version `e853c7f` instead introduced a new extension RPC `page.form.fill` to combine the focus and native CDP insertion in one extension operation. Benefit: tighter grouping and one gateway request. Cost: extension version 1.0.18, privileged sync to a separate hosted checkout and worker reload. The running worker remained 1.0.17, producing a failed first real attempt (2 Inseme steps charged). This deployment coupling is precisely what the original dynamic-library architecture sought to avoid.

**Decision:** favor the thin, stable extension + dynamic client/daemon-owned, versioned capability recipes. The bridge should own transport, tab and document identity, CDP primitives and redacted receipts, not add a method for each site or form action. The MCP/COP gate authorizes **semantic operations and specific recipes**, not arbitrary `page.evaluate` scripts: arbitrary page JavaScript can submit or exfiltrate. A client recipe must not be able to bypass its mandate merely because the bridge can execute code.

### Atomicity and implementation direction

The original two-RPC focus/insert sequence has a race: another client or page script may change focus/navigation between calls. Lease coordination is not a security boundary. Design a **small generic transactional browser action protocol** (candidate `browser.actions.execute`) capable of validating tab, expected URL/origin and document epoch, then applying a bounded whitelist (`focus(fieldRef)`, `insertText(textRef)`, etc.) with one operation ID and redacted receipt. The client/daemon dynamically assembles typed workflows and context adapters; no new extension RPC should be needed for each recipe. A generic interpreter may require **one** protocol change to the extension, but later recipe changes should not. A single `Runtime.evaluate` with `document.execCommand('insertText')` may work in some editors; it is not equivalent to native CDP text insertion everywhere. Strict atomicity should not be claimed until tested.

Retain v1.0.18 `page.form.fill` as a tested transitional primitive; avoid adding specialized `select`, `click`, `login`, or bank-specific handlers in the extension. Treat external scripts and untrusted page content as data, not authority. Keep user secrets on separately protected channels, and prevent input text leaking through TUI/gateway event logs.

Acceptance: (1) add a new bounded recipe without modifying/reloading the extension; (2) prove no arbitrary JS authorization bypass; (3) fail closed on wrong tab/document epoch and concurrent clients; (4) retain canonical signed mandate, budget and redacted receipts. For privileged Unix effects, test existing super broker plus legitimate effect-specific authority before imposing human SSH, while preserving personal-signature requirements.

## FBF implementation on 6 November 2026

`scripts/lib/fracta-execution-route.js` explicitly differentiates normal shell, discovery of super, broker-reachable-but-unfunded authority, verified effect-specific super grants and independent Principal SSHSIG signatures. `scripts/ops/fracta-execution-route-check.js` probes `/proc/self/status` and sends **only** an unsupported read-only operation to the root broker, without an execution grant or effect. Live observation: `normal.uid=1001`, `NoNewPrivs=true`; broker socket reachable and answered `unsupported_operation`; decision `super_prepare`, `executable=false` because no exact issuer/payload/budget evidence was presented. A real `Cogentia_Private.cogentia_host_process_prepare` call for harmless `id -un` succeeded (EXPOSE only, never run); it did not mint permission. This is a repaired discovery/preflight path, **not** a proof that unattended super execution is authorized. A real positive super route still needs separately approved issuer and exact effect evidence.

`scripts/lib/browser-form-recipes.js` implements a small versioned **data-only** recipe registry in the daemon with explicit field-type selection and restrictions against secret autofill contexts. `scripts/lib/browser-form-recipe-runner.js` compiles a trusted recipe and bounded DOM structure into the already signed `john.request.v1` for `browser.form.fill`; it cannot grant permissions itself. This reuses the existing 1.0.18 generic operation, with **no extension source or installed worker modification**. A second real recipe `generic.first-email` selected field index 2 on the public httpbin form, and `Cogentia_Private` completed `fbf-recipe-demo-20261106-001`, 2 steps settled under the existing signed `mandate:jhn:form-assist`. Independent DOM readback confirmed the expected fictitious email (29 characters), `not_submitted:true`; budget changed to 6 steps settled / 506 available. The loaded extension remained 1.0.18. This proves the client-side recipe extension mechanism. The more ambitious generic script/transaction protocol, cross-origin frames, concurrency/epoch security and secret handling still need separate bounded implementation, not new business RPCs.

The canonical `instructions/AGENTS.shared.md` now instructs future agents to check the alternate governed super route before asking for Principal sudo and to preserve a stable browser extension while extending daemon/Core libraries. Tests cover missing grant, inability to infer authorization from broker reachability, independent personal signatures, recipe selection/refusals and existing governed John form routing.

## Second FBF cycle — client contract drift and evaluated client recipe

A **real** call to the connected Cogentia_Private `cogentia_host_process_prepare` tool with `execution_mode:'super'` was rejected by ChatGPT's typed connector validation (`additionalProperties: execution_mode was unexpected`) before any server call or effect; the published connected schema supports command length 4096, timeout 15000, and no execution_mode. The Cogentia source in `scripts/lib/cogentia-mcp-core.js` supports `execution_mode:normal|super`, command length 32768 and timeout 120000. `scripts/lib/connected-host-process-contract.js` and `scripts/ops/check-connected-host-process-contract.js` now produce a machine-readable two-tool drift report from a dated **observed** connector schema fixture. They do not change plugin permissions, authorize a super grant or execute anything. The connector contract needs refresh or an intentional documented attenuation by the plugin integration operator. Never smuggle a privileged mode through another argument to evade schema validation; never equate server-side source support with a callable connected tool.

In parallel, `scripts/lib/browser-form-script.js` compiles a pre-reviewed, nonsecret input-only recipe to **one existing `page.evaluate` RPC** using DOM focus plus `document.execCommand('insertText')`, with no arbitrary caller-supplied code. `createHostedBrowserCapabilities({formFillBackend:'client-script'})` is an explicitly opt-in backend; existing production native `page.form.fill` remains the default. Browser execution was tested on the httpbin form under the *real signed* `mandate:jhn:form-assist` through an in-process authenticated **fixture transport**, not through a refreshed ChatGPT production MCP connector. First test on `input type=email` failed because `setSelectionRange` is unsupported there; two bounded budget units were settled and the field was not changed. That type is now excluded from the script backend and remains supported by the established native CDP backend. Second real test on an ordinary `input type=text` succeeded with a tool receipt and two units settled; independent DOM readback confirmed 34 exact fictitious characters present and no form submit. Total form budget after these tests: 10 settled, 0 reserved, 502 available. Loaded Chromium extension remained 1.0.18 throughout, without modification or reload. The script backend must not be used with credentials, sensitive data, email-type inputs, complex editors or arbitrary JavaScript; it is still optional until wider interoperability tests pass.

This is a concrete return to the original client-generated code protocol, while retaining proven native-input fallback. It also exposes a material distinction: `page.evaluate` is a powerful bridge primitive and **never itself establishes COP authority**; only the signed semantic form mandate and guarded John execution path can admit the operation.

## 23–26 November 2026 — InoxBrowser, from fixed recipes to reusable behavior

The Principal directs incremental migration of reusable navigation behavior
into Inox source verbs, executed by JavascriptInox through the ZeroBrowser
host adapter. Retain the stable generic CDP bridge and COP semantic
authorization. JS/DOM projection is a host boundary, not the Inox object
model. Preserve existing recipes as observable references; introduce no
production migration before comparative evidence.

Cogentia [5301f9a](https://github.com/JeanHuguesRobert/cogentia/commit/5301f9a)
provides the cross-origin frame transport fixture;
[9b159b4](https://github.com/JeanHuguesRobert/cogentia/commit/9b159b4)
and [6eeb590](https://github.com/JeanHuguesRobert/cogentia/commit/6eeb590)
add the optional Inox selector and parity gate. The default selection
remains unchanged. The current adapter creates a fresh bounded VM per
selection (100,000 instruction budget, maximum 80 fields). The latest
Inox experiment [ea1da5f](https://github.com/JeanHuguesRobert/Inox/commit/ea1da5f)
passes 137 tests and the disposable Chromium cross-origin OOPIF fixture:
same selected field index 2, 17 fictitious characters inserted, no submit;
hosted browser untouched. This is not production connector verification.

See the [Inox experiment](https://github.com/JeanHuguesRobert/Inox/tree/master/experiments/javascript-inox),
the [materialization doctrine](https://github.com/JeanHuguesRobert/Inox/blob/master/research/two-versions-scripting-vs-system.md)
and the continuing [packet #291](https://github.com/JeanHuguesRobert/cogentia/issues/291).
The next implementation step is method dispatch convergence, not a new
browser-specific RPC.

## 27 November 2026 — InoxBrowser unique-field dogfooding

The explicit generic.unique-text@1 recipe requires exactly one eligible
ordinary text input. It rejects ambiguity instead of selecting the first
candidate. The optional comparison registry runs the new Inox image on
the same bounded metadata, using native object Cells and the existing
sensitive-field predicate. It accepts no deviation from the reference
plan. Existing first-match recipes are unchanged. The isolated Chromium
fixture verifies plan equality, insertion of 17 fictitious characters
without submission, and rejection of a synthetic duplicate in observed
metadata; cross-origin transport checks remain in place.

A separate pre-existing discrepancy is now recorded: generic.first-email
produces a planning result, but the current plain-input client-script and
native BiDi fill backends exclude email (and number). The fixture's email
comparison was planning only, not an end-to-end email write proof.
Do not broaden backend field policy merely to obtain a green recipe test.

### Principal decision — general text editing, not email-specific recipes

The Principal confirms that the semantic abstraction should be editing text
in an identified editable element, independent of CDP/BiDi/DOM. Distinguish
insert-at-selection from replace-all; these are different observable effects.
The existing Chromium page.form.fill focuses and inserts, while the Core
DOM script selects and replaces. Native BiDi page.insertText operates on an
already focused input and checks caret and content. It is not yet a form.fill
route. The successful legacy email demonstration on 6 November remains valid;
the newer DOM and BiDi exclusions are backend-specific, not a general
prohibition on non-secret email text.

The first FBF increment centralizes the existing plain-input support profiles
in browser-text-edit-contract.js. DOM script and BiDi native input use the
same declared type subsets as the planning model. An explicitly configured
form recipe registry checks the selected profile before producing a plan;
the default preserves legacy CDP semantics, and an unrouted native BiDi
profile cannot generate a form.fill plan. The real Chromium comparison
fixture now configures the actual dom-replace profile and verifies that an
unsupported edit is rejected before producing the John request. No new
authorization, input type, RPC or transport route is introduced.

This is a preflight contract, not yet automatic provider negotiation:
the trusted caller must choose the matching registry for its execution
route. Native BiDi focused insertion also has independent text/length and
selection constraints. UID/realm binding and current DOM revalidation
remain executor responsibilities. A future ZeroBrowser edit interface
should express operation, target and desired text, select a proven
implementation before dispatch, and verify the intended resulting content
without retrying uncertain edits. Preserve existing tested paths while
converging on that contract. Do not treat a type name or a successful
keypress as proof of complete replacement.

### Principal decision — generalization requires subtraction

A proven general capability should subsume its narrower predecessors:
migrate callers and regression cases, remove the redundant names and
implementations, and retain historical evidence in version control rather
than in the active API. Do not confuse distinct semantic operations with
redundant names. Keep an operational transport or authorized contract until
its replacement has actually passed the corresponding end-to-end checks.

The experimental selector now has one versioned recipe,
generic.select-input@1, with explicit field_type and selection (first or
unique). Removed generic.first-text, generic.first-email and
generic.unique-text, the firstTextSelector compatibility hook and the
registry of trivial type-specific recipes. A single Inox select-field
image and native object projection replace three selector images. All
in-repository call sites migrated; the old identifiers fail explicitly.
These names were internal planning/fixture API, not MCP capabilities or
signed mandates. The underlying browser.form.fill request envelope,
transport contracts and edit profiles remain unchanged. The real fixture
tests both selection policies, unsupported edit rejection and actual text
insertion. No production change.

### Common text-edit intent and actual replacement on both engines

The same Inox selector image now exposes plan-text-edit, a pure
native Inox object describing operation and selected index. It does not
perform the effect. The Core validates and compares the intent, requests
identity-aware observation for replace-all, and binds the selected index
to its exact browser, tab, document epoch and element UID. The existing
browser.form.fill UID route selects the common DOM replacement recipe
over CDP or managed BiDi without the caller supplying a backend profile.
Legacy index-based insertion remains distinct. The experimental planner's
editProfile option and formPlan flags were removed; they duplicated the
routing choice now implied by the semantic operation and target.
The executor also revalidates document and target identity after editing,
so a matching value on a detached element cannot prove success.

The shared fixture browser-inox-edit-reality.mjs executes the same image
and operation through actual disposable Chromium and Firefox 158.0.1,
with nonempty starting values, exact independent readback, ambiguity
rejection, UID binding and no submit. Chromium also rejects unsupported
email replacement and passes existing OOPIF checks. The first Firefox
suite stopped at a multi-MCP composition timeout before the new proof;
the second run placed the proof before composition and passed both it
and the full worker/provider fixture. No personal browser or production
deployment. The first convergence covers non-secret ordinary top-level
text inputs, not arbitrary editable elements, every engine-specific
input type, or a general asynchronous effectful Inox VM. The fixture
executes the existing semantic capability after comparing the prepared
John request; it is not a new production COP admission proof.

### Common editor abstraction

The internal recipe generic.select-editable replaces generic.select-input,
without an alias. For replace-all, field_type is optional: the planner
projects operation-compatible editable candidates (ordinary supported
inputs, textarea, explicit contenteditable) into the same Inox image.
The VM receives only editable, disabled, readonly and autocomplete
metadata, not DOM tag/type or element identity. The Core retains UID and
the implementation kind; only the existing rich-text execution envelope
carries field_kind. The legacy insert-at-selection operation still
requires its input-type filter; unsupported email/number replacement
remains excluded. Selection and ambiguity are compared independently
against the JS reference. Rich-text execution now checks aria-readonly
and the autocomplete attribute, and cannot bypass input-type checks
by labelling an input as a rich editor.

Real disposable Chromium and Firefox fixtures verify the same image
and untyped replace-all intent on input, textarea and contenteditable,
with independent exact readback, Unicode/multiline text, no submission,
and actual mixed-editor ambiguity without modification. Existing
cross-origin and Firefox multi-MCP/worker checks pass. No new capability,
transport or signed mandate; no production deployment. The rich-text
contract concerns textual content, not formatting or every application
editor. The source change is intentionally not an additional selector.

### 27 November — site knowledge as composable semantic observations

The Principal confirms the two orthogonal axes: browser-engine adapters
materialize generic operations, while site libraries capture local
procedural knowledge. Reuse the September Facebook adapter rather than
introducing Facebook-specific transport methods or a competing library.
The first production candidate is facebook.comment-composer: a reviewed
site matcher in browser-stdlib/adapters/facebook-editor.js, used both
by the old TUI adapter and by identity-aware observation/editing.
The Core chooses the matcher by parsed HTTPS domain, injects only the
pure function, and projects a bounded allowlisted semantic_role, never
the personalized aria-label. Generic Inox selection receives a role
filter (empty = any); no site-specific VM primitive or extra image.
The default site-role planning path uses the pinned Inox runtime
and checks parity with the JS reference. The runtime pin is
browser-stdlib/inox-runtime.json; a composed MCP release contains its
sibling Inox experiment tree with matching REVISION.

The existing UID-bound browser.form.fill envelope accepts an optional
semantic_role as a narrowing constraint; canonical admission still
requires the same signed mandate, scope and budget. The same matcher
rechecks role before focus, before insertion and after insertion.
A changed role before insertion is stale; after insertion it is an
unconfirmed effect, never an automatic retry. No new capability,
extension RPC or broader effect permission. The legacy Facebook
paragraph formatting methods remain because their precise behavior is
not yet subsumed by generic replacement.

Chromium and Firefox 158.0.1 real disposable fixtures serve a local
synthetic Facebook page under browser-local DNS mapping (no live
Facebook contact), with a comment composer and unrelated reply editor.
The same image selects the correct UID, replaces 17 characters without
submission, independently reads the result, and rejects a same-UID
role change. The original full-adapter injection exceeded BiDi's
16000-character code limit; extracting the canonical pure matcher
fixed the root cause without raising the limit. Existing OOPIF and
Firefox multi-MCP fixtures pass. Repaired old Corse-Matin tests by
providing WebCrypto to their mock browser, required since UID support.
Live site labels remain an empirical question; no social draft or
publication has been modified.

### Edit context, first empirical relationship (2026-11-27)

Dogfooding a published Facebook comment manually opened in edit mode
shows two contenteditable controls with identical composer labels.
Existing role-only selection is insufficient; the original comment
permalink disappears from the browser text projection while editing.
Do not infer persistent object identity from editor text, ordinal or
mere presence of a cancellation control.

Extend the existing identity-aware structure observation, not the
effect API. For a recognized Facebook composer, inspect at most twelve
ancestors, stopping before a scope containing multiple editable
elements. Recognize only a local rendered Annuler/Cancel affordance,
deduplicate nested labels and controls, and reject ambiguous matches.
Return typed edit_context evidence: scope_uid, cancel_uid,
ancestor_distance, actionable. This is a candidate contextual relation,
not a validated edit session or new grant. No draft values or labels
are returned. Existing composer roles and edit operation contracts
are unchanged until the live observation establishes their successor.

The same disposable Chromium and Firefox fixtures verify two composers
with identical labels and independent drafts: only the editor with
its own cancel control has an edit_context; its scope UID is stable
across observations; removing the control removes that evidence.
No personal page edits. Thirty-two targeted tests pass in the
composed checkout, and both full browser fixtures pass.

### Real Facebook replacement failure and FBF (2026-11-27)

The Principal reopened the same published comment in edit mode. The
new editor received a new UID; the separate new-comment composer
retained its UID. The existing governed form-assist attempt targeted
the correct editor, but independent readback showed the old and new
texts concatenated, with the inserted paragraph breaks lost. COP
returned form_result_not_confirmed. The Principal cancelled; a fresh
readback confirmed the published original unchanged. The Principal
also reports the loss of line breaks during ordinary manual pasting.

Reuse the established Facebook paragraph behavior in a single
site-library function shared with the legacy TUI. A role-bound rich
text replacement first issues delete on the selected content and
requires verified emptiness before insertion. An ignored delete
must stop without append. Insert explicit paragraph operations
instead of sending embedded LF through insertText; check the same
UID, role, document and focus before each operation. Verify the
readback, treating multiple blank lines as equivalent paragraph
separators, not collapsing single-line boundaries or text. Never
submit or automatically retry. Keep the existing COP form envelope
and generic non-Facebook materialization unchanged.

34/34 focused tests, including a simulated ignored deletion and
paragraph-losing insertText, and disposable Chromium and Firefox
full fixtures pass with independent multiline readback. The real
Facebook editor remains the next acceptance test; the local browser
fixtures do not implement Facebook's controlled-editor internals.
