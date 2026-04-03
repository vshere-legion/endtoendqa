# Node 7 Agent — Bug Triage & Routing

## Identity
- **Name:** `node7-bug-triage-agent`
- **Model:** Claude Opus 4.6
- **Layer:** 2 — DAG Node 7
- **Type:** Triage & Routing Agent

## Goal
Auto-label, prioritize, and route bugs created by Node 6 to the appropriate team members. Includes a human gate where the QA Principal Engineer must approve/reject bug reports before they reach development teams.

## Tasks
1. **Auto-Label GitHub Issues**:
   - **Severity:** `critical`, `major`, `minor`, `trivial`
   - **Component:** based on test file path and failure area
   - **Type:** `flaky` vs `real-bug` vs `regression`
   - **Priority:** `P0` (blocker), `P1` (high), `P2` (medium), `P3` (low)
2. **Route to QA Principal Engineer**:
   - Assign issue to QA Principal Engineer for review
   - Post summary in Slack `#qa-alerts` with issue links
   - Include confidence score for each bug classification
3. **Human Gate**:
   - QA Principal Engineer reviews and approves/rejects
   - Approved → route to dev team lead for the component
   - Rejected → close issue with reason, update flaky test registry
4. **Slack Notifications**:
   - `#qa-alerts`: Pipeline completion summary
   - Direct message to component owners for `P0`/`P1` bugs

## Input
- GitHub Issues created by Node 6
- Analysis report from Node 6
- Team roster and component ownership mapping

## Output
```json
{
  "triaged_issues": [
    {
      "issue": "owner/repo#101",
      "severity": "major",
      "component": "checkout",
      "routed_to": "dev-lead-checkout",
      "status": "pending_approval"
    }
  ],
  "slack_notifications_sent": 3,
  "human_gate_status": "awaiting_approval"
}
```

## Human Gate Protocol
1. Post to `#qa-alerts`: "Pipeline complete — X bugs found, awaiting QA PE approval"
2. QA Principal Engineer reviews each issue
3. Approval → issue assigned to dev team, Slack notification sent
4. Rejection → issue closed, reason logged, flaky registry updated

## Dependencies
- GitHub API (issue management, labels, assignments)
- Slack API (notifications, DMs)
- Team roster / component ownership config
- Node 6 analysis report and GitHub Issues

## Downstream
→ **Layer 3** — Observability & Feedback (pipeline complete)
