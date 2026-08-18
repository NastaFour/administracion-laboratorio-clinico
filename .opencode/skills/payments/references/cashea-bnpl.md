# Integración Cashea — Compra Ahora, Paga Después (BNPL)

Cashea es el sistema de crédito de consumo líder en Venezuela. Permite al usuario pagar una **Cuota Inicial** (40-60% del total) y el resto en 3 cuotas quincenales iguales.

## Flujo de Pago

1. Backend envía detalle de compra a la API de Cashea → solicitud
2. Cashea genera Deep Link
3. App móvil redirige al usuario:

```typescript
import { Linking } from 'react-native';

const casheaUrl = `cashea://checkout?token=${casheaToken}`;
const supported = await Linking.canOpenURL(casheaUrl);
if (supported) {
  await Linking.openURL(casheaUrl);
} else {
  await Linking.openURL(`https://checkout.cashea.com.ve/${casheaToken}`);
}
```

4. Cliente confirma y paga Cuota Inicial en app Cashea
5. Cashea envía Webhook al servidor del supermercado

## Webhook de Cashea

```typescript
// controllers/cashea-webhook.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import crypto from 'crypto';

export async function handleCasheaWebhook(req: Request, res: Response) {
  const signature = req.headers['x-cashea-signature'] as string;
  const rawBody = JSON.stringify(req.body);

  const expectedSignature = crypto
    .createHmac('sha256', process.env.CASHEA_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  const { orderId, transactionId, status } = req.body;

  if (status === 'COMPLETED') {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'PAID',
        receiptDetails: { casheaTxId: transactionId, paidAt: new Date().toISOString() }
      }
    });
    io.to('inventory:alerts').emit('order:payment-confirmed', { orderId });
  }

  return res.status(200).json({ received: true });
}
```
