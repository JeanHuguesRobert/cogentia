/**
 * OpenAI Chat Completions (+ SSE) surface for Agent JHN / public twin face.
 *
 * Hosted on Fracta alongside Guide (cogentia-mcp-http :8791), under paths that
 * Caddy already proxies: /guide/v1/* (and /twin/jhn/v1/* when Caddy allows).
 *
 * Access tiers (v1):
 *   - public  — no key, or Bearer matching COGENTIA_JHN_PUBLIC_API_KEY if set
 *   - owner   — Bearer matching COGENTIA_JHN_OWNER_API_KEY (Jean Hugues master)
 *
 * Local model hosting is orthogonal; this is the *server* UX tools talk to.
 */

import crypto from "node:crypto";

function timingSafeStringEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

/**
 * @param {object} opts
 * @param {() => string} opts.ownerKey
 * @param {() => string} opts.publicKey  empty ⇒ anonymous allowed as public
 * @param {(input: {question:string,locale:string,history:object[],access:object,model:string}) => Promise<object>} opts.produceAnswer
 *   returns { ok, answer, sources?, warnings?, error?, status? }
 */
export function createJhnOpenAiSurface(opts) {
  const ownerKey = () => String(opts.ownerKey?.() || process.env.COGENTIA_JHN_OWNER_API_KEY || "").trim();
  const publicKey = () => String(opts.publicKey?.() || process.env.COGENTIA_JHN_PUBLIC_API_KEY || "").trim();
  const produceAnswer = opts.produceAnswer;

  function resolveAccess(req) {
    const raw = String(req.headers?.authorization || req.headers?.Authorization || "").trim();
    let token = "";
    if (/^bearer\s+/i.test(raw)) token = raw.replace(/^bearer\s+/i, "").trim();
    else if (raw) token = raw;

    const oKey = ownerKey();
    const pKey = publicKey();

    if (oKey && token && timingSafeStringEqual(token, oKey)) {
      return {
        ok: true,
        access_class: "owner",
        label: "jean_hugues",
        models: ["jhn-public", "jhn-owner", "fractavolta-guide"],
      };
    }
    if (pKey) {
      if (token && timingSafeStringEqual(token, pKey)) {
        return {
          ok: true,
          access_class: "public",
          label: "public_key",
          models: ["jhn-public", "fractavolta-guide"],
        };
      }
      if (!token) {
        return { ok: false, status: 401, error: "missing_api_key", message: "Bearer token required for this surface." };
      }
      return { ok: false, status: 401, error: "invalid_api_key", message: "Unknown API key." };
    }
    // No public key configured → anonymous is public readonly
    if (!token || token === "public" || token === "anonymous") {
      return {
        ok: true,
        access_class: "public",
        label: "anonymous",
        models: ["jhn-public", "fractavolta-guide"],
      };
    }
    // Unknown token when no public key: reject (do not treat random strings as owner)
    if (oKey) {
      return { ok: false, status: 401, error: "invalid_api_key", message: "Unknown API key." };
    }
    return {
      ok: true,
      access_class: "public",
      label: "anonymous",
      models: ["jhn-public", "fractavolta-guide"],
    };
  }

  function modelsPayload(access) {
    const all = [
      {
        id: "jhn-public",
        object: "model",
        created: 1723000000,
        owned_by: "twin:jhn",
        permission: [],
        root: "jhn-public",
        description: "Agent JHN public face — readonly public corpus (superset of FractaVolta Guide).",
      },
      {
        id: "fractavolta-guide",
        object: "model",
        created: 1723000000,
        owned_by: "fractavolta-public-guide",
        permission: [],
        root: "fractavolta-guide",
        description: "FractaVolta public Guide persona (public corpus).",
      },
      {
        id: "jhn-owner",
        object: "model",
        created: 1723000000,
        owned_by: "twin:jhn",
        permission: [],
        root: "jhn-owner",
        description: "Jean Hugues / owner tier (v1 still public corpus; private tools later under mandate).",
      },
    ];
    const allowed = new Set(access.models || ["jhn-public"]);
    return {
      object: "list",
      data: all.filter((m) => allowed.has(m.id)),
      access_class: access.access_class,
    };
  }

  function extractQuestionAndHistory(body) {
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    let question = "";
    const history = [];
    for (const msg of messages) {
      const role = String(msg?.role || "").toLowerCase();
      const content = flattenContent(msg?.content);
      if (!content) continue;
      if (role === "user") {
        if (question) history.push({ role: "user", content: question });
        question = content;
      } else if (role === "assistant" && question) {
        history.push({ role: "user", content: question });
        history.push({ role: "assistant", content });
        question = "";
      }
    }
    if (!question && messages.length) {
      const last = messages[messages.length - 1];
      question = flattenContent(last?.content);
    }
    return { question: String(question || "").trim(), history };
  }

  async function handleModels(req, res, sendJson) {
    const access = resolveAccess(req);
    if (!access.ok) return sendJson(res, access.status || 401, { error: { message: access.message, type: access.error } });
    return sendJson(res, 200, modelsPayload(access));
  }

  async function handleChatCompletions(req, res, helpers) {
    const { sendJson, readBody, sendOpenAiSse } = helpers;
    const access = resolveAccess(req);
    if (!access.ok) {
      return sendJson(res, access.status || 401, {
        error: { message: access.message, type: access.error, code: access.error },
      });
    }

    let body;
    try {
      body = JSON.parse((await readBody(req, 262144)) || "{}");
    } catch {
      return sendJson(res, 400, { error: { message: "invalid_json", type: "invalid_request_error" } });
    }

    const model = String(body.model || "jhn-public").trim() || "jhn-public";
    if (!access.models.includes(model)) {
      return sendJson(res, 403, {
        error: {
          message: `Model "${model}" not allowed for access_class=${access.access_class}`,
          type: "permission_error",
          code: "model_not_allowed",
        },
      });
    }

    const { question, history } = extractQuestionAndHistory(body);
    if (!question) {
      return sendJson(res, 400, {
        error: { message: "messages must include a user content", type: "invalid_request_error" },
      });
    }
    if (question.length > 1200) {
      return sendJson(res, 413, {
        error: { message: "question_too_large", type: "invalid_request_error" },
      });
    }

    const locale = String(body.locale || body.metadata?.locale || "en").toLowerCase().startsWith("fr")
      ? "fr"
      : "en";
    const stream = body.stream === true;

    const result = await produceAnswer({
      question,
      locale,
      history,
      access,
      model,
    });

    if (!result?.ok) {
      return sendJson(res, result?.status || 502, {
        error: {
          message: result?.error || "twin_turn_failed",
          type: "server_error",
          access_class: access.access_class,
        },
      });
    }

    let content = String(result.answer || "").trim();
    if (result.sources?.length) {
      const cites = result.sources
        .slice(0, 5)
        .map((s) => s.source_id || s.id || s.title)
        .filter(Boolean);
      if (cites.length && !cites.some((c) => content.includes(`[${c}]`))) {
        content = `${content}\n\nSources: ${cites.map((c) => `[${c}]`).join(" ")}`;
      }
    }

    const id = `chatcmpl-jhn-${crypto.randomBytes(8).toString("hex")}`;
    const created = Math.floor(Date.now() / 1000);

    if (stream) {
      return sendOpenAiSse(res, {
        id,
        created,
        model,
        content,
        access_class: access.access_class,
        warnings: result.warnings || [],
      });
    }

    return sendJson(res, 200, {
      id,
      object: "chat.completion",
      created,
      model,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content },
          finish_reason: "stop",
          logprobs: null,
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
      twin: {
        access_class: access.access_class,
        access_label: access.label,
        surface: "jhn-openai-v1",
        warnings: result.warnings || [],
        sources: (result.sources || []).slice(0, 8),
      },
    });
  }

  return {
    resolveAccess,
    modelsPayload,
    extractQuestionAndHistory,
    handleModels,
    handleChatCompletions,
  };
}

export function isTwinOpenAiPath(urlPath) {
  const p = String(urlPath || "").split("?")[0];
  return (
    p === "/guide/v1/models" ||
    p === "/guide/v1/chat/completions" ||
    p === "/twin/jhn/v1/models" ||
    p === "/twin/jhn/v1/chat/completions" ||
    p === "/v1/models" ||
    p === "/v1/chat/completions"
  );
}

function flattenContent(content) {
  if (content == null) return "";
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part?.type === "text") return String(part.text || "");
        return "";
      })
      .join("")
      .trim();
  }
  return String(content).trim();
}

