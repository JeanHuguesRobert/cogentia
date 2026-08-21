import { auditCapabilitySymmetry, renderSymmetryScorecardHuman } from "../../symmetry-audit.js";

/**
 * Symmetry Inspector: Real-time audit of Capability Symmetry across Human and Machine projections.
 */
export class SymmetryInspector {
  constructor() {
    this.name = "symmetry";
    this.description = "Audit Capability Symmetry (Human CLI/Web vs Machine MCP/API/COP projections)";
  }

  audit() {
    return auditCapabilitySymmetry();
  }

  renderHuman() {
    const result = this.audit();
    return renderSymmetryScorecardHuman(result);
  }
}
