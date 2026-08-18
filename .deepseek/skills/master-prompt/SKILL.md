---
name: master-prompt
description: Master prompt to generate the Expo Go mobile demo app for the [APP] project. Use when you need a functional offline demo for a sales pitch. Do not use for real production feature development.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["generar demo", "app de prueba", "demo Expo Go", "prompt maestro", "aplicación de demostración"]
  scope: [global, project]
  version: "1.0.0"
---

# 📱 Master Prompt: Expo Go Mobile Demo ([APP])

Este archivo contiene el prompt maestro para generar la aplicación móvil de demostración en **Expo Go** utilizando un asistente de inteligencia artificial en una nueva conversación.

Copie y pegue las instrucciones del bloque inferior para iniciar el desarrollo autónomo de la aplicación de prueba de forma offline/local (con backend e inventario simulados).

---

```markdown
Actúa como un desarrollador experto en React Native, Expo Go y TypeScript. Tu objetivo es generar una aplicación móvil de demostración funcional de alta fidelidad para presentar una propuesta comercial de supermercado ([APP]). 

Como es una demo de preventa para ejecutar directamente en un teléfono real mediante Expo Go, la aplicación debe ser COMPLETAMENTE AUTÓNOMA: simulará internamente (en memoria y estado local de React) la base de datos PostgreSQL, las notificaciones push, la lógica del servidor Express, y la mensajería en tiempo real. No requiere ningún backend externo activo para funcionar.

Para codificar esta aplicación, DEBES leer, aplicar y respetar estrictamente las directrices y arquitecturas especificadas en los siguientes archivos de habilidades locales en mi computadora:

### 🛠️ 1. HABILIDADES Y DIRECTRICES A APLICAR (Rutas Absolutas)

1. **Diseño de Código Limpio y Arquitectura:**
   - **Ruta:** `C:\Users\j1347\Desktop\skills\proyecto-skills\skill-solid-clean-code.md`
   - **Aplicación:** Aplica estrictamente el Principio de Responsabilidad Única (SRP). Separa los componentes puramente de presentación (UI) de los hooks de contenedor de lógica (`useCatalog`, `useCheckout`, `useGPS`). Las funciones no deben exceder las 40 líneas de código y se debe evitar código duplicado (DRY).
   
2. **Optimización Móvil React Native:**
   - **Ruta:** `C:\Users\j1347\Desktop\skills\proyecto-skills\skill-react-native.md` y `C:\Users\j1347\Desktop\skills\proyecto-skills\skill-expo.md`
   - **Aplicación:** Usa `FlatList` con optimizaciones de renderizado (`React.memo` para las tarjetas de productos). Asegura que el hilo de interfaz sea fluido y libre de bloqueos de memoria.

3. **Flujos Financieros de Venezuela:**
   - **Ruta:** `C:\Users\j1347\Desktop\skills\proyecto-skills\skill-payments.md`
   - **Aplicación:** Implementa el modelo multi-moneda indexado en USD con conversión a VES usando la tasa oficial del BCV. Implementa las interfaces de simulación para:
     - **Pago Móvil C2P:** Formulario de banco, teléfono, cédula y modal de confirmación con Clave Dinámica (OTP).
     - **Cashea (BNPL):** Tabla interactiva con el pago inicial (40%) y las 3 cuotas quincenales remanentes. Simulación de animación de redirección por Deep Link.
     - **Efectivo Divisas:** Registro del cobro físico por parte del repartidor en destino.

4. **Tracking de Delivery y Geolocalización:**
   - **Ruta:** `C:\Users\j1347\Desktop\skills\proyecto-skills\skill-maps-gps.md`
   - **Aplicación:** Simulación de movimiento del Courier en un mapa vectorial SVG/Canvas a lo largo de coordenadas prefijadas, disparando actualizaciones simuladas cada 5 segundos de forma asíncrona y limpiando los listeners al desmontar el componente.

5. **Mensajería en Tiempo Real y Notificaciones:**
   - **Ruta:** `C:\Users\j1347\Desktop\skills\proyecto-skills\skill-socketio.md` y `C:\Users\j1347\Desktop\skills\proyecto-skills\skill-push-notifications.md`
   - **Aplicación:** Simulación interna mediante un Bus de Eventos (`EventEmitter` local) para emular la comunicación bidireccional cliente-servidor (ej: eventos `order:created`, `driver:location:update` y alertas de cambio de estado `PENDING` -> `PREPARING` -> `SHIPPED` -> `DELIVERED`).

6. **Asistente de Soporte de Inteligencia Artificial:**
   - **Ruta:** `references/skill-llm-integration.md` y `../application-workflow/SKILL.md`
   - **Aplicación:** Simulación del flujo de falta de stock físico (Pipeline B del workflow). Llama a una función mock de IA que genera una propuesta semántica de sustitución de producto (ej. Pan Blanco por Pan Integral) y abre la hoja de chat con el usuario de manera interactiva.

---

### 📱 2. ESTRUCTURA DE PANTALLAS DE LA APP MÓVIL
Diseña una UI con modo oscuro (HSL/Navy profundo), tarjetas con glassmorphism, bordes redondeados y tipografías premium:
1. **Catálogo:** Muestra productos, emojis, stock actual, precios en USD/VES, botón de agregar y carrito flotante.
2. **Carrito y Checkout:** Resumen de compra, selector de Pago Móvil, Cashea o Efectivo, entrada de dirección y confirmación.
3. **Modales de Pago:** Entrada de OTP para C2P; tabla de cuotas y confirmación para Cashea.
4. **Tracking en Vivo:** Línea de tiempo de estados (`Recibido` -> `Empacando` -> `En Ruta` -> `Entregado`) y mapa SVG interactivo con motocicleta `🛵` en movimiento.
5. **Chat de Soporte AI:** Hoja flotante (*BottomSheet*) que se activa de forma simulada para ofrecer la sustitución de productos agotados.

---

### ⚙️ 3. MENÚ DE DESARROLLADOR OCULTO (HERRAMIENTAS DEL PRESENTADOR)
Incluye un botón oculto o accesible mediante 3 toques en la cabecera para abrir un panel flotante de control:
- **Modificar tasa BCV:** Para cambiar la tasa cambiaria de inmediato en todos los componentes.
- **Modificar stock:** Forzar stock de productos a 0.
- **Disparar Alerta de Stock (Trigger AI):** Activa la falta de stock del producto seleccionado en tienda para abrir la interfaz del chat de soporte AI del comprador de forma controlada durante tu pitch.
- **Ajustar velocidad del GPS:** Modificar la velocidad del movimiento de la moto en el mapa.
- **Reiniciar simulación:** Limpia órdenes y restablece inventario.

Genera el código de componentes, estilos integrados (`StyleSheet.create`) y lógica simulada en una estructura TypeScript modular y limpia de Expo Go fácil de ejecutar e instalar en mi teléfono.
```
