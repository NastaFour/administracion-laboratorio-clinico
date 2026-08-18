---
name: payments
description: Checkout and payment flows for the Venezuela ecosystem in [APP]. Covers BCV USD/VES conversion, Pago Móvil (C2P or manual reference), Cashea BNPL, and ACID Prisma transactions. Use when implementing checkout, Pago Móvil, Cashea, or Venezuelan payment integrations. Do not use for international gateways (Stripe, PayPal).
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["pagos", "BCV", "pago móvil", "cashea", "checkout", "Venezuela"]
  scope: [global, project]
  version: "1.0.0"
---

# 🇻🇪 Pagos, Checkout y Multi-Moneda

Pipeline A del [[APP] Workflow](../application-workflow/SKILL.md). Implementa creación de órdenes, procesamiento de pagos venezolanos, e integraciones financieras.

---

## 📂 Referencias (cargar solo cuando se necesiten)

| Archivo | Contenido | Cuándo cargar |
|---|---|---|
| `references/bcv-integration.md` | Modelo Prisma multi-moneda + BCVRateService con caché | Al diseñar el schema de órdenes o integrar tasa BCV |
| `references/pago-movil-flows.md` | Checkout ACID transaction + Pago Móvil Manual + C2P | Al implementar checkout o integrar Pago Móvil |
| `references/cashea-bnpl.md` | Flujo Cashea BNPL + webhook criptográfico | Al integrar Cashea como método de pago |

---

## 🔒 Reglas de Negocio

- **Efectivo en Divisas**: Delivery cobra en destino, marca `PAID`.
- **Detección de Fraude**: Referencia duplicada en 30 días → banner rojo `[🔴 POSIBLE DUPLICADO]`.
- **Devoluciones**: Cashea → API de ajuste de cuotas. Pago Móvil → transferencia reversa o Nota de Crédito.

## 🧪 Checkpoints de Pruebas

- [ ] BCV: recuperación de tasa + fallback ante caída del servidor externo
- [ ] C2P: rollback de Prisma si OTP es rechazado por el banco
- [ ] Cashea Webhook: firma HMAC-SHA256 + actualización atómica de orden
- [ ] Prevención de Fraude: referencia duplicada dispara bandera roja

## 🔗 Skills relacionados

- `../postgresql/SKILL.md` — ACID transactions y integridad referencial
- `../prisma-orm/SKILL.md` — schema y migraciones
- `../socketio/SKILL.md` — notificaciones de pago confirmado
- `../maps-gps/SKILL.md` — tracking del delivery que cobra en destino
- `../application-workflow/SKILL.md` — Pipeline A completo
