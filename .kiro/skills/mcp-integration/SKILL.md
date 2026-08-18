---
name: mcp-integration
description: Configures Model Context Protocol (MCP) servers for AI agents. Covers MCP server setup, tool registration, security best practices, and integration with Claude Code, OpenCode, Cursor, and other tools. Use when adding MCP servers, configuring tool access, or debugging MCP connections.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["MCP", "model context protocol", "mcp server", "tool server", "mcp config"]
  scope: [global, project]
  version: "1.0.0"
---

# 🔌 Model Context Protocol (MCP) Integration

Use this skill when configuring MCP servers to extend AI agent capabilities with external tools.

## 📋 When to Use

- Use when adding a new MCP server to the project
- Use when configuring tool access permissions for MCP
- Use when debugging MCP connection issues
- Do NOT use for skills (SKILL.md) — those are separate from MCP

## 🚦 Hard Rules

- **Always** validate MCP server input with Zod schemas before processing
- **Always** use stdio transport for local servers, HTTP for remote
- **Never** expose MCP servers to the internet without authentication
- **Never** store API keys in MCP config files — use environment variables
- **Never** allow unrestricted file system access via MCP tools

## 🛠️ What is MCP?

MCP (Model Context Protocol) is an open standard by Anthropic that lets AI agents connect to external tool servers. Instead of hardcoding tools into each agent, MCP provides a universal interface:

```
AI Agent ←→ MCP Client ←→ MCP Server (tools, resources, prompts)
```

## 📦 Per-Tool Configuration

### Claude Code

`~/.claude/settings.json` (global) or `.claude/settings.json` (project):

```json
{
  "mcpServers": {
    "engram": {
      "command": "engram",
      "args": ["mcp", "--tools=agent"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"]
    }
  }
}
```

### OpenCode

`~/.config/opencode/opencode.json`:

```json
{
  "mcp": {
    "engram": {
      "type": "local",
      "command": ["engram", "mcp"],
      "enabled": true
    }
  }
}
```

### Cursor

`.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "engram": {
      "command": "engram",
      "args": ["mcp"]
    }
  }
}
```

### Codex

`~/.codex/config.toml`:

```toml
[mcp_servers.engram]
command = "engram"
args = ["mcp"]
```

### VS Code (Copilot)

`.vscode/mcp.json`:

```json
{
  "servers": {
    "engram": {
      "command": "engram",
      "args": ["mcp"]
    }
  }
}
```

## 🔒 Security Best Practices

Per [NSA MCP Security Guidance](https://www.nsa.gov/Portals/75/documents/Cybersecurity/CSI_MCP_SECURITY.pdf):

1. **Input validation**: All MCP tool inputs must be validated with Zod schemas
2. **Least privilege**: Only expose tools the agent actually needs
3. **No secrets in config**: Use env vars, not hardcoded keys
4. **Transport security**: Use stdio for local, TLS for remote
5. **Audit logging**: Log all MCP tool invocations with correlation IDs

## 📚 References

- [MCP Official Spec](https://modelcontextprotocol.io)
- [MCP Security Best Practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices)
- [NSA MCP Security Guidance](https://www.nsa.gov/Portals/75/documents/Cybersecurity/CSI_MCP_SECURITY.pdf)
- [Engram MCP Server](https://github.com/Gentleman-Programming/engram)
