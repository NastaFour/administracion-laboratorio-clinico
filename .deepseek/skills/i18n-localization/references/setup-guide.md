# i18next Setup Guide

## Web (React + Vite)

```typescript
// apps/web/src/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import es from "./locales/es/common.json";
import en from "./locales/en/common.json";
import esBooking from "./locales/es/booking.json";
import enBooking from "./locales/en/booking.json";

i18n.use(initReactI18next).init({
  resources: {
    es: { common: es, booking: esBooking },
    en: { common: en, booking: enBooking },
  },
  lng: "es", // default
  fallbackLng: "es",
  defaultNS: "common",
  interpolation: { escapeValue: false },
});

export default i18n;
```

```tsx
import { useTranslation } from "react-i18next";

function LoginForm() {
  const { t } = useTranslation(["common", "auth"]);
  return <button>{t("auth:login.submit")}</button>;
}
```

## Mobile (Expo)

```typescript
// apps/mobile-client/src/i18n.ts
import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  resources: { es: {...}, en: {...} },
  lng: Localization.locale.startsWith("es") ? "es" : "en",
  fallbackLng: "es",
});
```

## Translation File Structure

```
src/locales/
├── es/
│   ├── common.json      # buttons, labels, errors
│   ├── auth.json        # login, register
│   ├── booking.json     # booking flow
│   └── notifications.json
├── en/
│   ├── common.json
│   ├── auth.json
│   ├── booking.json
│   └── notifications.json
```

## Locale Detection Priority

1. User preference (DB `User.preferredLocale`)
2. Device locale (`expo-localization` / `navigator.language`)
3. Default (`es`)
