# Report Types

## 1. PDF Booking Receipt

**Who**: Client (after completed booking)
**Data**: Booking details, service, barber, price, payment method, date

```typescript
interface ReceiptData {
  bookingId: string;
  clientName: string;
  barberName: string;
  serviceName: string;
  date: string;
  price: { usd: number; ves: number };
  paymentMethod: string;
  paymentReference?: string;
}
```

## 2. CSV Revenue Report (Admin)

**Who**: Admin
**Data**: Daily/weekly/monthly revenue breakdown

```csv
date,booking_id,client,barber,service,amount_usd,amount_ves,payment_method,status
2026-06-17,abc123,Carlos,José,Corte,15.00,450.00,cash,COMPLETED
```

## 3. Barber Performance Report

**Who**: Admin / Barber
**Data**: Bookings completed, avg rating, revenue, no-show count

```typescript
interface BarberPerformance {
  barberId: string;
  barberName: string;
  period: { start: string; end: string };
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowCount: number;
  averageRating: number;
  totalRevenueUsd: number;
  totalRevenueVes: number;
}
```

## 4. Booking Summary Report

**Who**: Admin
**Data**: Bookings by status, by service, by barber

## 5. Client History Export

**Who**: Client (GDPR data portability)
**Data**: All bookings, reviews, payments for the client
