# The 4R Framework for Code Review

A structured review protocol ordering diagnosis before prescription. Run every PR review through the four Rs in order. Each R must be **answered explicitly** — silent assumptions are exactly what this framework is designed to surface.

> Origin: codified by Gentleman Programming's code-review workflow. Use alongside [`code-reviewer`](../SKILL.md) and the [`gga`](pre-commit-gga.md) pre-commit hook.

---

## R1 — Reverse-Engineer

**Question:** *What does this code **actually** do?*

Trace the runtime path, not the comments. The author's intent often diverges from what the code executes — your job is to surface that gap.

### How

- Read the diff top to bottom, then mentally (or on paper) execute a representative input through the changes.
- Note every place where behavior depends on external state (env, async order, shared mutable objects, cache freshness).
- Flag any line where the runtime path could diverge from the obvious one (early return, conditional reassignment, async race, side effect in a map/filter).

### What it catches

Hidden bugs leaking through assumptions: a guard that does not fire under input type B, a state update that runs before its dependency is ready, a socket listener registered twice under a transient condition.

### Output

A plain-language trace: *"Given `payload.status === 'shipped'`, line 47 calls `notify()` before the transaction commits on line 52, so a crash between 47 and 52 leaves a notified-but-unpersisted order."*

No prescription yet. R2 and R3 must complete before R4.

---

## R2 — Reason

**Question:** *Why is this written this way — and is the why still valid?*

### How

- Ask `git blame` / `git log -p` on the touched lines: when was the current shape introduced, and under what constraint?
- Look for the three classic stale-justification patterns:
  - **Premature optimization** — a perf workaround for a load the system no longer sees.
  - **Copy-paste inheritance** — a pattern pasted from a sibling module where it was correct, but it is not correct here.
  - **Defensive padding** — checks "just in case" for inputs the upstream contract already forbids (now dead code that misleads future readers).
- Ask the author (or the commit message) for the original reason. If the reason is gone, the code is a candidate for simplification — but do not simplify yet, that is R4.

### What it catches

Code that is correct only under a historical constraint that no longer holds. This is the category of bug that a *pure* reverse-engineer pass misses, because the code runs correctly in isolation — it just does not fit the system as it is today.

### Output

A verdict per touched region: *"Lines 30-45 reimplement slugify because utils/slug.ts did not exist in 2024 — it now does. Stale."* or *"Lines 30-45 are unrolled because the framework's lazyMemo had a bug in v3 — confirmed fixed in v4 — stale."*

---

## R3 — Reuse

**Question:** *Where is this already solved in the codebase?*

### How

Before adding (or accepting) new code, search for existing solutions:

- `grep` / `rg` for the noun being modeled (e.g. `slugify`, `formatCurrency`, `BookingStatus`) across `apps/`, `packages/`, `utils/`, `shared/`.
- Check the adjacency: the utility that feels missing is often three folders away, unprefixed, or in a `*_utils.ts` that is easy to skip.
- Verify imports: if a reusable function exists but is not imported, prefer correcting the import over duplicating the logic.

### What it catches

DRY violations. The biggest cause of code review churn is parallel implementations of the same domain rule (two `formatMoney`, three `parseBookingStatus`, four `validateEmail` regexes). Each duplicate is a future bug when the rule changes.

### Output

A list of duplicates found: *"New `src/lib/formatMoney.ts` reimplements `packages/shared-utils/currency.ts:formatMoney`. Import the shared one."*

---

## R4 — Resolve

**Question:** *What is the **smallest** change that fixes the diagnosed issue?*

### How

Only after R1, R2, R3 have produced their verdicts. Resist the urge to prescribe before diagnosing — a classic reviewer failure is to propose an architecture change for a missing null-check.

- Match the scope of the fix to the scope of the problem.
- If R1 surfaced a runtime bug, the smallest fix is usually one line.
- If R2 surfaced a stale justification, the smallest fix is to delete the workaround.
- If R3 surfaced a duplicate, the smallest fix is to import the existing function and delete the new one.
- **Only** when all three prior Rs point at a structural problem (the abstraction itself is wrong) is a larger change justified — and even then, propose it as a follow-up PR if possible.

### What it catches

Over-engineering. A reviewer proposing a new middleware layer to fix one missing `await` is doing R4 without doing R1-R3 first. The 4R order prevents this.

### Output

A concrete recommendation — *not* the implementation: *"Delete `slugify` in `src/lib/`, import from `shared-utils`. Add the one missing `await` on line 47. Do not touch the transaction wrapper — that is a separate concern."*

---

## Escalation

- Single reviewer cannot surface enough on a non-trivial change? Escalate to [`judgment-day`](../../judgment-day/SKILL.md): two independent judges (red + blue) review the same target in parallel fresh contexts.
- Scope ambiguity blocking any R? Stop the review and ask the author a written question — guessing produces false verdicts.

## Rules

1. **Diagnose before prescribe.** R1-R3 must be answered before R4. A review that jumps to R4 is not a 4R review.
2. **One context for review, another for implementation.** The reviewer outputs recommendations; the author writes the fix in a fresh context. Mixing the two produces self-justifying reviews.
3. **No silent Rs.** Every R is answered explicitly, even if the answer is "nothing found." Silent Rs are where bugs hide.
4. **Smallest fix wins.** Bigger changes get pushed to a follow-up.

## Keywords
4r, code review framework, reverse-engineer, reason, reuse, resolve, diagnosis before prescription