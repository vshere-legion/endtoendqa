# Timeout & Error Recovery Rules

## Jira API Timeouts
- If a Jira query takes longer than **30 seconds**, retry once. If it fails again, skip the defect and log it to `rca_results/errors.json`.
- If fetching a single defect via `getJiraIssue` fails, try the REST API fallback: `curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" "https://legiontech.atlassian.net/rest/api/3/issue/<KEY>"`
- If both MCP and REST API fail for a defect, log it and continue with remaining defects.

## GitHub PR Search Timeouts
- If `gh search prs` takes longer than **15 seconds**, skip PR search for that defect.
- If `gh pr diff` takes longer than **30 seconds** or returns more than 500 lines, truncate to first 200 lines and summarize what's available.
- If `gh` CLI is not authenticated, stop and tell the user to run `gh auth login`.

## Report Generation Timeout
- If `python3 scripts/generate_report.py` takes longer than **60 seconds**, something is wrong — check if `rca_results/` has valid JSON.

## Batch Processing Limits
- If processing a single defect takes longer than **2 minutes**, move on to the next defect and log the timeout.
- If more than 20% of defects in a batch fail, pause and report the failures to the user before continuing.

## Recovery Actions
| Scenario | Action |
|----------|--------|
| Jira MCP tool denied | Fall back to REST API via curl with .env credentials |
| Jira REST API fails | Log defect key to errors.json, continue with next |
| GitHub `gh` not authenticated | Stop and tell user to run `gh auth login` |
| PR diff too large (>500 lines) | Truncate to 200 lines, focus on file names and first hunks |
| Single defect processing hangs | Skip after 2 minutes, log to errors.json |
| Batch >20% failure rate | Pause, report failures, ask user whether to continue |
| Report generation fails | Check rca_results/ for valid JSON, report the error |

## Error Logging
When a defect is skipped due to timeout or error, append to `rca_results/errors.json`:
```json
{
  "defect_id": "SCH-XXXXX",
  "error": "Jira API timeout after 30s",
  "timestamp": "2026-04-02T10:30:00Z",
  "action": "skipped"
}
```
Report the total error count at the end:
"Completed RCA for X defects. Y defects skipped due to errors (see rca_results/errors.json)."
