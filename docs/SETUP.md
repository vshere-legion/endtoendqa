# Setup Guide

## Prerequisites

- **Node.js 18+** (prefer 20.x) — check with `node --version`
- **npm** — included with Node.js
- **Git** — for version control

## Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd playwright-automation-framework

# 2. Install dependencies
npm install

# 3. Install Playwright browsers
npx playwright install --with-deps

# 4. Copy environment config
cp .env.example .env
```

## Environment Configuration

Edit the `.env` file with your settings:

```bash
# Required
TEST_ENV=rc                     # Environment: dev, staging, rc, uat, prod
ENTERPRISE=LegionCoffee         # Enterprise (maps to test-data/users/ JSON files)

# Optional
TEST_TEAM=all                   # Team filter: all, sch, TA, EPR, etc.
TYPE=all                        # Test type: ui, api, all
TEST_TAGS=@P1-Critical          # Tag expression for filtering
WORKERS=2                       # Parallel workers (default: 2 local, 4 CI)
HEADED=false                    # Set to true to see the browser
LOG_LEVEL=INFO                  # DEBUG, INFO, WARN, ERROR, FATAL
```

**Important:** Set `TEST_ENV=rc` for running tests. The default (`dev`) points to an unreachable environment.

### Environment URLs

| Environment | URL |
|-------------|-----|
| STG | `https://staging-enterprise.dev.legion.work/` |
| EA / RC | `https://rc-enterprise.dev.legion.work/` |
| EAR | `https://legioncoffee.ear.legion.work/` |
| REL | `https://enterprise.rel.legion.work/` |
| EPH | `https://ephemeral-tna.dev.legion.work/` |

## Running Tests

```bash
# Generate BDD spec files + run all tests
npm test

# Run specific team
TEST_TEAM=sch npm test

# Run specific priority
TEST_TAGS="@P1-Critical" npm test

# Run with visible browser
HEADED=true npm test

# Run sharded (CI-style, 15 workers)
npm run test:sharded:smoke
```

## Verify Installation

```bash
# Check versions
npx playwright --version    # Should show 1.50.x
npx tsc --version           # Should show 5.7.x

# Type check
npm run typecheck

# Lint
npm run lint

# Dry run (shows shard plan without executing)
npm run test:dry-run
```

## Test Data Setup

Test data files are in `test-data/users/` with the naming pattern:

```
user_loc_{ENTERPRISE}_{ENV}.json
```

Example: `user_loc_LegionCoffee_STG.json`

These contain user credentials, locations, and employee data used by the `DataService`. The `ENTERPRISE` and `TEST_ENV` environment variables determine which file is loaded.

## Docker Setup

```bash
# Build the Docker image
npm run docker:build

# Run tests in Docker
npm run docker:test

# Run sharded in Docker (4 containers)
npm run docker:sharded
```

Docker containers require `shm_size: 2gb` for Playwright browser processes (already configured in `ci/docker-compose.yml`).

## IDE Setup (VS Code)

Recommended extensions:
- **Playwright Test for VS Code** — run/debug tests from the editor
- **Cucumber (Gherkin)** — syntax highlighting for `.feature` files
- **ESLint** — inline lint errors
- **Prettier** — code formatting

The project includes `.vscode/settings.json` with recommended settings.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No tests found" | Run `npm run bddgen` to generate spec files |
| "Browser not found" | Run `npx playwright install --with-deps` |
| Tests timeout on login | Verify `TEST_ENV=rc` is set, not `dev` |
| Missing test data | Check `test-data/users/` has a file matching your `ENTERPRISE` + `TEST_ENV` |
| TypeScript errors | Run `npm run typecheck` — known pre-existing errors in `src/pages/auth/LoginPage.ts` |
| Permission denied on scripts | Run `chmod +x scripts/*.js` |
