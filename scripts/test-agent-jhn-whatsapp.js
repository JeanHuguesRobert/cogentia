#!/usr/bin/env node
/**
 * Deterministic offline tests for Agent JHN WhatsApp MVP (issue #75).
 * No QR, no real account, no network WhatsApp traffic.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadConfig,
  validateConfig,
  publicConfigSnapshot,
  ensureStateDirs,
} from "./lib/agent-jhn-whatsapp/config.js";
import { buildSapientialActionRegimeBlock } from "./lib/agent-jhn-whatsapp/representation-brief.js";
import {
  normalizeInboundEvent,
  bareJid,
} from "./lib/agent-jhn-whatsapp/inbound-normalizer.js";
import {
  evaluatePolicy,
  listRepresentableGroupPolicyModes,
  draftIncludesNotice,
  isEngagingText,
} from "./lib/agent-jhn-whatsapp/policy.js";
import { evaluateUsageGrant } from "./lib/agent-jhn-whatsapp/usage-grant.js";
import { buildDeterministicDraft } from "./lib/agent-jhn-whatsapp/draft.js";
import {
  buildWhatsappArtifact,
  validateWhatsappArtifact,
  appendTrace,
  redactForDiagnostics,
  assertNoSecretsInDiagnostics,
} from "./lib/agent-jhn-whatsapp/trace.js";
import {
  requestOutboundSend,
  drainWhatsappOutbox,
  buildActionRequestId,
  isActionAlreadyHandled,
} from "./lib/agent-jhn-whatsapp/outbound-gate.js";
import { createMockTransport } from "./lib/agent-jhn-whatsapp/baileys-transport.js";
import { handleInbound } from "./lib/agent-jhn-whatsapp/pipeline.js";
import {
  DECISIONS,
  GROUP_POLICY_MODES,
  SCHEMA_VERSION,
  DEFAULT_NOTICE_URL,
} from "./lib/agent-jhn-whatsapp/constants.js";
import {
  listPendingOutbox,
  markOutboxFailed,
  outboxStats,
} from "./ops/edge/lib/outbox.js";

const SELF_JID = "33612345678@s.whatsapp.net";
const THIRD_JID = "33799999999@s.whatsapp.net";
const GROUP_JID = "120363000000000000@g.us";

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agent-jhn-wa-"));
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function baseEnv(extra = {}) {
  return {
    AGENT_JHN_WHATSAPP_STATE_DIR: tmpRoot,
    AGENT_JHN_WHATSAPP_ALLOWED_SELF_JID: SELF_JID,
    AGENT_JHN_WHATSAPP_MODE: "self_chat_only",
    AGENT_JHN_WHATSAPP_SEND_ENABLED: "false",
    AGENT_JHN_WHATSAPP_NOTICE_URL: DEFAULT_NOTICE_URL,
    ...extra,
  };
}

function selfMessage(text, id = "msg-self-1") {
  return {
    key: { id, remoteJid: SELF_JID, fromMe: false },
    message: { conversation: text },
    messageTimestamp: 1_700_000_000,
  };
}

function thirdMessage(text) {
  return {
    key: { id: "msg-third-1", remoteJid: THIRD_JID, fromMe: false },
    message: { conversation: text },
    messageTimestamp: 1_700_000_000,
  };
}

function groupMessage(text, participant = "33611111111@s.whatsapp.net") {
  return {
    key: {
      id: "msg-group-1",
      remoteJid: GROUP_JID,
      fromMe: false,
      participant,
    },
    message: { conversation: text },
    messageTimestamp: 1_700_000_000,
  };
}

// --- 1. normalization of synthetic event ---
test("1_normalize_synthetic", () => {
  const n = normalizeInboundEvent(selfMessage("hello"));
  assert.equal(n.ok, true);
  assert.equal(n.conversation_kind, "direct");
  assert.equal(n.remote_jid_bare, bareJid(SELF_JID));
  assert.equal(n.text, "hello");
  assert.equal(n.has_media, false);
  assert.equal(n.integrity.algorithm, "sha256");
  assert.match(n.integrity.raw_message_sha256, /^[a-f0-9]{64}$/);
  assert.equal(n.conversation_id, `whatsapp:${bareJid(SELF_JID)}`);
});

// --- 2. reject third party ---
test("sapiential_action_regime_is_explicit_and_revocable", () => {
  assert.equal(buildSapientialActionRegimeBlock({}, {}).trim(), "");
  const active = buildSapientialActionRegimeBlock({}, {
    AGENT_JHN_SAPIENTIAL_ACTION_REGIME: "proverbial-v1",
  });
  assert.match(active, /SAPIENTIAL ACTION REGIME: proverbial-v1/);
  assert.match(active, /does not reduce authorised action/);
  assert.match(active, /never enlarges/);
});

// --- 2. reject third party ---
test("2_reject_third_party", () => {
  const config = loadConfig(baseEnv({ AGENT_JHN_WHATSAPP_SEND_ENABLED: "true" }));
  const n = normalizeInboundEvent(thirdMessage("hi"));
  const p = evaluatePolicy(n, config, {
    draftText: buildDeterministicDraft(n, config).text,
  });
  assert.equal(p.decision, DECISIONS.REJECT);
  assert.equal(p.rule_id, "policy.third_party_forbidden");
  assert.equal(p.allow_send, false);
});

// --- 3. MVP reject real group ---
test("3_reject_group_mvp", () => {
  const config = loadConfig(baseEnv());
  const n = normalizeInboundEvent(groupMessage("hello group"));
  const p = evaluatePolicy(n, config);
  assert.equal(p.decision, DECISIONS.REJECT);
  assert.equal(p.rule_id, "policy.group_disabled");
  assert.equal(p.allow_send, false);
});

// --- 4. normalize group synthetic without leaking as public ---
test("4_normalize_group_synthetic", () => {
  const n = normalizeInboundEvent(groupMessage("secret-group-text", "33622222222@s.whatsapp.net"));
  assert.equal(n.ok, true);
  assert.equal(n.conversation_kind, "group");
  assert.equal(n.group_id, `whatsapp-group:${GROUP_JID}`);
  assert.equal(n.group_member_id, "whatsapp-member:33622222222@s.whatsapp.net");
  assert.ok(n.group_meta);
  // text stays in normalized for local processing; public snapshot must not include it
  const summary = {
    kind: n.conversation_kind,
    group_id: n.group_id,
    text_length: n.text_length,
  };
  assert.equal(JSON.stringify(summary).includes("secret-group-text"), false);
});

// --- 5. group modes representable, not activable without explicit config ---
test("5_group_modes_representable", () => {
  const modes = listRepresentableGroupPolicyModes();
  for (const m of [
    GROUP_POLICY_MODES.OBSERVE,
    GROUP_POLICY_MODES.DRAFT_ON_MENTION,
    GROUP_POLICY_MODES.APPROVAL_REQUIRED,
    GROUP_POLICY_MODES.MANDATED_AUTONOMY,
  ]) {
    assert.ok(modes.includes(m), `missing mode ${m}`);
  }

  // Without groups_explicitly_enabled, still disabled
  const configOff = loadConfig(baseEnv({
    AGENT_JHN_WHATSAPP_GROUP_POLICIES_JSON: JSON.stringify({
      [`whatsapp-group:${GROUP_JID}`]: "observe",
    }),
  }));
  const n = normalizeInboundEvent(groupMessage("x"));
  const pOff = evaluatePolicy(n, configOff);
  assert.equal(pOff.rule_id, "policy.group_disabled");

  // With explicit enable, modes apply but never allow_send in MVP
  for (const mode of [
    GROUP_POLICY_MODES.OBSERVE,
    GROUP_POLICY_MODES.DRAFT_ON_MENTION,
    GROUP_POLICY_MODES.APPROVAL_REQUIRED,
    GROUP_POLICY_MODES.MANDATED_AUTONOMY,
  ]) {
    const cfg = loadConfig(baseEnv({
      AGENT_JHN_WHATSAPP_GROUPS_ENABLED: "true",
      AGENT_JHN_WHATSAPP_GROUP_POLICIES_JSON: JSON.stringify({
        [`whatsapp-group:${GROUP_JID}`]: mode,
      }),
      AGENT_JHN_WHATSAPP_SEND_ENABLED: "true",
    }));
    const p = evaluatePolicy(n, cfg, {
      draftText: buildDeterministicDraft(n, cfg).text,
    });
    assert.equal(p.allow_send, false, `mode ${mode} must not allow send`);
    assert.ok(p.group_policy_mode === mode || p.rule_id.includes("group"));
  }
});

// --- 6. reject non-null persona ---
test("6_reject_persona", () => {
  const config = loadConfig(baseEnv({
    AGENT_JHN_WHATSAPP_PERSONA_ID: "some-persona",
    AGENT_JHN_WHATSAPP_SEND_ENABLED: "true",
  }));
  const n = normalizeInboundEvent(selfMessage("hi"));
  const p = evaluatePolicy(n, config);
  assert.equal(p.decision, DECISIONS.REJECT);
  assert.equal(p.rule_id, "policy.persona_forbidden");
  const v = validateConfig(config);
  assert.equal(v.ok, false);
});

// --- 7. reject engaging intent ---
test("7_reject_engaging", () => {
  assert.equal(isEngagingText("je te promets que c'est signé"), true);
  const config = loadConfig(baseEnv({ AGENT_JHN_WHATSAPP_SEND_ENABLED: "true" }));
  const n = normalizeInboundEvent(selfMessage("je signe le contrat demain"));
  const p = evaluatePolicy(n, config);
  assert.equal(p.decision, DECISIONS.REJECT);
  assert.equal(p.rule_id, "policy.engaging_intent");
});

// --- 8. self draft: light identification; FR for +33; third_party gets full notice ---
test("8_draft_includes_notice", async () => {
  const {
    formatOutboundText,
    resolveDisclosureLocale,
    draftIncludesThirdPartyDisclosure,
    draftIncludesSelfIdentification,
  } = await import("./lib/agent-jhn-whatsapp/disclosure.js");

  const config = loadConfig(baseEnv());
  const n = normalizeInboundEvent(selfMessage("ping"));
  const draft = buildDeterministicDraft(n, config);
  // Self: identification only (no verbose disclosure noise required)
  assert.ok(draftIncludesNotice(draft.text, config.notice_url));
  assert.ok(draftIncludesSelfIdentification(draft.text));
  assert.equal(draft.audience, "self");
  assert.equal(draft.locale, "fr");
  assert.ok(!draft.text.includes(DEFAULT_NOTICE_URL), "self draft should not dump full notice URL");

  assert.equal(resolveDisclosureLocale("33678059481"), "fr");
  assert.equal(resolveDisclosureLocale("14155552671"), "en");

  const third = formatOutboundText("Bonjour", {
    audience: "third_party",
    phoneOrJid: "33678059481",
    noticeUrl: DEFAULT_NOTICE_URL,
  });
  assert.ok(draftIncludesThirdPartyDisclosure(third, DEFAULT_NOTICE_URL));
  assert.ok(third.includes("assistant expérimental") || third.includes("pas Jean Hugues"));
  assert.ok(third.includes(DEFAULT_NOTICE_URL));

  const thirdEn = formatOutboundText("Hello", {
    audience: "third_party",
    phoneOrJid: "14155552671",
    noticeUrl: DEFAULT_NOTICE_URL,
  });
  assert.ok(thirdEn.includes("experimental assistant"));
  assert.ok(thirdEn.includes(DEFAULT_NOTICE_URL));
});

// --- 9. no outbound if SEND_ENABLED=false ---
test("9_no_send_when_disabled", async () => {
  const dir = fs.mkdtempSync(path.join(tmpRoot, "t9-"));
  const config = loadConfig(baseEnv({
    AGENT_JHN_WHATSAPP_STATE_DIR: dir,
    AGENT_JHN_WHATSAPP_SEND_ENABLED: "false",
  }));
  ensureStateDirs(config);
  const n = normalizeInboundEvent(selfMessage("ping", "msg-t9"));
  const draft = buildDeterministicDraft(n, config);
  const p = evaluatePolicy(n, config, { draftText: draft.text });
  assert.equal(p.decision, DECISIONS.DRAFT_ONLY);
  assert.equal(p.allow_send, false);
  const req = requestOutboundSend({
    config,
    normalized: n,
    draftText: draft.text,
    actionRequestId: buildActionRequestId("msg-t9"),
  });
  assert.equal(req.enqueued, false);
  assert.equal(req.blocked_before_outbox, true);
  assert.equal(listPendingOutbox(dir).length, 0);
});

// --- 10. self-chat alone authorizable when all preconditions met ---
test("10_self_chat_send_when_ready", async () => {
  const dir = fs.mkdtempSync(path.join(tmpRoot, "t10-"));
  const config = loadConfig(baseEnv({
    AGENT_JHN_WHATSAPP_STATE_DIR: dir,
    AGENT_JHN_WHATSAPP_SEND_ENABLED: "true",
  }));
  ensureStateDirs(config);
  const n = normalizeInboundEvent(selfMessage("ping non engageant", "msg-t10"));
  const draft = buildDeterministicDraft(n, config);
  const p = evaluatePolicy(n, config, { draftText: draft.text });
  assert.equal(p.decision, DECISIONS.SEND);
  assert.equal(p.allow_send, true);

  const transport = createMockTransport({ connected: true });
  const req = requestOutboundSend({
    config,
    normalized: n,
    draftText: draft.text,
    actionRequestId: buildActionRequestId("msg-t10"),
  });
  assert.equal(req.enqueued, true);
  const drained = await drainWhatsappOutbox(config, { transport, dryRun: false });
  assert.equal(drained.sent, 1);
  assert.equal(transport.getSent().length, 1);
  assert.equal(transport.getSent()[0].jid, bareJid(SELF_JID));
});

// --- 11. idempotence: same action_request_id never two sends ---
test("11_idempotent_action_request", async () => {
  const dir = fs.mkdtempSync(path.join(tmpRoot, "t11-"));
  const config = loadConfig(baseEnv({
    AGENT_JHN_WHATSAPP_STATE_DIR: dir,
    AGENT_JHN_WHATSAPP_SEND_ENABLED: "true",
  }));
  ensureStateDirs(config);
  const n = normalizeInboundEvent(selfMessage("ping", "msg-t11"));
  const draft = buildDeterministicDraft(n, config);
  const actionId = buildActionRequestId("msg-t11");
  const r1 = requestOutboundSend({ config, normalized: n, draftText: draft.text, actionRequestId: actionId });
  assert.equal(r1.enqueued, true);
  const r2 = requestOutboundSend({ config, normalized: n, draftText: draft.text, actionRequestId: actionId });
  assert.equal(r2.idempotent_skip, true);
  assert.equal(r2.enqueued, false);
  assert.equal(listPendingOutbox(dir).length, 1);

  const transport = createMockTransport({ connected: true });
  await drainWhatsappOutbox(config, { transport });
  assert.equal(transport.getSent().length, 1);

  // re-request after send → ledger blocks
  const r3 = requestOutboundSend({ config, normalized: n, draftText: draft.text, actionRequestId: actionId });
  assert.equal(r3.idempotent_skip, true);
  const handled = isActionAlreadyHandled(dir, actionId, config);
  assert.equal(handled.handled, true);
  assert.equal(handled.where, "sent_ledger");
});

// --- 12. outbox resume / backoff ---
test("12_outbox_backoff", async () => {
  const dir = fs.mkdtempSync(path.join(tmpRoot, "t12-"));
  const config = loadConfig(baseEnv({
    AGENT_JHN_WHATSAPP_STATE_DIR: dir,
    AGENT_JHN_WHATSAPP_SEND_ENABLED: "true",
  }));
  ensureStateDirs(config);
  const n = normalizeInboundEvent(selfMessage("ping", "msg-t12"));
  const draft = buildDeterministicDraft(n, config);
  requestOutboundSend({
    config,
    normalized: n,
    draftText: draft.text,
    actionRequestId: buildActionRequestId("msg-t12"),
  });
  const transport = createMockTransport({
    connected: true,
    failSend: true,
    failSendMessage: "network_down",
  });
  const drained = await drainWhatsappOutbox(config, { transport });
  assert.equal(drained.sent, 0);
  assert.ok(drained.results[0].attempts >= 1);
  // After fail with backoff, next_attempt_at in future → listPending may be empty now
  const stats = outboxStats(dir);
  assert.ok(stats.pending === 1 || stats.failed === 1 || drained.results[0].state === "pending");
  // Force mark path also works
  const pending = listPendingOutbox(dir);
  if (pending.length === 1) {
    const fail = markOutboxFailed(pending[0], "retry_test");
    assert.equal(fail.attempts >= 1, true);
    assert.ok(fail.next_attempt_at === null || typeof fail.next_attempt_at === "string");
  }
});

// --- 13. trace validity / integrity ---
test("13_trace_integrity", () => {
  const dir = fs.mkdtempSync(path.join(tmpRoot, "t13-"));
  const config = loadConfig(baseEnv({ AGENT_JHN_WHATSAPP_STATE_DIR: dir }));
  ensureStateDirs(config);
  const n = normalizeInboundEvent(selfMessage("trace me", "msg-t13"));
  const art = buildWhatsappArtifact({
    artifact_type: "whatsapp_received",
    direction: "inbound",
    platform_message_id: n.platform_message_id,
    agent_id: config.agent_id,
    visible_agent_id: config.visible_agent_id,
    mandate_id: config.mandate_id,
    account_custodian_id: config.account_custodian_id,
    beneficiary_instance_id: config.usage_grant.beneficiary_instance_id,
    principal_id: config.principal_id,
    persona_id: null,
    conversation_kind: n.conversation_kind,
    conversation_id: n.conversation_id,
    visibility: "raw_private",
    raw_message_sha256: n.integrity.raw_message_sha256,
    raw_message_ref: n.integrity.raw_message_ref,
    transport_status: "received",
    policy: { decision: "draft_only", rule_id: "policy.send_disabled", reason: "test" },
    usage_grant: config.usage_grant,
  });
  assert.equal(art.schema_version, SCHEMA_VERSION);
  const v = validateWhatsappArtifact(art);
  assert.equal(v.ok, true, v.errors?.join("; "));
  const written = appendTrace(config, art);
  assert.ok(fs.existsSync(written.path));
  const line = fs.readFileSync(written.path, "utf8").trim().split("\n").pop();
  const parsed = JSON.parse(line);
  assert.equal(parsed.occurrence_id, art.occurrence_id);
  assert.equal(parsed.account_custodian_id, "jean-hugues-noel-robert");
  assert.equal(parsed.beneficiary_instance_id, "agent-jhn");
});

// --- 14. no secrets in diagnostics ---
test("14_no_secrets_in_diagnostics", () => {
  const config = loadConfig(baseEnv());
  const snap = publicConfigSnapshot(config);
  const redacted = redactForDiagnostics({
    ...snap,
    fake_session: {
      creds: { noiseKey: "SUPERSECRET", privateKey: "abc" },
      qr: "long-qr-payload-should-not-appear-in-status-output-xxxxx",
    },
  });
  assert.equal(redacted.fake_session.creds, "[redacted]");
  const check = assertNoSecretsInDiagnostics(redacted);
  assert.equal(check.ok, true, check.issues?.join(","));
  assert.equal(JSON.stringify(redacted).includes("SUPERSECRET"), false);
});

// --- 15. schema file exists (git diff --check run separately) ---
test("15_schema_file_present", () => {
  const schemaPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "trace",
    "schemas",
    "whatsapp-artifact.schema.json",
  );
  assert.ok(fs.existsSync(schemaPath));
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  assert.equal(schema.properties.schema_version.const, SCHEMA_VERSION);
});

// --- 16. grant absent / expired / revoked / out of scope blocks send ---
test("16_usage_grant_blocks", () => {
  const cases = [
    {
      name: "revoked",
      env: { AGENT_JHN_WHATSAPP_GRANT_REVOKED: "true", AGENT_JHN_WHATSAPP_SEND_ENABLED: "true" },
      rule: "grant.revoked",
    },
    {
      name: "expired",
      env: {
        AGENT_JHN_WHATSAPP_GRANT_EXPIRES_AT: "2020-01-01T00:00:00.000Z",
        AGENT_JHN_WHATSAPP_SEND_ENABLED: "true",
      },
      rule: "grant.expired",
    },
    {
      name: "scope",
      env: {
        AGENT_JHN_WHATSAPP_GRANT_SCOPE: "everyone",
        AGENT_JHN_WHATSAPP_SEND_ENABLED: "true",
      },
      rule: "grant.scope",
    },
  ];
  for (const c of cases) {
    const dir = fs.mkdtempSync(path.join(tmpRoot, `t16-${c.name}-`));
    const config = loadConfig(baseEnv({
      AGENT_JHN_WHATSAPP_STATE_DIR: dir,
      ...c.env,
    }));
    // validateConfig may reject scope; force grant object for policy
    if (c.name === "scope") {
      config.usage_grant = { ...config.usage_grant, conversation_scope: "everyone" };
    }
    ensureStateDirs(config);
    const n = normalizeInboundEvent(selfMessage("ping", `msg-t16-${c.name}`));
    const draft = buildDeterministicDraft(n, config);
    const p = evaluatePolicy(n, config, { draftText: draft.text });
    assert.equal(p.allow_send, false, c.name);
    assert.ok(
      p.rule_id === c.rule || p.rule_id.startsWith("grant."),
      `${c.name}: got ${p.rule_id}`,
    );
    const req = requestOutboundSend({
      config,
      normalized: n,
      draftText: draft.text,
      actionRequestId: buildActionRequestId(`msg-t16-${c.name}`),
    });
    assert.equal(req.enqueued, false, c.name);
    assert.equal(req.blocked_before_outbox, true, c.name);
  }

  // absent grant
  const g = evaluateUsageGrant(null);
  assert.equal(g.ok, false);
  assert.equal(g.rule_id, "grant.missing");
});

// --- 17. other instance refused even same number narrative ---
test("17_other_instance_refused", () => {
  const config = loadConfig(baseEnv({
    AGENT_JHN_WHATSAPP_BENEFICIARY_INSTANCE_ID: "agent-pertitellu",
    AGENT_JHN_WHATSAPP_SEND_ENABLED: "true",
  }));
  const g = evaluateUsageGrant(config.usage_grant, {
    requestedInstanceId: "agent-pertitellu",
    requireSend: true,
  });
  assert.equal(g.ok, false);
  assert.ok(g.rule_id === "grant.instance_not_mvp" || g.rule_id === "grant.instance_mismatch");

  const n = normalizeInboundEvent(selfMessage("hi", "msg-t17"));
  const p = evaluatePolicy(n, config);
  assert.equal(p.allow_send, false);
});

// --- 18. grant revoke blocks outbox before transport ---
test("18_revoke_blocks_drain", async () => {
  const dir = fs.mkdtempSync(path.join(tmpRoot, "t18-"));
  const config = loadConfig(baseEnv({
    AGENT_JHN_WHATSAPP_STATE_DIR: dir,
    AGENT_JHN_WHATSAPP_SEND_ENABLED: "true",
  }));
  ensureStateDirs(config);
  const n = normalizeInboundEvent(selfMessage("ping", "msg-t18"));
  const draft = buildDeterministicDraft(n, config);
  const req = requestOutboundSend({
    config,
    normalized: n,
    draftText: draft.text,
    actionRequestId: buildActionRequestId("msg-t18"),
  });
  assert.equal(req.enqueued, true);

  // Revoke grant then drain
  config.usage_grant = { ...config.usage_grant, revoked: true };
  const transport = createMockTransport({ connected: true });
  const drained = await drainWhatsappOutbox(config, { transport });
  assert.equal(drained.sent, 0);
  assert.equal(transport.getSent().length, 0);
  assert.ok(drained.results.some((r) => r.blocked || r.rule_id === "grant.revoked"));
});

// --- 19. traces carry custodian, beneficiary, visible agent, mandate, decision separately ---
test("19_trace_identity_separation", () => {
  const art = buildWhatsappArtifact({
    artifact_type: "whatsapp_send_requested",
    direction: "outbound",
    agent_id: "agent-jhn",
    visible_agent_id: "agent-jhn-experimental",
    mandate_id: "jhn-experimental-non-commitment-v1",
    account_custodian_id: "jean-hugues-noel-robert",
    beneficiary_instance_id: "agent-jhn",
    principal_id: "jean-hugues-noel-robert",
    raw_message_sha256: "a".repeat(64),
    transport_status: "queued",
    policy: { decision: "send", rule_id: "policy.self_chat_send", reason: "ok" },
    usage_grant: {
      grant_id: "jhn-whatsapp-self-chat-experimental-v1",
      beneficiary_instance_id: "agent-jhn",
      conversation_scope: "self_only",
      revoked: false,
    },
  });
  assert.equal(art.account_custodian_id, "jean-hugues-noel-robert");
  assert.equal(art.beneficiary_instance_id, "agent-jhn");
  assert.equal(art.visible_agent_id, "agent-jhn-experimental");
  assert.equal(art.mandate_id, "jhn-experimental-non-commitment-v1");
  assert.equal(art.policy.decision, "send");
  assert.notEqual(art.account_custodian_id, art.visible_agent_id);
});

// --- 20. non-exclusivity representable without multi-agent active ---
test("20_non_exclusive_account_mode", () => {
  const config = loadConfig(baseEnv());
  assert.equal(config.account_usage_mode, "non_exclusive");
  assert.equal(config.account_custodian_id, "jean-hugues-noel-robert");
  assert.equal(config.custodian_priority, "highest");
  assert.equal(config.credential_access, "mediated_only");
  // Only one MVP beneficiary instance active
  assert.equal(config.usage_grant.beneficiary_instance_id, "agent-jhn");
  assert.equal(config.usage_grant.transferable, false);
});

// --- pipeline dry-run integration ---
test("21_pipeline_dry_run_integration", async () => {
  const dir = fs.mkdtempSync(path.join(tmpRoot, "t21-"));
  const config = loadConfig(baseEnv({
    AGENT_JHN_WHATSAPP_STATE_DIR: dir,
    AGENT_JHN_WHATSAPP_SEND_ENABLED: "false",
    AGENT_JHN_WHATSAPP_DRY_RUN: "true",
  }));
  const result = await handleInbound(selfMessage("hello twin", "msg-t21"), config);
  assert.equal(result.ok, true);
  assert.equal(result.policy.decision, DECISIONS.DRAFT_ONLY);
  assert.equal(result.draft.includes_notice, true);
  assert.equal(result.outbound, null);
});

// --- dry-run drain never materializes ---
test("22_dry_run_drain_no_material", async () => {
  const dir = fs.mkdtempSync(path.join(tmpRoot, "t22-"));
  const config = loadConfig(baseEnv({
    AGENT_JHN_WHATSAPP_STATE_DIR: dir,
    AGENT_JHN_WHATSAPP_SEND_ENABLED: "true",
  }));
  ensureStateDirs(config);
  const n = normalizeInboundEvent(selfMessage("ping", "msg-t22"));
  const draft = buildDeterministicDraft(n, config);
  requestOutboundSend({
    config,
    normalized: n,
    draftText: draft.text,
    actionRequestId: buildActionRequestId("msg-t22"),
  });
  const transport = createMockTransport({ connected: true });
  const drained = await drainWhatsappOutbox(config, { transport, dryRun: true });
  assert.equal(drained.sent, 0);
  assert.equal(transport.getSent().length, 0);
  assert.ok(drained.results.every((r) => r.dry_run === true));
});

// --- media forbidden ---
test("23_media_forbidden", () => {
  const config = loadConfig(baseEnv({ AGENT_JHN_WHATSAPP_SEND_ENABLED: "true" }));
  const raw = {
    key: { id: "m-media", remoteJid: SELF_JID, fromMe: false },
    message: { imageMessage: { caption: "pic" } },
    messageTimestamp: 1_700_000_000,
  };
  const n = normalizeInboundEvent(raw);
  assert.equal(n.has_media, true);
  const p = evaluatePolicy(n, config);
  assert.equal(p.rule_id, "policy.media_forbidden");
});

// --- 24. emergency contacts & notification handler ---
test("24_emergency_contacts_instance_config", () => {
  const config = loadConfig(baseEnv({
    HUMAN_USER_PHONE: "+33753976287",
    HUMAN_USER_EMAIL: "jeanhuguesrobert@gmail.com",
  }));
  assert.equal(config.emergency_contacts.phone, "+33753976287");
  assert.equal(config.emergency_contacts.email, "jeanhuguesrobert@gmail.com");
  assert.ok(config.emergency_contacts.whatsapp_jid.includes("33753976287"));
});

// --- 25. conversation thread store & cockpit commands ---
test("25_conversation_store_and_cockpit_commands", async () => {
  const dir = fs.mkdtempSync(path.join(tmpRoot, "t25-"));
  const config = loadConfig(baseEnv({
    AGENT_JHN_WHATSAPP_STATE_DIR: dir,
    AGENT_JHN_WHATSAPP_SEND_ENABLED: "true",
  }));
  ensureStateDirs(config);

  const { isCockpitCommand, processCockpitCommand } = await import("./lib/agent-jhn-whatsapp/cockpit-commands.js");
  const { loadConversation } = await import("./lib/agent-jhn-whatsapp/conversation-store.js");

  assert.equal(isCockpitCommand("list conversations"), true);
  assert.equal(isCockpitCommand("help"), true);

  const helpReply = processCockpitCommand("help", config);
  assert.ok(helpReply.includes("Agent JHN Self-Chat Control Cockpit"));

  // Inbound self-chat command via pipeline
  const n = normalizeInboundEvent(selfMessage("list conversations", "msg-t25"));
  const res = await handleInbound(selfMessage("list conversations", "msg-t25"), config, { includeDraftText: true });
  assert.equal(res.ok, true);
  assert.ok(res.draft_text_for_local.includes("Active Conversation Threads") || res.draft_text_for_local.includes("No active conversation threads"));

  const conv = loadConversation(config, n.conversation_id);
  assert.equal(conv.conversation_id, n.conversation_id);
});

// --- 26. sovereign contact manager & google import ---
test("26_contact_manager_and_google_import", async () => {
  const dir = fs.mkdtempSync(path.join(tmpRoot, "t26-"));
  const config = loadConfig(baseEnv({ AGENT_JHN_WHATSAPP_STATE_DIR: dir }));
  ensureStateDirs(config);

  const { loadContactsStore, upsertContact, findContactByPhoneOrJid, importGoogleContactsJson } = await import("./lib/agent-jhn-whatsapp/contacts-manager.js");

  const store = loadContactsStore(config);
  assert.ok(store.contacts.length >= 1);
  assert.equal(store.contacts[0].trust_tier, "principal");

  upsertContact(config, { name: "Alice Dupont", phone: "+33612345678", trust_tier: "vip" });
  const found = findContactByPhoneOrJid(config, "33612345678@s.whatsapp.net");
  assert.equal(found.name, "Alice Dupont");
  assert.equal(found.trust_tier, "vip");

  const imp = importGoogleContactsJson(config, [
    { name: "Bob Martin", phone: "+33698765432", trust_tier: "colleague" }
  ]);
  assert.equal(imp.imported, 1);
  const foundBob = findContactByPhoneOrJid(config, "+33698765432");
  assert.equal(foundBob.name, "Bob Martin");
});

// --- 27. rate limiter & circuit breaker subsystem ---
test("27_rate_limiter_circuit_breaker", async () => {
  const dir = fs.mkdtempSync(path.join(tmpRoot, "t27-"));
  const config = loadConfig(baseEnv({ AGENT_JHN_WHATSAPP_STATE_DIR: dir }));
  ensureStateDirs(config);

  const { checkRateLimit, recordOutboundSendEvent, resetRateLimiter } = await import("./lib/agent-jhn-whatsapp/rate-limiter.js");

  const check1 = checkRateLimit(config, { maxSends: 3, windowMs: 60000 });
  assert.equal(check1.allowed, true);

  recordOutboundSendEvent(config);
  recordOutboundSendEvent(config);
  recordOutboundSendEvent(config);

  const checkTripped = checkRateLimit(config, { maxSends: 3, windowMs: 60000 });
  assert.equal(checkTripped.allowed, false);
  assert.equal(checkTripped.tripped, true);
  assert.equal(checkTripped.rule_id, "policy.rate_limit_exceeded_tripped");

  const resetRes = resetRateLimiter(config);
  assert.equal(resetRes.ok, true);

  const checkPostReset = checkRateLimit(config, { maxSends: 3, windowMs: 60000 });
  assert.equal(checkPostReset.allowed, true);
});

// --- 28. direct contact email & history-aware disclosure suppression ---
test("28_contact_email_and_history_aware_disclosure", async () => {
  const { DIRECT_CONTACT_EMAIL } = await import("./lib/agent-jhn-whatsapp/constants.js");
  const { formatOutboundText, AUDIENCE } = await import("./lib/agent-jhn-whatsapp/disclosure.js");
  const { hasRecentDisclosure, hasRecentEmailContact } = await import("./lib/agent-jhn-whatsapp/conversation-store.js");

  assert.equal(DIRECT_CONTACT_EMAIL, "jeanhuguesrobert@gmail.com");

  // 1. Initial third-party outbound: full disclaimer + direct email if requested
  const t1 = formatOutboundText("Bonjour", {
    audience: AUDIENCE.THIRD_PARTY,
    locale: "fr",
    includeEmailContact: true,
    hasRecentDisclosure: false,
    hasRecentEmailContact: false,
  });
  assert.ok(t1.includes("Message automatique d’un assistant expérimental"));
  assert.ok(t1.includes("jeanhuguesrobert@gmail.com"));

  // 2. History check helpers
  const turnsWithDisclosure = [
    { text: "Bonjour" },
    { text: t1 },
  ];
  assert.equal(hasRecentDisclosure(turnsWithDisclosure), true);
  assert.equal(hasRecentEmailContact(turnsWithDisclosure), true);

  // 3. Subsequent outbound when disclosure and email are present in history:
  // Full disclaimer and email are suppressed to avoid spamming
  const t2 = formatOutboundText("Suivi de dossier", {
    audience: AUDIENCE.THIRD_PARTY,
    locale: "fr",
    includeEmailContact: true,
    hasRecentDisclosure: hasRecentDisclosure(turnsWithDisclosure),
    hasRecentEmailContact: hasRecentEmailContact(turnsWithDisclosure),
  });
  assert.equal(t2.includes("Message automatique d’un assistant expérimental"), false);
  assert.equal(t2.includes("jeanhuguesrobert@gmail.com"), false);
  assert.ok(t2.includes("Suivi de dossier"));
  assert.ok(t2.includes("— agent-jhn-experimental"));
});

async function main() {
  const results = [];
  for (const t of tests) {
    try {
      await t.fn();
      results.push({ name: t.name, ok: true });
    } catch (err) {
      results.push({ name: t.name, ok: false, error: err.message, stack: err.stack });
    }
  }

  const failed = results.filter((r) => !r.ok);
  const summary = {
    ok: failed.length === 0,
    passed: results.filter((r) => r.ok).length,
    failed: failed.length,
    total: results.length,
    real_whatsapp_account_touched: false,
    external_message_sent: false,
    tests: results.map((r) => (r.ok ? r.name : { name: r.name, error: r.error })),
  };

  console.log(JSON.stringify(summary, null, 2));

  try {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } catch {
    /* ignore */
  }

  if (failed.length) {
    for (const f of failed) {
      console.error(`FAIL ${f.name}: ${f.error}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
