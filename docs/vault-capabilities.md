---
title: "Cogentia Vault capabilities: discover without disclosure, use without extraction"
date: 2026-11-09
last_modified_at: 2026-11-09
status: working-paper
document_role: source
document_kind: documentation
visibility: public
language: en
license: CC BY-SA 4.0
update_policy: UP-DEFAULT-REVIEWED
related:
  - cogentia-mcp.md
  - ../instructions/AGENTS.shared.md
  - ../research/integration/cloudflare_workers_ai_fractanet_2026-11-09.md
---

# Cogentia Vault: reference discovery without key disclosure

## Current live core

The canonical JHN application Vault is Inseme / Supabase
`public.instance_config`, scoped to root instance
`00000000-0000-0000-0000-000000000001`.
The Inseme `apps/platform/scripts/vault-catalog.js` reads **metadata only**:
`instance_id,key,is_secret,is_public,version,updated_at`. It never selects
`value` or `value_json` from the database. The query is scoped to JHN root;
`lib/vault-catalog.js` additionally refuses results from other instances.
No secret values, fingerprints, lengths or derived credentials are returned.

Cogentia has two new, generic, read-only CLI projections:

```
node scripts/cogentia.js config vault-list --prefix cloudflare_ --instance jhn --json
node scripts/cogentia.js config vault-describe --key cloudflare_api_key --instance jhn --json
```

Use `--registry <path>` or `COGENTIA_REGISTRY` if outside a registered
workspace. The output returns `jhn-vault:cloudflare_api_key`, classification,
version and `configured:true`. **Configured means the row exists, not that
its value is valid, nonempty or authorized for an effect.** The reference is
an opaque resolver key, *not* proof of access to a provider or a COP grant.

The same operation is exposed by a daemon endpoint
`GET /api/cli/config/vault-catalog` (loopback/admin private-read) and by
MCP tools `cogentia_vault_list` and `cogentia_vault_describe` (private-read,
not on the anonymous tool list). Both legacy and modern MCP frontends share
the same `cogentia-mcp-core.js` registration. MCP adapts to CLI/daemon to
Inseme: it does **not** open the Vault's SQL connection or store secrets.

Never add `vault.get_secret`, generic credential exports, raw bearer tokens,
provider API URLs accepting arbitrary destinations, or arbitrary shell helpers
to MCP. A model should only ever receive references and redacted receipts.

## Trusted execution contract (not yet implemented in this slice)

For a provider-specific effect:

1. Resolve `jhn-vault:<key>` as a *reference* to a credential, not an auth token.
2. Resolve a semantic capability and trusted provider implementation; validate
   the active Principal/Actor/Mandate, budget, provider target and effect scope.
3. Fetch secret material only in the trusted runtime immediately before
   invocation (not inside the reasoner, transport adapter, command args, Git,
   logs, generic stdout, agent-visible or agent-controlled callback).
4. Invoke an allowlisted provider-specific adapter, reconcile effect/receipt,
   and return only a redacted outcome and canonical COP evidence references.
5. Preserve revocation, rotation, lease/fencing and time-of-use semantics.

The present improvement **completes reference discovery across CLI/daemon/MCP**.
It does not claim that provider-specific trusted secret consumption is wired
for Cloudflare or other providers. Existing Inseme `config.js` and the browser
`credential.lookup`/`credential.fill` primitives are relevant prior art;
those browser primitives are not production MCP tools. Do not duplicate
the core or treat tool discovery as a use mandate.

## Verification

- Pure metadata tests in Inseme `test-vault-catalog.test.js` (no value leak,
  scope refusal, filter validation, bounded list).
- Live read-only catalog query from existing JHN Vault by key prefix on
  Fracta2: five Cloudflare entries, no secret values selected or returned.
- Cogentia `test-vault-mcp.js` verifies both MCP tools with a fake daemon,
  admin forwarding and anonymous rejection before daemon contact.
- `check-mcp-dual-era.js` and `check-capability-inventory.js` check MCP
  visibility and capability discovery. Source and published commits are not
  proof that running MCP services have already been redeployed.

## 2026-11-09 — trusted provider-side secret consumption building blocks

The next generic phase is implemented as **in-process libraries** (source-level,
not yet enabled on live provider dispatch):

- Inseme `apps/platform/scripts/lib/vault-secret-lease.js` exports
  `createJhnVaultSecretLease({client})`. Its `withSecret('jhn-vault:<key>',
  consume)` uses an exact `instance_id` **and** `key` equality predicate, checks
  tenant, secret/private metadata and nonempty value, and invokes the trusted
  callback while the secret remains in-process. Errors are redacted, including
  callbacks containing a secret in their exception message. There is **no**
  CLI, HTTP, MCP, logging or serialization surface for reading the value.
- Cogentia `scripts/lib/governed-provider-secret-use.js` exports
  `createGovernedProviderSecretUse({vault,authorize,providers,settle})`. It
  accepts a **trusted startup registry** binding an exact semantic capability,
  provider alias and Vault reference to a provider implementation. Runtime
  calls accept only the provider, semantic capability, bounded input and
  context; **no dynamic destination, credential reference or caller-supplied
  callback**. It requires a verified authorization result carrying principal,
  actor, issuer, mandate, effect authorization, budget reservation and exact
  provider/capability/credential matching **before** the Vault callback.
  It returns a fixed-schema receipt; neither the provider's raw response nor
  the secret may be spread into a caller-visible result. Completion or failure
  is handed to the injected settlement service.
- Cross-repository integration test executes the synthetic path:
  `authorization -> instance-scoped Vault query -> trusted provider callback
  -> settlement -> redacted receipt`. No external provider was contacted,
  no actual key loaded, no COP issuer/ledger was simulated as production.

**Trust boundary to complete:** production wiring must inject *independently
verifying* COP authorize/settle adapters, a service-role Vault client held
entirely within a constrained trusted process, and trusted provider adapters.
The caller cannot issue its own grants or bypass a revoked mandate. The
current functions check the returned grant structure and exact bindings;
they do not themselves validate a remote issuer signature, reserve funds or
implement replay-proof settlement. A caller's possession of an MCP token or
service-role key is not sufficient. Before enabling this path, enforce real
issuer verification, reservation/fencing and single-use effects in the
canonical COP store. Define provider-specific **safe result projections**
separately from the fixed receipt; never echo an untrusted provider response
through the generic secret-use envelope.

Because this is backend composition, adding these two libraries does **not**
require advertising any new MCP tool or asking ChatGPT to refresh an old
conversation. The existing `cogentia_vault_list` and
`cogentia_vault_describe` remain the correct discovery surface; actual use
is mediated through the future governed semantic provider dispatch, not
through a new `vault.get_secret` tool.
