/**
 * Backfill cop_accounting_packet_spend + postings for events that only have
 * cop_accounting_event rows (pre-wire history).
 *
 * Usage:
 *   node scripts/ops/backfill-cop-accounting-indexes.mjs --env /path/.env
 *   node scripts/ops/backfill-cop-accounting-indexes.mjs --env /path/.env --apply
 *   node scripts/ops/backfill-cop-accounting-indexes.mjs --env /path/.env --apply --limit 50
 *
 * Idempotent (ignore-duplicates). Does not re-project balances (would double-count).
 */
import fs from "node:fs";

function parseArgs(argv) {
  const out = { apply: false, limit: 100, env: "" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") out.apply = true;
    else if (a === "--limit") out.limit = Math.max(1, Number(argv[++i]) || 100);
    else if (a === "--env") out.env = String(argv[++i] || "");
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

function loadEnv(p) {
  const out = {};
  if (!p || !fs.existsSync(p)) return out;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(
    "Usage: node scripts/ops/backfill-cop-accounting-indexes.mjs --env PATH [--apply] [--limit N]",
  );
  process.exit(0);
}

const fileEnv = loadEnv(args.env);
const env = { ...fileEnv, ...process.env };
const url = String(env.SUPABASE_URL || "").replace(/\/$/, "");
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Need SUPABASE_URL + SERVICE_ROLE/ANON in env");
  process.exit(2);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  Accept: "application/json",
  "Content-Type": "application/json",
};

async function rest(path, init = {}) {
  const r = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });
  const text = await r.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: r.ok || r.status === 409, status: r.status, body };
}

const events = await rest(
  `cop_accounting_event?select=id,idempotency_key,created_at,payload&order=created_at.asc&limit=${args.limit}`,
);
if (!events.ok || !Array.isArray(events.body)) {
  console.error("list_events_failed", events.status, events.body);
  process.exit(1);
}

const spends = await rest(
  `cop_accounting_packet_spend?select=idempotency_key&limit=500`,
);
const spendKeys = new Set(
  Array.isArray(spends.body) ? spends.body.map((s) => s.idempotency_key) : [],
);

const orphans = events.body.filter(
  (e) => e.idempotency_key && !spendKeys.has(e.idempotency_key) && e.payload?.postings?.length,
);

console.log("# Backfill COP indexes (packet_spend + postings)\n");
console.log("mode", args.apply ? "APPLY" : "DRY-RUN");
console.log("events_scanned", events.body.length);
console.log("orphans", orphans.length);

let okSpend = 0;
let okPost = 0;
let fail = 0;

for (const e of orphans) {
  const payload = e.payload || {};
  const meta = payload.metadata || {};
  const debit = (payload.postings || []).find((p) => p.posting_type === "debit");
  const packet_id = meta.packet_id || payload.packet_id;
  console.log(
    "-",
    e.created_at,
    e.idempotency_key,
    packet_id || "(no packet_id)",
    debit ? "has_debit" : "no_debit",
  );
  if (!args.apply) continue;
  if (!packet_id || !debit?.quantity) {
    fail += 1;
    continue;
  }

  const spendBody = {
    packet_id,
    treatment_id: meta.treatment_id || null,
    hop_index: meta.hop_index ?? null,
    provider: meta.provider || null,
    model: meta.model || null,
    event_id: e.id,
    idempotency_key: e.idempotency_key,
    provisional_cost: debit.quantity,
    valuation_status: meta.valuation_status || "provisional",
    created_at: e.created_at || new Date().toISOString(),
  };
  const s = await rest("cop_accounting_packet_spend", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(spendBody),
  });
  if (s.ok) okSpend += 1;
  else {
    console.log("  spend_fail", s.status, String(s.body).slice(0, 120));
    fail += 1;
  }

  const postRows = (payload.postings || []).map((p, i) => ({
    event_id: e.id,
    posting_index: i,
    account_id: p.account || p.account_id || "unknown",
    posting_type: p.posting_type === "credit" ? "credit" : "debit",
    quantity: p.quantity,
    description: p.description || null,
    semantic_account_id: p.semantic_account_id || meta.semantic_account_id || null,
    packet_id,
    treatment_id: meta.treatment_id || null,
    mandate_id: meta.mandate_id || null,
    provider: meta.provider || null,
    model: meta.model || null,
    surface: meta.surface || null,
    valuation_status: meta.valuation_status || "provisional",
  }));
  if (postRows.length) {
    const p = await rest("cop_accounting_posting", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify(postRows),
    });
    if (p.ok) okPost += 1;
    else {
      console.log("  post_fail", p.status, String(p.body).slice(0, 120));
      fail += 1;
    }
  }
}

if (args.apply) {
  console.log("\nresult", { okSpend, okPost, fail });
} else {
  console.log("\nDry-run only. Re-run with --apply to write.");
}
console.log("Done.");
