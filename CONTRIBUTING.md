# Contributing to the Playwright + Cucumber Enterprise Framework

This framework is shared by **11 teams**. These guidelines exist so we don't break each other.

## Table of Contents

- [Quick Start](#quick-start)
- [Branching Model](#branching-model)
- [Making Changes](#making-changes)
- [PR Process](#pr-process)
- [Commit Conventions](#commit-conventions)
- [What Goes Where](#what-goes-where)
- [Breaking Changes](#breaking-changes)
- [New Team Onboarding](#new-team-onboarding)
- [Code Standards](#code-standards)

---

## Quick Start

```bash
# 1. Clone and setup
git clone <repo-url>
cd playwright-automation-framework
npm ci
npx playwright install --with-deps

# 2. Create your feature branch from feature
git checkout feature
git pull origin feature
git checkout -b feature/sch-my-new-tests

# 3. Make changes, test locally
npm run lint && npm run typecheck
TEST_ENV=rc npx bddgen && npx playwright test --grep "@wip" --project chromium

# 4. Push and open PR to feature
git push -u origin feature/sch-my-new-tests
# Open PR via GitHub → target branch: feature
```

---

## Branching Model

```
master ────────●────────────●────────── (tagged releases only)
               ↑            ↑
          release/v2.1  release/v2.2
               ↑            ↑
feature ───●───●───●───●────●───●────── (integration branch)
           ↑       ↑        ↑
     feature/   feature/  feature/
     sch-xyz    core-abc  tnp-def
```

| Branch | Create from | Merge to | Purpose |
|--------|------------|----------|---------|
| `feature/<team>-<desc>` | `feature` | `feature` | All new work |
| `release/vX.Y.Z` | `feature` | `master` + `feature` | Release stabilization |
| `hotfix/<desc>` | `master` | `master` + `feature` | Emergency production fix |

**Rules:**
- Never push directly to `master` or `feature`
- Always branch from `feature` for new work
- Delete feature branches after merge
- Feature branch naming: `feature/<team>-<short-description>` (e.g., `feature/sch-p2p-drag-drop`)

---

## Making Changes

### Team-Only Changes (fast path)

If your changes are **entirely within** `teams/<YOUR_TEAM>/`:

1. Branch from `feature`
2. Make changes in your team directory
3. Run `npm run lint && npm run typecheck && npx bddgen`
4. Open PR to `feature`
5. Get **1 approval** from your team
6. Squash merge

### Core/Shared Changes (reviewed path)

If your changes touch `src/`, `shared/`, `config/`, `scripts/`, or root files:

1. **Open an issue first** describing what you want to change and why
2. Branch from `feature`
3. Make changes
4. Run full validation: `npm run lint && npm run typecheck && npm run test:smoke`
5. Open PR to `feature`
6. Get **2 approvals** (at least 1 from Framework Core Team)
7. Squash merge

### Breaking Changes (gated path)

If your change modifies public APIs, removes exports, changes fixture interfaces, or alters config schema:

1. **File an RFC issue** with the `breaking-change` label
2. Get approval from 2 core team members + 1 affected team lead
3. Include a migration guide in your PR description
4. Get **3 approvals** before merge
5. This will trigger a **MAJOR** version bump at next release

---

## PR Process

1. **Fill out the PR template completely** — CI checks for this
2. **Select the correct change category** in the template
3. **All PRs must pass these checks before merge:**
   - ESLint (`npm run lint`)
   - TypeScript (`npm run typecheck`)
   - BDD generation (`npx bddgen`)
   - PR template validation
4. **Core changes additionally require:**
   - Framework smoke suite (`npm run test:smoke`)
5. **Squash merge only** — keeps `feature` and `master` history clean
6. **Delete the source branch** after merge

---

## Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/). Every commit message must follow this format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | When to use |
|------|------------|
| `feat` | New feature, new test scenario, new page object |
| `fix` | Bug fix, selector fix, flaky test fix |
| `refactor` | Code restructuring without behavior change |
| `test` | Adding/updating test scenarios |
| `chore` | Dependencies, tooling, CI changes |
| `docs` | Documentation only |
| `perf` | Performance improvement |

### Scopes

| Scope | Directory |
|-------|-----------|
| `core` | `src/` |
| `shared` | `shared/` |
| `config` | `config/` |
| `ci` | `.github/`, `ci/` |
| `scripts` | `scripts/` |
| `sch` | `teams/sch/` |
| `ta` | `teams/ta/` |
| `plt` | `teams/PLT-*` |
| `lrb` | `teams/LRB/` |
| `ev` | `teams/EV-*` |
| `genai` | `teams/GENAI/` |
| `epr` | `teams/EPR/` |

### Examples

```
feat(sch): add P2P drag-and-drop shift tests
fix(core): replace waitForTimeout with proper waitFor in auth flow
refactor(shared): extract date utilities into shared/utils
chore(ci): add framework smoke suite to PR validation
docs: update CLAUDE.md with P2P architecture notes
BREAKING CHANGE: rename TestContext.get() to TestContext.getContext()
```

---

## What Goes Where

### Must go in Core (`src/`, `shared/`)
- Authentication logic
- Test fixtures and BDD setup
- Data service and credential resolution
- Base page objects
- Shared step definitions (used by 2+ teams)
- Shared utilities (used by 2+ teams)
- Framework configuration

### Must go in Team directory (`teams/<TEAM>/`)
- Feature files
- Team-specific step definitions
- Team-specific page objects
- Team test data and credentials
- Team API clients
- Team utilities

### Rule of thumb
> If only your team uses it, it belongs in `teams/<TEAM>/`.
> If 2+ teams need it, propose it for `shared/` via a core PR.
> Never add team-specific code to `src/` or `shared/`.

---

## Breaking Changes

A change is **breaking** if it:
- Removes or renames an exported function, class, or type from `src/` or `shared/`
- Changes the signature of a fixture (parameters, return type)
- Modifies `playwright.config.ts` in a way that changes test behavior
- Alters the structure of `config/framework.config.ts`
- Changes the credential resolution pattern in `data-service.ts`
- Removes or renames environment variables used by teams

**Deprecation timeline:**
1. Mark as `@deprecated` with JSDoc + runtime warning
2. Announce in release notes
3. Keep working for minimum 2 release cycles (4 weeks)
4. Remove in a MAJOR version bump

---

## New Team Onboarding

```bash
# Scaffold a new team directory with the standard structure
node scripts/create-team.js <TEAM_NAME>

# This creates:
# teams/<TEAM_NAME>/
#   features/ui/
#   features/api/
#   pages/
#   steps/
#   test-data/
#   api/
#   utils/
#   config.ts
#   README.md
```

After scaffolding:
1. Add your team to `config/framework.config.ts` TEAMS array (core PR required)
2. Add your team's CODEOWNERS entry to `.github/CODEOWNERS` (core PR required)
3. Create a GitHub Team for your team (e.g., `@org/team-xyz`)
4. Start adding feature files in `teams/<TEAM>/features/ui/`

---

## Code Standards

### TypeScript
- **Strict mode** — no `any` types, no implicit returns
- **No `@ts-ignore`** in core code (team code: use sparingly with justification)
- **No `waitForTimeout()`** — use proper Playwright `waitFor` patterns
- **Page Object Model** — all page interactions through page objects
- **Given/When/Then** from `playwright-bdd` — keep steps reusable

### Testing
- Every feature file needs a `Background:` block with an idempotent login step
- Tag taxonomy: `@P1-Critical`, `@P2-High`, `@P3-Medium`, `@P4-Low`
- Team tag: `@Team-<TEAM>` on every feature
- Credential group: `@group-<GroupName>` when test-class-scoped credentials are needed
- Run `npx bddgen` after every feature file change

### Security
- **Never commit** `.env` files with real values, `credentials.json`, API keys, or tokens
- Use `.env.example` as a template (committed, no real values)
- CI secrets go in GitHub Actions Secrets or Jenkins Credentials
- Test data credentials in `teams/<TEAM>/test-data/` must be `.gitignore`d

---

## Getting Help

- **Framework issues:** File a [bug report](../../issues/new?template=bug_report.md)
- **Feature requests:** File a [feature request](../../issues/new?template=feature_request.md)
- **Questions:** Post in the `#automation-framework` Slack channel
- **Docs:** See the [docs/](docs/) directory for architecture guides
