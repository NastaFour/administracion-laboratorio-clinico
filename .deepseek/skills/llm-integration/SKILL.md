---
name: llm-integration
description: Guidelines for integrating LLMs into backend APIs. Covers model streaming endpoints, retry setups, prompt token optimizations, model quantization, and telemetry tracking. Use when adding chat completions, streaming, or LLM-powered features to the backend.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["LLM", "GPT", "Gemini", "langchain", "modelo de lenguaje"]
  scope: [global, project]
  version: "1.0.0"
---

# 🔌 LLM Integration & API Management

Use this skill when implementing OpenAI/Gemini/Anthropic API calls, configuring streaming endpoints, or designing fallback logic.

---

## 🚨 API Design & Reliability

1. **Streaming Responses**:
   - For interactive elements (like customer support chat autocomplete), stream the LLM response chunk-by-chunk to the client rather than waiting for the entire block.
   - Use events like Server-Sent Events (SSE) or WebSockets to stream tokens.

2. **Retry Policies & Timeouts**:
   - Wrap LLM requests in a robust HTTP client helper that handles rate-limiting (429 status) and network timeouts.
   - Implement **exponential backoff retries** with jitter (using library configurations or custom wrappers).
   - Set strict timeouts for LLM API calls (e.g. 8-10 seconds) to prevent client requests from hanging indefinitely.

3. **Fallback Models**:
   - Define a backup model tier (e.g. if Claude 3.5 Sonnet fails, failover to Gemini 1.5 Flash or a local llama model) to maintain customer support availability.

---

## 🚀 Optimization & Performance Guardrails

1. **Model Quantization Checks**:
   - When deploying local open-source models (such as Llama 3 or Mistral on a local branch server) to cut API costs, verify that models are optimized using quantization methods (e.g., INT8 or FP4) to reduce VRAM requirements without degrading classification quality.

2. **Context Window & Token Caching**:
   - Cleanly filter the context injected into prompts. Do not send entire raw tables of product details. Filter categories first via Prisma, then send only relevant items.
   - Configure prompt cache headers (e.g., using Anthropic/OpenAI prompt caching features) when injecting long product lists to reduce input cost and latency by up to 90%.

3. **Telemetry & Drift Logs**:
   - Record call performance statistics: execution latency, prompt input tokens, completion tokens, and model costs.
   - Save query outputs into telemetry log files to monitor data drift and verify classifications match expectations (`skill-ai-scalability-mlops`).

---

## 🛒 [APP] Integration Example (Support Assistant)

- When a customer submits an inquiry on the mobile app ("Mi pedido llegó incompleto"), the server calls the LLM with the user's order details.
- **Context Injection**: Retrieve order and product tables via Prisma first, and inject them into the system prompt. Never let the LLM guess what the order contains.
- **Fail-safe**: If the LLM call times out, fallback to a standard static message: *"We are reviewing your order. A support representative will contact you in a moment."*
