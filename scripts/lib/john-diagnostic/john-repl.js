import readline from "node:readline";
import { DiagnosticContext } from "./diagnostic-context.js";
import { runJohnRequest, renderJohnEventHuman } from "../john-run.js";

/**
 * Interactive Diagnostic & Investigation REPL for John Agent.
 */
export class JohnRepl {
  constructor(options = {}) {
    this.context = new DiagnosticContext(options);
    this.format = options.format || "human";
    this.onEvent = options.onEvent || null;
  }

  formatPrompt() {
    const modeBadge = this.context.mode === "diagnostic" ? "[DIAGNOSTIC]" : "[CONVERSE]";
    return `john:${modeBadge}> `;
  }

  async executeCommand(rawInput) {
    const input = rawInput.trim();
    if (!input) return null;

    // Slash / Dot commands for Diagnostic Inspection
    if (input.startsWith(".") || input.startsWith("/")) {
      const parts = input.slice(1).split(" ");
      const cmd = parts[0].toLowerCase();
      const arg = parts.slice(1).join(" ");

      switch (cmd) {
        case "help":
        case "h":
        case "?":
          return [
            "=== John Diagnostic & Investigation Commands ===",
            "  .mode [diagnostic|conversational]  Toggle operational mode",
            "  .capabilities [filter]              Introspect catalogue, providers, rate-cards",
            "  .cap <name>                         Deep inspection of a specific capability",
            "  .topology                           List known network nodes and attractors",
            "  .probe <nodeId>                     Probe network node reachability & latency",
            "  .continuations [status]             Inspect paused judgment boundaries (issue #80)",
            "  .inspectors                         List all registered modular inspectors",
            "  .eval <prompt>                      Run governed single-step with fine event trace",
            "  .exit / .quit                       Exit REPL session",
          ].join("\n");

        case "mode":
          if (arg) {
            const nextMode = this.context.setMode(arg.trim());
            return `Switched mode to: ${nextMode}`;
          }
          return `Current mode: ${this.context.mode}`;

        case "inspectors":
          return JSON.stringify(this.context.listInspectors(), null, 2);

        case "capabilities":
        case "caps": {
          const capInsp = this.context.getInspector("capabilities");
          const res = await capInsp.inspect(arg, { mcpCore: this.context.mcpCore });
          return JSON.stringify(res, null, 2);
        }

        case "cap": {
          if (!arg) return "Usage: .cap <capabilityName>";
          const capInsp = this.context.getInspector("capabilities");
          const res = await capInsp.getDetail(arg.trim());
          return JSON.stringify(res, null, 2);
        }

        case "topology":
        case "nodes": {
          const topInsp = this.context.getInspector("topology");
          return JSON.stringify(topInsp.listNodes(), null, 2);
        }

        case "probe": {
          if (!arg) return "Usage: .probe <nodeId>";
          const topInsp = this.context.getInspector("topology");
          const res = await topInsp.probeNode(arg.trim());
          return JSON.stringify(res, null, 2);
        }

        case "continuations": {
          const contInsp = this.context.getInspector("continuations");
          const res = await contInsp.list(arg.trim() || "alive");
          return JSON.stringify(res, null, 2);
        }

        case "eval": {
          if (!arg) return "Usage: .eval <prompt>";
          return this.runStep(arg);
        }

        case "exit":
        case "quit":
        case "q":
          return "__EXIT__";

        default:
          return `Unknown diagnostic command: .${cmd}. Type .help for catalogue.`;
      }
    }

    // Direct input: In Diagnostic mode, runs governed step with event trace; in Conversational mode, returns stream
    return this.runStep(input);
  }

  async runStep(prompt) {
    const request = {
      version: "john.request.v1",
      request_id: `repl-${Date.now()}`,
      principal: { id: "user:operator" },
      mandate: { id: "mandate:repl:investigation", version: "1" },
      budget: { id: "budget:repl" },
      execution_budget: {
        max_steps: 4,
        max_tool_calls: 2,
        max_subagents: 0,
        max_elapsed_ms: 10000,
        max_external_effects: 0,
      },
      exposure: "bounded",
      capability: "john.research",
      input: { prompt },
      handler: { id: "mock.echo", kind: "mock" },
    };

    const events = await runJohnRequest(request);
    const outputLines = [];

    if (this.context.mode === "diagnostic") {
      outputLines.push(`--- Diagnostic Event Trace (${events.length} events) ---`);
      for (const ev of events) {
        outputLines.push(this.format === "ndjson" ? JSON.stringify(ev) : renderJohnEventHuman(ev));
      }
      const acctInsp = this.context.getInspector("accounting");
      const summary = acctInsp.summarizeEvents(events);
      outputLines.push(`--- Accounting Settlement: ${summary.observed_steps} steps, ${summary.provider_cost} units, Ithaca returned: ${summary.ithaca_returned} ---`);
    } else {
      // Conversational mode: Clean output
      const completed = events.find((e) => e.type === "john.run.completed");
      const failed = events.find((e) => e.type === "john.run.failed");
      if (completed) {
        outputLines.push(completed.data.result.yield?.semantic_yield || completed.data.result.text);
      } else if (failed) {
        outputLines.push(`[Execution Failed]: ${failed.data.code}`);
      }
    }

    return outputLines.join("\n");
  }

  async startInteractive(input = process.stdin, output = process.stdout) {
    const rl = readline.createInterface({ input, output, prompt: this.formatPrompt() });

    output.write("=======================================================\n");
    output.write("  John Agent Diagnostic & Investigation Console v0\n");
    output.write("  Type .help for diagnostic commands or enter a prompt.\n");
    output.write("=======================================================\n\n");

    rl.prompt();

    for await (const line of rl) {
      const result = await this.executeCommand(line);
      if (result === "__EXIT__") {
        rl.close();
        break;
      }
      if (result !== null) {
        output.write(`${result}\n\n`);
      }
      rl.setPrompt(this.formatPrompt());
      rl.prompt();
    }
  }
}
