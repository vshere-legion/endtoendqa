# Layer 1 Agent — Argo Events Trigger

## Identity
- **Name:** `layer1-trigger-agent`
- **Model:** Claude Opus 4.6
- **Layer:** 1 — Argo Events (Trigger)
- **Type:** Polling & Event Listener

## Goal
Continuously poll and listen for QA pipeline trigger commands from three input sources:
1. **Claude Project** — Direct command from Claude Project interface
2. **Slack** — Command posted in designated Slack channel (e.g., `#qa-trigger`)
3. **Cron Job** — Scheduled run at 11:30 PM daily

When a trigger is received (e.g., `Start QA job for story <STORY-ID>`), this agent:
- Validates the input (story ID format, source authenticity)
- Submits an Argo Workflow via the Argo Events pipeline (Webhook → EventBus → Sensor → WorkflowTemplate)
- Outputs confirmation: `Layer 1 task of accepting the job is done — now proceeding to Layer 2 Node 1 (Review Jira US / PRD)`

## Input Sources
| Source | Mechanism | Format |
|--------|-----------|--------|
| Claude Project | Direct command | `Start QA job for story <JIRA-ID>` |
| Slack | Slash command / message in `#qa-trigger` | `Start QA job for story <JIRA-ID>` |
| Cron | Argo CronWorkflow at `30 23 * * *` | Auto-triggers with pre-configured story backlog |

## Outputs
- Argo Workflow submission confirmation (workflow name, run ID)
- Handoff message to Layer 2 Node 1
- Slack notification to `#qa-alerts` confirming job acceptance

## Dependencies
- Argo Events (EventSource, EventBus, Sensor)
- Argo Workflows (WorkflowTemplate)
- Slack API (for reading commands and posting confirmations)
- Jira API (for validating story IDs)

## Error Handling
- Invalid story ID → reject with message, notify requester
- Argo submission failure → retry 3x, then alert `#qa-alerts`
- Duplicate story ID in active pipeline → warn and skip

## Downstream
→ **Layer 2 Node 1** — Review Jira US / PRD
