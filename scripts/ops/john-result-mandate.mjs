#!/usr/bin/env node
/**
 * Single canonical amendment preparation/import CLI. SSH private key remains
 * exclusively with the Principal. No secrets/signatures are logged.
 *
 * prepare: stdout is EXACT bytes to sign with ssh-keygen -Y sign.
 * inspect:  stdout is limited human-readable summary, no state writes.
 * apply FILE.sig: verify exact proposal using independent pinned public key,
 *                 then append vN+1 in the existing COP journal.
 */
import { readFileSync,realpathSync,statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve as resolvePath } from "node:path";
import { createSqliteCopEventStore } from
  "../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js";
import { openExistingJohnCopStore } from "../lib/john-cop-existing-store.js";
import { sshFingerprint } from "../lib/john-sshsig-approval.js";
import { createOfflineJohnIssuerVerifier } from "../lib/john-offline-issuer-verifier.js";
import { amendVerifiedJohnRoot } from "../lib/john-mandate-amendment.js";
import { prepareJohnResultMandateAmendment, RESULT_MANDATE_REF } from "../lib/john-result-mandate-plan.js";
import { proposalHash } from "../lib/john-root-mandate.js";
import { AMENDMENT_SSH_NAMESPACE } from "../lib/john-mandate-amendment-proof.js";
import { resolveMandate } from "../../../inseme/packages/cop-core/src/governed-act.js";

const PINNED_DB = "/var/lib/cogentia/cop/john-root-v1.sqlite";
const PINNED_FP = "SHA256:lG9BC3fIjurrBccYLO1w7VQpmc9ZMr8MvM1o3zJ6L3c";
function trustedKey() {
  const path = process.env.COGENTIA_JHN_ISSUER_AUTHORIZED_KEYS ||
    "/home/ubuntu/.ssh/authorized_keys";
  const key = readFileSync(path,"utf8").split("\n").find(line => {
    try { return sshFingerprint(line) === PINNED_FP; } catch { return false; }
  });
  if (!key) throw Error("trusted_issuer_key_missing");
  return key;
}
function canonicalPath() {
  const path = process.env.COGENTIA_JHN_CANONICAL_STORE_PATH || PINNED_DB;
  if (realpathSync(path)!==PINNED_DB || !statSync(path).isFile())
    throw Error("canonical_store_identity_mismatch");
  return path;
}
function evaluateExisting(store, key) {
  const verifier=createOfflineJohnIssuerVerifier({
    trustedSshPublicKey:key,expectedSshFingerprint:PINNED_FP,
  });
  const mandate=resolveMandate(store,RESULT_MANDATE_REF);
  if (verifier({mandate,mandate_ref:RESULT_MANDATE_REF,store}).verified!==true)
    throw Error("existing_mandate_signature_not_verified");
}
export function runCli(args = process.argv.slice(2)) {
  const [action,signaturePath] = args;
  if (!["prepare","inspect","apply"].includes(action) ||
      (action==="apply"&&!signaturePath) ||
      (action!=="apply"&&signaturePath))
    throw Error("usage: john-result-mandate.mjs prepare|inspect|apply <signature-file>");
  const path=canonicalPath(),key=trustedKey();
  if (action==="prepare" || action==="inspect") {
    const open=openExistingJohnCopStore(path);
    if (!open.ok) throw Error(open.error);
    try {
      evaluateExisting(open.store,key);
      const planned=prepareJohnResultMandateAmendment(open.store);
      if (!planned.ok) throw Error(planned.reason);
      if (action==="prepare") process.stdout.write(planned.canonical_bytes);
      else process.stdout.write(JSON.stringify({
        ...planned.summary,proposal_hash:planned.proposal_hash,
        signing_namespace:AMENDMENT_SSH_NAMESPACE,
        signature_required:true,changed_fields:["scope.allowed_actions"],
        writes_cop:false,
      },null,2)+"\n");
    } finally {open.close();}
    return;
  }
  // No generic import: signature must match the exact mandate reconstructed
  // from the current store and the separately pinned key.
  const signature=readFileSync(resolvePath(signaturePath),"utf8");
  if(signature.length>8192)throw Error("signature_too_large");
  const store=createSqliteCopEventStore(path);
  try {
    evaluateExisting(store,key);
    const planned=prepareJohnResultMandateAmendment(store);
    if(!planned.ok)throw Error(planned.reason);
    const proof={
      kind:"cogentia.john-mandate-amendment-proof/v1",
      signature_scheme:"sshsig",issuer_fingerprint:PINNED_FP,
      proposal_hash:proposalHash(planned.proposal),signature,
    };
    const amended=amendVerifiedJohnRoot({
      store,input:{...planned.input,approval:proof},
      trustedSshPublicKey:key,expectedSshFingerprint:PINNED_FP,
    });
    if(!amended.ok)throw Error(amended.error);
    evaluateExisting(store,key);
    const latest=resolveMandate(store,RESULT_MANDATE_REF);
    if(latest.version!==planned.proposal.new_version)throw Error("unexpected_version");
    process.stdout.write(JSON.stringify({
      ok:true,mandate_ref:RESULT_MANDATE_REF,
      version:latest.version,proposal_hash:planned.proposal_hash,
      amendment_event_id:amended.receipt?.event_id,
      mcp_runtime_activated:false,
    },null,2)+"\n");
  } finally {store.close();}
}
if (process.argv[1] && resolvePath(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {runCli();} catch(err) {
    console.error(JSON.stringify({ok:false,error:err.message}));
    process.exitCode=1;
  }
}
