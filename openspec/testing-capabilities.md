# Testing Capabilities — LabCore

**Strict TDD Mode**: disabled (no test runner installed)
**Detected**: 2026-08-18

## Test Runner

- Command: —
- Framework: none

## Test Layers

| Layer       | Available | Tool        |
| ----------- | --------- | ----------- |
| Unit        | ❌        | —           |
| Integration | ❌        | —           |
| E2E         | ❌        | —           |

## Coverage

- Available: ❌
- Command: —

## Quality Tools

| Tool         | Available | Command                                       |
| ------------ | --------- | --------------------------------------------- |
| Linter       | ✅        | `npm run lint` (eslint 9 + typescript-eslint) |
| Type checker | ✅        | `npx tsc -b` (runs inside `npm run build`)    |
| Formatter    | ❌        | —                                             |

## Notes

- No vitest/jest/playwright anywhere in `package.json`.
- Adding **Vitest** is an OPEN DECISION for the design phase; `strict_tdd` remains `false` until a runner exists.
- Scripts available today: `dev`, `build` (tsc -b + vite build), `lint`, `preview`, `package`, `dist`.
