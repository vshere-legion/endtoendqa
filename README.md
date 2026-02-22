# Playwright + Cucumber BDD Framework

Enterprise-grade test automation framework with feature-level sharded execution.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Install browsers
npx playwright install chromium

# Run tests
npm test

# Run sharded execution
npm run test:sharded:smoke
```

## Documentation

### Getting Started
- **[docs/FRAMEWORK_STRUCTURE.md](docs/FRAMEWORK_STRUCTURE.md)** - Step-by-step file and folder walkthrough (read this first)

### Architecture & Design
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Full framework architecture, design decisions, component deep dive, and build history
- **[docs/DATA_LAYER.md](docs/DATA_LAYER.md)** - How test data (users, passwords, locations) flows through the framework
- **[docs/BEST-PRACTICES.md](docs/BEST-PRACTICES.md)** - Patterns and anti-patterns for features, steps, page objects, and parallel execution

### Parallel Execution
- **[docs/PARALLEL_MODES.md](docs/PARALLEL_MODES.md)** - Feature-level parallelism + tag-based scenario splitting (Default & Special Case modes)
- **[docs/SHARDED_EXECUTION_GUIDE.md](docs/SHARDED_EXECUTION_GUIDE.md)** - Sharded execution with CI/CD integration

### Migration & Reference
- **[docs/MIGRATION_GUIDE.md](docs/MIGRATION_GUIDE.md)** - Porting Selenium + Cucumber tests to this framework
- **[docs/PARALLELIZATION_ANALYSIS.md](docs/PARALLELIZATION_ANALYSIS.md)** - Three-framework parallelization analysis

## 📁 Project Structure

```
├── teams/              # Team-specific tests
│   └── sch/           # Scheduling team example
├── src/               # Core framework
├── scripts/           # Execution scripts
├── docs/              # Documentation
└── reports/           # Test reports
```

## Key Features

- Feature-level sharded execution (15-20 parallel workers)
- Shared BrowserContext within feature (scenarios share session for efficiency)
- Automatic failure recovery (screenshot + navigate to dashboard + continue)
- Session reuse via storageState (login once, skip it forever)
- Tag-based scenario splitting for long-running features
- Hybrid mode: shard features + split long ones in a single run
- Process isolation (zero shared state between workers)
- Interactive HTML reports with trace viewer
- Automatic failure tracking and rerun
- CI/CD ready (GitHub Actions, Jenkins, Docker)
- TypeScript + type safety

## Common Commands

```bash
# Run tests (default: feature-level parallel, scenarios sequential within)
npm test                              # All tests
TEAM=sch npm test                     # Specific team
TEST_TAGS="@smoke" npm test           # By tag
HEADED=true npm test                  # Show browser

# Parallel modes
npm run test:feature-parallel         # Explicit feature-level parallel
WORKERS=8 npm test                    # More workers

# Split a long feature by tags
npm run test:split -- --feature teams/sch/features/ui/overtime.feature --tags "@part1, @part2, @part3"
npm run test:split -- --feature <path> --tags "<groups>" --dry-run   # Preview plan

# Sharded execution (CI)
npm run test:sharded:smoke            # 15 workers
node scripts/run-sharded.js --workers 8 --dry-run  # Preview shard plan

# Hybrid: shard features + split a long one
node scripts/run-sharded.js --workers 8 \
  --split-feature teams/sch/features/ui/overtime.feature \
  --split-tags "overtime.feature:@part1,@part2,@part3"

# Reports
npm run merge-reports:failures        # Merge + capture failures
npm run rerun-failed                  # Rerun failed tests
npm run report:open                   # Open HTML report

# Debugging
npm test -- --debug                   # Debug mode
npx playwright show-trace trace.zip   # Trace viewer
```

## Performance

- **500 scenarios** across 50 features → ~70 minutes (15 workers) — **14x faster** than sequential
- **Session reuse** saves ~25-40 minutes per run (login once, not per scenario)
- **Shared session** within feature saves ~3-5 seconds per scenario (no re-login/re-navigation)
- **Tag-based splitting** turns a 60-minute bottleneck feature into ~20 minutes (3 groups)

## 🎓 Writing Tests

1. Create feature file: `teams/your-team/features/ui/yourfeature.feature`
2. Write step definitions: `teams/your-team/steps/yourfeature.steps.ts`
3. Create page objects: `teams/your-team/pages/YourPage.ts`
4. Generate tests: `npm run bdd:generate`
5. Run: `npm test`

See [GETTING_STARTED.md](GETTING_STARTED.md) for details.

## 📝 Example

**Feature:**
```gherkin
@smoke
Feature: Schedule Management
  Scenario: Create schedule
    Given I am on the schedules page
    When I create a schedule with name "Test"
    Then I should see the schedule "Test" in the list
```

**Step Definition:**
```typescript
When('I create a schedule with name {string}', async ({ page }, name) => {
  const schedulePage = new SchedulePage(page);
  await schedulePage.createSchedule(name);
});
```

**Page Object:**
```typescript
export class SchedulePage extends BasePage {
  async createSchedule(name: string) {
    await this.page.click('[data-testid="create-btn"]');
    await this.page.fill('[data-testid="name-input"]', name);
    await this.page.click('[data-testid="save-btn"]');
  }
}
```

## 🔧 Configuration

Edit `playwright.config.ts` and `.env` file for customization.

## 🤝 Contributing

1. Create feature branch
2. Write tests
3. Run locally: `npm test`
4. Run sharded: `npm run test:sharded:smoke`
5. Create pull request

## 📞 Support

- Documentation: `docs/` directory
- Examples: `teams/sch/` directory
- Issues: See troubleshooting in [GETTING_STARTED.md](GETTING_STARTED.md)

---

**Ready to use! Start testing in 5 minutes.** 🚀
