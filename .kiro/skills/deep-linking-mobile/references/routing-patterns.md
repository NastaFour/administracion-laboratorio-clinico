# Deep Link Routing Patterns

## URL → Screen Mapping

```typescript
const routeMap: Record<string, { screen: string; paramKey: string }> = {
  "booking": { screen: "BookingDetail", paramKey: "bookingId" },
  "barber": { screen: "UserProfile", paramKey: "barberId" },
  "service": { screen: "ServiceDetail", paramKey: "serviceId" },
  "payment/confirm": { screen: "PaymentConfirm", paramKey: "bookingId" },
  "review": { screen: "ReviewForm", paramKey: "bookingId" },
};
```

## Auth Guard

```typescript
const authRequiredRoutes = ["booking", "payment/confirm", "review"];

function requiresAuth(path: string): boolean {
  return authRequiredRoutes.some((r) => path.startsWith(r));
}

function handleDeepLink(url: string) {
  const { path, queryParams } = Linking.parse(url);
  const route = routeMap[path?.split("/")[0]];

  if (!route) {
    console.warn(`Unknown deep link path: ${path}`);
    return;
  }

  if (requiresAuth(path) && !isAuthenticated()) {
    // Store redirect URL, navigate to login
    useAuthStore.getState().setRedirectUrl(url);
    navigation.navigate("Login");
    return;
  }

  // Validate param exists
  const paramValue = queryParams[route.paramKey];
  if (!paramValue) {
    console.warn(`Missing ${route.paramKey} in deep link`);
    return;
  }

  navigation.navigate(route.screen, { [route.paramKey]: paramValue });
}
```

## Share Booking Link

```typescript
import * as Sharing from "expo-sharing";
import * as Linking from "expo-linking";

async function shareBooking(bookingId: string) {
  const url = Linking.createURL(`booking`, { queryParams: { id: bookingId } });
  // url = "app://booking?id=abc123"

  await Sharing.shareAsync(url, {
    mimeType: "text/plain",
    dialogTitle: "Share booking",
  });
}
```

## Web Fallback

If the app isn't installed, universal links fall back to the website:

```
https://app.example.com/booking/abc123
  → if app installed: opens app
  → if not installed: opens web browser
```

The web app should render a "Open in app" banner when visited from mobile.
