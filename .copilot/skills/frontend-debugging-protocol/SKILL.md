---
name: frontend-debugging-protocol
description: Systematic diagnostic checklist for frontend visual symptoms like "page renders without CSS", "components show no data", "map has no markers", or "redirect loop on public pages". Use when debugging visual bugs in the React/Vite Admin Panel or Expo mobile apps where the symptom's cause is not obvious.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["se ve sin css", "css not loading", "no data", "no markers", "redirect loop", "frontend debug", "debug visual", "pantalla en blanco", "componentes sin data"]
  scope: [global, project]
  version: "1.0.0"
---

# 🔍 Frontend Debugging Protocol

A systematic decision tree for diagnosing frontend visual bugs where the symptom doesn't obviously point to the cause. Prevents the "shotgun debugging" approach of changing random files.

## 📋 When to Use

- Use when "the page looks like plain text, no CSS"
- Use when "components render but have no data / empty fields"
- Use when "the map shows no markers"
- Use when "images show [object Object] or broken"
- Use when "unauthenticated users can't see public pages (redirect loop)"
- Do NOT use for backend API errors (use `expert-debugger` instead)

## 🚦 Hard Rules

- **Always** follow the decision tree in order — don't skip steps
- **Always** verify the config layer before the component layer (CSS issues are usually config, not code)
- **Never** change a component if the root cause is in the API response shape
- **Always** check the browser console + Network tab before editing code

## 🛠️ Workflow

1. Identify the symptom from the decision tree below
2. Follow the branches in order (highest probability first)
3. Run the verification command at each step
4. Apply the fix only after confirming the root cause

## 📚 References

- [Diagnostic Decision Tree](references/diagnostic-tree.md) — full tree by symptom
- [`build-config-validator`](../build-config-validator/SKILL.md) — for CSS-related symptoms
- [`api-response-normalizer`](../api-response-normalizer/SKILL.md) — for data shape mismatch symptoms
- [`auth-flow-audit`](../auth-flow-audit/SKILL.md) — for redirect loop symptoms
- [`expert-debugger`](../expert-debugger/SKILL.md) — if root cause is deeper
