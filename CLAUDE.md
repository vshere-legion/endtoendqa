# CLAUDE.md — Project Intelligence for Claude Code

## Project Overview

Enterprise Playwright + Cucumber BDD test automation framework (v2.0.0) for the **Legion** workforce management platform. Supports 15-20 parallel workers, feature-level sharded execution, multi-team test organization, and session reuse.

## Tech Stack

- **Runtime:** Node.js >=18 (prefer 20.x) — pinned in `.nvmrc`
- **Language:** TypeScript 5.3 (strict mode — `noImplicitAny`, `strictNullChecks`, `noImplicitReturns`)
- **Test Framework:** Playwright 1.40 + playwright-bdd 6.1 + Cucumber 10
- **CI/CD:** GitHub Actions (`.github/workflows/playwright-tests.yml`), Jenkins (`ci/Jenkinsfile`), Docker
- **Linting:** ESLint 8 + Prettier 3
- **Target:** ES2022, Module: NodeNext

## Project Structure

```
config/                    # Environment configs & framework constants
  environments/            # dev.env, staging.env, rc.env, rel.env
  env-manager.ts           # Dynamic env loader with validation
  env.config.json          # Environment configuration map
  framework.config.ts      # Teams, tags, timeouts, browsers constants
  testrail.config.json     # TestRail integration config
src/                       # Core framework
  auth/                    # global-setup.ts (health checks), global-teardown.ts, auth-manager.ts
  config/                  # environment.ts, index.ts
  data/                    # data-service.ts, test-context.ts, file-lock.ts, models.ts
  fixtures/                # test-fixtures.ts (Playwright BDD fixtures)
  integrations/testrail/   # TestRail API client, hooks, utils
  pages/                   # page-manager.ts, base/BasePage.ts, auth/LoginPage.ts, dashboard/DashboardPage.ts
  steps/auth/              # login.steps.ts
  utils/                   # wait-helper.ts, file-helper.ts, string-helper.ts, api-helper.ts, Logger.ts
shared/                    # Team-agnostic shared components
  api/                     # BaseAPI.ts
  bootstrap/               # seed-data.json
  fixtures/                # Shared fixtures
  pages/                   # BasePage.ts, LoginPage.ts
  steps/                   # auth.steps.ts (idempotent login + credential resolution)
  utils/                   # date.util.ts, string.util.ts
teams/                     # Team-specific tests
  sch/                     # Scheduling team (primary, most mature — 564KB+ of active code)
  TNP/                     # Time & Pay
  PLT-Core/                # Platform Core
  PLT-Int/                 # Platform Integration
  PLT-Ops/                 # Platform Ops
  LRB/                     # Labor Budgeting
  EV-Com/                  # Enterprise Visibility — Common
  EV-LIP/                  # Enterprise Visibility — LIP
  EV-ELM/                  # Enterprise Visibility — ELM
  GENAI/                   # GenAI
  EPR/                     # Enterprise Reporting
  ta/                      # Test Archive
  platform/                # Platform
scripts/                   # Execution & scaffolding scripts
  run-sharded.js           # Feature-level sharded execution with greedy load balancing
  run-split-scenarios.js   # Tag-based scenario splitting for long features
  merge-reports.js         # Merge shard reports, capture failures
  rerun-failed.js          # Rerun failed tests from rerun.txt
  create-team.js           # Scaffold new team directory structure
  create-feature.js        # Scaffold new feature files
  bootstrap.js             # Framework bootstrap
ci/                        # Jenkins CI
  Jenkinsfile              # Pipeline definition
  scripts/run-tests.sh     # Test execution wrapper
  scripts/slack-notify.js  # Slack notification integration
.github/workflows/         # GitHub Actions pipeline
  playwright-tests.yml     # GHA workflow
docs/                      # Comprehensive documentation (316KB, 12 files)
test-data/users/           # Environment-specific user data JSONs
reports/                   # Generated: html, json, junit, cucumber, screenshots
.features-gen/             # Generated: playwright-bdd spec files (do NOT edit)
```

### Team Directory Convention

Each team follows this structure:
```
teams/<TEAM>/
  features/ui/             # UI .feature files
  features/api/            # API .feature files
  pages/                   # Page objects
  steps/                   # Step definitions
  test-data/               # Team-specific test data & credentials
  api/                     # API clients
  utils/                   # Team utilities
  config.ts                # Team-specific configuration
```

## Key Commands

```bash
# Core test execution
npm test                         # BDD generate + run all tests
npm run test:chromium            # Run chromium only
npm run test:firefox             # Run Firefox only
npm run test:webkit              # Run WebKit only
npm run test:headed              # Run with visible browser (HEADED=true)
npm run test:debug               # Playwright debug mode
npm run test:ui                  # Playwright UI mode
npm run test:smoke               # P1-Critical tests only

# Parallel & sharded execution
npm run test:parallel            # Run with 8 workers
npm run test:feature-parallel    # Feature-level parallel (default mode)
npm run test:split               # Tag-based scenario splitting
npm run test:sharded             # Feature-level sharded execution
npm run test:sharded:smoke       # Sharded + @P1-Critical (15 workers)
npm run test:sharded:regression  # Sharded + @Regression (20 workers)
npm run test:dry-run             # Dry run (shows shard distribution)

# Reporting
npm run merge-reports            # Merge shard reports
npm run merge-reports:failures   # Merge + capture failures
npm run rerun-failed             # Rerun failed tests from rerun.txt
npm run report:open              # Open HTML report in browser

# Code quality
npm run lint                     # ESLint check
npm run lint:fix                 # ESLint auto-fix
npm run format                   # Prettier format all .ts
npm run format:check             # Prettier check
npm run typecheck                # TypeScript type check
npm run clean                    # Remove generated files & reports

# Docker
npm run docker:test              # Run tests in Docker
npm run docker:build             # Build Docker image

# Setup
npm run playwright:install       # Install browsers with deps
```

## Path Aliases (tsconfig)

```
@core/*       → src/*
@teams/*      → teams/*
@config/*     → config/*
@shared/*     → shared/*
@test-data/*  → test-data/*
```

## Playwright Configuration

Key settings in `playwright.config.ts`:
- **Environment:** `TEST_ENV` (default: `dev`) — loads from `config/environments/<env>.env`
- **Team filter:** `TEST_TEAM` (default: `all`) — filters features to a specific team
- **Type filter:** `TYPE` (default: `all`) — `ui`, `api`, or `all`
- **Parallel mode:** `PARALLEL_MODE` (default: `feature`) — `feature` or `scenario`
- **Workers:** `WORKERS` (default: CI=4, local=2)
- **Retries:** `RETRY_COUNT` (default: CI=2, local=1)
- **Timeout:** 60s default, 10s expect
- **Viewport:** 1920x1080
- **Reporters:** list, html, json, junit, cucumberReporter (html + json)
- **Artifacts:** trace on-first-retry, screenshot only-on-failure, video on-first-retry
- **Step paths:** `<TEAM>/steps/**/*.ts` + `shared/steps/**/*.ts` + `src/steps/**/*.ts`

## Architecture Patterns

### Parallelism
- **Feature-level parallelism** is the default (`PARALLEL_MODE=feature`). Each feature file runs on one worker; scenarios inside run sequentially sharing a BrowserContext.
- **Scenario-level** (`PARALLEL_MODE=scenario`) is only used internally by `run-split-scenarios.js`.
- Do NOT break feature-level isolation — scenarios within a feature share browser state by design.

### Browser & Page Context Sharing
- Scenarios within a feature share the same `BrowserContext` and `Page` instance — browser state (cookies, localStorage, DOM) carries forward naturally.
- Each feature uses a `Background:` block with an idempotent login step (e.g., `Given I am logged in as "Admin"`). The step checks if already authenticated and only logs in if needed.
- No global pre-authentication or `storageState` files — each feature manages its own session lifecycle through its Background/Given steps.
- When a new feature starts on a worker, a fresh `BrowserContext` is created (clean slate).
- Global setup (`src/auth/global-setup.ts`) performs health checks only — no pre-auth.
- Never bypass the Background login pattern — every feature must have a login step in its Background block.

### BDD Flow
- `.feature` files → `npx bddgen` → `.features-gen/*.spec.ts` → Playwright runs the generated specs.
- Step definitions bind via `playwright-bdd`'s `defineBddConfig()` in `playwright.config.ts`.
- Never edit files in `.features-gen/` — they are auto-generated.

### Sharded Execution
- `scripts/run-sharded.js` uses a greedy load-balancing algorithm to distribute features across workers.
- Each shard gets its own output dir: `.features-gen-{SHARD_ID}` to avoid collisions.
- Reports from shards are merged by `scripts/merge-reports.js`.

### Data Layer (`src/data/`)
- `data-service.ts` — credential lookup with group-scoped resolution (role + test class → credential key)
- `test-context.ts` — cross-scenario data sharing within a feature via `setContext()`/`getContext()`
- `file-lock.ts` — parallel access coordination for shared resources
- `models.ts` — TypeScript type definitions for data models

## Coding Conventions

- **TypeScript strict mode** — no `any` types, no implicit returns.
- **Page Object Model** — all page interactions go through page objects in `pages/` directories.
- **Step definitions** — use Given/When/Then from `playwright-bdd`. Keep steps reusable across teams by putting shared ones in `shared/steps/`.
- **Tag taxonomy** — priorities: `@P1-Critical`, `@P2-High`, `@P3-Medium`, `@P4-Low`. Suites: `@Regression`, `@NewFeature`. Team tags: `@Team-{TEAM}`. Credential groups: `@group-{GroupName}` (e.g., `@group-P2PLGTest`) — used by auth steps for group-scoped credential lookup via DataService.
- **Environment variables** over hardcoded values — use `config/env-manager.ts` and `.env` files.
- **No shared mutable state** between workers — each worker process is fully isolated.

## Environment Configuration

Valid environments: `dev`, `staging`, `rc`, `uat`, `prod`

Required env vars per environment file: `BASE_URL`, `API_BASE_URL`, `TIMEOUT`

Set environment: `TEST_ENV=staging npm test`

**Important:** `TEST_ENV=rc` must be set for running tests — the `.env` file points to `rc-enterprise.dev.legion.work` but env-manager defaults to `dev` which is unreachable.

## Teams

Active teams: TNP, SCH, PLT-Core, PLT-Int, PLT-Ops, LRB, EV-Com, EV-LIP, EV-ELM, GENAI, EPR

Additional: `ta` (Test Archive), `platform` (Platform)

Run a specific team: `TEST_TEAM=SCH npm test`

## Common Pitfalls

- Always run `npx bddgen` (or `npm run bddgen`) after adding/modifying `.feature` files — Playwright runs the generated specs, not the feature files directly.
- When adding a new team, use `node scripts/create-team.js <TEAM>` to scaffold the directory structure.
- When adding a new feature, use `node scripts/create-feature.js <team> <feature-name>` to scaffold correctly.
- Docker containers need `shm_size: 2gb` for Playwright browser processes — this is already set in `docker-compose.yml`.
- The `reports/`, `.features-gen*/`, `test-results/`, `logs/`, `.auth/`, and `.locks/` directories are generated artifacts — do not commit them.
- Pre-existing TypeScript errors in `src/pages/auth/LoginPage.ts` and `src/integrations/testrail/` — not related to P2P test work.

## SCH (Scheduling) Team — Primary Active Team

The SCH team is the most mature, with P2P (Peer-to-Peer) schedule testing as its primary focus.

### Page Objects (`teams/sch/pages/` — 10 files)

| Page Object | Size | Purpose |
|---|---|---|
| `SchedulePage.ts` | 176KB | Battle-tested main schedule page — the foundation |
| `ScheduleBasePage.ts` | 9.6KB | Base class for all SCH page objects |
| `P2PSchedulePage.ts` | 35KB | P2P navigation, schedule generation, group by, filter, view toggle |
| `P2PSmartCardPage.ts` | 18.4KB | Smart card carousel verification (compliance, budget, staffing) |
| `P2PShiftPage.ts` | 28.5KB | Shift selection, drag & drop, assignment, editing |
| `P2PAnalyticsPage.ts` | 20.3KB | DM/Region views, analytics tables, district summary |
| `P2PLocationSelectorPage.ts` | 13.5KB | Location switching, district selection, peer navigation |
| `DashboardPageAdapter.ts` | 8.1KB | Dashboard adapter |
| `LoginPageAdapter.ts` | 4.1KB | Login adapter |

All P2P page objects extend `BasePage` from `ScheduleBasePage.ts`. P2P page objects compose with `SchedulePage.ts` rather than duplicating its functionality.

### Step Definitions (`teams/sch/steps/` — 7 files)

| File | Size | Purpose |
|---|---|---|
| `p2p-schedule.steps.ts` | 22.8KB | Schedule generation, navigation, smart cards, group by, filter, copy |
| `p2p-shifts.steps.ts` | 35.7KB | Shift operations, open shifts, assignment, drag & drop, editing |
| `p2p-employee.steps.ts` | 8.6KB | Employee/staffing steps |
| `p2p-permissions.steps.ts` | 9.5KB | Permission validation |
| `p2p-navigation.steps.ts` | 7.2KB | Navigation flows |
| `schedule-shift-flow.steps.ts` | 18.8KB | Shift flow scenarios |
| `hooks.ts` | ~300B | Test hooks |

### Feature Files (`teams/sch/features/ui/` — 16 files)

P2P features: `p2p-schedule-generation`, `p2p-smart-cards`, `p2p-drag-drop-shifts`, `p2p-drag-drop-employees`, `p2p-shift-assignment`, `p2p-shift-editing`, `p2p-open-shifts`, `p2p-new-shift-creation`, `p2p-permissions`, `p2p-peer-locations`, `p2p-dm-views`, `p2p-copy-schedule`, `p2p-budget`, `p2p-employee-self-service`, `p2p-master-template`

Non-P2P: `schedule-shift-flow`

### SCH Team Utilities

```
teams/sch/api/schedule-api-client.ts   # API client for schedule operations
teams/sch/utils/config-manager.ts      # SCH-specific configuration
teams/sch/utils/credential-manager.ts  # Credential management
teams/sch/utils/helpers.ts             # Utility helpers
teams/sch/utils/logger.ts              # Logging
teams/sch/config.ts                    # Team configuration
```

## P2P (Peer-to-Peer Location) Test Architecture

### Credential Resolution Pattern
P2P tests use a role + test class pattern to resolve credentials:
1. Feature Background sets test class: `Given the test class is "P2PLGTest"`
2. Login step uses role: `Given I am logged in as "InternalAdmin"`
3. Auth resolves key: `InternalAdminOfP2PLGTest` → looks up `teams/sch/test-data/credentials.json`
4. Returns `{ username, password, location }` from the JSON array entry

### Cross-Scenario Data Sharing
Scenarios within a feature share `TestContext` for data passing:
- `testContext.setContext('testClassName', 'P2PLGTest')` — set in Background
- `testContext.getContext<string>('locationName')` — retrieved in later steps
- `testContext.setContext('shiftDetails', details)` — store shift data for copy/compare

### Key Selectors (Ported from Selenium)
Real CSS selectors ported from `ConsoleScheduleNewUIPage.java`, `ConsoleSmartCardPage.java`, `ConsoleScheduleShiftTablePage.java`, `ConsoleLocationSelectorPage.java`:
- Schedule shifts: `.week-schedule-shift-wrapper`, `[data-day-index="N"]`
- Smart cards: `div.card-carousel-card`, `.card-carousel-arrow-left/right`
- Location selector: `lg-select[search-hint='Search Location']`
- Analytics: `.analytics-new-table-group-row-open`, `[jj-switch-when="cells.CELL_BUDGET_HOURS"]`

### P2P Parent vs Peer Location Level
The P2P schedule has two distinct UI states:

| Aspect | P2P Parent (Location Group) | Individual Peer (e.g. Peer001) |
|--------|----------------------------|-------------------------------|
| **Navigation** | Logged in user lands here | Use `P2PLocationSelectorPage.changeLocation('Peer001')` |
| **Smart cards** | NO carousel — only "In Progress" / "Location Group" status | Full carousel: Schedule Version, Action Required, Weather, Compliance*, Staffing*, Coverage* |
| **Schedule actions** | Overview only | Create, Edit, Delete, Publish, Save |
| **Detection** | Text "Peer001"/"Peer02" visible, or "View Group Schedule" link | No peer location rows in grid |

\* Compliance/Staffing/Coverage cards only appear when the schedule has violations, staffing gaps, or coverage issues. They may not be present in a clean auto-generated schedule.

### P2P UI Patterns Learned
- **Location selector dropdown** (`lg-select[search-hint='Search Location']`) is the correct way to navigate between locations — clicking peer names in the schedule grid only toggles section expand/collapse.
- **React Select dropdowns** (Work Role, Location, Assignment): click the `.react-select__placeholder` parent container (not the hidden input) to open. At Peer001 level, Location field is auto-filled; Assignment is required.
- **Breaks checkbox** does NOT exist in the Create Shift form at individual peer locations — guard with `isVisible()` before interacting.
- **Edit mode**: After shift creation, must call `clickSaveAndConfirm()` to save edits and exit edit mode. Smart cards only render in view mode.
- **Day view**: Smart card carousel uses different CSS structure — `div.card-carousel-card` may return 0, but cards are visible. Check for "Schedule v0" or "Action Required" text as fallback.
- **Scenarios 3-4** (buttons/navigation): "Generate", "Copy Schedule", "Print" buttons don't exist in the new React UI — these need reworking.

### Running P2P Tests
```bash
# Run specific P2P feature
TEST_ENV=rc npx bddgen && npx playwright test --grep "p2p-schedule-generation" --project chromium

# Run all P2P features
TEST_ENV=rc npx bddgen && npx playwright test --grep "@p2p" --project chromium

# Incremental development with @wip tag
TEST_ENV=rc npx bddgen && npx playwright test --grep "@wip" --project chromium
```

## Documentation (`docs/` — 12 files, 316KB)

| Document | Content |
|---|---|
| `ARCHITECTURE.md` | Full architecture deep dive, design decisions |
| `FRAMEWORK_STRUCTURE.md` | File/folder walkthrough |
| `BEST-PRACTICES.md` | Patterns and anti-patterns |
| `DATA_LAYER.md` | Test data flow, credential resolution |
| `SHARDED_EXECUTION_GUIDE.md` | Sharded execution, load balancing, CI/CD |
| `PARALLEL_MODES.md` | Feature-level vs scenario-level parallelism |
| `PARALLELIZATION_ANALYSIS.md` | 3-framework parallelization analysis |
| `PARALLELIZATION_APPROACHES_COMPARISON.md` | Approach comparison reference |
| `MIGRATION_GUIDE.md` | Port from Selenium + Cucumber |
| `CUCUMBER_TESTNG_VS_PLAYWRIGHT_BDD.md` | Framework comparison |
| `TESTNG_ARCHITECTURE_CLARIFICATION.md` | TestNG reference |
| `SETUP.md` | Setup instructions |

Additional root docs: `README.md`, `GETTING_STARTED.md`, `IMPLEMENTATION_SUMMARY.md`

## Docker Configuration

- `Dockerfile` — Multi-stage build for containerized test execution
- `docker-compose.yml` — Service profiles: `test-chromium`, `test-all`, `test-smoke`, `test-team`, `sharded`
- `shm_size: 2gb` required for Playwright browser processes (already configured)

## Local Framework Paths (Reference)

Use these as the primary references whenever you propose architecture, utilities, test data design, reporting, parallel execution, or migration plans.

### 1) Selenium + Cucumber (TA Framework)
Path: `/Users/nishant/Documents/CucumberTA`

What to review: hooks, runners, tag execution, parallelization, driver/session management, reporting (json/html), rerun handling, config/env handling, test data utilities and patterns.

### 2) Selenium + POM + TestNG Framework
Path: `/Users/nishant/Documents/SeleniumAutomation/console-ui-selenium`

What to review: TestNG parallel execution model (class/test/method), base test, driver factory, listeners, retry/rerun strategy, page object conventions, test data design and utilities.

### Instruction to Claude
When asked for guidance, align recommendations to patterns used in the above frameworks and propose reusable solutions applicable across all projects. You can reference these local paths directly.

## Testing Changes

After modifying framework code, verify with:
```bash
npm run typecheck && npm run lint && npm run test:smoke
```
