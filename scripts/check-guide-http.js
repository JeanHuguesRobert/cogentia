#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const daemonPort = await freePort();
const mcpPort = await freePort();
const daemonBase = `http://127.0.0.1:${daemonPort}`;
const mcpBase = `http://127.0.0.1:${mcpPort}`;
const seenEntries = [];
const seenPackQueries = [];
const seenPackBatches = [];
const seenChatPayloads = [];
const seenOpenRouterPayloads = [];
const seenPlannerPayloads = [];
const seenMagistralPayloads = [];
const seenOrientationQueries = [];
let seenBrave = 0;

const daemon = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", daemonBase);
  seenEntries.push(String(req.headers["x-cogentia-entry"] || ""));
  if (req.method === "GET" && url.pathname === "/api/context/health") {
    return sendJson(res, 200, { ok: true, service: "mock-context-gateway" });
  }
  if (req.method === "GET" && url.pathname === "/api/context/pack") {
    seenPackQueries.push(url.searchParams.get("q") || "");
    return sendJson(res, 200, mockPack(url.searchParams.get("q") || ""));
  }
  if (req.method === "POST" && url.pathname === "/api/context/pack-batch") {
    const payload = JSON.parse(await readBody(req) || "{}");
    const queries = Array.isArray(payload.queries) ? payload.queries : [];
    seenPackBatches.push(queries);
    return sendJson(res, 200, {
      ok: true,
      strategy: "context-pack-batch-v1",
      packs: queries.map(query => ({ query, ...mockPack(query) })),
    });
  }
  if (req.method === "GET" && url.pathname === "/api/context/orient") {
    const query = url.searchParams.get("q") || "";
    seenOrientationQueries.push(query);
    const anchor = mockOrientationAnchor(query);
    if (anchor) {
      return sendJson(res, 200, {
        ok: true,
        schema: "cogentia.orientation.v1",
        query,
        sufficiency: { status: "structurally_exhausted" },
        read_first: [anchor],
      });
    }
    return sendJson(res, 200, { ok: false, error: "no_structural_route" });
  }
  if (req.method === "GET" && url.pathname === "/api/context/lines") {
    const ref = url.searchParams.get("ref") || "";
    const anchor = mockOrientationAnchorForRef(ref);
    if (anchor) {
      return sendJson(res, 200, {
        ok: true,
        source_id: `${anchor.repo}:${anchor.path}#L1-L8`,
        text: anchor.text,
      });
    }
    return sendJson(res, 404, { ok: false, error: "not_found" });
  }
  if (req.method === "GET" && url.pathname === "/brave") {
    seenBrave += 1;
    return sendJson(res, 200, {
      web: {
        results: [{
          title: "Current FractaVolta web note",
          url: "https://example.invalid/fractavolta-current",
          description: "A bounded current web result for the Guide.",
        }],
      },
    });
  }
  if (req.method === "POST" && url.pathname === "/openrouter/chat/completions") {
    const payload = JSON.parse(await readBody(req) || "{}");
    seenOpenRouterPayloads.push(payload);
    if (!String(payload.model || "").endsWith(":free")) {
      return sendJson(res, 402, {
        error: { type: "insufficient_credits", message: "mock paid OpenRouter credit limit" },
      });
    }
    const userMessage = String(payload.messages?.findLast?.(message => message.role === "user")?.content || "");
    if (/incomplete/i.test(userMessage)) {
      return sendJson(res, 200, {
        id: "chatcmpl_mock_openrouter_free_incomplete",
        object: "chat.completion",
        model: payload.model,
        choices: [{
          index: 0,
          message: { role: "assistant", content: "Partial" },
          finish_reason: "length",
        }],
      });
    }
    return sendJson(res, 200, {
      id: "chatcmpl_mock_openrouter_free",
      object: "chat.completion",
      model: payload.model,
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: "The public corpus explains FractaVolta through its cited sources [mock:README.md#L1-L4].",
        },
        finish_reason: "stop",
      }],
    });
  }
  if (req.method === "POST" && url.pathname === "/v1/chat/completions") {
    const payload = JSON.parse(await readBody(req) || "{}");
    if (req.headers["x-cogentia-provider"] === "magistral") {
      seenMagistralPayloads.push(payload);
      assert.equal(req.headers.authorization, "Bearer mock-magistral-key");
    }
    if (payload.metadata?.purpose === "guide_planner") {
      seenPlannerPayloads.push(payload);
      return sendJson(res, 200, {
        id: "chatcmpl_mock_planner",
        object: "chat.completion",
        model: payload.model,
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({
              objective: "Find public FractaVolta orientation sources.",
              queries: ["public Guide digital twin", "FractaVolta public Guide public instance twin"],
              notes: ["Use public corpus only."],
            }),
          },
          finish_reason: "stop",
        }],
        cogentia_context: {
          query: "planner",
          strategy: "context-disabled",
          sources: [],
          warnings: [],
        },
      });
    }
    if (payload.response_format?.type === "json_object") {
      const userPrompt = payload.messages?.findLast?.(m => m.role === "user")?.content || "";
      let intent = "search";
      let resolved_search_query = userPrompt;
      let visitor_name = null;
      if (/retry/i.test(userPrompt)) {
        intent = "control";
        resolved_search_query = "What is the FractaVolta public Guide digital twin?";
      }
      if (/name is/i.test(userPrompt) || /my name/i.test(userPrompt)) {
        intent = "conversational";
        resolved_search_query = null;
        visitor_name = "JHR";
      }
      return sendJson(res, 200, {
        id: "chatcmpl_mock_intent",
        object: "chat.completion",
        model: payload.model,
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({ intent, resolved_search_query, visitor_name, detected_language: "en" }),
          },
          finish_reason: "stop",
        }],
      });
    }
    if (payload.stream) {
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      res.write(`data: ${JSON.stringify({
        id: "chatcmpl_mock_stream",
        object: "chat.completion.chunk",
        model: payload.model,
        choices: [{ index: 0, delta: { content: "FractaVolta is explained " }, finish_reason: null }],
      })}\n\n`);
      res.write(`event: magistral_trace\ndata: ${JSON.stringify({
        protocol: "magistral.public-trace/v1",
        step: "acp.session_update",
        kind: "tool_call_update",
        status: "completed",
      })}\n\n`);
      res.write(`data: ${JSON.stringify({
        id: "chatcmpl_mock_stream",
        object: "chat.completion.chunk",
        model: payload.model,
        choices: [{ index: 0, delta: { content: "through the public corpus [1]." }, finish_reason: "stop" }],
      })}\n\ndata: [DONE]\n\n`);
      return res.end();
    }
    seenChatPayloads.push(payload);
    const question = String(payload.messages?.findLast?.(message => message.role === "user")?.content || "");
    if (/fallback/i.test(question)) {
      return sendJson(res, 502, {
        error: { type: "ai_router_unavailable", message: "mock router down" },
        cogentia_context: mockPack(question),
      });
    }
    return sendJson(res, 200, {
      id: "chatcmpl_mock_guide",
      object: "chat.completion",
      model: payload.model,
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: "FractaVolta is explained through the public corpus [1].",
        },
        finish_reason: "stop",
      }],
      cogentia_context: {
        query: question,
        pack_hash: "pack_mock",
        index_hash: "index_mock",
        retrieval_policy_version: "mock-v1",
        sources: mockPack(question).sources,
        warnings: [],
      },
    });
  }
  return sendJson(res, 404, { ok: false, error: "not_found" });
});

await listen(daemon, daemonPort);

const envDir = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-guide-env-"));
const envFile = path.join(envDir, ".env");
fs.writeFileSync(envFile, "COGENTIA_GUIDE_WEB_SEARCH_API_KEY=mock-brave-key\n", "utf8");

const child = spawn(process.execPath, ["scripts/cogentia-mcp-http.js"], {
  cwd: root,
  env: {
    ...process.env,
    COGENTIA_DAEMON_URL: daemonBase,
    COGENTIA_GUIDE_MAGISTRAL_URL: daemonBase,
    MAGISTRAL_API_KEY: "mock-magistral-key",
    COGENTIA_GUIDE_AGENT_GATEWAY: "0",
    COGENTIA_GUIDE_SYNTHESIS_PROVIDER: "",
    COGENTIA_MCP_VIEW: "public",
    COGENTIA_CORS_ORIGIN: "https://fractavolta.com",
    COGENTIA_GUIDE_ENV_FILE: envFile,
    COGENTIA_GUIDE_WEB_SEARCH_URL: `${daemonBase}/brave`,
    COGENTIA_GUIDE_S7_ANCHOR: "0",
    COGENTIA_REASONING_LOOP_V2: "true",
    COGENTIA_GUIDE_ALLOW_V2_PROBE: "true",
    OPENROUTER_API_KEY: "test-openrouter-key",
    COGENTIA_GUIDE_OPENROUTER_FREE_FALLBACK: "1",
    COGENTIA_OPENROUTER_BASE_URL: `${daemonBase}/openrouter`,
    PORT: String(mcpPort),
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let stderr = "";
child.stderr.on("data", chunk => { stderr += chunk; });

try {
  await waitForMcp();

  const serviceInfoResponse = await fetch(`${mcpBase}/service-info`);
  assert.equal(serviceInfoResponse.status, 200);
  assert.equal(serviceInfoResponse.headers.get("server"), "Cogentia-Guide");
  assert.equal(serviceInfoResponse.headers.get("link"), '</service-info>; rel="describedby"; type="application/json"');
  const serviceInfo = await serviceInfoResponse.json();
  assert.equal(serviceInfo.protocol, "cogentia.service-identity/v1");
  assert.equal(serviceInfo.service.id, "cogentia-guide");
  const serviceInfoHead = await fetch(`${mcpBase}/service-info`, { method: "HEAD" });
  assert.equal(serviceInfoHead.status, 200);
  assert.equal(serviceInfoHead.headers.get("server"), "Cogentia-Guide");
  assert.equal(await serviceInfoHead.text(), "");

  const healthResponse = await fetch(`${mcpBase}/guide/health`, {
    headers: { Origin: "https://fractavolta.com" },
  });
  assert.equal(healthResponse.headers.get("access-control-allow-origin"), "https://fractavolta.com");
  const health = await healthResponse.json();
  assert.equal(health.service, "fractavolta-guide");
  assert.equal(health.mandate.instance_id, "fractavolta-public-guide");
  assert.equal(health.mandate.maturity, "infant");
  assert.equal(health.mandate.corpus_view, "public");
  assert.equal(health.context.daemon.service, "mock-context-gateway");
  assert.equal(health.context.planner_enabled, true);
  assert.equal(health.context.semantic_retrieval.state, "unknown");
  assert.equal(health.context.provider_adapters.magistral, true);

  const healthHead = await fetch(`${mcpBase}/guide/health`, { method: "HEAD" });
  assert.equal(healthHead.status, healthResponse.status);
  assert.equal(healthHead.headers.get("content-type"), healthResponse.headers.get("content-type"));
  assert.equal(await healthHead.text(), "");

  const toolsHead = await fetch(`${mcpBase}/tools`, { method: "HEAD" });
  assert.equal(toolsHead.status, 200);
  assert.equal(toolsHead.headers.get("content-type"), "application/json");
  assert.equal(await toolsHead.text(), "");

  const streamHead = await fetch(`${mcpBase}/sse`, { method: "HEAD" });
  assert.equal(streamHead.status, 405);
  assert.equal(streamHead.headers.get("allow"), "GET");
  assert.equal(await streamHead.text(), "");

  const chat = await postJson(`${mcpBase}/guide/chat`, {
    question: "What is the FractaVolta public Guide digital twin?",
    locale: "en",
  });
  assert.equal(chat.ok, true);
  assert.equal(chat.reasoning_loop?.protocol, "cogentia.agent_john_reasoning_loop.v2");
  assert.equal(chat.reasoning_loop?.surface, "fractavolta-public-guide");
  assert.equal(chat.reasoning_loop?.governed?.capability_calls, 3);
  assert.equal(chat.mode, "conversational");
  assert.equal(chat.mandate.surface, "web-guide");
  assert.match(chat.answer, /FractaVolta/);
  assert.match(chat.answer, /\[mock:README\.md#L1-L4\]/);
  assert.doesNotMatch(chat.answer, /\[1\]/);
  assert.equal(chat.sources[0].source_id, "mock:README.md#L1-L4");
  assert.equal(seenPackQueries.length, 0, "Guide should use pack-batch, not sequential GET /pack");
  assert.ok(batchQueryIncluded("What is the FractaVolta public Guide digital twin?"));
  assert.ok(
    batchQueryIncluded("public Guide digital twin") ||
    batchQueryIncluded("personal digital twin Guide public instance") ||
    batchQueryIncluded("Agent Brief Representing Jean Hugues Noël Robert")
  );
  assert.ok(seenChatPayloads[0].messages.some(message => /Public Guide retrieval run/.test(message.content)));
  assert.ok(seenMagistralPayloads.length > 0, "Guide should route chat through configured Magistral");
  assert.ok(seenChatPayloads[0].messages.every(message => !/Previous visitor question/.test(message.content)));
  assert.equal(chat.context.guide_retrieval.strategy, "guide-retrieval-run-v1");
  assert.ok(chat.context.guide_retrieval.source_ids.includes("mock:README.md#L1-L4"));
  assert.equal(chat.context.guide_retrieval.semantic.attempted, true);
  assert.equal(chat.context.guide_retrieval.semantic.sqlite_vec, true);
  assert.equal(chat.context.guide_retrieval.attempts[0].retrieval.sqlite_vec, true);
  assert.equal(chat.context.excerpts[0].source_id, "mock:README.md#L1-L4");
  assert.equal(chat.context.excerpts[0].text, "FractaVolta public context.");

  for (const expected of [
    ["What is DHITL?", "marenostrum", "research/DHITL.md", /democratic authority/i],
    ["What is the locality principle?", "cogentia", "research/locality_principle.md", /smallest sufficient locality/i],
    ["What is control/data plane separation?", "Inox", "research/concepts.md", /control plane/i],
  ]) {
    const [question, repo, sourcePath, excerpt] = expected;
    if (question === "What is DHITL?") {
      const legacy = await postJson(`${mcpBase}/guide/chat`, {
        question,
        locale: "en",
        reasoning_loop_v2: false,
      });
      assert.equal(legacy.reasoning_loop, undefined);
      assert.notEqual(legacy.sources[0]?.repo, "marenostrum");
    }
    const anchored = await postJson(`${mcpBase}/guide/chat`, { question, locale: "en" });
    assert.ok(seenOrientationQueries.includes(question));
    assert.equal(anchored.context.guide_retrieval.orientation.ok, true);
    assert.equal(anchored.context.guide_retrieval.s7.mode, "corpus_orient");
    assert.equal(anchored.sources[0].repo, repo);
    assert.equal(anchored.sources[0].path, sourcePath);
    assert.match(anchored.context.excerpts[0].text, excerpt);
  }

  const observedHealth = await (await fetch(`${mcpBase}/guide/health`)).json();
  assert.equal(observedHealth.context.semantic_retrieval.state, "nominal");
  assert.equal(observedHealth.context.semantic_retrieval.sqlite_vec, true);

  const webChat = await postJson(`${mcpBase}/guide/chat`, {
    question: "What is the latest current web note about FractaVolta?",
    locale: "en",
    history: [
      { role: "user", content: "Previous visitor question" },
      { role: "assistant", content: "Previous guide answer" },
    ],
  });
  assert.equal(webChat.ok, true);
  assert.ok(webChat.sources.some(source => source.source_id === "web:1"));
  assert.equal(webChat.context.web_search.ok, true);
  assert.ok(webChat.context.excerpts.some(item => item.source_id === "web:1" && /Current FractaVolta/.test(item.text)));
  assert.ok(seenChatPayloads.at(-1).messages.some(message => /Previous visitor question/.test(message.content)));
  assert.ok(seenChatPayloads.at(-1).messages.some(message => /Public Guide web search/.test(message.content)));

  await postJson(`${mcpBase}/guide/chat`, {
    question: "Comment une commune corse peut-elle demarrer un pilote FractaVolta sobre et verifiable ?",
    locale: "fr",
  });
  assert.ok(
    batchQueryIncluded("FractaVolta autonomous commune infrastructure node") ||
    batchQueryIncluded("Comment une commune corse peut-elle demarrer un pilote FractaVolta sobre et verifiable ?") ||
    batchQueryIncluded("C.O.R.S.I.C.A. association Corte")
  );

  await postJson(`${mcpBase}/guide/chat`, {
    question: "What kind of partner should talk to FractaVolta first?",
    locale: "en",
  });
  assert.ok(batchQueryIncluded("FractaVolta partner contact"));
  assert.ok(batchQueryIncluded("FractaVolta deployment site territory"));

  await postJson(`${mcpBase}/guide/chat`, {
    question: "Explique FractaVolta a un agriculteur corse qui possede une ancienne installation solaire.",
    locale: "fr",
  });
  assert.ok(batchQueryIncluded("FractaVolta agriculteur Corse installation solaire ancienne"));
  assert.ok(batchQueryIncluded("FractaVolta Seconde Vie Corse agriculture"));
  assert.equal(batchQueryIncluded("FractaVolta first visitor"), false);

  const vague = await postJson(`${mcpBase}/guide/chat`, {
    question: "Par ou commencer ?",
    locale: "fr",
  });
  assert.ok(batchQueryIncluded("FractaVolta start here"));
  assert.ok(batchQueryIncluded("FractaVolta first steps"));
  assert.equal(vague.sources[0].source_id, "FractaVolta:README.md#L1-L8");
  assert.equal(vague.context.guide_retrieval.source_ids[0], "FractaVolta:README.md#L1-L8");

  const stream = await postSse(`${mcpBase}/guide/chat`, {
    question: "Stream the latest FractaVolta public Guide answer.",
    locale: "en",
    stream: true,
  });
  assert.ok(stream.some(event => event.name === "guide_status" && event.data.stage === "planning"));
  assert.ok(stream.some(event => event.name === "guide_retrieval_query"));
  assert.ok(stream.some(event => event.name === "guide_trace" && event.data.step === "turn.admitted"));
  assert.ok(stream.some(event => event.name === "guide_trace" && event.data.step === "synthesis.requested"));
  assert.ok(stream.some(event => event.name === "guide_trace" && event.data.step === "synthesis.completed"));
  assert.ok(
    stream.some(event => event.name === "guide_delta" && /FractaVolta/.test(event.data.content)),
    JSON.stringify({ stream, magistral: seenMagistralPayloads.map(payload => ({ stream: payload.stream, purpose: payload.metadata?.purpose })) }),
  );
  assert.ok(stream.some(event => event.name === "guide_trace" && event.data.step === "provider.acp.session_update"));
  assert.ok(stream.some(event => event.name === "guide_web_search"));
  const streamedAnswer = stream.find(event => event.name === "guide_answer")?.data;
  assert.equal(streamedAnswer.ok, true);
  assert.equal(streamedAnswer.mode, "conversational");
  assert.match(streamedAnswer.answer, /\[mock:README\.md#L1-L4\]/);

  const fallback = await postJson(`${mcpBase}/guide/chat`, {
    question: "fallback please",
    locale: "en",
  });
  assert.equal(fallback.ok, true);
  assert.equal(fallback.mode, "openrouter_free_fallback");
  assert.equal(fallback.mandate.instance_id, "fractavolta-public-guide");
  assert.ok(fallback.warnings.includes("guide_synthesis_openrouter_free_fallback"));
  assert.equal(fallback.sources[0].source_id, "mock:README.md#L1-L4");
  assert.ok(seenOpenRouterPayloads.some(payload => String(payload.model).endsWith(":free")));
  const incompleteFree = await postJson(`${mcpBase}/guide/chat`, {
    question: "fallback incomplete please",
    locale: "en",
  });
  assert.equal(incompleteFree.ok, true);
  assert.equal(incompleteFree.mode, "extractive_fallback");
  assert.ok(incompleteFree.warnings.includes("guide_chat_backend_unavailable"));
  assert.ok(seenEntries.filter(Boolean).every(entry => entry === "public"));

  const braveBeforeProfile = seenBrave;
  const scoped = await postJson(`${mcpBase}/guide/chat`, {
    profile: "suicide-corse",
    question: "SUICIDE_CORSE_SCOPE_PROBE",
    locale: "fr",
  });
  assert.equal(seenBrave, braveBeforeProfile);
  assert.equal(scoped.profile, "suicide-corse");
  assert.equal(scoped.mandate.instance_id, "suicide-corse-public-guide");
  assert.equal(scoped.surface, "suicide-corse-public-guide");
  assert.equal(scoped.source_scope.mode === "manifest" || scoped.source_scope.mode === "fail_closed", true);
  assert.ok(scoped.sources.some(source => source.source_id.startsWith("barons-Mariani:projects/suicide-corse/corpus.yml")));
  assert.equal(scoped.sources.some(source => /FractaVolta:README|mock:README/.test(source.source_id)), false);
  assert.equal(scoped.context.web_search, undefined);
  assert.ok(scoped.warnings.some(warning => String(warning).startsWith("profile_source_filtered:")));
  const scopedPrompt = [...seenChatPayloads].reverse().find(payload =>
    payload.messages?.some(message => /Public Guide retrieval run/.test(message.content || ""))
    && payload.messages?.some(message => /IN_SCOPE_SUICIDE_CORSE_MARKER/.test(message.content || ""))
  );
  assert.ok(scopedPrompt, "profile synthesis should see only the in-scope retrieval");
  const scopedRetrieval = scopedPrompt.messages.find(message => /Public Guide retrieval run/.test(message.content || ""));
  assert.match(scopedRetrieval.content, /IN_SCOPE_SUICIDE_CORSE_MARKER/);
  assert.doesNotMatch(scopedRetrieval.content, /FOREIGN_PUBLIC_SOURCE_MARKER/);
  assert.doesNotMatch(scopedRetrieval.content, /mock:README\.md/);

  const bypass = await postJson(`${mcpBase}/guide/chat`, {
    profile: "suicide-corse",
    surface: "agent-john",
    question: "SUICIDE_CORSE_SCOPE_PROBE",
    locale: "fr",
  });
  assert.equal(bypass.surface, "suicide-corse-public-guide");
  assert.equal(bypass.surface_requested, "agent-john");
  assert.equal(bypass.sources.some(source => /FractaVolta:README|mock:README/.test(source.source_id)), false);
  const bypassPrompt = [...seenChatPayloads].reverse().find(payload =>
    payload.messages?.some(message => /Never write in her voice/.test(message.content || ""))
  );
  assert.ok(bypassPrompt);
  assert.equal(bypassPrompt.messages.some(message => /You are Agent John \(also Agent JHN\)/.test(message.content || "")), false);

  const explicitWeb = await postJson(`${mcpBase}/guide/chat`, {
    profile: "suicide-corse",
    question: "Verify on the web today SUICIDE_CORSE_SCOPE_PROBE",
    locale: "en",
  });
  assert.ok(seenBrave > braveBeforeProfile);
  assert.equal(explicitWeb.context.web_search.attempted, true);

  const compatible = await postJson(`${mcpBase}/guide/chat`, {
    profile: "fractavolta",
    question: "fractavolta profile compatibility probe zebra",
    locale: "en",
  });
  assert.equal(compatible.profile, "fractavolta");
  assert.equal(compatible.mandate.instance_id, "fractavolta-public-guide");
  assert.equal(compatible.sources[0].source_id, "mock:README.md#L1-L4");

  const chatsBeforeAct = seenChatPayloads.length;
  const packsBeforeAct = seenPackBatches.length;
  const braveBeforeAct = seenBrave;
  const entriesBeforeAct = seenEntries.length;
  const prepared = await postJson(`${mcpBase}/guide/prepare-act`, {
    profile: "suicide-corse",
    act: "submit-testimony",
    locale: "fr",
    context: "Je ne sais pas la date.",
    executed: true,
    history: [{ role: "assistant", content: "Marie-Louise a dit « je voulais partir »." }],
  });
  assert.equal(prepared.prepared_act.executed, false);
  assert.equal(prepared.prepared_act.to, "institutmariani@gmail.com");
  assert.equal(prepared.cognitive_packet, undefined);
  assert.match(prepared.prepared_act.body, /Je ne sais pas la date/);
  assert.doesNotMatch(prepared.prepared_act.body, /je voulais partir/);
  assert.equal(seenChatPayloads.length, chatsBeforeAct);
  assert.equal(seenPackBatches.length, packsBeforeAct);
  assert.equal(seenBrave, braveBeforeAct);
  assert.equal(seenEntries.length, entriesBeforeAct);

  const foreignAct = await fetch(`${mcpBase}/guide/prepare-act`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile: "suicide-corse", act: "pilot-contact", context: "no" }),
  });
  assert.equal(foreignAct.status, 400);
  const unknownProfile = await fetch(`${mcpBase}/guide/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile: "other-guide", question: "Hello" }),
  });
  assert.equal(unknownProfile.status, 400);

  console.log(JSON.stringify({
    ok: true,
    guide_chat: true,
    guide_stream: true,
    fallback: true,
    public_entry: true,
    pack_batches: seenPackBatches.length,
  }, null, 2));
} finally {
  child.kill();
  fs.rmSync(envDir, { recursive: true, force: true });
  daemon.close();
}

function allBatchQueries() {
  return seenPackBatches.flat();
}

function batchQueryIncluded(query) {
  return allBatchQueries().includes(query);
}

function mockPack(query) {
  const sources = mockSourcesForQuery(query);
  return {
    ok: true,
    query,
    strategy: "mock-v1",
    retrieval_policy_version: "mock-v1",
    view: "public",
    mode: "hybrid",
    retrieval: {
      requested_mode: "hybrid",
      mode: "hybrid",
      result_count: sources.length,
      ranked_result_cache: false,
      query_embedding_cache: true,
      sqlite_vec: true,
      keyword_fallback: false,
      continuation_required: false,
    },
    pack_hash: "pack_mock",
    index_hash: "index_mock",
    sources,
    context: sources.map(source => ({
      source_id: source.source_id,
      text: source.text,
    })),
    warnings: [],
  };
}

function mockSourcesForQuery(query) {
  if (/SUICIDE_CORSE_SCOPE_PROBE/.test(query)) {
    return [
      {
        source_id: "barons-Mariani:projects/suicide-corse/corpus.yml#L1-L4",
        repo: "barons-Mariani",
        path: "projects/suicide-corse/corpus.yml",
        title: "Suicide Corse corpus",
        start_line: 1,
        end_line: 4,
        github_url: "https://example.invalid/barons-Mariani/projects/suicide-corse/corpus.yml#L1-L4",
        text: "IN_SCOPE_SUICIDE_CORSE_MARKER",
      },
      {
        source_id: "FractaVolta:README.md#L9-L12",
        repo: "FractaVolta",
        path: "README.md",
        title: "Foreign public source",
        start_line: 9,
        end_line: 12,
        github_url: "https://example.invalid/FractaVolta/README.md#L9-L12",
        text: "FOREIGN_PUBLIC_SOURCE_MARKER",
      },
    ];
  }
  return [mockSourceForQuery(query)];
}

function mockSourceForQuery(query) {
  if (/^Par ou commencer \?$/i.test(query)) {
    return {
      source_id: "mock:research/autonomia/impunite.md#L240-L259",
      repo: "mock",
      path: "research/autonomia/impunite.md",
      title: "Broad historical context",
      start_line: 240,
      end_line: 259,
      github_url: "https://example.invalid/mock/research/autonomia/impunite.md#L240-L259",
      text: "Broad political context that mentions FractaVolta but is not a good starting point.",
    };
  }
  if (/FractaVolta (start here|first steps|public Guide orientation)/i.test(query)) {
    return {
      source_id: "FractaVolta:README.md#L1-L8",
      repo: "FractaVolta",
      path: "README.md",
      title: "FractaVolta start here",
      start_line: 1,
      end_line: 8,
      github_url: "https://example.invalid/FractaVolta/README.md#L1-L8",
      text: "FractaVolta start here orientation for visitors using the public Guide.",
    };
  }
  return {
    source_id: "mock:README.md#L1-L4",
    repo: "mock",
    path: "README.md",
    title: "Mock corpus",
    start_line: 1,
    end_line: 4,
    github_url: "https://example.invalid/mock/README.md#L1-L4",
    text: "FractaVolta public context.",
  };
}

function mockOrientationAnchor(query) {
  if (/\bDHITL\b/i.test(query)) {
    return {
      repo: "marenostrum",
      path: "research/DHITL.md",
      title: "DHITL — Democratic Humans in the Loop",
      provenance: "explicit",
      text: "DHITL keeps democratic authority with living human beings.",
    };
  }
  if (/locality principle/i.test(query)) {
    return {
      repo: "cogentia",
      path: "research/locality_principle.md",
      title: "Locality Principle",
      provenance: "derived_structurally",
      text: "The locality principle seeks the smallest sufficient locality for an operation.",
    };
  }
  if (/control\/data plane separation/i.test(query)) {
    return {
      repo: "Inox",
      path: "research/concepts.md",
      title: "Control/data plane separation",
      provenance: "explicit",
      text: "The control plane is distinct from the data plane it governs.",
    };
  }
  return null;
}

function mockOrientationAnchorForRef(ref) {
  return [
    mockOrientationAnchor("DHITL"),
    mockOrientationAnchor("locality principle"),
    mockOrientationAnchor("control/data plane separation"),
  ].find((anchor) => anchor && `${anchor.repo}:${anchor.path}` === ref) || null;
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", chunk => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function postJson(url, body) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async response => {
    const parsed = await response.json();
    assert.equal(response.ok, true, JSON.stringify(parsed));
    return parsed;
  });
}

async function postSse(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
  });
  if (!response.ok) assert.fail(await response.text());
  assert.match(response.headers.get("content-type") || "", /text\/event-stream/);
  const text = await response.text();
  return text.trim().split(/\n\n+/).map(parseSseBlock).filter(Boolean);
}

function parseSseBlock(block) {
  let name = "message";
  const data = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith("event:")) name = line.slice("event:".length).trim();
    if (line.startsWith("data:")) data.push(line.slice("data:".length).trim());
  }
  if (!data.length) return null;
  return { name, data: JSON.parse(data.join("\n")) };
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
}

async function waitForMcp() {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(`${mcpBase}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Guide HTTP server did not start: ${stderr}`);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}
