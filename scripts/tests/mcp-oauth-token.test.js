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
const challenge={challenge_id:'5d7344a1-5b50-4fa0-b76e-8f27093d900b',payload_hash:'sha256:'+'a'.repeat(64),action_class:'host.process.run',issued_at:new Date(nowMs-10000).toISOString()};
const approved={scope:'cogentia.principal.approve',auth_time:Math.floor(nowMs/1000)-5,amr:['user_presence'],cogentia_approval:{challenge_id:challenge.challenge_id,payload_hash:challenge.payload_hash,action_class:challenge.action_class,confirmed:true}};
test('signed fresh human presence bound to exact challenge passes',async()=>{
 const r=await verifyMcpOAuthToken(token(approved),{...opts,requiredScopes:['cogentia.principal.approve'],approvalBinding:challenge});
 assert.equal(r.subject,'principal:jhn');
});
test('ordinary MCP bearer, tampered binding or stale human presence cannot approve',async()=>{
 const options={...opts,requiredScopes:['cogentia.principal.approve'],approvalBinding:challenge};
 await assert.rejects(verifyMcpOAuthToken(token({scope:'cogentia.principal.approve'}),options),/approval_transaction_mismatch/);
 await assert.rejects(verifyMcpOAuthToken(token(approved),{...options,approvalBinding:{...challenge,payload_hash:'sha256:'+'b'.repeat(64)}}),/approval_transaction_mismatch/);
 await assert.rejects(verifyMcpOAuthToken(token({...approved,auth_time:Math.floor(nowMs/1000)-30}),options),/approval_human_presence_unverified/);
 await assert.rejects(verifyMcpOAuthToken(token({...approved,amr:['pwd']}),options),/approval_human_presence_unverified/);
 await assert.rejects(verifyMcpOAuthToken(token({...approved,cogentia_approval:{...approved.cogentia_approval,confirmed:false}}),options),/approval_transaction_mismatch/);
});
