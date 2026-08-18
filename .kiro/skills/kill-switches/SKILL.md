---
name: kill-switches
description: Implements emergency stop mechanisms for AI agent processes: heartbeat dead-man switches, process group SIGKILL, stalled session quarantine, and zombie process cleanup. Use when running long autonomous sessions, multi-agent workflows, or unattended CI/CD agents.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["kill switch", "dead man switch", "stop agent", "kill process", "zombie process", "heartbeat", "quarantine"]
  scope: [global, project]
  version: "1.0.0"
---

# 🛑 Kill Switches & Dead-Man Switches (ECC Pattern)

Inspired by [ECC's security guide](https://github.com/affaan-m/ECC/blob/main/the-security-guide.md). Autonomous agents that run unattended need a guaranteed stop mechanism — not just a polite request, but a kill that works even when the process ignores you.

## 📋 When to Use

- Use when running agents in unattended mode (CI/CD, overnight, background)
- Use when the agent is unresponsive, looping, or consuming excessive resources
- Use when implementing a heartbeat-based supervision system
- Do NOT use for interactive sessions where you can just `Ctrl+C`

## 🚦 Hard Rules

- **Always** kill the process GROUP, not just the parent (children keep running otherwise)
- **Always** implement a heartbeat dead-man switch for unattended runs
- **Always** quarantine stalled sessions for forensic review before deleting
- **Never** rely on the agent's own stop mechanism when it's compromised — use OS-level signals
- **Never** `kill -9` as first resort — try `SIGTERM` first, then `SIGKILL`

## 🛠️ Kill Switches by Scenario

### Scenario 1: Single Agent Unresponsive

```bash
# Find the agent process
pgrep -f "claude\|codex\|opencode\|gemini"

# Graceful kill first
kill -15 <PID>      # SIGTERM: allows cleanup

# If still alive after 5s, hard kill
sleep 5 && kill -9 <PID>  # SIGKILL: immediate
```

### Scenario 2: Kill Entire Process Group

When an agent spawned children (subagents, MCP servers, background tasks):

```bash
# Kill the process GROUP (negative PID = process group)
kill -9 -$(pgrep -f "claude")
```

```javascript
// Node.js equivalent
process.kill(-child.pid, "SIGKILL");
```

### Scenario 3: Heartbeat Dead-Man Switch

For unattended agents (CI/CD, overnight):

```bash
#!/bin/bash
# supervisor.sh — heartbeat-based agent supervisor
AGENT_PID=$1
HEARTBEAT_FILE="/tmp/agent-heartbeat-$AGENT_PID"
TIMEOUT_SECS=60

while kill -0 "$AGENT_PID" 2>/dev/null; do
  if [ -f "$HEARTBEAT_FILE" ]; then
    LAST_BEAT=$(stat -c %Y "$HEARTBEAT_FILE" 2>/dev/null || echo 0)
    NOW=$(date +%s)
    if [ $((NOW - LAST_BEAT)) -gt $TIMEOUT_SECS ]; then
      echo "[$(date)] Heartbeat stalled. Killing process group $AGENT_PID"
      kill -9 -$AGENT_PID
      exit 1
    fi
  fi
  sleep 5
done
```

```bash
# Usage
./supervisor.sh $(pgrep -f claude) &

# Agent writes heartbeat every 30s
while true; do
  touch /tmp/agent-heartbeat-$$
  sleep 30
done
```

### Scenario 4: Zombie Process Cleanup (Windows)

```powershell
# Find hanging node processes
Get-Process node | Where-Object { $_.CPU -gt 3600 } | Stop-Process -Force

# Kill specific tool processes
taskkill /IM "claude.exe" /F
taskkill /IM "codex.exe" /F
taskkill /IM "opencode.exe" /F
taskkill /IM "node.exe" /F  # careful: kills all node
```

### Scenario 5: Quarantine Stalled Sessions

When the agent stalls and you need to preserve its state for debugging:

```bash
# 1. Dump process info before killing
PID=$(pgrep -f claude)
ps aux | grep $PID > "/tmp/quarantine/agent-$PID-ps.txt"
lsof -p $PID > "/tmp/quarantine/agent-$PID-files.txt"

# 2. Copy any session state files  
cp ~/.claude/sessions/*.json "/tmp/quarantine/"

# 3. Capture last tool calls from logs
tail -100 ~/.claude/logs/*.log > "/tmp/quarantine/agent-$PID-last-tools.txt"

# 4. Now kill
kill -9 -$PID
```

## 🔗 Integration with Other Skills

| Context | Skill to Use |
|---|---|
| Running Docker agent sandbox | `04-backend/docker/SKILL.md` (kill: `docker stop && docker rm`) |
| Security audit before unattended run | `02-dev-roles/security-audit/SKILL.md` |
| Session state preservation | `01-planning-process/session-notes/SKILL.md` |
| CI/CD pipeline monitoring | `08-devops/ci-cd/SKILL.md` |

## 📚 References

- [ECC Security Guide — Kill Switches](https://github.com/affaan-m/ECC/blob/main/the-security-guide.md)
- `04-backend/docker/SKILL.md` — Sandboxing para agentes
