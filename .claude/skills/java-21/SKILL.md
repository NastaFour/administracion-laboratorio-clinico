---
name: java-21
description: >
  Java 21 modern features: records, sealed classes, pattern matching, virtual threads (Project Loom),
  sequenced collections, and text blocks. Trigger when writing or reviewing Java 21+ code,
  using switch expressions, instanceof patterns, or structured concurrency.
license: MIT
compatibility: "Works with Claude Code, Cursor, Gemini, and any other agentskills.io compatible agent. Requires Java 21+."
allowed-tools: Read
metadata:
  author: gentleman-programming
  version: "1.0"
  category: 04-backend
  tags: [java, java-21, records, sealed, pattern-matching, virtual-threads, loom]
---

# Java 21 — Modern Features & Best Practices

## Records (Immutable Data Classes)

```java
// ✅ DO: records for value objects and DTOs
public record Point(double x, double y) {
    // Compact constructor for validation
    public Point {
        if (x < 0 || y < 0) throw new IllegalArgumentException("Coordinates must be non-negative");
    }

    // Custom methods are allowed
    public double distanceTo(Point other) {
        return Math.sqrt(Math.pow(x - other.x, 2) + Math.pow(y - other.y, 2));
    }
}

// Usage — automatic equals, hashCode, toString, getters
var p = new Point(3.0, 4.0);
System.out.println(p.x());  // 3.0
System.out.println(p);      // Point[x=3.0, y=4.0]
```

---

## Sealed Classes (Algebraic Data Types)

```java
// Define the closed hierarchy
public sealed interface Shape permits Circle, Rectangle, Triangle {}

public record Circle(double radius) implements Shape {}
public record Rectangle(double width, double height) implements Shape {}
public record Triangle(double base, double height) implements Shape {}

// Exhaustive pattern matching — compiler enforces all cases
public double area(Shape shape) {
    return switch (shape) {
        case Circle c      -> Math.PI * c.radius() * c.radius();
        case Rectangle r   -> r.width() * r.height();
        case Triangle t    -> 0.5 * t.base() * t.height();
        // No default needed — compiler guarantees exhaustiveness
    };
}
```

---

## Pattern Matching

```java
// instanceof pattern (Java 16+, commonly used in Java 21)
Object obj = "Hello World";

// ❌ Old way
if (obj instanceof String) {
    String s = (String) obj;
    System.out.println(s.length());
}

// ✅ Java 21 way
if (obj instanceof String s) {
    System.out.println(s.length());
}

// Pattern matching in switch
static String format(Object o) {
    return switch (o) {
        case Integer i  -> "int: " + i;
        case Long l     -> "long: " + l;
        case String s   -> "string: " + s;
        case null       -> "null";
        default         -> "other: " + o.getClass().getSimpleName();
    };
}

// Guarded patterns
static String classify(Object o) {
    return switch (o) {
        case Integer i when i < 0  -> "negative int";
        case Integer i when i == 0 -> "zero";
        case Integer i             -> "positive int";
        default                    -> "not an int";
    };
}
```

---

## Virtual Threads (Project Loom)

```java
// ✅ DO: Virtual threads for I/O-bound work
// Simple virtual thread
Thread.ofVirtual().start(() -> {
    System.out.println("Running in virtual thread: " + Thread.currentThread());
});

// ExecutorService with virtual threads (recommended for servers)
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    var futures = IntStream.range(0, 10_000)
        .mapToObj(i -> executor.submit(() -> fetchFromDatabase(i)))
        .toList();

    var results = futures.stream()
        .map(f -> f.get())  // blocks virtual thread, not OS thread
        .toList();
}

// Spring Boot — enable virtual threads
// application.properties:
// spring.threads.virtual.enabled=true
```

---

## Text Blocks

```java
// ✅ DO: Text blocks for multi-line strings
String json = """
        {
            "name": "John",
            "email": "john@example.com"
        }
        """;

String sql = """
        SELECT u.id, u.name, o.total
        FROM users u
        JOIN orders o ON o.user_id = u.id
        WHERE u.active = true
          AND o.created_at > ?
        ORDER BY o.created_at DESC
        """;

// String formatting in text blocks
String html = """
        <html>
            <body>
                <h1>%s</h1>
                <p>%s</p>
            </body>
        </html>
        """.formatted(title, content);
```

---

## Sequenced Collections (Java 21)

```java
// New interfaces: SequencedCollection, SequencedSet, SequencedMap
List<String> list = new ArrayList<>(List.of("a", "b", "c"));

// Uniform API for first/last operations
list.getFirst(); // "a"
list.getLast();  // "c"
list.addFirst("z");
list.addLast("d");
list.reversed(); // reversed view

// Works on LinkedHashSet, LinkedHashMap too
LinkedHashMap<String, Integer> map = new LinkedHashMap<>();
map.put("a", 1);
map.put("b", 2);
map.getFirst(); // Map.Entry("a", 1)
map.getLast();  // Map.Entry("b", 2)
```

---

## Structured Concurrency (Preview)

```java
import java.util.concurrent.StructuredTaskScope;

// ✅ Structured concurrency — tasks live as long as their scope
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    var userTask    = scope.fork(() -> fetchUser(userId));
    var ordersTask  = scope.fork(() -> fetchOrders(userId));

    scope.join().throwIfFailed();  // wait for both, propagate errors

    var user   = userTask.get();
    var orders = ordersTask.get();

    return new UserProfile(user, orders);
}
```

---

## Anti-Patterns

```java
// ❌ DON'T: mutable class where record fits
public class Point {
    private double x, y;
    public Point(double x, double y) { this.x = x; this.y = y; }
    // getters, setters, equals, hashCode, toString... all manual
}

// ✅ DO: record
public record Point(double x, double y) {}

// ❌ DON'T: if-else instanceof chains
if (shape instanceof Circle) { ... }
else if (shape instanceof Rectangle) { ... }

// ✅ DO: sealed + switch expression
return switch (shape) {
    case Circle c    -> ...;
    case Rectangle r -> ...;
};

// ❌ DON'T: use Platform threads for massive I/O concurrency
var executor = Executors.newFixedThreadPool(200);

// ✅ DO: virtual threads — scales to millions
var executor = Executors.newVirtualThreadPerTaskExecutor();
```

---

## Integration con skillsGV

Combinar con: `spring-boot-3` (framework principal), `hexagonal-architecture-layers-java` (arquitectura), `postgresql` (BD), `docker` (containerización), `testing-patterns` (JUnit 5).
