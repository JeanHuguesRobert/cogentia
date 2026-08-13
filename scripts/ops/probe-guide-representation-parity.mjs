/**
 * Probe Guide representation parity with WhatsApp inject stack (no LLM spend).
 * Usage: node scripts/ops/probe-guide-representation-parity.mjs
 */
import {
  buildCrossSurfaceStyleBlock,
  loadAgentBrief,
  loadPersonStyle,
  loadPrimaryStyleKernel,
  loadPublicOpenCogentigram,
  shouldInjectAgentBrief,
  shouldInjectPersonStyle,
  shouldInjectPrimaryStyle,
  shouldInjectCogentigramTopN,
} from "../lib/agent-jhn-whatsapp/representation-brief.js";

const env = process.env;
const block = buildCrossSurfaceStyleBlock({
  primaryStyleMaxChars: 3500,
  personStyleMaxChars: 4000,
  agentBriefMaxChars: 6000,
  cogentigramTopN: 8,
  includeAgentBrief: true,
}, env);

const brief = loadAgentBrief({}, env);
const person = loadPersonStyle({}, env);
const primary = loadPrimaryStyleKernel({}, env);
const cog = loadPublicOpenCogentigram({ forceLoadOpenProfile: true }, env);

const checks = {
  inject_agent_brief: shouldInjectAgentBrief(env, {}),
  inject_person_style: shouldInjectPersonStyle(env, {}),
  inject_primary_style: shouldInjectPrimaryStyle(env, {}),
  inject_topn: shouldInjectCogentigramTopN(env, {}),
  agent_brief_ok: brief.ok,
  agent_brief_path: brief.path,
  person_style_ok: person.ok,
  person_style_path: person.path,
  primary_style_ok: primary.ok,
  primary_style_path: primary.path,
  cogentigram_ok: cog.ok,
  style_block_chars: block.length,
  has_kys_line: /kys_profile_id:/.test(block),
  has_person_style: /PERSON STYLE/.test(block),
  has_primary_kernel: /PRIMARY STYLE KERNEL/.test(block),
  has_agent_brief: /AGENT BRIEF/.test(block),
  has_cogentigram: /Cogentigram top-/i.test(block),
};

console.log(JSON.stringify(checks, null, 2));
const ok =
  checks.has_kys_line
  && checks.has_primary_kernel
  && checks.inject_primary_style
  && checks.style_block_chars > 500;
console.log(ok ? "GUIDE_REPR_PARITY_OK" : "GUIDE_REPR_PARITY_PARTIAL");
process.exit(ok ? 0 : 2);
