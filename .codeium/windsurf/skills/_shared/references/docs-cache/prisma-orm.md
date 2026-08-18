# Prisma ORM L1 Documentation Cache

Este documento sirve como caché local L1 para evitar llamadas innecesarias o fallas de red con Context7 MCP.

## 🔌 Connection Pooling & Serverless Safety

En entornos serverless (como Vercel/Next.js Server Actions o AWS Lambda), la creación descontrolada de instancias del cliente de Prisma puede agotar rápidamente el pool de conexiones de la base de datos PostgreSQL.

### 1. Cliente Singleton en Desarrollo
Usa un objeto global para evitar recrear la instancia del cliente en cada recarga de código en desarrollo (Fast Refresh):
```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### 2. Connection Limit en URI
Configura siempre el límite del pool en la variable de entorno de tu base de datos:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public&connection_limit=10"
```

---

## 📐 Esquemas Relacionales Clave

### 1. Relación Uno a Muchos (1:N)
```prisma
model User {
  id    Int    @id @default(autoincrement())
  posts Post[]
}

model Post {
  id       Int    @id @default(autoincrement())
  title    String
  authorId Int
  author   User   @relation(fields: [authorId], references: [id], onDelete: Cascade)
}
```

### 2. Relación Muchos a Muchos Explicita (N:M con Tabla Intermedia)
Recomendada para poder almacenar atributos adicionales en la relación (ej. fecha de asignación).
```prisma
model User {
  id    Int        @id @default(autoincrement())
  roles UserRole[]
}

model Role {
  id    Int        @id @default(autoincrement())
  name  String     @unique
  users UserRole[]
}

model UserRole {
  userId     Int
  roleId     Int
  assignedAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
}
```

---

## ⚠️ Mitigación de Errores de Serialización (JSON Mismatch)

Prisma devuelve tipos enriquecidos de JS (como instancias de `Date` y enteros grandes `BigInt`). Al pasarlos a través de los límites de red en Next.js (Server Actions) o Express API, la serialización JSON puede fallar o perder precisión.

### Solución
Utilizar esquemas Zod o transformadores manuales para formatear fechas y números antes de enviarlos al cliente:
```typescript
// En el backend/Server Action
export async function getUser(id: number) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return null;

  return {
    ...user,
    createdAt: user.createdAt.toISOString(), // Serializar Date a String ISO
  };
}
```
