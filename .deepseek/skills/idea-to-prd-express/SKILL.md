---
name: idea-to-prd-express
description: Compress Briefing→Spec→PRD into a 20-minute session for technical decisions that need fast turnaround. Use when the user has a concrete technical decision to make (not a full feature) and full 6-phase SDD is overkill.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["idea to prd", "prd express", "express sdd", "fast prd", "20 minute prd", "comprimir sdd", "idea a prd", "briefing express"]
  scope: [global, project]
  version: "1.0.1"
  time_budget_sec: 1200
---

# Idea → PRD Express (20 min)

Modo comprimido de [`professional-planner`](../professional-planner/SKILL.md) para **decisiones técnicas concretas** que no necesitan el SDD de 6 fases completo. Mueve el briefing, spec y PRD a una sola sesión tight.

> **No reemplaza** `professional-planner`. Lo **complementa**: úsalo cuando el SDD full sea overkill (1 decisión, no una feature). Si la decisión se complica → escala a SDD completo.

## When to Use

- ✅ Decisión técnica única (elegir librería, patrón de estado, esquema de DB para una tabla).
- ✅ Spike: validar factibilidad antes de comprometerse.
- ✅ "De idea a PRD en 20 min" — cuando el usuario tiene una idea y requiere un PRD rápido para decidir.
- ✅ ADR que justifica R&D con compressed paths.
- ❌ **Do NOT use** para features que tocan 2+ dominios o 5+ archivos → usa `professional-planner` (SDD 6 fases).
- ❌ **Do NOT use** para decisiones de arquitectura mayor (nuevo servicio, nueva DB) → [`tech-escalation-adr`](../tech-escalation-adr/SKILL.md).

## The 20-Minute Budget

`metadata.time_budget_sec: 1200` (20 min) es **declarativo** — la skill avisa
del budget pero el **abort real requiere un orchestrator externo**
(`professional-planner`, `judgment-day`, o el host agent). Esta skill no mata
el proceso al llegar al límite; el router y el orchestrator deben:
1. Surfacear el budget al cargar la skill (vía `skill-router --query`).
2. Decidir a los 18 min si abortar, extender, o escalar a SDD full.
3. Si el host no provee orchestrator, este budget es solo informativo.

Express mode es **cronometrado**. Si pasas los 20 min sin PRD → escala a SDD full.

| Min | Phase | Output |
|---|---|---|
| 0-3 | **Brief** | Una frase de subject + una de target user + una de "what does success look like" |
| 3-8 | **Constraints surface** | Lista hardcoded de constraints (stack fijo, integraciones, performance budget, security) |
| 8-14 | **Options sketch** | 2-3 opciones con trade-offs explícitos + recomendación |
| 14-18 | **Spec delta** | Qué cambia en el codebase si se acepta la opción recomendada (archivos touch, migrations, API surface) |
| 18-20 | **PRD one-pager** | Markdownpegable que el humano puede leer y aprobar/rechazar en 2 min |

## Phase 1 — Brief (3 min)

Responde en texto, **no más de 3 frases**:

```
Idea:      <qué se quiere construir/decidir>
Target:    <para quién / qué sistema afecta>
Success:   <cómo se ve el "done" — observable, no ambiguo>
```

Reglas:
- Si no puedes expresar la idea en una frase, la idea no está lista para PRD — escala a SDD.
- "Success" debe ser observable ("latencia < 200ms en p95", no "rápido").
- No te permite hacer brainstorming largo — el reloj corre.

## Phase 2 — Constraints surface (5 min)

Lista **hardcoded** (no Allowed myself options todavía):

```
Stack fijo:    Node/Express/Prisma/PostgreSQL + React/Vite/Tailwind + Expo
Forbidden:     any, npm/npx, secrets en código, LocalStorage para tokens
Integraciones: <existente: socketio, engram, etc.>
Budget:        <latencia, bundle size, DB queries>
Security:      <Zod en payloads, httpOnly cookies, etc.>
```

Si una constraint es ambigua → **pregunta al humano**, no inventes. El express mode falla cuando se asumen constraints.

## Phase 3 — Options sketch (6 min)

Dos o tres opciones **máximo**. Una sola opción no es una decisión, es un diktat. Cuatro+ es análisis paralysis.

Para cada opción:

```
Option A: <nombre>
  What:     <qué cambiar / adoptar>
  Pros:     <2-3 bullets concretos>
  Cons:     <2-3 bullets concretos — incluye "no resuelve X">
  Cost:     <horas estimadas / dependencias nuevas / migraciones>
  Risk:     <bajo|medio|alto> + una frase de por qué
```

Después de las opciones, **recomienda una** con reasoning. El humano decide, pero tú no te escondas — si no das recomendación, no agregas valor.

## Phase 4 — Spec delta (4 min)

Si la opción recomendada se acepta, **qué cambia en el codebase**:

```
Files touched:   <lista de archivos nuevos/modificados>
Migrations:      <si toca DB>
API surface:     <endpoints nuevos/cambiados>
Types:           <Zod schemas / TS types nuevos>
Tests:           <qué cubrir — ver testing-patterns o playwright>
```

No escribas código todavía — esto es **scope del cambio**, no implementación.

## Phase 5 — PRD one-pager (2 min)

Markdownpegable que el humano lee en < 2 min y responde "go" / "no go" / "changeme X":

```markdown
# PRD — <Idea>

## Problem
<1-2 frases del Brief>

## Constraints
- <las del Phase 2>

## Recommendation
**Option <X>** because <reasoning>.

## Scope
- Files: <lista>
- Migrations: <sí/no + cuáles>
- API: <cambios>
- Tests: <cobertura>

## Cost / Risk
- ~<horas> horas · Risk: <bajo/medio/alto>

## Open questions
1. <pregunta al humano si queda alguna>

---
Approve? (go / no go / change X)
```

## Rules

1. **20 min hard cap.** Si te pasas, escala a `professional-planner` — express mode que degrada a full SDD no es express.
2. **Una decisión por sesión.** Multi-decision → `professional-planner`.
3. **No implementes.** El output es un PRD, no código. Implementation va en sesión/phase siguiente.
4. **Recomienda, no te escondas.** Un PRD sin recomendación es un survey, no una decisión.
5. **Constraints hardcoded.** Asumir constraints es la causa #1 de PRDs express que fallan en implementación.
6. **Human gate obligatorio.** Nunca procedas a implement sin el "go" del humano. Express ≠ autónomo.

## When to escalate

| Síntoma | Escala a |
|---|---|
| Te pasaste de 20 min | `professional-planner` (SDD 6 fases) |
| Specs toca 2+ dominios | `professional-planner` |
| Opciones compiten a nivel arquitectura | `tech-escalation-adr` |
| Necesitas research antes de decidir | `research-first` |
| Humano quiere validar visualmente | `ai-ui-generation` (si es UI) |
| Decisión requiere memoria previa | `engram-integration` (`mem_search`) |
| No estás seguro de qué skill invocar | `tech-stack-advisor` |

## Integration

- [`professional-planner`](../professional-planner/SKILL.md) — el SDD full del que este es un modo comprimido.
- [`tech-escalation-adr`](../tech-escalation-adr/SKILL.md) — cuando la decisión es arquitectónica mayor.
- [`research-first`](../research-first/SKILL.md) — cuando necesitas investigar antes.
- [`engram-integration`](../engram-integration/SKILL.md) — buscar decisiones previas relacionadas.
- [`session-notes`](../session-notes/SKILL.md) — guardar el PRD express en memoria.

## Keywords
idea to prd, prd express, express sdd, fast prd, technical decision, 20 minute prd, compressed sdd, decisión técnica