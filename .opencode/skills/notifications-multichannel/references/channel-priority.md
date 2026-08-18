# Channel Priority Logic

## Default Priority

```
1. Push (if user has app installed + push token)
2. SMS  (if user has verified phone)
3. Email (if user has email)
```

## User Preferences

Users can override the default priority in their profile:

```typescript
interface NotificationPreferences {
  pushEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  // Per-category overrides
  bookingUpdates: ("push" | "sms" | "email")[];
  reminders: ("push" | "sms" | "email")[];
  promotions: ("push" | "sms" | "email")[];
}
```

## Resolution Algorithm

```typescript
async function resolveChannels(
  userId: string,
  category: "bookingUpdates" | "reminders" | "promotions"
): Promise<NotificationChannel[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      phone: true,
      phoneVerified: true,
      pushToken: true,
      notificationPreferences: true,
    },
  });

  if (!user) return [];

  const prefs = user.notificationPreferences as NotificationPreferences;
  const preferredOrder = prefs[category] ?? ["push", "sms", "email"];

  const channels: NotificationChannel[] = [];

  for (const channel of preferredOrder) {
    if (channel === "push" && prefs.pushEnabled && user.pushToken) {
      channels.push({ type: "push", token: user.pushToken });
    }
    if (channel === "sms" && prefs.smsEnabled && user.phone && user.phoneVerified) {
      channels.push({ type: "sms", phone: user.phone });
    }
    if (channel === "email" && prefs.emailEnabled && user.email) {
      channels.push({ type: "email", email: user.email });
    }
  }

  return channels;
}
```

## Fallback Behavior

If the primary channel fails, try the next:

```typescript
async function sendWithFallback(
  channels: NotificationChannel[],
  template: string,
  data: Record<string, unknown>
): Promise<NotificationResult> {
  for (const channel of channels) {
    try {
      const result = await sendToChannel(channel, template, data);
      await logNotification(channel, template, "sent", result);
      return result;
    } catch (error) {
      await logNotification(channel, template, "failed", { error: error.message });
      // Continue to next channel
    }
  }

  // All channels failed
  await logNotification(null, template, "all_failed", { channels: channels.map(c => c.type) });
  throw new Error("All notification channels failed");
}
```

## NotificationLog

Every attempt (success or failure) is logged:

```typescript
interface NotificationLog {
  id: string;
  userId: string;
  channel: "push" | "sms" | "email";
  template: string;
  status: "sent" | "failed" | "all_failed";
  error?: string;
  createdAt: string;
}
```

This enables:
- Retry failed notifications
- Analytics (delivery rate per channel)
- User preference suggestions ("You never open push, switch to SMS?")
