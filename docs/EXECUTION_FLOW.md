# Complete Execution Flow — Playwright BDD Automation Framework

This document traces the exact end-to-end execution flow when running tests, from command invocation through report generation.

---

## The Command

```bash
TEST_ENV=rc npm test
# which expands to:
TEST_ENV=rc npm run bddgen && npx playwright test
```

---

## Phase 1: BDD Code Generation (`npx bddgen`)

### Step 1 — `playwright.config.ts` is loaded (config parsing only)

| What | File |
|------|------|
| Entry point | `playwright.config.ts` |
| Env loader | `config/env-manager.ts` |
| Env file | `config/environments/rc.env` |

1. `loadEnvConfig('rc')` reads `config/environments/rc.env` via `dotenv` and sets `BASE_URL`, `API_BASE_URL`, `TIMEOUT`, `ENTERPRISE` into `process.env`
2. Team filter resolved: `TEAM = process.env.TEST_TEAM || 'all'`
3. Type filter resolved: `TYPE = process.env.TYPE || 'all'`
4. `getTestPaths()` builds glob patterns:
   - **Features:** `teams/*/features/**/*.feature` (all teams, all types)
   - **Steps:** `teams/*/steps/**/*.ts` + `shared/steps/**/*.ts` + `src/steps/**/*.ts` + `src/fixtures/test-fixtures.ts`

### Step 2 — `defineBddConfig()` generates spec files

| What | File |
|------|------|
| BDD config | `defineBddConfig()` from `playwright-bdd` |
| Output dir | `.features-gen/` |

1. `playwright-bdd` scans all `.feature` files matching the glob pattern
2. Parses Gherkin syntax (Feature, Scenario, Given/When/Then, tags, data tables)
3. Matches each step text to step definitions found in the `steps` glob paths
4. **Generates `.spec.js` files** in `.features-gen/` — one per feature file

Example: `teams/sch/features/ui/p2p-schedule-generation.feature` generates `.features-gen/teams/sch/features/ui/p2p-schedule-generation.feature.spec.js`

The generated spec contains:
```js
import { test } from "../../../../../src/fixtures/test-fixtures.ts";

test.describe('P2P LG Schedule Generation', () => {
  test.describe.configure({"mode":"serial"});  // from @mode:serial tag

  test.beforeEach('Background', async ({ Given, page, testContext }) => {
    await Given('I am logged in as "InternalAdmin"', null, { page, testContext });
  });

  test('Generate P2P LG schedule', { tag: ['@sch', '@p2p', ...] }, async ({ Given, When, Then, ... }) => {
    await Given('I navigate to the schedule page', ...);
    // ... more steps
  });
});
```

---

## Phase 2: Playwright Test Runner (`npx playwright test`)

### Step 3 — `playwright.config.ts` is loaded again (full config)

Same config parsing as Step 1, but now Playwright reads the full `defineConfig({...})` export:

| Setting | Value | Source |
|---------|-------|--------|
| `testDir` | `.features-gen/` | Output of `defineBddConfig()` |
| `globalSetup` | `src/auth/global-setup.ts` | Config |
| `globalTeardown` | `src/auth/global-teardown.ts` | Config |
| `workers` | 2 (local) / 4 (CI) | `process.env.WORKERS` |
| `retries` | 1 (local) / 2 (CI) | `process.env.RETRY_COUNT` |
| `timeout` | 60s | `process.env.TIMEOUT` |
| `fullyParallel` | `false` (feature mode) | `PARALLEL_MODE` |
| `headless` | `true` (unless `HEADED=true`) | `process.env.HEADED` |
| `viewport` | 1920x1080 | Hardcoded |
| `baseURL` | `https://rc-enterprise.dev.legion.work/` | `process.env.BASE_URL` |
| `reporter` | list, html, json, junit, cucumber | `src/config/reporters-config.ts` |
| `projects` | chromium, firefox, webkit | `devices` |

### Step 4 — Global Setup runs (once, before all workers)

**File:** `src/auth/global-setup.ts`

```
+==========================================+
|          GLOBAL SETUP                    |
|  Environment: rc                        |
|  Enterprise:  cinemark-wkdy             |
+==========================================+
```

1. Reads `EnvironmentConfig` from `src/config/environment.ts` (merges `config/env.config.json` + `.env` file + env vars)
2. Prints environment banner
3. Validates `TEST_ENV` and `ENTERPRISE` are set (warns if not)
4. **Health check** — HTTP HEAD to `BASE_URL`, aborts with `process.exit(1)` if unreachable
5. **No pre-authentication** — no storageState files, no browser launched

### Step 5 — Playwright spawns worker processes

| Concept | Detail |
|---------|--------|
| Workers | 2 local / 4 CI (each is a separate OS process) |
| Distribution | Feature-level: each `.spec.js` file assigned to 1 worker |
| Isolation | Each worker has its own memory, DataService, BrowserContext |

Playwright reads all `.spec.js` files from `.features-gen/`, distributes them across workers. With `fullyParallel: false`, all scenarios within one feature file run **sequentially on the same worker**.

### Step 6 — Per-worker: Browser launches

For each worker process, Playwright:
1. Launches a Chromium browser instance (headless or headed)
2. The worker picks up its assigned `.spec.js` file(s)

---

## Phase 3: Feature Execution (per feature file, per worker)

### Step 7 — Fixtures initialize

When the first scenario in a feature starts, Playwright resolves fixtures defined in `src/fixtures/test-fixtures.ts`:

| Fixture | What it provides | Mode behavior |
|---------|-----------------|---------------|
| `context` | BrowserContext | **Serial:** shared across scenarios. **Default:** fresh per scenario |
| `page` | Page instance | **Serial:** shared with failure recovery. **Default:** fresh per scenario |
| `testContext` | TestContext (data store) | **Serial:** shared. **Default:** fresh |
| `pageManager` | PageManager (POM cache) | Wraps page, lazily creates page objects |
| `logger` | Logger with correlation ID | Fresh per scenario |
| `apiHelper` | REST API client | Fresh per scenario |
| `loginPage` | LoginPage instance | Wraps page |
| `dashboardPage` | DashboardPage instance | Wraps page |

**Serial mode detection:** The fixture checks if `$tags` contains `@mode:serial`. If yes, module-level variables (`_sharedContext`, `_sharedPage`, `_sharedTestContext`) are reused across scenarios.

### Step 8 — Team hooks fire (`Before`)

**File:** `teams/sch/steps/hooks.ts`

```typescript
Before(async function () {
  console.log('Starting SCH test');
});
```

Also, the generated spec's `test.beforeEach` runs the **Background** block.

### Step 9 — Background login step executes

**File:** `shared/steps/auth.steps.ts`

The Background block runs before **every scenario**:

```gherkin
Background:
  Given I am logged in as "InternalAdmin"
```

This triggers the idempotent login step at `auth.steps.ts:168`:

1. **Check if already authenticated:** If URL is not `about:blank` and not `/login` — **skip** (already logged in from previous scenario in serial mode)
2. **Credential resolution** (3-tier cascade):
   - **Tier 1:** DataService with group — `@group-P2PLGTest` tag extracted — `dataService.getUILoginUserByTypeAndGroup("InternalAdmin", "P2PLGTest")` — looks up `test-data/users/user_loc_cinemark-wkdy_rc.json` for user where `userType="InternalAdmin"` AND `group="P2PLGTest"`
   - **Tier 2:** DataService without group — `dataService.getUILoginUserBy(role)` (if no `@group` tag)
   - **Tier 3:** Simple role map — `{ admin: 'admin@test.com' }` (if no ENTERPRISE set)
3. **DataService initialization** (lazy, first access per feature):

   **File:** `src/data/data-service.ts`

   - Loads `test-data/users/user_loc_cinemark-wkdy_rc.json`
   - Parses users (with `usedAs`, `userType`, `group`, `locations`), locations, employees
   - Worker-index-based slot allocation for parallel safety: `available[workerIndex % available.length]`

4. **UI Login** (`performLogin()` at `auth.steps.ts:59`):
   - Navigate to `BASE_URL?enterprise=cinemark-wkdy`
   - Fill username field (`input[name="username"]`)
   - Fill password field (`input[type="password"]`)
   - Click Sign In button
   - Handle Terms of Service popup if shown
   - Wait for `domcontentloaded`
5. **Store context:** `testContext.setContext('locationName', 'P2P_Test')` — from user's `locations[0]`

### Step 10 — Scenario steps execute (Given/When/Then)

Each step in the scenario maps to a step definition function. The flow:

```
Feature file step text
    | (matched by playwright-bdd at bddgen time)
    v
Step definition function in teams/sch/steps/*.ts or shared/steps/*.ts
    | (receives fixtures: page, pageManager, testContext)
    v
PageManager creates/caches Page Object
    |
    v
Page Object methods interact with the browser
```

**Page Object Model flow:**

| Layer | Example | File |
|-------|---------|------|
| Step definition | `Given('I navigate to the schedule page', ...)` | `teams/sch/steps/p2p-schedule.steps.ts` |
| PageManager | `pageManager.get(P2PSchedulePage)` | `src/pages/page-manager.ts` |
| Page Object | `schedulePage.navigateToSchedule()` | `teams/sch/pages/P2PSchedulePage.ts` |
| Base Page | `this.click(locator)`, `this.isVisible(locator)` | `teams/sch/pages/ScheduleBasePage.ts` |
| Playwright API | `page.locator('.selector').click()` | Built-in |

**PageManager caching:** `pageManager.get(P2PSchedulePage)` creates the page object on first call, returns cached instance on subsequent calls. All scenarios in a serial feature share the same cached instances.

**TestContext data sharing:** Steps store/retrieve data via `testContext.setContext()` / `testContext.getContext()` using `ContextKey` enum values (41 keys: `LOCATION_NAME`, `SCHEDULE_ID`, `SHIFT_ID`, etc.). Defined in `src/data/models.ts`.

### Step 11 — API calls during execution

API calls can happen in two ways:

**A) API Login (optional, via `@ApiLogin` tag or explicit step):**

**File:** `shared/api/auth-api-client.ts`

```gherkin
Given I am logged in as "InternalAdmin" via api
```
- POST `/authentication/v2/user/login` — gets `sessionId`
- GET `/apiInternal/createToken` — gets `accessToken`
- Stores both in TestContext

**B) API helper in steps** (for data setup/validation):

**File:** `src/utils/api-helper.ts`

```typescript
const response = await apiHelper.get('/some/endpoint');
```

**C) Team-specific API clients:**

**File:** `teams/sch/api/schedule-api-client.ts`

Used for schedule operations via REST API (native `fetch`).

### Step 12 — Scenario completes, assertions checked

Assertions use Playwright's `expect()`:
```typescript
expect(isVisible).toBeTruthy();
await expect(locator).toBeVisible({ timeout: 10000 });
```

### Step 13 — After hooks fire

**Files:** `teams/sch/steps/hooks.ts` + `shared/steps/auth.steps.ts`

```typescript
// Team hook
After(async function () {
  console.log('SCH test completed');
});

// Auth hook (shared)
After(async ({ testContext }) => {
  // Release DataService users/locations for reuse
  testContext.dataService.releaseLocationAndUsers();
  // Logout API session if active
  if (testContext.getContext(ContextKey.API_SESSION_ACTIVE)) {
    await authApi.logout(sessionId);
  }
});
```

### Step 14 — Failure handling (serial mode)

If a scenario **fails** in `@mode:serial`:

1. **Screenshot captured** — `reports/screenshots/failure-{name}-{timestamp}.png` — attached to HTML report
2. **`_previousScenarioFailed = true`** flag set
3. **Next scenario's `page` fixture** triggers recovery (`test-fixtures.ts:157-163`):
   - Dismiss blocking JS dialogs
   - Navigate to base URL
   - If page is dead — open fresh page in same context (session cookies preserved)
4. With `test.describe.configure({"mode":"serial"})`, Playwright **skips remaining scenarios** after failure

### Step 15 — Next scenario starts (back to Step 8)

In serial mode: reuses same `context`, `page`, `testContext`. Background login step detects existing session — **skips login**.

In default mode: fresh `context`, `page`, `testContext` created. Background login step performs full login.

---

## Phase 4: Completion

### Step 16 — All scenarios in feature complete

- BrowserContext closed (serial: after last scenario; default: after each scenario)
- Worker process picks up next feature file (if any)

### Step 17 — All workers finish

### Step 18 — Global Teardown runs (once)

**File:** `src/auth/global-teardown.ts`

1. Clean up file locks (`cleanAllLocks()` from `src/data/file-lock.ts`)
2. Print `[GlobalTeardown] Done.`

### Step 19 — Reports generated

| Reporter | Output | Config |
|----------|--------|--------|
| list | Console output (live) | Built-in |
| html | `reports/html/index.html` | Playwright |
| json | `reports/json/results.json` | Playwright |
| junit | `reports/junit/results.xml` | Playwright |
| cucumber html | `reports/cucumber/cucumber-report.html` | playwright-bdd |
| cucumber json | `reports/cucumber/cucumber-report.json` | playwright-bdd |

Configured in `src/config/reporters-config.ts`.

---

## Visual Summary

```
npm test
  |
  +-- Phase 1: BDD Generation (npx bddgen)
  |   +-- playwright.config.ts loads
  |   +-- config/environments/rc.env loaded (dotenv)
  |   +-- config/env.config.json merged
  |   +-- Feature globs resolved (teams/*/features/**/*.feature)
  |   +-- Step definition globs resolved (teams/*/steps + shared/steps + src/steps)
  |   +-- .features-gen/*.spec.js generated (one per .feature)
  |
  +-- Phase 2: Playwright Runner (npx playwright test)
  |   +-- playwright.config.ts loaded (full config)
  |   +-- Global Setup (src/auth/global-setup.ts)
  |   |   +-- Environment banner printed
  |   |   +-- Health check: HTTP HEAD to BASE_URL
  |   |
  |   +-- Worker 1 --------------------------------+
  |   |   +-- Browser launches (Chromium)          |
  |   |   +-- Feature: p2p-schedule-generation     |  Worker 2
  |   |   |   +-- Fixtures init (context, page)    |  +-- Another feature...
  |   |   |   +-- Before hooks                     |  |
  |   |   |   +-- Background: Login                |  |
  |   |   |   |   +-- DataService loads JSON creds |  |
  |   |   |   |   +-- Group lookup (@group-*)      |  |
  |   |   |   |   +-- UI login (fill form + click) |  |
  |   |   |   +-- Scenario 1: steps execute        |  |
  |   |   |   |   +-- pageManager.get(PageObject)  |  |
  |   |   |   |   +-- POM methods -> locators      |  |
  |   |   |   |   +-- Assertions (expect)          |  |
  |   |   |   +-- After hooks (release creds)      |  |
  |   |   |   +-- Scenario 2: reuses page (serial) |  |
  |   |   |   |   +-- Background: login SKIP       |  |
  |   |   |   |   +-- Steps execute...             |  |
  |   |   |   +-- ... more scenarios               |  |
  |   |   +-- BrowserContext closed                 |  |
  |   |                                             |  |
  |   +-- Global Teardown                           |  |
  |   |   +-- Clean file locks                     |  |
  |   |                                             |  |
  |   +-- Reports generated                         |  |
  |       +-- reports/html/index.html               |  |
  |       +-- reports/json/results.json             |  |
  |       +-- reports/junit/results.xml             |  |
  |       +-- reports/cucumber/cucumber-report.html |  |
  |                                                 |  |
  +-- Exit code 0 (pass) or 1 (failures)          +--+
```

---

## Key Files Reference

| Component | File Path |
|-----------|-----------|
| **Config** | |
| Playwright config | `playwright.config.ts` |
| Environment loader | `config/env-manager.ts` |
| Environment files | `config/environments/{dev,staging,rc,uat,prod}.env` |
| Environment config | `src/config/environment.ts` |
| Config JSON | `config/env.config.json` |
| Framework constants | `config/framework.config.ts` |
| Reporter config | `src/config/reporters-config.ts` |
| **Setup/Teardown** | |
| Global setup | `src/auth/global-setup.ts` |
| Global teardown | `src/auth/global-teardown.ts` |
| **Fixtures** | |
| Test fixtures | `src/fixtures/test-fixtures.ts` |
| **Data Layer** | |
| Data service | `src/data/data-service.ts` |
| Test context | `src/data/test-context.ts` |
| Models (ContextKey) | `src/data/models.ts` |
| File lock | `src/data/file-lock.ts` |
| Test data files | `test-data/users/user_loc_{enterprise}_{env}.json` |
| **Auth** | |
| Auth steps (UI + API login) | `shared/steps/auth.steps.ts` |
| Auth API client | `shared/api/auth-api-client.ts` |
| **Page Objects** | |
| Page manager | `src/pages/page-manager.ts` |
| Base page (core) | `src/pages/base/BasePage.ts` |
| Login page (core) | `src/pages/auth/LoginPage.ts` |
| Schedule base page (SCH) | `teams/sch/pages/ScheduleBasePage.ts` |
| Schedule page (SCH) | `teams/sch/pages/SchedulePage.ts` |
| P2P schedule page (SCH) | `teams/sch/pages/P2PSchedulePage.ts` |
| **Step Definitions** | |
| Shared auth steps | `shared/steps/auth.steps.ts` |
| Team steps (SCH example) | `teams/sch/steps/p2p-schedule.steps.ts` |
| Team hooks (SCH example) | `teams/sch/steps/hooks.ts` |
| **Utilities** | |
| Logger | `src/utils/Logger.ts` |
| API helper | `src/utils/api-helper.ts` |
| Wait helper | `src/utils/wait-helper.ts` |
| **Scripts** | |
| Sharded runner | `scripts/run-sharded.js` |
| Scenario splitter | `scripts/run-split-scenarios.js` |
| Report merger | `scripts/merge-reports.js` |
| Rerun failed | `scripts/rerun-failed.js` |
| **Generated (do not edit)** | |
| Generated specs | `.features-gen/**/*.spec.js` |
| Reports | `reports/` |
| Screenshots | `reports/screenshots/` |
