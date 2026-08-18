---
name: dependency-guardian
description: Garantiza el uso de versiones estables, seguras y actualizadas de todas las dependencias. Protege el monorepo de "Dependency Drift" y vulnerabilidades.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["instalar paquete", "añadir dependencia", "pnpm add", "package.json", "actualizar librerias", "dependency guardian", "pnpm audit"]
  scope: [global]
  version: "1.0.0"
---

# 🛡️ Skill: Dependency Guardian

Esta skill asegura la gobernanza y estabilidad de las librerías dentro del monorepo (pnpm workspaces) y en paquetes aislados, previniendo vulnerabilidades conocidas y desajustes de versiones ("Dependency Drift").

---

## 🚦 Reglas de Gestión de Dependencias

Cualquier propuesta o cambio en dependencias en el archivo `package.json` debe seguir estas directrices estrictas:

### 1. Validación de Versión en Tiempo Real (Prohibido Alucinar)
- **Acción:** No asumas ni inventes números de versión basados en tus datos de entrenamiento estáticos.
- **Protocolo:** Antes de sugerir una instalación, ejecuta una consulta en tiempo real al registro público de paquetes para obtener la última versión estable (y segura) del paquete:
  ```bash
  pnpm view <package-name> version
  ```

### 2. Control de Monorepo (pnpm Workspaces)
En entornos estructurados con múltiples paquetes:
- **Dependencias Compartidas (Root):** Herramientas de desarrollo como `typescript`, `eslint`, `prettier` o compilers deben declararse en el `package.json` raíz del workspace para evitar que cada subproyecto instale versiones distintas.
- **Dependencias Locales (Subpaquetes):** Dependencias de runtime exclusivas (ej. `express` en backend, `react-native` en móvil) deben residir únicamente en sus respectivos subdirectorios.
- **Evitar Duplicaciones Conflictivas:** Si dos paquetes utilizan la misma dependencia utilitaria (ej. `lodash`), valida que ambos compartan la misma versión exacta en sus archivos `package.json` para evitar problemas de hoisting.

### 3. Seguridad y Prevención de CVEs
- **Auditoría:** Sugerir de forma proactiva correr `pnpm audit` al añadir dependencias de terceros críticas (ej. pasarelas de pago, autenticación, cifrado).
- **Parches:** Si se identifica una vulnerabilidad activa en una librería instalada, evalúa y propone actualizarla inmediatamente a la última versión menor parcheada estable.

### 4. Instalaciones Específicas de Expo
- **Regla:** Para aplicaciones React Native y Expo, **nunca** instales paquetes con código nativo de forma directa. Usa siempre:
  ```bash
  pnpm expo install <package-name>
  ```
  Esto consultará los metadatos de compatibilidad de tu SDK de Expo activo para asegurar que no se produzcan fallos en compilaciones de producción.

### 5. Hard Gate — Pre-commit Package Hallucination Check

Antes de cualquier commit que toca archivos `.ts/.tsx/.js/.jsx/.mjs/.cjs`, ejecuta el verificador:

```bash
node ./06-code-quality/dependency-guardian/scripts/check-pkg-exists.mjs --staged
```

**Qué hace:**
- Extrae todos los `import`/`require` de archivos staged (o del directorio si usas `--dir`).
- Para cada paquete: verifica si está en `node_modules` (recursivo hacia arriba). Si no, consulta `pnpm view <pkg> version`.
- 🔴 **Error (bloquea el commit)**: paquete NO existe ni localmente ni en el registro público — alucinación del modelo. El author debe corregir antes de push.
- 🟡 **Warning (no bloquea)**: paquete existe en el registro pero no está instalado — `pnpm add <pkg>` antes de commit.

**Anti-falsos positivos:**
- Built-ins de Node.js (fs, path, crypto, etc.) — skipped.
- Imports relativos (`./`, `../`) y subpath imports (`#name`) — skipped.
- Path aliases de tsconfig/jsconfig (`@/lib`, `~/utils`, alias con prefix `@`/`~`/`@@`/`$`) — leídos del `paths` field, no marcados.
- package.json `imports` field — respetados.

**Wire en pre-commit (3 opciones):**

```bash
# Opción 1: directo en .git/hooks/pre-commit
node ./skills/06-code-quality/dependency-guardian/scripts/check-pkg-exists.mjs --staged || exit 1

# Opción 2: con gga (Gentleman Guardian Angel) — añade la regla a AGENTS.md y gga la ejecuta
# En AGENTS.md:
#   - Antes de commit: ```bash
#     node ./skills/06-code-quality/dependency-guardian/scripts/check-pkg-exists.mjs --staged
#     ```

# Opción 3: husky / lefthook / pre-commit framework — llama al script en hook stage
```

**CI/CD (en pipeline, tras checkout):**

```bash
node ./skills/06-code-quality/dependency-guardian/scripts/check-pkg-exists.mjs --dir ./apps --json | jq '.errors'
```

Salida `--json` para parseo CI; exit 1 si hay errores.

**Auto-invoke rule** (ver `AGENTS.md`):
- Cualquier `import`/`require` nuevo en código staged → el gate debe ejecutarse antes de commit.
- "instalar paquete", "añadir dependencia", "pnpm add", "nuevo import" — disparan esta skill.
