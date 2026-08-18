# Conflict Resolution

## When Conflicts Happen

A pending booking is synced after reconnection, but the slot was taken by another client while offline.

## Server Response: 409 Conflict

```json
{
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "Slot already booked",
    "details": {
      "suggestedSlots": [
        { "startTime": "2026-06-17T11:00:00Z", "endTime": "2026-06-17T11:30:00Z" }
      ]
    }
  }
}
```

## Client-Side Handling

```typescript
async function executeOperation(op: PendingOperation) {
  try {
    if (op.type === "CREATE_BOOKING") {
      await api.createBooking(op.payload);
    }
  } catch (error) {
    if (error.status === 409) {
      const suggestedSlots = error.details?.suggestedSlots ?? [];
      Alert.alert(
        "Slot no longer available",
        "The slot you selected was booked while you were offline. Choose an alternative?",
        [
          { text: "Cancel", onPress: () => removeOperation(op.id) },
          { text: "Choose", onPress: () => { router.navigate("/booking/select-slot", { suggestedSlots }); removeOperation(op.id); } },
        ]
      );
      return;
    }
    throw error;
  }
}
```

## Conflict Types

| Type | HTTP | Action |
|---|---|---|
| Slot taken | 409 | Show suggested slots |
| Booking cancelled | 410 | Remove from queue |
| Barber unavailable | 409 | Suggest alternative barbers |
| Price changed | 409 | Show new price, confirm |
