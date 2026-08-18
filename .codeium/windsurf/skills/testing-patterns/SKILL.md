---
name: testing-patterns
description: Unit, integration, and E2E testing patterns for the ecosystem. Use when writing tests with Vitest, Supertest, or React Native Testing Library. Do not use for load testing, pentesting, or security audits.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["escribir tests", "crear pruebas", "unit test", "integration test", "e2e", "vitest", "jest", "supertest", "coverage"]
  scope: [global, project]
  version: "1.0.0"
---

# 🧪 Testing Patterns — [APP]

Usa este skill al escribir cualquier tipo de test automatizado para el monorepo del supermercado. Sigue los patrones establecidos para mantener consistencia entre backend, admin panel, y app móvil.

---

## 🏛️ Stack de Testing por Capa

| Capa | Framework | Runner | Mocking | Ubicación |
|---|---|---|---|---|
| Backend (Express) | Vitest + Supertest | Vitest | `vi.mock` / MSW | `apps/backend/__tests__/` |
| Admin Panel (React/Vite) | Vitest + React Testing Library | Vitest | `vi.mock` / MSW | `apps/admin-panel/src/__tests__/` |
| Móvil (Expo) | Jest + React Native Testing Library | Jest | `jest.mock` | `apps/mobile-app/__tests__/` |
| Tipos compartidos | Vitest | Vitest | `vi.mock` | `packages/shared-types/__tests__/` |

---

## 📋 Estructura de Archivos de Test

```
apps/backend/__tests__/
├── unit/
│   ├── services/
│   │   └── bcv.service.test.ts
│   └── middleware/
│       └── auth.test.ts
├── integration/
│   ├── routes/
│   │   └── orders.test.ts
│   └── socket/
│       └── delivery.test.ts
└── fixtures/
    ├── users.ts
    └── products.ts
```

**Reglas:**
- Nombres de archivo: `*.test.ts` o `*.spec.ts` (elegir uno y mantener consistencia)
- Fixtures en `__tests__/fixtures/`, nunca hardcodeados inline
- Cada `describe` debe cubrir una función o ruta específica

---

## ✅ Cobertura Obligatoria (6 escenarios)

Cada feature debe tener tests que cubran:

1. **Happy Path** — flujo normal esperado (mínimo 2 tests)
2. **Edge Cases** — inputs vacíos, null, negativos, caracteres especiales (mínimo 3)
3. **Auth/Seguridad** — requests sin JWT bloqueados, socket handshake rechazado sin token
4. **Real-time Cleanup** — sockets cierran correctamente, listeners detach en unmount
5. **Integridad DB** — rollback completo si un item falla en transacción ACID
6. **Regresión SOLID** — ninguna función > 40 líneas, cero `any`, sin lógica duplicada

---

## 🔧 Patrones de Test

### Backend: Jest + Supertest

```typescript
// apps/backend/__tests__/integration/routes/orders.test.ts
import request from 'supertest';
import { app } from '../../../src/app';
import { prisma } from '../../../src/lib/prisma';
import { createTestUser, generateToken } from '../../fixtures/users';

describe('POST /api/orders', () => {
  let buyerToken: string;

  beforeAll(async () => {
    const buyer = await createTestUser({ role: 'BUYER' });
    buyerToken = generateToken(buyer);
  });

  afterAll(async () => {
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it('debe crear una orden y reducir stock en transacción ACID', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        items: [{ productId: 'prod-1', quantity: 2 }],
        deliveryAddress: 'Calle 123, Caracas',
        paymentMethod: 'PAGO_MOVIL',
      });

    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe('PENDING');
    expect(res.body.order.totalUsd).toBeGreaterThan(0);
  });

  it('debe hacer rollback si stock insuficiente', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        items: [{ productId: 'prod-1', quantity: 99999 }],
        deliveryAddress: 'Calle 123',
        paymentMethod: 'PAGO_MOVIL',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Insufficient stock');
  });

  it('debe rechazar request sin JWT', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ items: [], deliveryAddress: 'test' });

    expect(res.status).toBe(401);
  });
});
```

### Frontend Admin: React Testing Library + Vitest

```typescript
// apps/admin-panel/src/__tests__/InventoryTable.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { InventoryTable } from '../components/InventoryTable';
import { vi } from 'vitest';

describe('InventoryTable', () => {
  const mockProducts = [
    { id: '1', name: 'Leche', stock: 10, price: 2.5, category: 'Lácteos' },
  ];

  it('debe mostrar productos y permitir actualizar stock', () => {
    const onUpdate = vi.fn();
    render(<InventoryTable products={mockProducts} onStockUpdate={onUpdate} />);

    expect(screen.getByText('Leche')).toBeDefined();
    fireEvent.click(screen.getByText('-1'));
    expect(onUpdate).toHaveBeenCalledWith('1', -1);
  });

  it('debe mostrar estado vacío cuando no hay productos', () => {
    render(<InventoryTable products={[]} onStockUpdate={vi.fn()} />);
    expect(screen.getByText(/sin productos/i)).toBeDefined();
  });
});
```

### Móvil: React Native Testing Library

```typescript
// apps/mobile-app/__tests__/CatalogScreen.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { CatalogScreen } from '../app/(tabs)/catalog';

describe('CatalogScreen', () => {
  it('debe renderizar FlatList con productos', () => {
    const { getByText } = render(<CatalogScreen />);
    expect(getByText('Catálogo')).toBeDefined();
  });
});
```

---

## 🎯 Métricas de Calidad

- **Cobertura mínima**: 80% (statements, branches, functions, lines)
- **Sin tests flaky**: 0 fallos en CI por intermittencia
- **Velocidad**: suite completa de backend < 30s, admin < 15s, mobile < 60s
- Consultar `../02-dev-roles/qa-tester/SKILL.md` para los 6 escenarios obligatorios.
- Consultar `../02-dev-roles/dod-checker/SKILL.md` para el gate de calidad.
