# API Response Envelope Convention

## 1. Response Envelope

All API responses must use this envelope:

```typescript
interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    total?: number;
    nextCursor?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}
```

### Success Example

```json
{
  "data": { "id": "abc", "name": "Carlos Barber" },
  "meta": { "page": 1, "total": 42 }
}
```

### Error Example

```json
{
  "error": { "code": "BARBER_NOT_FOUND", "message": "Barber with id abc not found" }
}
```

## 2. ID Consistency Rules

**Rule**: An endpoint `GET /barbers/:id` must filter by `where: { id: req.params.id }`, NOT by `where: { userId: req.params.id }`.

### Bug #5 Example (Barber ID mismatch)

**Wrong** (caused bug #5):
```typescript
// Frontend sends barber.id (UserProfile ID)
// Backend filters by userId (User ID) → "Barber not found"
router.get("/:id", (req, res) => {
  const barber = await prisma.barberProfile.findFirst({
    where: { userId: req.params.id } // WRONG: req.params.id is UserProfile ID
  });
});
```

**Correct**:
```typescript
router.get("/:id", (req, res) => {
  const barber = await prisma.barberProfile.findUnique({
    where: { id: req.params.id } // CORRECT: filter by the same ID from URL
  });
});
```

### Rule Summary

| Endpoint | URL Param | `where` field |
|---|---|---|
| `GET /barbers/:id` | `:id` = UserProfile ID | `id: req.params.id` |
| `GET /users/:id` | `:id` = User ID | `id: req.params.id` |
| `GET /barbers/:id/reviews` | `:id` = UserProfile ID | `barberId: req.params.id` (or join) |

**Never** mix: if URL says `:id`, filter by `id`. If URL says `:userId`, filter by `userId`.

## 3. Helper Functions for Nested/Flat Fields

Bug #4: Frontend accessed `barber.profile?.rating` but API returned flat UserProfile with `user` nested. Helpers handle both shapes:

```typescript
import type { UserProfile, User } from "@scope/shared-types";

type MaybeBarber = {
  id?: string;
  user?: Partial<User>;
  userId?: string;
  name?: string;
  avatar?: string;
  rating?: number;
  lat?: number;
  lng?: number;
  profile?: { rating?: number; lat?: number; lng?: number };
};

export function getBarberName(barber: MaybeBarber): string {
  return barber.user?.name ?? barber.name ?? "Unknown";
}

export function getBarberAvatar(barber: MaybeBarber): string {
  return barber.user?.avatar ?? barber.avatar ?? "";
}

export function getBarberRating(barber: MaybeBarber): number {
  return barber.profile?.rating ?? barber.rating ?? 0;
}

export function getBarberLat(barber: MaybeBarber): number {
  return barber.profile?.lat ?? barber.lat ?? 0;
}

export function getBarberLng(barber: MaybeBarber): number {
  return barber.profile?.lng ?? barber.lng ?? 0;
}
```

## 4. Prisma Relation Shaping

Bug #6: Prisma returns `UserGallery[]` (objects `{id, imageUrl, caption}`) but frontend treated as `string[]`.

**Wrong**:
```typescript
// Frontend assumed strings
gallery.map((img: string) => <img src={img} />) // Shows [object Object]
```

**Correct**:
```typescript
// Frontend uses the typed relation
gallery.map((img: UserGallery) => <img src={img.imageUrl} alt={img.caption} />)
```

**Backend should shape relations**:
```typescript
// In the service/controller, map to a clean shape
const barber = await prisma.barberProfile.findUnique({
  where: { id },
  include: { user: true, gallery: true }
});

return {
  data: {
    id: barber.id,
    name: barber.user.name,
    avatar: barber.user.avatar,
    gallery: barber.gallery.map(g => ({ id: g.id, imageUrl: g.imageUrl, caption: g.caption })),
  }
};
```
