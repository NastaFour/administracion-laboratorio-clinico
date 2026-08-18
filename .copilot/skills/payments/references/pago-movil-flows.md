# Pago Móvil Interbancario — Flujos

## 1. Checkout ACID (Carrito → Orden)

```typescript
// repositories/order.repository.ts
import { prisma } from '../lib/prisma.js';
import { getActiveBcvRate } from '../services/bcv.service.ts';

export async function createOrder(
  buyerId: string,
  items: Array<{ productId: string; quantity: number }>,
  deliveryAddress: string,
  paymentMethod: 'PAGO_MOVIL' | 'CASHEA' | 'CASH_USD'
) {
  const bcvRate = await getActiveBcvRate();

  return prisma.$transaction(async (tx) => {
    let totalUsd = 0;
    for (const item of items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new Error(`Product ${item.productId} not found`);
      if (product.stock < item.quantity) throw new Error(`Insufficient stock: ${product.name}`);
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
      totalUsd += Number(product.price) * item.quantity;
    }
    const totalVes = totalUsd * bcvRate;
    return tx.order.create({
      data: {
        buyerId, totalUsd, totalVes, bcvRate, paymentMethod,
        paymentStatus: 'PENDING_VERIFICATION',
        status: 'PENDING',
        items: { create: items.map(i => ({ productId: i.productId, quantity: i.quantity })) },
      },
    });
  });
}
```

## 2. Pago Móvil Manual (Registro de Referencia)

Schema Zod para validar referencias de pago móvil:

```typescript
// schemas/pago-movil.schema.ts
import { z } from 'zod';

export const RegisterPagoMovilSchema = z.object({
  orderId: z.string().uuid(),
  bankCode: z.string().length(4),
  phoneNumber: z.string().regex(/^04(12|14|16|24|26)\d{7}$/),
  idNumber: z.string().regex(/^(V|E|J|G)\d{5,9}$/),
  referenceNumber: z.string().regex(/^\d{4,8}$/),
  paymentDate: z.string().datetime(),
});
```

## 3. Pago Móvil C2P (Comercio a Persona)

```typescript
// services/payment-gateway.service.ts
export interface C2PPaymentInput {
  phone: string;
  idNumber: string;
  bankCode: string;
  otpCode: string;
  amountVes: number;
}

export class BanescoC2PGateway {
  async processC2P(input: C2PPaymentInput): Promise<{ success: boolean; bankReference: string }> {
    const response = await axios.post('https://api.banesco.com/c2p/v1/payment', {
      comercioPhone: process.env.MERCHANT_PHONE,
      comercioId: process.env.MERCHANT_RIF,
      clientePhone: input.phone,
      clienteId: input.idNumber,
      clienteBanco: input.bankCode,
      otp: input.otpCode,
      monto: input.amountVes,
    }, { headers: { Authorization: `Bearer ${process.env.BANESCO_API_KEY}` } });

    if (response.data.status === 'APPROVED') {
      return { success: true, bankReference: response.data.reference };
    }
    throw new Error('Pago Móvil C2P rechazado por el banco emisor');
  }
}
```
