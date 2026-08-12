/**
 * Thin corpus tools over the Cogentia Context Gateway.
 * Indexes are built offline (FTS / embeddings); these calls only query them.
 */

export function createCorpusLibrarianTools(options = {}) {
  const baseUrl = String(options.baseUrl || "http://127.0.0.1:8790").replace(/\/$/, "");
  const request = typeof options.fetch === "function" ? options.fetch : globalThis.fetch;
  const timeoutMs = boundedInteger(options.timeoutMs, 8000, 200, 60000);

  return {
    name: "corpus-librarian-tools/v1",
    baseUrl,

    async search(input = {}) {
      const query = String(input.query || input.q || "").trim();
      if (!query) return { ok: false, tool: "corpus.search", error: "empty_query", hits: [] };
      const limit = boundedInteger(input.limit, 8, 1, 50);
      const mode = ["keyword", "hybrid", "semantic"].includes(input.mode) ? input.mode : "hybrid";
      const params = new URLSearchParams({ q: query, limit: String(limit), mode });
      if (input.repo) params.set("repo", String(input.repo));
      if (input.include_text) params.set("include_text", "1");
      const body = await gatewayGet(request, baseUrl, `/api/context/search?${params}`, timeoutMs);
      if (!body?.ok) return { ok: false, tool: "corpus.search", error: "search_failed", hits: [], raw: safeRaw(body) };
      const hits = (Array.isArray(body.results) ? body.results : []).map(normalizeHit).filter(Boolean);
      return {
        ok: true,
        tool: "corpus.search",
        query,
        mode: body.mode || mode,
        index_hash: body.index_hash || null,
        hits,
      };
    },

    async open(input = {}) {
      const ref = String(input.ref || "").trim();
      const start = Number(input.start);
      const end = Number(input.end);
      if (!ref || !Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
        return { ok: false, tool: "corpus.open", error: "invalid_range", excerpt: null };
      }
      const maxSpan = boundedInteger(input.maxSpan, 80, 1, 400);
      const boundedEnd = Math.min(end, start + maxSpan - 1);
      const params = new URLSearchParams({
        ref,
        start: String(start),
        end: String(boundedEnd),
      });
      const body = await gatewayGet(request, baseUrl, `/api/context/lines?${params}`, timeoutMs);
      if (!body?.ok) return { ok: false, tool: "corpus.open", error: "open_failed", excerpt: null, raw: safeRaw(body) };
      const excerpt = normalizeExcerpt(body, ref, start, boundedEnd);
      return { ok: Boolean(excerpt?.text), tool: "corpus.open", excerpt };
    },

    /**
     * Widen context around a hit or source_id. Occam: re-open with a larger line window.
     */
    async expand(input = {}) {
      const hit = input.hit && typeof input.hit === "object" ? input.hit : null;
      const radius = boundedInteger(input.radius, 15, 1, 120);
      let ref = String(input.ref || hit?.ref || "").trim();
      let start = Number(input.start ?? hit?.start_line);
      let end = Number(input.end ?? hit?.end_line);
      if ((!ref || !Number.isInteger(start)) && input.source_id) {
        const parsed = parseSourceId(input.source_id);
        if (parsed) {
          ref = parsed.ref;
          start = parsed.start;
          end = parsed.end;
        }
      }
      if (!ref || !Number.isInteger(start)) {
        return { ok: false, tool: "corpus.expand", error: "invalid_target", excerpt: null };
      }
      if (!Number.isInteger(end) || end < start) end = start;
      const opened = await this.open({
        ref,
        start: Math.max(1, start - radius),
        end: end + radius,
        maxSpan: input.maxSpan || 160,
      });
      return {
        ok: opened.ok,
        tool: "corpus.expand",
        error: opened.error,
        excerpt: opened.excerpt,
        radius,
      };
    },
  };
}

export function parseSourceId(sourceId) {
  const value = String(sourceId || "").trim();
  const match = value.match(/^([^#]+)#L(\d+)(?:-L(\d+))?$/);
  if (!match) return null;
  const start = Number(match[2]);
  const end = match[3] ? Number(match[3]) : start;
  return { ref: match[1], start, end, source_id: value };
}

function normalizeHit(item = {}) {
  const sourceId = String(item.id || item.source_id || "").trim();
  const parsed = parseSourceId(sourceId);
  const repo = String(item.repo || "").trim();
  const pathName = String(item.path || "").trim();
  const ref = parsed?.ref || (repo && pathName ? `${repo}:${pathName}` : "");
  const start = Number.isInteger(item.start_line) ? item.start_line : parsed?.start;
  const end = Number.isInteger(item.end_line) ? item.end_line : parsed?.end;
  if (!ref || !Number.isInteger(start)) return null;
  return {
    source_id: sourceId || `${ref}#L${start}-L${Number.isInteger(end) ? end : start}`,
    ref,
    repo: repo || ref.split(":")[0] || "",
    path: pathName || ref.split(":").slice(1).join(":") || "",
    start_line: start,
    end_line: Number.isInteger(end) ? end : start,
    title: String(item.title || item.heading || "").slice(0, 300),
    score: Number.isFinite(item.score) ? item.score : null,
    text: item.text != null ? String(item.text).replace(/\s+/g, " ").trim().slice(0, 1800) : "",
  };
}

function normalizeExcerpt(body, ref, start, end) {
  const text = extractText(body);
  if (!text) return null;
  const sourceId = String(body.source_id || `${ref}#L${start}-L${end}`);
  return {
    source_id: sourceId,
    ref,
    start_line: start,
    end_line: end,
    text: text.replace(/\s+/g, " ").trim().slice(0, 4000),
  };
}

function extractText(body = {}) {
  if (typeof body.text === "string") return body.text;
  if (typeof body.content === "string") return body.content;
  if (Array.isArray(body.lines)) {
    return body.lines.map(line => (typeof line === "string" ? line : line?.text || "")).join("\n");
  }
  if (body.document?.text) return String(body.document.text);
  return "";
}

async function gatewayGet(request, baseUrl, pathAndQuery, timeoutMs) {
  const response = await request(`${baseUrl}${pathAndQuery}`, {
    method: "GET",
    headers: { Accept: "application/json", "X-Cogentia-Entry": "public" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    return { ok: false, http_status: response.status, error: body?.error || "http_error" };
  }
  return body;
}

function safeRaw(body) {
  if (!body || typeof body !== "object") return null;
  return { ok: body.ok, error: body.error || null, http_status: body.http_status || null };
}

function boundedInteger(value, fallback, minimum, maximum) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.max(minimum, Math.min(number, maximum)) : fallback;
}
