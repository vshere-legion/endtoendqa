#!/bin/bash
# ============================================================
# Claude Project → QA Pipeline Trigger
# Called from Claude Code or Claude Project to submit workflow
# Usage: ./claude-trigger.sh <STORY-ID>
# ============================================================

STORY_ID="${1:?Usage: $0 <STORY-ID>}"

echo "Claude Project triggering QA Pipeline for story: ${STORY_ID}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
"${SCRIPT_DIR}/trigger-workflow.sh" "${STORY_ID}" "claude-project" "vshere@legion.co"
