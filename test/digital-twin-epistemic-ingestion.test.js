import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CorsicaDigitalTwin,
  createSourcePolicy,
  evaluateSourcePolicy,
  RawArtifact,
  SourceObservation,
  Claim,
  RETENTION_CLASSES,
  ACCESS_STATES,
  RETENTION_POLICIES,
  LEGAL_RISK_LEVELS,
  CLAIM_STATUSES,
  CONFIDENCE_LEVELS,
} from "../scripts/lib/digital-twin/index.js";

// ============================================================================
// 1. Source Policy Gate & Conservative Unknowns
// ============================================================================
test("cogentia#191: source policy gate blocks ingestion on legal_risk: hold", () => {
  const policy = createSourcePolicy({ legal_risk: "hold", access: "public" });
  const evaluation = evaluateSourcePolicy(policy);

  assert.equal(evaluation.allowed, false);
  assert.equal(evaluation.canDeriveKnowledge, false);
  assert.equal(evaluation.mustPurgeRaw, true);
  assert.ok(evaluation.warnings.some((w) => w.includes("hold")));
});

test("cogentia#191: source policy gate conservatively handles unknown access", () => {
  const policy = createSourcePolicy({ access: "unknown", retention: "unknown" });
  const evaluation = evaluateSourcePolicy(policy);

  // Allowed to derive knowledge, but MUST purge raw and issue warnings
  assert.equal(evaluation.allowed, true);
  assert.equal(evaluation.canRetainRaw, false);
  assert.equal(evaluation.mustPurgeRaw, true);
  assert.ok(evaluation.warnings.some((w) => w.includes("access state is unknown")));
});

test("cogentia#191: source policy allows raw retention only when explicitly persistent_by_right and public", () => {
  const restrictedPolicy = createSourcePolicy({
    access: "restricted",
    retention: "derived_only",
    retentionClass: "ephemeral",
  });
  const evalRestricted = evaluateSourcePolicy(restrictedPolicy);
  assert.equal(evalRestricted.canRetainRaw, false);
  assert.equal(evalRestricted.mustPurgeRaw, true);

  const publicLicensedPolicy = createSourcePolicy({
    access: "public",
    retention: "permitted_fulltext",
    retentionClass: "persistent_by_right",
    personalData: "none",
  });
  const evalPublic = evaluateSourcePolicy(publicLicensedPolicy);
  assert.equal(evalPublic.canRetainRaw, true);
  assert.equal(evalPublic.mustPurgeRaw, false);
});

// ============================================================================
// 2. Raw Artifact Lifecycle & Explicit Purge
// ============================================================================
test("cogentia#191: RawArtifact calculates SHA-256 fingerprint and purges raw payload", () => {
  const rawData = "Sample raw document content for testing.";
  const artifact = new RawArtifact({
    content: rawData,
    fileName: "doc.txt",
    mimeType: "text/plain",
    retentionClass: RETENTION_CLASSES.EPHEMERAL,
    evidenceOwner: "contributor",
  });

  assert.equal(artifact.status, "quarantined");
  assert.equal(artifact.isPurged, false);
  assert.ok(artifact.rawHash.length === 64);
  assert.equal(artifact.rawSize, Buffer.byteLength(rawData));
  assert.ok(artifact.content !== null);

  artifact.markExtracted();
  assert.equal(artifact.status, "extracted");

  const receipt = artifact.purge({ reason: "test_purge", actor: "test_runner" });

  assert.equal(artifact.status, "purged");
  assert.equal(artifact.isPurged, true);
  assert.equal(artifact.content, null); // Payload permanently cleared
  assert.ok(artifact.purgedAt !== null);

  // Verifiable receipt retained
  assert.equal(receipt.artifactId, artifact.id);
  assert.equal(receipt.rawHash, artifact.rawHash);
  assert.equal(receipt.rawRetainedByTwin, false);
  assert.equal(receipt.reason, "test_purge");
});

// ============================================================================
// 3. Vertical Slice 1: Corse-Matin Browser Article Ingestion (#190 -> #191)
// ============================================================================
test("cogentia#191: Ingests Corse-Matin article without retaining permanent raw copy", () => {
  const twin = new CorsicaDigitalTwin();

  // Corse-Matin François Filoni article output from #190
  const corseMatinArticleOutput = {
    provider: "corse-matin",
    kind: "news-article",
    canonicalUrl: "https://www.corsematin.com/article/politique/4523963496035760/je-ne-pouvais-plus-cautionner",
    headline: "François Filoni explique pourquoi il a démissionné du bureau national du RN",
    description: "L'élu d'Ajaccio quitte les instances du Rassemblement national.",
    author: "Jean-Pierre Girolami",
    publishedAt: "2026-09-17T06:00:00+02:00",
    modifiedAt: "2026-09-17T06:00:00+02:00",
    section: "Politique",
    text: "L'élu d'Ajaccio a annoncé son départ du bureau national du parti...",
    access: "restricted",
    evidence: {
      jsonLd: true,
      openGraph: true,
      semanticDom: true,
      strategy: "json-ld+dom",
    },
  };

  const result = twin.ingestBrowserArticle(corseMatinArticleOutput, {
    claims: [
      {
        subject: "François Filoni",
        predicate: "departed_office",
        object: "bureau national du RN",
        temporalScope: "2026-09",
        spatialScope: "Corse",
        confidence: CONFIDENCE_LEVELS.HIGH,
      },
    ],
  });

  assert.equal(result.ok, true);
  assert.ok(result.observation instanceof SourceObservation);
  assert.equal(result.observation.sourceName, "corse-matin");
  assert.equal(result.observation.rightsAccessState, "restricted");
  assert.equal(result.observation.rawRetention, "ephemeral");
  assert.equal(result.observation.rawRetainedByTwin, false);
  assert.ok(result.purgeReceipt !== null);
  assert.ok(result.observation.rawHash !== null);

  assert.equal(result.claims.length, 1);
  const claim = result.claims[0];
  assert.equal(claim.subject, "François Filoni");
  assert.equal(claim.predicate, "departed_office");
  assert.equal(claim.object, "bureau national du RN");
  assert.deepEqual(claim.sourceRefs, [result.observation.id]);
  assert.equal(claim.status, CLAIM_STATUSES.UNCORROBORATED);

  // Verify provenance retrieval without raw copy
  const provenance = twin.getProvenance(claim.id);
  assert.equal(provenance.rawEvidenceRetained, false);
  assert.equal(provenance.observations.length, 1);
  assert.equal(provenance.observations[0].sourceLocator, corseMatinArticleOutput.canonicalUrl);
  assert.equal(provenance.observations[0].rawHash, result.purgeReceipt.rawHash);
});

// ============================================================================
// 4. Vertical Slice 2: Contributed Photo / Contributor-Held Original (Olé Olé)
// ============================================================================
test("cogentia#191: Contributed photo maintains contributor-held original semantics and purges raw twin copy", () => {
  const twin = new CorsicaDigitalTwin();
  const fakePhotoBuffer = Buffer.from("JPEG_BINARY_DATA_OF_NEWSPAPER_PAGE");

  const result = twin.ingestContributedPhoto({
    content: fakePhotoBuffer,
    fileName: "corse_matin_page3.jpg",
    contributorSubject: "user:ghjaseppu-2a",
    declaredContext: {
      sourceName: "Corse-Matin (édition papier)",
      editionDate: "2026-09-17",
      pageNumber: 3,
      locator: "photo://user:ghjaseppu-2a/corse_matin_page3.jpg",
    },
    claims: [
      {
        subject: "François Filoni",
        predicate: "sent_letter_to",
        object: "Jordan Bardella et Marine Le Pen",
        temporalScope: "2026-09",
        spatialScope: "Ajaccio",
        confidence: CONFIDENCE_LEVELS.MEDIUM,
      },
    ],
  });

  assert.equal(result.ok, true);
  assert.equal(result.observation.evidenceOwner, "contributor");
  assert.equal(result.observation.rawRetention, "external_owner");
  assert.equal(result.observation.rawRetainedByTwin, false);
  assert.ok(result.purgeReceipt !== null);
  assert.equal(result.purgeReceipt.rawRetainedByTwin, false);

  const claim = result.claims[0];
  assert.equal(claim.subject, "François Filoni");
  assert.equal(claim.predicate, "sent_letter_to");
  assert.deepEqual(claim.sourceRefs, [result.observation.id]);
});

// ============================================================================
// 5. Vertical Slice 3: Multi-Source Corroboration
// ============================================================================
test("cogentia#191: Corroboration links independent claims without merging source identity", () => {
  const twin = new CorsicaDigitalTwin();

  // Source A: Corse-Matin article
  const resA = twin.ingestBrowserArticle(
    {
      provider: "corse-matin",
      canonicalUrl: "https://www.corsematin.com/article/1",
      headline: "François Filoni démissionne",
      access: "restricted",
    },
    {
      claims: [
        {
          subject: "François Filoni",
          predicate: "resigned_from",
          object: "Rassemblement National",
          assertedBy: "source:corse-matin",
        },
      ],
    }
  );

  // Source B: Direct press statement / video
  const resB = twin.ingestBrowserArticle(
    {
      provider: "rcf-corse",
      canonicalUrl: "https://rcf.fr/actualite/declaration-filoni",
      headline: "Entretien avec François Filoni sur son départ",
      access: "public",
    },
    {
      claims: [
        {
          subject: "François Filoni",
          predicate: "resigned_from",
          object: "Rassemblement National",
          assertedBy: "source:rcf",
        },
      ],
    }
  );

  const claimA = resA.claims[0];
  const claimB = resB.claims[0];

  assert.equal(claimA.status, CLAIM_STATUSES.UNCORROBORATED);
  assert.equal(claimB.status, CLAIM_STATUSES.UNCORROBORATED);

  // Link corroboration
  const link = twin.linkCorroboration(claimA.id, claimB.id, "corroborates", {
    notes: "Both sources independently report Filoni's resignation from RN.",
  });

  assert.equal(claimA.status, CLAIM_STATUSES.CORROBORATED);
  assert.equal(claimB.status, CLAIM_STATUSES.CORROBORATED);
  assert.ok(claimA.corroborations.includes(claimB.id));
  assert.ok(claimB.corroborations.includes(claimA.id));

  // Source identities remain distinct
  assert.notEqual(claimA.sourceRefs[0], claimB.sourceRefs[0]);
  assert.equal(claimA.assertedBy, "source:corse-matin");
  assert.equal(claimB.assertedBy, "source:rcf");
});

// ============================================================================
// 6. Vertical Slice 4: Contradiction & Conflicting Claims Preservation
// ============================================================================
test("cogentia#191: Contradictory claims are preserved as conflicting data, not ingestion errors", () => {
  const twin = new CorsicaDigitalTwin();

  const claim1 = twin.assertClaim({
    subject: "Projet Autonomie Corse",
    predicate: "supported_by",
    object: "Groupe A",
    confidence: CONFIDENCE_LEVELS.MEDIUM,
  });

  const claim2 = twin.assertClaim({
    subject: "Projet Autonomie Corse",
    predicate: "opposed_by",
    object: "Groupe A",
    confidence: CONFIDENCE_LEVELS.MEDIUM,
  });

  const link = twin.linkCorroboration(claim1.id, claim2.id, "contradicts", {
    notes: "Conflicting statements on group stance.",
  });

  assert.equal(claim1.status, CLAIM_STATUSES.CONTRADICTED);
  assert.equal(claim2.status, CLAIM_STATUSES.CONTRADICTED);
  assert.ok(claim1.contradictions.includes(claim2.id));
  assert.ok(claim2.contradictions.includes(claim1.id));
  assert.equal(link.relationship, "contradicts");
});

// ============================================================================
// 7. Host Decoupling (Agent JHN as consumer)
// ============================================================================
test("cogentia#191: Twin schema is host-independent while supporting Agent JHN consumer", () => {
  const twin = new CorsicaDigitalTwin({ twinId: "corsica-twin", hostAgent: "agent-jhn" });
  assert.equal(twin.hostAgent, "agent-jhn");

  // Ingest claim
  const claim = twin.assertClaim({
    subject: "Territoire Corse",
    predicate: "digital_twin_initialized",
    object: true,
  });

  // Querying works independently of host agent
  const results = twin.queryClaims({ subject: "Territoire Corse" });
  assert.equal(results.length, 1);
  assert.equal(results[0].predicate, "digital_twin_initialized");
});
