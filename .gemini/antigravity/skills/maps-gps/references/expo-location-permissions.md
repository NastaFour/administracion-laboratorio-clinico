# Expo Location Permissions

`expo-location` requires explicit permission requests on iOS and Android. This reference covers the minimum viable configuration.

## 📱 iOS (Info.plist)

Add to your `app.json` under `ios.infoPlist`:

```json
{
  "ios": {
    "infoPlist": {
      "NSLocationWhenInUseUsageDescription": "We need your location to track your delivery in real time.",
      "NSLocationAlwaysAndWhenInUseUsageDescription": "Background tracking is required for couriers to update delivery status while the app is closed."
    }
  }
}
```

> If you only support foreground tracking, you only need `NSLocationWhenInUseUsageDescription`.

## 🤖 Android (Permissions Array)

In `app.json`:

```json
{
  "android": {
    "permissions": [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION"
    ]
  }
}
```

> `ACCESS_BACKGROUND_LOCATION` is required for courier background tracking. Google Play requires a justification in the app listing.

## 🛠️ Runtime Request

```typescript
import * as Location from 'expo-location';

const { status } = await Location.requestForegroundPermissionsAsync();
if (status !== 'granted') {
  throw new Error('Location permission denied');
}

// Courier-only:
const bg = await Location.requestBackgroundPermissionsAsync();
if (bg.status !== 'granted') {
  console.warn('Background tracking unavailable');
}
```

## 🎯 Best Practices

- Request foreground permission **only when** the user opens a feature that needs it (delivery tracking, address autocomplete). Never at app launch.
- For couriers, request background permission with a clear UX explanation (e.g. modal before the request).
- Always handle the `denied` case with a CTA to open Settings (`Linking.openSettings()`).
- Throttle `watchPositionAsync` to ≥5s to avoid battery drain and OS throttling.
