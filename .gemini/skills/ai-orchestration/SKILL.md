---
name: ai-orchestration
description: Guidelines for managing multi-agent orchestrations. Enforces Chain of Thought (CoT) step reasoning, progressive prompting rounds, session state logging, and human verification hooks.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["orquestación AI", "multi-agente", "chain of thought", "progressive prompting"]
  scope: [global, project]
  version: "1.0.0"
---

# 🤖 AI Orchestration (Agentic Design Patterns)

Use this skill when designing systems where multiple LLM processes or backend workers coordinate to solve a user task.

---

## 🚨 Multi-Agent Orchestration Guardrails

1. **State Machine Management**:
   - Maintain an explicit task context state object (like a session log) that tracks the status of each agent's execution.
   - Do not rely on chat history to track progress. Use a structured state document (e.g. JSON in DB or Redis).

2. **Mandatory Chain of Thought (CoT)**:
   - Every coordinator agent must be prompted to think step-by-step before delegating or formulating outputs.
   - Design prompts to include a `"thinking"` parameter in the output schemas to capture the reasoning steps, ensuring trace analysis.

3. **Progressive Prompting (Rounds)**:
   - Do not request the coordinator to perform classification, search, and resolution in a single execution step.
   - Divide operations into discrete Rounds:
     - **Round 1 (Ingestion & Triage)**: Identify the customer's core problem and assign the ticket category.
     - **Round 2 (Information Gathering)**: Query databases or inventories matching the triage context.
     - **Round 3 (Resolution Formulation)**: Draft response scripts or replacement suggestions based on the gathered details.
     - **Round 4 (Safety & Compliance Check)**: Audit the response format and content constraints.

4. **Human-in-the-Loop Safeguards**:
   - Any financial or database-modifying operation suggested by an AI agent must stop for human validation.
   - **Prohibited**: Allowing an AI bot to issue refunds or modify order statuses autonomously.
   - **Required**: Requiring an employee's manual confirmation in the Admin Panel dashboard.

---

## 🛒 [APP] Integration Example (Triage & Route Coordination)

```
                       [Customer Inquiry]
                               │
                ┌──────────────┴──────────────┐
                ▼ (Round 1: Triage)           ▼ (Round 1: Coordinates)
         [Triage Agent]               [Route Ingestor]
       (Classifies category)      (Ingests location points)
                │                             │
                ▼ (Round 2: Audit)            ▼ (Round 2: CoT Routing)
         [Stock Auditor]              [Path Optimizer]
     (Checks inventory logs)     (Solves path sequence with CoT)
                │                             │
                ▼ (Round 3: Suggestion)        ▼ (Round 3: Dispatch)
      [Replacement Generator]        [Courier Coordinator]
   (Formulates replacement JSON)   (Previews route in Admin Panel)
                │                             │
                └──────────────┬──────────────┘
                               ▼ (Human-in-the-Loop)
                  [Employee Review Dashboard]
               (Manual Approval before DB Write)
```
- Use the orchestrator to coordinates alerts: if the **Stock Auditor** finds that a product required in a confirmed order has 0 stock, it flags the order as "Stock Alert" and triggers a websocket broadcast to the employee chat room.
- The **Path Optimizer** receives coordinates from multiple client deliveries, compiles them using Dijkstra or OR-Tools APIs, and sends the optimized sequence to the Delivery driver's Expo mobile screen.
- Every dispatcher agent writes its actions and steps to the central state log database to ensure transparency and MLOps traceability (`skill-ai-scalability-mlops`).
