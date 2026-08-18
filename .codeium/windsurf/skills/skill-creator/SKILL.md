---
name: skill-creator
description: Generates new skills following the official agentskills.io spec (name lowercase-hyphen, description under 1024 chars). Creates the folder structure (SKILL.md + references/, scripts/, assets/), validates frontmatter constraints, and seeds the SKILLS.md index. Use when adding a new skill, refactoring an existing one, or bootstrapping a skill catalog.
license: MIT
compatibility: Requires Node 20+ and pnpm 9+. Works in any skill catalog compliant with agentskills.io.
metadata:
  trigger: ["crear skill", "nueva skill", "skill nueva", "create skill", "add skill", "bootstrap skill"]
  scope: [root-only]
  version: "1.0.0"
allowed-tools: Write Edit Bash(mkdir:*) Bash(touch:*) Read
---

# 🛠️ Skill Creator

Use this meta-skill to add new skills to the catalog in a spec-compliant way. Run all checks before declaring a skill "ready".

## 🚦 Spec Constraints (agentskills.io)

| Field | Rule | Example |
|---|---|---|
| `name` | 1-64 chars, `[a-z0-9-]`, no start/end `-`, no `--` | `prisma-orm` |
| `description` | 1-1024 chars, non-empty, describes when to use | "Use when creating Prisma schemas..." |
| `license` | Optional, license name or file ref | `MIT` |
| `compatibility` | Optional, max 500 chars | "Requires Node 20+, pnpm 9+" |
| `metadata` | Optional, free key-value map | trigger keywords, scope, version |
| `allowed-tools` | Optional, space-separated, experimental | `Read Edit Bash(pnpm:*)` |

The `name` field **must match the parent directory name**.

## 📁 Required Structure

```
<skill-name>/
├── SKILL.md              # Required: frontmatter + body
├── references/           # Optional: docs, schemas, examples
│   └── *.md
├── scripts/              # Optional: executable helpers
│   └── *.{mjs,ts,sh,py}
└── assets/               # Optional: templates, images
    └── *
```

## 📝 SKILL.md Template

```markdown
---
name: <skill-name>
description: <≤1024 chars: what it does AND when to use it>
license: MIT
compatibility: Requires Node 20+ and pnpm 9+
metadata:
  trigger: ["keyword1", "keyword2", "keyword3"]
  scope: [global, project]   # or [root-only], [feature-specific]
  version: "1.0.0"
allowed-tools: Read Edit Bash(pnpm:*) Bash(git:*)
---

# <Skill Title>

<One-sentence purpose statement>

## 📋 When to Use

- Use when <scenario A>
- Use when <scenario B>
- Do NOT use for <scenario C>

## 🚦 Hard Rules

- **Always** <rule 1>
- **Never** <rule 2>

## 🛠️ Workflow

1. <Step 1>
2. <Step 2>
3. <Step 3>

## 📚 References

- [Related skill 1](../category/related/SKILL.md)
- [External doc](https://example.com)
```

## ✅ Validation Checklist

Before completing, verify:

- [ ] Folder name matches `name` in frontmatter
- [ ] `name` is 1-64 chars, only `[a-z0-9-]`, no leading/trailing `-`, no `--`
- [ ] `description` is 1-1024 chars
- [ ] `description` includes both "what" and "when"
- [ ] If `license` set, file is referenced or short name used
- [ ] If `compatibility` set, ≤500 chars
- [ ] No mention of the legacy `npm`/`npx` commands (use `pnpm` / `pnpm dlx` / `pnpm exec`)
- [ ] No mention of LocalStorage for tokens
- [ ] No `any` in code samples
- [ ] Validation scripts referenced
- [ ] Entry added to `SKILLS.md` index
- [ ] Auto-invoke entry added to `AGENTS.md` (if applicable)

## 🧪 Validation Command

```bash
# Quick local validation (no external deps)
node ./00-meta-skills/skill-validator/scripts/validate-skills.mjs
```

Or the public package (if installed via pnpm):

```bash
pnpm dlx skills-ref validate ./<skill-folder>
```

## 📦 Seed the SKILLS.md Index

After creating the skill, add a row to the appropriate category table in `SKILLS.md`:

```markdown
| <skill-name> | [NN-category/<skill-name>/SKILL.md](NN-category/<skill-name>/SKILL.md) |
```

Also add an `Auto-Invoke` row to `AGENTS.md` if the skill should trigger on a specific action.

## 🔄 Related Meta-Skills

- `skill-validator` — automated spec compliance check
- `skill-sync` — cross-tool distribution (no MCP needed)
