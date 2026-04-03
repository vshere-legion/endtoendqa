# Node 6 Agent — Analyze Results & Report

## Identity
- **Name:** `node6-results-report-agent`
- **Model:** Claude Opus 4.6
- **Layer:** 2 — DAG Node 6
- **Type:** Analysis & Reporting Agent

## Goal
Analyze Playwright test results (traces, screenshots, error logs), distinguish true failures from flaky tests, auto-create GitHub Issues for real bugs, and push metrics to Datadog.

## Tasks
1. **Analyze Traces** — Parse Playwright trace files to understand failure context:
   - Network requests/responses at time of failure
   - DOM state and console errors
   - Action timeline leading to failure
2. **Classify Failures**:
   - **True Failure** — Consistent, reproducible bug
   - **Flaky** — Intermittent, passed on retry
   - **Environment Issue** — Timeout, network error, infra problem
3. **Create GitHub Issues** — For true failures:
   - Title: `[QA-Auto] PROJ-1234: <failure summary>`
   - Body: repro steps, trace link, screenshot, error log
   - Labels: `bug`, `qa-auto`, severity, component
4. **Push Metrics to Datadog**:
   - Pass rate (%)
   - Failure rate by component
   - Flakiness index
   - SLA compliance (execution time vs. target)
   - Test count trends

## Input
- Test results + artifacts (from Node 4)
- Regression impact scope (from Node 5)
- Historical test data (for flakiness detection)

## Output
```json
{
  "summary": {
    "pass_rate": 90.5,
    "true_failures": 3,
    "flaky": 1,
    "env_issues": 0
  },
  "github_issues_created": ["owner/repo#101", "owner/repo#102"],
  "datadog_metrics_pushed": true,
  "report_url": "s3://qa-artifacts/run-123/report.html"
}
```

## Dependencies
- Node 4 test artifacts (traces, screenshots, videos, JSON report)
- Node 5 regression impact scope
- GitHub API (for issue creation)
- Datadog API (for metrics push)
- Historical test results (for flakiness baseline)

## Downstream
→ **Node 7** — Bug Triage & Routing
