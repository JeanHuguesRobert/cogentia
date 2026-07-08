import { randomBytes } from "node:crypto";
import path from "node:path";

export function readJsonBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = "";
    let bytes = 0;
    req.setEncoding("utf8");
    req.on("data", chunk => {
      bytes += Buffer.byteLength(chunk, "utf8");
      if (bytes > maxBytes) {
        reject(new Error("request_body_too_large"));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on("end", () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("invalid_json"));
      }
    });
    req.on("error", reject);
  });
}

export function lastUserMessage(messages) {
  if (!Array.isArray(messages)) return "";
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg?.role === "user" && String(msg.content || "").trim()) {
      return String(msg.content).trim();
    }
  }
  return "";
}

export function formatMessagesAsPrompt(messages) {
  const system = messages.filter(m => m.role === "system").map(m => m.content).join("\n");
  const user = lastUserMessage(messages);
  if (system && user) return `${system}\n\n${user}`;
  return user || system || "";
}

export function stripAnsi(text) {
  return String(text)
    .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "")
    .replace(/\x1b\][^\x07]*\x07/g, "");
}

/** Strip ANSI escapes and normalize PTY CRLF for regex matching. */
export function normalizePtyText(text) {
  return stripAnsi(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function newCompletionId() {
  return `agw-${randomBytes(8).toString("hex")}`;
}

export function sseWrite(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function sseDone(res) {
  res.write("data: [DONE]\n\n");
}

export function openAiError(type, message, code, status = 400) {
  return {
    status,
    body: { error: { type, message, code: code || type } },
  };
}

export function checkBearerAuth(req, token) {
  if (!token) return null;
  const header = String(req.headers.authorization || "");
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match || match[1].trim() !== token) {
    return openAiError("authentication_error", "Invalid or missing bearer token", "invalid_api_key", 401);
  }
  return null;
}

export function resolveCwd(requested, ctx) {
  const path = awaitableResolve(requested || ctx.defaultCwd);
  if (ctx.allowAnyCwd) return path;
  const ok = ctx.repoRoots.some(root => path === root || path.startsWith(`${root}/`) || path.startsWith(`${root}\\`));
  if (!ok) {
    throw new Error(`cwd not allowed: ${path}`);
  }
  return path;
}

function awaitableResolve(p) {
  return path.resolve(p);
}