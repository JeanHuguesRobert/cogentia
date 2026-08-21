import { runHandoffPacket } from "./john-handoff.js";

/**
 * Direct HTTP/REST Transport Driver.
 */
export async function sendHttpTransport(packet, targetUrl, options = {}) {
  const url = targetUrl.replace(/\/$/, "");
  const endpoint = url.endsWith("/packet") || url.endsWith("/cop") ? url : `${url}/api/cop/packet`;
  const timeoutMs = options.timeoutMs || 10000;
  const token = options.bearerToken || process.env.COGENTIA_HANDOFF_TOKEN;

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(packet),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`HTTP transport error ${res.status}: ${errText || res.statusText}`);
    }

    const data = await res.json().catch(() => ({ status: "accepted" }));
    return {
      ok: true,
      transport: "http_direct",
      target: targetUrl,
      status: res.status === 200 ? "completed" : "accepted",
      returnPacket: data.return_packet || data.returnPacket || null,
      events: data.events || [],
      data,
    };
  } catch (err) {
    clearTimeout(timer);
    throw new Error(`sendHttpTransport to ${targetUrl} failed: ${err.message}`);
  }
}

/**
 * Supabase Asynchronous Transit Queue Transport Driver.
 */
export async function sendSupabaseTransport(packet, options = {}) {
  const env = options.env || process.env;
  const supabaseUrl = String(options.supabaseUrl || env.SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = String(options.serviceKey || env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || "");
  const table = options.tableName || "cop_packet_transit";

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase transport requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }

  const endpoint = `${supabaseUrl}/rest/v1/${table}`;
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  const row = {
    packet_id: packet.envelope.id,
    packet_kind: packet.envelope.kind || packet.envelope.packetKind,
    intent: packet.envelope.intent,
    required_capability: packet.envelope.requiredCapability || null,
    risk_level: packet.envelope.riskLevel || "read_only",
    status: "pending",
    packet_body: packet,
    ithaca_target: packet.envelope.ithaca?.return_target || null,
    created_at: new Date().toISOString(),
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(row),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Supabase transit error ${res.status}: ${errText || res.statusText}`);
  }

  const inserted = await res.json();
  return {
    ok: true,
    transport: "supabase_transit",
    target: `supabase://${table}`,
    status: "queued",
    rowId: inserted[0]?.id || null,
    packetId: packet.envelope.id,
  };
}

/**
 * Mock / In-Memory Loopback Transport for testing and deterministic verification.
 */
export async function sendMockTransport(packet, options = {}) {
  const runResult = await runHandoffPacket(packet, options);
  return {
    ok: true,
    transport: "mock_loopback",
    target: "mock://in-process",
    status: runResult.success ? "completed" : "failed",
    returnPacket: runResult.returnPacket,
    events: runResult.events,
  };
}

/**
 * Resilient multi-tier Handoff Sender with automatic protocol detection and fallbacks.
 */
export async function sendHandoffPacket(packet, { target = "mock://", fallbacks = [], options = {} } = {}) {
  const targets = [target, ...fallbacks].filter(Boolean);
  const errors = [];

  for (const currentTarget of targets) {
    try {
      if (currentTarget.startsWith("mock://") || currentTarget === "mock") {
        return await sendMockTransport(packet, options);
      }
      if (currentTarget.startsWith("http://") || currentTarget.startsWith("https://")) {
        return await sendHttpTransport(packet, currentTarget, options);
      }
      if (currentTarget.startsWith("supabase://") || currentTarget === "supabase") {
        return await sendSupabaseTransport(packet, options);
      }
      throw new Error(`Unsupported target protocol: ${currentTarget}`);
    } catch (err) {
      errors.push({ target: currentTarget, error: err.message });
    }
  }

  return {
    ok: false,
    status: "delivery_failed",
    errors,
    message: `All ${targets.length} transport targets failed to deliver packet.`,
  };
}
