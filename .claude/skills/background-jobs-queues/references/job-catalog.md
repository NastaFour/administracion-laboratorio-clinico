# Job Catalog

5+ job types for [APP] background processing.

## 1. Reminder 24h

**Trigger**: Booking created with `status: PENDING` or `ACCEPTED`
**Delay**: 24 hours before `booking.startTime`
**Action**: Send reminder notification to client (push + email)

```typescript
await reminderQueue.add("reminder-24h", {
  bookingId: booking.id,
  clientId: booking.clientId,
}, {
  delay: booking.startTime.getTime() - 24 * 60 * 60 * 1000 - Date.now(),
  jobId: `reminder-24h-${booking.id}`,
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 },
});
```

## 2. Reminder 1h

**Trigger**: Booking created with `status: ACCEPTED`
**Delay**: 1 hour before `booking.startTime`
**Action**: Send reminder to both client and barber

```typescript
await reminderQueue.add("reminder-1h", {
  bookingId: booking.id,
}, {
  delay: booking.startTime.getTime() - 60 * 60 * 1000 - Date.now(),
  jobId: `reminder-1h-${booking.id}`,
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 },
});
```

## 3. No-Show Timeout

**Trigger**: Booking transitions to `ACCEPTED`
**Delay**: `booking.startTime + 15 min tolerance`
**Action**: Check if barber arrived. If not → mark `NO_SHOW`, refund, offer reassignment

```typescript
await noShowQueue.add("no-show-check", {
  bookingId: booking.id,
}, {
  delay: booking.startTime.getTime() + 15 * 60 * 1000 - Date.now(),
  jobId: `no-show-${booking.id}`,
  attempts: 1, // don't retry no-show check
});
```

## 4. Review Request

**Trigger**: Booking transitions to `COMPLETED`
**Delay**: 30 minutes after completion (let client settle)
**Action**: Send push notification asking for review + rating

```typescript
await reviewQueue.add("review-request", {
  bookingId: booking.id,
  clientId: booking.clientId,
}, {
  delay: 30 * 60 * 1000,
  jobId: `review-${booking.id}`,
  attempts: 2,
});
```

## 5. AI Reassignment

**Trigger**: Barber rejects booking OR no-show detected
**Delay**: Immediate (no delay)
**Action**: AI routing agent finds best alternative barber based on proximity, rating, services

```typescript
await aiReassignQueue.add("suggest-alternative", {
  bookingId: booking.id,
  rejectedBarberId: booking.barberId,
}, {
  jobId: `reassign-${booking.id}`,
  attempts: 3,
  backoff: { type: "exponential", delay: 10000 },
});
```

## 6. Payment Retry

**Trigger**: Payment gateway returns transient error
**Delay**: Exponential backoff (1min, 5min, 15min)
**Action**: Retry payment processing

```typescript
await paymentQueue.add("retry-payment", {
  bookingId: booking.id,
  paymentMethod: booking.paymentMethod,
}, {
  jobId: `payment-${booking.id}`,
  attempts: 5,
  backoff: { type: "exponential", delay: 60000 },
});
```

## Job Cancellation

When a booking is cancelled, cancel all related scheduled jobs:

```typescript
async function cancelBookingJobs(bookingId: string) {
  await reminderQueue.remove(`reminder-24h-${bookingId}`);
  await reminderQueue.remove(`reminder-1h-${bookingId}`);
  await noShowQueue.remove(`no-show-${bookingId}`);
  await reviewQueue.remove(`review-${bookingId}`);
}
```
