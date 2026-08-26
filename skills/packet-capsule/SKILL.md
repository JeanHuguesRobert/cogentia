---
schema: cogentia.agent_skill/v1
name: packet-capsule
version: "0.1.0"
title: "Packet Capsule — Cognitive Packet Packaging & Handoff"
description: "Bundles markdown research and operational artifacts into self-contained, portable, content-addressed Cognitive Packet Capsules."
governance_tier: operational
requires_lockers:
  - public:read
  - public:write
capabilities_provided:
  - packet.capsule.pack
  - packet.capsule.unpack
  - packet.capsule.verify
tools:
  - cogentia_packet_capsule_pack
  - cogentia_packet_capsule_verify
entrypoint:
  command: "node scripts/cogentia.js packet capsule pack"
---

# Packet Capsule Skill

Enables agents to package and unpack self-contained, immutable Cognitive Packet Capsules.

## Commands

- `node scripts/cogentia.js packet capsule pack <file> [--output <path>]`
- `node scripts/cogentia.js packet capsule verify <capsule-file>`
- `node scripts/cogentia.js packet capsule unpack <capsule-file> [--target-dir <path>]`
