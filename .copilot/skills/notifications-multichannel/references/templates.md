# Notification Templates

## Template Catalog

### 1. Booking Confirmed

**Trigger**: Booking transitions to `ACCEPTED`
**Channels**: push, email

```
Push: "✅ Tu reserva está confirmada"
      "{{barberName}} ha aceptado tu reserva para {{serviceName}} el {{date}} a las {{time}}."

Email Subject: "Reserva confirmada - [APP]"
Email Body: "Hola {{clientName}}, tu reserva con {{barberName}} para {{serviceName}} está confirmada..."
```

### 2. Reminder 24h

**Trigger**: 24h before booking startTime (background job)
**Channels**: push, email, SMS

```
Push: "⏰ Recordatorio: reserva mañana"
      "Tienes una reserva con {{barberName}} mañana a las {{time}}."

SMS: "[APP]: Recuerda tu reserva con {{barberName}} mañana {{date}} a las {{time}}. Responde STOP para desuscribir."

Email Subject: "Recordatorio: Tu reserva es mañana"
```

### 3. Reminder 1h

**Trigger**: 1h before booking startTime
**Channels**: push, SMS

```
Push: "🚗 Tu barbero llega en 1 hora"
      "{{barberName}} llegará a {{address}} en aproximadamente 1 hora."

SMS: "[APP]: {{barberName}} llega en 1 hora a {{address}}."
```

### 4. Barber En Route

**Trigger**: Booking transitions to `EN_RUTA`
**Channels**: push

```
Push: "🛵 {{barberName}} está en camino"
      "Tu barbero ha comenzado a desplazarse. ETA: {{eta}} minutos."
```

### 5. Barber Arrived

**Trigger**: Booking transitions to `ARRIVED`
**Channels**: push, SMS

```
Push: "📍 Tu barbero ha llegado"
      "{{barberName}} está esperando en {{address}}."

SMS: "[APP]: {{barberName}} ha llegado a {{address}}."
```

### 6. Booking Completed - Review Request

**Trigger**: 30min after booking transitions to `COMPLETED`
**Channels**: push, email

```
Push: "⭐ ¿Cómo estuvo tu servicio?"
      "Califica tu experiencia con {{barberName}}."

Email Subject: "¿Cómo estuvo tu corte? Califica tu experiencia"
```

### 7. No-Show Alert

**Trigger**: Booking transitions to `NO_SHOW`
**Channels**: push, SMS, email

```
Push: "⚠️ Tu barbero no pudo llegar"
      "Tu reserva no pudo completarse. ¿Quieres reprogramar con otro barbero?"

SMS: "[APP]: Tu barbero no pudo llegar a tu reserva. Reagenda en la app."
Email Subject: "Tu reserva no pudo completarse"
```

### 8. Welcome

**Trigger**: User registers
**Channels**: email

```
Email Subject: "¡Bienvenido a [APP]!"
Email Body: "Hola {{name}}, gracias por registrarte en [APP]..."
```

## Template Variables

All templates support these variables:

| Variable | Type | Example |
|---|---|---|
| `{{clientName}}` | string | "Carlos" |
| `{{barberName}}` | string | "José" |
| `{{serviceName}}` | string | "Corte de cabello" |
| `{{date}}` | string | "17 de junio" |
| `{{time}}` | string | "10:00 AM" |
| `{{address}}` | string | "Av. Principal 123" |
| `{{eta}}` | number | 15 |
| `{{bookingId}}` | string | "abc123" |

## Localization

Templates should support Spanish (primary) and English (future). Use a template engine:

```typescript
const templates = {
  "booking-confirmed": {
    es: { push: "✅ Tu reserva está confirmada", ... },
    en: { push: "✅ Your booking is confirmed", ... },
  },
};

function renderTemplate(name: string, lang: "es" | "en", channel: string, data: Record<string, string>) {
  const template = templates[name][lang][channel];
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? "");
}
```
