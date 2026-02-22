# Migration Guide: Selenium to Playwright

Step-by-step guide for porting existing Selenium + Cucumber test scenarios to this
Playwright + Cucumber framework.

---

## 1. What Changes, What Stays the Same

### Stays the Same
- **Feature files** — `.feature` files are almost identical. Same Gherkin syntax, same tags.
- **Data files** — `user_loc_*.json` files copy over directly. Same format.
- **TestRail tags** — `@TestRail_12345` works the same way.
- **Step intent** — `Given I login as 'Admin'` means the same thing.

### Changes
- **Step definitions** — Rewritten in TypeScript with Playwright API (instead of Java + Selenium).
- **Page objects** — Rewritten with Playwright locators (instead of Selenium WebElements).
- **DI/Context** — `@Inject` becomes Playwright fixtures. `ThreadLocal` becomes process isolation.
- **Execution** — `testng.xml` / Maven becomes `playwright.config.ts` / npm scripts.

---

## 2. Porting Feature Files

### Minimal Changes Required

Most feature files port with only tag adjustments:

**Java (Selenium):**
```gherkin
@TimesheetPermissions @ApiLogin @Regression @TP1 @TestRail_12345
Scenario:-TP1- As a Manager I can view/edit timesheet
  Given I login as 'StoreManager1'.
  And I select location '1420 - WORLDS OF FUN'.
  When I navigate to Timesheet menu.
  Then I should see the timesheet page
```

**TypeScript (Playwright):**
```gherkin
@regression @TestRail_12345
Scenario: As a Manager I can view/edit timesheet
  Given I login as 'StoreManager1'.
  And I select location '1420 - WORLDS OF FUN'.
  When I navigate to Timesheet menu
  Then I should see the timesheet page
```

**What changed:**
- Removed `@ApiLogin` (login type is determined by the step implementation, not a tag)
- Removed custom tag prefix `:-TP1-` from scenario name (Playwright doesn't use this convention)
- Removed trailing periods from step names (optional — works either way)

### Tag Mapping

| Selenium Tag | Playwright Tag | Notes |
|---|---|---|
| `@Regression` | `@regression` | Lowercase convention |
| `@Smoke` | `@smoke` | Lowercase convention |
| `@ApiLogin` | Remove | Login type handled in step definition |
| `@TestRail_12345` | `@TestRail_12345` | Works identically |
| `@CreateTestRailRun` | `@CreateTestRailRun` | Works identically |
| `@Api` | Feature in `teams/{team}/features/api/` | Organized by directory instead |

---

## 3. Porting Step Definitions

### Login Steps

**Java (Selenium) — LoginSteps.java:**
```java
@Inject ConsoleLoginPage loginPage;
@Inject DataService dataService;

@Given("I login as '(.*)'.")
public void givenIloginAs(String userType) throws Exception {
    goEnterprisePage(PropertyMap.getEnterprise());
    UserData userData = dataService.getUILoginUserBy(userType);
    loginPage.newLoginToLegionWithCredential(userData.getName(), userData.getPassword());
    setContext(ContextKey.USER_NAME, userData.getName());
    setContext(ContextKey.USER_PASSWORD, userData.getPassword());
    setContext(ContextKey.ENTERPRISE_NAME, PropertyMap.getEnterprise());
}
```

**TypeScript (Playwright):**
```typescript
import { Given } from '@cucumber/cucumber';
import { ContextKey } from '../../src/data/models';

Given('I login as {string}.', async function ({ testContext, page }, userType: string) {
  const envConfig = testContext.dataService['envConfig'];  // already loaded
  const user = testContext.dataService.getUILoginUserBy(userType);

  // Navigate to enterprise login page
  await page.goto(`${envConfig.baseUrl}legion/?enterprise=${envConfig.enterprise}`);

  // Login
  await page.fill('input[ng-model="username"]', user.name);
  await page.fill('[ng-model="password"]', user.password);
  await page.click('.login-button-icon');

  // Store in context
  testContext.setContext(ContextKey.USER_NAME, user.name);
  testContext.setContext(ContextKey.USER_PASSWORD, user.password);
  testContext.setContext(ContextKey.ENTERPRISE_NAME, envConfig.enterprise);
});
```

**Key differences:**
| Java | TypeScript |
|---|---|
| `@Inject DataService` | `testContext.dataService` (from fixture) |
| `@Inject ConsoleLoginPage` | `page` (from Playwright fixture) |
| `goEnterprisePage(enterprise)` | `page.goto(url)` |
| `loginPage.loginToLegion(u, p)` | `page.fill()` + `page.click()` |
| `setContext(key, value)` | `testContext.setContext(key, value)` |


### Location Steps

**Java (Selenium):**
```java
@Given("I select location '(.*)'.")
public void selectLocation(String location) {
    LocationSelectorPage page = pageFactory.createLocationSelectorPage();
    page.changeLocation(location);
    setContext(ContextKey.LOCATION_NAME, location);
}
```

**TypeScript (Playwright):**
```typescript
Given('I select location {string}.', async function ({ testContext, page }, location: string) {
  // Select from dropdown
  await page.click('[data-testid="location-selector"]');
  await page.click(`text="${location}"`);
  await page.waitForLoadState('networkidle');

  testContext.setContext(ContextKey.LOCATION_NAME, location);
  testContext.dataService.selectLocationByName(location);
});
```


### Navigation Steps

**Java (Selenium):**
```java
@When("I navigate to Timesheet menu.")
public void navigateToTimesheet() {
    DashboardPage dashboard = pageFactory.createConsoleDashboardPage();
    dashboard.navigateToTimesheet();
}
```

**TypeScript (Playwright):**
```typescript
When('I navigate to Timesheet menu', async function ({ page }) {
  await page.click('[data-testid="timesheet-nav"]');
  await page.waitForSelector('[data-testid="timesheet-page"]');
});
```

---

## 4. Porting Page Objects

### Pattern Mapping

**Java (Selenium):**
```java
public class ConsoleSchedulePage extends BasePage implements SchedulePage {
    @FindBy(css = "[data-testid='publish-btn']")
    private WebElement publishButton;

    @FindBy(css = ".schedule-week-view")
    private WebElement weekView;

    public void clickPublish() {
        waitForElementToBeClickable(publishButton);
        click(publishButton);
    }

    public boolean isWeekViewLoaded() {
        return isElementLoaded(weekView);
    }
}
```

**TypeScript (Playwright):**
```typescript
import { Page, Locator } from '@playwright/test';

export class SchedulePage {
  private page: Page;
  private publishButton: Locator;
  private weekView: Locator;

  constructor(page: Page) {
    this.page = page;
    this.publishButton = page.locator('[data-testid="publish-btn"]');
    this.weekView = page.locator('.schedule-week-view');
  }

  async clickPublish(): Promise<void> {
    await this.publishButton.click();  // Auto-waits for clickable
  }

  async isWeekViewLoaded(): Promise<boolean> {
    return await this.weekView.isVisible();
  }
}
```

### Key Differences

| Selenium | Playwright | Notes |
|---|---|---|
| `@FindBy` annotation | `page.locator()` in constructor | Playwright locators are lazy |
| `WebElement` | `Locator` | Locator re-queries DOM on each action |
| `waitForElementToBeClickable()` | Auto-wait (built-in) | Playwright waits automatically |
| `click(element)` | `locator.click()` | Returns Promise |
| `isElementLoaded(element)` | `locator.isVisible()` | Returns Promise<boolean> |
| `Thread.sleep(5000)` | `page.waitForLoadState()` | Never use fixed sleeps |
| `WebDriverWait` + `ExpectedConditions` | `locator.waitFor()` or `expect(locator)` | Simpler API |

### Common Selenium → Playwright Locator Mapping

| Selenium | Playwright |
|---|---|
| `By.id("foo")` | `page.locator('#foo')` |
| `By.className("bar")` | `page.locator('.bar')` |
| `By.cssSelector("[data-x='y']")` | `page.locator('[data-x="y"]')` |
| `By.xpath("//div[@class='x']")` | `page.locator('//div[@class="x"]')` |
| `By.linkText("Click me")` | `page.getByRole('link', { name: 'Click me' })` |
| `findElements(By.css(".item"))` | `page.locator('.item').all()` |

---

## 5. Porting Test Configuration

### From testng.xml → playwright.config.ts

**testng.xml** defined 53 test blocks with explicit method includes:
```xml
<test name="Schedule Test">
  <classes>
    <class name="com.legion.tests.core.ScheduleTest">
      <methods>
        <include name="publishScheduleAsInternalAdmin"/>
      </methods>
    </class>
  </classes>
</test>
```

**playwright.config.ts** uses feature files + tags:
```typescript
// No explicit test listing needed — features are auto-discovered
// Control execution via tags:
// npm test -- --grep @smoke
// node scripts/run-sharded.js --tags "@regression and not @wip"
```

### From Maven profiles → npm scripts

| Maven | npm |
|---|---|
| `mvn test -P Testng` | `npm test` |
| `mvn test -P Cucumber` | `npm test` (same — all BDD) |
| `mvn test -Dlegion.environment=EA` | `TEST_ENV=EA npm test` |
| `mvn test -Dlegion.automation.enterprise.name=panda2bts` | `ENTERPRISE=panda2bts npm test` |
| `mvn test -Dlegion.filenumber=1` | `FILE_NUMBER=1 npm test` |

### From envCfg.json → .env

| envCfg.json | .env |
|---|---|
| `"ENVIRONMENT": "${legion.environment}"` | `TEST_ENV=STG` |
| `"legion.automation.enterprise.name": "${...}"` | `ENTERPRISE=panda2bts` |
| `"FILENUMBER": "${legion.filenumber}"` | `FILE_NUMBER=` |
| `"legion.environment.local": "${...}"` | `IS_LOCAL=false` |
| `"STGURL": "https://..."` | `BASE_URL=https://...` (or auto-resolved) |

---

## 6. Porting Checklist

For each feature file you migrate:

- [ ] Copy `.feature` file to `teams/{team}/features/ui/` or `teams/{team}/features/api/`
- [ ] Update tags (lowercase, remove Java-specific tags)
- [ ] Create step definitions in `teams/{team}/steps/`
- [ ] Port page objects to `teams/{team}/pages/`
- [ ] Ensure data file exists for the enterprise/environment combo
- [ ] Run the feature: `npm test -- --grep "Feature Name"`
- [ ] Verify TestRail tags report correctly

### Priority Order

1. **Login steps** — foundation for everything else
2. **Navigation steps** — menu clicks, page transitions
3. **Assertion steps** — verify page state
4. **Data manipulation steps** — create/edit/delete operations
5. **API steps** — backend operations

---

## 7. Common Gotchas

### 1. Selenium `Thread.sleep()` → Playwright auto-wait

**Wrong:**
```typescript
await page.click('#button');
await page.waitForTimeout(5000);  // DON'T — this is a fixed sleep
await page.click('#next');
```

**Right:**
```typescript
await page.click('#button');
await page.waitForLoadState('networkidle');  // Waits for network to settle
await page.click('#next');  // Auto-waits for element to be clickable
```

### 2. Selenium explicit waits → Playwright assertions

**Selenium:**
```java
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
wait.until(ExpectedConditions.visibilityOf(element));
```

**Playwright:**
```typescript
await expect(page.locator('#element')).toBeVisible({ timeout: 10000 });
```

### 3. Selenium `driver.get()` → Playwright `page.goto()`

**Selenium:**
```java
driver.get(url);
driver.manage().window().maximize();
```

**Playwright:**
```typescript
await page.goto(url);
// Window size is set in playwright.config.ts viewport setting
```

### 4. Java `@Inject` → Playwright fixture destructuring

**Java:**
```java
@Inject DataService dataService;
@Inject ConsoleLoginPage loginPage;
```

**Playwright step:**
```typescript
Given('step', async function ({ testContext, page, loginPage }) {
  // testContext, page, loginPage are injected by fixtures
  const user = testContext.dataService.getUILoginUserBy('Admin');
});
```
