import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { verifyMcpOAuthToken } from "../lib/mcp-oauth-token.js";

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "test-key", alg: "RS256", use: "sig" };
const issuer = "https://issuer.example.org";
const audience = "https://cogentia.fractavolta.com/mcp";
const jwksUrl = issuer + "/jwks";
const nowMs = 1793220000000;
function token(overrides = {}) {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: "test-key" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: issuer, aud: audience, sub: "principal:jhn",
    exp: Math.floor(nowMs / 1000) + 600,
    scope: "cogentia.private.read",
    ...overrides,
  })).toString("base64url");
  const raw = header + "." + payload;
  return raw + "." + sign("RSA-SHA256", Buffer.from(raw), privateKey).toString("base64url");
}
const opts = {
  issuer, audience, jwksUrl, nowMs, requiredScopes: ["cogentia.private.read"],
  fetch: async () => ({ ok: true, json: async () => ({ keys: [jwk] }) }),
};
test("accepts valid signed scoped token", async () => {
  const verified = await verifyMcpOAuthToken(token(), opts);
  assert.equal(verified.subject, "principal:jhn");
});
test("rejects missing required configuration", async () => {
  await assert.rejects(verifyMcpOAuthToken(token(), {}), /oauth_not_configured/);
});
test("rejects incorrect audience", async () => {
  await assert.rejects(verifyMcpOAuthToken(token({aud:"https://elsewhere.example"}), opts), /invalid_token_issuer_or_audience/);
});
test("rejects expired token", async () => {
  await assert.rejects(verifyMcpOAuthToken(token({exp:Math.floor(nowMs/1000)-1}), opts), /token_expired/);
});
test("rejects missing scopes", async () => {
  await assert.rejects(verifyMcpOAuthToken(token({scope:"other"}), opts), /insufficient_scope/);
});
test("rejects tampered signature", async () => {
  const t = token();
  const parts = t.split(".");
  const signature = Buffer.from(parts[2], "base64url");
  signature[0] ^= 1;
  parts[2] = signature.toString("base64url");
  const altered = parts.join(".");
  await assert.rejects(verifyMcpOAuthToken(altered, opts), /invalid_token_signature/);
});
