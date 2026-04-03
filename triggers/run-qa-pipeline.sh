#!/bin/bash
# ============================================================
# QA End-to-End Pipeline — All-in-One Runner
#
# Runs the full AI QA SDLC pipeline for a given Jira story:
#   Node 1:  Fetch story from Jira
#   Node 1C: Evaluate requirements
#   Node 2:  Generate Gherkin scenarios
#   Node 2C: Evaluate Gherkin quality
#   Node 3:  Generate Playwright scripts
#   Node 3C: Review scripts
#   Node 4:  Execute Playwright tests (local, Chromium)
#   Node 5:  Regression impact analysis
#   Node 6:  Analyze results & report
#   Node 7:  Bug triage & routing
#
# Usage:
#   ./run-qa-pipeline.sh ER-2600
#   ./run-qa-pipeline.sh ER-2600 --team SCH --env rc --enterprise cinemark-wkdy
#   ./run-qa-pipeline.sh ER-2600 --scenario "Auto-transition employee shift"
#   ./run-qa-pipeline.sh ER-2600 --dry-run
#
# Prerequisites:
#   Environment variables in ~/.zshrc:
#     JIRA_URL, JIRA_EMAIL, JIRA_TOKEN
#     TESTRAIL_URL, TESTRAIL_USER, TESTRAIL_PASSWORD, TESTRAIL_ENABLED
# ============================================================

set -euo pipefail

# ─── Defaults ────────────────────────────────────────────────
STORY_ID=""
TEAM="SCH"
ENV="rc"
ENTERPRISE="cinemark-wkdy"
BROWSER="chromium"
SCENARIO_GREP=""
DRY_RUN=false
SKIP_TEST=false
MODE="interactive"  # interactive or autonomous

# ─── Paths ───────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
FRAMEWORK_DIR="/Users/vshere/Documents/Projects/Playwright-Nishant/Playwright-automation-framework"
OUTPUT_DIR="${PROJECT_DIR}/output"

# ─── Parse Arguments ─────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --team) TEAM="$2"; shift 2 ;;
    --env) ENV="$2"; shift 2 ;;
    --enterprise) ENTERPRISE="$2"; shift 2 ;;
    --browser) BROWSER="$2"; shift 2 ;;
    --scenario) SCENARIO_GREP="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --skip-test) SKIP_TEST=true; shift ;;
    --autonomous) MODE="autonomous"; shift ;;
    --help|-h)
      echo "Usage: $0 <STORY-ID> [options]"
      echo ""
      echo "Options:"
      echo "  --team <name>        Team (default: SCH)"
      echo "  --env <name>         Environment (default: rc)"
      echo "  --enterprise <name>  Enterprise (default: cinemark-wkdy)"
      echo "  --browser <name>     Browser (default: chromium)"
      echo "  --scenario <grep>    Grep filter for specific scenario"
      echo "  --dry-run            Simulate test execution"
      echo "  --skip-test          Skip Playwright execution (Nodes 1-3 only)"
      echo "  --autonomous         Run in autonomous mode (no user prompts)"
      echo "  --help               Show this help"
      exit 0
      ;;
    -*) echo "Unknown option: $1"; exit 1 ;;
    *) STORY_ID="$1"; shift ;;
  esac
done

if [[ -z "$STORY_ID" ]]; then
  echo "ERROR: Story ID required. Usage: $0 <STORY-ID>"
  exit 1
fi

STORY_SLUG=$(echo "$STORY_ID" | tr '[:upper:]' '[:lower:]' | tr '-' '_')
TEAM_DIR="${OUTPUT_DIR}/${TEAM}"

# ─── Banner ──────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════════════╗"
echo "║       AI QA SDLC Pipeline — qaendtoend-vikas        ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Story:      ${STORY_ID}"
echo "║  Team:       ${TEAM}"
echo "║  Env:        ${ENV}"
echo "║  Enterprise: ${ENTERPRISE}"
echo "║  Browser:    ${BROWSER}"
echo "║  Mode:       ${MODE}"
if [[ -n "$SCENARIO_GREP" ]]; then
echo "║  Scenario:   ${SCENARIO_GREP}"
fi
if $DRY_RUN; then
echo "║  *** DRY RUN MODE ***"
fi
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ─── Node 1: Fetch Jira Story ───────────────────────────────
echo "━━━ NODE 1 — Review Jira US / PRD ━━━"
NODE1_OUTPUT="/tmp/outputs/${STORY_SLUG}-requirements.json"
python3 "${PROJECT_DIR}/agents/node1-jira-prd-review/src/fetch_story.py" \
  --story-id "$STORY_ID" \
  --output "$NODE1_OUTPUT" \
  --search-confluence
echo ""

# ─── Node 1C: Evaluate Requirements ─────────────────────────
echo "━━━ NODE 1C — Evaluation Review ━━━"
NODE1C_OUTPUT="/tmp/outputs/${STORY_SLUG}-validated.json"
NODE1C_GATE="/tmp/outputs/${STORY_SLUG}-gate.txt"
python3 "${PROJECT_DIR}/skills/node1c-evaluation-review/src/evaluate.py" \
  --input "$NODE1_OUTPUT" \
  --output "$NODE1C_OUTPUT" \
  --gate-output "$NODE1C_GATE" \
  --mode "$MODE" || true

GATE_STATUS=$(cat "$NODE1C_GATE" 2>/dev/null || echo "BLOCKED")
if [[ "$GATE_STATUS" == "BLOCKED" && "$MODE" == "interactive" ]]; then
  echo ""
  # Check if running interactively (has a terminal)
  if [[ -t 0 ]]; then
    read -p "Gate is BLOCKED. Override and continue? (yes/no): " OVERRIDE
    if [[ "$OVERRIDE" == "yes" || "$OVERRIDE" == "y" ]]; then
      echo "APPROVED_WITH_OVERRIDE" > "$NODE1C_GATE"
      echo "Override accepted. Continuing..."
    else
      echo "Pipeline stopped. Fix the issues and re-run."
      exit 1
    fi
  else
    # Non-interactive (background/CI) — auto-override with warning
    echo "WARNING: Non-interactive mode detected. Auto-overriding BLOCKED gate."
    echo "APPROVED_WITH_OVERRIDE" > "$NODE1C_GATE"
  fi
elif [[ "$GATE_STATUS" == "BLOCKED" && "$MODE" == "autonomous" ]]; then
  echo "BLOCKED in autonomous mode. Pipeline stopped."
  exit 1
fi
echo ""

# ─── Node 2: Generate Gherkin Scenarios ──────────────────────
echo "━━━ NODE 2 — Test Planning (GWT Scenarios) ━━━"
SCENARIOS_DIR="${TEAM_DIR}/features/ui"
mkdir -p "$SCENARIOS_DIR"
python3 "${PROJECT_DIR}/agents/node2-test-planning/src/generate_scenarios.py" \
  --input "$NODE1C_OUTPUT" \
  --output-dir "$SCENARIOS_DIR"
echo ""

# ─── Node 2C: Evaluate Gherkin ──────────────────────────────
echo "━━━ NODE 2C — Gherkin Evaluation ━━━"
python3 "${PROJECT_DIR}/skills/node2c-gherkin-evaluation/src/evaluate_gherkin.py" \
  --input "$SCENARIOS_DIR/${STORY_SLUG}.feature" \
  --output "/tmp/outputs/${STORY_SLUG}-gherkin-eval.json" \
  --approved-output "${TEAM_DIR}/features/ui"
echo ""

# ─── Node 3: Generate Playwright Scripts ─────────────────────
echo "━━━ NODE 3 — Playwright Script Generation ━━━"
python3 "${PROJECT_DIR}/agents/node3-playwright-codegen/src/generate_scripts.py" \
  --input "${TEAM_DIR}/features/ui/${STORY_SLUG}.feature" \
  --output-base "$OUTPUT_DIR"
echo ""

# ─── Node 3C: Review Scripts ────────────────────────────────
echo "━━━ NODE 3C — Script Review ━━━"
python3 "${PROJECT_DIR}/skills/node3c-script-review/src/evaluate_scripts.py" \
  --input "${TEAM_DIR}" \
  --output "/tmp/outputs/${STORY_SLUG}-script-eval.json" \
  --mode "$MODE"
echo ""

# ─── Node 4: Execute Tests ──────────────────────────────────
if $SKIP_TEST; then
  echo "━━━ NODE 4 — SKIPPED (--skip-test) ━━━"
  echo ""
  # Use dry-run results
  python3 "${PROJECT_DIR}/agents/node4-test-execution/src/execute_tests.py" \
    --story-id "$STORY_ID" --team "$TEAM" --dry-run \
    --output "/tmp/outputs/${STORY_SLUG}-test-results.json"
elif $DRY_RUN; then
  echo "━━━ NODE 4 — Execute Test Suite (DRY RUN) ━━━"
  python3 "${PROJECT_DIR}/agents/node4-test-execution/src/execute_tests.py" \
    --story-id "$STORY_ID" --team "$TEAM" --dry-run \
    --output "/tmp/outputs/${STORY_SLUG}-test-results.json"
else
  echo "━━━ NODE 4 — Execute Test Suite ━━━"

  # Copy files to framework
  TEAM_LOWER=$(echo "$TEAM" | tr '[:upper:]' '[:lower:]')
  [[ "$TEAM" == "SCH" || "$TEAM" == "TA" ]] && TEAM_LOWER=$(echo "$TEAM" | tr '[:upper:]' '[:lower:]')

  cp "${TEAM_DIR}/features/ui/${STORY_SLUG}.feature" \
     "${FRAMEWORK_DIR}/teams/${TEAM_LOWER}/features/ui/${STORY_SLUG}.feature" 2>/dev/null || true
  cp "${TEAM_DIR}/steps/${STORY_SLUG}.steps.ts" \
     "${FRAMEWORK_DIR}/teams/${TEAM_LOWER}/steps/${STORY_SLUG}.steps.ts" 2>/dev/null || true
  cp "${TEAM_DIR}/pages/"*.ts \
     "${FRAMEWORK_DIR}/teams/${TEAM_LOWER}/pages/" 2>/dev/null || true

  # Run bddgen
  echo "Generating BDD specs..."
  cd "$FRAMEWORK_DIR"
  rm -rf .features-gen
  TEST_TEAM="$TEAM" TYPE=ui TEST_ENV="$ENV" ENTERPRISE="$ENTERPRISE" npx bddgen 2>&1 | tail -3

  # Build grep filter
  GREP_ARG=""
  if [[ -n "$SCENARIO_GREP" ]]; then
    GREP_ARG="--grep ${SCENARIO_GREP}"
  fi

  # Run tests
  echo "Running Playwright tests..."
  TEST_TEAM="$TEAM" TYPE=ui TEST_ENV="$ENV" ENTERPRISE="$ENTERPRISE" WORKERS=1 \
    npx playwright test --project="$BROWSER" --reporter=html,line $GREP_ARG 2>&1 || true

  cd "$PROJECT_DIR"

  # Collect results
  mkdir -p "${TEAM_DIR}/test-results/${STORY_ID}"
  cp -R "${FRAMEWORK_DIR}/playwright-report" \
     "${TEAM_DIR}/test-results/${STORY_ID}/html-report" 2>/dev/null || true

  RESULT_DIR=$(find "${FRAMEWORK_DIR}/test-results" -maxdepth 1 -type d -name "*${STORY_SLUG}*" 2>/dev/null | head -1)
  if [[ -n "$RESULT_DIR" ]]; then
    cp -R "$RESULT_DIR"/* "${TEAM_DIR}/test-results/${STORY_ID}/" 2>/dev/null || true
  fi

  # Create results JSON for downstream nodes
  python3 "${PROJECT_DIR}/agents/node4-test-execution/src/execute_tests.py" \
    --story-id "$STORY_ID" --team "$TEAM" --dry-run \
    --output "/tmp/outputs/${STORY_SLUG}-test-results.json"
fi
echo ""

# ─── Node 5: Regression Impact Analysis ─────────────────────
echo "━━━ NODE 5 — Regression Impact Analysis ━━━"
mkdir -p "${TEAM_DIR}/Regression-Impact/${STORY_SLUG}"
python3 "${PROJECT_DIR}/agents/node5-regression-analysis/src/analyze_regression.py" \
  --requirements "$NODE1_OUTPUT" \
  --test-results "/tmp/outputs/${STORY_SLUG}-test-results.json" \
  --output "${TEAM_DIR}/Regression-Impact/${STORY_SLUG}/${STORY_ID}-impact-summary.json"
echo ""

# ─── Node 6: Analyze Results & Report ───────────────────────
echo "━━━ NODE 6 — Analyze Results & Report ━━━"
python3 "${PROJECT_DIR}/agents/node6-results-report/src/analyze_and_report.py" \
  --story-id "$STORY_ID" \
  --team "$TEAM" \
  --test-results "/tmp/outputs/${STORY_SLUG}-test-results.json" \
  --regression-scope "${TEAM_DIR}/Regression-Impact/${STORY_SLUG}/${STORY_ID}-impact-summary.json"
echo ""

# ─── Node 7: Bug Triage & Routing ───────────────────────────
echo "━━━ NODE 7 — Bug Triage & Routing ━━━"
python3 "${PROJECT_DIR}/agents/node7-bug-triage/src/triage_bugs.py" \
  --story-id "$STORY_ID" \
  --team "$TEAM" \
  --analysis-report "${TEAM_DIR}/reports/${STORY_ID}/${STORY_ID}-analysis-report.json"
echo ""

# ─── Summary ─────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════════════╗"
echo "║          PIPELINE COMPLETE — ${STORY_ID}"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Output directory: output/${TEAM}/"
echo "║"
echo "║  Artifacts:"
echo "║    features/ui/${STORY_SLUG}.feature"
echo "║    steps/${STORY_SLUG}.steps.ts"
echo "║    pages/*Page.ts"
echo "║    test-results/${STORY_ID}/html-report/"
echo "║    Regression-Impact/${STORY_SLUG}/"
echo "║    reports/${STORY_ID}/"
echo "║    bugs/${STORY_ID}/"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "View HTML report:"
echo "  cd ${FRAMEWORK_DIR} && npx playwright show-report"
