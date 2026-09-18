/**
 * Ephemeral Raw Artifact Lifecycle for the Corsica Cogentia Digital Twin (cogentia#191).
 *
 * Implements private quarantine, SHA-256 fingerprinting, explicit auditable
 * purge, and contributor-held-original semantics.
 */

import crypto from "node:crypto";
import { RETENTION_CLASSES } from "./source-policy.js";

export class RawArtifact {
  constructor({
    id = crypto.randomUUID(),
    content = null,
    fileName = "artifact.raw",
    mimeType = "application/octet-stream",
    retentionClass = RETENTION_CLASSES.EPHEMERAL,
    evidenceOwner = "contributor",
    sourceLocator = null,
    acquiredAt = new Date().toISOString(),
  } = {}) {
    this.id = id;
    this.fileName = fileName;
    this.mimeType = mimeType;
    this.retentionClass = retentionClass;
    this.evidenceOwner = evidenceOwner;
    this.sourceLocator = sourceLocator;
    this.acquiredAt = acquiredAt;
    this.status = "quarantined";
    this.purgedAt = null;
    this.purgeReceipt = null;

    // Buffer or string representation
    if (content !== null && content !== undefined) {
      this._content = Buffer.isBuffer(content) ? content : Buffer.from(String(content), "utf8");
      this.rawSize = this._content.length;
      this.rawHash = crypto.createHash("sha256").update(this._content).digest("hex");
    } else {
      this._content = null;
      this.rawSize = 0;
      this.rawHash = null;
    }
  }

  get content() {
    if (this.status === "purged" || this._content === null) {
      return null;
    }
    return this._content;
  }

  get isPurged() {
    return this.status === "purged";
  }

  markExtracted() {
    if (this.status === "quarantined") {
      this.status = "extracted";
    }
  }

  /**
   * Explicit auditable purge.
   * Erases the raw payload permanently while preserving cryptographic fingerprint
   * and generating a verifiable purge receipt.
   */
  purge({ reason = "ephemeral_lifecycle_completion", actor = "system" } = {}) {
    if (this.status === "purged") {
      return this.purgeReceipt;
    }

    const purgedAt = new Date().toISOString();
    const receipt = Object.freeze({
      receiptId: crypto.randomUUID(),
      artifactId: this.id,
      fileName: this.fileName,
      mimeType: this.mimeType,
      rawHash: this.rawHash,
      rawSize: this.rawSize,
      retentionClass: this.retentionClass,
      evidenceOwner: this.evidenceOwner,
      sourceLocator: this.sourceLocator,
      acquiredAt: this.acquiredAt,
      purgedAt,
      reason,
      actor,
      rawRetainedByTwin: false,
    });

    // Zero out memory and drop reference to raw payload
    if (this._content) {
      this._content.fill(0);
      this._content = null;
    }

    this.status = "purged";
    this.purgedAt = purgedAt;
    this.purgeReceipt = receipt;

    return receipt;
  }

  getDescriptor() {
    return {
      id: this.id,
      fileName: this.fileName,
      mimeType: this.mimeType,
      rawHash: this.rawHash,
      rawSize: this.rawSize,
      retentionClass: this.retentionClass,
      evidenceOwner: this.evidenceOwner,
      status: this.status,
      acquiredAt: this.acquiredAt,
      purgedAt: this.purgedAt,
      hasReceipt: Boolean(this.purgeReceipt),
    };
  }
}
