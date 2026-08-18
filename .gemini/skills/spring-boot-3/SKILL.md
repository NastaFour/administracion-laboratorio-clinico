---
name: spring-boot-3
description: >
  Spring Boot 3 patterns for configuration, DI, REST controllers, and service layers.
  Trigger when building or refactoring Spring Boot 3.3+ applications, wiring beans,
  defining @ConfigurationProperties, or implementing @Transactional service layers.
license: MIT
compatibility: "Works with Claude Code, Cursor, Gemini, and any other agentskills.io compatible agent. Requires Java 17+ and Spring Boot 3+."
allowed-tools: Read
metadata:
  author: gentleman-programming
  version: "1.0"
  category: 04-backend
  tags: [spring-boot, java, rest, di, transactional, configuration]
---

# Spring Boot 3 — Patterns & Best Practices

## When to Use

Load this skill when:
- Building a Spring Boot 3.3+ service or API
- Wiring beans with dependency injection
- Defining configuration properties with validation
- Implementing REST controllers and service layers

## Core Rules

| Rule | Pattern |
|------|---------|
| Inject dependencies | **Constructor injection only** — never field injection |
| Read config | `@ConfigurationProperties` + `@Validated` — never scattered `@Value` |
| Transactions | `@Transactional` on service layer — never on controllers |

---

## Pattern 1: Typed configuration properties

```java
// ✅ DO: @ConfigurationProperties with validation
package com.acme.config;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "payment")
public record PaymentProperties(
  @NotBlank String provider,
  @NotBlank String apiKey
) { }
```

```java
@SpringBootApplication
@ConfigurationPropertiesScan
public class Application { }
```

```yaml
# application.yml
payment:
  provider: stripe
  api-key: ${PAYMENT_API_KEY}
```

```java
// ❌ DON'T: Scattered @Value
@Service
public class PaymentService {
  @Value("${payment.apiKey}")
  private String apiKey; // Hard to validate and test
}
```

---

## Pattern 2: Constructor injection

```java
// ✅ DO: constructor injection
@Service
public final class OrderService {
  private final OrderRepository repository;
  private final PaymentProperties config;

  public OrderService(OrderRepository repository, PaymentProperties config) {
    this.repository = repository;
    this.config = config;
  }
}
```

```java
// ❌ DON'T: field injection
@Service
public class OrderService {
  @Autowired
  private OrderRepository repository; // Not testable without Spring context
}
```

---

## Pattern 3: Service + Transaction boundary

```java
package com.acme.order.application;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public final class OrderService {
  private final OrderRepository repository;

  public OrderService(OrderRepository repository) {
    this.repository = repository;
  }

  @Transactional  // ← boundary at service layer, NOT controller
  public OrderId placeOrder(OrderCommand command) {
    var order = Order.create(command.sku(), command.qty());
    return repository.save(order).id();
  }

  @Transactional(readOnly = true)  // ← readOnly for queries
  public List<Order> findByCustomer(CustomerId customerId) {
    return repository.findByCustomerId(customerId);
  }
}
```

---

## Pattern 4: REST Controller with DTO records

```java
package com.acme.order.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/orders")
public final class OrderController {
  private final OrderService service;

  public OrderController(OrderService service) {
    this.service = service;
  }

  @PostMapping
  public ResponseEntity<OrderResponse> place(@Valid @RequestBody OrderRequest request) {
    var orderId = service.placeOrder(request.toCommand());
    return ResponseEntity.created(URI.create("/api/v1/orders/" + orderId)).build();
  }

  @GetMapping("/{id}")
  public ResponseEntity<OrderResponse> get(@PathVariable String id) {
    return service.findById(OrderId.of(id))
      .map(order -> ResponseEntity.ok(OrderResponse.from(order)))
      .orElse(ResponseEntity.notFound().build());
  }

  // DTOs as records (Java 17+)
  public record OrderRequest(
    @NotBlank String sku,
    @Min(1) int qty
  ) {
    public OrderCommand toCommand() { return new OrderCommand(sku, qty); }
  }

  public record OrderResponse(String id, String sku, int qty, String status) {
    public static OrderResponse from(Order order) {
      return new OrderResponse(order.id().value(), order.sku(), order.qty(), order.status().name());
    }
  }
}
```

---

## Pattern 5: Exception Handling

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(OrderNotFoundException.class)
  public ResponseEntity<ErrorResponse> handleNotFound(OrderNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
      .body(new ErrorResponse("NOT_FOUND", ex.getMessage()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
    var errors = ex.getBindingResult().getFieldErrors().stream()
      .map(e -> e.getField() + ": " + e.getDefaultMessage())
      .toList();
    return ResponseEntity.badRequest().body(new ErrorResponse("VALIDATION_ERROR", errors.toString()));
  }

  public record ErrorResponse(String code, String message) {}
}
```

---

## Testing

```java
@SpringBootTest
@AutoConfigureMockMvc
class OrderControllerTest {

  @Autowired MockMvc mockMvc;
  @MockBean OrderService orderService;

  @Test
  void place_order_returns_201() throws Exception {
    when(orderService.placeOrder(any())).thenReturn(OrderId.of("order-123"));

    mockMvc.perform(post("/api/v1/orders")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""{"sku": "PROD-1", "qty": 2}"""))
      .andExpect(status().isCreated());
  }
}
```

## Integration con skillsGV

Combinar con: `java-21` (features del lenguaje), `hexagonal-architecture-layers-java` (arquitectura), `postgresql` (BD), `docker` (containerización), `ci-cd` (pipeline).
