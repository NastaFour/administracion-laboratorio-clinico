---
name: playwright
description: Playwright E2E testing patterns — MCP-first exploration, Page Object Model, selector priority (getByRole/getByLabel), BasePage reuse, helpers, test tags, documentation format. Use when writing E2E tests so the AI verifies real selectors before writing flaky tests.
license: Apache-2.0
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Playwright, Node 20+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["playwright", "e2e testing", "end to end", "page object model", "getByRole", "getByLabel", "playwright mcp", "flaky tests"]
  scope: [global, project]
  version: "1.1.0"
---

# Playwright (E2E)

## MCP Workflow (MANDATORY If Available)

If you have Playwright MCP tools, **ALWAYS use them BEFORE creating any test**:

1. Navigate to target page
2. Take snapshot to see page structure and elements
3. Interact with forms/elements to verify exact user flow
4. Take screenshots to document expected states
5. Verify page transitions through complete flow (loading, success, error)
6. Document actual selectors from snapshots (use real refs and labels)
7. Only after exploring, create test code with verified selectors

If MCP NOT available: proceed with test creation based on docs and code analysis.

Why: precise tests (exact steps, no assumptions), accurate selectors (real DOM), real flow validation, avoid over-engineering, prevent flaky tests. Never assume how UI "should" work.

## File Structure

```
tests/
├── base-page.ts              # Parent class for ALL pages
├── helpers.ts                # Shared utilities
└── {page-name}/
    ├── {page-name}-page.ts   # Page Object Model
    ├── {page-name}.spec.ts   # ALL tests here (NO separate files!)
    └── {page-name}.md        # Test documentation
```

File Naming: `sign-up.spec.ts` (all sign-up tests), `sign-up-page.ts`, `sign-up.md`. ❌ No `sign-up-critical-path.spec.ts` (no separate files per concern).

## Selector Priority (REQUIRED)

```typescript
// 1. BEST - getByRole for interactive elements
this.submitButton = page.getByRole("button", { name: "Submit" });
// 2. BEST - getByLabel for form controls
this.emailInput = page.getByLabel("Email");
// 3. SPARINGLY - getByText for static content only
this.errorMessage = page.getByText("Invalid credentials");
// 4. LAST RESORT - getByTestId when above fail
this.customWidget = page.getByTestId("date-picker");
// ❌ AVOID fragile selectors
this.button = page.locator(".btn-primary");  // NO
this.input = page.locator("#email");         // NO
```

## Scope Detection (ASK IF AMBIGUOUS)

| User Says | Action |
|-----------|--------|
| "a test", "one test", "new test", "add test" | Create ONE test() in existing spec |
| "comprehensive tests", "all tests", "test suite", "generate tests" | Create full suite |

## Page Object Pattern

```typescript
import { Page, Locator, expect } from "@playwright/test";

export class BasePage {
  constructor(protected page: Page) {}
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState("networkidle");
  }
  async waitForNotification(): Promise<void> {
    await this.page.waitForSelector('[role="status"]');
  }
  async verifyNotificationMessage(message: string): Promise<void> {
    const notification = this.page.locator('[role="status"]');
    await expect(notification).toContainText(message);
  }
}

export interface LoginData { email: string; password: string; }
export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Password");
    this.submitButton = page.getByRole("button", { name: "Sign in" });
  }
  async goto(): Promise<void> { await super.goto("/login"); }
  async login(data: LoginData): Promise<void> {
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);
    await this.submitButton.click();
  }
  async verifyCriticalOutcome(): Promise<void> { await expect(this.page).toHaveURL("/dashboard"); }
}
```

## Page Object Reuse (CRITICAL)

Always check existing page objects before creating new ones.

```typescript
// ✅ GOOD: Reuse existing page objects
import { SignInPage } from "../sign-in/sign-in-page";
import { HomePage } from "../home/home-page";
test("User can sign up and login", async ({ page }) => {
  const signUpPage = new SignUpPage(page);
  const signInPage = new SignInPage(page);  // REUSE
  const homePage = new HomePage(page);      // REUSE
  await signUpPage.signUp(userData);
  await homePage.verifyPageLoaded();
  await homePage.signOut();
  await signInPage.login(credentials);
});
// ❌ BAD: Recreating existing functionality in a new page object
```

## Refactoring Guidelines

Move to `BasePage` when: navigation helpers used by multiple pages, common UI interactions (notifications, modals, theme toggles), verification patterns repeated across pages, error handling that applies to all pages, screenshot utilities.

Move to `helpers.ts` when: test data generation (`generateUniqueEmail()`, `generateTestUser()`), setup/teardown utilities (`createTestUser()`, `cleanupTestData()`), custom assertions, API helpers for test setup (`seedDatabase()`, `resetState()`), time utilities.

## Test Pattern with Tags

```typescript
import { test, expect } from "@playwright/test";
import { LoginPage } from "./login-page";

test.describe("Login", () => {
  test("User can login successfully",
    { tag: ["@critical", "@e2e", "@login", "@LOGIN-E2E-001"] },
    async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login({ email: "user@test.com", password: "pass123" });
      await expect(page).toHaveURL("/dashboard");
    }
  );
});
```

Tag Categories: Priority (`@critical`/`@high`/`@medium`/`@low`), Type (`@e2e`), Feature (`@signup`/`@signin`), Test ID (`@SIGNUP-E2E-001`).

## Test Documentation ({page-name}.md)

Keep under 60 lines: Test Case ID, Priority, Tags, Description, Preconditions, Flow Steps, Expected Result, Key verification points, Notes. No general instructions, no file structure explanations, no code examples, no troubleshooting.

## Commands

```bash
pnpm dlx playwright test                    # Run all
pnpm dlx playwright test --grep "login"     # Filter by name
pnpm dlx playwright test --ui               # Interactive UI
pnpm dlx playwright test --debug            # Debug mode
pnpm dlx playwright test tests/login/       # Run specific folder
```

## Keywords
playwright, e2e, testing, page object model, selectors, end-to-end, mcp