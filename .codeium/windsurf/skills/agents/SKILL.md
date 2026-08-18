---
name: agents
description: Orchestration guide for a team of 9 specialized virtual agents in [APP]. Defines roles, responsibilities, collaboration protocols, and delegation triggers. Use when planning multi-agent work or deciding when to delegate vs. work in place.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["agentes", "equipo de desarrollo", "orquestación", "team playbook", "factoría de software"]
  scope: [global, project]
  version: "1.0.0"
---

# 👥 Manual y Registro de Agentes Especializados ([APP])

Este archivo actúa como el **Director de Orquestación** del equipo de desarrollo. Define cómo cooperan los 9 agentes virtuales especializados para construir, probar y desplegar la aplicación de supermercado, garantizando que el código final cumpla estrictamente con las reglas de ingeniería (SOLID, DRY) y seguridad establecidas.

---

## 📂 Directorio de Roles de la Factoría de Software

Cuando un asistente de IA asume el desarrollo de este proyecto, puede invocar y apoyarse en los siguientes agentes virtuales cargando sus directrices específicas:

| Agente Virtual | Archivo de Directrices | Responsabilidad Principal |
|---|---|---|
| **Diseñador de Arquitectura** | [`architecture-designer`](../architecture-designer/SKILL.md) | Diseñar modelos de datos en Prisma, contratos de API REST, estructuras de carpetas en el monorepo y flujos de Socket.io. |
| **Implementador de Características** | [`feature-implementer`](../feature-implementer/SKILL.md) | Escribir código modular en TypeScript, crear controladores Express, hooks de React Native y controladores de base de datos. |
| **Diseñador de Interfaces (Frontend)** | [`frontend-designer`](../frontend-designer/SKILL.md) | Maquetar pantallas con estética premium, esquemas de color HSL, micro-animaciones fluidas en carritos de compra y layouts responsivos. |
| **Probador de Calidad (QA)** | [`qa-tester`](../qa-tester/SKILL.md) | Crear suites de prueba, simular concurrencia, realizar auditorías de regresión SOLID y verificar la seguridad de pasarelas de pago. |
| **Revisor de Código** | [`code-reviewer`](../code-reviewer/SKILL.md) | Auditar el código generado antes de confirmarlo, buscando violaciones de SOLID, código duplicado (DRY) y exceso de complejidad (KISS). |
| **Verificador de Definición de Listo (DoD)** | [`dod-checker`](../dod-checker/SKILL.md) | Actuar como puerta de calidad definitiva, bloqueando o aprobando la finalización de fases en base a auditorías estrictas de cumplimiento. |
| **Depurador Experto** | [`expert-debugger`](../expert-debugger/SKILL.md) | Rastrear y solventar bugs complejos, fugas de sockets, bloqueos transaccionales de PostgreSQL y cuellos de botella en APIs. |
| **Refactorizador de Rendimiento** | [`performance-refactor`](../performance-refactor/SKILL.md) | Optimizar consultas Prisma, configurar índices en BD, reducir el peso de bundles móviles y configurar caches en memoria. |
| **Escritor Técnico (Documentador)** | [`technical-writer`](../technical-writer/SKILL.md) | Generar la documentación de endpoints de API (Zod schemas), diagramas de arquitectura de base de datos y guías de despliegue Docker. |

---

## 🔄 Protocolo de Colaboración (Team Playbook)

Para construir cualquier característica del mapa de ruta, los agentes ejecutan el **Ciclo de Desarrollo Seguro y de Alta Calidad**:

```mermaid
flowchart TD
    A["Usuario / Road Map"] -->|1. Requisito| B["Diseñador de Arquitectura"]
    B -->|2. Especificaciones| C["Implementador de Características"]
    C -->|3. Código TSX/Node| D["Revisor de Código"]
    D -->|¿Fallas SOLID/DRY?| C
    D -->|Aprobado| E["Probador de Calidad (QA)"]
    E -->|¿Fallas en Pruebas?| C
    E -->|Aprobado| F["Verificador de Definición de Listo (DoD)"]
    F -->|¿Filtro de Calidad?| C
    F -->|Aprobado [🟢 PASS]| G["Escritor Técnico"]
    G -->|4. Documentación y Cierre| H["Fase Completada"]
```

1. **Fase de Planificación:** El *Diseñador de Arquitectura* define el plano del software y las tablas Prisma requeridas.
2. **Fase de Construcción:** El *Implementador de Características* y el *Diseñador Frontend* construyen las pantallas táctiles en Expo y las APIs Express en el backend.
3. **Fase de Control de Calidad (El Triángulo de Acero):**
   - El *Revisor de Código* evalúa que el código sea limpio y cumpla los estándares SOLID.
   - El *QA Tester* ejecuta pruebas unitarias y de integración para garantizar transacciones ACID y evitar fugas.
   - El *DoD Checker* firma la entrega definitiva. Ninguna tarea se marca como completada sin su veredicto.
4. **Fase de Cierre:** El *Escritor Técnico* actualiza la documentación y diagramas antes de entregar al cliente.

---

## 🧯 Delegation Triggers (cuándo delegar, cuándo reauditar)

Gentle-AI keeps the parent/orchestrator thread thin. Once a task stops being small, **delegation or an explicit SDD phase boundary is expected rather than optional**. Use these triggers to know when to stop monologuing and hand off:

| Trigger | Expected behavior |
|---|---|
| Reading 4+ files to understand a flow | Delegate exploration or run an exploration phase |
| Touching 2+ non-trivial files | Use one writer or require fresh review before completion |
| Commit, push, or PR after code changes | Run fresh review unless the diff is trivial docs/text |
| Wrong cwd, worktree/git accident, merge recovery, confusing test/env issue | Stop and run a fresh audit before continuing |
| Long monolithic session with accumulating complexity | Pause and delegate, re-plan, or justify why not |
| Adversarial review of diffs, conflicts, PR readiness, or incidents | Use fresh context when the agent platform supports it |

The goal is **not ceremony**. The goal is to avoid accidental chaos while preserving **one responsible orchestrator and one writer thread**. Use [`kill-switches`](../kill-switches/SKILL.md) to abort when a loop exceeds budget.

### When NOT to delegate
- Single-file edit under ~40 lines with a clear spec → finish in-place, no delegation.
- Cosmetic / docs / formatting → finish in-place.
- A task so small that delegation setup costs more than the task itself.

### Escalation path
delegate → [`judgment-day`](../judgment-day/SKILL.md) (parallel adversarial review) → [`kill-switches`](../kill-switches/SKILL.md) (abort) when needed.

---

## 💼 Valor Comercial para tu Propuesta (¿Para qué sirve al vender?)

Al presentar esta propuesta a un supermercado, incluir la sección **"Agentes de Desarrollo de Software"** (o "Fábrica de Software Automatizada") aporta un valor diferencial gigante frente a programadores independientes o agencias tradicionales:

* **Ingeniería sin Errores Humanos:** Demuestra al cliente que el software no lo programa una sola mente que puede cometer omisiones. Se programa a través de una **factoría de 9 agentes virtuales especializados** donde cada línea de código es auditada de forma cruzada en cuanto a seguridad de pagos, robustez ante caídas y rendimiento de base de datos.
* **Garantía de Calidad Permanente:** Puedes prometer que la aplicación nunca sufrirá de caídas por falta de stock mal procesada o fraudes de Pago Móvil, ya que el agente de QA y el DoD Checker prueban y bloquean cualquier regresión técnica automáticamente antes de subir la app a producción.
* **Trazabilidad y Documentación de Nivel Corporativo:** El supermercado recibirá un manual de operaciones de su software completamente estructurado y actualizado en tiempo real por un agente documentador experto, facilitando futuras expansiones del negocio.
