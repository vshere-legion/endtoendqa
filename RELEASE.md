# Release Process

## Versioning

This framework follows [Semantic Versioning](https://semver.org/) (SemVer):

| Version | When | Examples |
|---------|------|----------|
| **MAJOR** (X.0.0) | Breaking changes to core APIs | Renamed exports, changed fixture interfaces, removed shared utilities |
| **MINOR** (x.Y.0) | New features, new teams, new shared utilities | Added new page object to `shared/`, new team scaffolded, new CI capability |
| **PATCH** (x.y.Z) | Bug fixes, selector updates, flaky test fixes | Fixed auth flow, updated CSS selectors, fixed report merging |

## Release Cadence

| Type | Frequency | Who |
|------|-----------|-----|
| Regular release | Every 2 weeks (biweekly sprint) | Release Manager |
| Hotfix | As needed | Framework Core Team |
| Major release | Planned (announced 2 sprints ahead) | Framework Core Team + all team leads |

## Release Process

### Biweekly Release (MINOR/PATCH)

```
Week 1-2: Feature development on develop
Day 10:   Cut release branch
Day 10-12: Stabilization (bug fixes only)
Day 12:   Merge to master, tag, publish release notes
```

**Step by step:**

```bash
# 1. Cut release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/v2.3.0

# 2. Update version in package.json
npm version minor --no-git-tag-version
# or: npm version patch --no-git-tag-version

# 3. Push release branch
git add package.json package-lock.json
git commit -m "chore: bump version to v2.3.0"
git push -u origin release/v2.3.0

# 4. Stabilization (2 days)
# Only bug fixes allowed on release branch.
# Bug fixes committed directly to release branch.

# 5. Merge to master via PR
# Open PR: release/v2.3.0 → master
# Required: 2 approvals from Framework Core Team
# Required: quality-gate + framework-smoke checks pass

# 6. After merge to master, tag the release
git checkout master
git pull origin master
git tag -a v2.3.0 -m "Release v2.3.0"
git push origin v2.3.0

# 7. Create GitHub Release
# Go to: Releases → Draft new release → Select tag v2.3.0
# Use "Generate release notes" for auto-generated changelog
# Add highlights section manually for notable changes

# 8. Back-merge to develop
git checkout develop
git pull origin develop
git merge master
git push origin develop

# 9. Delete release branch
git branch -d release/v2.3.0
git push origin --delete release/v2.3.0
```

### Hotfix Release

For critical bugs on `master` that can't wait for the next biweekly release:

```bash
# 1. Branch from master
git checkout master
git pull origin master
git checkout -b hotfix/fix-auth-crash

# 2. Fix the issue, commit
git commit -m "fix(core): handle null credential in auth-manager"

# 3. Bump patch version
npm version patch --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore: bump version to v2.2.1"

# 4. Open PR to master
# Required: 2 approvals from Framework Core Team

# 5. After merge, tag
git checkout master
git pull origin master
git tag -a v2.2.1 -m "Hotfix v2.2.1 — fix auth crash"
git push origin v2.2.1

# 6. Back-merge to develop
git checkout develop
git merge master
git push origin develop
```

### Major Release

Major releases have breaking changes. They require advance planning:

1. **Sprint N-2:** Announce planned breaking changes in `#automation-framework`
2. **Sprint N-1:** Deprecation warnings live on `develop` (all teams see them in CI)
3. **Sprint N:** Cut `release/v3.0.0`, include migration guide in release notes
4. **Sprint N+1:** Support window — help teams migrate, fix issues

---

## Release Notes Format

```markdown
## v2.3.0 (2026-03-07)

### Highlights
- Added budget smart card verification for P2P schedules
- New team onboarded: GENAI
- Reduced test execution time by 15% via waitForTimeout removal

### Features
- feat(sch): add P2P budget smart card page object (#142)
- feat(shared): add date range utility for week navigation (#138)
- feat(genai): scaffold GENAI team directory (#145)

### Bug Fixes
- fix(core): replace polling loop with expect().toBeEnabled() (#140)
- fix(sch): guard breaks checkbox with isVisible() (#141)

### Chores
- chore(ci): add framework smoke suite to PR validation (#143)
- chore: bump playwright to 1.41.0 (#144)

### Breaking Changes
- None

### Migration Guide
- N/A (no breaking changes)
```

---

## Who Does What

| Role | Responsibility |
|------|---------------|
| **Release Manager** (rotates biweekly) | Cuts release branch, manages stabilization, merges to master, tags, publishes notes |
| **Framework Core Team** (3 people) | Approves core PRs, reviews release PRs, owns hotfix decisions |
| **Team Leads** | Approve team PRs, flag blockers before release cut, participate in major release planning |

---

## Rollback

If a release introduces a regression:

1. **Hotfix preferred:** Fix forward with a `hotfix/*` branch
2. **Revert if needed:** `git revert <merge-commit>` on master, tag new patch version
3. **Never force-push master** — always create a new commit/tag
