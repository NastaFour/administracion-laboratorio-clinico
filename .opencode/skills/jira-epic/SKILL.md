---
name: jira-epic
description: >
  Creates well-structured Jira Epics with user-facing descriptions, acceptance criteria, and
  child task breakdown. Trigger when the user asks to create a Jira epic, organize a feature
  into epics, or structure a large initiative into parent tasks with children.
license: MIT
compatibility: "Works with Claude Code, Cursor, Gemini, and any other agentskills.io compatible agent."
allowed-tools: Read
metadata:
  author: gentleman-programming
  version: "1.0"
  category: 01-planning-process
  tags: [jira, epic, planning, project-management, tasks, acceptance-criteria]
---

# Jira Epic — Structure & Best Practices

## When to Use

Load this skill when:
- Creating a new Jira Epic for a feature or initiative
- Breaking down a large feature into epics + child tasks
- Structuring work for multi-team coordination
- Linking epics to a roadmap or sprint planning session

---

## Epic Anatomy

An epic answers: **"What problem are we solving and why does it matter?"**

| Field | Content |
|-------|---------|
| **Title** | `[EPIC] Feature name — brief outcome` |
| **Description** | Business problem + user value |
| **Acceptance Criteria** | User-visible, testable outcomes |
| **Out of Scope** | Explicit non-goals |
| **Child Tasks** | Linked API, UI, and SDK tasks |
| **Priority** | High / Medium / Low + business justification |

---

## Epic Title Convention

```
[EPIC] {What the user can do} — {business outcome}
```

**Examples:**
- `[EPIC] Multi-region support — users can select AWS regions per account`
- `[EPIC] Dark mode — reduce eye strain for night-time users`
- `[EPIC] Bulk exports — compliance teams can export 10K+ findings at once`

---

## Epic Template

```markdown
## Problem

{What business problem does this solve? Who is affected?}

## Solution

{High-level description of the solution, from the user's perspective.}

## User Story

As a {user type},
I want to {action},
So that {benefit}.

## Acceptance Criteria

- [ ] User can {specific observable behavior 1}
- [ ] User sees {specific observable behavior 2}
- [ ] {Behavior from user's point of view — NOT technical}
- [ ] {Performance / SLA criteria if relevant}

## Out of Scope

- {Explicitly what this epic does NOT include}
- {Related future work that belongs in a different epic}

## Design

- Figma: {link if available}
- Architecture diagram: {link if available}

## Child Tasks

- [ ] `[FEATURE] {Epic name} (API)` — Backend implementation
- [ ] `[FEATURE] {Epic name} (UI)` — Frontend implementation
- [ ] `[FEATURE] {Epic name} (SDK)` — SDK changes if needed

## Metrics / Success Criteria

- {How will we know this epic is successful in production?}
- {e.g., "Export CSV downloads > 0 errors for files up to 50K rows"}

## Priority

{High/Medium/Low} — {business justification, e.g., "Q3 committed feature, blocks enterprise tier"}

## Dependencies

- Blocked by: {other epic or external team}
- Blocks: {what this unblocks}
```

---

## Breaking Epics into Child Tasks

### Rule: Split by component, not by step

```
❌ DON'T: Task 1 "Design", Task 2 "Build", Task 3 "Test"
✅ DO:    Task 1 "[FEATURE] Export CSV (API)", Task 2 "[FEATURE] Export CSV (UI)"
```

### Pattern: Parent Epic → Child Tasks

```markdown
## Parent Epic: [EPIC] Bulk Export

### Child Task 1: [FEATURE] Bulk Export (API)
- POST /exports with filter criteria
- Background job with BullMQ
- S3 pre-signed URL generation
- Webhook/notification on completion

### Child Task 2: [FEATURE] Bulk Export (UI)
- Export button in findings table
- Filter selection modal
- Download progress indicator
- Toast notification with download link
```

---

## Priority Guidelines

| Priority | Criteria |
|----------|---------|
| **Critical** | Production down, data loss, security vulnerability |
| **High** | Committed in roadmap, blocks other teams, enterprise feature |
| **Medium** | Requested by multiple customers, has workaround |
| **Low** | Nice-to-have, internal tooling, cosmetic |

---

## Jira MCP Integration

When creating epics via MCP:

```json
{
  "project_key": "PROJECT",
  "summary": "[EPIC] Feature name — outcome",
  "issue_type": "Epic",
  "additional_fields": {
    "customfield_10014": "[EPIC] Feature name"
  }
}
```

After creating, update description:

```json
{
  "customfield_10363": "h2. Problem\n\n{problem}\n\nh2. Acceptance Criteria\n\n* [ ] {criteria 1}\n* [ ] {criteria 2}\n\nh2. Out of Scope\n\n* {non-goal 1}"
}
```

---

## Integration con skillsGV

Combinar con: `jira-task` (para los child tasks de cada epic), `professional-planner` (SDD antes de crear epics), `project-tracker` (tracking del roadmap), `github-pr` (PRs vinculados al epic).
