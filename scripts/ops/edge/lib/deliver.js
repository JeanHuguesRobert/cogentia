export async function deliverHttpPost(payload = {}, options = {}) {
  const method = String(payload.method || "POST").trim().toUpperCase();
  const url = String(payload.url || "").trim();
  if (!url) {
    return { ok: false, error: "missing_url" };
  }

  const headers = payload.headers && typeof payload.headers === "object"
    ? payload.headers
    : {};
  const body = payload.body == null ? undefined : JSON.stringify(payload.body);
  if (body != null && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }

  const fetchImpl = options.fetch || globalThis.fetch;
  const response = await fetchImpl(url, {
    method,
    headers,
    body,
    signal: AbortSignal.timeout(Number(options.timeoutMs || 25_000)),
  });

  let parsed;
  try {
    parsed = await response.json();
  } catch {
    parsed = { ok: false, error: "non_json_response", status: response.status };
  }

  if (!response.ok || parsed.ok === false) {
    return {
      ok: false,
      error: parsed.error || `http_${response.status}`,
      status: response.status,
      body: parsed,
    };
  }

  return { ok: true, status: response.status, body: parsed };
}