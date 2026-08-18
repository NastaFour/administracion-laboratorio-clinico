# Metodología Spec-Driven Development (Gentleman SDD 2026)

## 🧠 Filosofía
"Crear software no es picar código sin pensar". En el desarrollo asistido por IA, la alucinación y el desorden son los peores enemigos del programador. Invertir tiempo en la especificación, diagramación y tipado estricto reduce los errores en producción en un 95%. La IA ejecuta; el humano pilota y diseña.

---

## 📋 El Framework RTCRO para Prompts
Para cualquier inicio de fase o feature, el agente debe estructurar su razonamiento usando:
1. **Role (Rol):** Definir el rol técnico adecuado del catálogo de agentes (ej. Arquitecto de Software).
2. **Task (Tarea):** La acción específica y acotada que se va a realizar.
3. **Context (Contexto):** Estado actual del código, dependencias del monorepo y restricciones físicas de hardware.
4. **Reasoning (Razonamiento):** Obligar al modelo a escribir en texto su lógica y alternativas de solución antes de modificar cualquier archivo.
5. **Output (Salida):** Definir el formato exacto esperado (ej. un PRD, un archivo de tipos `.ts`, o tests).

---

## ⚙️ Modos de Control del Contexto
- **Spec First:** La especificación completa (PRD + Tipos) se escribe y aprueba antes de crear el primer archivo de código.
- **Spec Anchor:** La documentación y diagramas Mermaid se actualizan y sincronizan en caliente a medida que surgen cambios imprevistos en el diseño.
- **Spec as Source:** La especificación es la única fuente de verdad. El agente tiene prohibido tomar decisiones creativas que violen los contratos de tipos aprobados en la Fase 3.
