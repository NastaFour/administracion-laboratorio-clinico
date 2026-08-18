---
name: socketio
description: Real-time event communication with Socket.io (v4.7+). Covers server middleware validation, private room configurations, Zod payload checks, and client listener cleanup. Use when creating or modifying Socket.io events, rooms, or real-time payload flows.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["socket.io", "websocket", "tiempo real", "rooms", "handshake"]
  scope: [global, project]
  version: "1.0.0"
---

# 🔌 Real-Time Sockets with Socket.io

Use this skill when implementing real-time feeds, client chat, GPS dispatch tracking, or notification brokers.

## 🚨 Connection & Authorization (2026 Guardrails)

1. **Strict Handshake Middleware**:
   - WebSockets must never allow anonymous connections.
   - Enforce an authentication middleware on the Socket server (`io.use`) that extracts and validates the JWT token before allowing the connection:
     ```javascript
     io.use((socket, next) => {
       const token = socket.handshake.auth.token;
       if (!token) return next(new Error('Authentication error: Token missing'));
       
       try {
         const user = verifyToken(token); // Decodes payload
         socket.user = user; // Attach details
         next();
       } catch (err) {
         next(new Error('Authentication error: Invalid Token'));
       }
     });
     ```

2. **Event Payload Validation**:
   - Validate the schema of every payload received in `socket.on` events using validation schemas (like Zod) to prevent prototype injection or type errors:
     ```javascript
     socket.on('delivery:location', (data) => {
       try {
         const coordinates = LocationSchema.parse(data);
         // Process coordinates
       } catch (err) {
         socket.emit('error', { message: 'Invalid payload schema' });
       }
     });
     ```

## 🛒 [APP] Real-Time Rooms & Events

Isolate events by creating virtual **Rooms**:

1. **Buyer Room (`order:${orderId}`)**:
   - The buyer joins this room to receive order progress updates.
   - Server emits: `order:status_updated` (`'PENDING' | 'PACKING' | 'SHIPPED' | 'DELIVERED'`).

2. **Delivery Dispatch Room (`deliveries:active`)**:
   - Delivery couriers emit `delivery:location` (`{ lat: number, lng: number }`).
   - The server broadcasts this location to the buyer currently waiting for the order.

3. **Inventory Room (`inventory:alerts`)**:
   - Employee dashboard joins this room to receive instant notices from the server if stock of any item drops to 0.
   - Server emits: `inventory:depleted` (`{ productId: string }`).

## ♻️ Client Lifecycle Management

1. **React / Expo Cleanup Hook**:
   - Every websocket subscription must be removed when the UI component unmounts:
     ```typescript
     useEffect(() => {
       socket.connect();
       
       socket.on('order:status_updated', (data) => {
         setStatus(data.status);
       });
       
       return () => {
         socket.off('order:status_updated');
         socket.disconnect();
       };
     }, [orderId]);
     ```

2. **Background Handling (Mobile)**:
   - For mobile apps (Expo), configure automatic reconnect limits (`reconnectionAttempts: 5`) and handle connection closing if the application goes into the background to save battery.
