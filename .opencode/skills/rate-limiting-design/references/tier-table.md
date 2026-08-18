# Rate Limiting Tier Table

> 4 tiers for differentiated rate limiting. Assign each endpoint to a tier.

## Tier 1: auth-strict

**Applies to**: `/auth/login`, `/auth/register`, `/auth/forgot-password`
**Risk**: Brute force, credential stuffing

```javascript
import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts, try again later" },
});
```

## Tier 2: session-moderate

**Applies to**: `/auth/me`, `/auth/refresh`, `/auth/logout`
**Risk**: Low (session checks, not credential entry)
**Critical**: Called on every page load + React StrictMode double-mount

```javascript
export const sessionLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute
  max: 120,                  // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});
```

## Tier 3: api-standard

**Applies to**: `/bookings`, `/barbers`, `/services`, `/reviews`
**Risk**: Abuse, scraping

```javascript
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute
  max: 60,                   // 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip, // key by user if auth
});
```

## Tier 4: ai-quota

**Applies to**: `/ai/chat`, `/ai/suggest`, `/ai/route`
**Risk**: Token cost abuse

```javascript
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 20,                   // 20 AI requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip,
});
```

## Proxy Configuration

When behind Render, Railway, or Nginx, set trust proxy:

```javascript
app.set("trust proxy", 1); // trust 1 proxy hop
```

Without this, `req.ip` will be the proxy IP, not the client IP, making rate limiting ineffective.

## React StrictMode Note

React 18 StrictMode double-mounts effects in development. `getMe()` called in `useEffect` will fire twice. With `sessionLimiter` at 120 req/min, this is fine. With `authLimiter` at 5 req/15min, it would exhaust the limit in 2.5 mounts. **This is why login and session limiters must be separate.**

## Mobile NAT Note

Mobile carriers use NAT, so many users share one IP. For authenticated endpoints, key by `req.user.id` instead of `req.ip` to avoid blocking legit users sharing a carrier IP.
