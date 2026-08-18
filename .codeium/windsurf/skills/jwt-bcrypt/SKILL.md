---
name: jwt-bcrypt
description: Security standards for User Authentication. Covers password hashing (bcrypt/argon2), Access/Refresh token structures, HTTP-only secure cookie configurations, and rotation.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["JWT", "bcrypt", "autenticación", "token", "refresh token"]
  scope: [global, project]
  version: "1.0.0"
---

# 🔑 Authentication & Token Security (2026 standards)

Use this skill when implementing user authentication, password storage, session refresh flows, or endpoint security.

## 🚨 Security Standards

1. **Password Hashing (Argon2 / Bcrypt)**:
   - Use `argon2` (preferred) or `bcryptjs` (with a minimum salt factor of 10-12) to hash passwords before database storage.
   - NEVER log plaintext passwords or store them directly.

2. **Access Token Lifespan & Storage**:
   - Access tokens (JWT) must have a short lifespan (15 minutes).
   - The client MUST store access tokens in memory (e.g. JavaScript runtime variables).
   - LocalStorage and SessionStorage are strictly prohibited for storing JWT access tokens.

3. **Refresh Token & Secure Cookies**:
   - Refresh tokens (JWT) must have a longer lifespan (7 days).
   - The server must send the refresh token in an `HTTP-Only`, `Secure`, `SameSite=Strict` cookie:
     ```javascript
     res.cookie('refreshToken', token, {
       httpOnly: true,
       secure: true, // Only HTTPS
       sameSite: 'strict',
       path: '/api/auth/refresh', // Restrict path
       maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
     });
     ```
   - Implement **Token Rotation**: revoke the old refresh token and issue a new pair whenever the client calls the refresh endpoint.

## 🛒 [APP] Roles & Permissions

Enforce permissions dynamically based on the decoded JWT payload contents:
- `BUYER`: Access to `/orders` (own records), catalog viewing, and support creation.
- `EMPLOYEE`: Access to inventory catalog updates, order packing checklist validations, and support channel replies.
- `DELIVERY`: Access to orders assigned to them, and location tracking update routes.
- `ADMIN`: Access to full platform overrides.

## 🛡️ Hashing and Verification Flow

```javascript
import bcrypt from 'bcryptjs';

// Hashing Password
export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

// Verification
export const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};
```
