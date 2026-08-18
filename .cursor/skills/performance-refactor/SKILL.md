---
name: performance-refactor
description: Refactor code to improve performance, readability, and scalability. Covers stylesheet JIT pruning, model quantization checks, and database query index audits. Use when optimizing queries, bundle size, rendering, or AI model performance.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["performance refactor"]
  scope: [global, project]
  version: "1.0.0"
---

# ⚡ Performance Refactoring Guidelines

This skill transforms working code into elegant, high-performance code.

---

## 🏛️ Refactoring Laws

1. **Zero Behavioral Change**:
   - The input and output of the function/module MUST remain identical.

2. **Justified Modifications**:
   - You must explain why a change was made (e.g., "Switched from array.map to a Set to reduce lookup time from O(N) to O(1)", "Indexed Postgres `buyerId` column to optimize search times", or "Replaced dynamic Tailwind utility classes to prune unused compiler tags").

3. **Optimization Targets**:
   - Refer to specific technology skills:
     - For stylesheet cleanup and responsive layouts: see [Tailwind CSS](../tailwindcss/SKILL.md).
     - For database query execution speeds: see [Prisma ORM](../prisma-orm/SKILL.md) and [PostgreSQL](../postgresql/SKILL.md).
     - For mobile list and map rendering optimizations: see [React Native](../react-native/SKILL.md).
     - For LLM model optimization and token caching: see [LLM Integration](../llm-integration/SKILL.md) and [AI/ML Scalability](../ai-scalability-mlops/SKILL.md).

4. **Data & Context Preservation**:
   - NEVER remove existing business-logic comments or alter database schema structures during a pure performance refactoring.

---

## 📋 Deliverables

1. **Refactored Code**: Provide the clean code block.
2. **Change Matrix**: A markdown table with 3 columns:
   - `What Changed`
   - `Why`
   - `Expected Impact`
3. **Complexity Delta**: If algorithmic performance changed, state the before and after Big-O complexity (e.g., O(N^2) -> O(N log N)).
