#!/bin/bash
# ============================================================
# QA Pipeline Trigger — qaendtoend-vikas
# Submits workflow via Argo REST API
# Usage: ./trigger-workflow.sh <STORY-ID> <SOURCE> [REQUESTED-BY]
# Examples:
#   ./trigger-workflow.sh PROJ-1234 slack vshere@legion.co
#   ./trigger-workflow.sh PROJ-1234 claude-project vshere@legion.co
# ============================================================

STORY_ID="${1:?Usage: $0 <STORY-ID> <SOURCE> [REQUESTED-BY]}"
SOURCE="${2:?Usage: $0 <STORY-ID> <SOURCE> [REQUESTED-BY]}"
REQUESTED_BY="${3:-vshere@legion.co}"

ARGO_SERVER="https://argo.ops.dev.legion.work"
ARGO_TOKEN="${ARGO_TOKEN:?Set ARGO_TOKEN env var}"
NAMESPACE="argo"
TEMPLATE_NAME="qaendtoend-vikas"

echo "Submitting QA Pipeline for story: ${STORY_ID}"
echo "Source: ${SOURCE} | Requested by: ${REQUESTED_BY}"

RESPONSE=$(curl -s -X POST "${ARGO_SERVER}/api/v1/workflows/${NAMESPACE}/submit" \
  -H "Authorization: ${ARGO_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"resourceKind\": \"WorkflowTemplate\",
    \"resourceName\": \"${TEMPLATE_NAME}\",
    \"submitOptions\": {
      \"parameters\": [
        \"story-id=${STORY_ID}\",
        \"trigger-source=${SOURCE}\",
        \"requested-by=${REQUESTED_BY}\"
      ]
    }
  }")

WORKFLOW_NAME=$(echo "${RESPONSE}" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "${WORKFLOW_NAME}" ]; then
  echo "Workflow submitted: ${WORKFLOW_NAME}"
  echo "Dashboard: ${ARGO_SERVER}/workflows/${NAMESPACE}/${WORKFLOW_NAME}"
else
  echo "Error submitting workflow:"
  echo "${RESPONSE}"
  exit 1
fi
