---
name: decision-gate
description: Decision-support system that compresses the human's last-20% judgment from 30 min to 3 min. Presents trade-offs as an ordered matrix, surfaces conflicts with prior decisions (via Engram), offers safe defaults to override, and records the decision + reasoning in Engram. Use when judgment-day or a PRD leaves a decision the human must make and you want it fast, well-informed, and traceable.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex, DeepSeek. Requires Engram binary for conflict surfacing + memory (graceful fallback to markdown log)."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["decision gate", "decisión final", "final decision", "human decision", "trade-off matrix", "go no go", "approve", "judgment", "stakeholder", "override default"]
  scope: [global, project]
  version: "1.0.1"
  time_budget_sec: 180
---

# Decision Gate — compress the human's last 20%

El último 20% de un PRD o feature **no se puede eliminar** — requiere contexto de negocio que el agente no tiene (prioridades stakeholder, risk appetite, presupuesto). Pero se puede **comprimir de 30 min a 3 min** y dejar **rastro trazable**.

Esta skill no decide por el humano. Le da **exactamente lo que necesita decidir rápido**, nada más, y registra la decisión para que la próxima sesión no re-litigue el mismo debate.

> Posicionamiento:
> - [`judgment-day`](../judgment-day/SKILL.md) produce el **diagnóstico** (dos jueces adversariales).
> - [`idea-to-prd-express`](../idea-to-prd-express/SKILL.md) produce el **PRD one-pager**.
> - `decision-gate` (esta skill) cierra el **juicio humano** cuando uno de los dos deja una decisión abierta.

## When to Use

- ✅ `judgment-day` devolvió SPLIT verdict y alguien debe decidir.
- ✅ `idea-to-prd-express` listó "Open questions" que el humano debe resolver.
- ✅ Un ADR ([`tech-escalation-adr`](../tech-escalation-adr/SKILL.md)) compite entre 2+ opciones y nadie tiene criterio.
- ✅ Antes de un merge que depende de una llamada de negocio (launch vs polish, scope cut, integración externa sí/no).
- ❌ **Do NOT use** para decisions puramente técnicas con respuesta objetiva — esas las decide `code-reviewer` o `judgment-day`. Esta skill es para **decisiones con trade-offs subjetivos**.

## The 3-Minute Decision Protocol

`metadata.time_budget_sec: 180` (3 min) es **declarativo** — la skill avisa
del budget pero el **abort real requiere un orchestrator externo**
(`professional-planner`, `judgment-day`, o el host agent). Esta skill no mata
el proceso al llegar al límite; el router y el orchestrator deben:
1. Surfacear el budget al cargar la skill (vía `skill-router --query`).
2. Si el humano no responde a los 3 min, decidir si aceptar default silencioso
   o escalar a una sesión síncrona con el stakeholder.
3. Si el host no provee orchestrator, este budget es solo informativo.

### Step 1 — Decision Matrix (1 min to produce, 30 sec to read)

Presenta la decisión como una matriz ordenada, no como prosa. El humano decide en segundos si el formato es denso.

```
Decisión: <una frase>

| Opción | Cost   | Risk  | Reversibilidad | Stakeholder impact | Default? |
|---|---|---|---|---|---|
| A: <name> | ~8h    | bajo  | alta (rollback fácil) | solo dev team | ✅ default seguro |
| B: <name> | ~24h   | medio | media (DB migration)  | ops + soporte  |          |
| C: <name> | ~40h   | alto  | baja (rewrite)        | clientes finales|          |

Eje de incertidumbre: <¿qué es lo que NO sabemos y haría cambiar la decisión?>
```

Reglas:
- **3 opciones máximo**. Más es analysis paralysis. Menos de 2 no es decisión, es diktat.
- **Una marcada como "default seguro"** — la que el humano aceptaría sin pensar. Es el override path más rápido.
- **Eje de incertidumbre explícito** — la variable que, si se resolviera, haría la decisión obvia. Eso le dice al humano dónde investigar si no quiere aceptar el default.

### Step 2 — Conflict surfacing (30 sec, via Engram)

Antes de que el humano decida, busca en memoria si ya hay una decisión previa sobre el mismo tema. Esto se hace automáticamente dentro de
[`scripts/resolve-default.mjs`](scripts/resolve-default.mjs) (Step 1 del
algoritmo) — corre `engram search` y decide si reforzar o marcar conflicto.

Si el script detecta match y **contradice** la opción "default seguro":

```
⚠️ Conflicto con decisión previa:
  [2025-11-04] "Adoptamos Zustand sobre Redux para state" (decision, project X)
  → La opción C "usar Redux" contradice este registro.
  → Override explícito requerido: responde "override: <razón>" o acepta A/B.
```

Si Engram no está disponible, el script cae al fallback de `lower-risk` o
`domain-rule` (si la opción declarada tiene `risk` o tags aplicables) o
devuelve `default: null` con `default_source: "engram-unavailable"` para que
el humano decida sin bias.

### Step 3 — Default-override path (30 sec del humano)

El humano responde una de tres formas:

```
"A"                     → acepta opción A (el default seguro), registro y cerrar.
"override: B porque <razón>"  → elige no-default, debe justificar, registro + reasoning.
"need: <info>"          → no decide todavía, identifica qué falta. schedule research-first.
```

La fricción es **asimétrica por diseño**:
- Aceptar default = 1 palabra.
- Override = requiere razón.
- Necesitar más info = identifica exactamente qué.

**El default NO lo decide la IA.** Se resuelve ejecutando
[`scripts/resolve-default.mjs`](scripts/resolve-default.mjs) — un script
determinista con el algoritmo Engram prior decision > lower `risk` field >
domain-rule-by-marker > "no default, decide tú". La IA solo ejecuta el
script; nunca inventa el default.

```bash
# 1. Run the resolver
node scripts/resolve-default.mjs \
  --topic "<tópico de la decisión>" \
  --options '[{"name":"A","risk":"bajo","reversibilidad":"alta"},{"name":"B","risk":"medio"}]'

# 2. Read the JSON output
# { "default": "A", "default_source": "lower-risk", "conflict_with": null }
#
# default_source values:
#   "engram-prev"             — Engram had a prior decision that names one of the options
#   "engram-conflict"         — Engram had a prior but it didn't name any current option (default: null)
#   "engram-unavailable"      — Engram binary not reachable; no default proposed
#   "lower-risk"              — Engram reachable but no prior; picked the lowest-risk option
#   "domain-rule"             — Engram reachable, no prior, no risk field; applied domain rule
#   "none"                    — No rule produced a default; agent must not invent
#
# 3. If default != null, present it to the human as the recommended path.
# 4. If default == null, surface the reason (conflict_with or default_source)
#    and require an explicit override.
```

El documento [`references/default-resolution.md`](references/default-resolution.md)
se mantiene como referencia humana del algoritmo (qué hace, por qué) — no
como runtime. El runtime es el script.

Cuanto más se desvía el humano del default, más información deja registrada. Eso es lo que hace que la próxima sesión no repita el debate.

### Step 4 — Record (30 sec, automatic)

Guarda la decisión en Engram (si está disponible) con reasoning:

```bash
engram save "<decisión:"" + título corto>" \
  "Option <X> chosen. Reasoning: <razón o 'default accepted'>. Conflict: <sí/no + id previo>. Uncertainty axis: <eje>." \
  --type decision --project <nombre> 
```

Si Engram no disponible, append a `DECISIONS.md` del proyecto:

```markdown
## YYYY-MM-DD — <título>
- Option: <X>
- Reasoning: <razón>
- Conflict with prior: <sí/no + ref>
- Uncertainty axis: <eje>
```

**Por qué registrar**: la próxima vez que el agente enfrente la misma decisión, busca en Engram primero y evita re-litigar. El ahorro acumulado de no repetir debates es el ROI real de esta skill.

## What this skill does NOT do

- **No decide por el humano.** Sugiere default + expone trade-offs + surfacea conflictos. La última palabra es del humano.
- **No inventa opciones.** Las opciones vienen de `judgment-day` / `idea-to-prd-express` / `tech-escalation-adr`. Esta skill las formatea y lee.
- **No bloquea el flujo.** Si el humano no responde en su turno, el agente continúa con el default seguro y marca la decisión como "default-accepted-silently" en Engram.
- **No reabre decisiones cerradas.** Si Engram tiene una decisión previa y el humano no pide override, se respeta. Si pide override, se registra el cambio.

## Anti-patterns

- ❌ Matriz con 5+ opciones → analysis paralysis. Cortar a 3.
- ❌ Default "neutro" (sin recomendación) → estás regalando valor. El default es tu recomendación.
- ❌ No registrar decisiones → la próxima sesión repite el debate. Siempre record.
- ❌ Registrar sin reasoning → Engram sabe **qué** decidiste pero no **por qué**, no se puede aprender de conflictos futuros.
- ❌ Usar esta skill para decisions técnicas con respuesta objetiva (ej. "¿Este hook se limpia?") — eso es `code-reviewer`, no judgment humano.

## Integration

| Necesidad | Skill |
|---|---|
| Diagnóstico adversarial antes de decisión | [`judgment-day`](../judgment-day/SKILL.md) |
| PRD con open questions | [`idea-to-prd-express`](../idea-to-prd-express/SKILL.md) |
| ADR arquitectónico | [`tech-escalation-adr`](../tech-escalation-adr/SKILL.md) |
| Memoria previa / conflict surfacing | [`engram-integration`](../engram-integration/SKILL.md) (`engram search` + `memjudge`) |
| Research si "need: <info>" | [`research-first`](../research-first/SKILL.md) |

## Example

```
Context: judgment-day devolvió SPLIT sobre si usar Server Components (Next 15) o CSR para /checkout.

Decisión: SSR vs CSR para la página de checkout

| Opción | Cost  | Risk  | Reversibilidad | Stakeholder impact | Default? |
|---|---|---|---|---|---|
| A: SSR (Server Components) | ~6h   | bajo  | alta (flip a "use client" en 1 línea) | solo dev | ✅ default seguro |
| B: CSR + SWR cache         | ~4h   | medio | media (re-arch data fetching)        | dev + QA |          |
| C: Hybrid (SSR shell + CSR islands) | ~16h | alto | baja (rewrite layout)       | dev team amplio |      |

Eje de incertidumbre: si el equipo acepta el overhead de hydration en mobile low-end (no lo sabemos sin medir).

🔍 Engram search "checkout SSR vs CSR":
   ⚠️ [2025-09-12] "Checkout CSR por latencia en mobile" (decision, proyecto Y)
   → La opción A contradice este registro. Override explícito requerido.

→ Respuesta humana esperada: "override: A porque el mobile low-end ya midió '24 y mejoró, aceptamos hydration overhead"

→ Registro Engram:
   engram save "decisión: checkout SSR" "Option A chosen overriding prior CSR-by-latency decision. Reasoning: mobile perf improved '24. Conflict: sí, #47 (2025-09-12)." --type decision --project X
```

## Keywords
decision gate, human decision, trade-off matrix, go no go, approve, override default, judgment, decisión final, conflict surfacing