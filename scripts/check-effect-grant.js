import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  resetAuthorizationStore,
  mintSideEffectGrantFromPrepared,
  canonicalPayloadHash,
} from "./lib/side-effect-authorization.js";
import { prepareCommunicationSend } from "./lib/communication-send.js";
import { createMcpCore } from "./lib/cogentia-mcp-core.js";
import { cmdEffectGrant } from "./lib/cogentia-effect-cli.js";

resetAuthorizationStore();
const prepared = prepareCommunicationSend({
  to: ["ext@example.com"],
  subject: "Mint UI",
  body: "exact body",
});
const hash = canonicalPayloadHash(prepared.payload);

assert.throws(
  () => mintSideEffectGrantFromPrepared(prepared, { principal: "principal:test" }),
  (e) => e.error_class === "confirm_required"
);
assert.throws(
  () => mintSideEffectGrantFromPrepared(prepared, { principal: "principal:test", confirm: "nope" }),
  (e) => e.error_class === "confirm_mismatch"
);
assert.throws(
  () => mintSideEffectGrantFromPrepared({ text: "Envoie-le." }, { principal: "principal:test", confirm: hash }),
  (e) => e.error_class === "invalid_prepare"
);

const grant = mintSideEffectGrantFromPrepared(prepared, {
  principal: "principal:test",
  confirm: hash,
});
assert.equal(grant.status, "granted");
assert.equal(grant.payload_hash, hash);
assert.equal(grant.packet.envelope.packet_kind, "decision");

resetAuthorizationStore();
const core = createMcpCore({
  COGENTIA_MCP_VIEW: "full",
  COGENTIA_ADMIN_TOKEN: "admin-test",
  COGENTIA_MCP_ALLOW_MUTATE: "1",
});
await assert.rejects(
  () => core.callTool("cogentia_side_effect_grant", { prepared, confirm: "wrong" }),
  (e) => e.error_class === "confirm_mismatch"
);
const viaMcp = await core.callTool("cogentia_side_effect_grant", {
  prepared,
  confirm: hash,
  principal: "principal:mcp",
});
assert.equal(viaMcp.authorization_id, viaMcp.packet.payload ? viaMcp.authorization_id : viaMcp.authorization_id);
assert.ok(viaMcp.authorization_id.startsWith("sea_"));

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-mint-"));
const exposePath = path.join(dir, "expose.json");
fs.writeFileSync(exposePath, JSON.stringify(prepared), "utf8");
try {
  assert.throws(
    () => cmdEffectGrant(["--from", exposePath, "--json"], process.env),
    (e) => e.error_class === "confirm_required"
  );
  const minted = cmdEffectGrant(
    ["--from", exposePath, "--confirm", hash, "--json", "--principal", "principal:cli"],
    process.env
  );
  assert.equal(minted.ok, true);
  assert.ok(minted.grant.authorization_id);
} finally {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
}

const cogentiaJs = fileURLToPath(new URL("./cogentia.js", import.meta.url));
const help = spawnSync(process.execPath, [cogentiaJs, "effect", "grant", "--help"], { encoding: "utf8" });
assert.equal(help.status, 0);
assert.match(help.stdout + help.stderr, /confirm/);

console.log(JSON.stringify({ ok: true, test: "effect_grant" }));
