---
name: dod-checker
description: Act as the strict Gatekeeper for the "Definition of Done" (DoD). Run this skill to evaluate a feature or phase. Blocks stage checkoffs if SOLID, DRY, or 2026 security guardrails are bypassed.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["dod checker"]
  scope: [global, project]
  version: "1.0.0"
---

# 🛡️ Definition of Done (DoD) Gatekeeper

This skill forces the AI to aggressively audit the current implementation against the Definition of Done before allowing any phase to be declared complete. Do not accept excuses.

---

## 🏛️ The DoD Gatekeeper Process

When asked to evaluate if a phase or feature is finished, execute these rigorous checks:

### 1. SOLID & Clean Code Compliance
- **DRY Verification**: Ensure data schemas, validation helpers, and TypeScript interfaces are shared inside packages. If duplicate logic is found across frontend and backend, trigger an immediate **FAIL**.
- **SRP Verification**: Verify components do not contain mixed concerns (such as UI styling combined with socket binding). Ensure custom hooks are used for side effects.
- **KISS Verification**: Ensure no bloated functions (shorter than 40 lines) or overly complex algorithms are deployed.
- Refer to [SOLID and Clean Code Guidelines](../solid-clean-code/SKILL.md).

### 2. Functional Integrity (Zero Dead Ends)
- **Dead Elements**: Scan the code for buttons, links, or forms that lack `onClick`, `href`, or `onSubmit` handlers.
- **Core Logic**: Does the primary objective execute from start to finish (e.g., cart -> checkout -> db update -> socket update -> dashboard list) or does it stop halfway?
- **Dummy Data**: Are there hardcoded placeholders (e.g., "TODO", "Lorem Ipsum") that were supposed to be dynamic?

### 3. Resilience and Edge State
- **Feedback States**: Are there loading, success, or error states for async actions? Or is the UI unresponsive when clicked?
- **Silent Failures**: Does the logic fail quietly via empty `catch (e) {}` blocks?

### 4. Security & Guardrails Audits (Zero Bypasses)
- **Token Policies**: Ensure NO JWT is stored in LocalStorage.
- **Mobile Store**: Ensure NO credentials use AsyncStorage (must use `SecureStore`).
- **WebSockets**: Ensure ALL `socket.on` listeners validate payloads with Zod.
- **Escape Clauses**: Check for bypasses. If any forbidden design pattern is used, it MUST be prefaced with `// #IA_BYPASS: <reason>`. Any unauthorized bypass without this comment causes an immediate **FAIL**.

---

## 📋 Delivery & Verdict

Provide the user with a strict "Gatekeeper Report" containing:

1. **Verdict**: Large text indicating either `[ 🟢 PASS - PHASE COMPLETE ]` or `[ 🔴 FAIL - RETURN TO WORK ]`.
2. **Blockers (If Failed)**: A detailed list of what logic is missing, broken, or violates security/SOLID rules. If failed, **refuse** to update the `[x]` checkmark in the Project Tracker.
3. **Deferred Tolerances (If Passed)**: State any minor issues (e.g., "Slight CSS padding issue") that are officially deferred to the final Phase 7 QA. These cannot be functional, SOLID, or security blockers.
