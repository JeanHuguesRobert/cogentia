/**
 * Probe COP accounting tables on Supabase (no secrets printed).
 * Usage on host: node scripts/ops/probe-cop-accounting-tables.mjs /path/to/.env
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

const envPath = process.argv[2] || process.env.COGENTIA_ENV_FILE || "";
const env = envPath ? loadEnv(envPath) : { ...process.env };
const url = env.SUPABASE_URL || process.env.SUPABASE_URL;
const key =
  env.SUPABASE_SERVICE_ROLE_KEY ||
  env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

console.log("env_path", envPath || "(process.env)");
console.log("supabase_url_set", Boolean(url));
console.log("supabase_key_set", Boolean(key));
if (!url || !key) process.exit(2);

const tables = [
  "cop_accounting_event",
  "cop_accounting_balance",
  "cop_accounting_budget",
  "cop_accounting_packet_spend",
  "cop_accounting_posting",
  "cop_accounting_chart_account",
];

for (const t of tables) {
  try {
    const r = await fetch(`${url}/rest/v1/${t}?select=*&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
    });
    const text = await r.text();
    console.log(
      t,
      `http=${r.status}`,
      `snippet=${text.slice(0, 100).replace(/\s+/g, " ")}`,
    );
  } catch (e) {
    console.log(t, "err", String(e?.message || e).slice(0, 120));
  }
}
