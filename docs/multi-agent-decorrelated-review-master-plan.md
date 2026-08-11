---
document_role: "operational"
document_kind: "documentation"
visibility: "public"
lifecycle_state: "active"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "documentation"
classification_confidence: "medium"
---

# Multi-Agent Decorrelated Adversarial Review Engine Master Plan 📜🤖🛡️
**Architectural Blueprint for Multi-Model Adversarial Audits & Local CLI Router Interoperability**

> **Goal**: Establish a robust, multi-agent decorrelated review pipeline (`node scripts/run-decorrelated-reviews.js`) that enforces the *Protocole Minimal de Revue Ciblée* ([`review_protocol.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/review_protocol.md)). This pipeline dispatches paper drafts to independent AI models (**Grok**, **Claude**, **Kimi**, **ChatGPT**) via both local CLI launchers (`grok.bat`, `kimi.bat`, `claude-anthropic.bat`) and the **Magistral AI Router Boundary**, collecting standalone 9-point critique files and serving a Human Decision Integration Report for author arbitration.

---

## 🏛️ Architecture Overview

```mermaid
flowchart TD
    Trigger["Target Document<br>(e.g. louis_pouzin_datagram_pioneer.md)"] --> Router["Multi-Agent Review Dispatcher<br>(node scripts/run-decorrelated-reviews.js)"]
    
    Router --> Mode1["Tier 1: Magistral AI Router<br>(HTTP API http://127.0.0.1:8880)"]
    Router --> Mode2["Tier 2: Headless Local CLI Subprocesses<br>(grok.bat, kimi.bat, claude-anthropic.bat)"]
    Router --> Mode3["Tier 3: Standalone Decorrelated Engine<br>(review_protocol.md Audit Format)"]
    
    Mode1 --> ModelGrok["Grok-4.5 / Grok-3<br>(Adversarial Risk & Symmetry)"]
    Mode1 --> ModelClaude["Claude 3.7 Sonnet<br>(Structural Epistemic & Logic)"]
    Mode1 --> ModelKimi["Kimi-K3 / ChatGPT<br>(Historical OSINT & 1M-Token Context)"]
    
    Mode2 --> ModelGrok
    Mode2 --> ModelClaude
    Mode2 --> ModelKimi
    
    ModelGrok --> RevGrok["research/reviews/review_grok_*.md"]
    ModelClaude --> RevClaude["research/reviews/review_claude_*.md"]
    ModelKimi --> RevKimi["research/reviews/review_chatgpt_*.md"]
    
    RevGrok --> IntegrationReport["research/reviews/integration_report_*.md"]
    RevClaude --> IntegrationReport
    RevKimi --> IntegrationReport
    
    IntegrationReport --> HumanAuthor["Human Author Arbitration<br>(Jean-Hugues Robert)"]
```

---

## 📋 4-Phase Implementation Breakdown

### Phase 1: Review Protocol Enforcement & Artifact Separation
- **Objective**: Ensure that papers remain pure source documents (`source.md`) and that critiques are generated as separate, un-merged standalone files.
- **Deliverables**:
  - `barons-Mariani/research/reviews/review_grok_<doc>.md`
  - `barons-Mariani/research/reviews/review_claude_<doc>.md`
  - `barons-Mariani/research/reviews/review_chatgpt_<doc>.md`
  - `barons-Mariani/research/reviews/integration_report_<doc>.md`

---

### Phase 2: Local CLI Launcher Interoperability
- **Objective**: Enable non-interactive execution of local AI command-line launchers installed on the workstation.
- **Launcher Suite**:
  - 🤖 `grok.bat` (`xai/grok-4.5`)
  - 🌙 `kimi.bat` (`moonshotai/Kimi-K3` - 1M token context)
  - 🧠 `claude-anthropic.bat` / `claude-zai.bat` (`anthropic/claude-3-7-sonnet`)
  - ♊ `gemini.bat` (`google/gemini-1.5-pro`)
  - 🔮 `glm.bat` / `muse.bat`
- **Execution Mechanism**: Non-interactive `execFileSync` wrapper passing review prompts with proper stdin handling to avoid TTY raw mode errors.

---

### Phase 3: Magistral AI Router Boundary Integration
- **Objective**: Connect to the Magistral AI Router (`http://127.0.0.1:8880`) when active, leveraging unified OpenAI-compatible chat completion endpoints (`/v1/chat/completions`).
- **Features**: Zero-secret header sanitization, model capability routing, and automatic RAG context packing fallback.

---

### Phase 4: Rossignol Test & Human Decision Integration
- **Objective**: Enforce the Rossignol Test (*Pas de stabilisateur sans Rossignol*) and present an un-biased Integration Table to the human author.
- **Rules**:
  - The AI agents are non-decision-making reviewers.
  - Final plateau status (`release_candidate` / `published`) belongs exclusively to the human author (**Jean-Hugues Robert**).
  - Rossignol execution test scripts (`scripts/test-cognitive-datagram.js`) must validate empirical grounding.

---

## 🛠️ CLI & MCP Interface

### CLI Command
```bash
node scripts/run-decorrelated-reviews.js [--file <path>] [--use-local-launchers] [--router-url http://127.0.0.1:8880]
```

### MCP Tool Integration
Expose `cogentia_run_decorrelated_review` in `scripts/lib/cogentia-mcp-core.js` so any MCP client agent can trigger multi-agent decorrelated reviews!

---

## 🧪 Verification Matrix

| Step | Verification Criteria | Expected Outcome |
|---|---|---|
| **1. Artifact Separation** | File system check under `research/reviews/` | 3 separate review files + 1 integration report |
| **2. Local CLI Launchers** | `execFileSync` on local `.bat` launchers | Clean non-interactive model execution |
| **3. Magistral Router** | HTTP check on `http://127.0.0.1:8880` | Clean chat completions with zero secret leaks |
| **4. Human Arbitration** | `integration_report_*.md` generation | Unfilled decision table reserved for human author |
