/**
 * Cogentia-owned communication.send (Gmail) adapter for #171 Phase C.
 * Default transport records a dry-run receipt and does not talk to Google.
 */
import { executeAuthorizedEffect, attachExposePacket } from "./side-effect-authorization.js";

export const COMMUNICATION_PREPARE_KIND = "cogentia.communication_prepare/v1";

export function createDryRunTransport() {
  const sent = [];
  return {
    kind: "dry-run",
    sent,
    async send(payload) {
      const receipt = {
        ok: true,
        transport: "dry-run",
        message_id: `dry_${Date.now()}`,
        to: payload.to,
        subject: payload.subject,
      };
      sent.push({ payload, receipt });
      return receipt;
    },
  };
}

export function prepareCommunicationSend({
  to,
  subject,
  body,
  cc = [],
  bcc = [],
} = {}) {
  const recipients = Array.isArray(to) ? to.map(String) : (to ? [String(to)] : []);
  if (!recipients.length) {
    const err = new Error("to is required");
    err.error_class = "invalid_communication";
    throw err;
  }
  if (!subject) {
    const err = new Error("subject is required");
    err.error_class = "invalid_communication";
    throw err;
  }
  if (typeof body !== "string") {
    const err = new Error("body is required");
    err.error_class = "invalid_communication";
    throw err;
  }
  const payload = {
    to: recipients,
    cc: Array.isArray(cc) ? cc : [],
    bcc: Array.isArray(bcc) ? bcc : [],
    subject: String(subject),
    body,
  };
  return attachExposePacket({
    kind: COMMUNICATION_PREPARE_KIND,
    action_class: "gmail.send",
    target: { recipient: recipients.join(",") },
    payload,
    exposed_message: {
      to: payload.to,
      cc: payload.cc,
      bcc: payload.bcc,
      subject: payload.subject,
      body: payload.body,
    },
    phase: "EXPOSE",
    note: "This is not a send. A side_effect_authorization bound to this payload is required to execute.",
  });
}

export async function executeCommunicationSend({
  prepared,
  authorization,
  transport,
} = {}) {
  if (!prepared || prepared.action_class !== "gmail.send") {
    const err = new Error("prepared gmail.send envelope required");
    err.error_class = "invalid_communication";
    throw err;
  }
  const tx = transport || createDryRunTransport();
  return executeAuthorizedEffect({
    action_class: "gmail.send",
    target: prepared.target,
    payload: prepared.payload,
    authorization,
    run: () => tx.send(prepared.payload),
  });
}
