# Shared Schemas Convention

## Location

All validation schemas live in `packages/shared-types/src/schemas/`:

```
packages/shared-types/src/
├── schemas/
│   ├── auth.ts          # loginSchema, registerSchema
│   ├── booking.ts       # createBookingSchema, updateBookingSchema
│   ├── review.ts        # createReviewSchema
│   ├── profile.ts       # updateProfileSchema
│   └── index.ts         # re-exports all
├── types/
│   └── generated.ts     # Prisma-generated types
└── index.ts             # package entry
```

## Schema Structure

```typescript
// packages/shared-types/src/schemas/booking.ts
import { z } from "zod";

export const createBookingSchema = z.object({
  serviceId: z.string().cuid(),
  barberId: z.string().cuid().optional(), // optional: "any barber"
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().min(5),
  }),
  notes: z.string().max(500).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
```

## Importing

### Frontend (web + mobile)
```typescript
import { createBookingSchema, type CreateBookingInput } from "@scope/shared-types";
```

### Backend (API)
```typescript
import { createBookingSchema } from "@scope/shared-types";

router.post("/bookings", auth, async (req, res) => {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } });
  }
  // parsed.data is typed as CreateBookingInput
});
```

## Index File

```typescript
// packages/shared-types/src/schemas/index.ts
export * from "./auth";
export * from "./booking";
export * from "./review";
export * from "./profile";
```

```typescript
// packages/shared-types/src/index.ts
export * from "./schemas";
export * from "./types/generated";
```

## Anti-Pattern: Inline Schemas

**Never** define schemas inline in components or routes:

```typescript
// ❌ BAD — inline schema, not shared
const schema = z.object({ email: z.string().email() });

// ✅ GOOD — imported from shared-types
import { loginSchema } from "@scope/shared-types";
```

Inline schemas lead to:
- Duplicated validation logic (web vs mobile vs API)
- Inconsistent rules (web allows 6 char password, API requires 8)
- Maintenance burden (change in 3 places)
