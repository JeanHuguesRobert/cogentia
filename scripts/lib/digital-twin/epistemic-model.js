/**
 * Epistemic Model for the Corsica Cogentia Digital Twin (cogentia#191).
 *
 * Enforces strict separation between:
 * RAW SOURCE ARTIFACT -> OBSERVATION -> CLAIM -> CORROBORATION / CONTRADICTION -> FACT -> DERIVATION
 */

import crypto from "node:crypto";

export const CLAIM_STATUSES = Object.freeze({
  UNCORROBORATED: "uncorroborated",
  CORROBORATED: "corroborated",
  CONTRADICTED: "contradicted",
  DISPUTED: "disputed",
  SUPERSEDED: "superseded",
});

export const CONFIDENCE_LEVELS = Object.freeze({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
});

export class SourceObservation {
  constructor({
    id = crypto.randomUUID(),
    sourceType = "other", // newspaper_photo | browser_article | public_api | human_report | document
    sourceName = "unknown",
    sourceLocator = null,
    contributorSubject = null,
    observedAt = new Date().toISOString(),
    acquiredAt = new Date().toISOString(),
    extractionMethod = "manual",
    rawRetention = "ephemeral",
    rawDeletedAt = null,
    rawHash = null,
    rightsAccessState = "unknown",
    privacyClass = "ordinary",
    evidenceOwner = "platform",
    rawRetainedByTwin = false,
    purgeReceipt = null,
    metadata = {},
  } = {}) {
    this.id = id;
    this.sourceType = sourceType;
    this.sourceName = sourceName;
    this.sourceLocator = sourceLocator;
    this.contributorSubject = contributorSubject;
    this.observedAt = observedAt;
    this.acquiredAt = acquiredAt;
    this.extractionMethod = extractionMethod;
    this.rawRetention = rawRetention;
    this.rawDeletedAt = rawDeletedAt || purgeReceipt?.purgedAt || null;
    this.rawHash = rawHash || purgeReceipt?.rawHash || null;
    this.rightsAccessState = rightsAccessState;
    this.privacyClass = privacyClass;
    this.evidenceOwner = evidenceOwner;
    this.rawRetainedByTwin = rawRetainedByTwin;
    this.purgeReceipt = purgeReceipt;
    this.metadata = Object.freeze({ ...metadata });
  }

  toJSON() {
    return {
      id: this.id,
      sourceType: this.sourceType,
      sourceName: this.sourceName,
      sourceLocator: this.sourceLocator,
      contributorSubject: this.contributorSubject,
      observedAt: this.observedAt,
      acquiredAt: this.acquiredAt,
      extractionMethod: this.extractionMethod,
      rawRetention: this.rawRetention,
      rawDeletedAt: this.rawDeletedAt,
      rawHash: this.rawHash,
      rightsAccessState: this.rightsAccessState,
      privacyClass: this.privacyClass,
      evidenceOwner: this.evidenceOwner,
      rawRetainedByTwin: this.rawRetainedByTwin,
      purgeReceipt: this.purgeReceipt,
      metadata: this.metadata,
    };
  }
}

export class Claim {
  constructor({
    id = crypto.randomUUID(),
    subject,
    predicate,
    object,
    temporalScope = null,
    spatialScope = "Corse",
    assertedBy = "source",
    sourceRefs = [],
    observedAt = new Date().toISOString(),
    confidence = CONFIDENCE_LEVELS.MEDIUM,
    status = CLAIM_STATUSES.UNCORROBORATED,
    derivation = null,
    corroborations = [],
    contradictions = [],
  } = {}) {
    if (!subject || !predicate || object === undefined) {
      throw new Error("Claim requires subject, predicate, and object.");
    }
    this.id = id;
    this.subject = String(subject).trim();
    this.predicate = String(predicate).trim();
    this.object = object;
    this.temporalScope = temporalScope;
    this.spatialScope = spatialScope;
    this.assertedBy = assertedBy;
    this.sourceRefs = Array.from(new Set(sourceRefs));
    this.observedAt = observedAt;
    this.confidence = confidence;
    this.status = status;
    this.derivation = derivation;
    this.corroborations = Array.from(new Set(corroborations));
    this.contradictions = Array.from(new Set(contradictions));
  }

  addSourceRef(ref) {
    if (ref && !this.sourceRefs.includes(ref)) {
      this.sourceRefs.push(ref);
    }
  }

  markCorroborated(corroboratingClaimId) {
    if (corroboratingClaimId && !this.corroborations.includes(corroboratingClaimId)) {
      this.corroborations.push(corroboratingClaimId);
    }
    if (this.status !== CLAIM_STATUSES.DISPUTED && this.status !== CLAIM_STATUSES.CONTRADICTED) {
      this.status = CLAIM_STATUSES.CORROBORATED;
    }
  }

  markContradicted(contradictingClaimId) {
    if (contradictingClaimId && !this.contradictions.includes(contradictingClaimId)) {
      this.contradictions.push(contradictingClaimId);
    }
    this.status = CLAIM_STATUSES.CONTRADICTED;
  }

  toJSON() {
    return {
      id: this.id,
      subject: this.subject,
      predicate: this.predicate,
      object: this.object,
      temporalScope: this.temporalScope,
      spatialScope: this.spatialScope,
      assertedBy: this.assertedBy,
      sourceRefs: [...this.sourceRefs],
      observedAt: this.observedAt,
      confidence: this.confidence,
      status: this.status,
      derivation: this.derivation,
      corroborations: [...this.corroborations],
      contradictions: [...this.contradictions],
    };
  }
}

export class CorroborationLink {
  constructor({
    id = crypto.randomUUID(),
    claimAId,
    claimBId,
    relationship = "corroborates", // corroborates | contradicts | qualifies
    confidence = CONFIDENCE_LEVELS.MEDIUM,
    linkedAt = new Date().toISOString(),
    notes = null,
  } = {}) {
    if (!claimAId || !claimBId) {
      throw new Error("CorroborationLink requires claimAId and claimBId.");
    }
    this.id = id;
    this.claimAId = claimAId;
    this.claimBId = claimBId;
    this.relationship = relationship;
    this.confidence = confidence;
    this.linkedAt = linkedAt;
    this.notes = notes;
  }

  toJSON() {
    return {
      id: this.id,
      claimAId: this.claimAId,
      claimBId: this.claimBId,
      relationship: this.relationship,
      confidence: this.confidence,
      linkedAt: this.linkedAt,
      notes: this.notes,
    };
  }
}
