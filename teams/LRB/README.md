# Team: LRB

## Quick Start
```bash
# Run all LRB tests on dev
TEST_TEAM=LRB TEST_ENV=dev npm run test

# Run P1 regression on UAT
TEST_TEAM=LRB TEST_ENV=uat TEST_TAGS="@P1-Critical and @Regression" npm run test
```

## Tagging Checklist
- [ ] `@Team-LRB` at Feature level
- [ ] `@GA` or `@LA` at Feature level
- [ ] One Priority tag per Scenario (@P1-Critical, @P2-High, @P3-Medium, @P4-Low)
- [ ] One Suite tag per Scenario (@Regression, @NewFeature)
- [ ] One Release tag per Scenario (@Spring-Mid, @Summer-Final, etc.)
