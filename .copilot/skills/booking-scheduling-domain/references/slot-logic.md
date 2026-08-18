# Slot Logic Rules

## 1. Slot Calculation

A slot is the smallest unit of bookable time for a barber. Slots are calculated based on:

- **Service duration**: Each `Service` has `durationMinutes` (e.g., 30, 60, 90 min)
- **Buffer**: Time between services for cleanup/travel. Default 15 min, configurable per barber.
- **Working hours**: `UserProfile.workingHours` — JSON with start/end per day of week

```typescript
interface WorkingHours {
  monday:    { start: string; end: string } | null; // "09:00", "18:00"
  tuesday:   { start: string; end: string } | null;
  // ... etc
}
```

## 2. Slot Generation Algorithm

```
For a given barber + date:
1. Get working hours for that day of week
2. If null (day off), return empty slots
3. Start from workingHours.start
4. While current + serviceDuration + buffer <= workingHours.end:
   - Generate slot { startTime: current, endTime: current + serviceDuration }
   - current += serviceDuration + buffer
5. Filter out slots that conflict with existing active bookings
```

## 3. Conflict Detection

A slot conflicts with an existing booking if:

```typescript
function hasConflict(
  slotStart: Date,
  slotEnd: Date,
  existingBookings: Booking[]
): boolean {
  return existingBookings.some(booking => {
    const bookingStart = booking.startTime;
    const bookingEnd = booking.endTime;
    // Overlap condition: slotStart < bookingEnd AND slotEnd > bookingStart
    return slotStart < bookingEnd && slotEnd > bookingStart;
  });
}
```

## 4. Exclusion Zones

Slots should be excluded if:

- **Day off**: Barber marked unavailable for that day (`BarberUnavailability`)
- **Holiday**: National holidays configured in system
- **Sick leave**: Barber marked sick (temporary unavailability)
- **Already booked**: Existing active booking overlaps
- **Too soon**: Slot is less than 1 hour from now (can't book same-hour)

## 5. Timezone Handling

- **DB stores UTC**: All `startTime` and `endTime` in database are UTC
- **Client sends local**: Mobile app sends ISO string with timezone offset
- **Server converts**: Normalize to UTC before storing/querying
- **Display converts**: API returns UTC, client converts to local for display

```typescript
// Client sends: "2026-06-17T10:00:00-04:00" (Caracas time)
// Server stores: "2026-06-17T14:00:00Z" (UTC)
// Client displays: converts back to "10:00 AM" local
```
