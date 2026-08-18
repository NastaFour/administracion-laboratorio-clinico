---
name: notifications-multichannel
description: Unified notification service for [APP] covering push (Expo), email (Resend), and SMS (Twilio) channels with user preference resolution and provider fallback. Use when sending booking confirmations, reminders, no-show alerts, or any notification that should respect user channel preferences and fall back across channels.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+."
metadata:
  trigger: ["notification", "email", "sms", "twilio", "resend", "sendgrid", "multi channel", "notification service", "notificación", "push email sms", "channel preference", "notification fallback"]
  scope: [global, project]
  version: "1.0.0"
allowed-tools: Bash(node:*) Read
---

# 🔔 Notifications Multichannel

Unifies push (Expo), email (Resend), and SMS (Twilio) into a single `NotificationService`. Resolves user preferences and falls back across channels. Extends `push-notifications` (push-only) with email and SMS.

## 📋 When to Use

- Use when sending any notification that should respect user channel preferences
- Use when implementing booking confirmations, reminders, no-show alerts, review requests
- Use when you need fallback (push fails → try SMS → try email)
- Do NOT use for push-only notifications without preference logic (use `push-notifications` directly)

## 🚦 Hard Rules

- **Always** use `NotificationService.send()` for notifications (not direct provider calls)
- **Always** respect user preferences (`User.notificationPreferences`)
- **Always** log notification attempts in `NotificationLog` for tracking + retry
- **Never** send SMS without checking user's phone is verified
- **Always** queue notifications via BullMQ for async delivery + retry

## 🛠️ Workflow

1. Read channel priority logic: [channel-priority.md](references/channel-priority.md)
2. Read template catalog: [templates.md](references/templates.md)
3. Read provider config: [provider-config.md](references/provider-config.md)
4. Run the checker to verify no direct provider calls bypass NotificationService:
   ```bash
   node ./.opencode/skills/notifications-multichannel/scripts/check-notifications.mjs
   ```

## 📚 References

- [Channel Priority](references/channel-priority.md) — push > SMS > email logic
- [Templates](references/templates.md) — 6+ notification templates
- [Provider Config](references/provider-config.md) — Resend, Twilio, Expo Push
- [`push-notifications`](../push-notifications/SKILL.md) — push channel specifics
- [`background-jobs-queues`](../background-jobs-queues/SKILL.md) — queued delivery
