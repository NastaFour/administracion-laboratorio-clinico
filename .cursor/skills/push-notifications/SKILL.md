---
name: push-notifications
description: Guía para implementar push notifications en la app móvil Expo del proyecto [APP]. Cubre alertas de estado del pedido (PENDING → PACKED → SHIPPED → DELIVERED), sustituciones de stock, y envío desde el servidor Node.js.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["push notifications", "expo push", "notificaciones", "alertas"]
  scope: [global, project]
  version: "1.0.0"
---

# 🔔 Push Notifications (Expo)

Usa este skill al implementar alertas de estado de pedido y notificaciones en tiempo real para el comprador.

---

## 📱 1. Registro del Push Token (App Móvil)

Solicita permisos y obtiene el token en el arranque de la app. Guárdalo en el backend para poder dirigir notificaciones al dispositivo correcto.

```typescript
// hooks/usePushNotifications.ts
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { api } from '../lib/api';

export function usePushNotifications(userId: string) {
  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;

      const { data: token } = await Notifications.getExpoPushTokenAsync();
      // Envía el token al backend para almacenarlo en el User
      await api.post('/api/users/push-token', { token });
    })();
  }, [userId]);
}
```

**Backend — Prisma schema** (agrega campo al modelo `User`):
```prisma
model User {
  // ... campos existentes
  pushToken String? // Token de Expo Push, puede ser null si el user no concedió permisos
}
```

---

## 📤 2. Envío desde el Servidor Node.js

Crea un servicio dedicado `NotificationService` que aísla toda la lógica de envío (SRP — ver [SOLID](../solid-clean-code/SKILL.md)):

```typescript
// services/notification.service.ts
import fetch from 'node-fetch';

type OrderStatus = 'PENDING' | 'PACKING' | 'SHIPPED' | 'DELIVERED' | 'STOCK_ALERT';

const STATUS_MESSAGES: Record<OrderStatus, string> = {
  PENDING:     '✅ ¡Tu pedido ha sido confirmado!',
  PACKING:     '📦 Tu pedido está siendo empacado.',
  SHIPPED:     '🚚 ¡Tu delivery está en camino!',
  DELIVERED:   '🏠 Pedido entregado. ¡Que lo disfrutes!',
  STOCK_ALERT: '⚠️ Un producto de tu pedido necesita sustitución. Toca para revisar.',
};

export class NotificationService {
  async sendOrderStatus(pushToken: string, status: OrderStatus, orderId: string): Promise<void> {
    if (!pushToken) return;

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: pushToken,
        title: '[APP]',
        body: STATUS_MESSAGES[status],
        data: { orderId, status },
        sound: 'default',
      }),
    });
  }
}
```

**Uso en el controlador de órdenes:**
```typescript
// Solo el controlador llama al servicio — nunca construye payloads directamente
await notificationService.sendOrderStatus(user.pushToken, 'SHIPPED', order.id);
```

---

## 🔗 3. Integración con el Flujo de Órdenes

Dispara notificaciones en cada cambio de estado del pedido:

| Evento | Quién dispara | Status enviado |
|---|---|---|
| Orden creada | `POST /api/orders` (checkout) | `PENDING` |
| Empleado empieza a empacar | Admin Panel → Socket.io | `PACKING` |
| Delivery asignado | Admin Panel → `SHIPPED` | `SHIPPED` |
| Driver marca entregado | App Driver | `DELIVERED` |
| Stock insuficiente detectado | AI Support / Empleado | `STOCK_ALERT` |

---

## 🛡️ 4. Seguridad y Límites

- Los payloads de notificación **nunca** deben incluir tokens JWT, contraseñas ni datos sensibles.
- Aplica rate-limiting de notificaciones por `orderId` (máx. 1 por evento) para evitar bucles de spam.
- Maneja errores del Expo Push Service silenciosamente — un fallo de notificación nunca debe bloquear la lógica de negocio.
