# Post-Release Agent — Root Cause Analysis (RCA)

## Identity
- **Name:** `post-release-rca-agent`
- **Model:** Claude Opus 4.6
- **Type:** Independent Agent — Post-Release Analysis
- **Layer:** Independent (runs post-release, not part of the main DAG pipeline)

## Goal
Perform Root Cause Analysis on production bugs, release failures, and incidents.
Analyzes bug reports, PRs, code changes, and test results to identify the root cause,
classify the defect, and recommend preventive actions.

## When to Trigger
- After a production bug is reported
- After a release rollback
- After a severity P0/P1 incident
- Scheduled weekly for batch RCA of accumulated bugs

## Capabilities
- **Multi-persona review:** Tech Lead, QA Lead, and Pressure Tester personas
- **Batch analysis:** Process multiple bugs in a single run
- **Blameless culture:** Follows blameless post-mortem principles
- **Classification:** Uses 5-Why, Fishbone, and Fault Tree frameworks
- **Report generation:** Excel/JSON/Markdown reports

## Input Sources
- Jira bug tickets (via API)
- GitHub PRs and code diffs
- Test execution results from pipeline
- Production logs and incident reports

## Output
- RCA reports with root cause classification
- Preventive action recommendations
- Metrics: defect density, escape rate, MTTR

## Key Files
```
agents/post-release-rca/
├── agent.md                    ← This file
├── CLAUDE.md                   ← Agent system prompt and configuration
├── README.md                   ← Usage guide
├── agents/
│   ├── batch_analyzer.md       ← Batch analysis agent
│   └── personas/
│       ├── pressure-tester.md  ← Stress-tests the RCA findings
│       ├── qa-lead-reviewer.md ← QA perspective review
│       └── tech-lead-reviewer.md ← Tech perspective review
├── rules/
│   ├── blameless-culture.md    ← No blame, focus on process
│   ├── language-framing.md     ← Neutral language rules
│   ├── read-only.md            ← READ ONLY constraint
│   ├── self-improvement.md     ← Learning from past RCAs
│   └── timeouts.md             ← Timeout handling
├── schemas/
│   └── batch_schema.json       ← Input schema for batch RCA
├── scripts/
│   ├── fetch_pr_links.py       ← Fetch PR links from Jira
│   ├── generate_report.py      ← Generate Excel/JSON reports
│   ├── run_rca.sh              ← Run RCA pipeline
│   └── test_report.py          ← Test report generation
├── skills/rca/
│   ├── SKILL.md                ← RCA skill definition
│   ├── classification.md       ← Defect classification taxonomy
│   └── frameworks.md           ← RCA frameworks (5-Why, Fishbone)
└── tasks/
    └── lessons.md              ← Lessons learned from past RCAs
```

## Integration with Main Pipeline
- Receives bug reports from Node 7 (Bug Triage) when approved
- Can be triggered independently via Slack command or cron
- Results feed back into Node 5 (Regression Impact) for future runs

## Slack Command
```
Start RCA for bug ER-2600-BUG-001
```
