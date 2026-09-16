#!/usr/bin/env node
/**
 * #171 Phase C Reality Test — WhatsApp send enqueue without Baileys.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfig, ensureStateDirs } from "../lib/agent-jhn-whatsapp/config.js";
import { normalizeInboundEvent } from "../lib/agent-jhn-whatsapp/inbound-normalizer.js";
import { buildDeterministicDraft } from "../lib/agent-jhn-whatsapp/draft.js";
import { DEFAULT_NOTICE_URL } from "../lib/agent-jhn-whatsapp/constants.js";
import {
  prepareWhatsappSend,
  requestOutboundSend,
  mintWhatsappSendAuthorization,
  buildActionRequestId,
} from "../lib/agent-jhn-whatsapp/outbound-gate.js";
import { listPendingOutbox } from "../ops/edge/lib/outbox.js";
import {
  resetAuthorizationStore,
  authorizationFromUtterance,
} from "../lib/side-effect-authorization.js";

resetAuthorizationStore();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-wa-171-"));
const report = { ok: false };

try {
  assert.equal(authorizationFromUtterance("On va lui envoyer ce document.").granted, false);
  const SELF_JID = "33612345678@s.whatsapp.net";
  const config = loadConfig({
    AGENT_JHN_WHATSAPP_STATE_DIR: dir,
    AGENT_JHN_WHATSAPP_ALLOWED_SELF_JID: SELF_JID,
    AGENT_JHN_WHATSAPP_MODE: "self_chat_only",
    AGENT_JHN_WHATSAPP_SEND_ENABLED: "true",
    AGENT_JHN_WHATSAPP_NOTICE_URL: DEFAULT_NOTICE_URL,
  });
  ensureStateDirs(config);
  const normalized = normalizeInboundEvent({
    key: { id: "msg-rt", remoteJid: SELF_JID, fromMe: false },
    message: { conversation: "ping non engageant" },
    messageTimestamp: 1_700_000_000,
  });
  const draft = buildDeterministicDraft(normalized, config);
  const prepared = prepareWhatsappSend({
    config,
    normalized,
    draftText: draft.text,
    actionRequestId: buildActionRequestId("msg-rt"),
  });
  assert.equal(prepared.ok, true);
  assert.equal(prepared.phase, "EXPOSE");

  const denied = requestOutboundSend({
    config,
    normalized,
    draftText: draft.text,
    actionRequestId: buildActionRequestId("msg-rt"),
  });
  assert.equal(denied.error, "authorization_missing");
  assert.equal(listPendingOutbox(dir).length, 0);

  const authorization = mintWhatsappSendAuthorization(prepared, { principal: "principal:test" });
  const allowed = requestOutboundSend({
    config,
    normalized,
    draftText: draft.text,
    actionRequestId: buildActionRequestId("msg-rt"),
    side_effect_authorization: authorization,
  });
  assert.equal(allowed.enqueued, true);

  const replay = requestOutboundSend({
    config,
    normalized,
    draftText: draft.text,
    actionRequestId: buildActionRequestId("msg-rt-replay"),
    side_effect_authorization: authorization,
  });
  assert.equal(replay.error, "authorization_replay");
  assert.equal(listPendingOutbox(dir).length, 1);

  report.ok = true;
  report.enqueued = 1;
  report.baileys_contacted = false;
} catch (err) {
  report.error = err.message;
  report.error_class = err.error_class || null;
} finally {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
}

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
