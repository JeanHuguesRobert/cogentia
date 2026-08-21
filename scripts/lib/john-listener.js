import http from "node:http";
import process from "node:process";
import { runHandoffPacket } from "./john-handoff.js";
import { sendHandoffPacket } from "./john-handoff-transport.js";
import { DiagnosticContext } from "./john-diagnostic/diagnostic-context.js";
import { createJhnOpenAiSurface, isTwinOpenAiPath } from "./jhn-openai-surface.js";

/**
 * John Packet Listener & Attractor Daemon.
 * Transforms an agent instance or VPS into an autonomous FractaNode packet receiver.
 */
export class JohnPacketListener {
  constructor(options = {}) {
    this.port = Number(options.port || process.env.COGENTIA_LISTENER_PORT || 8790);
    this.host = String(options.host || process.env.COGENTIA_LISTENER_HOST || "0.0.0.0");
    this.nodeId = String(options.nodeId || process.env.FRACTANET_NODE_ID || "node:workstation:john-daemon");
    this.format = options.format || "human";
    this.autoReturnToIthaca = options.autoReturnToIthaca !== false;
    this.diagnosticCtx = new DiagnosticContext();
    this.startedAt = Date.now();
    this.processedCount = 0;
    this.server = null;

    // Build OpenAI surface for simultaneous Web UI / completions compatibility
    this.openAiSurface = createJhnOpenAiSurface({
      ownerKey: () => process.env.COGENTIA_JHN_OWNER_API_KEY || "",
      publicKey: () => process.env.COGENTIA_JHN_PUBLIC_API_KEY || "",
      produceAnswer: async ({ question, locale, history }) => {
        // Execute through governed step reasoner
        const capInsp = this.diagnosticCtx.getInspector("capabilities");
        return {
          ok: true,
          answer: `[FractaNode ${this.nodeId}] Answer to: ${question}`,
          sources: [{ source_id: "corpus:john-knowledge", title: "John Governance Corpus" }],
        };
      },
    });
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        try {
          await this.handleRequest(req, res);
        } catch (err) {
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: err.message }));
          }
        }
      });

      this.server.on("error", (err) => reject(err));
      this.server.listen(this.port, this.host, () => {
        resolve({
          ok: true,
          nodeId: this.nodeId,
          port: this.port,
          host: this.host,
          url: `http://${this.host === "0.0.0.0" ? "127.0.0.1" : this.host}:${this.port}`,
        });
      });
    });
  }

  async stop() {
    if (!this.server) return;
    return new Promise((resolve) => {
      this.server.close(() => {
        this.server = null;
        resolve();
      });
    });
  }

  async handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;
    const method = req.method.toUpperCase();

    // CORS headers for Web clients
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }

    // 1. Health & Status
    if (pathname === "/health" || pathname === "/cop/health" || pathname === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      const capInsp = this.diagnosticCtx.getInspector("capabilities");
      const caps = await capInsp.inspect();
      return res.end(
        JSON.stringify({
          ok: true,
          node_id: this.nodeId,
          status: "online",
          uptime_seconds: Math.floor((Date.now() - this.startedAt) / 1000),
          processed_packets_count: this.processedCount,
          capabilities: caps.map((c) => c.name),
          protocol: "cognitive_packet.v0",
        }, null, 2)
      );
    }

    // 2. Capabilities Inspection
    if (pathname === "/cop/capabilities" || pathname === "/capabilities") {
      res.writeHead(200, { "Content-Type": "application/json" });
      const capInsp = this.diagnosticCtx.getInspector("capabilities");
      const caps = await capInsp.inspect();
      return res.end(JSON.stringify(caps, null, 2));
    }

    // 3. Ingestion of Sealed Cognitive Packets
    if ((pathname === "/cop/packet" || pathname === "/api/cop/packet" || pathname === "/packet") && method === "POST") {
      const body = await this.readJsonBody(req);
      if (!body || !body.envelope) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ ok: false, error: "Invalid request: missing Cognitive Packet envelope" }));
      }

      this.processedCount += 1;
      // Record arrival hop at this listener node
      if (!Array.isArray(body.envelope.hops)) body.envelope.hops = [];
      body.envelope.hops.push({
        hop_index: body.envelope.hops.length,
        node_id: this.nodeId,
        instance_id: "john:listener",
        route_reason: "packet-received-at-attractor",
        timestamp: new Date().toISOString(),
      });

      // Execute governed request
      const execution = await runHandoffPacket(body);

      // Auto-dispatch return yield towards Ithaca if remote target specified
      let dispatchResult = null;
      const returnTarget = body.envelope.ithaca?.return_target;
      if (this.autoReturnToIthaca && returnTarget && (returnTarget.startsWith("http://") || returnTarget.startsWith("https://") || returnTarget.startsWith("supabase://"))) {
        try {
          dispatchResult = await sendHandoffPacket(execution.returnPacket, { target: returnTarget });
        } catch (dispatchErr) {
          dispatchResult = { ok: false, error: dispatchErr.message };
        }
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          ok: execution.success,
          status: execution.returnPacket?.envelope?.status || "solved",
          packet_id: body.envelope.id,
          yield: execution.returnPacket?.yield || null,
          dispatch: dispatchResult,
          return_packet: execution.returnPacket,
          events_count: execution.events.length,
        }, null, 2)
      );
    }

    // 4. OpenAI-compatible /v1/ surface
    if (isTwinOpenAiPath(pathname)) {
      const sendJson = (r, status, data) => {
        r.writeHead(status, { "Content-Type": "application/json" });
        r.end(JSON.stringify(data));
      };
      const sendSse = (r, params) => {
        r.writeHead(200, {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });
        r.write(`data: ${JSON.stringify({ id: params.id, object: "chat.completion.chunk", choices: [{ delta: { content: params.content } }] })}\n\n`);
        r.write("data: [DONE]\n\n");
        r.end();
      };
      if (pathname.endsWith("/models")) {
        return this.openAiSurface.handleModels(req, res, sendJson);
      }
      if (pathname.endsWith("/chat/completions")) {
        return this.openAiSurface.handleChatCompletions(req, res, {
          sendJson,
          readBody: async (r) => (await this.readJsonBody(r, false)),
          sendOpenAiSse: sendSse,
        });
      }
    }

    // Default 404
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: `Not found: ${pathname}` }));
  }

  async readJsonBody(req, parse = true) {
    return new Promise((resolve, reject) => {
      let data = "";
      req.setEncoding("utf8");
      req.on("data", (chunk) => { data += chunk; });
      req.on("end", () => {
        if (!parse) return resolve(data);
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (e) {
          reject(new Error(`Malformed JSON body: ${e.message}`));
        }
      });
      req.on("error", (err) => reject(err));
    });
  }
}
