/**
 * After a Guide smoke turn: show spool + durable COP accounting tables.
 * Usage: node scripts/ops/verify-cop-accounting-p0.mjs /path/to/.env
 *
 * Exit 0 always for ops convenience; prints FAIL lines when chain incomplete.
 */
import fs from "node:fs";

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

function formatCost(pc) {
  if (!pc || typeof pc !== "object") return "n/a";
  let coef = String(pc.coefficient || "0");
  const neg = coef.startsWith("-");
  if (neg) coef = coef.slice(1);
  const scale = Number(pc.scale) || 8;
  const unit = pc.unit || "USD";
  const pad = coef.padStart(scale + 1, "0");
  const whole = pad.slice(0, -scale) || "0";
  const frac = pad.slice(-scale);
  return `${neg ? "-" : ""}${whole}.${frac} ${unit}`;
}

const envPath = process.argv[2] || process.env.COGENTIA_ENV_FILE || "";
const env = { ...loadEnv(envPath), ...process.env };
const url = String(env.SUPABASE_URL || "").replace(/\/$/, "");
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
const spool =
  env.COGENTIA_COP_SPEND_SPOOL ||
  "/var/lib/cogentia/accounting/spend.ndjson";

console.log("# COP accounting P0 verify\n");
console.log("env_path", envPath || "(process.env)");
console.log("spool", spool);

if (fs.existsSync(spool)) {
  const lines = fs.readFileSync(spool, "utf8").trim().split("\n").filter(Boolean);
  console.log("spool_lines", lines.length);
  if (lines.length) {
    try {
      const last = JSON.parse(lines[lines.length - 1]);
      console.log(
        "spool_last",
        last.at || "?",
        last.surface || "?",
        last.provider || "?",
        "/",
        last.model || "?",
        "tokens",
        last.prompt_tokens ?? "?",
        "+",
        last.completion_tokens ?? "?",
        "packet",
        last.packet_id || "?",
      );
    } catch {
      console.log("spool_last_unparseable");
    }
  }
} else {
  console.log("spool_missing");
}

if (!url || !key) {
  console.log("supabase_missing");
  process.exit(0);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  Accept: "application/json",
};

async function get(path) {
  const r = await fetch(`${url}/rest/v1/${path}`, { headers });
  const body = await r.json().catch(() => null);
  return { status: r.status, body };
}

const events = await get(
  "cop_accounting_event?select=id,idempotency_key,created_at,event_type&order=created_at.desc&limit=8",
);
console.log("\nevents_http", events.status, "n", Array.isArray(events.body) ? events.body.length : events.body);
if (Array.isArray(events.body)) {
  for (const e of events.body) {
    console.log(" event", e.created_at, e.event_type, e.idempotency_key);
  }
}

const spends = await get(
  "cop_accounting_packet_spend?select=created_at,packet_id,provider,model,provisional_cost,idempotency_key&order=created_at.desc&limit=8",
);
console.log(
  "\npacket_spend_http",
  spends.status,
  "n",
  Array.isArray(spends.body) ? spends.body.length : spends.body,
);
if (Array.isArray(spends.body)) {
  for (const s of spends.body) {
    console.log(
      " spend",
      s.created_at,
      `${s.provider || "?"}/${s.model || "?"}`,
      formatCost(s.provisional_cost),
      s.packet_id,
    );
  }
}

const posts = await get(
  "cop_accounting_posting?select=created_at,account_id,posting_type,model,surface,packet_id&order=created_at.desc&limit=8",
);
console.log(
  "\nposting_http",
  posts.status,
  "n",
  Array.isArray(posts.body) ? posts.body.length : posts.body,
);
if (Array.isArray(posts.body)) {
  for (const p of posts.body) {
    console.log(
      " post",
      p.created_at,
      p.posting_type,
      p.account_id,
      p.model || "?",
      p.surface || "?",
    );
  }
}

const balances = await get(
  "cop_accounting_balance?select=account_id,unit,domain,balance&limit=12",
);
console.log(
  "\nbalances_http",
  balances.status,
  "n",
  Array.isArray(balances.body) ? balances.body.length : balances.body,
);
if (Array.isArray(balances.body)) {
  for (const row of balances.body) {
    console.log(" bal", row.account_id, row.domain, formatCost(row.balance));
  }
}

// Orphans: recent events without packet_spend (pre-wire or failed index)
const allEvents = await get(
  "cop_accounting_event?select=idempotency_key,created_at&order=created_at.desc&limit=50",
);
const allSpends = await get(
  "cop_accounting_packet_spend?select=idempotency_key&limit=200",
);
const spendKeys = new Set(
  Array.isArray(allSpends.body) ? allSpends.body.map((s) => s.idempotency_key) : [],
);
const orphans = Array.isArray(allEvents.body)
  ? allEvents.body.filter((e) => e.idempotency_key && !spendKeys.has(e.idempotency_key))
  : [];
console.log("\norphans_event_without_packet_spend", orphans.length);
for (const o of orphans.slice(0, 10)) {
  console.log(" orphan", o.created_at, o.idempotency_key);
}
if (orphans.length) {
  console.log(
    "\nHINT: node scripts/ops/backfill-cop-accounting-indexes.mjs --env <path> --apply",
  );
}

const liveOk =
  events.status === 200 &&
  spends.status === 200 &&
  posts.status === 200 &&
  Array.isArray(spends.body) &&
  spends.body.length > 0 &&
  Array.isArray(posts.body) &&
  posts.body.length > 0;
console.log(liveOk ? "\nVERIFY_OK (tables readable + spends present)" : "\nVERIFY_PARTIAL");
