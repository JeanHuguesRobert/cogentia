/**
 * Smoke WhatsApp COP accounting without sending WhatsApp messages.
 *
 * Runs buildCognitiveDraft (guide|shadow) once, awaits durable persist for
 * WhatsApp OpenAI synthesis, then checks Supabase packet_spend surface.
 *
 * Usage (on Fracta or workstation with env):
 *   node scripts/ops/smoke-whatsapp-cop-accounting.mjs --env /path/to/.env
 *   node scripts/ops/smoke-whatsapp-cop-accounting.mjs --env ... --mode guide
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCognitiveDraft,
  resolveRetrievalMode,
} from "../lib/agent-jhn-whatsapp/draft.js";
import { resetAccountingStoreCacheForTests } from "../lib/cop-surface-accounting.js";

function parseArgs(argv) {
  const out = { env: "", mode: "", question: "" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--env") out.env = String(argv[++i] || "");
    else if (a === "--mode") out.mode = String(argv[++i] || "");
    else if (a === "--question") out.question = String(argv[++i] || "");
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
    "Usage: node scripts/ops/smoke-whatsapp-cop-accounting.mjs --env PATH [--mode guide|shadow] [--question TEXT]",
  );
  process.exit(0);
}

const fileEnv = loadEnv(args.env);
for (const [k, v] of Object.entries(fileEnv)) {
  if (process.env[k] === undefined) process.env[k] = v;
}
// Prefer durable persist for this smoke
if (!process.env.COGENTIA_COP_ACCOUNTING_PERSIST) {
  process.env.COGENTIA_COP_ACCOUNTING_PERSIST = "1";
}
if (!process.env.COGENTIA_COP_SPEND_SPOOL && process.env.COGENTIA_OPS_STATE_DIR) {
  process.env.COGENTIA_COP_SPEND_SPOOL = path.join(
    process.env.COGENTIA_OPS_STATE_DIR,
    "accounting",
    "spend.ndjson",
  );
}

resetAccountingStoreCacheForTests();

const mode = resolveRetrievalMode(
  { AGENT_JHN_WHATSAPP_RETRIEVAL: args.mode || process.env.AGENT_JHN_WHATSAPP_RETRIEVAL || "guide" },
  {},
);
process.env.AGENT_JHN_WHATSAPP_RETRIEVAL = mode;

const question =
  args.question ||
  "One short sentence only: what is Agent John?";
const config = {
  allowed_self_jid: process.env.AGENT_JHN_WHATSAPP_ALLOWED_SELF_JID || "33678059481@s.whatsapp.net",
  visible_agent_id: "agent-jhn-experimental",
  notice_url:
    process.env.AGENT_JHN_WHATSAPP_NOTICE_URL ||
    "https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/research/agent-jhn-experimental-notice.md",
};
const normalized = {
  text: question,
  remote_jid: config.allowed_self_jid,
  conversation_id: `smoke-wa-cop-${Date.now()}`,
};

console.log("# WhatsApp COP accounting smoke (no send)\n");
console.log("mode", mode);
console.log("openai_key", process.env.OPENAI_API_KEY ? "present" : "missing");
console.log("supabase", process.env.SUPABASE_URL ? "present" : "missing");
console.log("cop_persist", process.env.COGENTIA_COP_ACCOUNTING_PERSIST || "(default)");

const draft = await buildCognitiveDraft(normalized, config, {
  retrievalMode: mode,
  guideUrl:
    process.env.AGENT_JHN_WHATSAPP_GUIDE_URL || "http://127.0.0.1:8791/guide/chat",
  gatewayUrl:
    process.env.AGENT_JHN_WHATSAPP_GATEWAY_URL || "http://127.0.0.1:8790",
  guideTimeoutMs: Number(process.env.AGENT_JHN_WHATSAPP_GUIDE_TIMEOUT_MS) || 45000,
});

const cp = draft.cognitive_packet || null;
console.log(
  "draft",
  JSON.stringify({
    ok: Boolean(draft?.text),
    stub: draft?.stub,
    retrieval_mode: draft?.retrieval_mode,
    provenance: draft?.provenance_class,
    prompt_tokens: draft?.prompt_tokens,
    completion_tokens: draft?.completion_tokens,
    packet_id: cp?.packet_id || null,
    own_spend: cp?.own_spend || null,
    consolidated_spend: cp?.consolidated_spend || null,
    own_spend_lines: cp?.own_spend_lines ?? null,
    text_preview: String(draft?.text || "").slice(0, 120),
  }),
);

// Give REST a beat if any fire-and-forget path remains
await new Promise((r) => setTimeout(r, 1500));

const url = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.log("SKIP_VERIFY no supabase env");
  process.exit(cp?.packet_id ? 0 : 2);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  Accept: "application/json",
};
const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
const spends = await (
  await fetch(
    `${url}/rest/v1/cop_accounting_packet_spend?select=created_at,packet_id,provider,model,provisional_cost&created_at=gte.${since}&order=created_at.desc&limit=8`,
    { headers },
  )
).json();
const posts = await (
  await fetch(
    `${url}/rest/v1/cop_accounting_posting?select=created_at,posting_type,account_id,model,surface,packet_id&created_at=gte.${since}&order=created_at.desc&limit=12`,
    { headers },
  )
).json();

console.log("packet_spend_recent", JSON.stringify(spends));
console.log("postings_recent", JSON.stringify(posts));

const waPost = Array.isArray(posts)
  ? posts.find((p) => p.surface === "whatsapp" || p.surface === "whatsapp_synthesis")
  : null;
const waSpend = Array.isArray(spends) && cp?.packet_id
  ? spends.find((s) => s.packet_id === cp.packet_id || (cp.downstream || []).some?.(
    (d) => d.packet_id === s.packet_id,
  ))
  : null;
// downstream shape in projection is list of objects with packet_id
const downIds = Array.isArray(cp?.downstream)
  ? cp.downstream.map((d) => d.packet_id).filter(Boolean)
  : [];
const spendOnTurn = Array.isArray(spends)
  ? spends.find(
    (s) => s.packet_id === cp?.packet_id || downIds.includes(s.packet_id),
  )
  : null;

const ok =
  Boolean(draft?.text) &&
  Boolean(cp?.packet_id) &&
  (Boolean(waPost) || Boolean(spendOnTurn) || Number(cp?.own_spend_lines) > 0);
console.log(
  ok
    ? "WA_COP_SMOKE_OK"
    : "WA_COP_SMOKE_PARTIAL (draft ok but durable WhatsApp index missing — check unit EnvironmentFile)",
);
console.log("hints", {
  wa_posting_surface: waPost?.surface || null,
  spend_on_turn: spendOnTurn?.packet_id || null,
  own_spend_lines: cp?.own_spend_lines,
});
process.exit(ok ? 0 : 3);
