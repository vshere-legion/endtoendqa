#!/bin/bash
# ============================================================
# Slack → QA Pipeline Trigger
# Parses Slack message and submits Argo workflow
# Expected Slack message format: "Start QA job for story PROJ-1234"
# ============================================================

SLACK_TEXT="${1:?Provide Slack message text}"
SLACK_USER="${2:-vshere@legion.co}"

# Parse story ID from message
STORY_ID=$(echo "${SLACK_TEXT}" | grep -oE '[A-Z]+-[0-9]+' | head -1)

if [ -z "${STORY_ID}" ]; then
  echo "Error: No story ID found in message: ${SLACK_TEXT}"
  echo "Expected format: Start QA job for story PROJ-1234"
  exit 1
fi

echo "Parsed story ID: ${STORY_ID} from Slack message"

# Trigger the workflow
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
"${SCRIPT_DIR}/trigger-workflow.sh" "${STORY_ID}" "slack" "${SLACK_USER}"
