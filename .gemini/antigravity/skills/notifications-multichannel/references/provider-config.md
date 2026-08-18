# Provider Configuration

## 1. Push Notifications (Expo)

```typescript
// apps/api/src/services/providers/push.provider.ts
import { Expo } from "expo-server-sdk";

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

export async function sendPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  if (!Expo.isExpoPushToken(token)) {
    throw new Error(`Invalid Expo push token: ${token}`);
  }

  const messages = [{
    to: token,
    title,
    body,
    data,
    sound: "default",
    priority: "high",
  }];

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    await expo.sendPushNotificationsAsync(chunk);
  }
}
```

**Env vars**: `EXPO_ACCESS_TOKEN`

## 2. Email (Resend)

```typescript
// apps/api/src/services/providers/email.provider.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(
  to: string,
  subject: string,
  html: string
) {
  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "[APP] <noreply@app.example.com>",
    to,
    subject,
    html,
  });

  if (result.error) {
    throw new Error(`Email send failed: ${result.error.message}`);
  }

  return result.data;
}
```

**Env vars**: `RESEND_API_KEY`, `EMAIL_FROM`

### Email Bounce Handling

If an email bounces, mark the user's email as invalid:

```typescript
// Webhook endpoint for Resend bounce events
router.post("/webhooks/email-bounce", async (req, res) => {
  const { email, type } = req.body;
  if (type === "bounce" || type === "complaint") {
    await prisma.user.updateMany({
      where: { email },
      data: { emailVerified: false },
    });
  }
  res.json({ ok: true });
});
```

## 3. SMS (Twilio)

```typescript
// apps/api/src/services/providers/sms.provider.ts
import { Twilio } from "twilio";

const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendSMS(to: string, body: string) {
  const result = await client.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
    body,
  });

  if (result.errorCode) {
    throw new Error(`SMS send failed: ${result.errorMessage}`);
  }

  return result;
}
```

**Env vars**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

### SMS Rate Limiting

Twilio limits to ~1 SMS per second. Queue with BullMQ:

```typescript
// Process 1 SMS per second
new Worker("sms", async (job) => {
  await sendSMS(job.data.to, job.data.body);
}, {
  connection: redisConnection,
  concurrency: 1, // 1 at a time = 1/sec
});
```

## Unified NotificationService

```typescript
// apps/api/src/services/notification.service.ts
class NotificationService {
  async send(
    userId: string,
    options: {
      template: string;
      data: Record<string, unknown>;
      category?: "bookingUpdates" | "reminders" | "promotions";
    }
  ) {
    const channels = await resolveChannels(userId, options.category ?? "bookingUpdates");

    if (channels.length === 0) {
      logger.warn({ userId }, "No notification channels available for user");
      return;
    }

    // Queue for async delivery
    await notificationQueue.add("send", {
      userId,
      channels,
      template: options.template,
      data: options.data,
    }, {
      jobId: `notif-${userId}-${options.template}-${Date.now()}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 10000 },
    });
  }
}

export const notificationService = new NotificationService();
```

## Env Vars Checklist

| Var | Provider | Required |
|---|---|---|
| `EXPO_ACCESS_TOKEN` | Expo Push | Yes (if push) |
| `RESEND_API_KEY` | Resend Email | Yes (if email) |
| `EMAIL_FROM` | Resend Email | Yes (if email) |
| `TWILIO_ACCOUNT_SID` | Twilio SMS | Yes (if SMS) |
| `TWILIO_AUTH_TOKEN` | Twilio SMS | Yes (if SMS) |
| `TWILIO_PHONE_NUMBER` | Twilio SMS | Yes (if SMS) |
| `REDIS_URL` | BullMQ Queue | Yes (for async) |
