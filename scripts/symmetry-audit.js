#!/usr/bin/env node

import { auditCapabilitySymmetry, renderSymmetryScorecardHuman } from "./lib/symmetry-audit.js";

const isJson = process.argv.includes("--json");
const result = auditCapabilitySymmetry();

if (isJson) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else {
  process.stdout.write(`${renderSymmetryScorecardHuman(result)}\n`);
}
