#!/usr/bin/env node

const DEFAULT_URL = "https://cogentia.fractavolta.com";

const command = process.argv[2] || "help";
const args = parseArgs(process.argv.slice(3));

try {
  if (["help", "-h", "--help"].includes(command)) {
    usage();
  } else if (command === "ask") {
    await ask(args);
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
  node scripts/guide-cli.js handoff --q "<question>" [--locale fr|en] [--format markdown|json] [--url <guide-base>]

Examples:
  node scripts/guide-cli.js ask --q "Explain FractaVolta simply." --format markdown
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

async function handoff(options) {
  const result = await callGuide(options);
  const prompt = buildHandoffPrompt(result);
  if (options.format === "json") {
    console.log(JSON.stringify({ ok: result.ok, prompt, guide: result }, null, 2));
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
