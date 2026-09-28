/**
 * Phase-3 resumable Issue apply.
 *
 * PREPARE → EXPOSE → AUTHORIZE → EXECUTE → VERIFY
 * The pure functions never call GitHub. A matching --confirm hash is the
 * authorization to write one exact delivery body.
 */
import { createHash } from "node:crypto";

export const RESUMABLE_APPLY_SCHEMA = "cogentia.resumable-issue-apply/v1";
export const RESUMABLE_APPLY_METHOD = "cogentia.resumable-issue-apply/v1";

const NO_EFFECTS = {
  github_issue_mutation: false,
  git_commit: false,
  git_push: false,
  branch_created: false,
  deployment: false,
  external_communication: false,
  continuation_emitted: false,
  plan_applied: false,
};

export function prepareResumableApply(issue, plan) {
  const current = String(issue?.body || "");
  const currentHash = sha256(current);
  const proposed = typeof plan?.proposed_body === "string" ? plan.proposed_body : "";
  const proposedHash = String(plan?.proposed_body_sha256 || (proposed ? sha256(proposed) : ""));
  const base = {
    schema: RESUMABLE_APPLY_SCHEMA,
    method: RESUMABLE_APPLY_METHOD,
    phase: "EXPOSE",
    issue: {
      repository: String(issue?.repository || plan?.issue?.repository || ""),
      number: Number(issue?.number || plan?.issue?.number || 0),
    },
    current_body_sha256: currentHash,
    expected_body_sha256: String(plan?.original_body_sha256 || ""),
    proposed_body_sha256: proposedHash,
    effects: { ...NO_EFFECTS },
  };

  if (plan?.status === "needs_judgment" || !proposed) {
    return {
      ...base,
      status: "refused",
      reason: plan?.status === "needs_judgment" ? "needs_judgment" : "missing_proposed_body",
      delivery_body: null,
      delivery_body_sha256: null,
      exit_code: plan?.status === "needs_judgment" ? 3 : 4,
      note: "No Issue write. The plan has no authorized body.",
    };
  }
  const delivery = markApplied(proposed, proposedHash);
  const deliveryHash = sha256(delivery);
  if (sameGithubBody(current, delivery)) {
    return {
      ...base,
      status: "already_applied",
      phase: "VERIFY",
      delivery_body: delivery,
      delivery_body_sha256: deliveryHash,
      verified: true,
      exit_code: 0,
      note: "The current Issue body already matches the delivery body. No write.",
    };
  }
  if (base.expected_body_sha256 && currentHash !== base.expected_body_sha256) {
    return {
      ...base,
      status: "stale_plan",
      reason: "current_body_hash_differs",
      delivery_body: null,
      delivery_body_sha256: null,
      exit_code: 4,
      note: "The Issue body changed after the plan. Refusing the write.",
    };
  }
  return {
    ...base,
    status: "exposed",
    delivery_body: delivery,
    delivery_body_sha256: deliveryHash,
    confirm: deliveryHash,
    exit_code: 2,
    note: "Exposed only. Re-run with --confirm <delivery_body_sha256> to write this exact body.",
  };
}

export function authorizeResumableApply(exposed, confirm) {
  if (!exposed || exposed.status !== "exposed") {
    return { ...exposed, authorized: false };
  }
  if (String(confirm || "") !== exposed.delivery_body_sha256) {
    return {
      ...exposed,
      status: "confirm_required",
      phase: "AUTHORIZE",
      authorized: false,
      exit_code: 2,
      effects: { ...NO_EFFECTS },
      note: "Confirm does not match the exposed delivery body. No write.",
    };
  }
  return {
    ...exposed,
    status: "authorized",
    phase: "AUTHORIZE",
    authorized: true,
    note: "Confirm matches the exposed delivery body.",
  };
}

export function verifyDeliveredBody(expected, fetched) {
  const want = String(expected || "");
  const got = String(fetched ?? "");
  const fetchedHash = sha256(got);
  if (got === want) {
    return { ok: true, github_trailing_newline: false, fetched_body_sha256: fetchedHash };
  }
  if (got === `${want}\n`) {
    return { ok: true, github_trailing_newline: true, fetched_body_sha256: fetchedHash };
  }
  return { ok: false, reason: "delivered_body_mismatch", fetched_body_sha256: fetchedHash };
}

export function renderResumableIssueApply(result) {
  const issue = result.issue || {};
  const lines = [
    `Resumable-issue apply  ${issue.repository || "(unknown)"}#${issue.number || "?"}`,
    `schema: ${result.schema}`,
    `phase: ${result.phase}`,
    `status: ${result.status}`,
    `current_body_sha256: ${result.current_body_sha256 || ""}`,
    `proposed_body_sha256: ${result.proposed_body_sha256 || ""}`,
    `delivery_body_sha256: ${result.delivery_body_sha256 || "(none)"}`,
    `github write: ${result.effects?.github_issue_mutation ? "yes" : "no"}`,
    `verified: ${result.verified === true ? "yes" : "no"}`,
  ];
  if (result.reason) lines.push(`reason: ${result.reason}`);
  if (result.note) lines.push(`note: ${result.note}`);
  if (result.status === "exposed") {
    lines.push("", `confirm: --confirm ${result.delivery_body_sha256}`, "", "delivery body:", result.delivery_body);
  }
  return lines.join("\n");
}

function markApplied(body, proposedHash) {
  const text = String(body);
  const match = text.match(/```yaml\r?\nresumability_refactor:\r?\n[\s\S]*?```/);
  if (!match) {
    return `${text.replace(/\s*$/, "")}\n\n## Resumability refactor\n\n\`\`\`yaml\nresumability_refactor:\n  status: applied\n  proposed_body_sha256: ${proposedHash}\n  method: ${RESUMABLE_APPLY_METHOD}\n\`\`\`\n\nThis block records a present-day resumability refactor that has been applied. The proposed_body_sha256 is the authorized plan identity.\n`;
  }
  let yaml = match[0].replace(/status:\s*plan_not_applied/, "status: applied");
  if (!/proposed_body_sha256:/.test(yaml)) {
    yaml = yaml.replace(/resumability_refactor:\r?\n/, match => `${match}  proposed_body_sha256: ${proposedHash}\n`);
  }
  return text.replace(match[0], yaml).replace(
    "This block is a present-day plan addition. Applying it requires a separate authorization.",
    "This block records a present-day resumability refactor that has been applied. The proposed_body_sha256 is the authorized plan identity.",
  );
}

function sameGithubBody(current, delivery) {
  return verifyDeliveredBody(delivery, current).ok;
}

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}
