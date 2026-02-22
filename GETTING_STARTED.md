# Getting Started - Complete Setup Guide

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- Node.js 18+ installed
- npm or yarn installed
- Git installed

### Step 1: Install Dependencies (2 minutes)

```bash
cd /Users/nishant/Documents/playwright-cucumber-legion-framework

# Install all dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

### Step 2: Verify Installation (1 minute)

```bash
# Check if everything is installed correctly
npx playwright --version
# Should output: Version 1.40.0 (or similar)

# Check if scripts are executable
ls -la scripts/*.js
# Should show executable permissions (x)
```

### Step 3: Run Your First Test (2 minutes)

```bash
# Generate BDD test files from features
npm run bdd:generate

# Run a simple test
npm test -- teams/sch/features/ui/scheduling.feature

# Or run all tests
npm test
```

---

## 📁 Project Structure

```
playwright-cucumber-legion-framework/
├── teams/                          # Team-specific tests
│   ├── sch/                       # Scheduling team
│   │   ├── features/
│   │   │   ├── ui/               # UI tests
│   │   │   │   └── scheduling.feature
│   │   │   └── api/              # API tests
│   │   ├── steps/                # Step definitions
│   │   ├── pages/                # Page objects
│   │   └── test-data/            # Test data
│   └── [other-teams]/
│
├── shared/                        # Shared utilities
│   ├── steps/                    # Common step definitions
│   ├── pages/                    # Common page objects
│   └── utils/                    # Utilities
│
├── src/                          # Core framework
│   ├── config/                   # Configuration
│   ├── fixtures/                 # Playwright fixtures
│   │   └── test-fixtures.ts
│   ├── pages/                    # Base page objects
│   │   ├── base/
│   │   │   └── BasePage.ts
│   │   └── auth/
│   │       └── LoginPage.ts
│   ├── steps/                    # Core step definitions
│   └── utils/                    # Core utilities
│       └── Logger.ts
│
├── scripts/                      # Execution scripts
│   ├── run-sharded.js           # Feature-level sharding
│   ├── merge-reports.js         # Report merging
│   └── rerun-failed.js          # Rerun failed tests
│
├── docs/                         # Documentation
│   ├── PARALLELIZATION_ANALYSIS.md
│   ├── SHARDED_EXECUTION_GUIDE.md
│   ├── CUCUMBER_TESTNG_VS_PLAYWRIGHT_BDD.md
│   └── PARALLELIZATION_APPROACHES_COMPARISON.md
│
├── reports/                      # Test reports (generated)
│   ├── merged/                   # Merged reports
│   └── rerun.txt                # Failed tests
│
├── blob-reports/                 # Blob reports (generated)
│
├── playwright.config.ts          # Playwright configuration
├── package.json                  # Dependencies & scripts
├── tsconfig.json                # TypeScript configuration
├── .env                         # Environment variables
└── IMPLEMENTATION_SUMMARY.md    # Complete documentation

```

---

## 🎯 Common Commands

### Running Tests

```bash
# Run all tests
npm test

# Run specific team
TEAM=sch npm test

# Run with tag filter
npm test -- --grep @smoke

# Run in headed mode (see browser)
npm test -- --headed

# Run in debug mode
npm test -- --debug

# Run in UI mode (interactive)
npm test -- --ui
```

### Sharded Execution (Parallel)

```bash
# Run smoke tests with 15 workers
npm run test:sharded:smoke

# Run regression tests with 20 workers
npm run test:sharded:regression

# Custom execution
node scripts/run-sharded.js --tags "@smoke" --workers 15

# Dry run (see execution plan)
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

# View specific report
open reports/merged/html/index.html
```

### Failure Management

```bash
# Rerun failed tests
npm run rerun-failed

# Rerun with more retries
node scripts/rerun-failed.js --retries 3

# Check rerun file
cat reports/rerun.txt
```

### Debugging

```bash
# Show trace viewer
npx playwright show-trace trace.zip

# Generate code from browser actions
npx playwright codegen https://your-app.com

# Run specific test in debug mode
npm test -- teams/sch/features/ui/scheduling.feature --debug

# Run in UI mode (best for debugging)
npm test -- --ui
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# .env
BASE_URL=https://staging.example.com
TEST_ENV=staging
TEAM=sch
HEADLESS=true
CI=false
```

### Playwright Configuration

Edit `playwright.config.ts`:

```typescript
export default defineConfig({
  testDir,
  fullyParallel: true,
  workers: process.env.CI ? 4 : 2,  // Adjust worker count
  retries: process.env.CI ? 2 : 1,   // Adjust retry count
  timeout: 60 * 1000,                // Test timeout

  use: {
    baseURL: process.env.BASE_URL || 'https://staging.example.com',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

---

## 📝 Writing Tests

### 1. Create a Feature File

```gherkin
# teams/sch/features/ui/scheduling.feature
@sch @scheduling @smoke
Feature: Schedule Management

  Background:
    Given I am logged in as a manager

  @positive
  Scenario: Create a new schedule
    Given I am on the schedules page
    When I create a schedule with name "Test Schedule"
    Then I should see the schedule "Test Schedule" in the list
    And the schedule status should be "Draft"

  @positive
  Scenario: Edit existing schedule
    Given I am on the schedules page
    And a schedule "Existing Schedule" exists
    When I edit the schedule "Existing Schedule"
    And I change the name to "Updated Schedule"
    Then I should see the schedule "Updated Schedule" in the list
```

### 2. Create Step Definitions

```typescript
// teams/sch/steps/scheduling.steps.ts
import { Given, When, Then } from '@cucumber/cucumber';
import { test, expect } from '../../../src/fixtures/test-fixtures';

Given('I am on the schedules page', async ({ page, schedulePage }) => {
  await schedulePage.goto();
});

When('I create a schedule with name {string}',
  async ({ schedulePage }, name: string) => {
    await schedulePage.createSchedule(name);
});

Then('I should see the schedule {string} in the list',
  async ({ schedulePage }, name: string) => {
    const isVisible = await schedulePage.isScheduleVisible(name);
    expect(isVisible).toBeTruthy();
});
```

### 3. Create Page Object

```typescript
// teams/sch/pages/SchedulePage.ts
import { Page } from '@playwright/test';
import { BasePage } from '../../../src/pages/base/BasePage';

export class SchedulePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto('/schedules');
  }

  async createSchedule(name: string) {
    await this.page.click('[data-testid="create-schedule-btn"]');
    await this.page.fill('[data-testid="schedule-name-input"]', name);
    await this.page.click('[data-testid="save-btn"]');
  }

  async isScheduleVisible(name: string): Promise<boolean> {
    const locator = this.page.locator(`text=${name}`);
    return await locator.isVisible();
  }
}
```

### 4. Generate BDD Tests

```bash
# Generate Playwright test files from feature files
npm run bdd:generate
```

### 5. Run Your Tests

```bash
# Run specific feature
npm test -- teams/sch/features/ui/scheduling.feature

# Run with tag
npm test -- --grep @smoke

# Run in UI mode
npm test -- --ui
```

---

## 🎓 Best Practices

### 1. Feature File Organization

**✅ Good:**
```
teams/sch/features/
  scheduling/
    create-schedule.feature     # 5-8 scenarios
    edit-schedule.feature       # 4-6 scenarios
    delete-schedule.feature     # 3-5 scenarios
```

**❌ Bad:**
```
teams/sch/features/
  scheduling.feature  # 100 scenarios (too large!)
```

### 2. Scenario Independence

**✅ Good:**
```gherkin
Scenario: Create user
  Given I generate unique user data
  When I create a user
  Then user should exist
```

**❌ Bad:**
```gherkin
Scenario: Create user
  When I create user "john@example.com"

Scenario: Edit user
  When I edit user "john@example.com"  # Depends on previous!
```

### 3. Tag Strategy

```gherkin
@sch @scheduling @smoke @P0
Feature: Schedule Management

  @positive
  Scenario: Create schedule

  @negative @edge-case
  Scenario: Invalid schedule data
```

**Tag Hierarchy:**
- `@team-name` - Team ownership
- `@feature-area` - Feature category
- `@smoke` / `@regression` - Suite type
- `@P0` / `@P1` / `@P2` - Priority
- `@positive` / `@negative` - Test type

---

## 🔄 CI/CD Integration

### GitHub Actions

Create `.github/workflows/test.yml`:

```yaml
name: Playwright Tests

on:
  push:
    branches: [master, feature]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 60

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run tests
        run: npm run test:sharded:smoke

      - name: Merge reports
        if: always()
        run: npm run merge-reports:failures

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-report
          path: reports/merged/html/
          retention-days: 30
```

### Jenkins

Create `Jenkinsfile`:

```groovy
pipeline {
    agent any

    environment {
        NODE_VERSION = '20'
    }

    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
                sh 'npx playwright install --with-deps chromium'
            }
        }

        stage('Test') {
            steps {
                sh 'npm run test:sharded:smoke'
            }
        }

        stage('Report') {
            steps {
                sh 'npm run merge-reports:failures'
            }
        }
    }

    post {
        always {
            publishHTML([
                reportDir: 'reports/merged/html',
                reportFiles: 'index.html',
                reportName: 'Test Report'
            ])
            junit 'reports/merged/junit.xml'
        }
    }
}
```

---

## 🐛 Troubleshooting

### Issue: "playwright command not found"

```bash
# Install Playwright globally
npm install -g @playwright/test

# Or use npx
npx playwright --version
```

### Issue: "No tests found"

```bash
# Generate BDD tests
npm run bdd:generate

# Check if feature files exist
ls -la teams/**/features/**/*.feature
```

### Issue: "Browser not found"

```bash
# Install browsers
npx playwright install chromium

# Or install all browsers
npx playwright install
```

### Issue: "Permission denied" for scripts

```bash
# Make scripts executable
chmod +x scripts/*.js
```

### Issue: Tests are slow

```bash
# Reduce worker count
npm test -- --workers=5

# Or adjust in playwright.config.ts
workers: 5
```

---

## 📚 Next Steps

1. **Read Documentation:**
   - [SHARDED_EXECUTION_GUIDE.md](docs/SHARDED_EXECUTION_GUIDE.md) - Complete guide
   - [PARALLELIZATION_ANALYSIS.md](docs/PARALLELIZATION_ANALYSIS.md) - Architecture details
   - [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Full summary

2. **Explore Examples:**
   - Check `teams/sch/features/` for example feature files
   - Check `src/pages/` for page object examples
   - Check `src/steps/` for step definition examples

3. **Customize:**
   - Update `.env` with your environment URLs
   - Add your team directories under `teams/`
   - Create your feature files and page objects

4. **Run Tests:**
   ```bash
   # Start with dry run
   npm run test:dry-run

   # Run smoke tests
   npm run test:sharded:smoke

   # View reports
   npm run report:open
   ```

---

## 🎉 You're Ready!

Your framework is now set up and ready to use. Start by:

1. ✅ Creating your feature files in `teams/your-team/features/`
2. ✅ Writing step definitions in `teams/your-team/steps/`
3. ✅ Creating page objects in `teams/your-team/pages/`
4. ✅ Running tests with `npm test` or `npm run test:sharded:smoke`

**Happy Testing!** 🚀

---

## 📞 Support

For issues or questions:
- Check the documentation in `docs/`
- Review examples in `teams/sch/`
- Refer to [Playwright Documentation](https://playwright.dev)
- Refer to [playwright-bdd Documentation](https://vitalets.github.io/playwright-bdd)
