#!/usr/bin/env node
/**
 * Short-term demo helper (inseme#33 / Naissance de John):
 * show last provisional COP spends from local spool and optional Supabase events.
 *
 * Usage:
 *   node scripts/ops/last-cop-spends.mjs
 *   node scripts/ops/last-cop-spends.mjs --env /path/to/.env --limit 10
 *   node scripts/ops/last-cop-spends.mjs --spool /var/lib/cogentia/accounting/spend.ndjson
 *
 * No secrets printed. Not a full ledger UI — dogfood evidence only.
 */

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const out = { limit: 8, env: "", spool: "" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--limit") out.limit = Math.max(1, Number(argv[++i]) || 8);
    else if (a === "--env") out.env = String(argv[++i] || "");
    else if (a === "--spool") out.spool = String(argv[++i] || "");
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

function resolveSpool(args, env) {
  if (args.spool) return args.spool;
  if (env.COGENTIA_COP_SPEND_SPOOL && !/^(0|off|false)$/i.test(env.COGENTIA_COP_SPEND_SPOOL)) {
    return env.COGENTIA_COP_SPEND_SPOOL;
  }
  const base = env.COGENTIA_OPS_STATE_DIR || env.COGENTIA_STATE_DIR || path.resolve(process.cwd(), ".cogentia");
  return path.join(base, "accounting", "spend.ndjson");
}

function formatCost(pc) {
  if (!pc) return "n/a";
  if (typeof pc === "string") return pc;
  const coef = String(pc.coefficient || "0");
  const scale = Number(pc.scale) || 8;
  const unit = pc.unit || "USD";
  const pad = coef.padStart(scale + 1, "0");
  const whole = pad.slice(0, -scale) || "0";
  const frac = pad.slice(-scale);
  return `${whole}.${frac} ${unit}`;
}

function printSpool(spoolPath, limit) {
  console.log("## Local spool (provisional execution spends)");
  console.log(`path: ${spoolPath}`);
  if (!fs.existsSync(spoolPath)) {
    console.log("(empty or missing — no spends recorded yet on this host)\n");
    return;
  }
  const lines = fs.readFileSync(spoolPath, "utf8").trim().split("\n").filter(Boolean);
  const slice = lines.slice(-limit);
  console.log(`lines_total: ${lines.length}  showing: ${slice.length}`);
  for (const line of slice) {
    try {
      const j = JSON.parse(line);
      console.log(
        `- ${j.at || "?"}  ${j.surface || "?"}  ${j.provider || "?"}/${j.model || "?"}  ` +
          `tokens ${j.prompt_tokens ?? "?"}+${j.completion_tokens ?? "?"}  ` +
          `cost ${formatCost(j.provisional_cost)}  packet ${j.packet_id || "?"}`,
      );
    } catch {
      console.log(`- (unparseable line)`);
    }
  }
  console.log("");
}

async function printEvents(env, limit) {
  console.log("## Supabase cop_accounting_event (if configured)");
  const url = env.SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.log("(Supabase not configured in env — spool-only mode)\n");
    return;
  }
  try {
    const r = await fetch(
      `${url}/rest/v1/cop_accounting_event?select=created_at,event_type,idempotency_key&order=created_at.desc&limit=${limit}`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
        },
      },
    );
    const rows = await r.json();
    if (!r.ok) {
      console.log(`http=${r.status}`, typeof rows === "object" ? JSON.stringify(rows).slice(0, 120) : rows);
      console.log("");
      return;
    }
    console.log(`http=${r.status}  n=${Array.isArray(rows) ? rows.length : 0}`);
    if (Array.isArray(rows)) {
      for (const e of rows) {
        console.log(`- ${e.created_at}  ${e.event_type}  ${e.idempotency_key}`);
      }
    }
  } catch (e) {
    console.log("error", String(e?.message || e).slice(0, 160));
  }
  console.log("");
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(`Usage: node scripts/ops/last-cop-spends.mjs [--limit N] [--env PATH] [--spool PATH]`);
  process.exit(0);
}

const fileEnv = loadEnv(args.env);
const env = { ...fileEnv, ...process.env };
const spool = resolveSpool(args, env);

console.log("# Last COP spends (dogfood — not a certified ledger)\n");
console.log(
  "Note: execution costs (e.g. OpenAI Guide synthesis), not X product subscription, not statutory books.\n",
);
printSpool(spool, args.limit);
await printEvents(env, args.limit);
console.log("Done.");
