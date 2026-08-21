import { reconstructJohnOdyssey } from "../../john-run.js";

/**
 * Packet & Odyssey Inspector: Introspection on Cognitive Packet lifecycle, hops, Ithaca targets, and yields.
 */
export class PacketOdysseyInspector {
  constructor() {
    this.name = "packets";
    this.description = "Introspect Cognitive Packets, Odyssey journey traces, residue, and Ithaca settlements";
  }

  inspectPacket(packet) {
    if (!packet || !packet.envelope) {
      throw new Error("Invalid Cognitive Packet: missing envelope");
    }

    const env = packet.envelope;
    const odyssey = reconstructJohnOdyssey(packet);

    return {
      ok: true,
      packetId: env.id || env.packet_id,
      kind: env.kind || packet.packetKind,
      intent: env.intent || env.hops?.[0]?.route_reason || "unspecified",
      status: env.status || "unknown",
      ithaca: env.ithaca || null,
      hopsCount: (env.hops || []).length,
      hops: (env.hops || []).map((h) => ({
        index: h.hop_index,
        node: h.node_id,
        instance: h.instance_id,
        reason: h.route_reason,
        timestamp: h.timestamp,
      })),
      yield: packet.yield || null,
      residue: env.residue || [],
      odyssey,
    };
  }
}
