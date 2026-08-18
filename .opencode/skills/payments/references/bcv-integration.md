# BCV Rate Integration & Multi-Currency Model

## Estructura de Base de Datos (Prisma)

El modelo de datos debe almacenar el total de la orden en USD, el total calculado en VES y la tasa de cambio de referencia:

```prisma
model Order {
  id               String         @id @default(uuid())
  buyerId          String
  totalUsd         Decimal        @db.Decimal(10, 2)
  totalVes         Decimal        @db.Decimal(10, 2)
  bcvRate          Decimal        @db.Decimal(10, 4)
  paymentMethod    PaymentMethod  // PAGO_MOVIL | CASHEA | CASH_USD
  paymentStatus    PaymentStatus  // PENDING_VERIFICATION | PAID | FAILED
  status           OrderStatus    // PENDING | PACKED | SHIPPED | DELIVERED
  deliveryAddress  String
  receiptDetails   Json?          // Datos de referencia de pago móvil o Cashea Token
  createdAt        DateTime       @default(now())
}
```

## BCVRateService

Servicio con caché en memoria de 2 horas y fallback seguro:

```typescript
// services/bcv.service.ts
import axios from 'axios';

let cachedRate: number | null = null;
let lastFetched: number = 0;
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 horas

export async function getActiveBcvRate(): Promise<number> {
  const now = Date.now();
  if (cachedRate && (now - lastFetched < CACHE_DURATION)) {
    return cachedRate;
  }
  try {
    const response = await axios.get('https://api.ve/tasa-bcv');
    cachedRate = Number(response.data.rate);
    lastFetched = now;
    return cachedRate;
  } catch (error) {
    console.error('Failed to fetch BCV rate, using fallback', error);
    return cachedRate || 50.00;
  }
}
```
