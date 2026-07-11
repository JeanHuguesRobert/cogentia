const DEFAULT_PROBES = [
  "https://cogentia.fractavolta.com/guide/health",
  "http://100.91.12.74:8791/health",
];

export async function probeFractanet(options = {}) {
  const env = options.env || process.env;
  const timeoutMs = Number(options.timeoutMs || 5000);
  const candidates = [
    String(options.probeUrl || "").trim(),
    String(env.EDGE_UPSTREAM_PROBE_URL || "").trim(),
    env.COGENTIA_BLACKBOARD_URL
      ? `${String(env.COGENTIA_BLACKBOARD_URL).replace(/\/$/, "")}/guide/health`
      : "",
    ...DEFAULT_PROBES,
  ].filter(Boolean);

  const seen = new Set();
  const probes = [];
  for (const url of candidates) {
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    probes.push(url);
  }

  for (const url of probes) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.ok) {
        return { ok: true, url, status: response.status };
      }
    } catch (error) {
      if (options.verbose) {
        console.error(JSON.stringify({ probe: url, error: error.message }));
      }
    }
  }

  return { ok: false, error: "fractanet_unreachable", probes };
}