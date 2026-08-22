/**
 * Phase 3 — packet-shaped MCP tool results.
 * Maps tool outcomes to a stable envelope agents can resume across clients
 * without assuming an in-memory MCP session (Cognitive Packet affinity).
 *
 * @see docs/cogentia-js-mcp-agent-path.md
 * @see research/cognitive_packets.md
 */

export const ENVELOPE_KIND = "cogentia.mcp_tool_result/v1";

/** Extract W3C Trace Context style keys from MCP request _meta. */
export function extractCorrelation(meta = {}) {
  if (!meta || typeof meta !== "object") return {};
  const pick = (...keys) => {
    for (const k of keys) {
      const v = meta[k];
      if (v != null && String(v).trim()) return String(v).trim();
    }
    return undefined;
  };
  const out = {};
  const traceparent = pick(
    "traceparent",
    "io.opentelemetry.traceparent",
    "otel.traceparent"
  );
  const tracestate = pick("tracestate", "io.opentelemetry.tracestate");
  const baggage = pick("baggage", "io.opentelemetry.baggage");
  if (traceparent) out.traceparent = traceparent;
  if (tracestate) out.tracestate = tracestate;
  if (baggage) out.baggage = baggage;
  return out;
}

function citationFromHit(item) {
  if (!item || typeof item !== "object") return null;
  const source_id = item.source_id || item.id || item.ref || null;
  if (!source_id && !item.path && !item.repo) return null;
  return {
    source_id: source_id || null,
    repo: item.repo || null,
    path: item.path || item.file || null,
    start_line: item.start_line ?? item.start ?? null,
    end_line: item.end_line ?? item.end ?? null,
    title: item.title || null,
    score: item.score ?? null,
  };
}

/** Pull citable refs from known daemon result shapes. */
export function extractCitations(data) {
  if (!data || typeof data !== "object") return [];
  const out = [];
  const seen = new Set();
  const push = (c) => {
    if (!c) return;
    const key = `${c.source_id || ""}|${c.repo || ""}|${c.path || ""}|${c.start_line || ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(c);
  };

  for (const key of ["results", "hits", "documents", "sections", "items", "chunks"]) {
    if (Array.isArray(data[key])) {
      for (const item of data[key]) push(citationFromHit(item));
    }
  }

  if (Array.isArray(data.packs)) {
    for (const pack of data.packs) {
      if (Array.isArray(pack?.results)) {
        for (const item of pack.results) push(citationFromHit(item));
      }
      if (Array.isArray(pack?.documents)) {
        for (const item of pack.documents) push(citationFromHit(item));
      }
    }
  }

  // get_lines / single doc
  if (data.ref || data.document) {
    push(
      citationFromHit({
        id: data.result_id || data.ref,
        repo: data.repo || data.document?.repo,
        path: data.path || data.document?.path,
        start_line: data.start,
        end_line: data.end,
        title: data.document?.title,
      })
    );
  }

  return out.slice(0, 40);
}

function continuationSummary(c) {
  if (!c || typeof c !== "object") return null;
  const id = c.id || c.continuation_id;
  if (!id) return null;
  return {
    id,
    status: c.status || null,
    kind: c.kind || null,
    title: c.title || null,
    question: c.question || null,
    resume: c.resume || null,
    protocol: c.protocol || "cogentia.continuation.v2",
  };
}

/**
 * Surface a resumable continuation pointer when the tool result carries one.
 */
export function extractContinuation(toolName, data) {
  if (!data || typeof data !== "object") return null;

  if (toolName === "cogentia_continuation_inspect" && data.continuation) {
    return continuationSummary(data.continuation);
  }

  if (
    (toolName === "cogentia_continuation_emit" || toolName === "cogentia_continuation_resolve") &&
    data.continuation
  ) {
    return continuationSummary(data.continuation);
  }

  if (toolName === "cogentia_continuation_list" && Array.isArray(data.continuations)) {
    if (!data.continuations.length) return null;
    // Point at the first listed item; full set remains in data.
    const first = continuationSummary(data.continuations[0]);
    if (!first) return null;
    return {
      ...first,
      listed_count: data.count ?? data.continuations.length,
      list_status: data.status || null,
    };
  }

  if (toolName === "cogentia_views_snapshot") {
    const alive = data.continuations?.alive?.[0];
    if (alive) {
      return {
        id: alive.id,
        status: alive.status || "active",
        kind: alive.kind || null,
        title: alive.title || null,
        question: null,
        resume: alive.resume || null,
        protocol: "cogentia.continuation.v2",
        listed_count: data.continuations?.alive_count ?? data.continuations?.listed ?? null,
      };
    }
    const next = data.next_actions?.find((a) => a.type === "continuation" && a.id);
    if (next) {
      return {
        id: next.id,
        status: "active",
        kind: null,
        title: next.title || null,
        question: null,
        resume: null,
        protocol: "cogentia.continuation.v2",
      };
    }
  }

  if (toolName === "cogentia_agent_start" && data.active_continuations > 0) {
    return {
      id: null,
      status: "active",
      kind: null,
      title: null,
      question: null,
      resume: null,
      protocol: "cogentia.continuation.v2",
      listed_count: data.active_continuations,
      hint: "Use cogentia_continuation_list then inspect",
    };
  }

  // Generic: nested continuation object
  if (data.continuation && typeof data.continuation === "object") {
    return continuationSummary(data.continuation);
  }

  return null;
}

function defaultSkillHint(toolName, continuation) {
  if (continuation) return "continuation-handling";
  if (String(toolName).startsWith("cogentia_skill_")) return null;
  if (
    toolName === "cogentia_search" ||
    toolName === "cogentia_context_pack" ||
    toolName === "cogentia_context_pack_batch" ||
    toolName === "cogentia_get_lines" ||
    toolName === "cogentia_docs_inspect"
  ) {
    return "corpus-evidence-retrieval"; // declared future skill; hint only
  }
  if (
    toolName === "cogentia_docs_gaps" ||
    toolName === "cogentia_corpus_privacy" ||
    toolName === "cogentia_consolidate"
  ) {
    return "agentic-change"; // declared future skill; hint only
  }
  return null;
}

function defaultMandateHint(toolName, allowMutate) {
  if (
    toolName === "cogentia_continuation_resolve" ||
    toolName === "cogentia_continuation_emit" ||
    toolName === "cogentia_issues_sync"
  ) {
    return allowMutate ? "resolve_under_mandate" : "prepare";
  }
  if (toolName === "cogentia_skill_get" || toolName === "cogentia_skill_list") {
    return "read_public";
  }
  return "read_public";
}

export function classifyToolError(error, toolName = "") {
  const msg = String(error?.message || error || "");
  const name = String(error?.name || "");
  if (error?.error_class) return String(error.error_class);
  if (/tier_forbidden/i.test(msg)) return "tier_forbidden";
  // Timeouts mean the daemon (or event loop) did not answer in time — often
  // a blocked inventory walk, not a dead process. Connection refused is down.
  if (
    name === "TimeoutError"
    || /aborted due to timeout|TimeoutError/i.test(msg)
  ) {
    return "daemon_timeout";
  }
  if (/ECONNREFUSED|ECONNRESET|fetch failed|unavailable/i.test(msg)) return "daemon_unavailable";
  if (/aborted|timeout/i.test(msg)) return "daemon_timeout";
  if (/HTTP 401|unauthorized|admin token/i.test(msg)) return "unauthorized";
  if (/HTTP 403|forbidden/i.test(msg)) return "forbidden";
  if (/HTTP 404|not_found|skill_not_found|continuation_not_found/i.test(msg)) return "not_found";
  if (/HTTP 400|must be|missing_|invalid_/i.test(msg)) return "validation";
  if (/Unknown tool/i.test(msg)) return "unknown_tool";
  if (toolName && /HTTP 409/i.test(msg)) return "conflict";
  return "tool_failed";
}

/**
 * Success path: wrap raw daemon/skill payload.
 */
export function wrapToolResult(toolName, data, options = {}) {
  const protocolEra = options.protocolEra || "legacy";
  const view = options.view || "public";
  const allowMutate = options.allowMutate === true;
  const correlation = options.correlation && typeof options.correlation === "object"
    ? options.correlation
    : {};

  const citations = extractCitations(data);
  const continuation = extractContinuation(toolName, data);
  let skill_hint = data?.skill_hint ?? null;
  if (skill_hint === undefined || skill_hint === null) {
    skill_hint = defaultSkillHint(toolName, continuation);
  }
  const mandate_hint = data?.mandate_hint || defaultMandateHint(toolName, allowMutate);
  const ok = data == null ? true : data.ok !== false;

  const packet_id = options.packet_id || options.packet?.packet_id || data?.packet_id || null;
  const provisional_cost = options.provisional_cost || data?.provisional_cost || null;

  return {
    ok,
    tool: toolName,
    protocol_era: protocolEra,
    view,
    data: data ?? null,
    citations,
    continuation,
    skill_hint,
    mandate_hint,
    packet_id,
    provisional_cost,
    error_class: ok ? null : (data?.error_class || data?.error || "tool_failed"),
    correlation: Object.keys(correlation).length ? correlation : {},
    envelope: {
      kind: ENVELOPE_KIND,
      packet_id,
      provisional_cost,
      packet_mapping: {
        note: "MCP tool result projects Cognitive Packet envelope fields without replacing packet schema",
        identity: "tool + optional continuation.id + correlation.traceparent",
        payload: "data",
        traces: "citations + correlation",
        transmission: "by copy in this JSON body (no MCP session affinity required)",
      },
    },
  };
}

/**
 * Error path: stable error_class for agents.
 */
export function wrapToolError(toolName, error, options = {}) {
  const error_class = classifyToolError(error, toolName);
  const message = String(error?.message || error || "tool failed");
  return {
    ok: false,
    tool: toolName || null,
    protocol_era: options.protocolEra || "legacy",
    view: options.view || "public",
    data: null,
    citations: [],
    continuation: null,
    skill_hint: error_class === "tier_forbidden" ? "continuation-handling" : null,
    mandate_hint: error_class === "tier_forbidden" ? "prepare" : "read_public",
    error_class,
    error: { message, class: error_class },
    correlation: options.correlation && typeof options.correlation === "object"
      ? options.correlation
      : {},
    envelope: {
      kind: ENVELOPE_KIND,
      packet_mapping: {
        note: "Failure is a first-class envelope, not a silent empty success",
        transmission: "by copy",
      },
    },
  };
}
