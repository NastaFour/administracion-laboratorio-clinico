# Booking Domain Types

```typescript
/** A bookable time slot for a barber */
interface BookingSlot {
  startTime: string; // ISO 8601 UTC
  endTime: string;   // ISO 8601 UTC
  barberId: string;
  available: boolean;
  conflictReason?: string; // if not available, why
}

/** A barber's working window for a specific day */
interface AvailabilityWindow {
  barberId: string;
  date: string; // YYYY-MM-DD
  start: string; // ISO 8601 UTC
  end: string;   // ISO 8601 UTC
  slots: BookingSlot[];
}

/** Result of a conflict check */
interface ConflictCheck {
  hasConflict: boolean;
  conflictingBookingId?: string;
  suggestedSlots?: BookingSlot[];
}

/** Input for creating a booking */
interface BookingInput {
  barberId: string;
  clientId: string;
  serviceId: string;
  startTime: string; // ISO 8601 UTC
  endTime: string;   // ISO 8601 UTC
  location: {
    lat: number;
    lng: number;
    address: string;
  };
}

/** Working hours for a barber per day of week */
interface WorkingHours {
  monday:    { start: string; end: string } | null;
  tuesday:   { start: string; end: string } | null;
  wednesday: { start: string; end: string } | null;
  thursday:  { start: string; end: string } | null;
  friday:    { start: string; end: string } | null;
  saturday:  { start: string; end: string } | null;
  sunday:    { start: string; end: string } | null;
}

/** Temporary unavailability (sick, vacation, etc.) */
interface BarberUnavailability {
  barberId: string;
  start: string; // ISO 8601 UTC
  end: string;   // ISO 8601 UTC
  reason: string;
}
```
