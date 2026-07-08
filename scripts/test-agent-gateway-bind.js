#!/usr/bin/env node

import assert from "node:assert/strict";
import { resolveBindHost, requireTokenForExposure } from "./lib/agent-gateway/bind-host.js";

const loopback = resolveBindHost("loopback");
assert.equal(loopback.host, "127.0.0.1");
assert.equal(loopback.mode, "loopback");

const all = resolveBindHost("all");
assert.equal(all.host, "0.0.0.0");
assert.equal(all.mode, "all");

const tailscale = resolveBindHost("tailscale");
assert.ok(["tailscale", "all"].includes(tailscale.mode));

assert.equal(requireTokenForExposure(loopback, ""), null);
assert.match(requireTokenForExposure(all, ""), /AGENT_GATEWAY_TOKEN/);
assert.equal(requireTokenForExposure(all, "secret"), null);

console.log(JSON.stringify({
  ok: true,
  loopback: loopback.host,
  all: all.host,
  tailscale: tailscale.host,
  tailscale_mode: tailscale.mode,
}, null, 2));