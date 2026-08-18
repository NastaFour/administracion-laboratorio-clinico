# Deep Link Setup Guide

## app.json Configuration

```json
{
  "expo": {
    "scheme": "app",
    "ios": {
      "associatedDomains": ["applinks:app.example.com"]
    },
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [{ "scheme": "https", "host": "app.example.com" }],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

## URL Schemes

| URL | Screen | Auth Required |
|---|---|---|
| `app://booking/:id` | BookingDetail | Yes |
| `app://barber/:id` | UserProfile | No |
| `app://service/:id` | ServiceDetail | No |
| `app://payment/confirm/:id` | PaymentConfirm | Yes |
| `https://app.example.com/booking/:id` | BookingDetail (universal) | Yes |

## Deep Link Listener

```typescript
import * as Linking from "expo-linking";
import { useEffect } from "react";

function useDeepLinks() {
  const navigation = useNavigation();

  useEffect(() => {
    // Handle initial URL (app opened from link)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // Handle subsequent links (app already open)
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });

    return () => subscription.remove();
  }, []);

  function handleDeepLink(url: string) {
    const { hostname, path, queryParams } = Linking.parse(url);

    // Validate auth before navigating to protected screens
    if (requiresAuth(path) && !isAuthenticated()) {
      // Redirect to login with redirect param
      navigation.navigate("Login", { redirect: url });
      return;
    }

    switch (path) {
      case "booking":
        navigation.navigate("BookingDetail", { bookingId: queryParams.id });
        break;
      case "barber":
        navigation.navigate("UserProfile", { barberId: queryParams.id });
        break;
      case "payment/confirm":
        navigation.navigate("PaymentConfirm", { bookingId: queryParams.id });
        break;
    }
  }
}
```

## Universal Links (iOS)

Requires `apple-app-site-association` file at `https://app.example.com/.well-known/`:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appIDs": ["TEAMID.com.example.app"],
        "components": [
          { "/": "/booking/*" },
          { "/": "/barber/*" }
        ]
      }
    ]
  }
}
```

## Push Notification Deep Links

```typescript
import * as Notifications from "expo-notifications";

Notifications.addNotificationResponseReceivedListener((response) => {
  const url = response.notification.request.content.data?.deepLink;
  if (url) handleDeepLink(url);
});

// When sending push:
{
  "to": pushToken,
  "title": "Reserva confirmada",
  "body": "Tu barbero llega en 1 hora",
  "data": { "deepLink": "app://booking/abc123" }
}
```
