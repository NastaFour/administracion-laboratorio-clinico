---
name: offline-sync-mobile
description: Offline-first sync patterns for Expo mobile apps in [APP]. Covers local queue for booking creation when offline, conflict resolution when reconnecting, and optimistic UI updates with rollback. Use when the mobile client needs to work without network (bookings, profile edits) or when debugging sync conflicts.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and Expo SDK 56."
metadata:
  trigger: ["offline sync", "offline first", "sin conexion", "conflict resolution", "optimistic update", "mobile queue", "sync conflict", "async storage", "offline mode"]
  scope: [global, project]
  version: "1.0.0"
allowed-tools: Bash(node:*) Read
---

# 📴 Offline Sync (Mobile)

Offline-first patterns for Expo mobile. Bookings created offline are queued and synced when network returns. Optimistic UI with rollback on conflict.

## 📋 When to Use

- Use when mobile client needs to create bookings without network
- Use when debugging sync conflicts after reconnection
- Use when implementing optimistic UI updates (show data before server confirms)

## 🚦 Hard Rules

- **Always** store pending operations in a local queue (AsyncStorage/SQLite)
- **Always** show optimistic UI with a "syncing..." indicator
- **Always** handle conflict (409 from server) with user-facing resolution
- **Never** assume the queue is empty on app start (check + sync on launch)

## 🛠️ Workflow

1. Read sync patterns: [sync-patterns.md](references/sync-patterns.md)
2. Read conflict resolution: [conflict-resolution.md](references/conflict-resolution.md)
3. Run the checker to verify sync implementation:
   ```bash
   node ./.opencode/skills/offline-sync-mobile/scripts/check-offline-sync.mjs
   ```

## 📚 References

- [Sync Patterns](references/sync-patterns.md) — local queue + background sync
- [Conflict Resolution](references/conflict-resolution.md) — 409 handling + user choice
- [`state-management`](../state-management/SKILL.md) — Zustand persist for offline store
- [`booking-scheduling-domain`](../booking-scheduling-domain/SKILL.md) — server-side conflict check
- [`background-jobs-queues`](../background-jobs-queues/SKILL.md) — retry strategy
