# Locale-Aware Formatting

## Dates

```typescript
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";

const locales = { es, en: enUS };

function formatDate(date: Date, locale: string, formatStr: string = "PPP") {
  return format(date, formatStr, { locale: locales[locale] ?? locales.es });
}

// es: "17 de junio de 2026"
// en: "June 17th, 2026"
```

## Currency (VES / USD)

```typescript
function formatCurrency(amount: number, currency: "VES" | "USD", locale: string) {
  return new Intl.NumberFormat(locale === "es" ? "es-VE" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// es-VE + VES: "Bs. 1.234,56"
// en-US + USD: "$1,234.56"
```

## Numbers

```typescript
new Intl.NumberFormat("es-VE").format(1234.56); // "1.234,56"
new Intl.NumberFormat("en-US").format(1234.56); // "1,234.56"
```

## Pluralization

```json
// locales/es/booking.json
{
  "slots": "1 slot disponible",
  "slots_other": "{{count}} slots disponibles"
}
```

```json
// locales/en/booking.json
{
  "slots": "1 slot available",
  "slots_other": "{{count}} slots available"
}
```

```typescript
const { t } = useTranslation("booking");
t("slots", { count: 3 }); // "3 slots disponibles" / "3 slots available"
```
