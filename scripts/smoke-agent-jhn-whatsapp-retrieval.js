#!/usr/bin/env node
/**
 * Smoke: Agent JHN WhatsApp cognitive retrieval modes (guide | librarian | shadow).
 *
 * Does NOT open WhatsApp or send messages. Exercises buildCognitiveDraft only.
 *
 * Usage:
 *   node scripts/smoke-agent-jhn-whatsapp-retrieval.js --fixture
 *   node scripts/smoke-agent-jhn-whatsapp-retrieval.js --mode shadow --limit 3
 *   node scripts/smoke-agent-jhn-whatsapp-retrieval.js --mode librarian --limit 5
 *
 * Env:
 *   AGENT_JHN_WHATSAPP_GUIDE_URL      default http://127.0.0.1:8791/guide/chat
 *   AGENT_JHN_WHATSAPP_GATEWAY_URL    default http://127.0.0.1:8790
 *   AGENT_JHN_WHATSAPP_GUIDE_TIMEOUT_MS
 *   OPENAI_API_KEY                    optional (extractive fallbacks still work)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCognitiveDraft,
  resolveRetrievalMode,
} from "./lib/agent-jhn-whatsapp/draft.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const args = parseArgs(process.argv.slice(2));
const fixtureMode = Boolean(args.fixture);
const mode = resolveRetrievalMode(
  { AGENT_JHN_WHATSAPP_RETRIEVAL: args.mode || process.env.AGENT_JHN_WHATSAPP_RETRIEVAL },
  {},
);
const limit = Math.max(1, Math.min(Number(args.limit) || 3, 20));
const guideUrl = String(
  args.guideUrl ||
  process.env.AGENT_JHN_WHATSAPP_GUIDE_URL ||
  "http://127.0.0.1:8791/guide/chat",
);
const gatewayUrl = String(
  args.gatewayUrl ||
  process.env.AGENT_JHN_WHATSAPP_GATEWAY_URL ||
  process.env.COGENTIA_CONTEXT_GATEWAY_URL ||
  "http://127.0.0.1:8790",
).replace(/\/$/, "");
const outDir = path.resolve(args.outDir || path.join(root, ".cogentia", "evals", "agent-jhn-retrieval"));
const questionsPath = path.resolve(
  args.questions || path.join(root, "docs", "evals", "guide-questions.json"),
);
const hasOpenAi = Boolean(String(process.env.OPENAI_API_KEY || "").trim());

const config = {
  allowed_self_jid: "33678059481@s.whatsapp.net",
  visible_agent_id: "agent-jhn-experimental",
  notice_url: "https://example.invalid/notice",
};

const fixtureGuide = JSON.parse(
  fs.readFileSync(path.join(here, "fixtures", "agent-jhn-answer-core", "guide-fractavolta.json"), "utf8"),
);

async function main() {
  const generatedAt = new Date().toISOString();
  const probes = fixtureMode
    ? { guide: { ok: true, mode: "fixture" }, gateway: { ok: true, mode: "fixture" } }
    : await probeServices(guideUrl, gatewayUrl);

  const questions = fixtureMode
    ? fixtureQuestions(limit)
    : loadQuestions(questionsPath, limit);
  const draftOptions = fixtureMode
    ? fixtureDraftOptions(mode)
    : {
        retrievalMode: mode,
        guideUrl,
        gatewayUrl,
        guideTimeoutMs: Number(process.env.AGENT_JHN_WHATSAPP_GUIDE_TIMEOUT_MS) || 45000,
        librarianSearchMode: args.searchMode || "keyword",
        preferOpen: false,
      };

  const results = [];
  for (const [index, item] of questions.entries()) {
    process.stderr.write(`[retrieval-smoke] ${index + 1}/${questions.length} ${item.id} mode=${mode}\n`);
    const started = Date.now();
    const diagnostics = [];
    const shadowReports = [];
    let draft;
    let error = null;
    try {
      draft = await buildCognitiveDraft(
        {
          text: item.question,
          remote_jid: config.allowed_self_jid,
          conversation_id: `smoke:${item.id}`,
        },
        config,
        {
          ...draftOptions,
          onCognitiveError: (_err, event) => diagnostics.push(event),
          onShadowCompare: (summary) => shadowReports.push(summary),
        },
      );
    } catch (err) {
      error = {
        name: err?.name || "Error",
        message: String(err?.message || err).slice(0, 240),
      };
    }
    results.push({
      id: item.id,
      locale: item.locale || "en",
      question: item.question,
      elapsed_ms: Date.now() - started,
      error,
      draft: draft ? summarizeDraft(draft) : null,
      shadow_reports: shadowReports,
      diagnostics: diagnostics.slice(0, 12),
      gates: scoreGates(draft, mode, item, { fixture: fixtureMode }),
    });
  }

  const summary = summarize(results, mode, probes, hasOpenAi);
  const report = {
    kind: "agent-jhn-whatsapp-retrieval-smoke/v1",
    generated_at: generatedAt,
    fixture: fixtureMode,
    mode,
    guide_url: fixtureMode ? "fixture" : guideUrl,
    gateway_url: fixtureMode ? "fixture" : gatewayUrl,
    openai_configured: hasOpenAi,
    probes,
    summary,
    results,
  };

  fs.mkdirSync(outDir, { recursive: true });
  const stem = `${generatedAt.replace(/[:.]/g, "-")}-${fixtureMode ? "fixture" : "live"}-${mode}`;
  const jsonPath = path.join(outDir, `${stem}.json`);
  const mdPath = path.join(outDir, `${stem}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, renderMarkdown(report));

  console.log(JSON.stringify({
    ok: summary.ok,
    mode,
    fixture: fixtureMode,
    cases: summary.cases,
    passed: summary.passed,
    failed: summary.failed,
    probes,
    openai_configured: hasOpenAi,
    report_json: path.relative(root, jsonPath).replace(/\\/g, "/"),
    report_md: path.relative(root, mdPath).replace(/\\/g, "/"),
    note: summary.note,
  }, null, 2));

  if (!summary.ok) process.exit(1);
}

function fixtureDraftOptions(retrievalMode) {
  const librarian = async () => ({
    ok: true,
    path: "librarian_c",
    answer: "Fixture librarian answer about FractaVolta [cogentia:docs/fixture.md#L1-L4].",
    provider: "extractive-fallback",
    model: null,
    sources: [{ source_id: "cogentia:docs/fixture.md#L1-L4" }],
    packet: {
      coverage: "enough",
      source_ids: ["cogentia:docs/fixture.md#L1-L4"],
    },
    explore: { ok: true, toolCalls: 2, searchCalls: 1, path: "fixture" },
    latencyMs: 5,
  });

  if (retrievalMode === "librarian") {
    return {
      retrievalMode,
      answerWithLibrarian: librarian,
    };
  }

  // guide + shadow: intercept fetch for guide and optional OpenAI
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    if (target.includes("/guide/chat")) {
      return jsonResponse(fixtureGuide);
    }
    if (target.includes("api.openai.com")) {
      const body = JSON.parse(String(options.body || "{}"));
      return jsonResponse({
        model: body.model || "gpt-5.6-terra",
        choices: [{
          message: {
            role: "assistant",
            content: "Fixture Guide-path synthesis grounded on corpus [FractaVolta:research/fractavolta_paper.md#L450-L469].",
          },
          finish_reason: "stop",
        }],
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      }, 200, { "x-request-id": "req_fixture_smoke" });
    }
    if (typeof originalFetch === "function") return originalFetch(url, options);
    throw new Error(`fixture fetch blocked: ${target}`);
  };

  // Restore after process ends is fine for a one-shot smoke; fixture path never needs real network.
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "fixture-key-never-sent";

  return {
    retrievalMode,
    answerWithLibrarian: librarian,
  };
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

async function probeServices(guide, gateway) {
  const [guideProbe, gatewayProbe] = await Promise.all([
    probeGuide(guide),
    probeGateway(gateway),
  ]);
  return { guide: guideProbe, gateway: gatewayProbe };
}

async function probeGuide(url) {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ question: "ping", locale: "en", web_search: false }),
      signal: AbortSignal.timeout(12000),
    });
    return {
      ok: response.ok,
      status: response.status,
      elapsed_ms: Date.now() - started,
      url,
    };
  } catch (error) {
    return {
      ok: false,
      error: String(error?.message || error).slice(0, 160),
      elapsed_ms: Date.now() - started,
      url,
    };
  }
}

async function probeGateway(baseUrl) {
  const started = Date.now();
  const url = `${baseUrl}/api/context/search?q=Cogentia&limit=1&mode=keyword`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const body = await response.json().catch(() => null);
    return {
      ok: Boolean(response.ok && body?.ok),
      status: response.status,
      hits: Array.isArray(body?.results) ? body.results.length : 0,
      elapsed_ms: Date.now() - started,
      url: baseUrl,
    };
  } catch (error) {
    return {
      ok: false,
      error: String(error?.message || error).slice(0, 160),
      elapsed_ms: Date.now() - started,
      url: baseUrl,
    };
  }
}

function fixtureQuestions(max) {
  return [
    {
      id: "fixture_fractavolta",
      locale: "en",
      question: "What is FractaVolta?",
      expected: ["FractaVolta"],
    },
    {
      id: "fixture_cogentia",
      locale: "en",
      question: "What is Cogentia in one sentence?",
      expected: [],
    },
  ].slice(0, max);
}

function loadQuestions(filePath, max) {
  if (!fs.existsSync(filePath)) {
    return fixtureQuestions(max);
  }
  const all = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return (Array.isArray(all) ? all : []).slice(0, max);
}

function summarizeDraft(draft) {
  return {
    retrieval_mode: draft.retrieval_mode || null,
    provenance_class: draft.provenance_class || null,
    stub: Boolean(draft.stub),
    text_length: String(draft.text || "").length,
    text_preview: String(draft.text || "").replace(/\s+/g, " ").trim().slice(0, 220),
    sources: Array.isArray(draft.sources) ? draft.sources.slice(0, 8) : [],
    librarian: draft.librarian || null,
    shadow: draft.shadow || null,
  };
}

function scoreGates(draft, mode, item, options = {}) {
  if (!draft) {
    return { ok: false, reasons: ["draft_threw"] };
  }
  const reasons = [];
  if (draft.retrieval_mode !== mode) reasons.push("retrieval_mode_mismatch");
  if (mode === "shadow") {
    if (!draft.shadow) reasons.push("missing_shadow");
    else if (!draft.shadow.ok) reasons.push("shadow_librarian_failed");
    // Live text must not be pure librarian-only provenance
    if (String(draft.provenance_class || "").startsWith("librarian-")) {
      reasons.push("shadow_leaked_librarian_as_live");
    }
  }
  if (mode === "librarian" && draft.stub) reasons.push("librarian_stub");
  if (mode === "guide" && draft.stub) reasons.push("guide_stub");
  if (!draft.stub && String(draft.text || "").trim().length < 20) reasons.push("answer_too_short");
  // Lexical expected tokens are advisory for smoke (extractive-only live often misses them).
  const soft = [];
  if (!options.fixture && Array.isArray(item.expected) && item.expected.length && !draft.stub) {
    const hay = String(draft.text || "").toLowerCase();
    const hit = item.expected.some((token) => hay.includes(String(token).toLowerCase()));
    if (!hit) soft.push("expected_token_miss");
  }
  return { ok: reasons.length === 0, reasons, soft };
}

function summarize(results, mode, probes, openaiConfigured) {
  const passed = results.filter((row) => row.gates?.ok).length;
  const failed = results.length - passed;
  let note = "WhatsApp messages are never sent by this smoke.";
  if (!openaiConfigured) note += " OPENAI_API_KEY unset: extractive/fallback paths only.";
  if (!probes.guide?.ok && (mode === "guide" || mode === "shadow")) {
    note += " Guide probe failed: guide/shadow live answers may stub.";
  }
  if (!probes.gateway?.ok && (mode === "librarian" || mode === "shadow")) {
    note += " Gateway probe failed: librarian path may fail.";
  }
  // Fixture smoke must pass; live smoke is ok if cases pass gates.
  // For live, if probes block all paths, fail soft with clear note.
  const ok = failed === 0;
  return {
    ok,
    cases: results.length,
    passed,
    failed,
    mode,
    note,
  };
}

function renderMarkdown(report) {
  const lines = [
    `# Agent JHN WhatsApp retrieval smoke`,
    "",
    `- generated: ${report.generated_at}`,
    `- mode: **${report.mode}**`,
    `- fixture: ${report.fixture}`,
    `- cases: ${report.summary.cases} (pass ${report.summary.passed} / fail ${report.summary.failed})`,
    `- guide: ${report.guide_url}`,
    `- gateway: ${report.gateway_url}`,
    `- openai: ${report.openai_configured}`,
    "",
    report.summary.note,
    "",
    "## Cases",
    "",
  ];
  for (const row of report.results) {
    lines.push(`### ${row.id}`);
    lines.push("");
    lines.push(`- question: ${row.question}`);
    lines.push(`- elapsed_ms: ${row.elapsed_ms}`);
    lines.push(`- gates: ${row.gates?.ok ? "pass" : "fail"} ${(row.gates?.reasons || []).join(", ")}`);
    if (row.gates?.soft?.length) lines.push(`- soft: ${row.gates.soft.join(", ")}`);
    if (row.draft) {
      lines.push(`- provenance: ${row.draft.provenance_class}`);
      lines.push(`- stub: ${row.draft.stub}`);
      lines.push(`- preview: ${row.draft.text_preview}`);
      if (row.draft.shadow) {
        lines.push(`- shadow.ok: ${row.draft.shadow.ok} provider=${row.draft.shadow.provider} answer_length=${row.draft.shadow.answer_length}`);
      }
    }
    if (row.error) lines.push(`- error: ${row.error.message}`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--fixture") out.fixture = true;
    else if (a === "--mode") out.mode = argv[++i];
    else if (a === "--limit") out.limit = argv[++i];
    else if (a === "--questions") out.questions = argv[++i];
    else if (a === "--guide-url") out.guideUrl = argv[++i];
    else if (a === "--gateway-url") out.gatewayUrl = argv[++i];
    else if (a === "--out-dir") out.outDir = argv[++i];
    else if (a === "--search-mode") out.searchMode = argv[++i];
    else if (a === "--help" || a === "-h") {
      console.log(`Usage: node scripts/smoke-agent-jhn-whatsapp-retrieval.js [--fixture] [--mode guide|librarian|shadow] [--limit N]`);
      process.exit(0);
    }
  }
  return out;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
