#!/usr/bin/env node
/**
 * #171 Phase C Reality Test — communication.send without Google.
 * Narration cannot send. After EXPOSE, a bound grant can send once (dry-run).
 */
import assert from "node:assert/strict";
import {
  grantSideEffectAuthorization,
  resetAuthorizationStore,
  authorizationFromUtterance,
} from "../lib/side-effect-authorization.js";
import {
  prepareCommunicationSend,
  executeCommunicationSend,
  createDryRunTransport,
} from "../lib/communication-send.js";

resetAuthorizationStore();
const transport = createDryRunTransport();
const report = { ok: false, sent: 0 };

try {
  const narration = authorizationFromUtterance("On va lui envoyer ce document.");
  assert.equal(narration.granted, false);

  const prepared = prepareCommunicationSend({
    to: ["ext@example.com"],
    subject: "Reality Test",
    body: "This is the exact body the Principal must see.",
  });
  assert.equal(prepared.phase, "EXPOSE");

  await assert.rejects(
    () => executeCommunicationSend({ prepared, authorization: null, transport }),
    (e) => e.error_class === "authorization_missing"
  );
  assert.equal(transport.sent.length, 0);

  const afterExpose = authorizationFromUtterance("Envoie-le.");
  assert.equal(afterExpose.granted, false, "utterance still does not mint a grant");

  const authorization = grantSideEffectAuthorization({
    principal: "principal:test",
    action_class: "gmail.send",
    target: prepared.target,
    payload: prepared.payload,
  });
  const executed = await executeCommunicationSend({ prepared, authorization, transport });
  assert.equal(executed.ok, true);
  assert.equal(transport.sent[0].payload.body, prepared.payload.body);

  await assert.rejects(
    () => executeCommunicationSend({ prepared, authorization, transport }),
    (e) => e.error_class === "authorization_replay"
  );
  assert.equal(transport.sent.length, 1);

  report.ok = true;
  report.sent = transport.sent.length;
  report.transport = "dry-run";
  report.google_contacted = false;
} catch (err) {
  report.error = err.message;
  report.error_class = err.error_class || null;
}

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
