---
title: "Generic governed browser form input — design and first implementation"
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
  origin_ref: "2026-11-06-issues-291-299-generic-form-input"
  origin_date: 2026-11-06
  derived_from:
    - research/integration/john_root_sshsig_procedure_2026-11-06.md
review:
  status: unreviewed
  reviewed_by: []
---

# Generic governed form input, not a site-specific banking workaround

The Principal explicitly requires a **generic** automation capability for data entry on websites, not any bank-specific selector or exception. Existing `browser.hosted.interact` supports `insert_text` in a field **already focused**, while `browser.hosted.evaluate` admits arbitrary JavaScript with broad external effects. Neither is the appropriately scoped generic field-entry grant.

Initial new `browser.form.fill` capability performs narrowly bounded non-secret input into a specific index of an editable input/textarea/contenteditable in a specifically identified hosted tab and exact expected HTTPS URL. It focuses a field by fixed pre-reviewed script (no caller-supplied JavaScript), excludes password, OTP, hidden controls and submission widgets, inserts native text, and returns a redacted length-only receipt. No submit/click/navigation is implied. Existing navigation gateway lease and URL checks apply, but leases are **not** an authority grant. A message entered into a third-party form is not authorized for delivery merely by being typed.

**Implementation boundaries:** current version targets only the top-level document, not an independently hosted iframe; cross-origin iframe handling requires a target frame identity (CDP execution context) and exact origin binding without violating browser isolation, with regression tests. The caller must supply non-secret text; the present extension/gateway `page.insertText` route is not certified for credentials or secrecy-preserving logs. The caller must not put passwords, OTPs, banking secrets or other sensitive credentials through this generic path. Additional tests are needed for actual focus/insert end-to-end, races between focus and insert, field identity changes, prompt injection in page content, and correct redacted receipts. The first implementation and tests do NOT constitute a live deployment.

**Authority:** first signed root `mandate:jhn:john-root` v1 currently only allows `browser.navigation.instances` and `browser.hosted.inspect`. `browser.form.fill` is NOT included. It must be granted through a new, independently approved version or child mandate, bound to authenticated actor, current valid issuer, exact tab/context/capability, canonical CAS budget reservation, reconciliation and reviewable trace. Reuse #299 COP and #291 navigation infrastructure, avoid any special-case banking privilege. Classify typing as internal recoverable only when text is non-sensitive, no submission or publication occurs and rollback is reasonably available; security-sensitive login data require distinct guarded credential-handling authority and a trusted local vault/fill channel. Some websites may classify even writing an unsent field as sensitive, in which case stop and request appropriate grant.

## Gateway/extension consolidation, 2026-11-06

The initial focus-then-insert was two independently routable RPCs. It is now a single `page.form.fill` RPC to the extension, which selects an exact tab and URL, applies a fixed shared DOM field-selection policy, checks focus success, rechecks document URL, and invokes native CDP `Input.insertText` before returning a length-only receipt. The gateway treats the new RPC as a tab-lease guarded operation. The shared DOM selector matches the `browser.hosted.inspect` structure field ordering, including buttons/selects which are excluded as fill targets. The MCP capability also requires affirmative, matching extension insertion receipts; otherwise it refuses to claim success. The browser extension manifest is bumped to 1.0.18; its updated worker must actually be loaded in hosted Chromium before the capability can be operated.

The extension does not invoke `submit()` or click any button, **but a website's own JavaScript can react to input/change/focus events and possibly transmit typed data**. Therefore no blanket guarantee of no external effects is valid. Require an explicit non-sensitive context and conservative exposure classification; credentials, OTPs, personal banking IDs and private data are not yet approved for this channel. Cross-origin iframe selection is still not implemented. These remaining limits require separate hardening and end-to-end hosted-Chromium validation.

This change does not authorize browser input under the currently signed root mandate. New scoped approval and canonical budget admission are required to enable it.

## Separately signed form-assist mandate and opt-in dispatcher (2026-11-06)

The new proposal `research/integration/approvals/john-form-assist-v1.proposal.json` has the exact hash `sha256:82852d8947fa1b74cd425499cd892e0f53db41de65631be4b00628e03e167536`. Its separate `mandate:jhn:form-assist` is **not** an expansion of `mandate:jhn:john-root`; instead, it independently allows only `browser.form.fill`, with `max_steps=512`, `max_delegation_depth=0` and all reserved third-party acts forbidden. Validity 2026-11-06 through 2027-11-06 UTC. The approval namespace is `cogentia-john-form-assist-v1` so a signature for the read mandate cannot authorize this distinct action. The `Principal` must sign these exact immutable bytes with their private RSA key on `tweesic`; possession of the MCP tunnel token is never sufficient.

Implemented `verifyFormAssistApproval`, `issueFormAssistMandate` (atomic `MandateDeclaration` plus `ExecutionBudgetGrant` in **the existing Inseme store**), a separately verified issuer callback and `scripts/ops/issue-john-form-assist-sshsig.js` for verified one-time issuance. An existing mandate is not overwritten. The signer private key must remain on the Principal workstation. No such real-world signature has yet been received for this proposal.

The `capability_once_bounded` John handler now requires a trusted server-side opt-in `approvedBoundedOnceCapability='browser.form.fill'`; unlike the older read-only deterministic handler, it permits precisely one approved internal-recoverable form action. The tool-request events redact `text` and other contextual values. The canonical `executeJohnCanonicalForm` gate checks authenticated JHN transport, exact request envelope, issuer signature, mandate validity/version/revocation, budget grant and reserve-before-effect; it then reconciles usage, refuses duplicate request IDs and reports uncertain settlement as such. The hosted-browser capability is **removed from the legacy MCP capability inventory**: only the special form route may receive it when `COGENTIA_JHN_CANONICAL_FORM_ENABLED=1` and the separate signed mandate exists in Inseme. Other capabilities keep their previous treatment. All of these changes are disabled for the current MCP session until explicit activation.

Tests: real generated RSA signing in disposable fixtures, canonical issuance/refusal of duplicates and revoked authority; separate bounded handler denial without server opt-in; MCP router refuses with the flag off (`canonical_form_not_enabled`) and with an unissued form mandate (`issuer_provenance_unverified`). The complete fixture test admitted one synthetic form tool call and settled 2 units; replays and revocations prevented a second call. The root-read budget on Fracta2 is untouched by these tests. The root-only activation helper `scripts/ops/activate-john-form-assist.sh --check` currently fails **as expected**, because no production form mandate exists.

**Limitations remain material:** current DOM targeting is top-level only; independently hosted cross-origin iframe fields need a separately tested frame execution context and exact origin binding (#291). The extension service worker update must be loaded in hosted Chromium. A webpage may autonomously send entered data when an input event occurs; no explicit submit/click is performed by Cogentia but this is not a guarantee of zero third-party effects. This grant is for non-secret text only. Any identity/credential/vault workflow, especially banking usernames and passwords, requires a separate controlled channel and privacy review. Do not classify a text as benign solely because an input control has type `text`.
