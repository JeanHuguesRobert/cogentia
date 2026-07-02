#!/usr/bin/env node

const DEFAULT_URL = "https://cogentia.fractavolta.com";

const command = process.argv[2] || "help";
const args = parseArgs(process.argv.slice(3));

try {
  if (["help", "-h", "--help"].includes(command)) {
    usage();
  } else if (command === "ask") {
    await ask(args);
  } else if (command === "advise") {
    await advise(args);
  } else if (command === "handoff") {
    await handoff(args);
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(`guide-cli: ${error.message}`);
  process.exit(1);
}

function usage() {
  console.log(`FractaVolta Guide CLI

Usage:
  node scripts/guide-cli.js ask --q "<question>" [--locale fr|en] [--format markdown|json] [--url <guide-base>]
  node scripts/guide-cli.js advise --q "<situation>" [--locale fr|en] [--format markdown|json|packet] [--url <guide-base>]
  node scripts/guide-cli.js handoff --q "<question>" [--locale fr|en] [--format markdown|json|packet] [--url <guide-base>]

Examples:
  node scripts/guide-cli.js ask --q "Explain FractaVolta simply." --format markdown
  node scripts/guide-cli.js advise --q "What should I do next on the Guide architecture?"
  node scripts/guide-cli.js handoff --q "Comment une commune corse peut-elle commencer ?" --locale fr
  node scripts/guide-cli.js ask --url http://127.0.0.1:8791 --q "How does the Guide relate to the corpus?"
`);
}

async function ask(options) {
  const result = await callGuide(options);
  if (options.format === "json") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(renderAnswerMarkdown(result));
}

async function advise(options) {
  const originalQuestion = String(options.q || options.question || "").trim();
  if (!originalQuestion) throw new Error("Missing --q <question>");
  const result = await callGuide({
    ...options,
    q: buildAdvisoryQuestion(originalQuestion, options.locale || inferLocale(originalQuestion)),
  });
  result.question = originalQuestion;
  const advice = buildStructuredAdvice(result, originalQuestion);
  if (options.format === "json") {
    console.log(JSON.stringify(advice, null, 2));
    return;
  }
  if (options.format === "packet") {
    console.log(JSON.stringify(buildAdvisoryPacket(advice), null, 2));
    return;
  }
  console.log(renderAdviceMarkdown(advice));
}

async function handoff(options) {
  const result = await callGuide(options);
  const prompt = buildHandoffPrompt(result);
  if (options.format === "json") {
    console.log(JSON.stringify(buildStructuredHandoff(result, prompt), null, 2));
    return;
  }
  if (options.format === "packet") {
    console.log(JSON.stringify(buildCognitivePacket(result, prompt), null, 2));
    return;
  }
  console.log(prompt);
}

async function callGuide(options) {
  const question = String(options.q || options.question || "").trim();
  if (!question) throw new Error("Missing --q <question>");
  const payload = {
    question,
    locale: String(options.locale || inferLocale(question)).trim() || "en",
  };
  if (options.webSearch === false) payload.web_search = false;
  if (options.webSearch === true) payload.web_search = true;
  const started = Date.now();
  const response = await fetch(normalizeGuideUrl(options.url || DEFAULT_URL), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(boundedInteger(options.timeoutMs, 60000, 1000, 300000)),
  });
  const body = await readResponseBody(response);
  if (!response.ok || !body?.ok) {
    throw new Error(body?.message || body?.error || `Guide returned HTTP ${response.status}`);
  }
  return {
    ...body,
    cli: {
      guide_url: normalizeGuideUrl(options.url || DEFAULT_URL).href,
      latency_ms: Date.now() - started,
    },
  };
}

function renderAnswerMarkdown(result) {
  const lines = [
    `# Guide Answer`,
    "",
    `**Question:** ${result.question || ""}`,
    "",
    result.answer || "(no answer)",
    "",
  ];
  if (Array.isArray(result.sources) && result.sources.length) {
    lines.push("## Sources", "");
    for (const source of result.sources.slice(0, 8)) {
      lines.push(`- \`${source.source_id || ""}\` ${source.title || source.path || ""}${source.url ? ` (${source.url})` : ""}`);
    }
    lines.push("");
  }
  const excerpts = guideSourceExcerpts(result);
  if (excerpts.length) {
    lines.push("## Excerpts", "");
    for (const excerpt of excerpts.slice(0, 4)) {
      lines.push(`### ${excerpt.source_id}`, "", excerpt.text, "");
    }
  }
  const web = result.context?.web_search;
  lines.push("## Diagnostics", "");
  lines.push(`- Mode: ${result.mode || "-"}`);
  lines.push(`- Latency: ${result.cli?.latency_ms || 0} ms`);
  lines.push(`- Web search: ${web ? `${web.attempted ? "attempted" : "not attempted"}${web.ok ? ", ok" : ", not ok"}` : "not attempted"}`);
  if (Array.isArray(result.warnings) && result.warnings.length) {
    lines.push(`- Warnings: ${result.warnings.join(", ")}`);
  }
  return `${lines.join("\n")}\n`;
}

function renderAdviceMarkdown(advice) {
  const lines = [
    "# Guide Advice",
    "",
    `**Situation:** ${advice.question}`,
    "",
    advice.guide_answer || "(no advice)",
    "",
    "## Mandate",
    "",
    `- Allowed: ${advice.advisory_mandate.allowed.join(", ")}`,
    `- Forbidden: ${advice.advisory_mandate.forbidden.join(", ")}`,
    "",
  ];
  if (Array.isArray(advice.sources) && advice.sources.length) {
    lines.push("## Sources", "");
    for (const source of advice.sources.slice(0, 8)) {
      lines.push(`- \`${source.source_id}\` ${source.title || source.path || ""}${source.url ? ` (${source.url})` : ""}`);
    }
    lines.push("");
  }
  if (Array.isArray(advice.excerpts) && advice.excerpts.length) {
    lines.push("## Excerpts", "");
    for (const excerpt of advice.excerpts.slice(0, 4)) {
      lines.push(`### ${excerpt.source_id}`, "", excerpt.text, "");
    }
  }
  lines.push("## Diagnostics", "");
  lines.push(`- Mode: ${advice.diagnostics.mode || "-"}`);
  lines.push(`- Latency: ${advice.diagnostics.latency_ms || 0} ms`);
  lines.push(`- Web search: ${advice.diagnostics.web_search ? `${advice.diagnostics.web_search.attempted ? "attempted" : "not attempted"}${advice.diagnostics.web_search.ok ? ", ok" : ", not ok"}` : "not attempted"}`);
  if (Array.isArray(advice.warnings) && advice.warnings.length) {
    lines.push(`- Warnings: ${advice.warnings.join(", ")}`);
  }
  return `${lines.join("\n")}\n`;
}

function buildHandoffPrompt(result) {
  const locale = String(result.locale || "").toLowerCase();
  const fr = locale.startsWith("fr");
  const lines = [
    fr ? "# Passage depuis le Guide public FractaVolta" : "# FractaVolta public Guide handoff",
    "",
    fr
      ? "Aidez-moi a approfondir une reponse du Guide public FractaVolta. Restez ancre dans les sources publiques fournies. Distinguez les sources du corpus des sources web. Si les preuves sont insuffisantes, dites-le."
      : "You are helping me deepen a public FractaVolta Guide answer. Stay grounded in the supplied public sources. Distinguish corpus sources from web sources. If evidence is insufficient, say so.",
    "",
    fr ? "## Ma question" : "## My question",
    result.question || "",
    "",
    fr ? "## Reponse du Guide" : "## Guide answer",
    result.answer || "",
    "",
    fr ? "## Sources publiques" : "## Public sources",
  ];
  const sources = Array.isArray(result.sources) ? result.sources.slice(0, 8) : [];
  if (sources.length) {
    for (const [index, source] of sources.entries()) {
      const parts = [
        `${index + 1}. ${source.title || source.path || source.source_id || (fr ? "Source sans titre" : "Untitled source")}`,
        `source_id=${source.source_id || ""}`,
      ];
      if (source.url) parts.push(`url=${source.url}`);
      lines.push(parts.join(" | "));
    }
  } else {
    lines.push(fr ? "Aucune liste de sources n'a ete capturee." : "No source list was captured.");
  }

  const excerpts = guideSourceExcerpts(result);
  if (excerpts.length) {
    lines.push("", fr ? "## Extraits publics utiles" : "## Relevant public excerpts");
    for (const [index, excerpt] of excerpts.slice(0, 6).entries()) {
      lines.push("", `### ${index + 1}. ${excerpt.source_id}`, excerpt.text);
    }
  }

  const web = result.context?.web_search;
  if (web?.attempted) {
    lines.push(
      "",
      fr ? "## Note de recherche web" : "## Web search note",
      fr
        ? "Le Guide a tente une recherche web. Traitez les resultats web comme un contexte externe actuel, pas comme l'autorite du corpus."
        : "The Guide attempted web search. Treat web results as current external context, not as corpus authority."
    );
  }

  lines.push(
    "",
    fr ? "## Ce que j'attends de vous" : "## What I want from you",
    fr
      ? "1. Approfondissez la reponse.\n2. Citez les source_id ou URL ci-dessus.\n3. Separez ce qui est certain, plausible et manquant.\n4. Terminez en proposant une question de suivi precise que je pourrai recoller dans le Guide FractaVolta."
      : "1. Explain the answer more deeply.\n2. Keep citations to the source ids or URLs above.\n3. Separate what is certain, plausible, and missing.\n4. End by proposing one precise follow-up question I can paste back into the FractaVolta Guide.",
    "",
    fr ? "Endpoint du Guide public :" : "Public Guide endpoint:",
    result.cli?.guide_url || normalizeGuideUrl(DEFAULT_URL).href
  );
  return `${lines.join("\n")}\n`;
}

function buildStructuredHandoff(result, prompt = buildHandoffPrompt(result)) {
  const sources = normalizeHandoffSources(result.sources);
  const excerpts = guideSourceExcerpts(result);
  const web = result.context?.web_search;
  return {
    ok: true,
    kind: "guide_handoff",
    schema_version: "0.1",
    created_at: new Date().toISOString(),
    locale: result.locale || "en",
    intent: "deepen_guide_answer",
    authority: {
      primary: "fractavolta_public_corpus",
      web_search: web?.attempted ? "external_current_context" : "not_used",
      instruction: "Treat corpus sources as primary authority. Treat web results as current external context.",
    },
    question: result.question || "",
    guide_answer: result.answer || "",
    sources,
    excerpts,
    warnings: Array.isArray(result.warnings) ? result.warnings.map(String) : [],
    diagnostics: {
      mode: result.mode || "",
      guide_url: result.cli?.guide_url || normalizeGuideUrl(DEFAULT_URL).href,
      latency_ms: result.cli?.latency_ms || 0,
      retrieval_policy_version: result.context?.retrieval_policy_version || "",
      web_search: web ? {
        attempted: Boolean(web.attempted),
        ok: Boolean(web.ok),
        query: String(web.query || ""),
        source_ids: Array.isArray(web.source_ids) ? web.source_ids.map(String) : [],
        warnings: Array.isArray(web.warnings) ? web.warnings.map(String) : [],
      } : undefined,
    },
    return_instruction: result.locale?.startsWith?.("fr")
      ? "Terminez en proposant une question de suivi precise que l'usager pourra recoller dans le Guide FractaVolta."
      : "End by proposing one precise follow-up question the user can paste back into the FractaVolta Guide.",
    prompt,
  };
}

function buildAdvisoryQuestion(question, locale) {
  const fr = String(locale || "").toLowerCase().startsWith("fr");
  if (fr) {
    return [
      "Mode conseil du Guide FractaVolta.",
      "Analysez la situation suivante sans executer d'action.",
      "Inferez l'intention, proposez un plan court, jugez les risques, precisez les limites d'autorite, citez les sources publiques utiles, et indiquez quel paquet ou passage a un autre agent serait pertinent.",
      "N'effectuez aucune mutation, publication, depense non bornee, exposition de donnees privees, ou decision d'autorite finale.",
      "",
      `Situation: ${question}`,
    ].join("\n");
  }
  return [
    "FractaVolta Guide advisory mode.",
    "Analyze the following situation without executing any action.",
    "Infer intent, propose a short plan, judge risks, state authority boundaries, cite useful public sources, and say what packet or handoff to another agent would be appropriate.",
    "Do not mutate, publish, spend unbounded quota, expose private data, impersonate the owner, or decide final authority.",
    "",
    `Situation: ${question}`,
  ].join("\n");
}

function buildStructuredAdvice(result, originalQuestion) {
  const web = result.context?.web_search;
  return {
    ok: true,
    kind: "guide_advice",
    schema_version: "0.1",
    created_at: new Date().toISOString(),
    locale: result.locale || inferLocale(originalQuestion),
    question: originalQuestion,
    guide_answer: result.answer || "",
    sources: normalizeHandoffSources(result.sources),
    excerpts: guideSourceExcerpts(result),
    warnings: Array.isArray(result.warnings) ? result.warnings.map(String) : [],
    advisory_mandate: advisoryMandate(),
    diagnostics: {
      mode: result.mode || "",
      guide_url: result.cli?.guide_url || normalizeGuideUrl(DEFAULT_URL).href,
      latency_ms: result.cli?.latency_ms || 0,
      retrieval_policy_version: result.context?.retrieval_policy_version || "",
      web_search: web ? {
        attempted: Boolean(web.attempted),
        ok: Boolean(web.ok),
        query: String(web.query || ""),
        source_ids: Array.isArray(web.source_ids) ? web.source_ids.map(String) : [],
        warnings: Array.isArray(web.warnings) ? web.warnings.map(String) : [],
      } : undefined,
    },
  };
}

function buildAdvisoryPacket(advice) {
  return {
    ok: true,
    kind: "cognitive_packet",
    schema_version: "0.1",
    packet_id: `guide_advice_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    created_at: advice.created_at,
    protocol_family: "cop",
    intent: {
      type: "guide_advisory_review",
      description: "Ask the Guide to infer intent, propose a plan, judge risks, and prepare a safe handoff without executing.",
    },
    authority: {
      primary: "fractavolta_public_corpus",
      instruction: "Use this as advisory grounding only. Authorized execution must happen through a separate explicit tool or workflow.",
    },
    permissions: {
      corpus_view: "public",
      may_mutate_corpus: false,
      may_impersonate_owner: false,
      may_execute: false,
      may_use_external_agent: true,
    },
    mandate: advice.advisory_mandate,
    evidence: {
      sources: advice.sources,
      excerpts: advice.excerpts,
      warnings: advice.warnings,
    },
    payload: {
      question: advice.question,
      guide_answer: advice.guide_answer,
    },
    reply_route: {
      type: "guide_advice",
      endpoint: advice.diagnostics.guide_url,
      instruction: "Return with an explicit proposed next action, evidence gaps, and any handoff packet updates.",
    },
    trace: {
      generated_by: "cogentia-guide-cli",
      guide_mode: advice.diagnostics.mode,
      retrieval_policy_version: advice.diagnostics.retrieval_policy_version,
      latency_ms: advice.diagnostics.latency_ms,
    },
  };
}

function advisoryMandate() {
  return {
    allowed: [
      "infer_intent",
      "propose_plan",
      "judge_risks",
      "cite",
      "packetize",
      "handoff",
      "summarize",
      "document",
    ],
    forbidden: [
      "mutate",
      "commit",
      "deploy",
      "publish",
      "spend_unbounded_quota",
      "expose_private_data",
      "impersonate_owner",
      "decide_final_authority",
    ],
  };
}

function buildCognitivePacket(result, prompt = buildHandoffPrompt(result)) {
  const handoff = buildStructuredHandoff(result, prompt);
  return {
    ok: true,
    kind: "cognitive_packet",
    schema_version: "0.1",
    packet_id: `guide_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    created_at: handoff.created_at,
    protocol_family: "cop",
    intent: {
      type: "deepen_guide_answer",
      description: "Deepen a FractaVolta public Guide answer with a user-selected external agent.",
    },
    authority: handoff.authority,
    permissions: {
      corpus_view: "public",
      may_mutate_corpus: false,
      may_impersonate_owner: false,
      may_use_external_agent: true,
    },
    evidence: {
      sources: handoff.sources,
      excerpts: handoff.excerpts,
      warnings: handoff.warnings,
    },
    payload: {
      question: handoff.question,
      guide_answer: handoff.guide_answer,
      prompt: handoff.prompt,
    },
    reply_route: {
      type: "fractavolta_guide",
      endpoint: handoff.diagnostics.guide_url,
      instruction: handoff.return_instruction,
    },
    trace: {
      generated_by: "cogentia-guide-cli",
      guide_mode: handoff.diagnostics.mode,
      retrieval_policy_version: handoff.diagnostics.retrieval_policy_version,
      latency_ms: handoff.diagnostics.latency_ms,
    },
  };
}

function normalizeHandoffSources(sources) {
  if (!Array.isArray(sources)) return [];
  return sources.slice(0, 12).map(source => ({
    source_id: String(source.source_id || ""),
    title: String(source.title || source.path || source.source_id || ""),
    repo: String(source.repo || ""),
    path: String(source.path || ""),
    url: String(source.url || source.github_url || ""),
  })).filter(source => source.source_id);
}

function guideSourceExcerpts(result) {
  const raw = Array.isArray(result?.context?.excerpts) ? result.context.excerpts : [];
  const seen = new Set();
  return raw.map(item => {
    const sourceId = String(item?.source_id || "").trim();
    const text = compactText(item?.text, 900);
    if (!sourceId || !text || seen.has(sourceId)) return null;
    seen.add(sourceId);
    return { source_id: sourceId, text };
  }).filter(Boolean).slice(0, 8);
}

function compactText(value, maxChars) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, Math.max(1, maxChars - 3)).trim()}...`;
}

async function readResponseBody(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

function normalizeGuideUrl(value) {
  const url = new URL(String(value || DEFAULT_URL));
  if (!url.pathname || url.pathname === "/") url.pathname = "/guide/chat";
  return url;
}

function inferLocale(question) {
  return /[àâçéèêëîïôùûüÿœ]|\\b(comment|pourquoi|quel|quelle|commune|corse|avec|dans)\\b/i.test(question)
    ? "fr"
    : "en";
}

function parseArgs(raw) {
  const parsed = {};
  for (let index = 0; index < raw.length; index++) {
    const arg = raw[index];
    if (!arg.startsWith("--")) continue;
    const key = toCamel(arg.slice(2));
    const next = raw[index + 1];
    if (next === undefined || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  if (!parsed.format) parsed.format = "markdown";
  if (parsed.noWebSearch) parsed.webSearch = false;
  return parsed;
}

function boundedInteger(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(number)));
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}
