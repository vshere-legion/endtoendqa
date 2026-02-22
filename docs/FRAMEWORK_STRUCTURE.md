# Framework Structure — Step by Step

> A guided walkthrough of every file and folder in the framework.
> Read this first if you're new to the project.

---

## Table of Contents

1. [Project Root](#1-project-root)
2. [Config Layer](#2-config-layer)
3. [Auth Layer](#3-auth-layer)
4. [Data Layer](#4-data-layer)
5. [Fixtures Layer](#5-fixtures-layer)
6. [Page Objects Layer](#6-page-objects-layer)
7. [Utilities Layer](#7-utilities-layer)
8. [Step Definitions Layer](#8-step-definitions-layer)
9. [Teams Layer](#9-teams-layer)
10. [Scripts Layer](#10-scripts-layer)
11. [CI/CD Layer](#11-cicd-layer)
12. [Test Data Layer](#12-test-data-layer)
13. [How Everything Connects](#13-how-everything-connects)
14. [Adding a New Feature — Step by Step](#14-adding-a-new-feature--step-by-step)

---

## 1. Project Root

```
playwright-cucumber-legion-framework-v2/
│
├── playwright.config.ts        ← 1. ENTRY POINT — Playwright reads this first
├── package.json                ← 2. Dependencies, npm scripts
├── tsconfig.json               ← 3. TypeScript config (path aliases, strict mode)
├── .env.example                ← 4. All environment variables documented
├── .eslintrc.json              ← 5. Lint rules
├── .prettierrc                 ← 6. Code formatting rules
├── .nvmrc                      ← 7. Node.js version (20)
├── .gitignore                  ← 8. Excludes: node_modules, reports, .auth, .locks
├── .dockerignore               ← 9. Excludes for Docker builds
├── Dockerfile                  ← 10. Container image definition
└── docker-compose.yml          ← 11. Service-based container execution
```

### playwright.config.ts — The Entry Point

This is the FIRST file Playwright reads. Everything starts here.

```
What it does (in order):
  1. Loads environment config (dotenv + env-manager.ts)
  2. Resolves test paths (which features + steps to run)
  3. Configures playwright-bdd (feature → test file generation)
  4. Sets globalSetup and globalTeardown
  5. Defines projects (chromium, firefox, webkit)
  6. Configures reporters (HTML, JSON, Cucumber)
  7. Sets timeouts, retries, workers, video, screenshots
```

### package.json — Key Scripts

```
npm test                    → bddgen + playwright test (standard run)
npm run test:sharded:smoke  → custom sharding with 15 workers
npm run test:chromium       → single browser
npm run docker:test         → run in Docker container
npm run docker:sharded      → 4 Docker containers in parallel
npm run lint                → ESLint check
npm run typecheck           → TypeScript compilation check
npm run test:feature-parallel  → explicit feature-level parallel mode
npm run test:split -- ...      → split a long feature by tag groups
npm run clean               → remove all generated files
npm run report:open         → open HTML report in browser
```

### tsconfig.json — Path Aliases

```json
{
  "paths": {
    "@core/*": ["src/*"],
    "@teams/*": ["teams/*"],
    "@config/*": ["config/*"],
    "@shared/*": ["shared/*"],
    "@test-data/*": ["test-data/*"]
  }
}
```

Use in code:
```typescript
import { BasePage } from '@core/pages/base/BasePage';
import { frameworkConfig } from '@config/framework.config';
```

---

## 2. Config Layer

```
config/
├── env.config.json              ← Default settings (port of envCfg.json)
├── env-manager.ts               ← Loads per-environment .env files
├── framework.config.ts          ← Teams, tags, timeouts, report paths
└── environments/
    ├── dev.env                   ← Development env overrides
    ├── staging.env               ← Staging env overrides
    ├── uat.env                   ← UAT env overrides
    └── prod.env                  ← Production env overrides

src/config/
├── environment.ts               ← Port of PropertyMap.java
└── index.ts                     ← Barrel export
```

### What Each File Does

**env.config.json** — Fallback defaults when env vars are not set:
```json
{
  "ENVIRONMENT": "STG",
  "legion.automation.enterprise.name": "",
  "legion.timeout.implicit.in.seconds": "60"
}
```

**env-manager.ts** — Reads `config/environments/{env}.env`, injects into `process.env`:
```
loadEnvConfig('staging')
  → reads config/environments/staging.env
  → parses: BASE_URL=https://staging-enterprise.dev.legion.work/
  → injects: process.env.BASE_URL = 'https://staging-enterprise...'
  → validates: required vars exist
```

**framework.config.ts** — Static framework configuration:
```typescript
export const frameworkConfig = {
  teams: ['TNP', 'SCH', 'PLT-Core', 'PLT-Int', 'PLT-Ops', 'LRB', 'EV-Com', 'EV-LIP', 'EV-ELM', 'GENAI', 'EPR'],
  tags: {
    priority: ['@P1-Critical', '@P2-High', '@P3-Medium', '@P4-Low'],
    suite: ['@Regression', '@Smoke', '@NewFeature'],
    // ...
  },
  timeouts: { action: 15000, navigation: 30000, test: 120000 },
};
```

**environment.ts** — Port of PropertyMap.java, the central config resolver:
```
Priority chain:
  process.env.BASE_URL          (highest — CLI / CI)
  config/environments/staging.env
  config/env.config.json
  hardcoded defaults             (lowest)
```

---

## 3. Auth Layer

```
src/auth/
├── auth-manager.ts              ← Session reuse via storageState
├── global-setup.ts              ← Runs ONCE before all workers
└── global-teardown.ts           ← Runs ONCE after all workers
```

### What Each File Does

**auth-manager.ts** — Login once, reuse cookies everywhere:
```
Functions:
  getStoragePath(userType)        → .auth/LegionCoffee_STG_Admin.json
  hasValidSession(userType)       → checks file exists + not expired (30 min)
  createAuthSession(userType)     → launches browser, logs in, saves cookies
  clearAllSessions()              → deletes .auth/ directory
```

**global-setup.ts** — Runs ONCE before any tests start:
```
1. Health check:    HTTP HEAD → baseUrl → fail-fast if unreachable
2. Pre-authenticate: For each role in AUTH_ROLES (e.g., "Admin,StoreManager1"):
                     → hasValidSession(role)? → skip
                     → else: createAuthSession(role) → saves cookies to .auth/
3. Print banner:    Environment, enterprise, roles authenticated
```

**global-teardown.ts** — Runs ONCE after all tests finish:
```
1. clearAllSessions()  → rm -rf .auth/
2. cleanAllLocks()     → rm -rf .locks/
```

### Generated Files (not in git)

```
.auth/                            ← Created by global-setup, deleted by global-teardown
├── LegionCoffee_STG_Admin.json   ← Cookies + localStorage for Admin
└── LegionCoffee_STG_StoreManager1.json
```

---

## 4. Data Layer

```
src/data/
├── models.ts                    ← TypeScript interfaces + ContextKey enum
├── data-service.ts              ← Port of DataService.java (user/location selection)
├── test-context.ts              ← Port of StepsBase.java (context Map + DataService)
├── file-lock.ts                 ← Cross-process file locking
└── index.ts                     ← Barrel export
```

### What Each File Does

**models.ts** — Type definitions:
```typescript
interface UserData { name, password, usedAs[], isUsed, userType, isLocal, locations[] }
interface LocationData { name, isLocal, isUsed, conf }
interface EmployeeData { name, lastName, role, id, engagementId, workerId }
enum ContextKey { USER_NAME, USER_PASSWORD, LOCATION_NAME, ... }  // 35+ keys
```

**data-service.ts** — THE core data access class:
```
Methods:
  getUILoginUserBy(userType)     → "Given I login as 'StoreManager1'."
  getUILoginUser(locationName?)  → "Given I login in location 'Automation1'."
  getAdminGeneralUser()          → API setup authentication
  getAPILoginUserBy(userType)    → "Given I have API token for 'Admin'"
  selectLocation(conf)           → "And I select location 'DolarGeneral'."
  selectEmployee(name)           → "And I select employee 'TestQA1'."
  releaseLocationAndUsers()      → cleanup (called in fixture teardown)
```

**test-context.ts** — Scenario-scoped shared state:
```
Methods:
  setContext(key, value)          → store data
  getContext<T>(key)              → retrieve data
  cleanup()                      → release users/locations + clear context
Properties:
  .dataService                   → lazy-loaded DataService instance
  .userName, .userPassword, etc. → convenience getters
```

**file-lock.ts** — Prevents two workers from selecting the same user:
```
Functions:
  acquireLock(lockName)           → creates .locks/{name}.lock
  withFileLock(lockName, fn)      → execute fn while holding lock
  cleanAllLocks()                 → rm -rf .locks/
```

---

## 5. Fixtures Layer

```
src/fixtures/
└── test-fixtures.ts             ← THE fixture definitions
```

### What It Provides

```typescript
// test-fixtures.ts exports:
export const test = base.extend<CustomFixtures>({
  context,         // Shared BrowserContext within feature (with storageState)
  page,            // Shared Page within feature (with failure recovery)
  testContext,     // Shared TestContext within feature (data carries over)
  logger,          // Enterprise Logger (fresh per scenario)
  apiHelper,       // Enterprise API client (fresh per scenario)
  loginPage,       // LoginPage page object (fresh per scenario, uses shared page)
  dashboardPage,   // DashboardPage page object (fresh per scenario, uses shared page)
});
```

### How Steps Use Fixtures

```typescript
import { test } from '@core/fixtures/test-fixtures';

// Fixtures are injected via destructuring:
test.Given('I login as {string}.', async ({ testContext, loginPage, logger }, userType) => {
  logger.step(`Login as ${userType}`);
  const user = testContext.dataService.getUILoginUserBy(userType);
  await loginPage.login(user.name, user.password);
  logger.stepDone(`Login as ${userType}`);
});
```

### Fixture Lifecycle

```
Feature start (first scenario triggers creation):
  1. context       → new BrowserContext with storageState (pre-auth cookies)
  2. page          → new Page (browser tab)
  3. testContext    → new TestContext() → populates ENTERPRISE_NAME

Per scenario (reuses shared context/page/testContext):
  4. context       → same _sharedContext (not recreated)
  5. page          → same _sharedPage (if previous failed → recovery first)
  6. testContext    → same _sharedTestContext (data carries over)
  7. logger        → new Logger('Scenario', { workerIndex, correlationId })
  8. apiHelper     → new ApiHelper(request, { logger })
  9. loginPage     → new LoginPage(page, testContext)
  10. dashboardPage → new DashboardPage(page, testContext)

  ↓ scenario runs ↓

  Per-scenario teardown:
  10-9. (page objects — no cleanup needed)
  8. (api helper — no cleanup needed)
  7. logger.close() → flushes file stream
  6-4. context/page/testContext NOT closed (shared, persist to next scenario)
       If FAILED: screenshot saved, _previousScenarioFailed = true

Feature end (worker moves to next feature):
  3. _sharedTestContext = null (DataService released)
  2. _sharedPage = null
  1. context.close() → closes browser session
  Next feature creates everything fresh.
```

---

## 6. Page Objects Layer

```
src/pages/
├── base/
│   └── BasePage.ts              ← Enterprise base (40+ methods, retry, logging)
├── auth/
│   └── LoginPage.ts             ← Login page object
└── dashboard/
    └── DashboardPage.ts         ← Dashboard page object

teams/{team}/pages/
└── {PageName}Page.ts            ← Team-specific page objects
```

### BasePage Hierarchy

```
BasePage (src/pages/base/BasePage.ts)
  │
  ├── LoginPage (src/pages/auth/LoginPage.ts)
  ├── DashboardPage (src/pages/dashboard/DashboardPage.ts)
  ├── SchedulePage (teams/SCH/pages/SchedulePage.ts)
  ├── TimesheetPage (teams/TNP/pages/TimesheetPage.ts)
  └── ... (team-specific pages)
```

### How Page Objects Are Structured

```typescript
// Every page object follows this pattern:
export class SchedulePage extends BasePage {
  // 1. Locators (private, readonly)
  private readonly publishBtn = this.byTestId('publish-btn');
  private readonly weekLabel = this.byRole('heading', { name: /week of/i });
  private readonly scheduleGrid = this.locator('.schedule-grid');

  // 2. Constructor
  constructor(page: Page, private testContext: TestContext) {
    super(page, 'SchedulePage');  // ← name used in logs
  }

  // 3. Actions (public methods that steps call)
  async publishCurrentWeek(): Promise<void> {
    await this.clickElement('[data-testid="publish-btn"]');
    await this.waitForNetworkIdle();
  }

  async getWeekLabel(): Promise<string> {
    return this.getText('[data-testid="week-label"]');
  }

  // 4. Complex workflows
  async createShift(employee: string, startTime: string, endTime: string): Promise<void> {
    await this.clickByText('Add Shift');
    await this.fillField('#employee-search', employee);
    await this.clickByText(employee);
    await this.fillField('#start-time', startTime);
    await this.fillField('#end-time', endTime);
    await this.clickByRole('button', 'Save');
    await this.waitForNetworkIdle();
  }
}
```

---

## 7. Utilities Layer

```
src/utils/
├── Logger.ts                    ← Enterprise structured logger
├── api-helper.ts                ← Enterprise API client
├── wait-helper.ts               ← Wait utilities
├── string-helper.ts             ← String generation, formatting
└── file-helper.ts               ← JSON file read/write
```

### What Each File Does

**Logger.ts** — Every action logged with timing, masking, correlation:
```
Features:
  - 5 log levels: DEBUG, INFO, WARN, ERROR, FATAL
  - Correlation IDs (trace one scenario across all logs)
  - Worker-aware (includes workerIndex in every entry)
  - JSON file output (reports/logs/*.jsonl) for ELK/Datadog
  - Sensitive data masking (passwords, tokens, SSNs auto-masked)
  - Step timing (logger.step() / logger.stepDone())
  - Child loggers (logger.child('LoginPage') inherits correlation)
```

**api-helper.ts** — HTTP client wrapping Playwright's APIRequestContext:
```
Features:
  - Typed responses: ApiResult<T> with body, status, duration
  - Auto-retry on 408/429/5xx with exponential backoff + jitter
  - Auto token refresh on 401
  - Request/response interceptors
  - Response validation: ApiHelper.assertOk(), ApiHelper.assertStatus()
```

**wait-helper.ts:**
```
  waitForPageLoad(page)          → wait for DOMContentLoaded
  waitForNetworkIdle(page)       → wait for all requests to settle
  waitForUrlChange(page, url)    → wait for URL to match pattern
  retryAction(action, retries)   → retry with delay
```

**string-helper.ts:**
```
  generateRandomString(length)   → 'aB3xK9m...'
  generateRandomEmail(domain)    → 'test-ab3xk9@legion.co'
  generateRandomPhone()          → '(555) 123-4567'
  formatDate(date, format)       → '2026-02-17'
  maskSensitiveData(text)        → 'password=***MASKED***'
```

**file-helper.ts:**
```
  readJsonFile<T>(path)          → typed JSON parsing
  writeJsonFile(path, data)      → pretty-printed write
  ensureDirectoryExists(path)    → mkdir -p
  cleanDirectory(path)           → rm contents, keep directory
```

---

## 8. Step Definitions Layer

```
src/steps/                       ← Shared steps (used by all teams)
├── login.steps.ts               ← "Given I login as '...'"
├── location.steps.ts            ← "And I select location '...'"
└── navigation.steps.ts          ← "When I navigate to ..."

teams/{team}/steps/              ← Team-specific steps
└── {feature}.steps.ts           ← "When I publish the schedule"
```

### How Steps Are Written

```typescript
// src/steps/login.steps.ts

import { createBdd } from 'playwright-bdd';
import { test } from '@core/fixtures/test-fixtures';

const { Given, When, Then } = createBdd(test);

Given('I login as {string}.', async ({ testContext, loginPage, logger }, userType: string) => {
  logger.step(`I login as '${userType}'`);

  // 1. Get user from data layer
  const user = testContext.dataService.getUILoginUserBy(userType);

  // 2. Store in context for later steps
  testContext.setContext(ContextKey.USER_NAME, user.name);
  testContext.setContext(ContextKey.USER_PASSWORD, user.password);

  // 3. Perform login via page object
  await loginPage.login(user.name, user.password);

  logger.stepDone(`I login as '${userType}'`);
});
```

---

## 9. Teams Layer

```
teams/
├── TNP/                         ← Time & Attendance / Timesheet
│   ├── features/
│   │   ├── ui/                  ← UI test features
│   │   │   ├── timesheet.feature
│   │   │   └── punch.feature
│   │   └── api/                 ← API test features
│   │       └── timesheet-api.feature
│   ├── steps/                   ← Step definitions
│   │   ├── timesheet.steps.ts
│   │   └── punch.steps.ts
│   ├── pages/                   ← Page objects
│   │   ├── TimesheetPage.ts
│   │   └── PunchPage.ts
│   ├── test-data/               ← Team-specific test data
│   └── README.md                ← Team onboarding doc
│
├── SCH/                         ← Scheduling
│   ├── features/ui/             ← scheduling.feature, forecasting.feature
│   ├── steps/                   ← scheduling.steps.ts
│   ├── pages/                   ← SchedulePage.ts, ForecastPage.ts
│   └── ...
│
├── PLT-Core/                    ← Platform Core
├── PLT-Int/                     ← Platform Integrations
├── PLT-Ops/                     ← Platform Ops
├── LRB/                         ← Labor Rules Builder
├── EV-Com/                      ← Employee Voice - Communications
├── EV-LIP/                      ← Employee Voice - LIP
├── EV-ELM/                      ← Employee Voice - ELM
├── GENAI/                       ← GenAI
└── EPR/                         ← EPR
```

### How Teams Are Isolated

```
Each team has its OWN:
  - features/     → Gherkin feature files
  - steps/        → Step definitions
  - pages/        → Page objects
  - test-data/    → Team-specific test data

Teams SHARE:
  - src/steps/    → Common steps (login, location, navigation)
  - src/pages/    → Common page objects (LoginPage, DashboardPage)
  - src/fixtures/ → Fixture definitions
  - src/utils/    → Logger, ApiHelper, BasePage
  - src/data/     → DataService, TestContext
  - test-data/users/ → Shared user credential files
```

### Running One Team's Tests

```bash
# Via env var
TEAM=sch npm test

# Via sharding script
node scripts/run-sharded.js --team sch --workers 10

# Via Playwright directly
npx playwright test --project=chromium teams/SCH/
```

---

## 10. Scripts Layer

```
scripts/
├── run-sharded.js               ← Feature-level sharding with greedy load balancing + hybrid mode
├── run-split-scenarios.js       ← Tag-based scenario splitting for long features
├── merge-reports.js             ← Blob report merger + failure extraction
└── rerun-failed.js              ← Failure retry from rerun.txt
```

### What Each Script Does

**run-sharded.js:**
```
1. Discover features: glob teams/*/features/**/*.feature
2. Filter by tags: --tags "@smoke and not @flaky"
3. Count scenarios per feature
4. Distribute across workers (greedy algorithm)
5. Spawn N parallel Playwright processes
6. Wait for all to complete
7. Print summary

Hybrid mode (--split-feature / --split-tags):
  → Removes split features from normal pool
  → Creates "virtual shards" for each tag group
  → Distributes all work items with greedy algorithm
  → Normal features run as feature files
  → Split groups run with TEST_TAGS + FEATURE_PATHS
```

**run-split-scenarios.js:**
```
1. Parse --feature path and --tags (comma-separated groups)
2. Validate feature file exists
3. For each tag group, spawn a separate child process:
   → TEST_TAGS=<group> FEATURE_PATHS=<path> SHARD_ID=split-<name>-group<N>
4. Each process runs: npx playwright test --reporter=blob --workers=1
5. Wait for all processes to complete
6. Merge blob reports into unified HTML report
7. Print summary (pass/fail per group, time saved)
```

**merge-reports.js:**
```
1. Collect blob-reports from all workers
2. Merge into single HTML + JSON + JUnit report
3. (Optional) Extract failed test locations → rerun.txt
```

**rerun-failed.js:**
```
1. Read rerun.txt
2. Run npx playwright test with only those tests
3. Report results
```

---

## 11. CI/CD Layer

```
.github/workflows/
└── playwright-tests.yml         ← GitHub Actions pipeline

ci/
├── Jenkinsfile                  ← Jenkins parameterized pipeline
└── scripts/
    ├── run-tests.sh             ← Local CLI test runner
    └── slack-notify.js          ← Slack webhook notifier

Dockerfile                       ← Multi-stage container build
docker-compose.yml               ← Service-based container execution
```

### What Each File Does

**playwright-tests.yml** — GitHub Actions:
```
Jobs:
  1. quality-gate    → lint + typecheck
  2. prepare         → generate shard matrix [1, 2, 3, 4]
  3. test (×4 shards)→ each shard runs on separate machine
  4. merge-reports   → combines all blob reports
  5. rerun-failures  → reruns failed tests (if any)
  6. notify          → sends Slack notification
```

**Jenkinsfile** — Jenkins:
```
Parameters: TEAM, ENVIRONMENT, BROWSER, TAGS, WORKERS
Stages: Checkout → Install → BDD Gen → Test → Merge → Rerun
```

**slack-notify.js** — Sends results to Slack:
```
Reads: TEST_RESULT, GITHUB_RUN_URL, TEST_ENV, ENTERPRISE
Sends: Rich Slack block with status, env, team, trigger, link
```

**Dockerfile** — Multi-stage build:
```
Stage 1 (deps):   FROM playwright-image → npm ci
Stage 2 (runner): COPY source + node_modules → bddgen
Entrypoint:       npx playwright test
```

**docker-compose.yml** — Multiple services:
```
test-chromium:   Run tests in chromium
test-firefox:    Run tests in firefox
test-webkit:     Run tests in webkit
test-smoke:      Run @P1-Critical only
test-team:       Run specific team (TEST_TEAM env)
test-shard-{1-4}: 4 parallel containers (profile: sharded)
merge-reports:   Wait for shards → merge
```

---

## 12. Test Data Layer

```
test-data/
└── users/
    ├── user_loc_LegionCoffee_STG.json    ← Staging data
    ├── user_loc_LegionCoffee_EA.json     ← EA data
    ├── user_loc_panda2bts_EA.json        ← Different enterprise
    └── ...
```

### File Structure

Each JSON file contains:
```
{
  "enterpriseId": "uuid",
  "token": "api-token",
  "users": [...],          ← Login credentials per role
  "locations": [...],      ← Store/site locations
  "employees": [...]       ← Team member data
}
```

See [DATA_LAYER.md](./DATA_LAYER.md) for complete field reference.

---

## 13. How Everything Connects

### Dependency Graph

```
playwright.config.ts
  ├── imports: config/env-manager.ts
  ├── imports: config/framework.config.ts
  ├── references: src/auth/global-setup.ts
  ├── references: src/auth/global-teardown.ts
  └── configures: playwright-bdd → .features-gen/

src/auth/global-setup.ts
  ├── imports: src/auth/auth-manager.ts
  ├── imports: src/config/environment.ts
  └── uses: test-data/users/*.json (via DataService)

src/auth/auth-manager.ts
  ├── imports: src/config/environment.ts
  ├── imports: src/data/data-service.ts
  └── writes: .auth/*.json (storageState files)

src/fixtures/test-fixtures.ts
  ├── imports: src/auth/auth-manager.ts
  ├── imports: src/data/test-context.ts
  ├── imports: src/utils/Logger.ts
  ├── imports: src/utils/api-helper.ts
  ├── imports: src/pages/auth/LoginPage.ts
  └── imports: src/pages/dashboard/DashboardPage.ts

src/data/test-context.ts
  ├── imports: src/data/data-service.ts
  ├── imports: src/data/models.ts
  └── imports: src/config/environment.ts

src/data/data-service.ts
  ├── imports: src/data/models.ts
  ├── imports: src/config/environment.ts
  └── reads: test-data/users/*.json

src/pages/base/BasePage.ts
  └── imports: src/utils/Logger.ts

teams/*/steps/*.steps.ts
  ├── imports: src/fixtures/test-fixtures.ts
  └── imports: teams/*/pages/*.ts

teams/*/pages/*.ts
  └── extends: src/pages/base/BasePage.ts
```

### Call Chain for a Typical Test

```
1. npm test
2. playwright.config.ts → loads config → calls bddgen
3. bddgen → reads .feature files → generates .features-gen/*.spec.ts
4. Playwright runner → reads .spec.ts → finds test functions
5. global-setup.ts → health check → pre-authenticate roles
6. Playwright spawns N workers
7. Each worker runs scenarios:
   a. Fixture setup (testContext, logger, apiHelper, pages)
   b. Step definitions execute (Given/When/Then)
   c. Steps call page objects (BasePage methods with retry + logging)
   d. Page objects interact with browser (Playwright locators)
   e. Fixture teardown (cleanup users/locations, flush logs)
8. Workers complete → blob reports generated
9. global-teardown.ts → clean .auth/ + .locks/
10. Reports available in reports/
```

---

## 14. Adding a New Feature — Step by Step

### Example: Adding a "Create Shift" test for the SCH team

**Step 1: Create the feature file**

```gherkin
# teams/SCH/features/ui/create-shift.feature

@Team-SCH @Regression @P2-High
Feature: Shift Creation

  Background:
    Given I login as 'StoreManager1'.
    And I select location 'Automation1'.

  @smoke
  Scenario: Create a shift for an employee
    When I navigate to schedule page
    And I create a shift for 'TestQA1' from '09:00' to '17:00'
    Then the shift should be visible on the schedule

  Scenario: Create a shift with invalid times
    When I navigate to schedule page
    And I create a shift for 'TestQA1' from '17:00' to '09:00'
    Then I should see an error message 'End time must be after start time'
```

**Step 2: Create the page object (if new page)**

```typescript
// teams/SCH/pages/SchedulePage.ts

import { Page } from '@playwright/test';
import { BasePage } from '@core/pages/base/BasePage';
import { TestContext } from '@core/data/test-context';

export class SchedulePage extends BasePage {
  constructor(page: Page, private testContext: TestContext) {
    super(page, 'SchedulePage');
  }

  async createShift(employee: string, startTime: string, endTime: string): Promise<void> {
    await this.clickByText('Add Shift');
    await this.fillField('#employee-search', employee);
    await this.clickByText(employee);
    await this.fillField('#start-time', startTime);
    await this.fillField('#end-time', endTime);
    await this.clickByRole('button', 'Save');
    await this.waitForNetworkIdle();
  }

  async isShiftVisible(employee: string): Promise<boolean> {
    return this.isVisible(`[data-testid="shift-${employee}"]`);
  }

  async getErrorMessage(): Promise<string> {
    return this.getText('.error-toast');
  }
}
```

**Step 3: Create step definitions**

```typescript
// teams/SCH/steps/create-shift.steps.ts

import { createBdd } from 'playwright-bdd';
import { test, expect } from '@core/fixtures/test-fixtures';
import { SchedulePage } from '../pages/SchedulePage';

const { Given, When, Then } = createBdd(test);

When('I navigate to schedule page', async ({ page, testContext }) => {
  const schedulePage = new SchedulePage(page, testContext);
  await schedulePage.navigateTo('/schedule');
});

When(
  'I create a shift for {string} from {string} to {string}',
  async ({ page, testContext }, employee, start, end) => {
    const schedulePage = new SchedulePage(page, testContext);
    await schedulePage.createShift(employee, start, end);
  },
);

Then('the shift should be visible on the schedule', async ({ page, testContext }) => {
  const schedulePage = new SchedulePage(page, testContext);
  const employee = testContext.getContext<string>('EMPLOYEE_NAME') || 'TestQA1';
  expect(await schedulePage.isShiftVisible(employee)).toBe(true);
});

Then('I should see an error message {string}', async ({ page }, message) => {
  const schedulePage = new SchedulePage(page, {} as any);
  const errorText = await schedulePage.getErrorMessage();
  expect(errorText).toContain(message);
});
```

**Step 4: Run the test**

```bash
# Run just this feature
npx playwright test teams/SCH/features/ui/create-shift.feature

# Run with headed mode for debugging
HEADED=true npx playwright test teams/SCH/features/ui/create-shift.feature

# Run all SCH team tests
node scripts/run-sharded.js --team sch --workers 5
```

**Step 5: Check the report**

```bash
npm run report:open
# → Opens HTML report showing your scenarios with pass/fail status
```

---

## Quick Reference

| I want to... | Look at... |
|---|---|
| Understand how config loads | `config/env-manager.ts` → `src/config/environment.ts` |
| See how login works | `src/steps/login.steps.ts` → `src/data/data-service.ts` |
| Add a new page object | Extend `src/pages/base/BasePage.ts` |
| Add a new step definition | Create in `teams/{team}/steps/` using `createBdd(test)` |
| Add a new team | Create `teams/{name}/` with features/, steps/, pages/ |
| Add a new data file | Create `test-data/users/user_loc_{enterprise}_{env}.json` |
| Debug a failing test | `HEADED=true npx playwright test --debug` |
| Run one team | `TEAM=sch npm test` |
| Run in Docker | `docker compose up test-chromium` |
| See the CI pipeline | `.github/workflows/playwright-tests.yml` |
| Configure Slack alerts | Set `SLACK_WEBHOOK_URL` in GitHub secrets |
