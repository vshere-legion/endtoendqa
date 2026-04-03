---
name: Playwright Framework Tag Convention
description: Tag taxonomy and conventions from Playwright-Nishant/Playwright-automation-framework used for Gherkin scenario generation
type: reference
---

Automation framework path: `/Users/vshere/Documents/Projects/Playwright-Nishant/Playwright-automation-framework`

**Feature-level tag order (line 1):**
`@Team @type @mode:serial @feature-name @priority @suite @availability @group-name @story-id`

**Tag Taxonomy:**

| Category | Tags | Source |
|----------|------|--------|
| Priority | `@P1-Critical`, `@P2-High`, `@P3-Medium`, `@P4-Low` | config/framework.config.ts |
| Suite | `@Regression`, `@NewFeature` | framework.config.ts |
| Test Type | `@Positive`, `@Negative` | framework.config.ts |
| Availability | `@GA`, `@LA` | framework.config.ts |
| Execution Mode | `@mode:serial` | Shared TestContext across scenarios |
| UI/API | `@ui`, `@api` | Based on test type |
| Status | `@wip` | Excludes from normal runs |

**Team Tags (11 teams):**
`@Team-SCH`, `@Team-TA`, `@Team-Platform`, `@Team-PLT-Core`, `@Team-PLT-Int`, `@Team-PLT-Ops`, `@Team-LRB`, `@Team-EV-Com`, `@Team-EV-LIP`, `@Team-EV-ELM`, `@Team-GENAI`

**Group Tags:**
`@group-P2PLGTest`, `@group-PlatformTest`, `@group-PLTCoreTest`, `@group-PLTIntTest`, `@group-ScheduleExtractTest`, `@group-FoRacDemandTest`

**Feature Tags:**
`@p2p`, `@p2p-schedule`, `@p2p-shifts`, `@p2p-employees`, `@p2p-permissions`, `@p2p-budget`, `@p2p-dm`, `@p2p-template`, `@forecast`, `@schedule`, `@shift-flow`, `@timeclock`, `@timeoff-config`, `@labor`

**Scenario-level Tags:**
- `@step1`, `@step2`, `@step3`... — Sequential scenario numbering
- `@C<number>` — TestRail case ID (e.g., `@C100001`)
- `@CreateTestRailRun` — Pre-creates TestRail run
- `@wip` — Work in progress (excluded from runs)

**Jira Priority → Framework Priority Mapping:**
- Highest → `@P1-Critical`
- High → `@P2-High`
- Medium → `@P3-Medium`
- Low/Lowest → `@P4-Low`

**How to apply:** All generated Gherkin scenarios in the QA pipeline (Node 2) must follow this tag convention. Background should use `Given I am logged in as "<UserType>"` pattern.
