# SKILLS.md — Índice de Skills · Portable 2026 (pnpm)

Catálogo de **129 skills** compatible con [agentskills.io](https://agentskills.io/specification), Claude Code, Cursor, OpenCode, Copilot, Codex, Gemini CLI, Antigravity, Kiro, Windsurf y DeepSeek IDE. Agnóstico al proyecto: las skills se aplican a cualquier monorepo pnpm. Incluye metodologías adaptadas con permiso de [Anthropic `skills`](https://github.com/anthropics/skills), [Vercel Labs `agent-skills`](https://github.com/vercel-labs/agent-skills), [obra `superpowers`](https://github.com/obra/superpowers) y [Gentleman Programming](https://github.com/Gentleman-Programming) (Engram, gentle-ai, GGA, Gentleman.Dots, gentleman-skills).

## 00-meta-skills

| Skill | Path |
|---|---|
| skill-creator | [00-meta-skills/skill-creator/SKILL.md](00-meta-skills/skill-creator/SKILL.md) |
| skill-loader | [00-meta-skills/skill-loader/SKILL.md](00-meta-skills/skill-loader/SKILL.md) ← two-tier loading, session telemetry, route-first enforcement |
| skill-sync | [00-meta-skills/skill-sync/SKILL.md](00-meta-skills/skill-sync/SKILL.md) |
| skill-validator | [00-meta-skills/skill-validator/SKILL.md](00-meta-skills/skill-validator/SKILL.md) |
| skill-router | [00-meta-skills/skill-router/SKILL.md](00-meta-skills/skill-router/SKILL.md) ← deterministic routing, replaces ~80% of LLM skill selection |

## 01-planning-process

| Skill | Path |
|---|---|
| project-tracker | [01-planning-process/project-tracker/SKILL.md](01-planning-process/project-tracker/SKILL.md) |
| tech-stack-advisor | [01-planning-process/tech-stack-advisor/SKILL.md](01-planning-process/tech-stack-advisor/SKILL.md) |
| application-workflow | [01-planning-process/application-workflow/SKILL.md](01-planning-process/application-workflow/SKILL.md) |
| master-prompt | [01-planning-process/master-prompt/SKILL.md](01-planning-process/master-prompt/SKILL.md) |
| agents | [01-planning-process/agents/SKILL.md](01-planning-process/agents/SKILL.md) |
| engram-integration | [01-planning-process/engram-integration/SKILL.md](01-planning-process/engram-integration/SKILL.md) |
| speckit-integration | [01-planning-process/speckit-integration/SKILL.md](01-planning-process/speckit-integration/SKILL.md) |
| session-notes | [01-planning-process/session-notes/SKILL.md](01-planning-process/session-notes/SKILL.md) |
| parallelization | [01-planning-process/parallelization/SKILL.md](01-planning-process/parallelization/SKILL.md) |
| tech-escalation-adr | [01-planning-process/tech-escalation-adr/SKILL.md](01-planning-process/tech-escalation-adr/SKILL.md) |
| idea-to-prd-express | [01-planning-process/idea-to-prd-express/SKILL.md](01-planning-process/idea-to-prd-express/SKILL.md) ← 20-min compressed SDD for technical decisions |
| jira-epic | [01-planning-process/jira-epic/SKILL.md](01-planning-process/jira-epic/SKILL.md) ← Epic structure, child task breakdown, Jira MCP integration |
| jira-task | [01-planning-process/jira-task/SKILL.md](01-planning-process/jira-task/SKILL.md) ← Bug/feature task templates, title conventions, MCP fields |
| brainstorming | [01-planning-process/brainstorming/SKILL.md](01-planning-process/brainstorming/SKILL.md) ← explores user intent, requirements, design & specs before implementation (Superpowers) |

## 02-dev-roles

| Skill | Path |
|---|---|
| architecture-designer | [02-dev-roles/architecture-designer/SKILL.md](02-dev-roles/architecture-designer/SKILL.md) |
| code-reviewer | [02-dev-roles/code-reviewer/SKILL.md](02-dev-roles/code-reviewer/SKILL.md) |
| dod-checker | [02-dev-roles/dod-checker/SKILL.md](02-dev-roles/dod-checker/SKILL.md) |
| expert-debugger | [02-dev-roles/expert-debugger/SKILL.md](02-dev-roles/expert-debugger/SKILL.md) |
| security-audit | [02-dev-roles/security-audit/SKILL.md](02-dev-roles/security-audit/SKILL.md) |
| feature-implementer | [02-dev-roles/feature-implementer/SKILL.md](02-dev-roles/feature-implementer/SKILL.md) |
| frontend-designer | [02-dev-roles/frontend-designer/SKILL.md](02-dev-roles/frontend-designer/SKILL.md) |
| frontend-design | [02-dev-roles/frontend-design/SKILL.md](02-dev-roles/frontend-design/SKILL.md) ← Anthropic methodology, anti-AI-slop, signature element |
| judgment-day | [02-dev-roles/judgment-day/SKILL.md](02-dev-roles/judgment-day/SKILL.md) ← parallel adversarial review (red + blue) |
| decision-gate | [02-dev-roles/decision-gate/SKILL.md](02-dev-roles/decision-gate/SKILL.md) ← compress human's last-20% judgment to 3 min, traceable |
| github-pr | [02-dev-roles/github-pr/SKILL.md](02-dev-roles/github-pr/SKILL.md) ← conventional commits, structured PR descriptions |
| performance-refactor | [02-dev-roles/performance-refactor/SKILL.md](02-dev-roles/performance-refactor/SKILL.md) |
| qa-tester | [02-dev-roles/qa-tester/SKILL.md](02-dev-roles/qa-tester/SKILL.md) |
| technical-writer | [02-dev-roles/technical-writer/SKILL.md](02-dev-roles/technical-writer/SKILL.md) |
| frontend-debugging-protocol | [02-dev-roles/frontend-debugging-protocol/SKILL.md](02-dev-roles/frontend-debugging-protocol/SKILL.md) ← `references/diagnostic-tree.md` |
| auth-flow-audit | [02-dev-roles/auth-flow-audit/SKILL.md](02-dev-roles/auth-flow-audit/SKILL.md) ← `references/audit-checklist.md`, `scripts/audit-auth.mjs` |
| micro-interactions | [02-dev-roles/micro-interactions/SKILL.md](02-dev-roles/micro-interactions/SKILL.md) ← hover, press, stagger, shimmer copy-paste catalog |
| hexagonal-architecture-layers-java | [02-dev-roles/hexagonal-architecture-layers-java/SKILL.md](02-dev-roles/hexagonal-architecture-layers-java/SKILL.md) ← domain/application/infrastructure layers, ports & adapters, Java |
| systematic-debugging | [02-dev-roles/systematic-debugging/SKILL.md](02-dev-roles/systematic-debugging/SKILL.md) ← 4-phase systematic debugging: root-cause tracing, isolation, fix verification (Superpowers) |
| verification-before-completion | [02-dev-roles/verification-before-completion/SKILL.md](02-dev-roles/verification-before-completion/SKILL.md) ← evidence before assertions, pre-commit/PR proof check (Superpowers) |

## 03-ai-ml

| Skill | Path |
|---|---|
| ai-orchestration | [03-ai-ml/ai-orchestration/SKILL.md](03-ai-ml/ai-orchestration/SKILL.md) |
| ai-scalability-mlops | [03-ai-ml/ai-scalability-mlops/SKILL.md](03-ai-ml/ai-scalability-mlops/SKILL.md) |
| api-ai-billing | [03-ai-ml/api-ai-billing/SKILL.md](03-ai-ml/api-ai-billing/SKILL.md) |
| llm-integration | [03-ai-ml/llm-integration/SKILL.md](03-ai-ml/llm-integration/SKILL.md) |
| ai-sdk-5 | [03-ai-ml/ai-sdk-5/SKILL.md](03-ai-ml/ai-sdk-5/SKILL.md) ← Vercel AI SDK 5, useChat/UIMessage/streaming |
| prompt-engineering | [03-ai-ml/prompt-engineering/SKILL.md](03-ai-ml/prompt-engineering/SKILL.md) |
| research-first | [03-ai-ml/research-first/SKILL.md](03-ai-ml/research-first/SKILL.md) |

## 04-backend

| Skill | Path |
|---|---|
| docker | [04-backend/docker/SKILL.md](04-backend/docker/SKILL.md) |
| error-handling | [04-backend/error-handling/SKILL.md](04-backend/error-handling/SKILL.md) |
| mcp-integration | [04-backend/mcp-integration/SKILL.md](04-backend/mcp-integration/SKILL.md) |
| api-design | [04-backend/api-design/SKILL.md](04-backend/api-design/SKILL.md) |
| expressjs | [04-backend/expressjs/SKILL.md](04-backend/expressjs/SKILL.md) |
| jwt-bcrypt | [04-backend/jwt-bcrypt/SKILL.md](04-backend/jwt-bcrypt/SKILL.md) |
| microservices | [04-backend/microservices/SKILL.md](04-backend/microservices/SKILL.md) |
| nodejs | [04-backend/nodejs/SKILL.md](04-backend/nodejs/SKILL.md) |
| payments | [04-backend/payments/SKILL.md](04-backend/payments/SKILL.md) ← `references/bcv-integration.md`, `pago-movil-flows.md`, `cashea-bnpl.md` |
| postgresql | [04-backend/postgresql/SKILL.md](04-backend/postgresql/SKILL.md) ← `references/schema-reference.md` |
| prisma-orm | [04-backend/prisma-orm/SKILL.md](04-backend/prisma-orm/SKILL.md) ← `references/schema-template.md` |
| socketio | [04-backend/socketio/SKILL.md](04-backend/socketio/SKILL.md) |
| rate-limiting-design | [04-backend/rate-limiting-design/SKILL.md](04-backend/rate-limiting-design/SKILL.md) ← `references/tier-table.md`, `scripts/check-limiters.mjs` |
| api-response-normalizer | [04-backend/api-response-normalizer/SKILL.md](04-backend/api-response-normalizer/SKILL.md) ← `references/envelope-convention.md`, `scripts/check-id-consistency.mjs` |
| prisma-frontend-types | [04-backend/prisma-frontend-types/SKILL.md](04-backend/prisma-frontend-types/SKILL.md) ← `references/type-mapping-rules.md`, `scripts/generate-frontend-types.mjs` |
| nodejs-module-loading | [04-backend/nodejs-module-loading/SKILL.md](04-backend/nodejs-module-loading/SKILL.md) ← `references/esm-evaluation-order.md`, `scripts/check-env-loading.mjs` |
| booking-scheduling-domain | [04-backend/booking-scheduling-domain/SKILL.md](04-backend/booking-scheduling-domain/SKILL.md) ← `references/slot-logic.md`, `references/conflict-resolution.md`, `references/no-show-protocol.md`, `scripts/check-booking-queries.mjs` |
| background-jobs-queues | [04-backend/background-jobs-queues/SKILL.md](04-backend/background-jobs-queues/SKILL.md) ← `references/job-catalog.md`, `references/bullmq-setup.md`, `scripts/check-jobs.mjs` |
| file-uploads-storage | [04-backend/file-uploads-storage/SKILL.md](04-backend/file-uploads-storage/SKILL.md) ← `references/upload-patterns.md`, `references/validation-rules.md`, `scripts/check-uploads.mjs` |
| notifications-multichannel | [04-backend/notifications-multichannel/SKILL.md](04-backend/notifications-multichannel/SKILL.md) ← `references/channel-priority.md`, `references/templates.md`, `scripts/check-notifications.mjs` |
| reports-exports | [04-backend/reports-exports/SKILL.md](04-backend/reports-exports/SKILL.md) ← `references/report-types.md`, `scripts/check-reports.mjs` |
| django-drf | [04-backend/django-drf/SKILL.md](04-backend/django-drf/SKILL.md) ← Django REST Framework: serializers, viewsets, permissions, JWT |
| java-21 | [04-backend/java-21/SKILL.md](04-backend/java-21/SKILL.md) ← records, sealed classes, pattern matching, virtual threads (Loom) |
| spring-boot-3 | [04-backend/spring-boot-3/SKILL.md](04-backend/spring-boot-3/SKILL.md) ← constructor injection, @ConfigurationProperties, @Transactional |

## 05-frontend

| Skill | Path |
|---|---|
| electronjs | [05-frontend/electronjs/SKILL.md](05-frontend/electronjs/SKILL.md) |
| electron | [05-frontend/electron/SKILL.md](05-frontend/electron/SKILL.md) ← security patterns: contextBridge, sandbox, IPC validation (gentleman-skills) |
| expo-production-auditor | [05-frontend/expo-production-auditor/SKILL.md](05-frontend/expo-production-auditor/SKILL.md) ← `references/troubleshooting.md` |
| maps-gps | [05-frontend/maps-gps/SKILL.md](05-frontend/maps-gps/SKILL.md) |
| nextjs | [05-frontend/nextjs/SKILL.md](05-frontend/nextjs/SKILL.md) |
| push-notifications | [05-frontend/push-notifications/SKILL.md](05-frontend/push-notifications/SKILL.md) |
| pwa-capacitor | [05-frontend/pwa-capacitor/SKILL.md](05-frontend/pwa-capacitor/SKILL.md) |
| react-native | [05-frontend/react-native/SKILL.md](05-frontend/react-native/SKILL.md) |
| react-vite | [05-frontend/react-vite/SKILL.md](05-frontend/react-vite/SKILL.md) |
| react-19 | [05-frontend/react-19/SKILL.md](05-frontend/react-19/SKILL.md) ← React 19 with React Compiler, no manual memoization |
| nextjs-15 | [05-frontend/nextjs-15/SKILL.md](05-frontend/nextjs-15/SKILL.md) ← Next.js 15 App Router, Server Actions |
| tailwindcss | [05-frontend/tailwindcss/SKILL.md](05-frontend/tailwindcss/SKILL.md) |
| tailwind-4 | [05-frontend/tailwind-4/SKILL.md](05-frontend/tailwind-4/SKILL.md) ← Tailwind 4, cn() utility, theme classes |
| zod-4 | [05-frontend/zod-4/SKILL.md](05-frontend/zod-4/SKILL.md) ← Zod 4 breaking changes from v3 |
| zustand-5 | [05-frontend/zustand-5/SKILL.md](05-frontend/zustand-5/SKILL.md) ← Zustand 5 with useShallow selectors |
| ai-ui-generation | [05-frontend/ai-ui-generation/SKILL.md](05-frontend/ai-ui-generation/SKILL.md) ← Google Stitch/v0/Lovable, anti-slop, prompt→deploy |
| angular-core | [05-frontend/angular-core/SKILL.md](05-frontend/angular-core/SKILL.md) ← signals, zoneless, inject(), no lifecycle hooks |
| angular-forms | [05-frontend/angular-forms/SKILL.md](05-frontend/angular-forms/SKILL.md) ← Signal Forms (v21) + Reactive Forms |
| angular-performance | [05-frontend/angular-performance/SKILL.md](05-frontend/angular-performance/SKILL.md) ← NgOptimizedImage, @defer, SSR |
| angular-architecture | [05-frontend/angular-architecture/SKILL.md](05-frontend/angular-architecture/SKILL.md) ← Scope Rule, file naming |
| state-management | [05-frontend/state-management/SKILL.md](05-frontend/state-management/SKILL.md) |
| lazy-loading-patterns | [05-frontend/lazy-loading-patterns/SKILL.md](05-frontend/lazy-loading-patterns/SKILL.md) ← `references/lazy-patterns.md`, `scripts/check-module-level-loads.mjs` |
| forms-validation-react | [05-frontend/forms-validation-react/SKILL.md](05-frontend/forms-validation-react/SKILL.md) ← `references/rhf-zod-pattern.md`, `references/multi-step-forms.md`, `scripts/check-forms.mjs` |
| i18n-localization | [05-frontend/i18n-localization/SKILL.md](05-frontend/i18n-localization/SKILL.md) ← `references/setup-guide.md`, `scripts/check-hardcoded-strings.mjs` |
| offline-sync-mobile | [05-frontend/offline-sync-mobile/SKILL.md](05-frontend/offline-sync-mobile/SKILL.md) ← `references/sync-patterns.md`, `scripts/check-offline-sync.mjs` |
| deep-linking-mobile | [05-frontend/deep-linking-mobile/SKILL.md](05-frontend/deep-linking-mobile/SKILL.md) ← `references/setup-guide.md`, `scripts/check-deep-links.mjs` |
| design-system-tokens | [05-frontend/design-system-tokens/SKILL.md](05-frontend/design-system-tokens/SKILL.md) ← `references/token-taxonomy.md`, `references/color-scales.md`, `scripts/check-tokens.mjs` |
| visual-effects | [05-frontend/visual-effects/SKILL.md](05-frontend/visual-effects/SKILL.md) ← `references/glassmorphism.md`, `references/gradients-blends.md`, `scripts/check-effects.mjs` |
| motion-framer | [05-frontend/motion-framer/SKILL.md](05-frontend/motion-framer/SKILL.md) ← `references/spring-layout.md`, `references/animate-presence.md`, `scripts/check-motion.mjs` |
| scroll-animations | [05-frontend/scroll-animations/SKILL.md](05-frontend/scroll-animations/SKILL.md) ← `references/scroll-reveal.md`, `references/parallax.md`, `scripts/check-scroll.mjs` |
| page-transitions | [05-frontend/page-transitions/SKILL.md](05-frontend/page-transitions/SKILL.md) ← `references/web-transitions.md`, `scripts/check-transitions.mjs` |
| motion-gsap | [05-frontend/motion-gsap/SKILL.md](05-frontend/motion-gsap/SKILL.md) ← `references/timelines.md`, `references/svg-text.md`, `scripts/check-gsap.mjs` |
| lottie-animations | [05-frontend/lottie-animations/SKILL.md](05-frontend/lottie-animations/SKILL.md) ← `references/lottie-integration.md`, `scripts/check-lottie.mjs` |
| motion-accessibility | [05-frontend/motion-accessibility/SKILL.md](05-frontend/motion-accessibility/SKILL.md) ← `references/reduced-motion.md`, `references/performance.md`, `scripts/check-motion-a11y.mjs` |
| vercel-react-best-practices | [05-frontend/vercel-react-best-practices/SKILL.md](05-frontend/vercel-react-best-practices/SKILL.md) ← Vercel Engineering: React & Next.js performance rules, server components, bundle optimization |
| vercel-composition-patterns | [05-frontend/vercel-composition-patterns/SKILL.md](05-frontend/vercel-composition-patterns/SKILL.md) ← scalable React composition, compound components, React 19 API |
| vercel-react-view-transitions | [05-frontend/vercel-react-view-transitions/SKILL.md](05-frontend/vercel-react-view-transitions/SKILL.md) ← native ViewTransition animations, shared elements, CSS pseudo-elements |
| web-design-guidelines | [05-frontend/web-design-guidelines/SKILL.md](05-frontend/web-design-guidelines/SKILL.md) ← review UI code for Web Interface Guidelines compliance, accessibility, UX audit |
| interface-design | [05-frontend/interface-design/SKILL.md](05-frontend/interface-design/SKILL.md) ← craft-first UI for dashboards, SaaS apps, admin panels, tokens (Linear/Stripe standard) |

## 06-code-quality

| Skill | Path |
|---|---|
| pnpm-workspaces | [06-code-quality/pnpm-workspaces/SKILL.md](06-code-quality/pnpm-workspaces/SKILL.md) |
| turborepo | [06-code-quality/turborepo/SKILL.md](06-code-quality/turborepo/SKILL.md) |
| biome | [06-code-quality/biome/SKILL.md](06-code-quality/biome/SKILL.md) |
| changesets | [06-code-quality/changesets/SKILL.md](06-code-quality/changesets/SKILL.md) |
| changelog-generator | [06-code-quality/changelog-generator/SKILL.md](06-code-quality/changelog-generator/SKILL.md) ← automatic user-facing changelogs & release notes from git commits |
| env-management | [06-code-quality/env-management/SKILL.md](06-code-quality/env-management/SKILL.md) |
| solid-clean-code | [06-code-quality/solid-clean-code/SKILL.md](06-code-quality/solid-clean-code/SKILL.md) |
| typescript | [06-code-quality/typescript/SKILL.md](06-code-quality/typescript/SKILL.md) |
| dependency-guardian | [06-code-quality/dependency-guardian/SKILL.md](06-code-quality/dependency-guardian/SKILL.md) |
| build-config-validator | [06-code-quality/build-config-validator/SKILL.md](06-code-quality/build-config-validator/SKILL.md) ← `scripts/validate-build-config.mjs` |
| elixir-antipatterns | [06-code-quality/elixir-antipatterns/SKILL.md](06-code-quality/elixir-antipatterns/SKILL.md) ← Agent misuse, nested case, bare spawn, GenServer bottleneck |

## 07-testing

| Skill | Path |
|---|---|
| testing-patterns | [07-testing/testing-patterns/SKILL.md](07-testing/testing-patterns/SKILL.md) |
| playwright | [07-testing/playwright/SKILL.md](07-testing/playwright/SKILL.md) ← E2E, MCP-first exploration, Page Object Model |
| pytest | [07-testing/pytest/SKILL.md](07-testing/pytest/SKILL.md) ← fixtures, mocking, parametrize, markers, async, conftest |

## 08-devops

| Skill | Path |
|---|---|
| ci-cd | [08-devops/ci-cd/SKILL.md](08-devops/ci-cd/SKILL.md) |
| kill-switches | [08-devops/kill-switches/SKILL.md](08-devops/kill-switches/SKILL.md) |
| monitoring | [08-devops/monitoring/SKILL.md](08-devops/monitoring/SKILL.md) |
| observability | [08-devops/observability/SKILL.md](08-devops/observability/SKILL.md) |
| store-deployment-eas | [08-devops/store-deployment-eas/SKILL.md](08-devops/store-deployment-eas/SKILL.md) ← `references/eas-setup.md`, `scripts/check-eas-config.mjs` |

## professional-planner

| Skill | Path |
|---|---|
| professional-planner | [professional-planner/SKILL.md](professional-planner/SKILL.md) ← `references/sdd-methodology.md`, `references/templates.md` |

## 🔗 Referencias

- Spec oficial: https://agentskills.io/specification
- Validador local: `node ./00-meta-skills/skill-validator/scripts/validate-skills.mjs`
- Instalador cross-tool: `node ./00-meta-skills/skill-sync/scripts/install-skills.mjs --target <path>`
- Shared scripts helper: `_shared/script-utils.mjs` (usado por los scripts `*.mjs` de las skills con `scripts/`)
- Auto-invoke: ver [AGENTS.md](AGENTS.md) sección 🤖 Auto-Invoke List
