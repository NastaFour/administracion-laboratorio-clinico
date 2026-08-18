# Default-resolución hardcoded — decision-gate

El "default seguro" de `decision-gate` NO lo decide la IA. Lo resuelve esta **regla determinista** en orden estricto:

## Algoritmo de default (ejecutar en este orden, parar al primer match)

1. **Engram search** con el topic de la decisión.
   - Si existe una observación previa del mismo tipo que contradice la opción con menor `risk` → **no hay default**; el humano debe override explícito. El agente marca el conflicto y para.
   - Si existe una observación previa que **refuerza** una opción → esa opción es el default. Parar.

2. **Lower `risk` field declarado**.
   - Si todas las opciones tienen un campo `risk` (bajo/medio/alto) en la matriz → default = la de `risk: bajo`. En empate, la de mayor `reversibilidad`. Parar.

3. **Regla de dominio por marcador**.
   - Si la decisión toca `auth`/`jwt`/`ssl` → default = la opción que **no** introduce nuevo boundary de auth (mantén el estado actual).
   - Si la decisión toca `payments`/`checkout` → default = la opción que **no** cambia el flujo de cobro (mantén).

4. **Fallback explícito: "no default, decide tú"**.
   - Si ningún paso anterior produce un default → el agente devuelve `default: null` y **no propone**. El humano debe elegir sin bias. Esto es correcto: un default inventado por la IA sería peor que la fricción de 3 min.

## Anti-reglas (lo que NUNCA hace el agente)

- ❌ Usar el training data para inferir el default ("lo más común en la industria es...").
- ❌ Elegir la opción con más tokens en el contexto (bias atencional).
- ❌ Considerar "lo que ya hice en este proyecto" sin buscar en Engram primero (sesgo de contexto reciente).
- ❌ Proponer default si Engram marca conflicto — paso 1 bloquea.

## Output esperado del agente

```
default: <option-name | null>
default_source: "engram-prev" | "lower-risk" | "domain-rule" | "none"
conflict_with: <observation-id | null>
```

El humano puede override con `override: <option> because <razón>`. Si default = `null`, override es la **única** forma de avanzar.

## Por qué hardcoded (no LLM)

La categoría de fallo que `decision-gate` previene es **sesgo de training data en el default**. Si el agente elige default por "qué es lo común", pasa por encima de contexto específico del proyecto (que Engram sí tiene). Por eso el algoritmo está aquí, en software clásico, y el agente solo lo ejecuta — no lo inventa.