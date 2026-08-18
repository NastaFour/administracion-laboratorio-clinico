# Prisma → Frontend Type Mapping Rules

## Mapping Table

| Prisma Type | Frontend TS Type | Notes |
|---|---|---|
| `String` | `string` | Direct mapping |
| `Int` | `number` | Direct mapping |
| `BigInt` | `number` | Direct mapping |
| `Boolean` | `boolean` | Direct mapping |
| `Float` | `number` | Direct mapping |
| `Decimal` | `string` | Avoid float precision issues; use string |
| `DateTime` | `string` | ISO 8601 string (`"2026-06-17T..."`) |
| `Json` | `unknown` | **Never `any`** — validate with Zod at runtime |
| `Bytes` | `string` | Base64-encoded |
| `BigInt` | `string` | Serialize as string for JSON |
| `Enum` | `union of string literals` | e.g., `"PENDING" \| "ACCEPTED" \| "EN_RUTA"` |
| `Relation (1:1)` | `T` (the related model type) | Single object |
| `Relation (1:N)` | `T[]` (array of related model type) | **Never `string[]`** |
| `Optional field` | `T \| undefined` | Add `?` in interface |
| `List field` | `T[]` | Array |

## Critical Rule: Relations are Objects, Not Strings

**Bug #6 root cause**: `UserGallery[]` is an array of objects, not an array of strings.

```prisma
// schema.prisma
model UserProfile {
  gallery UserGallery[]
}

model UserGallery {
  id        String   @id @default(cuid())
  imageUrl  String
  caption   String?
  barber    UserProfile @relation(fields: [barberId], references: [id])
  barberId  String
}
```

**Wrong** (frontend):
```typescript
interface UserProfile {
  gallery: string[]; // WRONG: treats objects as strings → [object Object]
}
```

**Correct** (frontend):
```typescript
interface UserGallery {
  id: string;
  imageUrl: string;
  caption?: string;
}

interface UserProfile {
  gallery: UserGallery[]; // CORRECT: typed objects
}
```

## Json Field Handling

```prisma
model Booking {
  metadata Json
}
```

**Frontend type**:
```typescript
interface Booking {
  metadata: unknown; // Never any
}

// Runtime validation with Zod
const MetadataSchema = z.object({
  paymentMethod: z.enum(["cash", "pagomovil", "cashea"]),
  reference: z.string().optional(),
});

type BookingMetadata = z.infer<typeof MetadataSchema>;
```

## Enum Mapping

```prisma
enum BookingStatus {
  PENDING
  ACCEPTED
  EN_RUTA
  ARRIVED
  COMPLETED
  CANCELLED
  REJECTED
  NO_SHOW
}
```

**Frontend type**:
```typescript
type BookingStatus =
  | "PENDING"
  | "ACCEPTED"
  | "EN_RUTA"
  | "ARRIVED"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED"
  | "NO_SHOW";
```

## Soft-Delete Fields

Fields like `deletedAt` should be omitted from public response types:

```typescript
// Internal type (backend only)
interface UserProfileInternal {
  id: string;
  name: string;
  deletedAt?: string; // present in backend
}

// Public type (shared-types, frontend)
interface UserProfile {
  id: string;
  name: string;
  // deletedAt omitted — never exposed to frontend
}
```

## Generation Strategy

The generator script (`generate-frontend-types.mjs`) parses `schema.prisma`:

1. Reads `model` blocks
2. For each field, maps the Prisma type → TS type using the table above
3. Skips `deletedAt` and other `@map`-annotated internal fields
4. Outputs interfaces to `packages/shared-types/src/generated.ts`
5. Frontend imports from `@scope/shared-types`
