# Report Generation Patterns

## PDF Generation (PDFKit)

```typescript
import PDFDocument from "pdfkit";
import { PassThrough } from "node:stream";

async function generateReceiptPdf(data: ReceiptData): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A5", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.fontSize(20).text("[APP]", { align: "center" });
    doc.fontSize(12).text("Recibo de Servicio", { align: "center" });
    doc.moveDown();
    doc.fontSize(10)
      .text(`Cliente: ${data.clientName}`)
      .text(`Barbero: ${data.barberName}`)
      .text(`Servicio: ${data.serviceName}`)
      .text(`Fecha: ${data.date}`)
      .moveDown()
      .text(`Monto USD: $${data.price.usd}`)
      .text(`Monto VES: Bs. ${data.price.ves}`)
      .text(`Pago: ${data.paymentMethod}`)
      .moveDown()
      .fontSize(8).text(`ID: ${data.bookingId}`, { align: "center" });

    doc.end();
  });
}
```

## CSV Streaming (large datasets)

```typescript
import { stringify } from "csv-stringify";
import { pipeline } from "node:stream/promises";

async function exportRevenueCsv(startDate: Date, endDate: Date, res: Response) {
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="revenue-${startDate.toISOString()}.csv"`);

  const cursor = prisma.booking.findMany({
    where: { status: "COMPLETED", createdAt: { gte: startDate, lte: endDate } },
    select: { id: true, clientId: true, barberId: true, serviceId: true, priceUsd: true, priceVes: true, paymentMethod: true },
    cursor: { id: undefined },
    take: 1000,
    skip: 0,
  });

  const stringifier = stringify({ header: true, columns: ["date", "booking_id", "client", "barber", "service", "amount_usd", "amount_ves", "payment_method", "status"] });

  // Stream rows
  for await (const batch of cursor) {
    for (const row of batch) {
      stringifier.write([row.createdAt, row.id, row.clientId, row.barberId, row.serviceId, row.priceUsd, row.priceVes, row.paymentMethod, "COMPLETED"]);
    }
  }
  stringifier.end();
  await pipeline(stringifier, res);
}
```

## Background Job for Large Reports

```typescript
// Queue report generation
await reportQueue.add("generate-report", {
  type: "revenue-csv",
  params: { startDate, endDate },
  userId: req.user.id,
  email: req.user.email,
}, {
  jobId: `report-${req.user.id}-${Date.now()}`,
  attempts: 3,
});

// Worker generates + emails the report
new Worker("reports", async (job) => {
  const buffer = await generateRevenueCsv(job.data.params);
  const url = await uploadToS3(buffer, `reports/${job.data.userId}-${Date.now()}.csv`);
  await notificationService.send(job.data.userId, {
    template: "report-ready",
    data: { url, reportType: job.data.type },
  });
});
```

## Prisma Aggregate Queries

```typescript
// Revenue by day
const revenue = await prisma.booking.groupBy({
  by: ["createdAt"],
  where: { status: "COMPLETED", createdAt: { gte: startDate, lte: endDate } },
  _sum: { priceUsd: true, priceVes: true },
  _count: true,
  orderBy: { createdAt: "asc" },
});

// Barber performance
const performance = await prisma.booking.groupBy({
  by: ["barberId"],
  where: { status: "COMPLETED", createdAt: { gte: startDate, lte: endDate } },
  _sum: { priceUsd: true },
  _count: true,
  _avg: { rating: true },
});
```
