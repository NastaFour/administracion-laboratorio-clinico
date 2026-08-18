---
name: ai-ui-generation
description: Generate distinctive UI from prompts using AI tools (Google Stitch, v0, Lovable, Claude Artifacts) with visual checkpoints, anti-AI-slop guardrails, and rapid deploy. Use when the user asks to build a landing page, component, or UI from a prompt in one shot instead of hand-coding it.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires access to at least one AI UI tool (Stitch/v0/Lovable/Artifacts) and a deploy target (Vercel/Netlify/EAS)."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["ai ui generation", "generar ui con ia", "google stitch", "v0 vercel", "lovable", "claude artifacts", "landing con ia", "prompt to ui", "generate component", "ui en vivo"]
  scope: [global, project]
  version: "1.0.0"
---

# AI UI Generation — Prompt → Componente → Deploy

Genera UI distintiva con herramientas de IA (Google Stitch, v0, Lovable, Claude Artifacts) en lugar de hand-codar desde cero. El punto no es "que la IA haga cualquiera" — es **dirigirl** para que el output no sea AI-slop genérico.

> Companion: [`frontend-design`](../frontend-design/SKILL.md) define la **dirección visual** (paleta, tipografía, signature element). Esta skill define el **workflow de generación** con herramientas de IA. Úsalas juntas: `frontend-design` decide cómo se ve, `ai-ui-generation` lo produce rápido.

## When to Use

- El usuario pide una landing, dashboard, o componente "en vivo" desde un prompt.
- Hay que iterar visuales rápido (3+ variantes en una sesión).
- El deploy es parte del requisito (Vercel/Netlify/EAS).
- **Do NOT use** para lógica de negocio compleja, auth, DB, o APIs — estas herramientas generan UI, no backends. Usa `professional-planner` para lo otro.

## The AI Slop Problem (y cómo evitarlo)

Las herramientas de IA generativa de UI (Stitch, v0, Lovable) tienen los **mismos 3 defaults** que [`frontend-design`](../frontend-design/SKILL.md) documenta:

1. **Cream `#F4F1EA` + serif display + terracotta** — el "look Notion".
2. **Near-black + acid-green/vermilion accent** — el "look Linear".
3. **Broadsheet, hairline rules, zero border-radius** — el "look newspaper".

Todas son legítimas **si son una elección**, no un default. Para evitar slop:

- **Antes de generar**: decide paleta, tipografía y signature element (sigue el brainstorm de `frontend-design`). Escríbelo en el prompt.
- **En el prompt**: incluye el sujeto concreto, el audience, y el "single job" de la página. Nunca `"make a landing page for a startup"` — siempre `"make a landing page for a Venezuelan grocery delivery app targeting busy parents, single job is to get them to download the app"`.
- **Después de generar**: critique el output contra el brief. Si lee como templated → regenera con restricciones más tight, no aceptes el default.

## Workflow: Prompt → Checkpoint → Deploy

### Phase 1 — Brief (2 min)

Antes de tocar cualquiertool, responde en texto:

```
Subject:     <qué producto/servicio>
Audience:    <quién lo usa>
Single job:  <la página debe lograr UNA cosa>
Visual dir:  <paleta 4-6 hex + 2 typefaces + signature element>
Deploy:      <Vercel / Netlify / EAS / local>
```

Si no puedes llenar los 5 campos, no generes todavía — el output será slop.

### Phase 2 — Generate (5 min, 3 pasadas)

Genera **3 variantes** con herramientas de IA. El objetivo no es elegir una — es comparar para detectar qué es default y qué es elección.

| Tool | Mejor para | Output |
|---|---|---|
| **Google Stitch** | Multi-screen flows, design tokens, Material-ish | HTML/CSS + design tokens export |
| **v0 (Vercel)** | React components, Tailwind, shadcn/ui | React + Tailwind copy-paste |
| **Lovable** | Full-stack-ish apps, Supabase wiring | React app + deploy integrado |
| **Claude Artifacts** | Iteración rápida del propio agente, live preview | HTML/React en el chat |

Para cada pasada, usa el mismo brief + una restricción visual distinta:

1. Pass 1: "follow the brief exactly"
2. Pass 2: "take one aesthetic risk — pick the risk and justify it"
3. Pass 3: "remove one thing — what is the page better without?"

### Phase 3 — Checkpoint visual (3 min)

Critica las 3 variantes contra el brief **antes** de tocar código:

- ¿Alguna variante usa uno de los 3 defaults slop? → descártaa o restringe más.
- ¿El signature element está presente y es memorable? → si no, regenera.
- ¿La copy lee como genérica? → la copy es diseño, regenera con copy específica del sujeto.
- **Screenshot si puedes** — una imagen vale 1000 tokens. Toma screenshots de las 3 y compara lado a lado.

### Phase 4 — Hand-off a código (5 min)

La variante elegida entra al codebase. Reglas:

- **No pegar HTML crudo** si usas React/Vite/E — convierte a componentes siguiendo [`react-vite`](../react-vite/SKILL.md) o [`react-19`](../react-19/SKILL.md).
- **Tailwind classes**: sigue [`tailwind-4`](../tailwind-4/SKILL.md) — sin `var()`/hex en className, usa `cn()` solo cuando hay condicionales.
- **Design tokens**: si Stitch/v0 exportó tokens, integrarlos como CSS variables en el design system — ver [`design-system-tokens`](../design-system-tokens/SKILL.md) si existe, sino documentalos.
- **No meter lógica de negocio** — la UI generada es presentacional. Auth, API calls, state van en container wrappers (SRP, ver [`solid-clean-code`](../solid-clean-code/SKILL.md)).

### Phase 5 — Deploy (5 min)

```bash
# Vercel
pnpm dlx vercel --prod
# Netlify
pnpm dlx netlify deploy --prod
# EAS (mobile)
pnpm expo export --platform web && eas deploy
```

El deploy es parte del loop — si no deployas, no cerraste el ciclo. La demo en vivo es lo que valida el brief.

## Anti-patterns

- ❌ `"make a landing page"` sin subject/audience/job → output slop garantizado.
- ❌ Aceptar la primera variante sin critica → es la más templated.
- ❌ Pegar HTML crudo en un proyecto React → rompe SRP y Tailwind JIT.
- ❌ Meter auth/API en el componente generado → mezcla presentación con lógica.
- ❌ Deployar sin checkpoint visual → deployas slop.
- ❌ "Es solo una landing, no necesita SDD" — falso. Si toca el repo, pasa por [`dod-checker`](../dod-checker/SKILL.md) aunque sea lightweight.

## Integration

| Necesidad | Skill |
|---|---|
| Dirección visual/paleta/signature | [`frontend-design`](../frontend-design/SKILL.md) |
| Implementación React premium | [`frontend-designer`](../frontend-designer/SKILL.md) |
| React 19 (Compiler, use()) | [`react-19`](../react-19/SKILL.md) |
| Tailwind 4 (cn, theme) | [`tailwind-4`](../tailwind-4/SKILL.md) |
| Next.js 15 App Router | [`nextjs-15`](../nextjs-15/SKILL.md) |
| Design tokens | [`design-system-tokens`](../design-system-tokens/SKILL.md) (si existe) |
| Deploy a stores (mobile) | [`store-deployment-eas`](../store-deployment-eas/SKILL.md) |
| Gate de calidad antes de merge | [`code-reviewer`](../code-reviewer/SKILL.md) + [`judgment-day`](../judgment-day/SKILL.md) |

## Tooling reference

| Tool | URL | Fortaleza |
|---|---|---|
| Google Stitch | stitch.withgoogle.com | Multi-screen, design tokens,马斯 Material |
| v0 | v0.dev | React + Tailwind + shadcn/ui, copy-paste |
| Lovable | lovable.dev | Full-stack-ish, Supabase, deploy integrado |
| Claude Artifacts | (en Claude.ai / agent) | Live preview, iteración rápida del agente |
| Vercel v0 CLI | `pnpm dlx v0` | Generación desde terminal |

## Keywords
ai ui, google stitch, v0, lovable, claude artifacts, prompt to ui, landing generation, anti-slop, rapid prototyping, deploy