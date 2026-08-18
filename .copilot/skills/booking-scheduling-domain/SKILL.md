---
name: booking-scheduling-domain
description: Core booking and scheduling logic for [APP] — slot availability, conflict detection with ACID transactions, no-show timeout protocol, and barber reassignment. Use when implementing createBooking, availability queries, slot management, or debugging double-booking race conditions.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+."
metadata:
  trigger: ["booking", "reserva", "slot", "availability", "disponibilidad", "conflict", "race condition", "double booking", "no-show", "no show", "reasignacion", "scheduling"]
  scope: [global, project]
  version: "1.0.0"
allowed-tools: Bash(node:*) Read
---

# 📅 Booking & Scheduling Domain

The heart of [APP]. Covers slot availability, conflict detection with ACID transactions, no-show timeout, and barber reassignment. Prevents the race condition where two clients book the same slot simultaneously.

## 📋 When to Use

- Use when implementing `createBooking`, `getAvailability`, or slot management
- Use when debugging double-booking or race conditions in booking creation
- Use when implementing no-show auto-cancel or barber reassignment
- Do NOT use for the booking UI (use `react-native` or `react-vite`)

## 🚦 Hard Rules

- **Always** use `$transaction` with conflict check inline when creating a booking
- **Never** check availability and create booking in separate queries (race condition)
- **Always** store all times in UTC in the database, convert to local for display
- **Always** account for service duration + buffer when calculating slot availability
- **Never** allow a booking that overlaps an existing active booking for the same barber

## 🛠️ Workflow

1. Read the slot logic rules: [slot-logic.md](references/slot-logic.md)
2. Read the conflict resolution pattern: [conflict-resolution.md](references/conflict-resolution.md)
3. Read the no-show protocol: [no-show-protocol.md](references/no-show-protocol.md)
4. Check type definitions: [types.md](references/types.md)
5. Run the checker to verify booking queries use transactions:
   ```bash
   node ./.opencode/skills/booking-scheduling-domain/scripts/check-booking-queries.mjs
   ```

## 📚 References

- [Slot Logic](references/slot-logic.md) — duration, buffer, horario laboral
- [Conflict Resolution](references/conflict-resolution.md) — ACID transaction + race condition diagram
- [No-Show Protocol](references/no-show-protocol.md) — timeout, auto-cancel, fee, reassignment
- [Types](references/types.md) — BookingSlot, AvailabilityWindow, ConflictCheck
- [`prisma-orm`](../prisma-orm/SKILL.md) — transaction patterns
- [`socketio`](../socketio/SKILL.md) — booking event broadcasting
- [`background-jobs-queues`](../background-jobs-queues/SKILL.md) — no-show timeout job
