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
