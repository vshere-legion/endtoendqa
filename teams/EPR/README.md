# Team: EPR

## Quick Start
```bash
# Run all EPR tests on dev
TEST_TEAM=EPR TEST_ENV=dev npm run test

# Run P1 regression on UAT
TEST_TEAM=EPR TEST_ENV=uat TEST_TAGS="@P1-Critical and @Regression" npm run test
```

## Tagging Checklist
- [ ] `@Team-EPR` at Feature level
- [ ] `@GA` or `@LA` at Feature level
- [ ] One Priority tag per Scenario (@P1-Critical, @P2-High, @P3-Medium, @P4-Low)
- [ ] One Suite tag per Scenario (@Regression, @NewFeature)
- [ ] One Release tag per Scenario (@Spring-Mid, @Summer-Final, etc.)
