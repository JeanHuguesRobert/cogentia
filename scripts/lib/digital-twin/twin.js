/**
 * Corsica Cogentia Digital Twin — Epistemic Ingestion Engine (cogentia#191).
 *
 * Implements the reusable epistemic source contract:
 * - Epistemic separation between raw source, observation, claim, corroboration, and fact.
 * - Ephemeral raw-source lifecycle: acquires, finger-prints, extracts, and purges.
 * - Contributor-held-original semantics.
 * - Source policy gate with conservative handling of unknowns.
 * - Multi-source claim corroboration/contradiction preservation.
 * - Reusable across consumer hosts (initially consumed by Agent JHN).
 */

import crypto from "node:crypto";
import { RawArtifact } from "./raw-artifact.js";
import {
  createSourcePolicy,
  evaluateSourcePolicy,
  RETENTION_CLASSES,
  ACCESS_STATES,
  RETENTION_POLICIES,
  PERSONAL_DATA_CLASSES,
} from "./source-policy.js";
import {
  SourceObservation,
  Claim,
  CorroborationLink,
  CLAIM_STATUSES,
  CONFIDENCE_LEVELS,
} from "./epistemic-model.js";

export class CorsicaDigitalTwin {
  constructor({ twinId = "corsica-cogentia-twin-v0", hostAgent = "agent-jhn" } = {}) {
    this.twinId = twinId;
    this.hostAgent = hostAgent;

    // Epistemic storage collections
    this.observations = new Map();
    this.claims = new Map();
    this.corroborations = new Map();
    this.artifacts = new Map();
    this.sourcePolicies = new Map();
  }

  /**
   * Registers a declared source policy for a domain or locator prefix.
   */
  registerSourcePolicy(locatorPattern, policy) {
    this.sourcePolicies.set(locatorPattern, createSourcePolicy(policy));
  }

  /**
   * Resolves the applicable policy for a given source locator.
   */
  resolveSourcePolicy(locator, overrides = {}) {
    for (const [pattern, policy] of this.sourcePolicies.entries()) {
      if (locator && (locator.includes(pattern) || new RegExp(pattern).test(locator))) {
        return createSourcePolicy({ ...policy, ...overrides });
      }
    }
    // Default territorial news policy for corsematin.com
    if (locator && /corsematin\.com/i.test(locator)) {
      return createSourcePolicy({
        access: ACCESS_STATES.RESTRICTED,
        retention: RETENTION_POLICIES.DERIVED_ONLY,
        retentionClass: RETENTION_CLASSES.EPHEMERAL,
        personalData: PERSONAL_DATA_CLASSES.ORDINARY,
        ...overrides,
      });
    }
    return createSourcePolicy(overrides);
  }

  /**
   * Acquires a raw artifact into quarantine.
   */
  acquireRawArtifact({
    content,
    fileName,
    mimeType,
    retentionClass = RETENTION_CLASSES.EPHEMERAL,
    evidenceOwner = "contributor",
    sourceLocator = null,
  }) {
    const artifact = new RawArtifact({
      content,
      fileName,
      mimeType,
      retentionClass,
      evidenceOwner,
      sourceLocator,
    });
    this.artifacts.set(artifact.id, artifact);
    return artifact;
  }

  /**
   * Vertical Slice 1: Ingests a news article from the browser adapter (e.g. Corse-Matin #190).
   */
  ingestBrowserArticle(articleData, options = {}) {
    if (!articleData || typeof articleData !== "object") {
      throw new Error("Invalid article data provided for ingestion.");
    }

    const canonicalUrl = articleData.canonicalUrl || "https://unknown-source.local";
    const rawPolicy = this.resolveSourcePolicy(canonicalUrl, {
      access: articleData.access || ACCESS_STATES.UNKNOWN,
      ...options.policy,
    });

    const evaluation = evaluateSourcePolicy(rawPolicy);
    if (!evaluation.allowed) {
      return {
        ok: false,
        reason: evaluation.reason,
        warnings: evaluation.warnings,
        observation: null,
        claims: [],
        purgeReceipt: null,
      };
    }

    // Wrap raw text into an ephemeral artifact for audit and hash computation
    const rawContent = articleData.text || "";
    const artifact = this.acquireRawArtifact({
      content: rawContent,
      fileName: `article-${Date.now()}.txt`,
      mimeType: "text/plain",
      retentionClass: evaluation.retentionClass,
      evidenceOwner: evaluation.evidenceOwner,
      sourceLocator: canonicalUrl,
    });
    artifact.markExtracted();

    // Purge raw artifact if policy requires (default for ephemeral / derived_only)
    let purgeReceipt = null;
    if (evaluation.mustPurgeRaw) {
      purgeReceipt = artifact.purge({
        reason: "policy_enforced_ephemeral_raw_purge",
        actor: `twin:${this.twinId}`,
      });
    }

    // Create durable SourceObservation
    const observation = new SourceObservation({
      sourceType: "browser_article",
      sourceName: articleData.provider || "Corse-Matin",
      sourceLocator: canonicalUrl,
      observedAt: new Date().toISOString(),
      acquiredAt: artifact.acquiredAt,
      extractionMethod: articleData.evidence?.strategy || "browser_adapter",
      rawRetention: evaluation.retentionClass,
      rawDeletedAt: purgeReceipt?.purgedAt || null,
      rawHash: artifact.rawHash,
      rightsAccessState: articleData.access || ACCESS_STATES.RESTRICTED,
      privacyClass: evaluation.policy.personalData,
      evidenceOwner: evaluation.evidenceOwner,
      rawRetainedByTwin: !evaluation.mustPurgeRaw,
      purgeReceipt,
      metadata: {
        headline: articleData.headline || null,
        author: articleData.author || null,
        publishedAt: articleData.publishedAt || null,
        modifiedAt: articleData.modifiedAt || null,
        section: articleData.section || null,
        evidence: articleData.evidence || {},
      },
    });
    this.observations.set(observation.id, observation);

    // Derive territorial claims from article metadata and lead text
    const claims = [];
    if (options.claims && Array.isArray(options.claims)) {
      for (const claimInput of options.claims) {
        const claim = this.assertClaim({
          ...claimInput,
          sourceRefs: [observation.id],
          observedAt: observation.observedAt,
        });
        claims.push(claim);
      }
    } else if (articleData.headline) {
      // Automatic baseline claim from headline
      const headlineClaim = this.assertClaim({
        subject: articleData.author || articleData.provider || "Corse-Matin",
        predicate: "reported",
        object: articleData.headline,
        temporalScope: articleData.publishedAt || null,
        spatialScope: "Corse",
        assertedBy: "source",
        sourceRefs: [observation.id],
        confidence: CONFIDENCE_LEVELS.MEDIUM,
      });
      claims.push(headlineClaim);
    }

    return {
      ok: true,
      observation,
      claims,
      purgeReceipt,
      evaluation,
    };
  }

  /**
   * Vertical Slice 2: Contributed photo or document (Olé Olé pattern / contributor-held original).
   */
  ingestContributedPhoto({
    content,
    fileName = "photo.jpg",
    contributorSubject,
    declaredContext = {},
    claims = [],
    policy: policyOverrides = {},
  }) {
    const rawPolicy = createSourcePolicy({
      access: ACCESS_STATES.CONTRIBUTED,
      retention: RETENTION_POLICIES.DERIVED_ONLY,
      retentionClass: RETENTION_CLASSES.EXTERNAL_OWNER,
      evidenceOwner: "contributor",
      personalData: PERSONAL_DATA_CLASSES.ORDINARY,
      ...policyOverrides,
    });

    const evaluation = evaluateSourcePolicy(rawPolicy);
    if (!evaluation.allowed) {
      return {
        ok: false,
        reason: evaluation.reason,
        warnings: evaluation.warnings,
        observation: null,
        claims: [],
        purgeReceipt: null,
      };
    }

    const artifact = this.acquireRawArtifact({
      content,
      fileName,
      mimeType: "image/jpeg",
      retentionClass: evaluation.retentionClass,
      evidenceOwner: evaluation.evidenceOwner,
      sourceLocator: declaredContext.locator || `contribution://${contributorSubject}/${fileName}`,
    });
    artifact.markExtracted();

    // Contributor retains the original; Twin purges raw asset after cryptographic fingerprinting
    const purgeReceipt = artifact.purge({
      reason: "contributor_held_original_ephemeral_purge",
      actor: `twin:${this.twinId}`,
    });

    const observation = new SourceObservation({
      sourceType: "newspaper_photo",
      sourceName: declaredContext.sourceName || "User Photo Contribution",
      sourceLocator: artifact.sourceLocator,
      contributorSubject,
      observedAt: declaredContext.observedAt || new Date().toISOString(),
      acquiredAt: artifact.acquiredAt,
      extractionMethod: declaredContext.extractionMethod || "visual_inspection",
      rawRetention: evaluation.retentionClass,
      rawDeletedAt: purgeReceipt.purgedAt,
      rawHash: artifact.rawHash,
      rightsAccessState: rawPolicy.access,
      privacyClass: rawPolicy.personalData,
      evidenceOwner: "contributor",
      rawRetainedByTwin: false,
      purgeReceipt,
      metadata: declaredContext,
    });
    this.observations.set(observation.id, observation);

    const derivedClaims = [];
    for (const claimInput of claims) {
      const claim = this.assertClaim({
        ...claimInput,
        sourceRefs: [observation.id],
        observedAt: observation.observedAt,
      });
      derivedClaims.push(claim);
    }

    return {
      ok: true,
      observation,
      claims: derivedClaims,
      purgeReceipt,
      evaluation,
    };
  }

  /**
   * Asserts a structured epistemic claim.
   */
  assertClaim(claimInput) {
    const claim = new Claim(claimInput);
    this.claims.set(claim.id, claim);
    return claim;
  }

  /**
   * Links two claims with a corroboration or contradiction relationship.
   * Preserves both sources distinctly without merging their identities.
   */
  linkCorroboration(claimAId, claimBId, relationship = "corroborates", options = {}) {
    const claimA = this.claims.get(claimAId);
    const claimB = this.claims.get(claimBId);

    if (!claimA || !claimB) {
      throw new Error(`Claims not found: ${claimAId} or ${claimBId}`);
    }

    if (relationship === "corroborates") {
      claimA.markCorroborated(claimBId);
      claimB.markCorroborated(claimAId);
    } else if (relationship === "contradicts") {
      claimA.markContradicted(claimBId);
      claimB.markContradicted(claimAId);
    }

    const link = new CorroborationLink({
      claimAId,
      claimBId,
      relationship,
      confidence: options.confidence || CONFIDENCE_LEVELS.MEDIUM,
      notes: options.notes || null,
    });
    this.corroborations.set(link.id, link);

    return link;
  }

  /**
   * Retrieves durable provenance for a claim back to its observations and purge receipts,
   * without needing the raw artifact copies.
   */
  getProvenance(claimId) {
    const claim = this.claims.get(claimId);
    if (!claim) return null;

    const observations = claim.sourceRefs
      .map((ref) => this.observations.get(ref))
      .filter(Boolean);

    const corroboratingLinks = [...this.corroborations.values()].filter(
      (link) => link.claimAId === claimId || link.claimBId === claimId
    );

    return {
      claim: claim.toJSON(),
      observations: observations.map((obs) => obs.toJSON()),
      corroborations: corroboratingLinks.map((link) => link.toJSON()),
      rawEvidenceRetained: observations.some((obs) => obs.rawRetainedByTwin),
    };
  }

  /**
   * Queries claims matching filter criteria.
   */
  queryClaims({ subject, predicate, status, limit = 50 } = {}) {
    const results = [];
    for (const claim of this.claims.values()) {
      if (subject && claim.subject.toLowerCase() !== String(subject).toLowerCase()) continue;
      if (predicate && claim.predicate.toLowerCase() !== String(predicate).toLowerCase()) continue;
      if (status && claim.status !== status) continue;
      results.push(claim);
      if (results.length >= limit) break;
    }
    return results;
  }
}
