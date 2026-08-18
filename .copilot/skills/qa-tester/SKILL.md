---
name: qa-tester
description: Generate comprehensive automated test suites. Use this skill to write unit, integration, or E2E tests using the project's designated testing framework.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["qa tester"]
  scope: [global, project]
  version: "1.0.0"
---

This skill forces the AI to think destructively, aiming to break the code to ensure its robustness.

## Testing Coverage Requirements
Your test suites MUST explicitly cover these 6 scenarios:
1. **Happy Path**: The normal, expected flow (minimum 2 tests).
2. **Edge Cases**: Empty inputs, null values, negative prices/stock, special characters (minimum 3 tests).
3. **Security & Authentication**: Verify API blocks requests lacking JWT cookies and test Socket server handshake rejections for empty auth tokens.
4. **Real-time & Cleanups**: Test socket connection closures and verify listeners are successfully detached on unmount (no memory leaks).
5. **Database Integrity**: Test transactional actions (e.g. mock checkouts that trigger stock shortages) and verify Prisma database state rolls back completely if a single item fails validation.
6. **SOLID & Clean Code Regression**: After any refactor, assert that no function in the changed module exceeds 40 lines. Confirm no TypeScript `any` type has leaked into interfaces. Scan imports to ensure shared logic has not been duplicated locally instead of being sourced from `@scope/shared-types` or `@scope/shared-utils`. Refer to [SOLID & Clean Code](../solid-clean-code/SKILL.md).

## Code Standards for Tests
- **Descriptive Naming**: Test names must explain exactly what is verified (e.g., `should_rollback_stock_changes_if_order_item_is_depleted`).
- **Mocking**: Mock external dependencies (payment APIs, GPS locations) cleanly. Use `jest.mock` or MSW.
- **Setup/Teardown**: Include necessary fixtures, database truncates (`beforeEach`), and server shutdowns (`afterAll`).
- **Coverage Summary**: End with a bulleted summary of all scenarios covered.
