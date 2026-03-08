# Playwright + Cucumber BDD Framework

Enterprise-grade test automation framework (v2.1.0) for the Legion workforce management platform. Feature-level sharded execution with 15-20 parallel workers.

## Quick Start

```bash
# Install dependencies
npm install

# Install browsers
npx playwright install chromium

# Run tests
npm test

# Run sharded execution (15 workers, smoke tests)
npm run test:sharded:smoke
```

## Documentation

### Getting Started
- **[GETTING_STARTED.md](GETTING_STARTED.md)** — Complete setup guide
- **[docs/SETUP.md](docs/SETUP.md)** — Installation and environment configuration
- **[docs/FRAMEWORK_STRUCTURE.md](docs/FRAMEWORK_STRUCTURE.md)** — Step-by-step file and folder walkthrough

### Architecture & Design
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — Full framework architecture, design decisions, component deep dive
- **[docs/DATA_LAYER.md](docs/DATA_LAYER.md)** — How test data (users, passwords, locations) flows through the framework
- **[docs/BEST-PRACTICES.md](docs/BEST-PRACTICES.md)** — Patterns and anti-patterns for features, steps, page objects, and parallel execution

### Parallel Execution
- **[docs/PARALLEL_MODES.md](docs/PARALLEL_MODES.md)** — Feature-level parallelism + tag-based scenario splitting
- **[docs/SHARDED_EXECUTION_GUIDE.md](docs/SHARDED_EXECUTION_GUIDE.md)** — Sharded execution with CI/CD integration

### Migration & Reference
- **[docs/MIGRATION_GUIDE.md](docs/MIGRATION_GUIDE.md)** — Porting Selenium + Cucumber tests to this framework
- **[docs/PARALLELIZATION_ANALYSIS.md](docs/PARALLELIZATION_ANALYSIS.md)** — Three-framework parallelization analysis

## Project Structure

```
├── config/             # Environment configs & framework constants
├── src/                # Core framework (auth, data, fixtures, pages, utils)
├── shared/             # Team-agnostic shared components (pages, steps, utils)
├── teams/              # Team-specific tests (11 active teams)
│   ├── sch/            # Scheduling (primary, most mature)
│   ├── ta/             # Time & Attendance
│   ├── EPR/            # Enterprise Reporting
│   └── ...             # PLT-Core, PLT-Int, PLT-Ops, LRB, EV-Com, EV-LIP, EV-ELM, GENAI
├── test-data/          # Environment-specific user data JSONs
├── scripts/            # Execution & scaffolding scripts
├── ci/                 # Jenkins CI pipeline
├── .github/workflows/  # GitHub Actions pipeline
├── docs/               # Comprehensive documentation (12 files)
└── reports/            # Generated test reports
```

## Key Features

- Feature-level sharded execution (15-20 parallel workers) with greedy load balancing
- Shared BrowserContext within feature (scenarios share session for efficiency)
- Dual-mode fixtures: serial mode (`@mode:serial`) and default isolated mode
- Automatic failure recovery (screenshot + navigate to dashboard + continue)
- Idempotent login pattern (login once per feature, skip if already authenticated)
- Tag-based scenario splitting for long-running features
- Hybrid mode: shard features + split long ones in a single run
- Process isolation (zero shared state between workers)
- Unified DataService for credential resolution (role-based + group-scoped pool)
- Interactive HTML reports with trace viewer
- Automatic failure tracking and rerun (`rerun.txt`)
- CI/CD ready (GitHub Actions, Jenkins, Docker)
- TypeScript strict mode with full type safety

## Common Commands

```bash
# Run tests (default: feature-level parallel, scenarios sequential within)
npm test                              # All tests
TEST_TEAM=sch npm test                # Specific team
TEST_TAGS="@P1-Critical" npm test     # By tag
HEADED=true npm test                  # Show browser

# Parallel modes
npm run test:feature-parallel         # Explicit feature-level parallel
WORKERS=8 npm test                    # More workers

# Split a long feature by tags
npm run test:split -- --feature teams/sch/features/ui/overtime.feature --tags "@part1, @part2, @part3"
npm run test:split -- --feature <path> --tags "<groups>" --dry-run   # Preview plan

# Sharded execution (CI)
npm run test:sharded:smoke            # 15 workers, @P1-Critical
npm run test:sharded:regression       # 20 workers, @Regression
node scripts/run-sharded.js --workers 8 --dry-run  # Preview shard plan

# Hybrid: shard features + split a long one
node scripts/run-sharded.js --workers 8 \
  --split-feature teams/sch/features/ui/overtime.feature \
  --split-tags "overtime.feature:@part1,@part2,@part3"

# Reports
npm run merge-reports:failures        # Merge + capture failures
npm run rerun-failed                  # Rerun failed tests
npm run report:open                   # Open HTML report

# Code quality
npm run lint && npm run typecheck     # Lint + type check

# Debugging
npm test -- --debug                   # Debug mode
npx playwright show-trace trace.zip   # Trace viewer
```

## Performance

- **500 scenarios** across 50 features: ~70 minutes (15 workers) — **14x faster** than sequential
- **Session reuse** saves ~25-40 minutes per run (login once, not per scenario)
- **Shared session** within feature saves ~3-5 seconds per scenario (no re-login/re-navigation)
- **Tag-based splitting** turns a 60-minute bottleneck feature into ~20 minutes (3 groups)

## Writing Tests

1. Create feature file: `teams/<team>/features/ui/<feature>.feature`
2. Write step definitions: `teams/<team>/steps/<feature>.steps.ts`
3. Create page objects: `teams/<team>/pages/<Page>.ts`
4. Generate tests: `npm run bddgen`
5. Run: `npm test`

See [GETTING_STARTED.md](GETTING_STARTED.md) for details.

## Example

**Feature:**
```gherkin
@P1-Critical @Regression @Team-SCH @group-P2PLGTest
Feature: Schedule Management

  Background:
    Given I am logged in as "InternalAdmin"

  Scenario: Create schedule
    Given I navigate to the schedule page
    When I create a schedule for next week
    Then the schedule should be generated successfully
```

**Step Definition:**
```typescript
When('I create a schedule for next week', async ({ page, pageManager }) => {
  const schedulePage = pageManager.get(SchedulePage);
  await schedulePage.navigateToNextWeek();
  await schedulePage.createSchedule();
});
```

**Page Object:**
```typescript
export class SchedulePage extends ScheduleBasePage {
  async createSchedule() {
    await this.page.click('[data-testid="create-btn"]');
    await this.page.waitForSelector('.schedule-generated');
  }
}
```

## Configuration

Edit `playwright.config.ts` and `.env` file for customization. See [docs/SETUP.md](docs/SETUP.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branching model, PR process, and code standards.

## Support

- Documentation: `docs/` directory
- Examples: `teams/sch/` directory (most mature team)
- Issues: See troubleshooting in [GETTING_STARTED.md](GETTING_STARTED.md)
