---
name: store-deployment-eas
description: Deployment patterns for publishing [APP] Expo apps to Apple App Store and Google Play Store using EAS (Expo Application Services). Covers EAS Build, Submit, Update (OTA), environment management (dev/staging/prod), and version management. Use when preparing for production release, submitting to stores, or configuring OTA updates.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Expo SDK 56 and EAS CLI."
metadata:
  trigger: ["app store", "play store", "eas build", "eas submit", "eas update", "ota update", "production deploy", "store deploy", "expo publish", "production release"]
  scope: [global, project]
  version: "1.0.0"
allowed-tools: Bash(node:*) Read
---

# 🚀 Store Deployment (EAS)

Deploy Expo apps to App Store and Play Store using EAS. Covers build, submit, OTA updates, and environment management.

## 📋 When to Use

- Use when preparing the first production release
- Use when submitting an update to App Store / Play Store
- Use when configuring OTA updates (hotfixes without store review)
- Do NOT use for local development (use `pnpm --filter mobile-client start`)

## 🚦 Hard Rules

- **Always** use separate EAS profiles for dev, staging, production
- **Always** bump version in `app.json` before store submission
- **Never** submit to production without testing the staging build
- **Always** use `eas update` for JS-only changes (faster than store review)
- **Never** hardcode API URLs (use `expo-constants` or environment variables)

## 🛠️ Workflow

1. Read EAS setup: [eas-setup.md](references/eas-setup.md)
2. Read release process: [release-process.md](references/release-process.md)
3. Run the checker to verify EAS config:
   ```bash
   node ./.opencode/skills/store-deployment-eas/scripts/check-eas-config.mjs
   ```

## 📚 References

- [EAS Setup](references/eas-setup.md) — eas.json, profiles, credentials
- [Release Process](references/release-process.md) — version bump → build → submit → OTA
- [`expo-production-auditor`](../expo-production-auditor/SKILL.md) — pre-build audit
- [`ci-cd`](../ci-cd/SKILL.md) — CI/CD pipeline integration
- [`env-management`](../env-management/SKILL.md) — environment variables per profile
