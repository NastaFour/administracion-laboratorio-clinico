# Next.js 15 & React 19 L1 Documentation Cache

Este documento sirve como caché local L1 para evitar llamadas innecesarias o fallas de red con Context7 MCP.

## ⚠️ APIs de Solicitudes Asíncronas (Breaking Changes)

En Next.js 15, las APIs de solicitudes que antes eran sincrónicas ahora son **asincrónicas**. Debes utilizar `await` al acceder a sus propiedades.

### 1. `headers()` y `cookies()`
```typescript
// Incorrecto (sincrónico)
const cookieStore = cookies();
const token = cookieStore.get('token');

// Correcto (asincrónico)
const cookieStore = await cookies();
const token = cookieStore.get('token');
```

### 2. `params` y `searchParams` en Page y Layout
Las props `params` y `searchParams` recibidas por páginas, layouts y route handlers son promesas y deben ser awaited.
```typescript
// Page.tsx
interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ query?: string }>;
}

export default async function Page({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const id = resolvedParams.id;
  const query = resolvedSearchParams.query;
  // ...
}
```

---

## ⚛️ Compatibilidad con React 19

### 1. React Compiler
Next.js 15 activa por defecto el React Compiler para optimización de renderizado (no requiere `useMemo` o `useCallback` manuales en la mayoría de los casos).

### 2. El hook `use()`
Permite leer promesas directamente en componentes de cliente (Client Components).
```typescript
"use client";

import { use } from "react";

export function DataComponent({ dataPromise }: { dataPromise: Promise<any> }) {
  const data = use(dataPromise); // Resuelve la promesa en render
  return <div>{data.message}</div>;
}
```

### 3. Server Actions & `useActionState`
La gestión de estados de formularios cambia del antiguo `useFormState` (obsoleto) a `useActionState` de React 19.
```typescript
"use client";

import { useActionState } from "react";
import { submitFormAction } from "./actions";

export function Form() {
  const [state, formAction, isPending] = useActionState(submitFormAction, null);
  
  return (
    <form action={formAction}>
      <input type="text" name="name" />
      <button type="submit" disabled={isPending}>
        {isPending ? "Enviando..." : "Enviar"}
      </button>
      {state?.error && <p>{state.error}</p>}
    </form>
  );
}
```

---

## ⚡ Estrategias de Caching

### 1. GET Route Handlers
Los Route Handlers con método `GET` ya **no se cachean de forma predeterminada**. Para cachearlos, debes especificar una configuración dinámica o usar `export const dynamic = 'force-static'`.

### 2. Client-side Router Cache
El caché del enrutador de cliente para páginas dinámicas ahora tiene un tiempo de vida (TTL) predeterminado de **0 segundos** (las páginas dinámicas siempre vuelven a verificar los datos en navegación).
