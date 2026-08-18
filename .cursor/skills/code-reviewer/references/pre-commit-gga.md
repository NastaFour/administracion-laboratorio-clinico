# GGA — Gentleman Guardian Angel (Pre-commit AI review)

`gga` is a provider-agnostic AI code review tool that runs on every `git commit`, validating staged files against your `AGENTS.md`. Pure Bash, zero dependencies, cross-platform (macOS / Linux / Windows-Git-Bash / WSL).

> Repo: https://github.com/Gentleman-Programming/gentleman-guardian-angel
> Use alongside [`code-reviewer`](../SKILL.md) and the [`4R framework`](4r-framework.md).

---

## Install

```bash
# macOS (Homebrew — recommended)
brew install gentleman-programming/tap/gga

# Windows (Git Bash)
git clone https://github.com/Gentleman-Programming/gentleman-guardian-angel.git
cd gentleman-guardian-angel
bash install.sh
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc && source ~/.bashrc

# WSL — fully supported, no special config needed
```

## Quick Start (per project)

```bash
cd ~/your-project
gga init                # Create .gga config
gga install             # Install git hook
# Edit .gga to set your PROVIDER
# Create AGENTS.md with your coding standards (this is what gga enforces)
# Done — every commit gets reviewed 🎉
```

## Providers (7)

| Provider | Config Value | Installation |
|---|---|---|
| Claude | `claude` | [claude.ai/code](https://claude.ai/code) |
| Gemini | `gemini` | [gemini-cli](https://github.com/google-gemini/gemini-cli) |
| Codex | `codex` | `npm i -g @openai/codex` |
| OpenCode | `opencode` | [opencode.ai](https://opencode.ai) |
| Ollama | `ollama:<model>` | [ollama.ai](https://ollama.ai) |
| LM Studio | `lmstudio[:model]` | [lmstudio.ai](https://lmstudio.ai) |
| GitHub Models | `github:<model>` | [marketplace/models](https://github.com/marketplace/models) |

## Why it beats manual review on every commit

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   git commit    │ ──▶ │  AI Review   │ ──▶ │  ✅ Pass/Fail   │
│  (staged files) │     │  (any LLM)   │     │  (with details) │
└─────────────────┘     └──────────────┘     └─────────────────┘
```

- 🔌 Provider agnostic — switch AI providers without rewriting your hooks
- 📦 Zero dependencies — pure Bash, no Node/Python/Go required
- 🪝 Git native — standard pre-commit hook, no new tooling on the path
- ⚡ Smart caching — skip unchanged files (huge speedup on repeated commits)
- 🔍 PR review mode — review full PRs, not just last commit
- 🪟 Cross-platform — macOS, Linux, Windows (Git Bash), WSL

## Commands

| Command | Description |
|---|---|
| `gga init` | Create sample `.gga` config |
| `gga install` | Install pre-commit hook |
| `gga install --commit-msg` | Install commit-msg hook (validate commit message format) |
| `gga uninstall` | Remove hooks |
| `gga run` | Review staged files |
| `gga run --ci` | Review last commit (use in CI/CD) |
| `gga run --pr-mode` | Review full PR changes |
| `gga run --no-cache` | Review ignoring cache |
| `gga config` | Show configuration |
| `gga cache status` | Show cache info |
| `gga version` | Show version |

## Writing effective AGENTS.md (the rules gga enforces)

gga reviews against the project's `AGENTS.md`. A thin `AGENTS.md` produces thin reviews. Pull from skills the author should follow:

```markdown
# AGENTS.md — Project Standards

## Reglas Estrictas
- Siempre ESM modules en backend Node.js
- Siempre access tokens en memoria, refresh tokens en HTTP-only cookies (nunca LocalStorage)
- Siempre validar payloads con Zod antes de ejecutar lógica
- TypeScript estricto, `any` prohibido (usar `unknown` + narrowing)
- Nunca credenciales en código o git
- Funciones ≤ 40 líneas
- Siempre `pnpm` (nunca `npm`/`npx`)

## Comandos de Verificación
pnpm biome check --write
pnpm typecheck
pnpm test
```

Pull rules from [`solid-clean-code`](../../06-code-quality/solid-clean-code/SKILL.md), [`typescript`](../../06-code-quality/typescript/SKILL.md), [`jwt-bcrypt`](../../04-backend/jwt-bcrypt/SKILL.md) — gga then enforces them automatically on every commit.

## CI / CD integration

```bash
# In CI step — review last commit, fail build on AI-flagged issues
gga run --ci
```

## Relationships

- `code-reviewer` (this skill folder) — the *what* to review (5 dimensions + 4R framework).
- `gga` — the *how* to automate it per commit.
- `dod-checker` — the gate that consumes gga's pass/fail for a phase.
- `judgment-day` — adversarial escalation when single-reviewer gga is not enough.

## Resources

- Repo: https://github.com/Gentleman-Programming/gentleman-guardian-angel
- Providers docs: `docs/providers.md` in the repo
- Config reference: `docs/configuration.md` in the repo