# Conflict Resolution — ACID Transaction Pattern

## The Race Condition

```
Client A: checks availability → slot 10:00 is free ✓
Client B: checks availability → slot 10:00 is free ✓
Client A: creates booking for 10:00 ✓
Client B: creates booking for 10:00 ✓ → DOUBLE BOOKING!
```

## The Fix: Inline Conflict Check in Transaction

```typescript
async function createBooking(input: BookingInput): Promise<Booking> {
  return prisma.$transaction(async (tx) => {
    // 1. Check for conflicts INSIDE the transaction
    const conflicting = await tx.booking.findFirst({
      where: {
        barberId: input.barberId,
        status: { in: ["PENDING", "ACCEPTED", "EN_RUTA", "ARRIVED"] },
        AND: [
          { startTime: { lt: input.endTime } },
          { endTime: { gt: input.startTime } },
        ],
      },
    });

    if (conflicting) {
      throw new ConflictError("Slot already booked", {
        conflictingBookingId: conflicting.id,
        suggestedSlots: await suggestAlternativeSlots(tx, input),
      });
    }

    // 2. Create the booking (within same transaction)
    const booking = await tx.booking.create({
      data: {
        barberId: input.barberId,
        clientId: input.clientId,
        serviceId: input.serviceId,
        startTime: input.startTime,
        endTime: input.endTime,
        status: "PENDING",
        location: input.location,
      },
    });

    return booking;
  }, {
    isolationLevel: "Serializable", // highest isolation, prevents phantom reads
  });
}
```

## Why This Works

```
Transaction A (Serializable):
  1. SELECT booking WHERE overlap → none found
  2. INSERT booking
  3. COMMIT

Transaction B (Serializable, concurrent):
  1. SELECT booking WHERE overlap → finds A's insert (or blocks until A commits)
  2. Throws ConflictError
  3. ROLLBACK
```

With `Serializable` isolation level, the database ensures that if two transactions both read "no conflict", one of them will fail on commit. The inline check + transaction makes it impossible to double-book.

## Alternative: SELECT FOR UPDATE

If `Serializable` is too expensive (lock contention), use `SELECT FOR UPDATE`:

```typescript
const conflicting = await tx.$queryRaw`
  SELECT * FROM "Booking"
  WHERE "barberId" = ${input.barberId}
    AND status IN ('PENDING', 'ACCEPTED', 'EN_RUTA', 'ARRIVED')
    AND "startTime" < ${input.endTime}
    AND "endTime" > ${input.startTime}
  FOR UPDATE
`;
```

This locks the matching rows, preventing concurrent inserts.

## Error Response

```json
{
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "Slot already booked",
    "details": {
      "conflictingBookingId": "abc123",
      "suggestedSlots": [
        { "startTime": "2026-06-17T11:00:00Z", "endTime": "2026-06-17T11:30:00Z" },
        { "startTime": "2026-06-17T11:45:00Z", "endTime": "2026-06-17T12:15:00Z" }
      ]
    }
  }
}
```
