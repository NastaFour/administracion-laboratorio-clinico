# BullMQ Setup

## 1. Redis Configuration

```typescript
// apps/api/src/queues/redis.ts
import { IORedis } from "ioredis";

export const redisConnection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: true,
});
```

## 2. Queue Definition

```typescript
// apps/api/src/queues/queues.ts
import { Queue } from "bullmq";
import { redisConnection } from "./redis";

export const reminderQueue = new Queue("reminders", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export const noShowQueue = new Queue("no-show", {
  connection: redisConnection,
});

export const reviewQueue = new Queue("reviews", {
  connection: redisConnection,
});

export const aiReassignQueue = new Queue("ai-reassign", {
  connection: redisConnection,
});
```

## 3. Worker Definition

```typescript
// apps/api/src/queues/workers/reminder.worker.ts
import { Worker } from "bullmq";
import { redisConnection } from "../redis";
import { notificationService } from "../../services/notification.service";
import { prisma } from "../../db";

new Worker("reminders", async (job) => {
  const { bookingId, clientId } = job.data;

  // Idempotency: check booking still active
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true, barber: { include: { user: true } } },
  });

  if (!booking) return; // booking deleted, skip
  if (booking.status === "CANCELLED" || booking.status === "NO_SHOW") return; // already cancelled

  // Send reminder
  await notificationService.send(clientId, {
    template: `reminder-${job.name === "reminder-24h" ? "24h" : "1h"}`,
    data: {
      bookingId,
      serviceName: booking.service.name,
      barberName: booking.barber.user.name,
      startTime: booking.startTime,
    },
  });
}, {
  connection: redisConnection,
  concurrency: 5,
});
```

## 4. Retry Strategy

```typescript
defaultJobOptions: {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5000, // 5s, 10s, 20s
  },
  removeOnComplete: 100, // keep last 100 completed
  removeOnFail: 50,      // keep last 50 failed for debugging
}
```

## 5. Error Handling in Worker

```typescript
new Worker("reminders", async (job) => {
  try {
    // ... job logic
  } catch (error) {
    // Log error with correlation ID
    logger.error({ jobId: job.id, error: error.message }, "Reminder job failed");

    // Re-throw to trigger retry
    throw error;
  }
}, {
  connection: redisConnection,
});
```

## 6. Graceful Shutdown

```typescript
// On server shutdown
async function shutdown() {
  await reminderQueue.close();
  await noShowQueue.close();
  await reviewQueue.close();
  await aiReassignQueue.close();
  await redisConnection.quit();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
```

## 7. Monitoring

Use BullMQ Arena or Bull Board for a dashboard:

```typescript
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [
    new BullMQAdapter(reminderQueue),
    new BullMQAdapter(noShowQueue),
  ],
  serverAdapter,
});
app.use("/admin/queues", serverAdapter.getRouter());
```
