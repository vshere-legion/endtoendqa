## Summary
<!-- What does this PR do? 1-3 bullet points. -->

-

## Change Category
<!-- Check ONE. This determines required approvals. -->

- [ ] **Team-only** — changes restricted to `teams/<TEAM>/` (1 team approval)
- [ ] **Shared/Core** — changes to `src/`, `shared/`, `config/`, `scripts/`, or root files (2 approvals, 1 from core team)
- [ ] **Breaking Change** — modifies public APIs, fixture interfaces, config schema, or removes/renames exports (3 approvals + RFC issue link)
- [ ] **CI/Infra** — changes to `.github/`, `ci/`, `Dockerfile`, `docker-compose.yml` (core + devops approval)
- [ ] **Docs only** — documentation changes, no code impact

## Affected Teams
<!-- Which teams are impacted? Check all that apply. -->

- [ ] All teams (core/shared change)
- [ ] TNP
- [ ] SCH
- [ ] PLT-Core / PLT-Int / PLT-Ops
- [ ] LRB
- [ ] EV-Com / EV-LIP / EV-ELM
- [ ] GENAI
- [ ] EPR

## Test Plan
<!-- How did you verify this change? -->

- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npx bddgen` generates without errors
- [ ] Ran affected tests locally: `TEST_ENV=rc npx playwright test --grep "..." --project chromium`
- [ ] Framework smoke suite passes (required for core changes): `npm run test:smoke`

## Breaking Change Details
<!-- Only fill if "Breaking Change" is checked above. Delete otherwise. -->

**RFC Issue:** #
**What breaks:** <!-- Which APIs, interfaces, or behaviors change? -->
**Migration guide:**
```
// Before
// After
```

## Screenshots / Logs
<!-- Attach failure screenshots, test output, or trace links if relevant. -->

## Checklist
<!-- All must be checked before merge. -->

- [ ] PR title uses [Conventional Commits](https://www.conventionalcommits.org/) format (e.g., `feat(sch):`, `fix(core):`, `chore:`)
- [ ] No secrets, credentials, or API keys in this PR
- [ ] No `waitForTimeout()` hard-coded waits added (use proper `waitFor` patterns)
- [ ] No `@ts-ignore` or `any` types added to core code
- [ ] Updated relevant documentation if behavior changed
