#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "../apps/personal/node_modules/react/index.js";
import { renderToStaticMarkup } from "../apps/personal/node_modules/react-dom/server.js";
import {
  ENROLMENT_PREFS_KEY,
  RELATIONSHIP_STATES,
  RETENTION_PURPOSES,
  clearContinuityStorage,
  inspectContinuityState,
  updateEnrolmentPreferences,
} from "./lib/progressive-enrolment.js";
import { ContinuityPanel } from "../apps/personal/src/components/ContinuityPanel.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// 1. Returning user with no retained context
const emptyState = inspectContinuityState(null, {});
assert.equal(emptyState.hasRetainedData, false);
assert.equal(emptyState.relationshipState, RELATIONSHIP_STATES.anonymous_ephemeral.id);
assert.equal(emptyState.turnsCount, 0);
assert.equal(emptyState.snapshotsCount, 0);

// 2. Returning user with retained snapshot and reviews
const mockTurnLog = {
  cursor: { turn: 1, step: 3 },
  turns: [
    {
      number: 1,
      provider: "Claude",
      snapshot: { relationship_summary: "Résumé", known: [] },
      reviews: {
        "item:1": { verdict: "accepted" },
        "item:2": { verdict: "rejected" },
      },
    },
  ],
};

const retainedState = inspectContinuityState(mockTurnLog, {});
assert.equal(retainedState.hasRetainedData, true);
assert.equal(retainedState.provider, "Claude");
assert.equal(retainedState.turnsCount, 1);
assert.equal(retainedState.snapshotsCount, 1);
assert.equal(retainedState.reviewedClaimsCount, 2);
assert.equal(retainedState.relationshipState, RELATIONSHIP_STATES.local_continuity.id);
const purposeIds = retainedState.activePurposes.map((p) => p.id);
assert.ok(purposeIds.includes(RETENTION_PURPOSES.session_mirror.id));
assert.ok(purposeIds.includes(RETENTION_PURPOSES.local_convenience.id));

// 3. Doctrinal Invariant: Contact != Account != Testing != Twin
// Stating a contact intention changes relationship state to contact_initiated,
// but NEVER silently converts into testing opt-in or Twin creation consent!
const contactState = inspectContinuityState(mockTurnLog, { statedIntention: "feedback" });
assert.equal(contactState.relationshipState, RELATIONSHIP_STATES.contact_initiated.id);
assert.equal(contactState.optInTesting, false);
assert.equal(contactState.twinInterest, false);
assert.ok(contactState.doctrineNote.includes("Contact ≠ Compte ≠ Participation aux tests ≠ Jumeau"));

// Separate testing opt-in
const testingState = inspectContinuityState(mockTurnLog, { optInTesting: true });
assert.equal(testingState.relationshipState, RELATIONSHIP_STATES.testing_opt_in.id);

// Separate Twin interest
const twinState = inspectContinuityState(mockTurnLog, { twinInterest: true });
assert.equal(twinState.relationshipState, RELATIONSHIP_STATES.twin_explorer.id);

// 4. Changing or revoking an earlier stated intention
let userPrefs = { statedIntention: "question", optInTesting: false };
userPrefs = updateEnrolmentPreferences(userPrefs, { statedIntention: null });
assert.equal(userPrefs.statedIntention, null);
assert.ok(userPrefs.updatedAt);
const revokedState = inspectContinuityState(mockTurnLog, userPrefs);
assert.equal(revokedState.lastIntention, null);
assert.equal(revokedState.relationshipState, RELATIONSHIP_STATES.local_continuity.id);

// Disabling local persistence
userPrefs = updateEnrolmentPreferences(userPrefs, { disableLocalPersistence: true });
const disabledState = inspectContinuityState(mockTurnLog, userPrefs);
assert.equal(disabledState.localPersistenceDisabled, true);
assert.equal(disabledState.activePurposes.some((p) => p.id === RETENTION_PURPOSES.local_convenience.id), false);

// 5. Purging local storage
const fakeStorage = {
  store: new Map([
    ["kys_turn_log_v1", "content"],
    ["kys_snapshot_draft_v1", "draft"],
    [ENROLMENT_PREFS_KEY, "prefs"],
  ]),
  removeItem(key) {
    this.store.delete(key);
  },
};
clearContinuityStorage(fakeStorage);
assert.equal(fakeStorage.store.has("kys_turn_log_v1"), false);
assert.equal(fakeStorage.store.has("kys_snapshot_draft_v1"), false);
assert.equal(fakeStorage.store.has(ENROLMENT_PREFS_KEY), false);

// 6. Browser purity check (no forbidden tokens)
const browserFiles = [
  "scripts/lib/progressive-enrolment.js",
  "apps/personal/src/components/ContinuityPanel.js",
];
for (const rel of browserFiles) {
  const content = fs.readFileSync(path.join(root, rel), "utf8");
  for (const forbidden of ["supabase", "localStorage", "writeFile", "fetch(", "node:fs", "node:crypto"]) {
    assert.equal(content.includes(forbidden), false, `${rel} mentions forbidden token ${forbidden}`);
  }
}

// 7. Component static markup render test
const htmlRetained = renderToStaticMarkup(React.createElement(ContinuityPanel, {
  turnLog: mockTurnLog,
  preferences: { statedIntention: "feedback" },
  onUpdatePreferences() {},
  onPurge() {},
  onExport() {},
}));

assert.ok(htmlRetained.includes("data-continuity-panel=\"true\""));
assert.ok(htmlRetained.includes("data-relationship-badge=\"contact_initiated\""));
assert.ok(htmlRetained.includes("data-remembered-context=\"true\""));
assert.ok(htmlRetained.includes("data-active-purposes=\"true\""));
assert.ok(htmlRetained.includes("data-doctrine-note=\"true\""));
assert.ok(htmlRetained.includes("data-action=\"purge-local-data\""));
assert.ok(htmlRetained.includes("data-action=\"export-data\""));
assert.ok(htmlRetained.includes("data-action=\"revoke-intention\""));

// Check no-account gate
assert.equal(htmlRetained.includes("type=\"email\""), false);
assert.equal(htmlRetained.includes("/auth"), false);
assert.equal(htmlRetained.toLowerCase().includes("créer un compte"), false);
assert.equal(htmlRetained.toLowerCase().includes("s'inscrire"), false);

// Empty state render
const htmlEmpty = renderToStaticMarkup(React.createElement(ContinuityPanel, {
  turnLog: null,
  preferences: {},
}));
assert.ok(htmlEmpty.includes("data-continuity-empty=\"true\""));

console.log("progressive-enrolment: ok");
