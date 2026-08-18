---
name: jira-task
description: >
  Creates well-structured Jira tasks and bug reports with type-prefixed titles, current/expected
  state, testable acceptance criteria, and component breakdown (API/UI/SDK). Trigger when the
  user asks to create a Jira ticket, write a bug report, structure a feature task, or generate
  Jira-ready markdown for a development task.
license: MIT
compatibility: "Works with Claude Code, Cursor, Gemini, and any other agentskills.io compatible agent."
allowed-tools: Read
metadata:
  author: gentleman-programming
  version: "1.0"
  category: 01-planning-process
  tags: [jira, task, bug, ticket, planning, acceptance-criteria, project-management]
---

# Jira Task — Structure & Best Practices

## When to Use

Load this skill when:
- Creating individual Jira tasks or bug reports
- Structuring work items for a sprint
- Writing acceptance criteria for a feature task
- Breaking an epic child task into a concrete implementation ticket

---

## Title Convention

```
[TYPE] Brief description (components)
```

**Types:**
| Type | When to use |
|------|------------|
| `[BUG]` | Something broken that worked before |
| `[FEATURE]` | New functionality |
| `[ENHANCEMENT]` | Improvement to existing feature |
| `[REFACTOR]` | Code restructure, no behavior change |
| `[DOCS]` | Documentation only |
| `[CHORE]` | Maintenance, deps, CI/CD |

**Component suffixes (when multiple teams involved):**
- `(API)` — Backend only
- `(UI)` — Frontend only
- `(SDK)` — SDK only
- `(API + UI)` — Both
- `(Full Stack)` — All components

**Examples:**
```
[BUG] AWS GovCloud accounts cannot connect — STS region hardcoded (API + UI)
[FEATURE] Add dark mode toggle (UI)
[REFACTOR] Migrate E2E tests to Page Object Model (UI)
[ENHANCEMENT] Improve scan performance for large accounts (SDK)
[CHORE] Upgrade React 18 → 19 (UI)
```

---

## Bug Report Template

```markdown
## Description

**Current State:**
- {What's broken — specific behavior}
- {Impact on users — who is affected and how}
- {Error message or screenshot reference if applicable}

**Expected State:**
- {What should happen}
- {Specific correct behavior}

## Steps to Reproduce

1. {Step 1}
2. {Step 2}
3. {Observe the bug}

## Acceptance Criteria

- [ ] {Specific, testable fix criterion}
- [ ] {Regression test: scenario X no longer fails}
- [ ] {No side effects in Y and Z}

## Technical Notes

- Root cause: {if known}
- Affected files:
  - `path/to/file1.ts`
  - `path/to/file2.py`
- Related PR / commit: {link if available}

## Testing

- [ ] Local environment — {test case}
- [ ] Staging — {test case}
- [ ] Regression: {related scenarios to verify}

## Priority

{High/Medium/Low} — {justification}
```

---

## Feature Task Template

```markdown
## Description

{Brief explanation of the feature from the user's perspective.}

**Why:**
{Business justification or user need.}

## Acceptance Criteria

- [ ] User can {specific observable behavior}
- [ ] User sees {specific UI element or message}
- [ ] {Performance criterion if applicable}
- [ ] {Error state handled correctly}

## Technical Notes

- Implementation approach: {high-level technical notes}
- Affected files:
  - `api/src/backend/api/v1/views.py`
  - `ui/components/features/export/ExportButton.tsx`
- Dependencies / blockers: {if any}

## Testing

- [ ] Unit tests for {specific logic}
- [ ] Integration test: {specific scenario}
- [ ] Manual: {QA scenario in staging}

## Priority

{High/Medium/Low} — {justification}
```

---

## Multi-Component Task Split

For tasks touching more than one component, **always split**:

```markdown
## Recommended Tasks

### Task 1: [BUG] STS region hardcoded for GovCloud (API)

**Description:**
The `sts.amazonaws.com` endpoint is hardcoded, causing connection failures for AWS GovCloud accounts.

**Acceptance Criteria:**
- [ ] API uses `sts.us-gov-west-1.amazonaws.com` when region is `us-gov-*`
- [ ] Existing commercial AWS regions unaffected

**Affected files:**
- `prowler/providers/aws/aws_provider.py`

---

### Task 2: [BUG] GovCloud region not selectable in account form (UI)

**Description:**
The region selector does not show `us-gov-*` regions, blocking GovCloud onboarding.

**Acceptance Criteria:**
- [ ] `us-gov-west-1` and `us-gov-east-1` appear in region dropdown
- [ ] Form validates correctly for GovCloud regions

**Affected files:**
- `ui/components/providers/workflow/forms/aws-credentials-form.tsx`
```

---

## Checklist Before Submitting

1. ☑ Title follows `[TYPE] description (components)` format
2. ☑ Description has Current/Expected State (for bugs) or Why (for features)
3. ☑ Acceptance Criteria are specific and **testable** — not "works correctly"
4. ☑ Technical Notes include file paths when known
5. ☑ Testing section covers happy path + edge cases + regression
6. ☑ Priority has a business justification
7. ☑ Multi-component work is **split into separate tasks**

---

## Jira MCP Integration

```json
{
  "project_key": "PROJECT",
  "summary": "[FEATURE] Task title (API)",
  "issue_type": "Task",
  "additional_fields": {
    "parent": "PROJECT-XXX",
    "priority": { "name": "High" }
  }
}
```

Update work item description (Jira Wiki format):

```json
{
  "customfield_10363": "h2. Description\n\n{description}\n\nh2. Acceptance Criteria\n\n* [ ] {criteria 1}\n* [ ] {criteria 2}\n\nh2. Technical Notes\n\nAffected files:\n* {file 1}\n* {file 2}\n\nh2. Testing\n\n* [ ] {test case 1}"
}
```

---

## Integration con skillsGV

Combinar con: `jira-epic` (para epics padre), `professional-planner` (SDD antes de las tasks), `github-pr` (PR vinculado a la task), `project-tracker` (tracking de sprint), `dod-checker` (definition of done antes de cerrar).
