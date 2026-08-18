---
name: hexagonal-architecture-layers-java
description: >
  Hexagonal (Ports & Adapters) architecture for Java — domain, application, and infrastructure
  layers with strict dependency rules. Trigger when designing or reviewing a Java service
  that needs clean separation between business logic and infrastructure, or when the user
  mentions "clean architecture", "hexagonal", "ports and adapters", or "domain layer".
license: MIT
compatibility: "Works with Claude Code, Cursor, Gemini, and any other agentskills.io compatible agent. Requires Java 17+."
allowed-tools: Read
metadata:
  author: gentleman-programming
  version: "1.0"
  category: 02-dev-roles
  tags: [hexagonal, clean-architecture, java, ports, adapters, domain, ddd]
---

# Hexagonal Architecture — Java Layers

## Layer Structure

```
src/main/java/com/acme/
├── domain/                    ← Pure business logic. No framework deps.
│   ├── model/                 ← Entities, Value Objects, Aggregates
│   ├── port/
│   │   ├── in/                ← Use case interfaces (driving ports)
│   │   └── out/               ← Repository/service interfaces (driven ports)
│   └── exception/             ← Domain exceptions
│
├── application/               ← Orchestrates domain. Framework-agnostic.
│   └── service/               ← Use case implementations
│
└── infrastructure/            ← Adapters: Spring, JPA, REST, messaging
    ├── adapter/
    │   ├── in/
    │   │   └── web/           ← REST controllers (driving adapter)
    │   └── out/
    │       └── persistence/   ← JPA repositories (driven adapter)
    └── config/                ← Spring beans, properties
```

**Dependency rule:** `infrastructure` → `application` → `domain`
Domain knows nothing about infrastructure.

---

## Domain Layer — Pure Business Logic

```java
// domain/model/Order.java — Aggregate Root
package com.acme.domain.model;

public final class Order {
    private final OrderId id;
    private final CustomerId customerId;
    private OrderStatus status;
    private final List<OrderItem> items;

    // Factory method — always use instead of constructor
    public static Order create(CustomerId customerId, List<OrderItem> items) {
        if (items.isEmpty()) throw new OrderException("Order must have at least one item");
        return new Order(OrderId.generate(), customerId, OrderStatus.PENDING, items);
    }

    // Business behavior lives HERE, not in service
    public void confirm() {
        if (status != OrderStatus.PENDING) throw new OrderException("Only pending orders can be confirmed");
        this.status = OrderStatus.CONFIRMED;
    }

    public Money total() {
        return items.stream().map(OrderItem::subtotal).reduce(Money.ZERO, Money::add);
    }

    // Getters only — no setters
    public OrderId id() { return id; }
    public OrderStatus status() { return status; }
}
```

```java
// domain/model/OrderId.java — Value Object
package com.acme.domain.model;

public record OrderId(String value) {
    public OrderId {
        if (value == null || value.isBlank()) throw new IllegalArgumentException("OrderId cannot be blank");
    }

    public static OrderId generate() {
        return new OrderId(UUID.randomUUID().toString());
    }

    public static OrderId of(String value) {
        return new OrderId(value);
    }
}
```

---

## Ports — Interfaces Only

```java
// domain/port/in/PlaceOrderUseCase.java — Driving Port
package com.acme.domain.port.in;

public interface PlaceOrderUseCase {
    OrderId execute(PlaceOrderCommand command);
}

public record PlaceOrderCommand(CustomerId customerId, List<OrderItemCommand> items) {}
```

```java
// domain/port/out/OrderRepository.java — Driven Port
package com.acme.domain.port.out;

public interface OrderRepository {
    OrderId save(Order order);
    Optional<Order> findById(OrderId id);
    List<Order> findByCustomer(CustomerId customerId);
}
```

---

## Application Layer — Use Case Orchestration

```java
// application/service/PlaceOrderService.java
package com.acme.application.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class PlaceOrderService implements PlaceOrderUseCase {

    private final OrderRepository orderRepository;    // domain port — NOT JPA repo
    private final NotificationPort notifications;

    public PlaceOrderService(OrderRepository orderRepository, NotificationPort notifications) {
        this.orderRepository = orderRepository;
        this.notifications = notifications;
    }

    @Override
    public OrderId execute(PlaceOrderCommand command) {
        // 1. Build domain object
        var items = command.items().stream().map(this::toOrderItem).toList();
        var order = Order.create(command.customerId(), items);

        // 2. Persist via port (not JPA directly)
        var orderId = orderRepository.save(order);

        // 3. Side effects via ports
        notifications.orderPlaced(orderId);

        return orderId;
    }

    private OrderItem toOrderItem(OrderItemCommand cmd) {
        return new OrderItem(ProductId.of(cmd.productId()), cmd.qty(), cmd.unitPrice());
    }
}
```

---

## Infrastructure Layer — Adapters

```java
// infrastructure/adapter/in/web/OrderController.java — REST Adapter (Driving)
package com.acme.infrastructure.adapter.in.web;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final PlaceOrderUseCase placeOrderUseCase;  // ← use case port, not service

    public OrderController(PlaceOrderUseCase placeOrderUseCase) {
        this.placeOrderUseCase = placeOrderUseCase;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> place(@Valid @RequestBody PlaceOrderRequest request) {
        var command = request.toCommand();
        var orderId = placeOrderUseCase.execute(command);
        return ResponseEntity.created(URI.create("/api/v1/orders/" + orderId.value())).build();
    }
}
```

```java
// infrastructure/adapter/out/persistence/JpaOrderRepository.java — JPA Adapter (Driven)
package com.acme.infrastructure.adapter.out.persistence;

@Component
public class JpaOrderRepository implements OrderRepository {  // ← implements domain port

    private final SpringDataOrderRepository springRepo;  // actual JPA Spring Data repo
    private final OrderMapper mapper;

    public JpaOrderRepository(SpringDataOrderRepository springRepo, OrderMapper mapper) {
        this.springRepo = springRepo;
        this.mapper = mapper;
    }

    @Override
    public OrderId save(Order order) {
        var entity = mapper.toEntity(order);
        var saved = springRepo.save(entity);
        return OrderId.of(saved.getId());
    }

    @Override
    public Optional<Order> findById(OrderId id) {
        return springRepo.findById(id.value()).map(mapper::toDomain);
    }
}
```

---

## Dependency Rule Violations (Anti-Patterns)

```java
// ❌ DON'T: Domain importing infrastructure
import org.springframework.stereotype.Service;           // Spring in domain
import javax.persistence.Entity;                        // JPA in domain

// ❌ DON'T: Application using JPA directly
import com.acme.infrastructure.persistence.OrderEntity; // infra in application

// ❌ DON'T: Controller calling repository directly (skipping use case)
@RestController
public class OrderController {
    @Autowired
    private JpaOrderRepository repo;  // bypass application layer
}

// ✅ ALWAYS: Depend on ports, not implementations
public class OrderController {
    private final PlaceOrderUseCase useCase;  // port — not service
}
```

---

## Testing Strategy

| Layer | Tool | What to test |
|-------|------|-------------|
| Domain | JUnit 5 — **no Spring** | Business rules, invariants |
| Application | JUnit 5 + Mockito | Use case orchestration, port mocking |
| Infrastructure | `@SpringBootTest` or `@DataJpaTest` | Adapters, DB, REST |

```java
// Domain test — no Spring needed
class OrderTest {
    @Test
    void confirm_pending_order_changes_status() {
        var order = Order.create(CustomerId.of("cust-1"), List.of(item()));
        order.confirm();
        assertEquals(OrderStatus.CONFIRMED, order.status());
    }

    @Test
    void confirm_non_pending_order_throws() {
        var order = Order.create(CustomerId.of("cust-1"), List.of(item()));
        order.confirm();
        assertThrows(OrderException.class, order::confirm);
    }
}
```

---

## Integration con skillsGV

Combinar con: `java-21` (features del lenguaje), `spring-boot-3` (framework), `solid-clean-code` (principios), `architecture-designer` (diseño), `testing-patterns` (estrategia de testing).
