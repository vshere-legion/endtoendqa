# Getting Started - Complete Setup Guide

## Quick Start (5 Minutes)

### Prerequisites
- Node.js 18+ installed (prefer 20.x)
- npm installed
- Git installed

### Step 1: Install Dependencies

```bash
cd playwright-automation-framework

# Install all dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

### Step 2: Verify Installation

```bash
# Check Playwright version
npx playwright --version
# Should output: Version 1.50.0 (or similar)

# Check TypeScript
npx tsc --version
# Should output: Version 5.7.x

# Check if scripts are executable
ls -la scripts/*.js
```

### Step 3: Configure Environment

```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your settings (minimum required):
# TEST_ENV=rc
# ENTERPRISE=LegionCoffee
```

**Important:** `TEST_ENV=rc` must be set for running tests. The default `dev` environment is unreachable.

### Step 4: Run Your First Test

```bash
# Generate BDD test files from features
npm run bddgen

# Run all tests
npm test

# Or run a specific team
TEST_TEAM=sch npm test
```

---

## Project Structure

```
playwright-automation-framework/
├── config/                         # Environment configs & framework constants
│   ├── environments/               # dev.env, staging.env, rc.env, uat.env, prod.env
│   ├── env-manager.ts              # Dynamic env loader with validation
│   ├── env.config.json             # Environment configuration map
│   ├── framework.config.ts         # Teams, tags, timeouts, browsers
│   └── testrail.config.json        # TestRail integration config
│
├── src/                            # Core framework
│   ├── auth/                       # Global setup (health checks), teardown
│   ├── config/                     # Environment config, reporters
│   ├── data/                       # DataService, TestContext, FileLock, models
│   ├── fixtures/                   # test-fixtures.ts (serial + default modes)
│   ├── integrations/testrail/      # TestRail API integration
│   ├── pages/                      # Base page objects (BasePage, LoginPage, DashboardPage)
│   ├── steps/                      # Core step definitions
│   └── utils/                      # Logger, wait-helper, api-helper, file-helper
│
├── shared/                         # Team-agnostic shared components
│   ├── api/                        # BaseAPI.ts
│   ├── pages/                      # Shared BasePage, LoginPage
│   ├── steps/                      # auth.steps.ts (idempotent login)
│   └── utils/                      # date.util.ts, string.util.ts
│
├── teams/                          # Team-specific tests
│   ├── sch/                        # Scheduling (most mature)
│   │   ├── features/ui/            # 16 UI feature files
│   │   ├── steps/                  # 7 step definition files
│   │   ├── pages/                  # 9 page objects
│   │   ├── api/                    # Schedule API client
│   │   ├── utils/                  # Config, credentials, helpers
│   │   └── config.ts              # Team config
│   ├── ta/                         # Time & Attendance
│   ├── EPR/                        # Enterprise Reporting
│   └── ...                         # PLT-Core, PLT-Int, PLT-Ops, LRB, EV-Com, EV-LIP, EV-ELM, GENAI
│
├── test-data/users/                # Environment-specific credential JSONs
│   └── user_loc_{ENTERPRISE}_{ENV}.json
│
├── scripts/                        # Execution & scaffolding scripts
│   ├── run-sharded.js              # Feature-level sharded execution
│   ├── run-split-scenarios.js      # Tag-based scenario splitting
│   ├── merge-reports.js            # Merge shard reports
│   ├── rerun-failed.js             # Rerun failed tests
│   ├── create-team.js              # Scaffold new team
│   └── create-feature.js           # Scaffold new feature
│
├── docs/                           # Comprehensive documentation (12 files)
├── reports/                        # Generated: html, json, junit, cucumber
├── .features-gen/                  # Generated: playwright-bdd spec files (DO NOT EDIT)
├── playwright.config.ts            # Main Playwright config
├── package.json                    # Dependencies & scripts
├── tsconfig.json                   # TypeScript config (path aliases, strict mode)
└── .env.example                    # All environment variables documented
```

---

## Common Commands

### Running Tests

```bash
# Run all tests (generates BDD specs first)
npm test

# Run specific team
TEST_TEAM=sch npm test

# Run with tag filter
TEST_TAGS="@P1-Critical" npm test

# Run in headed mode (see browser)
HEADED=true npm test

# Run in debug mode
npm run test:debug

# Run in UI mode (interactive)
npm run test:ui

# Run specific browser
npm run test:chromium
npm run test:firefox
npm run test:webkit
```

### Sharded Execution (Parallel)

```bash
# Run smoke tests with 15 workers
npm run test:sharded:smoke

# Run regression tests with 20 workers
npm run test:sharded:regression

# Custom execution
node scripts/run-sharded.js --tags "@P1-Critical" --workers 15

# Dry run (see execution plan without running)
npm run test:dry-run
```

### Report Management

```bash
# Merge reports from sharded execution
npm run merge-reports

# Merge reports and capture failures
npm run merge-reports:failures

# Open HTML report
npm run report:open

# Rerun failed tests
npm run rerun-failed
```

### Code Quality

```bash
# TypeScript type check
npm run typecheck

# ESLint
npm run lint
npm run lint:fix

# Prettier
npm run format
npm run format:check

# All checks
npm run typecheck && npm run lint
```

---

## Configuration

### Environment Variables

Create a `.env` file in the root directory (see `.env.example` for all options):

```bash
# Environment
TEST_ENV=rc                     # dev, staging, rc, uat, prod
ENTERPRISE=LegionCoffee         # Enterprise name (maps to test data file)

# Test Selection
TEST_TEAM=all                   # Specific team or 'all'
TYPE=all                        # ui, api, or all
TEST_TAGS=@P1-Critical          # Cucumber tag expression

# Execution
HEADED=false                    # Show browser
WORKERS=2                       # Parallel workers (CI: 4)
RETRY_COUNT=1                   # Retries (CI: 2)
TIMEOUT=60000                   # Test timeout in ms

# Auth
AUTH_ROLES=Admin                # Comma-separated roles
FRESH_AUTH=false                # Clear stale sessions

# Logging
LOG_LEVEL=INFO                  # DEBUG, INFO, WARN, ERROR, FATAL
LOG_TO_FILE=true                # Write JSON logs to reports/logs/
```

### Playwright Configuration

The `playwright.config.ts` is env-var driven. Key settings:

| Setting | Env Var | Default |
|---------|---------|---------|
| Environment | `TEST_ENV` | `dev` |
| Team filter | `TEST_TEAM` or `TEAM` | `all` |
| Type filter | `TYPE` | `all` |
| Parallel mode | `PARALLEL_MODE` | `feature` |
| Workers | `WORKERS` | CI: 4, local: 2 |
| Retries | `RETRY_COUNT` | CI: 2, local: 1 |
| Timeout | `TIMEOUT` | 60000ms |
| Base URL | `BASE_URL` | `https://staging-enterprise.dev.legion.work/` |
| Viewport | — | 1920x1080 |

---

## Writing Tests

### 1. Create a Feature File

```gherkin
# teams/<team>/features/ui/<feature>.feature
@P2-High @Regression @Team-SCH @group-P2PLGTest
Feature: Schedule Management

  Background:
    Given I am logged in as "InternalAdmin"

  Scenario: Create schedule for next week
    Given I navigate to the schedule page
    When I create a schedule for next week
    Then the schedule should be generated successfully
```

**Tag taxonomy:**
- Priority: `@P1-Critical`, `@P2-High`, `@P3-Medium`, `@P4-Low`
- Suite: `@Regression`, `@NewFeature`
- Team: `@Team-{TEAM}` (e.g., `@Team-SCH`)
- Credential group: `@group-{GroupName}` (e.g., `@group-P2PLGTest`)
- Mode: `@mode:serial` (share browser state across scenarios)

### 2. Create Step Definitions

```typescript
// teams/<team>/steps/<feature>.steps.ts
import { Given, When, Then } from 'playwright-bdd';

Given('I navigate to the schedule page', async ({ page, pageManager }) => {
  const schedulePage = pageManager.get(SchedulePage);
  await schedulePage.navigateToSchedule();
});

When('I create a schedule for next week', async ({ page, pageManager }) => {
  const schedulePage = pageManager.get(SchedulePage);
  await schedulePage.navigateToNextWeek();
  await schedulePage.createSchedule();
});

Then('the schedule should be generated successfully', async ({ page }) => {
  await expect(page.locator('.schedule-generated')).toBeVisible();
});
```

### 3. Create Page Objects

```typescript
// teams/<team>/pages/<Page>.ts
import { Page } from '@playwright/test';
import { BasePage } from '@core/pages/base/BasePage';

export class SchedulePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigateToSchedule() {
    await this.navigate('/schedule');
  }

  async createSchedule() {
    await this.page.click('[data-testid="create-btn"]');
    await this.page.waitForSelector('.schedule-generated');
  }
}
```

### 4. Generate and Run

```bash
# Generate Playwright test files from feature files
npm run bddgen

# Run your tests
npm test

# Or run specific feature
npm test -- --grep "Schedule Management"
```

---

## Adding a New Team

Use the scaffolding script:

```bash
node scripts/create-team.js <TEAM>
```

This creates:
```
teams/<TEAM>/
  features/ui/
  features/api/
  pages/
  steps/
  test-data/
  api/
  utils/
  config.ts
  README.md
```

## Adding a New Feature

```bash
node scripts/create-feature.js <team> <feature-name>
```

---

## Troubleshooting

### "No tests found"
```bash
# Regenerate BDD spec files
npm run bddgen

# Check feature files exist
ls teams/*/features/**/*.feature
```

### "Browser not found"
```bash
npx playwright install chromium
# Or install all browsers:
npx playwright install --with-deps
```

### Tests timeout or fail on login
- Verify `TEST_ENV=rc` is set (not `dev`)
- Check that credential files exist in `test-data/users/`
- Verify the target environment is reachable

### TypeScript errors
```bash
npm run typecheck
# Known pre-existing errors in src/pages/auth/LoginPage.ts and src/integrations/testrail/
```

---

## Next Steps

1. Read the [Architecture docs](docs/ARCHITECTURE.md) for a full deep dive
2. Explore `teams/sch/` as the reference implementation
3. Review [Best Practices](docs/BEST-PRACTICES.md)
4. Check [Data Layer](docs/DATA_LAYER.md) for credential management
5. See [Sharded Execution Guide](docs/SHARDED_EXECUTION_GUIDE.md) for CI/CD

## Support

- Documentation: `docs/` directory (12 files, 316KB)
- Reference team: `teams/sch/` (most mature)
- [Playwright Documentation](https://playwright.dev)
- [playwright-bdd Documentation](https://vitalets.github.io/playwright-bdd)
