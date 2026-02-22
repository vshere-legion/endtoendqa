# Best Practices

Patterns and anti-patterns for writing reliable, maintainable tests in this framework.

---

## 1. Feature Files

### DO

- **One concern per scenario.** Each scenario tests one thing. If a scenario has 15+ steps, split it.
- **Use Background for shared setup.** If every scenario in a feature starts with login + location selection, put it in Background.
- **Tag strategically.**
  - `@smoke` — critical path (run on every PR)
  - `@regression` — full suite (nightly)
  - `@wip` — work in progress (excluded from CI)
  - `@TestRail_12345` — links to TestRail case

```gherkin
@regression @TestRail_12345
Feature: Schedule Publishing

  Background:
    Given I login as 'StoreManager1'.
    And I select location 'Automation1'.

  @smoke
  Scenario: Publish current week schedule
    When I navigate to schedule page
    Then I should see the weekly schedule
```

### DON'T

- Don't write imperative steps (`click button X`, `enter text in field Y`). Write declarative steps (`I login as 'Admin'`).
- Don't put test data in feature files. Use the data layer: `Given I login as 'StoreManager1'` resolves credentials from JSON.
- Don't create one-scenario features. Group related scenarios together — they share Background setup and run sequentially within the feature.

---

## 2. Step Definitions

### DO

- **Use TestContext for sharing data between steps.**
  ```typescript
  // In login step
  testContext.setContext(ContextKey.USER_NAME, user.name);

  // In later step
  const username = testContext.getContext<string>(ContextKey.USER_NAME);
  ```

- **Use DataService for credentials — never hardcode.**
  ```typescript
  // GOOD: Data-driven
  Given('I login as {string}.', async ({ testContext, page }, userType: string) => {
    const user = testContext.dataService.getUILoginUserBy(userType);
    // login with user.name, user.password
  });

  // BAD: Hardcoded
  Given('I login as admin.', async ({ page }) => {
    await page.fill('#username', 'admin@company.com');  // Never do this
  });
  ```

- **Keep steps thin.** Steps should call page object methods, not contain Playwright locator logic.
  ```typescript
  // GOOD: Thin step
  When('I publish the schedule', async ({ schedulePage }) => {
    await schedulePage.publishCurrentWeek();
  });

  // BAD: Fat step with locator details
  When('I publish the schedule', async ({ page }) => {
    await page.click('[data-testid="publish-btn"]');
    await page.waitForSelector('.toast-success');
    await page.click('.confirm-dialog .ok');
  });
  ```

### DON'T

- Don't create steps that are only used once. If a step is feature-specific, put it in the team's step file, not shared.
- Don't use `page.waitForTimeout()`. Use `page.waitForSelector()`, `expect(locator).toBeVisible()`, or Playwright's auto-waiting.

---

## 3. Page Objects

### DO

- **Extend BasePage.** It provides common utilities (wait helpers, screenshot, etc.).
- **Encapsulate locators.** All selectors live inside the page object class, not in step definitions.
- **Return page objects for navigation.** If clicking a button navigates to a new page, return the new page object.
  ```typescript
  class DashboardPage extends BasePage {
    async navigateToSchedule(): Promise<SchedulePage> {
      await this.page.click('[data-testid="schedule-nav"]');
      return new SchedulePage(this.page, this.testContext);
    }
  }
  ```

- **Use data-testid selectors** when available. They're stable across UI changes.

### DON'T

- Don't put assertions in page objects. Page objects describe *what you can do* on a page. Assertions belong in step definitions.
- Don't pass raw Playwright `Page` between steps. Pass page objects via the fixture system.

---

## 4. Test Data

### DO

- **One data file per enterprise+environment combination.**
  ```
  test-data/users/user_loc_LegionCoffee_STG.json
  test-data/users/user_loc_panda2bts_EA.json
  ```

- **Include multiple user types.** Each file should have at least one user per role your tests need (Admin, StoreManager1, TeamMember, etc.).

- **Use the `isUsed` tracking.** DataService marks users as "in use" per scenario and releases them after. This prevents two parallel scenarios from logging in with the same credentials.

- **Keep sensitive data out of git.** Real credential files should be in `.gitignore`. Commit only sample/template files.

### DON'T

- Don't modify data files at runtime. The `isUsed` flag is in-memory only — the JSON file on disk is never written to.
- Don't use the same user for API and UI login in the same scenario unless the user has both roles in `usedAs`.

---

## 5. Parallel Execution & Shared Session

### DO

- **Design scenarios with their own navigation.** Each scenario's Given steps should navigate to the page it needs. Don't assume the browser is in a specific state from a previous scenario.
  ```gherkin
  # GOOD — Each scenario navigates via its Given steps:
  Scenario: Add notes to schedule
    Given I go to the schedule page       ← navigates from wherever we are
    When I add notes "Team meeting at 2pm"
    Then the notes should be saved

  Scenario: Edit shift
    Given I go to the schedule page       ← navigates again (recovery-safe)
    When I edit the shift for 'TestQA1'
    Then the shift should be updated
  ```

- **Understand shared vs independent.** Scenarios within a feature **share a browser session** (same BrowserContext, Page, TestContext) for performance, but are **independent in outcome** — failure in one never skips others.

- **Group related scenarios in one feature.** Scenarios within a feature run sequentially on the same worker with a shared browser session. This saves re-login and re-navigation time.

- **Use unique test data per worker.** The DataService + `isUsed` flag handles this automatically. If you have 10 workers, ensure your data file has enough users/locations.

### DON'T

- Don't assume execution order across features. Feature A and Feature B may run on different workers in any order.
- Don't rely on browser state from a previous scenario. If Scenario 3 fails, the framework recovers (navigates to dashboard). Scenario 4 must navigate to where it needs via its Given steps.
- Don't skip scenarios based on previous failures. The framework never skips — it recovers and continues.
- Don't create scenarios that clean up after other scenarios. Each feature's cleanup happens automatically when the feature ends (context closed, users/locations released).

---

## 6. Debugging

### DO

- **Use Playwright's trace viewer** for debugging failures:
  ```bash
  npx playwright test --trace on
  npx playwright show-trace trace.zip
  ```

- **Run single scenarios** during development:
  ```bash
  npm test -- --grep "scenario name"
  ```

- **Use headed mode** to watch the browser:
  ```bash
  HEADED=true npm test
  ```

- **Check DataService logs.** Every user/location selection is logged:
  ```
  [DataService] Selected UI login user by type 'StoreManager1': julie+sm@legion.co
  [DataService] Selected location: Automation1 (conf: DolarGeneral)
  ```

---

## 7. CI/CD

### DO

- **Use sharded execution for CI:**
  ```bash
  node scripts/run-sharded.js --tags "@smoke" --workers 10
  ```

- **Always merge reports after sharded runs:**
  ```bash
  node scripts/merge-reports.js --capture-failures
  ```

- **Rerun failures before marking a build as failed:**
  ```bash
  node scripts/rerun-failed.js --retries 2
  ```

- **Set `CI=true`** in your pipeline. The framework adjusts workers and retries based on this.

### DON'T

- Don't run more workers than you have unique users/locations in your data file.
- Don't skip report merging — individual shard reports are incomplete.

---

## 8. Failure Recovery

### DO

- **Trust the recovery mechanism.** If a scenario fails, the framework automatically takes a screenshot, dismisses dialogs, and navigates to the base URL. The next scenario starts clean.
- **Include navigation in every scenario's Given steps.** This ensures scenarios work correctly even after a recovery.
  ```gherkin
  # This scenario works after a failed scenario because
  # the Given step navigates from wherever the browser is:
  Scenario: Verify schedule
    Given I go to the schedule page    ← will work from dashboard after recovery
    Then I should see the schedule
  ```

### DON'T

- Don't add explicit "go to dashboard" steps between scenarios. The recovery mechanism handles this automatically.
- Don't add conditional logic to check if previous scenarios passed. Scenarios are independent — always execute all of them.
