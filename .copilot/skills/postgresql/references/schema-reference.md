# [APP] DB Schema (SQL)

```sql
CREATE TABLE "User" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "password" VARCHAR(255) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "role" VARCHAR(50) NOT NULL CHECK ("role" IN ('BUYER', 'EMPLOYEE', 'DELIVERY', 'ADMIN'))
);

CREATE TABLE "Product" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "price" DECIMAL(10, 2) NOT NULL CHECK ("price" > 0),
  "stock" INT NOT NULL CHECK ("stock" >= 0),
  "imageUrl" VARCHAR(1024),
  "category" VARCHAR(100) NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Order" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "buyerId" UUID NOT NULL REFERENCES "User"("id"),
  "total" DECIMAL(10, 2) NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'PACKING', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
  "deliveryAddress" TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "OrderItem" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
  "productId" UUID NOT NULL REFERENCES "Product"("id") ON DELETE RESTRICT,
  "quantity" INT NOT NULL CHECK ("quantity" > 0),
  "priceAtPurchase" DECIMAL(10, 2) NOT NULL
);
```
