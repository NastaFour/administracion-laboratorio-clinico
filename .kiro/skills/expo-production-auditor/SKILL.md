---
name: expo-production-auditor
description: Audits and prevents native build failures on Android/iOS. Runs Hermes compatibility analysis, circular dependency detection, and production bundler checks. Use before EAS build, when Expo native build fails, or when adding native modules.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["compilar apk", "build android", "eas build", "error apk expo", "prebuild", "producción mobile", "expo compilation", "expo error"]
  scope: [project]
  version: "1.0.0"
---

# 📱 Expo Production & Bundling Auditor

Esta skill guía a los agentes para evitar que una aplicación que funciona correctamente en "Expo Go" (desarrollo) falle al compilarse o ejecutarse en su versión standalone de producción (APK/IPA).

---

## 🚨 Checklist de Validación de Bundling de Producción

Cualquier agente implementando código móvil debe auditar estos 4 frentes críticos antes de dar la fase por completada:

### 1. Detección de Dependencias Circulares (Metro Bundler)
Las dependencias circulares (módulos que se importan cíclicamente) rompen la inicialización en producción y cargan clases o servicios como `undefined` de forma silenciosa.
- **Acción Obligatoria:** Comprobar el orden de las importaciones. Si es posible, correr un analizador estático local (`pnpm dlx madge --circular --extensions ts,tsx ./src`) en el directorio de la aplicación móvil.
- **Regla:** Queda prohibido cruzar importaciones entre servicios, componentes y tipos del sistema. Si hay importaciones cruzadas, reorganizar el código extrayendo la parte compartida a un archivo utilitario común.

### 2. Compatibilidad del Motor JS Hermes (Strict Mode)
Hermes compila el JavaScript a bytecode estático en producción. Es mucho más estricto que el motor V8 de desarrollo.
- **Evitar eval/dynamic evaluation:** No utilizar `eval()`, ni APIs dinámicas de generación de código.
- **Verificación de Tipos/Variables:** Asegurar que todas las variables estén declaradas con `const` o `let`. El uso de variables implícitas lanzará una excepción fatal en Hermes.
- **Polyfills:** Verificar que APIs de JavaScript no estándares o muy nuevas tengan los polyfills correspondientes cargados en el punto de entrada de la aplicación.

### 3. Carga de Assets Estática (Zero Dynamic Requires)
El empaquetador Metro necesita saber en tiempo de compilación exactamente qué imágenes, fuentes y archivos se van a incluir en el APK/IPA.
- **Prohibido:** `const img = require('./assets/' + nombreImage + '.png')` (Causará que el build no incluya la imagen y crasheará en runtime).
- **Permitido:** 
  ```typescript
  import logo from './assets/logo.png';
  // o
  const IMAGES = { logo: require('./assets/logo.png') };
  ```

### 4. Instalación de Librerías Nativas Sincronizada
- **Regla Inquebrantable:** Prohibido usar `pnpm add` o `yarn add` directamente para librerías con dependencias nativas (ej. `react-native-reanimated`, `expo-location`, `expo-secure-store`).
- **Acción:** Forzar el uso de `pnpm expo install <package-name>`. Esto asegura que el paquete nativo sea compatible con la versión exacta del SDK de Expo que tiene la aplicación configurada.
- **Verificación de Salud:** Ejecutar `pnpm expo install --check` para alinear dependencias obsoletas.

---

## 🚀 Pre-check de EAS Build Local
Antes de enviar el build a los servidores de EAS o generar el binario local, la IA debe sugerir la ejecución de:
```bash
pnpm expo prebuild --clean
```
Esto genera las carpetas temporales de `/android` y `/ios` de forma local para diagnosticar si el código TypeScript o las dependencias nativas rompen el compilador Gradle (Android) o CocoaPods (iOS) antes de consumir recursos en la nube.
