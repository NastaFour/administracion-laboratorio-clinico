---
name: api-ai-billing
description: Guidelines for managing AI integration billing and usage quotas. Covers token estimation, user quotas middleware, rate-limiting tier configurations, and price analytics.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["billing AI", "costos API", "quotas", "token usage"]
  scope: [global, project]
  version: "1.0.0"
---

# 🪙 AI Billing & API Quota Management

Use this skill when implementing features that track token costs, enforce user AI quotas, or manage OpenAI/Gemini/Anthropic integration tiers.

## 🚨 Billing & Quota Standards

1. **Token Estimation Middleware**:
   - Estimate input and output tokens before and after LLM operations (using lightweight libraries like `js-tiktoken` or approximate character counters: `chars / 4` as a fallback).
   - Log estimated costs for every API call into the logging database.

2. **Quota Checks**:
   - Before executing an LLM request for a client, check their remaining daily quota inside the PostgreSQL database.
   - If the user has exceeded their daily tier allowance, return a `429 Too Many Requests` status code with a descriptive billing message: *"You have reached your daily limit for AI assistance. Please contact support manually."*

3. **Multi-Tier Routing**:
   - Classify users into tiers:
     - **Basic (Free)**: Limit to 10 AI queries per day. Use cheaper models (e.g., `gemini-1.5-flash`).
     - **VIP (Paid)**: Limit to 200 AI queries per day. Access to advanced models (e.g., `gemini-1.5-pro` or `claude-3.5-sonnet`).

## 🛒 [APP] Integration Example

- **User Billing Schema**: Add quota fields to the user table:
  ```prisma
  model User {
    // ...
    aiQueriesToday INT @default(0)
    aiQueriesLimit INT @default(10)
    tier           String @default("BASIC") // "BASIC" | "VIP"
  }
  ```
- **Live Inventory Inquiries**: If a client queries the chatbot for restocking dates continuously, check the quota database. This blocks spam attacks that drive up API costs.
- **Auto-Billing Checks**: At midnight, reset the `aiQueriesToday` count for all users using a cron job.
