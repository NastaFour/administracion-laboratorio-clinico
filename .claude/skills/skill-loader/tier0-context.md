## skill-router
Deterministic router that pre-selects which skills an agent should load, replacing ~80% of stochastic LLM-based skill selection with exact trigger matching. Outputs primary skill + secondary candidates + SDD/trivial flags. Use BEFORE any agent turn that might invoke another skill, to shrink the agent's decision surface from 109 skills to 3-5.

## skill-validator
Validates that all SKILL.md files in the catalog comply with the agentskills.io specification. Checks name constraints, description length, frontmatter structure, and folder-name matching. Exits non-zero on any failure. Use in pre-commit hooks, CI pipelines, or before publishing a skill catalog.

## skill-sync
Distributes skills from this catalog to multiple AI agent configurations using cross-platform file operations (copy, symlink, junction). Detects which tools are installed on the host and creates the right folder structure for each. Use when installing skills into a new project or syncing updates across tools.

## skill-creator
Generates new skills following the official agentskills.io spec (name lowercase-hyphen, description under 1024 chars). Creates the folder structure (SKILL.md + references/, scripts/, assets/), validates frontmatter constraints, and seeds the SKILLS.md index. Use when adding a new skill, refactoring an existing one, or bootstrapping a skill catalog.

## skill-loader
Tier 0/1 enforcement for the skills catalog. Caches skill frontmatter with mtime, emits tier0-context.json (12 always-on skills, ~2K tokens) on first run, and per-turn emits tier1-instructions.txt with ONLY the bodies of skills the router selected via tier1toLoad[]. Enforces the "route first" rule: a skill outside the current tier1toLoad must be re-routed before being read. Use at agent boot to bootstrap tier-0 context, and at every turn before reading another skill's body.

## professional-planner
Activates the Spec-Driven Development (SDD) flow in 6 phases with approval gates, versioned artifacts, and skill-ecosystem integration. Use when starting a new module, complex feature, or refactor touching 2+ files or 2+ business domains.

## agents
Orchestration guide for a team of 9 specialized virtual agents in [APP]. Defines roles, responsibilities, collaboration protocols, and delegation triggers. Use when planning multi-agent work or deciding when to delegate vs. work in place.

## idea-to-prd-express
Compress Briefing→Spec→PRD into a 20-minute session for technical decisions that need fast turnaround. Use when the user has a concrete technical decision to make (not a full feature) and full 6-phase SDD is overkill.

## project-tracker
Maintain a strict, minimal-token context of the project's state, constraints, and architecture. Use this skill to preserve continuity across sessions, enforce tech stack rules, and systematically track roadmap progress without relying on chat history.

## session-notes
ECC-inspired session-to-session context transfer. Records key decisions, discoveries, and context at session end so the next session starts with awareness. Use at the end of each development session or before context compaction.

## decision-gate
Decision-support system that compresses the human's last-20% judgment from 30 min to 3 min. Presents trade-offs as an ordered matrix, surfaces conflicts with prior decisions (via Engram), offers safe defaults to override, and records the decision + reasoning in Engram. Use when judgment-day or a PRD leaves a decision the human must make and you want it fast, well-informed, and traceable.

## dod-checker
Act as the strict Gatekeeper for the "Definition of Done" (DoD). Run this skill to evaluate a feature or phase. Blocks stage checkoffs if SOLID, DRY, or 2026 security guardrails are bypassed.