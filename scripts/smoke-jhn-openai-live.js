#!/usr/bin/env node
/**
 * Live smoke: Guide + JHN OpenAI surface on Fracta (or local mcp-http).
 *
 * Usage:
 *   node scripts/smoke-jhn-openai-live.js
 *   COGENTIA_GUIDE_BASE=https://cogentia.fractavolta.com node scripts/smoke-jhn-openai-live.js
 *   COGENTIA_JHN_OWNER_API_KEY=... node scripts/smoke-jhn-openai-live.js  # optional owner check
 *
 * Exit 0 if guide health + public models + public chat (non-stream or stream) ok.
 */
const base = String(process.env.COGENTIA_GUIDE_BASE || "https://cogentia.fractavolta.com").replace(/\/$/, "");
const ownerKey = String(process.env.COGENTIA_JHN_OWNER_API_KEY || "").trim();
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 90000);

const results = [];

async function main() {
  // 1) Guide health (existing product)
  await step("guide_health", async () => {
    const r = await fetch(`${base}/guide/health`, { signal: AbortSignal.timeout(20000) });
    const j = await r.json();
    if (!r.ok || j.ok === false) throw new Error(`health ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
    return { service: j.service, retrieval: j.context?.retrieval_backend };
  });

  // 2) Guide chat (short)
  await step("guide_chat", async () => {
    const r = await fetch(`${base}/guide/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        question: "What is FractaVolta in one short sentence?",
        locale: "en",
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok && !j.answer) throw new Error(`guide_chat ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
    return { status: r.status, has_answer: Boolean(j.answer), answer_len: String(j.answer || "").length };
  });

  // 3) OpenAI models (public)
  await step("jhn_models_public", async () => {
    const r = await fetch(`${base}/guide/v1/models`, { signal: AbortSignal.timeout(15000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`models ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
    const ids = (j.data || []).map((m) => m.id);
    if (!ids.includes("jhn-public")) throw new Error(`missing jhn-public in ${ids.join(",")}`);
    return { ids, access_class: j.access_class };
  });

  // 4) OpenAI chat non-stream public
  await step("jhn_chat_public", async () => {
    const r = await fetch(`${base}/guide/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "jhn-public",
        stream: false,
        messages: [{ role: "user", content: "In one sentence, who is Agent John?" }],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`chat ${r.status} ${JSON.stringify(j).slice(0, 400)}`);
    const content = j.choices?.[0]?.message?.content || "";
    if (!content) throw new Error("empty content");
    return {
      status: r.status,
      model: j.model,
      access_class: j.twin?.access_class,
      content_preview: content.slice(0, 160),
    };
  });

  // 5) OpenAI chat SSE public
  await step("jhn_chat_public_sse", async () => {
    const r = await fetch(`${base}/guide/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({
        model: "jhn-public",
        stream: true,
        messages: [{ role: "user", content: "Say hello in five words or fewer." }],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await r.text();
    if (!r.ok) throw new Error(`sse ${r.status} ${text.slice(0, 300)}`);
    if (!text.includes("data:")) throw new Error("no SSE data lines");
    if (!text.includes("[DONE]")) throw new Error("missing [DONE]");
    return { status: r.status, bytes: text.length, has_done: true };
  });

  // 6) Owner key optional
  if (ownerKey) {
    await step("jhn_models_owner", async () => {
      const r = await fetch(`${base}/guide/v1/models`, {
        headers: { Authorization: `Bearer ${ownerKey}` },
        signal: AbortSignal.timeout(15000),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(`owner models ${r.status}`);
      const ids = (j.data || []).map((m) => m.id);
      if (!ids.includes("jhn-owner")) throw new Error("jhn-owner not listed for owner key");
      return { ids, access_class: j.access_class };
    });
  } else {
    results.push({ step: "jhn_models_owner", skipped: true, reason: "COGENTIA_JHN_OWNER_API_KEY unset" });
  }

  const failed = results.filter((r) => r.ok === false);
  console.log(JSON.stringify({ ok: failed.length === 0, base, results }, null, 2));
  process.exit(failed.length === 0 ? 0 : 1);
}

async function step(name, fn) {
  try {
    const detail = await fn();
    results.push({ step: name, ok: true, ...detail });
  } catch (error) {
    results.push({ step: name, ok: false, error: error.message });
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
