---
name: deep-linking-mobile
description: Deep linking patterns for Expo mobile apps in [APP]. Covers URL scheme configuration (app://), universal links (https://app.example.com), and deep link routing for shared bookings, barber profiles, and payment confirmations. Use when implementing share-to-app, push notification deep links, or web-to-mobile navigation.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Expo SDK 56."
metadata:
  trigger: ["deep link", "universal link", "url scheme", "app link", "share to app", "push notification link", "app://", "expo linking"]
  scope: [global, project]
  version: "1.0.0"
allowed-tools: Bash(node:*) Read
---

# 🔗 Deep Linking (Mobile)

Deep linking for Expo. Enables sharing booking links, opening specific barber profiles from web, and navigating from push notifications to specific screens.

## 📋 When to Use

- Use when implementing share booking link (client shares with friend)
- Use when push notifications should open a specific screen
- Use when web-to-mobile cross-promotion (open app from website)
- Do NOT use for internal navigation (use React Navigation)

## 🚦 Hard Rules

- **Always** define URL scheme in `app.json` (`scheme: "app"`)
- **Always** handle deep links in a top-level listener before navigation
- **Never** navigate to unauthenticated screens from deep links without checking auth
- **Always** validate deep link params before navigating

## 🛠️ Workflow

1. Read setup guide: [setup-guide.md](references/setup-guide.md)
2. Read routing patterns: [routing-patterns.md](references/routing-patterns.md)
3. Run the checker to verify deep link config:
   ```bash
   node ./.opencode/skills/deep-linking-mobile/scripts/check-deep-links.mjs
   ```

## 📚 References

- [Setup Guide](references/setup-guide.md) — app.json config + universal links
- [Routing Patterns](references/routing-patterns.md) — URL → screen mapping
- [`react-native`](../react-native/SKILL.md) — Expo navigation
