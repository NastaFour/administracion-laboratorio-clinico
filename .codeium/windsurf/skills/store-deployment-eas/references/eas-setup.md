# EAS Setup

## eas.json

```json
{
  "cli": {
    "version": ">= 5.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": { "APP_ENV": "development" },
      "ios": { "simulator": true }
    },
    "staging": {
      "distribution": "internal",
      "env": { "APP_ENV": "staging" }
    },
    "production": {
      "env": { "APP_ENV": "production" },
      "autoIncrement": true
    }
  },
  "submit": {
    "staging": {
      "ios": { "ascAppId": "1234567890" },
      "android": { "serviceAccountKeyPath": "./google-service-account.json" }
    },
    "production": {
      "ios": { "ascAppId": "1234567890", "appleTeamId": "TEAMID" },
      "android": { "serviceAccountKeyPath": "./google-service-account.json" }
    }
  }
}
```

## app.json Version Management

```json
{
  "expo": {
    "version": "1.2.0",
    "ios": { "buildNumber": "1" },
    "android": { "versionCode": 12 }
  }
}
```

- `version`: Semantic version shown to users (1.2.0)
- `buildNumber` (iOS): Increment per App Store submission
- `versionCode` (Android): Integer, increment per Play Store submission

## Credentials

```bash
# First time setup
eas credentials

# iOS: Apple Developer account + App Store Connect
# Android: Google Play service account JSON
```

## Build Commands

```bash
# Development (local testing on simulator/device)
eas build --profile development --platform ios

# Staging (internal testing, TestFlight)
eas build --profile staging --platform all

# Production (App Store + Play Store)
eas build --profile production --platform all
```

## Submit Commands

```bash
# Submit to App Store + Play Store
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

## OTA Updates (JS-only changes)

```bash
# Push a JS update without store review
eas update --branch production --message "Fix booking crash"
```

Config in `app.json`:
```json
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/your-project-id"
    },
    "runtimeVersion": { "policy": "appVersion" }
  }
}
```
