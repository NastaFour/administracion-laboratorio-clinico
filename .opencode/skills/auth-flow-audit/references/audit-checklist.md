# Auth Flow Audit Checklist

> 10+ checks categorized by layer. Run manually after implementing or modifying auth.

## 1. Auth Store (Zustand)

- [ ] Store does NOT have `persist` middleware with a `token` field
- [ ] Store does NOT expose `setToken` / `getToken` (use `getMe()` instead)
- [ ] Store holds user object in memory only (cleared on logout)
- [ ] Logout action calls `/auth/logout` API (to clear cookie) AND clears store

## 2. App.tsx / Root Component

- [ ] App calls `getMe()` on mount (not `setToken`)
- [ ] `getMe()` failure is silent on public pages (no redirect)
- [ ] `getMe()` failure on protected page redirects to `/login`
- [ ] React StrictMode double-mount doesn't cause 429 (see rate-limiting-design)

## 3. API Endpoints

- [ ] `/auth/login` returns user data + sets refresh cookie (httpOnly, secure, sameSite)
- [ ] `/auth/register` same as login
- [ ] `/auth/me` returns current user from cookie (no access token needed)
- [ ] `/auth/refresh` rotates refresh cookie + returns new access token in body
- [ ] `/auth/logout` clears cookie

## 4. Cookie Configuration

- [ ] `httpOnly: true` (prevents XSS access)
- [ ] `secure: true` in production (HTTPS only)
- [ ] `sameSite: 'strict'` (prevents CSRF)
- [ ] `maxAge` set appropriately (e.g., 7 days for refresh)
- [ ] `path: '/'` for refresh cookie

## 5. Axios Interceptor

- [ ] 401 interceptor does NOT do `window.location.href = "/login"`
- [ ] 401 interceptor does NOT call `router.push("/login")`
- [ ] Each page handles 401 individually (e.g., `if (err.status === 401) navigate("/login")`)
- [ ] Request interceptor attaches access token from memory (not localStorage)
- [ ] Response interceptor can attempt `/auth/refresh` once before failing

## 6. Anti-Patterns to Scan For

| Anti-Pattern | Severity | Detection |
|---|---|---|
| `localStorage.setItem("token", ...)` | error | grep in src |
| `sessionStorage.setItem("token", ...)` | error | grep in src |
| `window.location.href = "/login"` in interceptor | error | grep in axios files |
| `persist(...)` with `token` in store | error | grep in store files |
| `setToken` in store without `getMe` | warning | grep in store files |
| Access token in cookie (not httpOnly) | error | inspect cookie config |
| `getMe()` called in every component (not just App) | warning | grep in components |
