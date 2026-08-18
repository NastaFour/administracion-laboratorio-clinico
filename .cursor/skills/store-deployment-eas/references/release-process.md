# Release Process

## Pre-Release Checklist

- [ ] All tests pass (`pnpm -r test`)
- [ ] Typecheck passes (`pnpm -r typecheck`)
- [ ] No console.log in production code
- [ ] `expo-production-auditor` PASS (no native compat issues)
- [ ] Environment variables set for production (API URL, push tokens, Stripe keys)
- [ ] App icons and splash screens updated
- [ ] Privacy policy URL configured
- [ ] App Store screenshots captured (6.7", 6.5", 5.5")
- [ ] Play Store screenshots captured (phone, 7-inch tablet)

## Version Bump

```bash
# 1. Update version in app.json
# version: "1.2.0" → "1.3.0"
# ios.buildNumber: "1" → "2"
# android.versionCode: 12 → 13

# 2. Commit version bump
git add apps/mobile-client/app.json
git commit -m "chore: bump version to 1.3.0"
```

## Build + Submit

```bash
# 3. Build production binaries
eas build --profile production --platform all --non-interactive

# 4. Submit to stores
eas submit --profile production --platform ios --non-interactive
eas submit --profile production --platform android --non-interactive

# 5. Wait for store review (iOS: 24-48h, Android: 1-4h)
```

## OTA Hotfix (JS-only)

For bug fixes that don't touch native code:

```bash
# 1. Fix the bug
# 2. Push OTA update
eas update --branch production --message "Fix booking crash on null barber"

# 3. Users get the update on next app launch (no store review needed)
```

## Rollback

If a production build is broken:

```bash
# Option 1: OTA rollback (if JS-only issue)
eas update --branch production --message "Rollback to last known good"

# Option 2: Store rollback (if native issue)
# iOS: Roll back in App Store Connect
# Android: Pause rollout in Play Console

# Option 3: Revert commit + new build
git revert HEAD
eas build --profile production --platform all
eas submit --profile production --platform all
```

## Release Tags

```bash
# Tag the release
git tag -a v1.3.0 -m "Release 1.3.0: Booking improvements + bug fixes"
git push origin v1.3.0
```

## Environment Matrix

| Profile | API URL | Push Token | Stripe Key | Sentry DSN |
|---|---|---|---|---|
| development | localhost:3000 | Expo dev | Test key | Dev DSN |
| staging | staging-api.app.example.com | Expo staging | Test key | Staging DSN |
| production | api.app.example.com | Expo prod | Live key | Prod DSN |

Use `expo-constants` to read env vars:

```typescript
import Constants from "expo-constants";

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? "http://localhost:3000";
```
