/**
 * Two-locality deterministic Reality Test: source packet and FractaLog remain
 * on A; COP federation shares only a reference; B rebuilds its disposable
 * view by fetching and verifying A's source evidence after reconnection.
 *
 * This is not a production transport or authorization implementation.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { once } from "node:events";
import { createSqliteCopEventStore } from "../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js";
import { validateCopEventEnvelope } from "../../../inseme/packages/cop-core/src/cop-event-envelope.js";
import { validateFractalogActRecord } from "../../../inseme/packages/cop-core/src/fractalog.js";
import { COPBus } from "../../../inseme/packages/cop-kernel/src/bus.js";
import { createPrimaryPlacementPacketClaimResolver } from "../../../inseme/packages/cop-kernel/src/packetClaimLocality.js";
import { createCopMcpTasksPilot, packetTopicForMcpTask } from "./mcp-tasks-cop-pilot.mjs";

function verifySnapshot(snapshot) {
  assert.equal(snapshot?.commitment?.seq, snapshot?.events?.length);
  let previousHead = "";
  let previousEvent = null;
  for (const event of snapshot.events) {
    assert.equal(validateCopEventEnvelope(event, { requirePositiveSeq: true }).ok, true);
    assert.equal(validateFractalogActRecord(event.payload.fractalog).ok, true);
    assert.equal(event.topic.id, snapshot.topic);
    assert.equal(event.payload.fractalog.trace.packet_ref, snapshot.packet_ref);
    if (previousEvent) {
      assert.deepEqual(event.parent_event_ids, [previousEvent.event_id]);
    }
    const envelope = JSON.stringify(event);
    previousHead = "sha256:" + createHash("sha256")
      .update(previousHead).update(envelope).digest("hex");
    previousEvent = event;
  }
  assert.equal(snapshot.commitment.head, previousHead);
  return {
    packet_ref: snapshot.packet_ref,
    status: snapshot.events.at(-1)?.payload.phase || null,
    source_head: previousHead,
    source_seq: snapshot.events.length,
  };
}

test("two localities: federate reference, continue without B, reconstruct B view from A", async () => {
  const root = mkdtempSync(join(tmpdir(), "mcp-locality-two-nodes-"));
  const a = createSqliteCopEventStore(join(root, "source-a.sqlite"));
  const b = createSqliteCopEventStore(join(root, "source-b.sqlite"));
  let server;
  try {
    const pilotA = createCopMcpTasksPilot({
      store: a, toolName: "cogentia_pattern_list",
      handler: async () => ({ content: [{ type: "text", text: "locally delivered" }] }),
      allowAnonymous: true, ownerInstanceRef: "instance:node-a",
      primaryStoreId: "sqlite:node-a",
    });
    const { taskId } = await pilotA.adapter.create({
      name: "cogentia_pattern_list", args: {}, auth: { auth: "none" },
    });
    const topic = packetTopicForMcpTask(taskId);
    const created = a.listTopic(topic)[0];
    assert.equal(created.payload.packet.placements[0].store_id, "sqlite:node-a");
    assert.equal(created.payload.packet.placements[0].is_primary, true);
    assert.deepEqual(created.payload.continuation.packetPlacementWitness,
      created.payload.packet.placements);

    const busA = new COPBus({ name: "node-a" });
    const busB = new COPBus({ name: "node-b" });
    const referencesAtB = [];
    busB.subscribe("cop.packet.reference", event => {
      referencesAtB.push(event.data);
    });
    busA.federate(busB);
    await busA.publish({
      type: "cop.packet.reference",
      data: {
        packet_ref: created.payload.packet.packet_id,
        primary_store_id: "sqlite:node-a",
        topic_ref: topic,
      },
    });
    assert.equal(referencesAtB.length, 1);
    assert.equal(b.listTopic(topic).length, 0,
      "B must not acquire A's authoritative source history by discovery");

    // The resolver must never turn a B-local coordinator into authority over A.
    const resolveAtB = createPrimaryPlacementPacketClaimResolver({
      resolveCoordinator: async ({ storeId }) =>
        storeId === "sqlite:node-b"
          ? { tryClaim() {}, complete() {} } : null,
    });
    const verdict = await resolveAtB({
      packetRef: created.payload.packet.packet_id,
      packet: created.payload.packet,
    });
    assert.equal(verdict.ok, false);
    assert.equal(verdict.code, "PACKET_CLAIM_LOCALITY_UNAVAILABLE");
    assert.equal(verdict.required_store_id, "sqlite:node-a");

    // Simulate B disappearing; source A needs no peer, hub or remote store.
    busA.federatedPeers.clear();
    busB.federatedPeers.clear();
    const finished = await pilotA.run(taskId, { auth: "none" });
    assert.equal(finished.status, "completed");
    assert.equal(pilotA.auditPacket(taskId).ok, true);
    assert.equal(b.listTopic(topic).length, 0);

    // A's read-only evidence endpoint is a test fixture, not a new service.
    server = createServer((request, response) => {
      if (request.method !== "GET" || request.url !== "/source-evidence") {
        response.writeHead(404); response.end(); return;
      }
      const commitment = a.topicCommitment(topic);
      const events = a.listTopic(topic);
      const body = { packet_ref: created.payload.packet.packet_id,
        topic, commitment, events };
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(body));
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = "http://127.0.0.1:" + server.address().port;
    const snapshot = await (await fetch(address + "/source-evidence")).json();
    let projectionAtB = verifySnapshot(snapshot);
    assert.equal(projectionAtB.status, "completed");
    assert.equal(projectionAtB.source_seq, 3);
    const originalHead = projectionAtB.source_head;
    // B can discard and rebuild its view without modifying A's source.
    projectionAtB = null;
    projectionAtB = verifySnapshot(await
      (await fetch(address + "/source-evidence")).json());
    assert.equal(projectionAtB.source_head, originalHead);
    assert.equal(b.listTopic(topic).length, 0);
    assert.equal(a.auditTopicCommitment(topic).ok, true);

    const falsified = structuredClone(snapshot);
    falsified.events.at(-1).payload.result.content[0].text = "different result";
    assert.throws(() => verifySnapshot(falsified),
      /Expected values to be strictly equal/);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    a.close(); b.close();
    rmSync(root, { recursive: true, force: true });
  }
});
