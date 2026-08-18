# Tailwind CSS v4 L1 Documentation Cache

Este documento sirve como caché local L1 para evitar llamadas innecesarias o fallas de red con Context7 MCP.

## 🎨 Arquitectura CSS-First (Breaking Changes)

En Tailwind v4, la configuración ya no se realiza en un archivo `tailwind.config.js` de JavaScript, sino **directamente en tu archivo CSS principal** usando la directiva `@theme`.

### 1. Reemplazo de Directivas
Ya no se usan las tres directivas `@tailwind base; @tailwind components; @tailwind utilities;`. En su lugar, se importa Tailwind directamente:
```css
/* index.css */
@import "tailwindcss";
```

### 2. Configuración del Tema (`@theme`)
Para extender o modificar el tema (colores, fuentes, espaciados), utiliza la regla `@theme`:
```css
@import "tailwindcss";

@theme {
  --color-brand-primary: #3b82f6;
  --color-brand-secondary: #1d4ed8;
  
  --font-display: "Outfit", sans-serif;
  
  /* Para resetear un valor en lugar de extenderlo, usa 'initial' */
  --color-red-500: initial;
}
```

---

## 🚀 Nuevas Utilidades y Cambios

### 1. Variables CSS de Salida
Cualquier variable definida en el bloque `@theme` se expone automáticamente como una clase de utilidad (por ejemplo, `--color-brand-primary` genera la clase `bg-brand-primary` y `text-brand-primary`) y como variable CSS nativa (`var(--color-brand-primary)`).

### 2. Detección Automática de Rutas (Content Scanning)
Tailwind v4 **no requiere configurar la propiedad `content`** para escanear tus archivos. Detecta automáticamente los archivos fuente en tu proyecto (incluyendo subcarpetas y extensiones habituales como `.html`, `.js`, `.ts`, `.jsx`, `.tsx`, `.vue`, `.svelte`).

### 3. Utilidad `cn()` Dinámica (Clásico Patrón de Fusión)
Para combinar clases condicionales de Tailwind v4 de forma segura sin colisiones, utiliza la combinación de `clsx` y `tailwind-merge`:
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 🌗 Dark Mode

El modo oscuro en Tailwind v4 se configura de forma simplificada. Usa la variante `dark:` que por defecto responde a la consulta de medios `prefers-color-scheme` o a la clase `.dark` en un elemento contenedor superior (típicamente `<html>`).
```html
<!-- Se activa si el sistema está en modo oscuro o si la clase 'dark' está presente -->
<div class="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
  Contenido
</div>
```
