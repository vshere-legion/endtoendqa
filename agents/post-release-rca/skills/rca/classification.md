# Classification Categories

## Why QA Missed
One-word reason why QA processes missed detecting this defect before it leaked.
MUST be exactly one of:

| Value | Use when... |
|-------|-------------|
| Oversight | QA had coverage but missed a specific scenario |
| Coverage | No test existed for the affected area |
| Environment | Defect only manifests in specific env config |
| Data | Defect requires specific data conditions to trigger |
| Timing | Race condition or timing-dependent behavior |
| Complexity | Interaction between multiple components |
| Regression | Change broke previously working functionality |
| Integration | Cross-service or API contract issue |
| Edge-case | Unusual input or boundary condition |
| Requirement | Requirement was unclear or missing |

## Why Dev Missed
One-word reason why development processes missed this in the development lifecycle.
MUST be exactly one of:

| Value | Use when... |
|-------|-------------|
| Oversight | Simple mistake in otherwise understood code |
| Refactor | Broke during code restructuring |
| Merge | Conflict resolution introduced the bug |
| Logic | Incorrect algorithm or conditional |
| Dependency | Upstream library/service change |
| Assumption | Wrong assumption about input/state |
| Edge-case | Didn't consider boundary conditions |
| Concurrency | Thread safety or async issue |
| Migration | Data or schema migration issue |
| Requirement | Built to ambiguous or wrong spec |

## Judgment Principles
- **Be honest, not kind.** This report drives improvement, not blame.
- **Prefer the most specific reason.** "Oversight" is a last resort.
- **If regression + no automation → always "Regression" for Why QA missed.**
- **If comments reveal env-specific reproduction → prefer "Environment".**
- **If PR shows no tests in the changed area → "Coverage".**
- **When uncertain between two reasons, pick the more actionable one.**
- **Evidence over inference.** "Hypothesized" is better than a false "Confirmed".

## Recommendation Rules
### QA Recommendation
One specific, actionable sentence. Must reference specific flows, components, or test types.
- **Good:** "Add regression automation for SSO + LIP enrollment flow on mobile"
- **Bad:** "Improve test coverage"

### Dev Recommendation
One specific, actionable sentence. Must reference specific code areas, patterns, or practices.
- **Good:** "Add input validation for bank account numbers at API boundary"
- **Bad:** "Write better code"
