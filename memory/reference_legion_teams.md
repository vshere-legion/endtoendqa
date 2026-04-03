---
name: Legion QA Teams
description: 11 active teams in the Playwright automation framework with their directory names, tags, and group mappings
type: reference
---

Source: `/Users/vshere/Documents/Projects/Playwright-Nishant/Playwright-automation-framework/teams/`

**Active Teams (11):**

| # | Team | Directory | Tag | Group Tag | Domain |
|---|------|-----------|-----|-----------|--------|
| 1 | Scheduling | `teams/sch/` | `@Team-SCH` | `@group-P2PLGTest` | Schedule generation, P2P, shifts, employees |
| 2 | Time & Attendance | `teams/ta/` | `@Team-TA` | — | Timeclock, timeoff, attendance |
| 3 | Platform | `teams/platform/` | `@Team-Platform` | `@group-PlatformTest` | Extracts, imports, API |
| 4 | PLT-Core | `teams/PLT-Core/` | `@Team-PLT-Core` | `@group-PLTCoreTest` | Platform core functionality |
| 5 | PLT-Int | `teams/PLT-Int/` | `@Team-PLT-Int` | `@group-PLTIntTest` | Platform integrations |
| 6 | PLT-Ops | `teams/PLT-Ops/` | `@Team-PLT-Ops` | — | Platform operations |
| 7 | LRB | `teams/LRB/` | `@Team-LRB` | — | Labor-related |
| 8 | EV-Com | `teams/EV-Com/` | `@Team-EV-Com` | — | EV Communications |
| 9 | EV-LIP | `teams/EV-LIP/` | `@Team-EV-LIP` | — | EV LIP module |
| 10 | EV-ELM | `teams/EV-ELM/` | `@Team-EV-ELM` | — | EV ELM module |
| 11 | GENAI | `teams/GENAI/` | `@Team-GENAI` | — | GenAI module |

**Team Directory Structure (each team follows):**
```
teams/{TEAM}/
├── features/
│   ├── ui/       — UI test feature files
│   └── api/      — API test feature files
├── steps/        — Step definitions (.steps.ts)
├── pages/        — Page objects
├── test-data/    — Team-specific test data
└── utils/        — Team-specific utilities (optional)
```

**How to apply:** When generating scenarios, map Jira components to the correct team tag. SCH-* components → @Team-SCH, TA-* → @Team-TA, PLT-* → @Team-Platform or PLT-Core/Int/Ops.
