---
name: tech-escalation-adr
description: Formal protocol to propose, evaluate, and install new technologies outside the fixed stack using Architectural Decision Records (ADRs). Use when introducing a new library, framework, or pattern that deviates from the established stack.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["proponer tecnologia", "sugerir libreria", "cambiar stack", "proponer framework", "adr", "architectural decision record", "escalacion tecnica"]
  scope: [global, project]
  version: "1.0.0"
---

# 🏛️ Skill: Architectural Decision Record (ADR) Escalation

Esta skill previene la degradación del stack tecnológico ("dependency bloat") y asegura que cualquier adición o cambio tecnológico relevante sea documentada y evaluada técnicamente antes de su implementación.

---

## 🚦 Protocolo de Escalación Arquitectónica

Si necesitas introducir una librería o herramienta nueva que no esté especificada en el stack base (o si cambias de versión mayor una existente):

### 1. Detener la Implementación
No instales el paquete de forma automática ni escribas código que dependa de él hasta obtener la firma del usuario.

### 2. Generar el Documento ADR
Crea un archivo temporal de propuesta o muéstralo en el chat con la siguiente estructura:

```markdown
# ADR-[Número]: [Nombre de la propuesta]

## Estado
[Propuesto / Rechazado / Aprobado]

## Contexto y Declaración del Problema
Describe la limitación del stack actual. ¿Qué problema de negocio o técnico estamos resolviendo que no se puede solucionar de forma óptima con las herramientas existentes?

## Decisión Propuesta
Librería, framework o herramienta sugerida. Versión recomendada (debe ser la última versión segura y estable).

## Consecuencias y Análisis de Impacto
- **Monorepo (pnpm Workspaces):** ¿Afecta a múltiples paquetes del monorepo? ¿Genera duplicaciones en node_modules?
- **Rendimiento y Bundle Size:** ¿Cuál es el impacto en el bundle de frontend o en el peso nativo de Expo? (Especialmente crítico en móviles).
- **Seguridad (Licencias & CVE):** ¿Qué tipo de licencia tiene? (Preferiblemente MIT/Apache). ¿Tiene vulnerabilidades reportadas en `pnpm audit`?
- **Mantenibilidad:** ¿Tiene una comunidad activa y soporte oficial para las versiones de node actuales?

## Alternativas Consideradas
Menciona al menos una alternativa descartada y la justificación técnica de su descarte.
```

### 3. Solicitud de Aprobación
Presenta el ADR al usuario. El agente no podrá agregar la tarea de instalación a su plan hasta que el usuario responda explícitamente "Aprobado".

Una vez aprobado, el ADR se guarda en la carpeta `references/adrs/` del proyecto para el registro de auditoría técnica.
