/**
 * After a Guide smoke turn: show spool + latest cop_accounting_event rows.
 * Usage: node verify-cop-accounting-p0.mjs /path/to/.env
 */
import fs from "node:fs";

function loadEnv(p) {
  const out = {};
  if (!fs.existsSync(p)) return out;
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

const env = loadEnv(process.argv[2] || "");
const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
const spool = process.env.COGENTIA_COP_SPEND_SPOOL || "/var/lib/cogentia/accounting/spend.ndjson";

if (fs.existsSync(spool)) {
  const lines = fs.readFileSync(spool, "utf8").trim().split("\n").filter(Boolean);
  console.log("spool_lines", lines.length);
  if (lines.length) {
    const last = JSON.parse(lines[lines.length - 1]);
    console.log(
      "spool_last",
      last.packet_id,
      last.model,
      last.prompt_tokens,
      "+",
      last.completion_tokens,
    );
  }
} else {
  console.log("spool_missing", spool);
}

if (!url || !key) {
  console.log("supabase_missing");
  process.exit(0);
}

const r = await fetch(
  `${url}/rest/v1/cop_accounting_event?select=idempotency_key,created_at,event_type&order=created_at.desc&limit=5`,
  {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  },
);
const events = await r.json();
console.log("events_http", r.status, "n", Array.isArray(events) ? events.length : events);
if (Array.isArray(events)) {
  for (const e of events) {
    console.log(" event", e.created_at, e.event_type, e.idempotency_key);
  }
}

const b = await fetch(
  `${url}/rest/v1/cop_accounting_balance?select=account_id,unit,domain,balance&limit=10`,
  {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  },
);
const balances = await b.json();
console.log(
  "balances_http",
  b.status,
  "n",
  Array.isArray(balances) ? balances.length : balances,
);
if (Array.isArray(balances)) {
  for (const row of balances) {
    console.log(
      " bal",
      row.account_id,
      row.domain,
      JSON.stringify(row.balance),
    );
  }
}
