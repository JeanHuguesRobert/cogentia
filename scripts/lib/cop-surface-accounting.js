/**
 * COP surface accounting for Guide / Agent John.
 *
 * Uses the real @inseme/cop-kernel packet accounting (Cognitive Packets):
 * mandate, budget reservation, hops, own_spend, upstream/downstream cascade.
 *
 * Surfaces must NOT invent a parallel ledger. They open a treatment packet,
 * record provider spends as ProvisionalSpending lines, and spawn downstream
 * packets for sub-steps — never copy spend lines across packets.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {null | Promise<object> | object} */
let copModulePromise = null;
/** In-memory registry for cascade resolve (process lifetime). */
const packetStore = new Map();

const DEFAULT_ACCOUNT = "https://jhn.baronsmariani.org/";
const DEFAULT_MANDATE_GUIDE = "mandate:fractavolta-public-guide:readonly";
const DEFAULT_MANDATE_WHATSAPP = "mandate:agent-jhn-whatsapp:experimental";
const DEFAULT_TREATMENT_GUIDE = "treatment:guide-chat-turn";
const DEFAULT_TREATMENT_WHATSAPP = "treatment:agent-jhn-whatsapp-turn";

/**
 * Resolve and load COP packet accounting from the inseme monorepo (or override).
 * @returns {Promise<object>}
 */
export async function loadCopPacketAccounting() {
  if (copModulePromise && !(copModulePromise instanceof Promise)) {
    return copModulePromise;
  }
  if (copModulePromise instanceof Promise) return copModulePromise;

  copModulePromise = (async () => {
    const candidates = [
      process.env.COGENTIA_COP_PACKET_ACCOUNTING_PATH,
      process.env.COGENTIA_COP_KERNEL_ACCOUNTING,
      // Sibling checkout (tweesic workspace)
      path.resolve(moduleDir, "..", "..", "..", "inseme", "packages", "cop-kernel", "src", "accounting", "packetAccounting.js"),
      path.resolve(process.cwd(), "..", "inseme", "packages", "cop-kernel", "src", "accounting", "packetAccounting.js"),
      path.resolve(process.cwd(), "inseme", "packages", "cop-kernel", "src", "accounting", "packetAccounting.js"),
      // Fracta layout
      "/srv/inseme/packages/cop-kernel/src/accounting/packetAccounting.js",
      "/srv/cogentia/repos/inseme/packages/cop-kernel/src/accounting/packetAccounting.js",
    ].filter(Boolean);

    let lastError = null;
    for (const candidate of candidates) {
      try {
        if (candidate.includes(":") && !candidate.startsWith("/") && !/^[A-Za-z]:\\/.test(candidate)) {
          // bare package name
          return await import(candidate);
        }
        const abs = path.resolve(candidate);
        if (!fs.existsSync(abs)) continue;
        return await import(pathToFileURL(abs).href);
      } catch (error) {
        lastError = error;
      }
    }
    try {
      return await import("@inseme/cop-kernel");
    } catch (error) {
      lastError = error;
    }
    const err = new Error(
      `COP packet accounting unavailable (set COGENTIA_COP_PACKET_ACCOUNTING_PATH). ${String(lastError?.message || lastError || "")}`,
    );
    err.code = "COP_ACCOUNTING_UNAVAILABLE";
    throw err;
  })();

  try {
    const mod = await copModulePromise;
    copModulePromise = mod;
    return mod;
  } catch (error) {
    copModulePromise = null;
    throw error;
  }
}

export function isCopAccountingEnabled(env = process.env) {
  const raw = String(env.COGENTIA_COP_SURFACE_ACCOUNTING ?? "1").trim().toLowerCase();
  return !(raw === "0" || raw === "false" || raw === "no" || raw === "off");
}

function registerPacket(packet) {
  if (packet?.packet_id) packetStore.set(packet.packet_id, packet);
  return packet;
}

export function resolvePacketById(packetId) {
  return packetStore.get(packetId) || null;
}

export function clearPacketStoreForTests() {
  packetStore.clear();
  copModulePromise = null;
}

/**
 * Open a surface treatment packet (cascade root for one user turn).
 *
 * @param {object} options
 * @param {"guide"|"whatsapp"|"jhn-openai"|"librarian"} options.surface
 * @param {string} [options.question]
 * @param {string} [options.locale]
 * @param {string} [options.account_id]
 * @param {string} [options.mandate_id]
 * @param {string} [options.treatment_id]
 * @param {string} [options.budget_reservation_id]
 * @param {string} [options.node_id]
 * @param {string} [options.instance_id]
 */
export async function openSurfaceTurnPacket(options = {}) {
  if (!isCopAccountingEnabled()) {
    return { ok: false, reason: "disabled", packet: null, cop: null };
  }
  let cop;
  try {
    cop = await loadCopPacketAccounting();
  } catch (error) {
    return {
      ok: false,
      reason: "cop_unavailable",
      error: String(error?.message || error).slice(0, 240),
      packet: null,
      cop: null,
    };
  }

  const surface = String(options.surface || "guide");
  const mandate_id = options.mandate_id
    || (surface === "whatsapp" ? DEFAULT_MANDATE_WHATSAPP : DEFAULT_MANDATE_GUIDE);
  const treatment_id = options.treatment_id
    || (surface === "whatsapp" ? DEFAULT_TREATMENT_WHATSAPP : DEFAULT_TREATMENT_GUIDE);

  const packet = cop.createCognitivePacket({
    mandate_id,
    treatment_id,
    account_id: options.account_id || process.env.COGENTIA_COP_ACCOUNT_ID || DEFAULT_ACCOUNT,
    budget_reservation_id: options.budget_reservation_id
      || process.env.COGENTIA_COP_BUDGET_RESERVATION_ID
      || undefined,
    initial_node_id: options.node_id || process.env.COGENTIA_FRACTANET_NODE_ID || "node:fracta:main",
    initial_instance_id: options.instance_id
      || (surface === "whatsapp" ? "agent:jhn:whatsapp" : "agent:jhn:guide"),
    disclosure_class: options.disclosure_class || "public",
    payload: {
      surface,
      question: options.question ? String(options.question).slice(0, 2000) : null,
      locale: options.locale || null,
      opened_at: new Date().toISOString(),
      kind: "surface_turn",
    },
  });

  registerPacket(packet);
  return { ok: true, packet, cop };
}

/**
 * Spawn a downstream packet under a turn (intent / planner / synthesis / librarian).
 */
export async function spawnSurfaceDownstream(upstreamPacket, cop, options = {}) {
  if (!upstreamPacket || !cop?.spawnDownstreamPacket) {
    return { ok: false, packet: null };
  }
  const down = cop.spawnDownstreamPacket(upstreamPacket, {
    spawn_reason: options.spawn_reason || "surface_substep",
    mandate_id: options.mandate_id || upstreamPacket.mandate_id,
    treatment_id: options.treatment_id || upstreamPacket.treatment_id,
    budget_reservation_id: options.budget_reservation_id !== undefined
      ? options.budget_reservation_id
      : upstreamPacket.budget_reservation_id,
    initial_node_id: options.node_id,
    initial_instance_id: options.instance_id,
    payload: {
      ...(options.payload || {}),
      surface_step: options.step || options.spawn_reason || "substep",
    },
  });
  registerPacket(down);
  registerPacket(upstreamPacket);
  return { ok: true, packet: down };
}

/**
 * Record a provider LLM spend on the given packet (own spend only).
 * Optionally appends a hop first (same node, new stage).
 *
 * @returns {{ ok: boolean, spendingEntry?: object, summary?: object, error?: string }}
 */
export function recordPacketProviderSpend(packet, cop, details = {}) {
  if (!packet || !cop?.appendPacketSpending) {
    return { ok: false, error: "missing_packet_or_cop" };
  }
  try {
    if (details.hop && cop.appendPacketHop) {
      cop.appendPacketHop(packet, {
        node_id: details.hop.node_id || packet.hops?.[packet.hops.length - 1]?.node_id || "node:fracta:main",
        instance_id: details.hop.instance_id || packet.hops?.[packet.hops.length - 1]?.instance_id || "agent:jhn",
        interface_type: details.hop.interface_type || "local",
        route_reason: details.hop.route_reason || details.capability || "provider_call",
      });
    }

    const prompt_tokens = Number(details.prompt_tokens) || 0;
    const completion_tokens = Number(details.completion_tokens) || 0;
    if (prompt_tokens === 0 && completion_tokens === 0 && !details.force_zero) {
      // Still allow zero-cost local models with force_zero
      if (!details.allow_empty) {
        return { ok: false, error: "empty_usage" };
      }
    }

    const provider = String(details.provider || "openai");
    const model = String(details.model || "unknown");
    const evidence_hash = details.evidence_hash
      || (details.request_id ? `req:${details.request_id}` : undefined);

    const { spendingEntry, transactionEvent } = cop.appendPacketSpending(packet, {
      capability: details.capability || "ai/chat-completion",
      provider,
      model,
      prompt_tokens,
      completion_tokens,
      evidence_hash,
      spend_id: details.spend_id,
    });

    registerPacket(packet);
    maybeSpoolPacketEvent({ packet, spendingEntry, transactionEvent, surface: details.surface });
    // Fire-and-forget durable store (await would block answer path; result in summary later).
    const persistPromise = maybePersistAccountingEvent(transactionEvent, packet);

    const summary = cop.summarizePacketSpending
      ? cop.summarizePacketSpending(packet, resolvePacketById)
      : null;

    return {
      ok: true,
      spendingEntry,
      transactionEvent,
      summary,
      persistPromise,
    };
  } catch (error) {
    return { ok: false, error: String(error?.message || error).slice(0, 240) };
  }
}

/** @type {null | Promise<object|null>} */
let accountingStorePromise = null;

/**
 * Lazy Supabase COP accounting store (inseme createSupabaseAccountingStore).
 * Enabled when COGENTIA_COP_ACCOUNTING_PERSIST=1 and Supabase env present.
 */
/**
 * Lightweight REST store — no @supabase/supabase-js dependency required on Guide host.
 * Writes to cop_accounting_event (+ best-effort balance upsert).
 */
function createRestAccountingStore(url, key) {
  const base = String(url).replace(/\/$/, "");
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    Prefer: "resolution=merge-duplicates,return=representation",
  };

  return {
    kind: "cop_rest_accounting_store/v1",
    async append(envelope) {
      const event = envelope?.event || envelope;
      const idempotency_key = event.idempotency_key || event.payload?.idempotency_key;
      if (!idempotency_key) return { ok: false, error: "idempotency_key_required" };

      const row = {
        schema_version: event.schema_version || "1.0",
        event_type: event.event_type || event.eventType || "accounting/transaction",
        idempotency_key,
        actor_id: String(
          event.source
          || event.payload?.governance?.actor_subject_id
          || event.actor_id
          || "unknown",
        ),
        principal_id: String(
          event.payload?.governance?.principal_subject_id
          || event.principal_id
          || event.payload?.metadata?.principal_account_id
          || "unknown",
        ),
        mandate_ref: event.payload?.governance?.mandate_id
          || event.payload?.metadata?.mandate_id
          || null,
        payload: event.payload || event,
      };

      const res = await fetch(`${base}/rest/v1/cop_accounting_event`, {
        method: "POST",
        headers: {
          ...headers,
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify(row),
      });
      const text = await res.text();
      if (!res.ok && res.status !== 409) {
        return { ok: false, error: `http_${res.status}`, body: text.slice(0, 200) };
      }
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }
      const inserted = Array.isArray(data) ? data[0] : data;
      // Best-effort balance projection for first debit posting
      try {
        await restProjectBalances(base, headers, row.payload);
      } catch {
        /* non-fatal */
      }
      return {
        ok: true,
        duplicate: res.status === 409 || !inserted,
        event: inserted || row,
      };
    },
  };
}

async function restProjectBalances(base, headers, payload) {
  const postings = payload?.postings || [];
  if (!Array.isArray(postings) || !postings.length) return;
  const domain = payload.accounting_domain || "provisional_execution_spending";
  for (const posting of postings) {
    const account_id = posting.account || posting.account_id;
    const qty = posting.quantity;
    if (!account_id || !qty) continue;
    const unit = qty.unit || "USD";
    const scale = Number(qty.scale) || 8;
    const coef = String(qty.coefficient || "0");
    // Read existing
    const q = new URLSearchParams({
      select: "*",
      account_id: `eq.${account_id}`,
      unit: `eq.${unit}`,
      domain: `eq.${domain}`,
      limit: "1",
    });
    const getRes = await fetch(`${base}/rest/v1/cop_accounting_balance?${q}`, {
      headers: { ...headers, Prefer: "count=exact" },
    });
    const existingRows = getRes.ok ? await getRes.json().catch(() => []) : [];
    const existing = Array.isArray(existingRows) ? existingRows[0] : null;
    const zero = { coefficient: "0", scale, unit };
    let debit = existing?.total_debit || zero;
    let credit = existing?.total_credit || zero;
    let balance = existing?.balance || zero;
    const add = (a, b) => ({
      coefficient: String(BigInt(a.coefficient || "0") + BigInt(b)),
      scale,
      unit,
    });
    const sub = (a, b) => ({
      coefficient: String(BigInt(a.coefficient || "0") - BigInt(b)),
      scale,
      unit,
    });
    if (posting.posting_type === "debit") {
      debit = add(debit, coef);
      balance = add(balance, coef);
    } else if (posting.posting_type === "credit") {
      credit = add(credit, coef);
      balance = sub(balance, coef);
    }
    const body = {
      account_id,
      unit,
      domain,
      total_debit: debit,
      total_credit: credit,
      balance,
      updated_at: new Date().toISOString(),
    };
    await fetch(`${base}/rest/v1/cop_accounting_balance`, {
      method: "POST",
      headers: {
        ...headers,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(body),
    });
  }
}

async function getAccountingStore() {
  if (accountingStorePromise) return accountingStorePromise;
  accountingStorePromise = (async () => {
    // Default on when Supabase is configured (democratized durable spend accounting).
    // Explicit COGENTIA_COP_ACCOUNTING_PERSIST=0 disables.
    const url = String(process.env.SUPABASE_URL || process.env.COGENTIA_SUPABASE_URL || "").trim();
    const key = String(
      process.env.SUPABASE_SERVICE_ROLE_KEY
      || process.env.COGENTIA_SUPABASE_SERVICE_ROLE_KEY
      || process.env.SUPABASE_ANON_KEY
      || "",
    ).trim();
    const raw = String(
      process.env.COGENTIA_COP_ACCOUNTING_PERSIST ?? (url && key ? "1" : "0"),
    ).trim().toLowerCase();
    if (raw === "0" || raw === "false" || raw === "no" || raw === "off") return null;
    if (!url || !key) return null;
    // Prefer REST (no heavy dependency on Guide host). Optional cop-kernel store if available.
    try {
      return createRestAccountingStore(url, key);
    } catch {
      return null;
    }
  })();
  return accountingStorePromise;
}

async function maybePersistAccountingEvent(transactionEvent, packet) {
  try {
    const store = await getAccountingStore();
    if (!store?.append) return { ok: false, reason: "store_unavailable" };
    // Enrich metadata for analytical dimensions + semantic account
    const txn = {
      ...transactionEvent,
      metadata: {
        ...(transactionEvent.metadata || {}),
        packet_id: packet?.packet_id,
        treatment_id: packet?.treatment_id,
        mandate_id: packet?.mandate_id,
        semantic_account_id: "COG:EXPENSE.AI.INFERENCE",
        valuation_status: "provisional",
      },
    };
    const result = await store.append({
      event_type: txn.eventType || "accounting/transaction",
      idempotency_key: txn.idempotency_key,
      payload: txn,
      source: packet?.governance?.actor_subject_id || "agent:jhn",
    });
    return result || { ok: true };
  } catch (error) {
    return { ok: false, error: String(error?.message || error).slice(0, 160) };
  }
}

/**
 * Test helper: force clear store cache after env changes.
 */
export function resetAccountingStoreCacheForTests() {
  accountingStorePromise = null;
}

/**
 * Build a public-safe accounting projection for API responses.
 */
export function projectTurnAccounting(rootPacket, cop) {
  if (!rootPacket) return null;
  const summary = cop?.summarizePacketSpending
    ? cop.summarizePacketSpending(rootPacket, resolvePacketById)
    : null;

  const downstream = (rootPacket.lineage?.downstream_packet_ids || [])
    .map((id) => {
      const p = resolvePacketById(id);
      if (!p) return { packet_id: id, missing: true };
      return {
        packet_id: p.packet_id,
        spawn_reason: p.lineage?.spawn_reason || p.payload?.surface_step || null,
        own_spend: cop?.calculatePacketOwnSpending
          ? formatQuantity(cop.calculatePacketOwnSpending(p))
          : null,
        spend_lines: (p.spending || []).length,
        hops: (p.hops || []).length,
      };
    });

  return {
    kind: "cop_surface_turn_accounting/v1",
    protocol: "cop-cognitive-packet",
    monetary_unit_default: rootPacket.monetary_unit_default || "USD",
    packet_id: rootPacket.packet_id,
    mandate_id: rootPacket.mandate_id,
    treatment_id: rootPacket.treatment_id,
    account_id: rootPacket.account_id,
    budget_reservation_id: rootPacket.budget_reservation_id || null,
    lineage: {
      upstream_packet_id: rootPacket.lineage?.upstream_packet_id || null,
      downstream_packet_ids: rootPacket.lineage?.downstream_packet_ids || [],
      vocabulary: "upstream/downstream",
    },
    own_spend: summary?.own_spend ?? null,
    consolidated_spend: summary?.consolidated_spend ?? null,
    own_spend_lines: summary?.own_spend_lines ?? (rootPacket.spending || []).length,
    hop_count: summary?.hop_count ?? (rootPacket.hops || []).length,
    downstream,
    note: "own_spend is this packet only; consolidated_spend includes downstream packets. Spend lines are never copied across packets.",
  };
}

function formatQuantity(q) {
  if (!q) return null;
  if (typeof q === "string") return q;
  // ExactQuantity may expose coefficient/scale — prefer toDecimal if available via summarize
  if (q.coefficient != null && q.scale != null) {
    const scale = Number(q.scale) || 8;
    const raw = String(q.coefficient).padStart(scale + 1, "0");
    const whole = raw.slice(0, -scale) || "0";
    const frac = raw.slice(-scale);
    return `${whole}.${frac}`;
  }
  return String(q);
}

/**
 * NDJSON spool for durable provisional traces (local evidence; not a second ledger).
 * Default path when unset: COGENTIA_OPS_STATE_DIR/accounting/spend.ndjson or .cogentia/...
 */
function resolveSpendSpoolPath(env = process.env) {
  const explicit = String(env.COGENTIA_COP_SPEND_SPOOL || "").trim();
  if (explicit === "0" || explicit === "off" || explicit === "false") return null;
  if (explicit) return explicit;
  const base = String(
    env.COGENTIA_OPS_STATE_DIR
    || env.COGENTIA_STATE_DIR
    || path.resolve(process.cwd(), ".cogentia"),
  ).trim();
  return path.join(base, "accounting", "spend.ndjson");
}

function maybeSpoolPacketEvent(event) {
  const spoolPath = resolveSpendSpoolPath();
  if (!spoolPath) return;
  try {
    const dir = path.dirname(spoolPath);
    fs.mkdirSync(dir, { recursive: true });
    const line = JSON.stringify({
      at: new Date().toISOString(),
      packet_id: event.packet?.packet_id,
      mandate_id: event.packet?.mandate_id,
      treatment_id: event.packet?.treatment_id,
      spend_id: event.spendingEntry?.spend_id,
      hop_index: event.spendingEntry?.hop_index,
      provider: event.spendingEntry?.provider,
      model: event.spendingEntry?.model,
      prompt_tokens: event.spendingEntry?.prompt_tokens,
      completion_tokens: event.spendingEntry?.completion_tokens,
      provisional_cost: event.spendingEntry?.provisional_cost,
      transaction_id: event.transactionEvent?.transaction_id,
      surface: event.surface || null,
      semantic_account_id: "COG:EXPENSE.AI.INFERENCE",
      valuation_status: "provisional",
    });
    fs.appendFileSync(spoolPath, `${line}\n`, "utf8");
  } catch {
    /* non-fatal */
  }
}

/**
 * Convenience: open turn, spawn a synthesis downstream, record spend, return accounting projection.
 *
 * @param {object} opts
 * @param {string} opts.surface
 * @param {string} [opts.question]
 * @param {string} [opts.locale]
 * @param {string} opts.provider
 * @param {string} opts.model
 * @param {number} opts.prompt_tokens
 * @param {number} opts.completion_tokens
 * @param {string} [opts.request_id]
 * @param {string} [opts.step] synthesis | intent | planner | librarian
 */
export async function accountSurfaceLlmCall(opts = {}) {
  const opened = await openSurfaceTurnPacket(opts);
  if (!opened.ok) {
    return {
      ok: false,
      reason: opened.reason,
      error: opened.error,
      accounting: null,
      root_packet: null,
    };
  }
  const { packet: root, cop } = opened;
  const step = opts.step || "synthesis";
  const spawned = await spawnSurfaceDownstream(root, cop, {
    spawn_reason: step,
    step,
    instance_id: opts.instance_id,
  });
  const target = spawned.ok && spawned.packet ? spawned.packet : root;
  const recorded = recordPacketProviderSpend(target, cop, {
    provider: opts.provider || "openai",
    model: opts.model || "unknown",
    prompt_tokens: opts.prompt_tokens,
    completion_tokens: opts.completion_tokens,
    request_id: opts.request_id,
    capability: opts.capability || `ai/${step}`,
    surface: opts.surface,
    hop: {
      route_reason: step,
      instance_id: opts.instance_id,
    },
    allow_empty: Boolean(opts.allow_empty),
  });

  const accounting = projectTurnAccounting(root, cop);
  return {
    ok: recorded.ok,
    error: recorded.error,
    accounting,
    root_packet: root,
    spend_packet_id: target.packet_id,
    spendingEntry: recorded.spendingEntry || null,
  };
}
