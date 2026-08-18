# react-native-maps Configuration

`react-native-maps` requires platform-specific config plugin entries and API keys.

## 📦 Install

```bash
pnpm expo install react-native-maps
```

> Use `pnpm expo install` (not `pnpm add`) so the version is aligned with your Expo SDK.

## 🍎 iOS (Google Maps)

In `app.json`:

```json
{
  "ios": {
    "config": {
      "googleMapsApiKey": "AIzaSy...your-key"
    }
  }
}
```

Without the key, iOS will show a blank map (no error thrown).

## 🤖 Android (Google Maps)

In `app.json`:

```json
{
  "android": {
    "config": {
      "googleMaps": {
        "apiKey": "AIzaSy...your-key"
      }
    }
  }
}
```

## 🍎 iOS (Apple Maps — no key needed)

If you want to skip the Google key on iOS, set `provider={PROVIDER_DEFAULT}` (Apple Maps). On Android, only Google Maps is supported.

```tsx
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';

<MapView provider={PROVIDER_DEFAULT} style={{ flex: 1 }} />
```

## 🎯 Marker Best Practices

- Use `tracksViewChanges={false}` after initial render to avoid re-rendering the marker on every coordinate update.
- For moving markers (courier position), call `animateMarkerToCoordinate` or rely on `<Marker coordinate>` prop with `tracksViewChanges={false}`.

```tsx
<Marker
  coordinate={{ latitude, longitude }}
  tracksViewChanges={false}
  image={require('./assets/courier-pin.png')}
/>
```

## 🗺️ Performance

- Avoid rendering the map if the screen is not visible.
- Use `onRegionChangeComplete` (not `onRegionChange`) for state updates to avoid jank.
- For polyline routes, prefer `<Polyline coordinates={route} strokeWidth={4} />` with pre-computed coordinates.
