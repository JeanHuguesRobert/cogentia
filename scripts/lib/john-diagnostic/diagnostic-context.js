import { CapabilityInspector } from "./inspectors/capability-inspector.js";
import { PacketOdysseyInspector } from "./inspectors/packet-odyssey-inspector.js";
import { ContinuationInspector } from "./inspectors/continuation-inspector.js";
import { AccountingInspector } from "./inspectors/accounting-inspector.js";
import { TopologyInspector } from "./inspectors/topology-inspector.js";
import { SymmetryInspector } from "./inspectors/symmetry-inspector.js";

/**
 * Diagnostic Context for John: Registers modular inspectors and maintains session diagnostics state.
 */
export class DiagnosticContext {
  constructor(options = {}) {
    this.mode = options.mode || "diagnostic"; // "diagnostic" | "conversational"
    this.history = [];
    this.inspectors = new Map();

    // Register modular inspectors
    this.registerInspector(new CapabilityInspector(options));
    this.registerInspector(new PacketOdysseyInspector());
    this.registerInspector(new ContinuationInspector(options));
    this.registerInspector(new AccountingInspector());
    this.registerInspector(new TopologyInspector(options));
    this.registerInspector(new SymmetryInspector());
  }

  registerInspector(inspector) {
    if (!inspector?.name) throw new Error("Inspector must declare a name property");
    this.inspectors.set(inspector.name, inspector);
  }

  getInspector(name) {
    return this.inspectors.get(name);
  }

  listInspectors() {
    return Array.from(this.inspectors.values()).map((i) => ({
      name: i.name,
      description: i.description,
    }));
  }

  setMode(mode) {
    if (!["diagnostic", "conversational"].includes(mode)) {
      throw new Error(`Invalid mode '${mode}'. Must be 'diagnostic' or 'conversational'.`);
    }
    this.mode = mode;
    return this.mode;
  }
}
