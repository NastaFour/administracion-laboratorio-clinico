# Diagnostic Decision Tree — Frontend Visual Symptoms

> Follow branches in order (highest probability first). Each leaf has: cause, verification, fix.

## Symptom 1: "Page renders without CSS" (plain text, no styling)

```
Se ve sin CSS
├── postcss.config.js existe?
│   ├── NO → CAUSA: Tailwind @tailwind directives no procesadas
│   │        VERIFICAR: ls apps/web/postcss.config.js
│   │        FIX: Crear postcss.config.js con { plugins: { tailwindcss: {}, autoprefixer: {} } }
│   │        SKILL: build-config-validator --fix
│   └── SÍ ↓
├── tailwind.config.js tiene DEFAULT en paleta primary?
│   ├── NO → CAUSA: bg-primary/text-primary no resuelven color
│   │        VERIFICAR: grep "DEFAULT" tailwind.config.js
│   │        FIX: Agregar DEFAULT: "#0ea5e9" al objeto primary
│   │        SKILL: build-config-validator
│   └── SÍ ↓
├── index.css tiene @tailwind base/components/utilities?
│   ├── NO → CAUSA: Tailwind no injecta estilos
│   │        VERIFICAR: grep "@tailwind" apps/web/src/index.css
│   │        FIX: Agregar @tailwind base; @tailwind components; @tailwind utilities;
│   └── SÍ ↓
├── Vite cache corrupto?
│   ├── POSIBLE → VERIFICAR: rm -rf node_modules/.vite && pnpm dev
│   │           FIX: Limpiar cache + restart
│   └── NO ↓
└── CSS import order incorrecto?
    └── VERIFICAR: Revisar main.tsx que importe index.css antes de App
        FIX: Mover import "./index.css" arriba de import App
```

## Symptom 2: "Components show no data" (empty fields, no names/avatars/ratings)

```
Componentes sin data
├── API responde con data?
│   ├── NO (404/500) → CAUSA: Backend error o endpoint incorrecto
│   │              VERIFICAR: Network tab → response status
│   │              FIX: Corregir endpoint o backend
│   └── SÍ (200 con data) ↓
├── Data shape del frontend coincide con API?
│   ├── NO → CAUSA: Frontend accede barber.profile?.rating pero API devuelve UserProfile plano
│   │        VERIFICAR: Comparar JSON response con tipos del frontend
│   │        FIX: Helper functions getBarberName/Avatar/Rating que manejen ambas formas
│   │        SKILL: api-response-normalizer
│   └── SÍ ↓
├── TanStack Query está cacheando data vieja?
│   ├── POSIBLE → VERIFICAR: React Query Devtools → cache state
│   │           FIX: queryClient.invalidateQueries() o staleTime: 0
│   └── NO ↓
└── Componente renderiza antes de que data llegue?
    └── VERIFICAR: Revisar isLoading/isError states en componente
        FIX: Agregar loading state con skeleton/spinner
```

## Symptom 3: "Map shows no markers" (Leaflet map empty)

```
Mapa sin markers
├── markers array tiene elementos?
│   ├── NO → CAUSA: Data no llegó o está vacía
│   │        VERIFICAR: console.log(markers) en componente
│   │        FIX: Verificar flujo de data (ver Symptom 2)
│   └── SÍ ↓
├── Lat/Lng son números válidos (no undefined)?
│   ├── NO → CAUSA: Frontend accede barber.lat pero API devuelve barber.profile.lat
│   │        VERIFICAR: console.log(marker.lat, marker.lng) → NaN?
│   │        FIX: Helper getBarberLat/Lng que maneje shapes anidadas
│   │        SKILL: api-response-normalizer
│   └── SÍ ↓
├── Leaflet cargó correctamente?
│   ├── POSIBLE → VERIFICAR: Errores en consola sobre L is not defined
│   │           FIX: Verificar import de leaflet + CSS
│   └── NO ↓
└── Marker component está dentro del MapContainer?
    └── VERIFICAR: JSX estructura — markers deben ser hijos de MapContainer
        FIX: Mover Marker dentro de <MapContainer>
```

## Symptom 4: "Images show [object Object] or broken"

```
Imágenes rotas / [object Object]
├── img src es string o object?
│   ├── OBJECT → CAUSA: Prisma devuelve UserGallery[] ({id, imageUrl, caption})
│   │           pero frontend trata como string[]
│   │           VERIFICAR: console.log(typeof img) → "object"
│   │           FIX: Usar img.imageUrl en vez de img
│   │           SKILL: prisma-frontend-types
│   └── STRING ↓
├── URL es válida (no undefined/empty)?
│   ├── NO → CAUSA: Campo imageUrl vacío en DB
│   │        VERIFICAR: Revisar DB o API response
│   │        FIX: Agregar fallback image / placeholder
│   └── SÍ ↓
└── URL requiere auth headers?
    └── VERIFICAR: Si es S3/firmada, puede necesitar token
        FIX: Usar componente con auth o pre-signed URL
```

## Symptom 5: "Unauthenticated users can't see public pages (redirect loop)"

```
Redirect loop en páginas públicas
├── Axios interceptor redirige en 401?
│   ├── SÍ → CAUSA: Interceptor hace window.location = "/login" en CUALQUIER 401
│   │        incluyendo getMe() que App.tsx llama en cada carga
│   │        VERIFICAR: grep "window.location" en axios interceptor
│   │        FIX: Eliminar redirect automático del interceptor. Cada página maneja 401.
│   │        SKILL: auth-flow-audit
│   └── NO ↓
├── React Router protected route wrapping public routes?
│   ├── SÍ → CAUSA: <ProtectedRoute> envuelve rutas públicas
│   │        VERIFICAR: Revisar router config
│   │        FIX: Mover rutas públicas fuera de ProtectedRoute
│   └── NO ↓
└── App.tsx llama getMe() que falla y redirige?
    └── VERIFICAR: Revisar useEffect en App.tsx
        FIX: getMe() debe fallar silenciosamente en páginas públicas
        SKILL: auth-flow-audit
```

---

## Mobile (Expo) Variant

Para React Native / Expo, el árbol es diferente:
- **Sin CSS**: No aplica (RN usa StyleSheet, no CSS). Si estilos no aplican → verificar StyleSheet.create + style props
- **Sin data**: Mismo árbol que web (data shape mismatch)
- **Sin markers**: Mismo árbol que web (lat/lng shape)
- **Redirect loop**: Mismo árbol (interceptor / navigation)
