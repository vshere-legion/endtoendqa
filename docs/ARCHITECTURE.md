# Framework Architecture, Parallelism & Implementation Guide

> The complete technical reference for the Playwright + Cucumber BDD Enterprise Framework.
> Covers architecture, every component, parallelism, step-by-step flows, and how data moves through the system.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Design Principles](#2-design-principles)
3. [Execution Lifecycle — End to End](#3-execution-lifecycle--end-to-end)
4. [Component Deep Dive](#4-component-deep-dive)
5. [Parallel Execution Architecture](#5-parallel-execution-architecture)
6. [Auth & Session Reuse Flow](#6-auth--session-reuse-flow)
7. [Data Flow — From .env to Browser](#7-data-flow--from-env-to-browser)
8. [API Testing Flow](#8-api-testing-flow)
9. [Logging & Observability Flow](#9-logging--observability-flow)
10. [Cross-Process Data Safety](#10-cross-process-data-safety)
11. [CI/CD Pipeline Flow](#11-cicd-pipeline-flow)
12. [Docker Execution Flow](#12-docker-execution-flow)
13. [How Each Java Component Was Ported](#13-how-each-java-component-was-ported)
14. [Phase-by-Phase: How the Framework Was Built](#14-phase-by-phase-how-the-framework-was-built)
15. [File-to-File Mapping](#15-file-to-file-mapping)

---

## 1. Architecture Overview

### Master Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TRIGGER LAYER                                    │
│  GitHub Actions  │  Jenkins  │  docker compose  │  npm test  │  CLI      │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                     GLOBAL SETUP (runs ONCE)                             │
│                                                                          │
│  ┌─────────────────┐  ┌────────────────────┐  ┌──────────────────────┐  │
│  │  Health Check    │  │  Env Info Banner    │  │  Config Validation   │  │
│  │  (HEAD → baseUrl)│  │  (print environment │  │  (env-manager.ts)    │  │
│  │  Fail-fast if    │  │   name, URL, team)  │  │  Load .env + config  │  │
│  │  env unreachable │  │                     │  │  Validate required   │  │
│  └─────────────────┘  └────────────────────┘  └──────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                     playwright-bdd (BDD → Test Gen)                      │
│                                                                          │
│  .feature files  ──→  defineBddConfig()  ──→  .features-gen/*.spec.ts    │
│  (Gherkin)              (step binding)         (Playwright tests)         │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                     WORKER LAYER (N parallel processes)                   │
│                                                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐            │
│  │ Worker 1 (pid) │  │ Worker 2 (pid) │  │ Worker N (pid) │            │
│  │                │  │                │  │                │            │
│  │ ┌────────────┐ │  │ ┌────────────┐ │  │ ┌────────────┐ │            │
│  │ │ Scenario A │ │  │ │ Scenario C │ │  │ │ Scenario E │ │            │
│  │ │ Scenario B │ │  │ │ Scenario D │ │  │ │ Scenario F │ │            │
│  │ └─────┬──────┘ │  │ └─────┬──────┘ │  │ └─────┬──────┘ │            │
│  │       │        │  │       │        │  │       │        │            │
│  │ ┌─────▼──────┐ │  │ ┌─────▼──────┐ │  │ ┌─────▼──────┐ │            │
│  │ │ Fixtures   │ │  │ │ Fixtures   │ │  │ │ Fixtures   │ │            │
│  │ │ -TestCtx   │ │  │ │ -TestCtx   │ │  │ │ -TestCtx   │ │            │
│  │ │ -Logger    │ │  │ │ -Logger    │ │  │ │ -Logger    │ │            │
│  │ │ -ApiHelper │ │  │ │ -ApiHelper │ │  │ │ -ApiHelper │ │            │
│  │ │ -Pages     │ │  │ │ -Pages     │ │  │ │ -Pages     │ │            │
│  │ │ -StorState │ │  │ │ -StorState │ │  │ │ -StorState │ │            │
│  │ └────────────┘ │  │ └────────────┘ │  │ └────────────┘ │            │
│  └────────────────┘  └────────────────┘  └────────────────┘            │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                     PAGE OBJECT LAYER                                    │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  BasePage (enterprise)                                           │   │
│  │  - Retry engine (configurable attempts + auto-screenshot)        │   │
│  │  - Action logging (every click/fill/select logged with timing)   │   │
│  │  - Smart waits (network idle, URL change, element state)         │   │
│  │  - Locator builders (byTestId, byRole, byText, byLabel)         │   │
│  │  - Table helpers, iframe support, drag-and-drop                  │   │
│  │  - Soft assertions (collect failures without stopping)           │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │  LoginPage    │  DashboardPage  │  SchedulePage  │  TeamPages    │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │  Shared UI Components (composable, receive Page instance)       │   │
│  │  - NavigationComponent (sidebar nav + sub-tabs)                 │   │
│  │  - LocationSelectorComponent (location search/chooser/district) │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                     DATA LAYER                                           │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │ DataService  │  │ TestContext  │  │ FileLock     │  │ Environment  │  │
│  │ -getUser()   │  │ -setContext()│  │ -acquireLock │  │ -getConfig() │  │
│  │ -selectLoc() │  │ -getContext()│  │ -withFileLock│  │ -resolveUrl()│  │
│  │ -release()   │  │ -cleanup()  │  │ -cleanLocks()│  │ -cachedCfg() │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └──────────────┘  │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                     REPORTING & INTEGRATIONS                             │
│                                                                          │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──────────┐ ┌───────────┐ │
│  │ Playwright │ │ Cucumber  │ │ TestRail  │ │ Logger   │ │ Slack     │ │
│  │ HTML/JSON  │ │ HTML/JSON │ │ API       │ │ JSONL    │ │ Webhook   │ │
│  └───────────┘ └───────────┘ └───────────┘ └──────────┘ └───────────┘ │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                     GLOBAL TEARDOWN (runs ONCE)                          │
│                                                                          │
│  clearAllSessions() → removes .auth/*.json                               │
│  cleanAllLocks()    → removes .locks/*.lock                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### Layer Architecture (Simplified)

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Feature Files (.feature)                            │
│   teams/sch/features/ui/scheduling.feature                   │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: Step Definitions (.steps.ts)                        │
│   teams/sch/steps/scheduling.steps.ts                        │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: Fixtures (test-fixtures.ts)                         │
│   TestContext, Logger, ApiHelper, Page Objects, StorageState │
├──────────────┬──────────────┬───────────────────────────────┤
│ Layer 4a:    │ Layer 4b:    │ Layer 4c:                      │
│ Page Objects │ Data Layer   │ Integrations                   │
│ BasePage     │ DataService  │ TestRail                       │
│ LoginPage    │ TestContext  │ Slack                          │
│ DashboardPg  │ FileLock     │ API Helper                     │
├──────────────┴──────────────┴───────────────────────────────┤
│ Layer 5: Config Layer                                        │
│   environment.ts │ env-manager.ts │ framework.config.ts      │
├─────────────────────────────────────────────────────────────┤
│ Layer 6: Auth Layer                                          │
│   auth-manager.ts │ global-setup.ts │ global-teardown.ts     │
├─────────────────────────────────────────────────────────────┤
│ Layer 7: Execution Layer                                     │
│   run-sharded.js │ run-split-scenarios.js │ merge-reports.js  │
├─────────────────────────────────────────────────────────────┤
│ Layer 8: CI/CD Layer                                         │
│   GitHub Actions │ Jenkins │ Docker │ Slack Notify           │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
playwright-automation-framework/
├── .github/workflows/
│   └── playwright-tests.yml        ← GitHub Actions CI/CD pipeline
├── ci/
│   ├── Jenkinsfile                  ← Jenkins parameterized pipeline
│   └── scripts/
│       ├── run-tests.sh             ← Local CLI runner
│       └── slack-notify.js          ← Slack webhook notifier
├── config/
│   ├── env.config.json              ← Default environment settings
│   ├── env-manager.ts               ← .env file loader with validation
│   ├── framework.config.ts          ← Teams, tags, timeouts, paths
│   └── environments/
│       ├── dev.env                   ← Per-env config overrides
│       ├── staging.env
│       ├── uat.env
│       └── prod.env
├── src/
│   ├── auth/
│   │   ├── auth-manager.ts          ← Session reuse via storageState
│   │   ├── global-setup.ts          ← Health check + env validation
│   │   └── global-teardown.ts       ← Session + lock cleanup
│   ├── config/
│   │   ├── environment.ts           ← PropertyMap.java port
│   │   └── index.ts
│   ├── data/
│   │   ├── models.ts                ← UserData, Location, ContextKey
│   │   ├── data-service.ts          ← DataService.java port
│   │   ├── test-context.ts          ← StepsBase.java port
│   │   ├── file-lock.ts             ← Cross-process file locking
│   │   └── index.ts
│   ├── fixtures/
│   │   └── test-fixtures.ts         ← Playwright fixture definitions
│   ├── integrations/
│   │   └── testrail/                ← TestRail API integration
│   ├── pages/
│   │   ├── base/BasePage.ts         ← Enterprise base page object
│   │   ├── auth/LoginPage.ts
│   │   └── dashboard/DashboardPage.ts
│   ├── utils/
│   │   ├── Logger.ts                ← Enterprise structured logger
│   │   ├── api-helper.ts            ← Enterprise API client
│   │   ├── wait-helper.ts
│   │   ├── string-helper.ts
│   │   └── file-helper.ts
│   └── steps/                       ← Shared step definitions
├── teams/                           ← 11 team directories
│   ├── ta/
│   ├── SCH/
│   ├── PLT-Core/
│   ├── PLT-Int/
│   ├── PLT-Ops/
│   ├── LRB/
│   ├── EV-Com/
│   ├── EV-LIP/
│   ├── EV-ELM/
│   ├── GENAI/
│   └── EPR/
├── shared/                          ← Cross-team shared code
├── scripts/                         ← Execution scripts
│   ├── run-sharded.js               ← Feature-level sharding + hybrid mode
│   ├── run-split-scenarios.js       ← Tag-based scenario splitting for long features
│   ├── merge-reports.js
│   └── rerun-failed.js
├── test-data/users/                 ← Test data JSON files
├── Dockerfile                       ← Multi-stage container build
├── docker-compose.yml               ← Service-based test execution
├── playwright.config.ts             ← Master Playwright config
├── package.json
└── tsconfig.json
```

---

## 2. Design Principles

### 2.1 Process Isolation Over Thread Safety

**Java (Selenium):** Uses `ThreadLocal` everywhere to prevent threads from sharing state.
```java
private static ThreadLocal<Map<ContextKey,Object>> context;  // StepsBase.java
private static ThreadLocal<RemoteWebDriver> driver;           // DriverManager.java
```

**Playwright:** Each worker is a separate OS process. No shared memory = no race conditions.
```typescript
// No ThreadLocal needed. Module-level variables are per-worker-process:
let _sharedContext: BrowserContext | null = null;  // Shared within feature
let _sharedPage: Page | null = null;               // Shared within feature
let _sharedTestContext: TestContext | null = null;  // Shared within feature
```

### 2.2 Shared Browser Session Within a Feature

**Key design:** All scenarios in a feature share the same BrowserContext and Page.
Each scenario has its own Given/When/Then steps that navigate to the page it needs.
Scenarios are **independent in outcome** — failure in one never skips others.

```
Feature: Schedule Management     ← ONE BrowserContext for entire feature
  Scenario: Add notes            ← uses shared page, navigates via Given steps
  Scenario: Edit shift           ← same page, its own Given steps navigate
  Scenario: Publish schedule     ← same page, its own Given steps navigate
[Feature ends → context closed → next feature gets fresh context]
```

**Why shared (not isolated)?**
- Avoids re-login + re-navigation for every scenario (huge time savings)
- Matches the Selenium framework behavior (WebDriver shared within feature)
- Each scenario's Given steps navigate to wherever it needs — independence preserved

**Failure recovery:** If a scenario fails, the framework automatically:
1. Takes a screenshot (attached to report)
2. Dismisses any blocking JS dialogs
3. Navigates to base URL (dashboard) — clean starting point
4. Next scenario's Given steps navigate from there

### 2.3 Fixtures Replace Dependency Injection

**Java:** Google Guice injects dependencies per scenario.
**Playwright:** Fixtures override built-in `context` and `page` to share within a feature.

```typescript
// BrowserContext — shared within feature, fresh per feature
context: async ({ browser }, use, testInfo) => {
  const featureName = testInfo.titlePath[0];
  if (featureName !== _currentFeature || !_sharedContext) {
    // New feature → close old context, create fresh one with auth cookies
    _sharedContext = await browser.newContext({ storageState: ... });
    _currentFeature = featureName;
  }
  await use(_sharedContext);  // Reused by all scenarios in this feature
},

// Page — shared within feature
page: async ({ context }, use, testInfo) => {
  if (_previousScenarioFailed) {
    _sharedPage = await recoverPage(_sharedPage, context);  // Recovery
  }
  if (!_sharedPage) _sharedPage = await context.newPage();
  await use(_sharedPage);    // Reused by all scenarios in this feature
},

// TestContext — shared within feature (data carries over between scenarios)
testContext: async ({}, use) => {
  if (!_sharedTestContext) {
    _sharedTestContext = new TestContext();
  }
  await use(_sharedTestContext);
},
```

### 2.4 Session Reuse Over Repeated Login

**Java:** Logs in via UI for every single scenario (~3-5 seconds each).
**Playwright:** Logs in ONCE in globalSetup, saves cookies to `.auth/`, loads them into the shared BrowserContext via `storageState`. For 500 scenarios = ~25-40 minutes saved.

### 2.4 Single Source of Truth for Test Data

ONE data file per enterprise+environment combination. No duplicate credential systems.
```
test-data/users/user_loc_{ENTERPRISE}_{ENVIRONMENT}{FILENUMBER}.json
```

### 2.5 Convention Over Configuration

- Data files: `test-data/users/user_loc_{ENTERPRISE}_{ENV}.json`
- Team features: `teams/{team}/features/{ui|api}/*.feature`
- Config priority: env vars > .env file > config/*.json > defaults

### 2.6 Retry Everything, Trust Nothing

- **API calls:** Auto-retry with exponential backoff on 408/429/5xx
- **UI actions:** Retry with configurable attempts + auto-screenshot on failure
- **Token refresh:** Auto-refresh on 401 response
- **Stale locks:** Auto-cleanup by age or dead PID

---

## 3. Execution Lifecycle — End to End

This is the complete flow from `npm test` to Slack notification.

### Step 1: Config Loading

```
npm test
  │
  ▼
playwright.config.ts
  │
  ├─→ loadEnvConfig('staging')         ← config/env-manager.ts
  │     └─→ reads config/environments/staging.env
  │     └─→ validates required vars (BASE_URL, etc.)
  │     └─→ injects into process.env
  │
  ├─→ getTestPaths()                   ← resolves feature/step paths
  │     └─→ TEAM=sch → teams/sch/features/**/*.feature
  │     └─→ TEAM=all → teams/*/features/**/*.feature
  │     └─→ TYPE=ui → teams/*/features/ui/**/*.feature
  │
  ├─→ defineBddConfig({ features, steps })  ← playwright-bdd
  │     └─→ generates .features-gen/*.spec.ts from .feature files
  │
  └─→ defineConfig({ globalSetup, globalTeardown, projects, ... })
```

### Step 2: Global Setup (runs ONCE before all workers)

```
global-setup.ts
  │
  ├─→ Health Check
  │     └─→ HTTP HEAD → baseUrl
  │     └─→ If fails → process.exit(1)  (fail-fast)
  │     └─→ If 301/302 → treat as pass (redirect-based apps)
  │
  ├─→ Print Environment Info Banner
  │     └─→ Prints environment name, base URL, team, worker count
  │
  └─→ Validate Configuration
        └─→ Warnings for missing optional vars (ENTERPRISE, AUTH_ROLES, etc.)
        └─→ NOTE: No pre-authentication happens here. Each feature manages
             its own login via the Background step (idempotent login pattern).
```

### Step 3: Test Execution (N workers in parallel)

```
Playwright Test Runner (fullyParallel: false)
  │
  ├─→ Spawns N worker processes (default: 2 local, 4 CI)
  │   Each feature file = exactly one worker (scenarios run sequentially within)
  │
  └─→ Each worker picks up a feature file:
        │
        ├─→ FEATURE START (first scenario triggers context creation)
        │     ├─→ context fixture detects new feature name
        │     │     └─→ Creates fresh BrowserContext (clean slate, no pre-auth)
        │     ├─→ page fixture creates new Page (browser tab)
        │     └─→ testContext fixture creates new TestContext
        │           └─→ setContext(ENTERPRISE_NAME, 'LegionCoffee')
        │
        ├─→ For each scenario in this feature (sequential, shared session):
        │     │
        │     ├─→ FIXTURE SETUP (reuses shared context/page/testContext)
        │     │     ├─→ context fixture → same _sharedContext (not recreated)
        │     │     ├─→ page fixture → same _sharedPage
        │     │     │     └─→ If previous scenario FAILED:
        │     │     │           → dismiss dialogs → navigate to base URL → recover
        │     │     ├─→ testContext fixture → same _sharedTestContext
        │     │     │
        │     │     ├─→ logger fixture (fresh per scenario)
        │     │     │     └─→ new Logger('Scenario', { workerIndex: 2, correlationId: testId })
        │     │     │
        │     │     ├─→ apiHelper fixture (fresh per scenario)
        │     │     │     └─→ new ApiHelper(request, { logger })
        │     │     │
        │     │     └─→ page object fixtures (fresh per scenario, use shared page)
        │     │           └─→ new LoginPage(page, testContext)
        │     │           └─→ new DashboardPage(page, testContext)
        │     │
        │     ├─→ SCENARIO EXECUTION
        │     │     Given I login as 'StoreManager1'.
        │     │       → dataService.getUILoginUserBy('StoreManager1')
        │     │       → setContext(USER_NAME, user.name)
        │     │       → loginPage.login(user.name, user.password)
        │     │       → [BasePage retry engine wraps each action]
        │     │       → [Logger logs: "Click: #username (45ms)"]
        │     │
        │     │     And I select location 'Automation1'.
        │     │       → dataService.selectLocationByName('Automation1')
        │     │       → setContext(LOCATION_NAME, 'Automation1')
        │     │
        │     │     When I navigate to schedule page
        │     │       → schedulePage.navigateTo(location)
        │     │       → [waits for networkidle]
        │     │
        │     │     Then I should see the weekly schedule
        │     │       → expect(locator).toBeVisible()
        │     │
        │     └─→ FIXTURE TEARDOWN (per scenario)
        │           ├─→ logger.info('Finished: ... [PASSED] (2340ms)')
        │           ├─→ logger.close()  → flushes file stream
        │           ├─→ If FAILED: screenshot saved + _previousScenarioFailed = true
        │           └─→ context/page/testContext NOT closed (shared, persist)
        │
        ├─→ FEATURE END (worker moves to next feature file)
        │     ├─→ context.close()  → closes browser tab + session
        │     ├─→ _sharedPage = null
        │     ├─→ _sharedTestContext = null
        │     └─→ Next feature will create fresh context/page/testContext
        │
        └─→ Worker generates blob-report for its scenarios
```

### Step 4: Global Teardown (runs ONCE after all workers)

```
global-teardown.ts
  │
  ├─→ clearAllSessions()  → rm -rf .auth/
  ├─→ cleanAllLocks()     → rm -rf .locks/
  └─→ Print "Done."
```

### Step 5: Report Generation

```
Reports generated:
  │
  ├─→ reports/html/              ← Playwright HTML report
  ├─→ reports/json/results.json  ← Playwright JSON report
  ├─→ reports/junit/results.xml  ← JUnit XML (for CI)
  ├─→ reports/cucumber/          ← Cucumber HTML + JSON reports
  ├─→ reports/logs/*.jsonl       ← Structured JSON logs per worker
  └─→ test-results/              ← Traces, screenshots, videos
```

### Step 6: Slack Notification (CI only)

```
slack-notify.js
  │
  ├─→ Reads: TEST_RESULT, GITHUB_RUN_URL, TEST_ENV, ENTERPRISE, etc.
  ├─→ Builds rich Slack block message:
  │     ├─→ Header: "✅ Playwright Tests PASSED" or "❌ FAILED"
  │     ├─→ Fields: Environment, Enterprise, Team, Trigger, Branch, Actor
  │     └─→ Button: "View Run" → links to GitHub Actions
  └─→ POST → SLACK_WEBHOOK_URL
```

---

## 4. Component Deep Dive

### 4.1 Auth Manager (`src/auth/auth-manager.ts`)

**Purpose:** Login ONCE, reuse cookies for all scenarios.

```
How it works:
  1. globalSetup calls createAuthSession('Admin')
  2. Launches headless chromium
  3. Navigates to login URL
  4. Fills username/password from DataService
  5. Clicks submit, waits for dashboard
  6. Calls context.storageState({ path: '.auth/LegionCoffee_STG_Admin.json' })
  7. This saves ALL cookies + localStorage to a JSON file
  8. Closes browser

  Later, each scenario:
  1. Fixture checks hasValidSession('Admin')
  2. If valid → passes '.auth/LegionCoffee_STG_Admin.json' as storageState
  3. Browser starts with ALL cookies pre-loaded
  4. No login needed — browser is already authenticated

Session file naming:
  .auth/{enterprise}_{environment}_{userType}.json
  .auth/LegionCoffee_STG_Admin.json
  .auth/LegionCoffee_STG_StoreManager1.json

Session expiry:
  - Default: 30 minutes (maxAgeMs)
  - Checks file mtime to determine age
  - If expired → re-authenticates

Failure handling:
  - If login fails → takes debug screenshot to .auth/login-failure-Admin.png
  - Logs warning, does NOT abort test run
  - Scenarios fall back to UI login
```

**Key functions:**
| Function | Purpose |
|---|---|
| `getStoragePath(userType)` | Returns `.auth/{enterprise}_{env}_{userType}.json` |
| `hasValidSession(userType, maxAgeMs)` | Checks file exists + not expired |
| `createAuthSession(userType)` | Logs in via UI, saves storageState |
| `clearAllSessions()` | Deletes `.auth/` directory |


### 4.2 Enterprise Logger (`src/utils/Logger.ts`)

**Purpose:** Structured logging with JSON output, correlation IDs, and sensitive data masking.

```
Logger Architecture:

  ┌─────────────────────────────────────────────────────┐
  │  Logger Instance                                     │
  │  context: 'Scenario'                                 │
  │  workerIndex: 2                                      │
  │  correlationId: 'm2k9x-a7b3c1'                     │
  │  minLevel: INFO (from LOG_LEVEL env var)             │
  │                                                      │
  │  ┌─────────────┐    ┌──────────────────────┐        │
  │  │ Console Out  │    │ File Out (JSONL)      │        │
  │  │ Human-read   │    │ reports/logs/          │        │
  │  │ [HH:MM:SS]   │    │ worker-2-17082...jsonl│        │
  │  │ [W2] [Ctx]   │    │ {"timestamp":...}     │        │
  │  └─────────────┘    └──────────────────────┘        │
  └─────────────────────────────────────────────────────┘
```

**Console output (human-readable):**
```
[14:23:45.123] [W2] [Scenario] INFO  Started: Publish schedule
[14:23:45.200] [W2] [Scenario.LoginPage] INFO  Click: #username (45ms)
[14:23:45.310] [W2] [Scenario.LoginPage] INFO  Fill: #password = "***MASKED***" (32ms)
[14:23:46.500] [W2] [Scenario] INFO  STEP PASSED: I login as 'Admin' (1300ms)
```

**File output (JSON for ELK/Datadog/Splunk):**
```json
{"timestamp":"2026-02-17T14:23:45.123Z","level":"INFO","context":"Scenario","correlationId":"m2k9x-a7b3c1","workerIndex":2,"message":"Started: Publish schedule"}
{"timestamp":"2026-02-17T14:23:45.200Z","level":"INFO","context":"Scenario.LoginPage","correlationId":"m2k9x-a7b3c1","workerIndex":2,"message":"Click: #username","data":{"durationMs":45}}
```

**Key features:**
| Feature | How it Works |
|---|---|
| **Log levels** | DEBUG < INFO < WARN < ERROR < FATAL. Set via `LOG_LEVEL` env var |
| **Correlation IDs** | Auto-generated per logger. Traces all logs for one scenario |
| **Sensitive masking** | Auto-masks passwords, tokens, SSNs, API keys in log messages |
| **Step timing** | `logger.step('I login')` starts timer. `logger.stepDone('I login')` logs duration |
| **Child loggers** | `logger.child('LoginPage')` inherits correlationId + workerIndex |
| **File output** | JSON Lines format (`.jsonl`). One file per worker. Disabled with `LOG_TO_FILE=false` |


### 4.3 Enterprise API Helper (`src/utils/api-helper.ts`)

**Purpose:** HTTP client with retry, token refresh, interceptors, and typed responses.

```
Request Flow:

  api.get('/api/v1/schedules')
    │
    ├─→ Run request interceptors (add custom headers, etc.)
    ├─→ Build URL with query params
    ├─→ Log: "→ GET /api/v1/schedules"
    ├─→ Start timer
    │
    ├─→ Execute request via Playwright APIRequestContext
    │
    ├─→ Check response status:
    │     ├─→ 200-299 (OK) → parse JSON → return ApiResult<T>
    │     │
    │     ├─→ 401 (Unauthorized) + tokenRefreshFn set?
    │     │     └─→ Call tokenRefreshFn() → get new token
    │     │     └─→ Set new Bearer token
    │     │     └─→ Retry request (up to maxRetries)
    │     │
    │     ├─→ 408/429/500/502/503/504 (Transient)?
    │     │     └─→ Calculate backoff: baseDelay * 2^attempt ± 25% jitter
    │     │     └─→ Wait → Retry (up to maxRetries)
    │     │
    │     └─→ Other error → return ApiResult with ok=false
    │
    ├─→ Log: "← 200 GET /api/v1/schedules (342ms)"
    ├─→ Run response interceptors
    └─→ Return ApiResult<T>
```

**ApiResult<T> structure:**
```typescript
interface ApiResult<T> {
  ok: boolean;              // true if 2xx
  status: number;           // HTTP status code
  statusText: string;       // "OK", "Not Found", etc.
  headers: Record<string, string>;
  body: T | null;           // Parsed JSON response
  durationMs: number;       // Request duration
  method: string;           // "GET", "POST", etc.
  url: string;              // Full URL
  isTransientError: boolean; // true for 408/429/5xx
}
```

**Retry configuration:**
```typescript
{
  maxRetries: 3,             // Total attempts = 4
  baseDelayMs: 1000,         // First retry after ~1s
  maxDelayMs: 10000,         // Cap at 10s
  retryOnStatuses: [408, 429, 500, 502, 503, 504]
}

// Backoff progression (with ±25% jitter):
// Attempt 1: ~1000ms
// Attempt 2: ~2000ms
// Attempt 3: ~4000ms
```


### 4.4 Enterprise BasePage (`src/pages/base/BasePage.ts`)

**Purpose:** Every page object extends this. Provides retry, logging, smart waits, and 40+ utility methods.

```
BasePage Method Categories:

  Navigation (6 methods)
  ├── navigateTo(path)         — goto with networkidle
  ├── navigateBack()           — browser back
  ├── reload()                 — page reload
  ├── getCurrentUrl()          — current URL
  ├── getTitle()               — page title
  └── waitForUrl(pattern)      — wait for URL change

  Click Actions (6 methods)
  ├── clickElement(selector)   — click with retry
  ├── doubleClick(selector)    — double-click with retry
  ├── rightClick(selector)     — context menu
  ├── forceClick(selector)     — bypass actionability
  ├── clickByText(text)        — text-based click
  └── clickByRole(role, name)  — role-based click

  Form Interactions (8 methods)
  ├── fillField(selector, val) — clear + fill with retry
  ├── typeText(selector, text) — sequential key presses
  ├── clearField(selector)     — clear input
  ├── selectDropdown(sel, val) — select option
  ├── selectDropdownByLabel()  — select by visible text
  ├── checkCheckbox(selector)  — check
  ├── uncheckCheckbox(selector)— uncheck
  └── uploadFile(selector, path)— file upload

  Element State (6 methods)
  ├── getText(selector)        — innerText
  ├── getInputValue(selector)  — input value
  ├── getAttribute(sel, attr)  — any attribute
  ├── isVisible(selector)      — visibility check
  ├── isEnabled(selector)      — enabled check
  └── getElementCount(selector)— count matching

  Wait Helpers (6 methods)
  ├── waitForElement(sel, state) — visible/hidden/attached/detached
  ├── waitForNetworkIdle()     — all requests settled
  ├── waitForPageLoad()        — DOMContentLoaded
  ├── waitForUrl(pattern)      — URL matches pattern
  ├── waitForResponse(pattern) — API response received
  └── waitMs(ms)               — explicit wait (use sparingly)

  Table Helpers (3 methods)
  ├── getTableData(sel)        — full table as string[][]
  ├── getTableRowCount(sel)    — row count
  └── getTableCellText(s,r,c)  — specific cell

  Other (8+ methods)
  ├── scrollToElement/Top/Bottom
  ├── hoverElement, dragAndDrop
  ├── pressKey, pressKeys
  ├── getFrame, clickInFrame
  ├── acceptDialog, dismissDialog
  ├── takeScreenshot, takeElementScreenshot
  └── softAssert, softExpectVisible, softExpectText, flushSoftAssertions
```

**Retry Engine (built into every action):**
```
clickElement('#submit-btn')
  │
  Attempt 1:
  │ try → click → SUCCESS → log "Click: #submit-btn (45ms)" → return
  │
  Attempt 1 fails:
  │ catch → log WARN "Click: #submit-btn failed (attempt 1/3): element not visible"
  │ wait 500ms
  │
  Attempt 2:
  │ try → click → SUCCESS → log "Click: #submit-btn (120ms)" → return
  │
  ... or if all attempts fail:
  │
  Attempt 3 fails:
  │ log ERROR "Click: #submit-btn FAILED after 3 attempts"
  │ auto-screenshot → reports/screenshots/failure-Click___submit_btn.png
  │ throw error
```

**Locator Builders (protected, for page object subclasses):**
```typescript
class SchedulePage extends BasePage {
  // Instead of raw selectors:
  private readonly publishBtn = this.byTestId('publish-btn');
  private readonly weekLabel = this.byRole('heading', { name: /week of/i });
  private readonly scheduleTable = this.locator('.schedule-grid');
  private readonly addShiftBtn = this.byText('Add Shift', { exact: true });
}
```


### 4.5 Cross-Process File Lock (`src/data/file-lock.ts`)

**Purpose:** Prevents two workers from grabbing the same user/location simultaneously.

```
Problem:
  Worker 1: reads user_loc.json → finds Admin (isUsed=false) → marks isUsed=true
  Worker 2: reads user_loc.json → finds Admin (isUsed=false) → marks isUsed=true
  COLLISION: Both workers use the same Admin user!

  (This happens because isUsed is in-memory, per-process.
   Each worker's DataService has its own copy of the data.)

Solution — File Lock:
  Worker 1: acquireLock('data-select')
            → creates .locks/data-select.lock (O_EXCL = atomic create-or-fail)
            → reads shared state, selects user
            → release() → deletes .locks/data-select.lock

  Worker 2: acquireLock('data-select')
            → .lock file exists → WAIT (poll every 50ms)
            → lock released → creates .lock → selects next user
            → release()

Lock file contents (for debugging):
  { "pid": 12345, "timestamp": 1708214400000 }

Stale lock detection:
  1. Lock file older than 30 seconds → auto-remove
  2. PID in lock file no longer running (process.kill(pid, 0) fails) → auto-remove
```

**Usage in DataService:**
```typescript
import { withFileLock } from './file-lock';

// Wrap cross-worker selection in a file lock
const user = await withFileLock('user-selection', () => {
  return this.data.users.find(u => !u.isUsed && u.userType === 'Admin');
});
```


### 4.6 Config Layer (`config/` + `src/config/`)

```
Config Resolution Flow:

  CLI / CI
  │ TEST_ENV=staging ENTERPRISE=LegionCoffee npm test
  │
  ▼
  playwright.config.ts
  │ loadEnvConfig('staging')
  │
  ▼
  config/env-manager.ts
  │ 1. Read config/environments/staging.env
  │ 2. Parse key=value pairs
  │ 3. Inject into process.env (don't overwrite existing)
  │ 4. Validate required vars exist
  │
  ▼
  src/config/environment.ts
  │ getEnvironmentConfig()
  │ 1. Read config/env.config.json (defaults)
  │ 2. Merge: env vars > .env file > config file > hardcoded defaults
  │ 3. Resolve baseUrl from environment code (STG → https://staging-enterprise...)
  │ 4. Return EnvironmentConfig object
  │
  ▼
  Used by: DataService, auth-manager, playwright.config, TestRail
```

**Priority chain:**
```
Highest: process.env.BASE_URL          (CLI / CI pipeline)
         ↓
         config/environments/staging.env (per-env config)
         ↓
         config/env.config.json          (project defaults)
         ↓
Lowest:  hardcoded defaults              (STG URL, 60s timeout)
```

---

## 5. Parallel Execution Architecture

### 5.1 Three Frameworks Compared

| Aspect | TestNG+POM (Java) | Selenium+Cucumber (Java) | Playwright+Cucumber (This) |
|---|---|---|---|
| **Parallel unit** | `<test>` blocks (53 in XML) | `parallel=false` — **NOT parallel** | Feature files across workers (`fullyParallel: false`) |
| **Isolation** | ThreadLocal per thread | Single-threaded | Process per worker |
| **Max workers** | 10 (`thread-count` in testng.xml) | 1 | 15-20 (configurable) |
| **State sharing** | Shared JVM (ThreadLocal required) | N/A | No shared memory |
| **Data safety** | `synchronized` + ThreadLocal | Not needed | File locks (optional) |
| **Session reuse** | None (login every test) | None | storageState (login once) |

### 5.2 Worker Model (Native Playwright)

```
npm test (WORKERS=4)
  │
  ▼
Playwright spawns 4 OS processes (workers)
  │
  ├─→ Worker 1 (pid 11001)  ──→  Feature A (scenarios 1-5)
  │                                Feature B (scenarios 6-8)
  │
  ├─→ Worker 2 (pid 11002)  ──→  Feature C (scenarios 9-12)
  │                                Feature D (scenarios 13-15)
  │
  ├─→ Worker 3 (pid 11003)  ──→  Feature E (scenarios 16-20)
  │
  └─→ Worker 4 (pid 11004)  ──→  Feature F (scenarios 21-23)
                                   Feature G (scenarios 24-25)

Each worker:
  - Separate Node.js process
  - Own V8 heap, own DataService instance, own TestContext
  - Gets pre-loaded storageState from .auth/
  - Generates its own blob-report fragment

Within each worker, scenarios in a feature share a single BrowserContext and Page:
  - State from Scenario A carries over to Scenario B (URL, DOM, cookies)
  - No re-login or re-navigation between scenarios in the same feature
  - If a scenario fails → recovery: dismiss dialogs, navigate to base URL
  - Next scenario's Given steps navigate from the dashboard
```

### 5.3 Sharded Model (Custom Script for Large Suites)

```
node scripts/run-sharded.js --tags @Regression --workers 15
  │
  ▼
  1. DISCOVER: Glob teams/*/features/**/*.feature → 200 features
  2. FILTER: Parse each .feature, count scenarios matching @Regression → 180 features, 1500 scenarios
  3. SHARD (Greedy Load Balancing):
     │
     │  Sort features by scenario count (descending):
     │    [50, 35, 30, 25, 20, 18, 15, 12, 10, 8, 7, 5, 3, 2, ...]
     │
     │  Assign each to worker with fewest scenarios:
     │    Feature(50) → Worker 1  [total: 50]
     │    Feature(35) → Worker 2  [total: 35]
     │    Feature(30) → Worker 3  [total: 30]
     │    Feature(25) → Worker 4  [total: 25]
     │    ...
     │    Feature(5)  → Worker 15 [total: 7]  ← Worker 15 had fewest
     │
     │  Result: Each worker gets ~100 scenarios (balanced within ±5%)
     │
  4. EXECUTE: Spawn 15 parallel Playwright processes
     │  Each: npx playwright test --shard=i/15 --reporter=blob
     │
  5. MERGE: node scripts/merge-reports.js
     │  Combines 15 blob-reports → single HTML + JSON report
     │  Extracts failures → rerun.txt
     │
  6. REPORT: Print summary table
     │  Worker 1: 100 scenarios, 98 passed, 2 failed (4m 12s)
     │  Worker 2:  99 scenarios, 99 passed, 0 failed (3m 58s)
     │  ...
```

### 5.4 Greedy Load Balancing Algorithm

```
Input: [12, 8, 7, 5, 3, 2] scenarios per feature, 3 workers

Step 1: Sort descending → [12, 8, 7, 5, 3, 2]

Step 2: Assign greedily:
  Feature(12) → Worker 1 [12]
  Feature(8)  → Worker 2 [8]
  Feature(7)  → Worker 3 [7]
  Feature(5)  → Worker 3 [12]  ← had fewest (7)
  Feature(3)  → Worker 2 [11]  ← had fewest (8)
  Feature(2)  → Worker 2 [13]  ← had fewest (11)

Result:  Worker 1: 12 | Worker 2: 13 | Worker 3: 12
         Max diff: 1 scenario → near-perfect balance
```

---

## 6. Auth & Session Reuse Flow

```
BEFORE (no session reuse):
  Scenario 1: Navigate to login → Fill username → Fill password → Click submit → Wait → 3.5s
  Scenario 2: Navigate to login → Fill username → Fill password → Click submit → Wait → 3.5s
  ...
  Scenario 500: Navigate to login → ...                                              → 3.5s
  TOTAL LOGIN TIME: 500 × 3.5s = 29 minutes wasted on login alone

AFTER (session reuse via storageState):
  Global Setup: Login ONCE → Save cookies to .auth/Admin.json                        → 3.5s
  Scenario 1: Browser starts with cookies pre-loaded → already logged in             → 0s
  Scenario 2: Browser starts with cookies pre-loaded → already logged in             → 0s
  ...
  Scenario 500: Browser starts with cookies pre-loaded → already logged in           → 0s
  TOTAL LOGIN TIME: 3.5s (ONE login for entire suite)
  SAVINGS: ~29 minutes
```

**StorageState JSON contents:**
```json
{
  "cookies": [
    {
      "name": "session_id",
      "value": "abc123...",
      "domain": ".legion.work",
      "path": "/",
      "expires": 1708300800,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    }
  ],
  "origins": [
    {
      "origin": "https://staging-enterprise.dev.legion.work",
      "localStorage": [
        { "name": "auth_token", "value": "eyJ..." },
        { "name": "enterprise_id", "value": "legion-coffee-123" }
      ]
    }
  ]
}
```

---

## 7. Data Flow — From .env to Browser

### Complete Chain

```
.env file:  ENTERPRISE=LegionCoffee  TEST_ENV=STG
                │
                ▼
environment.ts: getEnvironmentConfig()
                → { enterprise: 'LegionCoffee', environment: 'STG', baseUrl: 'https://staging-...' }
                │
                ▼
DataService: constructor()
             → loadTestData()
             → file: test-data/users/user_loc_LegionCoffee_STG.json
             → parses: 5 users, 2 locations, 2 employees
                │
                ▼
Feature file:  Given I login as 'StoreManager1'.
                │
                ▼
Step definition:
  const user = testContext.dataService.getUILoginUserBy('StoreManager1');
                │
                ▼
DataService filter chain:
  users.find(u =>
    !u.isUsed                                      ← not already claimed
    && u.userType === 'StoreManager1'               ← matches requested type
    && u.usedAs.includes('UI_LOGIN')                ← has UI login permission
    && (isLocal ? u.isLocal : true)                 ← respects local flag
  )
                │
                ▼
Returns: { name: 'julie+sm@legion.co', password: 'password123', userType: 'StoreManager1', ... }
  user.isUsed = true   ← prevents another scenario from using this user
                │
                ▼
Step definition:
  testContext.setContext(ContextKey.USER_NAME, user.name);
  testContext.setContext(ContextKey.USER_PASSWORD, user.password);
  await loginPage.login(user.name, user.password);
                │
                ▼
LoginPage.login():
  await this.fillField('#username', username);   ← BasePage logs: "Fill: #username (32ms)"
  await this.fillField('#password', password);   ← BasePage logs: "Fill: #password (28ms)"
  await this.clickElement('.login-btn');          ← BasePage logs: "Click: .login-btn (45ms)"
  await this.waitForNetworkIdle();               ← waits for dashboard to load
                │
                ▼
LATER in scenario:
  const username = testContext.getContext<string>(ContextKey.USER_NAME);
  // → 'julie+sm@legion.co'
                │
                ▼
PER-SCENARIO TEARDOWN:
  logger.close()               → flushes file stream
  If FAILED: screenshot saved, _previousScenarioFailed = true
  context/page/testContext NOT cleaned up (shared within feature)

AFTER feature (all scenarios done, worker moves to next feature):
  context.close()              → closes browser session
  _sharedPage = null
  _sharedTestContext = null     → DataService + context released
```

---

## 8. API Testing Flow

```
Feature:
  @api @P1-Critical
  Scenario: Create a schedule via API
    Given I have an API token for 'Admin'
    When I POST to '/api/v1/schedules' with body:
      | startDate | 2026-02-17 |
      | endDate   | 2026-02-23 |
    Then the response status should be 201
    And the response should contain 'scheduleId'

Step definitions:

  Given('I have an API token for {string}', async ({ testContext, apiHelper }, userType) => {
    const user = testContext.dataService.getAPILoginUserBy(userType);

    // Login via API to get token
    const loginResult = await apiHelper.post('/api/v1/auth/login', {
      username: user.name,
      password: user.password,
    });
    // ↑ ApiHelper auto-retries on 5xx, logs request/response

    ApiHelper.assertOk(loginResult);
    const token = loginResult.body.token;
    apiHelper.setAuthToken(token);

    // Set up auto-refresh for long-running test suites
    apiHelper.setTokenRefreshHandler(async () => {
      const refreshResult = await apiHelper.post('/api/v1/auth/refresh', { token });
      return refreshResult.body.newToken;
    });
  });

  When('I POST to {string} with body:', async ({ apiHelper, testContext }, endpoint, dataTable) => {
    const body = Object.fromEntries(dataTable.rawTable);
    const result = await apiHelper.post(endpoint, body);
    // ↑ Logs: "→ POST /api/v1/schedules {bodySize: 42}"
    // ↑ Logs: "← 201 POST /api/v1/schedules (342ms)"
    testContext.setContext('API_RESPONSE', result);
  });

  Then('the response status should be {int}', async ({ testContext }, status) => {
    const result = testContext.getContext('API_RESPONSE');
    ApiHelper.assertStatus(result, status);
  });
```

---

## 9. Logging & Observability Flow

```
Scenario: "Publish current week schedule"
Worker: 2
Correlation ID: m2k9x-a7b3c1

Console output during execution:
─────────────────────────────────────────────────────────────────
[14:23:45.100] [W2] [Scenario]            INFO  Started: Publish current week schedule
[14:23:45.105] [W2] [Scenario]            INFO  STEP: I login as 'StoreManager1'
[14:23:45.200] [W2] [Scenario.LoginPage]  INFO  Fill: #username = "julie+sm@legi..." (45ms)
[14:23:45.280] [W2] [Scenario.LoginPage]  INFO  Fill: #password = "***MASKED***" (32ms)
[14:23:45.350] [W2] [Scenario.LoginPage]  INFO  Click: .login-btn (120ms)
[14:23:46.500] [W2] [Scenario]            INFO  STEP PASSED: I login as 'StoreManager1' {durationMs: 1395}
[14:23:46.505] [W2] [Scenario]            INFO  STEP: I navigate to schedule page
[14:23:46.600] [W2] [Scenario.SchedulePg] INFO  Navigating to: /schedule
[14:23:47.800] [W2] [Scenario.SchedulePg] INFO  Navigation complete
[14:23:47.805] [W2] [Scenario]            INFO  STEP PASSED: I navigate to schedule page {durationMs: 1300}
[14:23:47.810] [W2] [Scenario]            INFO  STEP: I should see the weekly schedule
[14:23:48.100] [W2] [Scenario]            INFO  STEP PASSED: I should see {durationMs: 290}
[14:23:48.105] [W2] [Scenario]            INFO  Finished: Publish current week schedule [PASSED] (2985ms)
─────────────────────────────────────────────────────────────────

File output (reports/logs/worker-2-1708214625100.jsonl):
  Each line = one JSON object. Importable into ELK, Datadog, Splunk.

  Query examples:
  - Find all failures:        level:"ERROR" OR level:"FATAL"
  - Find slow steps:          data.durationMs:>5000
  - Trace one scenario:       correlationId:"m2k9x-a7b3c1"
  - Find all Worker 2 logs:   workerIndex:2
```

---

## 10. Cross-Process Data Safety

```
Scenario: Two workers start simultaneously and both need an Admin user.

WITHOUT file locks:
  Worker 1: dataService.getUILoginUserBy('Admin')
            → reads in-memory array → finds user[0] (isUsed=false) → marks isUsed=true
  Worker 2: dataService.getUILoginUserBy('Admin')                    (at the same time)
            → reads ITS OWN in-memory array → finds user[0] (isUsed=false) → marks isUsed=true
  RESULT: Both workers use the SAME user → potential login conflict

  NOTE: This is usually OK because:
  - Each worker loads its own copy of the JSON file
  - isUsed is per-process (not shared)
  - If you have 4 workers and 4 Admin users, each will get a different one
  - It only fails if you have MORE workers than available users of a type

WITH file locks (for guaranteed safety):
  Worker 1: withFileLock('user-select', () => { ... })
            → creates .locks/user-select.lock
            → selects user → writes selection to shared file
            → deletes .lock
  Worker 2: withFileLock('user-select', () => { ... })
            → .lock exists → waits → lock released
            → reads shared file → selects NEXT available user
            → deletes .lock
  RESULT: Guaranteed unique user per worker
```

---

## 11. CI/CD Pipeline Flow

### GitHub Actions

```
┌─────────────────────────────────────────────────────┐
│  Trigger: Push to PR │ Manual │ Nightly Schedule     │
│                                                      │
│  Parameters (manual):                                │
│    environment: staging                              │
│    enterprise: LegionCoffee                          │
│    team: all                                         │
│    browser: chromium                                 │
│    workers: 4                                        │
│    shards: 4                                         │
└─────────────────────┬───────────────────────────────┘
                      │
          ┌───────────▼───────────┐
          │   Quality Gate        │
          │   ├── npm ci          │
          │   ├── eslint          │
          │   └── tsc --noEmit    │
          └───────────┬───────────┘
                      │ (passes)
     ┌────────────────┼────────────────┐
     │                │                │
┌────▼───┐      ┌────▼───┐      ┌────▼───┐
│ Shard 1 │      │ Shard 2 │      │ Shard N │
│         │      │         │      │         │
│ install │      │ install │      │ install │
│ bddgen  │      │ bddgen  │      │ bddgen  │
│ test    │      │ test    │      │ test    │
│ --shard │      │ --shard │      │ --shard │
│ =1/N    │      │ =2/N    │      │ =N/N    │
│         │      │         │      │         │
│ upload  │      │ upload  │      │ upload  │
│ blob    │      │ blob    │      │ blob    │
└────┬────┘      └────┬────┘      └────┬────┘
     │                │                │
     └────────────────┼────────────────┘
                      │
          ┌───────────▼───────────┐
          │   Merge Reports       │
          │   ├── download blobs  │
          │   ├── merge → HTML    │
          │   └── upload artifact │
          └───────────┬───────────┘
                      │
          ┌───────────▼───────────┐        ┌───────────────┐
          │   Rerun Failures      │───────→│ Slack Notify   │
          │   (only if tests fail │        │ ├── status     │
          │    and not a PR)      │        │ ├── env/team   │
          └───────────────────────┘        │ ├── run link   │
                                           │ └── POST hook  │
                                           └───────────────┘
```

### Jenkins

```
Jenkinsfile stages:
  1. Checkout            → git checkout
  2. Install             → npm ci && npx playwright install
  3. BDD Generate        → npx bddgen
  4. Run Tests           → npx playwright test --project=${BROWSER} ${SHARD_ARG}
  5. Merge Reports       → node scripts/merge-reports.js
  6. Rerun Failures      → node scripts/rerun-failed.js (conditional)
  7. Archive Artifacts   → reports/**
```

---

## 12. Docker Execution Flow

```
docker compose up test-chromium
  │
  ▼
  1. BUILD (Dockerfile):
     │ Stage 1 (deps):
     │   FROM mcr.microsoft.com/playwright:v1.50.0-jammy
     │   COPY package.json → npm ci
     │
     │ Stage 2 (runner):
     │   COPY node_modules from stage 1
     │   COPY framework source
     │   RUN npx bddgen
     │
  2. RUN (docker-compose.yml):
     │ test-chromium:
     │   volumes:
     │     ./reports → /app/reports        (reports persist on host)
     │     ./test-data → /app/test-data    (read-only data mount)
     │     ./config → /app/config          (read-only config mount)
     │   environment:
     │     TEST_ENV=staging
     │     ENTERPRISE=LegionCoffee
     │     WORKERS=4
     │     CI=true
     │   shm_size: 2gb                     (prevents browser crashes)
     │   command: ["--project=chromium"]
     │
  3. EXECUTE:
     │ entrypoint: npx playwright test --project=chromium
     │ → runs inside container with all browsers pre-installed
     │ → reports written to mounted volume → available on host
     │
  4. RESULTS:
     │ Host machine: ./reports/ now contains all reports
     │ View: npx playwright show-report reports/html

Sharded Docker execution:
  docker compose --profile sharded up
  │
  ├── test-shard-1: --shard=1/4  (runs in parallel)
  ├── test-shard-2: --shard=2/4
  ├── test-shard-3: --shard=3/4
  ├── test-shard-4: --shard=4/4
  │
  └── merge-reports: waits for all 4 shards → merges
```

---

## 13. How Each Java Component Was Ported

| Java Source | TypeScript Port | Lines (Java → TS) | Key Changes |
|---|---|---|---|
| `PropertyMap.java` | `src/config/environment.ts` | 150 → 140 | env vars replace Maven props |
| `envCfg.json` | `config/env.config.json` | 30 → 14 | Same format |
| `StepsBase.java` | `src/data/test-context.ts` | 95 → 124 | No ThreadLocal needed |
| `StepsBase.ContextKey` | `src/data/models.ts` | 41 → 35 | TypeScript enum |
| `DataService.java` | `src/data/data-service.ts` | 1405 → 395 | 72% reduction |
| `UserData.java` | `src/data/models.ts` | ~30 → 10 | TypeScript interface |
| `Hook.java` (lifecycle) | `src/fixtures/test-fixtures.ts` | 30 → 150 | Shared session within feature, failure recovery |
| `Hook.java` (TestRail) | `testrail-hooks.ts` | 50 → 177 | More robust |
| `APIClient.java` | `testrail-api-client.ts` | 150 → 120 | Added retry |
| `testng.xml` (53 tests) | `run-sharded.js` | 500 → 400 | Dynamic sharding |
| `GuiceModule.java` | Absorbed into fixtures | 40 → 0 | Not needed |
| `CredentialDataProvider.java` | **Not ported** | 80 → 0 | By design |
| — (new) | `src/auth/auth-manager.ts` | — → 150 | Session reuse |
| — (new) | `src/auth/global-setup.ts` | — → 68 | Health check + env validation |
| — (new) | `src/utils/Logger.ts` | — → 245 | Enterprise logger |
| — (new) | `src/utils/api-helper.ts` | — → 319 | Enterprise API client |
| — (new) | `src/pages/base/BasePage.ts` | — → 437 | Enterprise base page |
| — (new) | `src/data/file-lock.ts` | — → 135 | Cross-process safety |

**Total:** ~2800 lines Java → ~2500 lines TypeScript (but with MORE features)

---

## 14. Phase-by-Phase: How the Framework Was Built

### Phase 1: Foundation Analysis
- Reviewed 3 existing frameworks (TestNG+POM, Selenium+Cucumber, Playwright+Cucumber)
- Mapped execution entry points, parallel strategies, driver management, hooks, reporting
- **Key finding:** Selenium+Cucumber was `parallel=false` — not actually parallel
- **Decision:** Use Playwright's native worker model + feature-level sharding

### Phase 2: Execution Engine
- Built `run-sharded.js` with greedy load-balancing algorithm
- Built `merge-reports.js` for blob report merging + failure extraction
- Built `rerun-failed.js` for failure retry from rerun.txt
- Tag expression parser supporting `and`/`or`/`not`

### Phase 3: Project Structure & Configuration
- Created `playwright.config.ts` with team-based path resolution + BDD config
- Per-environment config files (dev.env, staging.env, uat.env, prod.env)
- `framework.config.ts` with 11 teams, tag taxonomy, timeouts
- `tsconfig.json` with path aliases (@core/*, @teams/*, @config/*)
- Scaffolded all 11 team directories

### Phase 4: TestRail Integration
- Ported `APIClient.java` → `testrail-api-client.ts` (with retry)
- Ported `TestRailUtil.java` → `testrail-util.ts` (create runs, report results)
- Supported all 3 Java tag formats: `@TestRail_12345`, `@TestRail-C12345`, `@C12345`

### Phase 5: Data Layer
- Ported `DataService.java` (1405 lines) → `data-service.ts` (395 lines)
- Ported `StepsBase.java` → `test-context.ts` (setContext/getContext)
- Ported `PropertyMap.java` → `environment.ts` (config resolution)
- Created TypeScript interfaces for UserData, Location, EmployeeData
- Added `getUILoginUserBy(userType)` — the key Cucumber login method

### Phase 6: Fixtures Wiring
- Created `test-fixtures.ts` with TestContext, Logger, Page Objects
- Fixture lifecycle: create → populate → use → cleanup

### Phase 7: Enterprise Upgrades
- **Auth/Session Reuse:** Idempotent login in Background step, shared BrowserContext per feature (not per scenario), session carries across scenarios in serial mode
- **Enterprise Logger:** Structured JSON, correlation IDs, 5 log levels, step timing, sensitive masking
- **Enterprise API Helper:** Retry with exponential backoff, 401 token refresh, typed ApiResult<T>
- **Enterprise BasePage:** 40+ methods, retry engine, auto-screenshot, soft assertions, table/iframe helpers
- **Cross-Process Data Safety:** File-based locking with stale detection
- **Docker:** Multi-stage build + docker-compose with per-browser and sharded services
- **GitHub Actions:** Quality gate → sharded tests → merge reports → rerun failures → Slack
- **Slack Notification:** Rich block messages with status, env, team, trigger, run link

### Phase 8: CI/CD & DevOps
- GitHub Actions workflow with manual trigger parameters
- Jenkins parameterized pipeline
- Docker + docker-compose for containerized execution
- Slack webhook notifications
- ESLint + Prettier + TypeScript strict mode

### Phase 9: Parallelism Modes
- Added `PARALLEL_MODE` env var: `feature` (default) | `scenario`
- Changed `fullyParallel: false` for feature-level parallelism (default)
- Created `run-split-scenarios.js` for tag-based scenario splitting
- Enhanced `run-sharded.js` with hybrid mode (`--split-feature` + `--split-tags`)
- Added per-shard output directory isolation via `SHARD_ID`
- Added `FEATURE_PATHS` override for split script
- Created `docs/PARALLEL_MODES.md` documentation

---

## 15. File-to-File Mapping

### Config Files
| File | Purpose |
|---|---|
| `playwright.config.ts` | Master Playwright config (team paths, BDD, reporters, browsers) |
| `tsconfig.json` | TypeScript config with path aliases and DOM types |
| `package.json` | Dependencies, scripts (test, docker, lint, format) |
| `.eslintrc.json` | ESLint rules (TypeScript recommended) |
| `.prettierrc` | Code formatting (single quotes, trailing commas, 100 width) |
| `.env.example` | All environment variables with documentation |
| `.gitignore` | Excludes: node_modules, reports, .auth, .locks, .features-gen |
| `.dockerignore` | Excludes for Docker builds |
| `.nvmrc` | Node.js version pin |

### Source Files (by layer)
| File | Layer | Purpose |
|---|---|---|
| `src/auth/auth-manager.ts` | Auth | Session reuse via Playwright storageState |
| `src/auth/global-setup.ts` | Auth | Health check + env validation (runs once, no pre-auth) |
| `src/auth/global-teardown.ts` | Auth | Cleanup sessions + locks (runs once) |
| `src/config/environment.ts` | Config | PropertyMap port — resolves env, enterprise, URLs |
| `config/env-manager.ts` | Config | Loads per-environment .env files |
| `config/framework.config.ts` | Config | Teams, tags, timeouts, report paths |
| `src/data/models.ts` | Data | TypeScript interfaces + ContextKey enum |
| `src/data/data-service.ts` | Data | DataService port — user/location selection |
| `src/data/test-context.ts` | Data | StepsBase port — context Map + DataService |
| `src/data/file-lock.ts` | Data | Cross-process file locking |
| `src/fixtures/test-fixtures.ts` | Fixture | Playwright fixture definitions |
| `src/pages/base/BasePage.ts` | Page | Enterprise base page (40+ methods) |
| `src/utils/Logger.ts` | Utility | Enterprise structured logger |
| `src/utils/api-helper.ts` | Utility | Enterprise API client with retry |
| `src/utils/wait-helper.ts` | Utility | Wait utilities |
| `src/utils/string-helper.ts` | Utility | String generation, formatting, masking |
| `src/utils/file-helper.ts` | Utility | JSON read/write, directory management |

### CI/CD Files
| File | Purpose |
|---|---|
| `.github/workflows/playwright-tests.yml` | GitHub Actions CI/CD pipeline |
| `ci/Jenkinsfile` | Jenkins parameterized pipeline |
| `ci/scripts/run-tests.sh` | Local CLI test runner |
| `ci/scripts/slack-notify.js` | Slack webhook notifier |
| `Dockerfile` | Multi-stage container build |
| `docker-compose.yml` | Service-based test execution |

### Execution Scripts
| File | Purpose |
|---|---|
| `scripts/run-sharded.js` | Feature-level sharding with greedy load balancing + hybrid mode |
| `scripts/run-split-scenarios.js` | Tag-based scenario splitting for long features |
| `scripts/merge-reports.js` | Blob report merger + failure extraction |
| `scripts/rerun-failed.js` | Failure retry from rerun.txt |

### Documentation Files
| File | Purpose |
|---|---|
| `docs/ARCHITECTURE.md` | Full framework architecture and deep dive |
| `docs/PARALLEL_MODES.md` | Feature-level and scenario-split parallelism modes |
| `docs/SHARDED_EXECUTION_GUIDE.md` | Sharded execution guide with CI/CD integration |
| `docs/DATA_LAYER.md` | Data layer deep dive (users, context, file locks) |
| `docs/FRAMEWORK_STRUCTURE.md` | Step-by-step file and folder walkthrough |
| `docs/BEST-PRACTICES.md` | Patterns and anti-patterns |
