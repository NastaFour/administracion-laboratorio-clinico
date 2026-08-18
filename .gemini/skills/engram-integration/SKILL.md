---
name: engram-integration
description: Persistent cross-session memory for AI coding agents via the Engram binary — one-liner setup (engram setup <agent>), 20 MCP tools (mem_save/mem_search/mem_judge...), SQLite+FTS5, git sync, optional cloud. Use when an agent should remember decisions and bugs across sessions instead of starting over.
license: MIT
compatibility: "Agent-agnostic. Binary: Go, SQLite+FTS5. Works with Claude Code, OpenCode, Gemini CLI, Codex, Cursor, VS Code Copilot, Antigravity, Windsurf, Kiro, Qwen, DeepSeek via `engram setup <agent>`."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["engram", "persistent memory", "mem_save", "mem_search", "mem_judge", "cross-session memory", "engram setup", "agent memory", "record decision memory"]
  scope: [global, project]
  version: "2.0.0"
---

# Engram — Persistent Memory for AI Coding Agents

`engram` is a single Go binary with SQLite + FTS5 full-text search, exposed via CLI, HTTP API, MCP server, and an interactive TUI. Agent-agnostic — works with any agent that supports MCP.

```
Agent (Claude Code / OpenCode / Gemini CLI / Codex / Cursor / VS Code / ...)
    ↓ MCP stdio
Engram (single Go binary)
    ↓
SQLite + FTS5 (~/.engram/engram.db)
```

## Install + Setup (one-liner per agent)

```bash
# macOS/Linux
brew install gentleman-programming/tap/engram
# Windows
scoop bucket add gentleman https://github.com/Gentleman-Programming/scoop-bucket
scoop install engram
```

Wire your agent (writes MCP config — restart agent after):

| Agent | Command |
|---|---|
| Claude Code | `claude plugin marketplace add Gentleman-Programming/engram && claude plugin install engram` |
| OpenCode | `engram setup opencode` |
| Gemini CLI | `engram setup gemini-cli` |
| Codex | `engram setup codex` |
| Cursor | `engram setup cursor` |
| VS Code (Copilot) | `engram setup vscode-copilot` |
| Antigravity | `engram setup antigravity-cli` |
| Windsurf | `engram setup windsurf` |
| Kiro | `engram setup kiro` |
| Qwen | `engram setup qwen` |
| DeepSeek IDE | `engram setup` (manual — see docs/AGENT-SETUP.md for any MCP client) |

No Node.js, no Python, no Docker. One binary, one SQLite file. Most agents launch `engram mcp` automatically as a stdio subprocess — you never run it manually. `engram serve` (HTTP, port 7437) is only needed when a plugin uses the HTTP API (OpenCode/Pi plugins) — they auto-start it.

## MCP Tools (20)

| Category | Tools |
|---|---|
| Save & Update | `mem_save`, `mem_update`, `mem_delete`, `mem_suggest_topic_key` |
| Search & Retrieve | `mem_search`, `mem_context`, `mem_timeline`, `mem_get_observation` |
| Session Lifecycle | `mem_session_start`, `mem_session_end`, `mem_session_summary` |
| Conflict Surfacing | `mem_judge`, `mem_compare` |
| Lifecycle Review | `mem_review` |
| Utilities | `mem_save_prompt`, `mem_stats`, `mem_capture_passive`, `mem_merge_projects`, `mem_current_project`, `mem_doctor` |

## Lifecycle

```
1. Agent completes significant work (bugfix, architecture decision, etc.)
2. Agent calls mem_save → title, type, What/Why/Where/Learned
3. Engram persists to SQLite with FTS5 indexing
4. Next session: agent searches memory, gets relevant context
```

### 1. Cuándo Guardar Memoria (`mem_save`)
Inmediatamente después de:
- **Resolución de Bugs Complejos:** errores de compilación nativa en Expo, conflictos en el monorepo, fallos de transacciones Prisma, fugas de sockets.
- **Decisiones Arquitectónicas (ADRs aprobados):** qué librería se adoptó, justificación, configuración.
- **Bypasses de Seguridad:** justificación detrás de cualquier `// #IA_BYPASS: <reason>` aprobado por el DoD Checker.
- **Conflictos de memoria:** cuando `mem_judge`/`mem_compare` detectan que una nueva observación contradice una previa, registrar la resolución.

Payload (mem_save):
```json
{
  "title": "[COMPONENTE] Breve descripción de la solución o decisión",
  "type": "bug-fix|architecture|decision|bypass|conflict",
  "content": "What/Why/Where/Learned — descripción detallada, solución exacta, archivos modificados."
}
```

### 2. Cuándo Buscar en Memoria (`mem_search`)
Antes de iniciar cualquier fase de desarrollo o depuración:
- **Investigación Inicial:** buscar palabras clave del error o módulo afectado ("expo compilation error", "prisma transaction block").
- **Evitar Redundancias:** verificar si ya se tomó una decisión similar previamente.
- **Session start:** el hook `mem_session_start` enmarca el contexto; `mem_context` trae recuerdo reciente.

## Git Sync (share memories across machines)

Uses compressed chunks — no merge conflicts, no huge files. Local SQLite remains the source of truth.

```bash
engram sync                    # Export new memories as compressed chunk
git add .engram/ && git commit -m "sync engram memories"
engram sync --import           # On another machine: import new chunks
engram sync --status           # Check sync status
```

Cloud is optional replication (always project-scoped; `--project` required). See `engram cloud` subcommands.

## CLI Reference (selection)

| Command | Description |
|---|---|
| `engram setup [agent]` | Install agent integration |
| `engram serve [port]` | Start HTTP API (default: 7437) |
| `engram mcp [--project NAME]` | Start MCP server (stdio) |
| `engram tui` | Launch terminal UI |
| `engram search <query>` | Search memories |
| `engram save <title> <msg>` | Save a memory |
| `engram delete <obs_id>` | Delete observation (soft; `--hard` permanent) |
| `engram timeline <obs_id>` | Chronological context |
| `engram context [project]` | Recent session context |
| `engram stats` | Memory statistics |
| `engram projects list\|consolidate\|prune` | Manage project names |
| `engram doctor` | Read-only diagnostics |

## 🚦 Protocolo de Fallback (Memoria Inactiva)
Si el servidor MCP de Engram no está disponible, no configurado, o arroja errores:
1. **No interrumpir el desarrollo:** continúa con las fases normalmente.
2. **Aviso al usuario:** `[⚠️ NOTA: Engram MCP no activo. Operando en modo de contexto volátil.]`
3. **Registro Manual:** crea `.md` en `references/` del proyecto como memoria manual.
4. **Auto-healing:** ejecuta `engram doctor` para diagnóstico y reparación de `state.json`.

## Keywords
engram, persistent memory, MCP server, mem_save, mem_search, mem_judge, cross-session, git sync, agent memory
