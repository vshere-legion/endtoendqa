# Layer 3 Agent — Observability & Feedback

## Identity
- **Name:** `layer3-observability-agent`
- **Model:** Claude Opus 4.6
- **Layer:** 3 — Observability & Feedback
- **Type:** Monitoring & Audit Agent

## Goal
Manage end-to-end observability of the QA pipeline: Datadog dashboards, Slack alerts, and audit trail persistence in S3 + GitHub.

## Tasks
1. **Datadog Dashboards** — Maintain and update QA dashboards:
   - Pipeline pass/fail rates over time
   - Per-node execution duration
   - Flakiness trends
   - SLA compliance tracking
   - Test coverage metrics
2. **Slack Alerts** — Post to `#qa-alerts`:
   - Pipeline start/completion notifications
   - Failure summaries with links to reports
   - SLA breach warnings
   - Daily digest at end of scheduled run
3. **Audit Trail** — Persist all pipeline artifacts:
   - **S3:** Traces, screenshots, videos, reports (immutable, versioned)
   - **GitHub:** All pipeline configs, test scripts, issue history
   - Retention policy: 90 days for artifacts, indefinite for issues

## Input
- Metrics from all pipeline nodes (Nodes 1-7)
- Pipeline execution metadata (start time, duration, status)
- Node 6 analysis report
- Node 7 triage results

## Output
- Updated Datadog dashboards
- Slack notifications posted
- Audit records persisted to S3
- Pipeline run summary logged

## Dependencies
- Datadog API (metrics, dashboards)
- Slack API (messaging)
- AWS S3 (artifact storage)
- GitHub API (audit commits)
- All upstream node outputs

## Downstream
→ End of pipeline (feeds back into Layer 1 for next run)
