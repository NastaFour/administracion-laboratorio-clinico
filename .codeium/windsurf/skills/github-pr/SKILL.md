---
name: github-pr
description: Create high-quality Pull Requests with conventional commit titles, structured descriptions (Summary/Changes/Testing), atomic commits, draft mode, reviewers and labels via gh CLI. Use when creating PRs or writing PR descriptions so the AI does not produce vague titles or giant unreviewable PRs.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires gh CLI, git."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["github pr", "pull request", "gh pr create", "conventional commits", "pr description", "atomic commits", "draft pr"]
  scope: [global, project]
  version: "1.0.0"
---

# GitHub PR

## When to Use

- Creating a new Pull Request
- Writing PR titles and descriptions
- Preparing commits for review
- Using `gh pr create` command

## Critical Patterns

### PR Title = Conventional Commit

```
<type>(<scope>): <short description>

feat     New feature
fix      Bug fix
docs     Documentation
refactor Code refactoring
test     Adding tests
chore    Maintenance
```

### PR Description Structure

```markdown
## Summary
- 1-3 bullet points explaining WHAT and WHY

## Changes
- List main changes

## Testing
- [ ] Tests added/updated
- [ ] Manual testing done

Closes #123
```

### Atomic Commits

```bash
# Good: One thing per commit
git commit -m "feat(user): add User model"
git commit -m "feat(user): add UserService"
git commit -m "test(user): add UserService tests"
# Bad: Everything in one commit
git commit -m "add user feature"
```

## Code Examples

### Basic PR Creation

```bash
gh pr create \
  --title "feat(auth): add OAuth2 login" \
  --body "## Summary
- Add Google OAuth2 authentication

## Changes
- Added AuthProvider component
- Created useAuth hook

Closes #42"
```

### PR with HEREDOC (Complex Description)

```bash
gh pr create --title "feat(dashboard): add analytics" --body "$(cat <<'EOF'
## Summary
- Add real-time analytics dashboard

## Changes
- Created AnalyticsProvider
- Added LineChart, BarChart components

## Testing
- [x] Unit tests for components
- [x] Manual testing complete

## Screenshots
![Dashboard](url)

Closes #123
EOF
)"
```

### Draft PR

```bash
gh pr create --draft --title "wip: refactor auth" --body "Work in progress"
```

### PR with Reviewers and Labels

```bash
gh pr create \
  --title "feat(api): add rate limiting" \
  --body "Adds rate limiting to API" \
  --reviewer "user1,user2" \
  --label "enhancement,api"
```

## Commands

```bash
gh pr create --title "type(scope): desc" --body "..."   # Create PR
gh pr create --web                                       # Create with web editor
gh pr status                                             # View PR status
gh pr diff                                               # View diff
gh pr checks                                             # Check CI status
gh pr merge --squash                                     # Merge with squash
gh pr edit --add-reviewer username                       # Add reviewer
```

## Anti-Patterns

### Don't: Vague Titles

```bash
# Bad
gh pr create --title "fix bug"
gh pr create --title "update"
# Good
gh pr create --title "fix(auth): prevent session timeout"
```

### Don't: Giant PRs

```bash
# Bad: 50 files, 2000+ lines in one PR
# Good: Split into logical PRs
# PR 1: feat(models): add User model
# PR 2: feat(api): add user endpoints
# PR 3: feat(ui): add user pages
```

### Don't: Empty Descriptions

```bash
# Bad
--body "Added feature"
# Good
--body "## Summary
- What you did and why

## Changes
- Specific changes

Closes #123"
```

## Quick Reference

| Task | Command |
|------|---------|
| Create PR | `gh pr create -t "type: desc" -b "body"` |
| Draft PR | `gh pr create --draft` |
| Web editor | `gh pr create --web` |
| Add reviewer | `--reviewer user1,user2` |
| Add label | `--label bug,high-priority` |
| Link issue | `Closes #123` in body |
| View status | `gh pr status` |
| Merge squash | `gh pr merge --squash` |

## Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub CLI Manual](https://cli.github.com/manual/gh_pr_create)