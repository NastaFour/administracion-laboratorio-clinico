---
name: research-first
description: ECC-inspired research-first development pattern. Before writing any code, research the problem space, gather documentation, check existing implementations, and document findings. Use when starting a new feature, debugging complex issues, or evaluating new libraries/frameworks.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["research", "investigate", "evaluate", "compare libraries", "spike", "investigation", "research first", "ECC research"]
  scope: [global, project]
  version: "1.0.0"
---

# 🔬 Research-First Development (ECC Pattern)

Before writing a single line of code, research the problem. This skill structures research as a first-class development phase — not an afterthought. Inspired by [ECC's](https://github.com/affaan-m/ECC) research-first workflow (winner of Anthropic's Hackathon, 215k stars).

## 📋 When to Use

- Use when starting a feature in an unfamiliar domain
- Use when evaluating whether to use library A vs library B
- Use when debugging a complex issue that spans multiple systems
- Use when the user asks "investigate", "research", "compare", or "is it possible to..."
- Do NOT use for trivial lookups (that's just a web search)

## 🚦 Hard Rules

- **Always** research FIRST, code SECOND. No exceptions.
- **Always** document findings in `research.md` in the feature spec folder
- **Always** cite sources (URL, date accessed) for every claim
- **Never** accept the first answer without cross-referencing against a second source
- **Never** skip recording dead ends — "why we didn't use X" is as valuable as "why we used Y"

## 🛠️ Research Workflow

### Phase 1: Scope the Question

```markdown
# Research: <topic>
- **Feature**: <which feature this serves>
- **Question**: <the exact question to answer>
- **Success criteria**: <how we know research is complete>
- **Timebox**: <max 15 min for a spike, 1h for in-depth>
```

### Phase 2: Gather Sources

| Type | Where to Look |
|---|---|
| Official docs | Library/framework documentation site |
| Source code | GitHub: README, examples/, tests/ |
| Community | GitHub issues, Stack Overflow, Discord |
| Standards | RFCs, ECMAScript proposals, W3C |
| Prior art | How did other projects solve this? |
| Comparisons | "X vs Y" articles, benchmarks, HN discussions |

### Phase 3: Cross-Reference

For every finding: **find at least 2 independent sources that agree**. If sources disagree, document the disagreement and your reasoning.

### Phase 4: Write the Research Report

Save as `openspec/changes/<feature>/research.md`:

```markdown
# Research: <topic>

**Date**: 2026-06-14
**Feature**: <link to feature spec>
**Author**: <your name or agent>

## 🎯 Question
<exact question being researched>

## 📚 Sources Reviewed
- [Source 1](url) — <what it covers, date accessed>
- [Source 2](url) — <what it covers, date accessed>

## 🧠 Key Findings
1. **Finding 1**: <conclusion with evidence>
   - Evidence: <citation from source>
2. **Finding 2**: <conclusion with evidence>

## 🔀 Alternatives Considered
| Option | Pros | Cons | Verdict |
|---|---|---|---|
| Option A | ... | ... | ❌ Rejected because... |
| Option B | ... | ... | ✅ Selected because... |

## 🛤️ Dead Ends
- **Tried X**: it failed because Y. Time spent: 10 min.
- **Looked into Z**: not applicable because W.

## ✅ Recommendation
<single clear recommendation based on research>
```

### Phase 5: Link to Decision Log

After research is complete, add an entry to `project-tracker` Decision Log:

```markdown
- [2026-06-14] Research completed: <topic>. Decision: <recommendation>. See `openspec/changes/<feature>/research.md`.
```

## 🔗 Integration with SDD Flow

```
Research ──► Proposal ──► Spec ──► Design ──► Tasks ──► Apply
   │
   │ (professional-planner Phase 1)
   │
   └── Research feeds into PRD and Design
       No code until research is complete
```

## 📚 References

- [ECC Research-First Pattern](https://github.com/affaan-m/ECC/blob/main/the-longform-guide.md)
- `professional-planner/SKILL.md` — SDD Phase 1 (Briefing)
- `01-planning-process/project-tracker/SKILL.md` — Decision Log
- `03-ai-ml/llm-integration/SKILL.md` — if researching LLM providers
