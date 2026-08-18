# [APP] Prisma Schema

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  BUYER
  EMPLOYEE
  DELIVERY
  ADMIN
}

enum OrderStatus {
  PENDING
  PACKING
  SHIPPED
  DELIVERED
  CANCELLED
}

model User {
  id       String   @id @default(uuid())
  email    String   @unique
  password String
  name     String
  role     Role     @default(BUYER)
  orders   Order[]
}

model Product {
  id        String      @id @default(uuid())
  name      String
  price     Float
  stock     Int
  imageUrl  String?
  category  String
  updatedAt DateTime    @updatedAt
  orderItems OrderItem[]
}

model Order {
  id              String      @id @default(uuid())
  buyerId         String
  buyer           User        @relation(fields: [buyerId], references: [id])
  total           Float
  status          OrderStatus @default(PENDING)
  deliveryAddress String
  createdAt       DateTime    @default(now())
  items           OrderItem[]
}

model OrderItem {
  id              String   @id @default(uuid())
  orderId         String
  order           Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId       String
  product         Product  @relation(fields: [productId], references: [id], onDelete: Restrict)
  quantity        Int
  priceAtPurchase Float
}
```
