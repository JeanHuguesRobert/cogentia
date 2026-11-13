/**
 * Portable proof for the canonical Inseme append-only MandateAmendment.
 * Verification is independent of COP event metadata and of MCP credentials.
 */
import { verify, createPublicKey, createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalProposalBytes, proposalHash, publicKeyFingerprint, RESERVED_ACTIONS } from "./john-root-mandate.js";
import { sshFingerprint } from "./john-sshsig-approval.js";

export const AMENDMENT_KIND = "cop.mandate-amendment.proposal/v1";
export const AMENDMENT_SSH_NAMESPACE = "cogentia-john-mandate-amendment-v1";
const refuse = code => ({ verified:false, reason:code });
const nonempty = value => typeof value === "string" && value.length > 0;

function verifyRawSshSignature({ bytes, signature, trustedPublicKey, expectedFingerprint }) {
  if (!trustedPublicKey || !expectedFingerprint || !nonempty(signature) ||
      !signature.startsWith("-----BEGIN SSH SIGNATURE-----") ||
      signature.length > 8192) return false;
  try { if (sshFingerprint(trustedPublicKey) !== expectedFingerprint) return false; }
  catch { return false; }
  const dir = mkdtempSync(join(tmpdir(), "cop-mandate-amend-"));
  try {
    const sig = join(dir, "approval.sig"), allowed = join(dir, "allowed_signers");
    writeFileSync(sig, signature, { mode:0o600 });
    writeFileSync(allowed, "principal:jhn " + trustedPublicKey.trim() + "\n", { mode:0o600 });
    const r = spawnSync("ssh-keygen", [
      "-Y", "verify", "-f", allowed, "-I", "principal:jhn",
      "-n", AMENDMENT_SSH_NAMESPACE, "-s", sig,
    ], { input:bytes, timeout:5000, stdio:["pipe","ignore","ignore"] });
    return r.status === 0;
  } finally { rmSync(dir, { recursive:true, force:true }); }
}

/**
 * The proof is public, versioned and directly verifiable on a cold read.
 * A valid signature alone is not enough: chain/issuer/current mandate are
 * separately checked by createOfflineJohnIssuerVerifier.
 */
export function verifyJohnAmendmentProof({
  proposal, proof, trustedPublicKeyPem, trustedSshPublicKey,
  expectedSshFingerprint, now = new Date(),
} = {}) {
  if (!proposal || proposal.kind !== AMENDMENT_KIND ||
      proposal.mandate_ref !== "mandate:jhn:john-root" ||
      proposal.principal_ref !== "principal:jhn" ||
      proposal.logical_agent_ref !== "agent:jhn" ||
      !/^v[1-9]\d*$/.test(proposal.previous_version || "") ||
      proposal.new_version !== "v" + (Number(proposal.previous_version.slice(1)) + 1) ||
      !nonempty(proposal.previous_event_id) || !nonempty(proposal.reason))
    return refuse("invalid_amendment_identity");
  if (!proposal.scope || typeof proposal.scope !== "object" ||
      !Array.isArray(proposal.scope.allowed_actions) ||
      !Array.isArray(proposal.scope.forbidden_actions) ||
      proposal.scope.allowed_actions.some(x=>!nonempty(x)||x.includes("*")) ||
      RESERVED_ACTIONS.some(x=>!proposal.scope.forbidden_actions.includes(x)) ||
      proposal.scope.allowed_actions.some(x=>proposal.scope.forbidden_actions.includes(x)))
    return refuse("invalid_amendment_scope");
  const start = Date.parse(proposal.valid_from), end = Date.parse(proposal.valid_until);
  const at = +new Date(now);
  if (!Number.isFinite(start) || !Number.isFinite(end) ||
      start >= end || at < start || at >= end) return refuse("amendment_outside_validity");
  if (!proof || proof.kind !== "cogentia.john-mandate-amendment-proof/v1" ||
      proof.proposal_hash !== proposalHash(proposal))
    return refuse("invalid_amendment_proof");
  const bytes = canonicalProposalBytes(proposal);
  let authenticated = false;
  if (proof.signature_scheme === "ed25519" && trustedPublicKeyPem) {
    try {
      const fingerprint = publicKeyFingerprint(trustedPublicKeyPem);
      const raw = Buffer.from(proof.signature_base64 || "", "base64");
      authenticated = proof.issuer_fingerprint === fingerprint &&
        raw.length === 64 &&
        verify(null, bytes, createPublicKey(trustedPublicKeyPem), raw);
    } catch { authenticated = false; }
  } else if (proof.signature_scheme === "sshsig" && trustedSshPublicKey) {
    authenticated = proof.issuer_fingerprint === expectedSshFingerprint &&
      verifyRawSshSignature({
        bytes, signature:proof.signature, trustedPublicKey:trustedSshPublicKey,
        expectedFingerprint:expectedSshFingerprint,
      });
  }
  return authenticated
    ? { verified:true, principal_ref:"principal:jhn",
        evidence_ref:"sha256:" + createHash("sha256").update(bytes).digest("hex"),
        scheme:proof.signature_scheme, proof }
    : refuse("amendment_signature_unverified");
}
