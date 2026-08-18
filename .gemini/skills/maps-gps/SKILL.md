---
name: maps-gps
description: Implements real-time GPS delivery tracking. Covers map rendering in Expo, location streaming via Socket.io, and Zod-validated payload contracts. Use when building delivery tracking, courier location updates, or live map displays for buyer/courier/admin views.
license: MIT
compatibility: Requires Expo SDK 50+, pnpm 9+, Node 20+. Uses react-native-maps, expo-location, and a Socket.io backend.
metadata:
  trigger: ["mapa", "GPS", "tracking", "geolocalización", "delivery tracking", "real-time location"]
  scope: [global, project]
  version: "2.0.0"
allowed-tools: Read Edit Write Bash(pnpm:*) Bash(node:*)
---

# 🗺️ Maps & Real-Time GPS Tracking

Use this skill when implementing live delivery tracking (mobile + backend).

## 📋 When to Use

- Use when building a real-time courier location stream
- Use when rendering a delivery map for buyers, couriers, or admins
- Use when defining location payload contracts (Zod schemas)
- Do NOT use for static map embeds (use plain `react-native-maps` docs)

## 🚦 Hard Rules

- **Always** validate `driver:location:update` payloads with Zod before any socket relay
- **Always** throttle to max 1 emission per 5 seconds per driver
- **Always** verify the `orderId` belongs to the authenticated driver before broadcasting
- **Never** store GPS coordinates in LocalStorage or AsyncStorage
- **Never** use `any` in the location contract — use Zod-inferred types

## 🛠️ Workflow

1. **Define the contract** in `packages/contracts/src/location.ts` (Zod schema + inferred type)
2. **Driver emits** via `expo-location` `watchPositionAsync` (5s interval)
3. **Server validates** with Zod, then broadcasts to `order:<id>` room
4. **Buyer subscribes** via `useDeliveryTracker` hook
5. **Map renders** as pure presentational component (`<DeliveryMap />`)

## 📍 Mobile Map (Expo)

The map component is **pure presentational** — only receives `coords` and `route` as props. The socket subscription and GPS state live in a separate hook (`useDeliveryTracker`), respecting SRP.

```typescript
// hooks/useDeliveryTracker.ts  (Container — NO rendering)
import { useEffect, useState } from 'react';
import { socket } from '../lib/socket';
import { CoordinatesSchema, type Coordinates } from '@org/contracts/location';

export function useDeliveryTracker(orderId: string) {
  const [coords, setCoords] = useState<Coordinates | null>(null);

  useEffect(() => {
    const handler = (raw: unknown) => {
      const parsed = CoordinatesSchema.parse(raw);
      setCoords(parsed);
    };
    socket.on(`delivery:location:${orderId}`, handler);
    return () => { socket.off(`delivery:location:${orderId}`, handler); };
  }, [orderId]);

  return { coords };
}
```

## 📡 Stream GPS: Driver → Server → Buyer

```typescript
// Driver emits (every 5s, throttled)
import * as Location from 'expo-location';

const sub = await Location.watchPositionAsync(
  { accuracy: Location.Accuracy.High, timeInterval: 5000 },
  ({ coords }) => {
    socket.emit('driver:location:update', {
      orderId,
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
  }
);
// Cleanup: sub.remove() in useEffect return
```

```javascript
// Server relays (after Zod validation)
socket.on('driver:location:update', (data) => {
  const parsed = CoordinatesSchema.parse(data);
  io.to(`order:${parsed.orderId}`).emit(`delivery:location:${parsed.orderId}`, parsed);
});
```

## 🛡️ Security & Validation

All `driver:location:update` payloads are validated with Zod **before** any relay:

```typescript
// packages/contracts/src/location.ts
import { z } from 'zod';

export const CoordinatesSchema = z.object({
  orderId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().optional(),
  timestamp: z.number().int().positive().optional(),
});

export type Coordinates = z.infer<typeof CoordinatesSchema>;
```

Only drivers with valid JWT in the socket handshake can emit locations. Verify `orderId` ownership before broadcast.

## ⚡ Performance Rules

- **Throttle**: max 1 emission per 5 seconds per driver
- **Memo**: wrap `<DeliveryMap />` in `React.memo` to prevent re-renders
- **Cleanup**: always remove the location watcher and socket listener in `useEffect` return

## 📚 References

- [Expo Location](references/expo-location-permissions.md) — permissions, foreground/background modes
- [react-native-maps](references/react-native-maps-config.md) — config plugin and provider keys
- [Socket.io rooms](references/socket-room-pattern.md) — room naming for delivery tracking
- [Socket.io skill](../socketio/SKILL.md) — server-side socket setup
- [Socket.io skill](../socketio/SKILL.md) — Zod validation patterns for WebSocket payloads

## 🧪 Validation

Run before considering the feature done:

```bash
node ./05-frontend/maps-gps/scripts/validate-location-payload.mjs ./path/to/payload.json
```

Or in CI:

```bash
pnpm test --filter @org/mobile-app -- --grep "delivery"
```
