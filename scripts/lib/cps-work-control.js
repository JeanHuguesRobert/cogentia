/** CPS handler participation over an existing GitHub Issue packet. */
import { createHash } from "node:crypto";
export const CPS_WORK_SCHEMA = "cogentia.cps-work-control.v1";
const OPS = new Set(["park", "handoff", "resume"]);
const clip = (s, max = 8000) => String(s || "").trim().slice(0,max);
export function parseIssueRef(ref) {
  const input = String(ref || "").trim();
  const m = /^(?:https:\/\/github\.com\/)?([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/issues\/(\d+)(?:[/?#].*)?$/.exec(input)
    || /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)#(\d+)$/.exec(input);
  if (!m || Number(m[3]) < 1) throw new Error("Expected an existing GitHub Issue URL or owner/repo#number");
  return { repo: m[1] + "/" + m[2], number:Number(m[3]), url:"https://github.com/" + m[1] + "/" + m[2] + "/issues/" + m[3] };
}
const digest = value => createHash("sha256").update(value).digest("hex").slice(0,20);
function parseReceipt(body) {
  const marker = String(body || "").match(/<!-- cogentia:cps-work-control:v1 ([a-f0-9]{20}) -->/);
  if (!marker) return null;
  const section = String(body).match(/~~~json\s*\n([\s\S]*?)\n~~~/);
  if (!section) return null;
  try {
    const value = JSON.parse(section[1]);
    return value.schema === CPS_WORK_SCHEMA && value.receipt_id === marker[1] ? value : null;
  } catch { return null; }
}
export function cpsWorkControl({op,ref,acquired="",next="",blocker="",handler="conversation",issue,writeComment}) {
  if (!OPS.has(op)) throw new Error("Unsupported CPS action");
  const target = parseIssueRef(ref);
  if (!issue || String(issue.state).toUpperCase() === "CLOSED") throw new Error("Packet Issue unavailable or closed");
  const comments = (issue.comments || []).map(c=>parseReceipt(c.body)).filter(Boolean);
  const latest = comments.at(-1) || null;
  if (op === "resume") return {
    ok:true,schema:CPS_WORK_SCHEMA,operation:op,packet_ref:target.url,
    issue_title:issue.title,issue_state:issue.state,latest_receipt:latest,
    next_action:latest?.next_action || null,blocked_reason:latest?.blocker || null,
    continuity:latest ? "checkpoint_found" : "no_cps_checkpoint",
    claim_acquired:false,authority_granted:false,execution_performed:false,
  };
  if (!clip(acquired) || !clip(next)) throw new Error("park/handoff requires explicit --acquired and --next; cannot infer unpersisted conversation knowledge");
  if (typeof writeComment !== "function") throw new Error("A durable Issue comment writer is required");
  const record = {
    schema:CPS_WORK_SCHEMA,operation:op,packet_ref:target.url,
    acquired:clip(acquired),next_action:clip(next),blocker:clip(blocker),
    handler:clip(handler,200),baseline:issue.updatedAt || null,
  };
  // Deduplicate the semantic transition, not the mutable Issue updatedAt.
  const {baseline: _baseline, ...identity} = record;
  const receiptId = digest(JSON.stringify(identity));
  const prior = comments.find(c=>c.receipt_id === receiptId);
  if (prior) return {ok:true,deduplicated:true,receipt:prior,packet_ref:target.url,persisted:true};
  const receipt = {...record,receipt_id:receiptId};
  const body = "<!-- cogentia:cps-work-control:v1 " + receiptId + " -->\n### CPS " + op + " — handler checkpoint\n\n~~~json\n"
    + JSON.stringify(receipt,null,2) + "\n~~~\n\nHandler receipt only; no COP claim, grant or mandate.";
  const delivery = writeComment(target,body);
  if (delivery === false) throw new Error("CPS checkpoint delivery was not verified");
  return {ok:true,schema:CPS_WORK_SCHEMA,operation:op,packet_ref:target.url,persisted:true,deduplicated:false,receipt,
    claim_acquired:false,authority_granted:false,execution_performed:false};
}
